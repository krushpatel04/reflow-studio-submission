import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions, workerEnvironment, runCommand, prepareTask } from '../scripts/copilot-assist';

test('issue and limits are explicit; malformed or unknown input cannot launch', () => {
  assert.deepEqual(parseOptions(['--issue','31']), { issue:31, minutes:20, credits:30 });
  for (const args of [['--issue','31; touch nope'], ['--issue','0'], ['--issue','1','--minutes','0'], ['--issue','1','--credits','29'], ['--wat'], ['--issue']])
    assert.throws(() => parseOptions(args));
  assert.equal(parseOptions(['--list']).list, true);
  assert.equal(parseOptions(['--issue','31','--scope','only new tests']).scope, 'only new tests');
});

test('subscription environment excludes provider, offline and blanket-permission overrides', () => {
  const original = {PATH:'/bin',GH_TOKEN:'keep-private',COPILOT_PROVIDER_API_KEY:'not-used',COPILOT_PROVIDER_BASE_URL:'not-used',COPILOT_ALLOW_ALL:'true',COPILOT_OFFLINE:'true'};
  const result=workerEnvironment(original);
  assert.equal(result.PATH,'/bin'); assert.equal(result.GH_TOKEN,'keep-private');
  assert.equal(result.COPILOT_PROVIDER_API_KEY,undefined); assert.equal(result.COPILOT_ALLOW_ALL,undefined);
  assert.equal(result.COPILOT_OFFLINE,undefined); assert.equal(original.COPILOT_PROVIDER_API_KEY,'not-used');
});

function fake(issue: any) {
  const calls: string[]=[];
  return {calls, deps:{ async issue(){calls.push('issue');return issue;}, async checkout(){calls.push('checkout');return '/isolated';}, async install(){calls.push('install');}, async start(prompt:string){calls.push('start');return prompt;} }};
}
test('closed/unassigned issues stop before checkout or model use', async()=>{
  for(const issue of [{state:'CLOSED',assignees:[{login:'dev'}]}, {state:'OPEN',assignees:[]}]) {
    const f=fake(issue);await assert.rejects(prepareTask(parseOptions(['--issue','31']),f.deps));assert.deepEqual(f.calls,['issue']);
  }
});
test('one open issue is handed off verbatim, with ownership and narrow scope', async()=>{
  const f=fake({number:31,state:'OPEN',title:'Freeze splits',body:'Preserve Café; $(not-a-command)',assignees:[{login:'krushpatel04'}],comments:[{body:'Keep existing imports'}]});
  const result=await prepareTask(parseOptions(['--issue','31','--scope','new helper only']),f.deps);
  assert.deepEqual(f.calls,['issue','checkout','install','start']);
  assert.ok(typeof result==='string');
  assert.match(result,/Preserve Café; \$\(not-a-command\)/);assert.match(result,/krushpatel04/);assert.match(result,/new helper only/);assert.match(result,/Do not push/);
});
test('failed installation does not start a worker',async()=>{
  const f=fake({state:'OPEN',assignees:[{login:'dev'}]});f.deps.install=async()=>{throw Error('install failed');};
  await assert.rejects(prepareTask(parseOptions(['--issue','31']),f.deps),/install failed/);assert.ok(!f.calls.includes('start'));
});
test('commands preserve literal arguments and nonzero exit status',async()=>{
  const r=await runCommand(process.execPath,['-e','process.stdout.write(process.argv[1]);process.exit(7)','$(nope); Café'],{timeoutMs:3000});
  assert.equal(r.code,7);assert.equal(r.stdout,'$(nope); Café');
});
test('external timeout stops a process instead of waiting indefinitely',async()=>{
  const r=await runCommand(process.execPath,['-e','setInterval(()=>{},1000)'],{timeoutMs:150});
  assert.equal(r.code,124);assert.equal(r.timedOut,true);
});
test('command capture preserves Unicode split across byte chunks',async()=>{
  const code="const b=Buffer.from('Café🙂'); process.stdout.write(b.subarray(0,4));setTimeout(()=>process.stdout.write(b.subarray(4)),30)";
  const r=await runCommand(process.execPath,['-e',code],{timeoutMs:3000});assert.equal(r.stdout,'Café🙂');
});
test('cancellation stops the worker and its spawned descendants',async()=>{
  const {mkdtempSync,existsSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const dir=mkdtempSync(join(tmpdir(),'reflow-launcher-'));const marker=join(dir,'escaped');
  const grandchild=`setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'bad'),700)`;
  const parent=`require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'inherit'});setInterval(()=>{},1000)`;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),200);
  try {
    const result=await runCommand(process.execPath,['-e',parent],{signal:controller.signal,timeoutMs:3000});
    assert.equal(result.code,130);
    await new Promise(r=>setTimeout(r,800));assert.equal(existsSync(marker),false);
  } finally {clearTimeout(timer);rmSync(dir,{recursive:true,force:true});}
});
test('private context can be delivered over stdin without appearing in argv',async()=>{
  const code="let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>process.stdout.write(JSON.stringify({input:s,argv:process.argv.slice(1)})))";
  const r=await runCommand(process.execPath,['-e',code],{input:'private-context Café',timeoutMs:3000});
  assert.equal(r.code,0);const result=JSON.parse(r.stdout);assert.equal(result.input,'private-context Café');assert.deepEqual(result.argv,[]);
});
test('vault setup, preview and opt-out are explicit CLI actions',()=>{
  assert.equal(parseOptions(['--configure-vault','/vault','--project-note','Projects/Reflow.md']).projectNote,'Projects/Reflow.md');
  assert.equal(parseOptions(['--context']).context,true);assert.equal(parseOptions(['--issue','31','--no-vault']).noVault,true);
  assert.throws(()=>parseOptions(['--project-note','anything']));assert.throws(()=>parseOptions(['--issue','31','--configure-vault','/vault']));
});
