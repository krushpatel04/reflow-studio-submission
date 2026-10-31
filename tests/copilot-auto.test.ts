import test from 'node:test';
import assert from 'node:assert/strict';
import * as launcher from '../scripts/copilot-assist';

// Dynamic access lets the baseline fail for missing behavior rather than an import error.
const select = (...args:any[]) => (launcher as any).selectAutoIssue(...args);
const reserve = (...args:any[]) => (launcher as any).reserveAutoIssue(...args);
const issue=(number:number, extra={})=>({number,state:'OPEN',assignees:[{login:'dev'}],labels:[{name:'copilot:ready'}],...extra});
test('auto and preview modes are explicit and mutually exclusive with manual selection',()=>{
  assert.equal((launcher.parseOptions(['--auto']) as any).auto,true);
  assert.equal((launcher.parseOptions(['--preview-auto']) as any).previewAuto,true);
  for(const args of [['--auto','--issue','2'],['--auto','--list'],['--auto','--preview-auto'],['--auto','--configure-vault','/v'],['--release','0']])assert.throws(()=>launcher.parseOptions(args));
});
test('selection chooses oldest eligible own issue, independent of API ordering',()=>{
  const issues=[issue(9),issue(2),issue(1,{assignees:[{login:'other'}]}),issue(3,{state:'CLOSED'}),issue(4,{labels:[]}),issue(5,{assignees:[]})];
  assert.equal(select(issues,'DEV',new Set()).number,2);
  assert.equal(select(issues,'dev',new Set([2])).number,9);
  assert.equal(select(issues,'nobody',new Set()),undefined);
});
test('blocked, active, and review work never enters the automatic queue',()=>{
  for(const name of ['blocked','status:blocked','in progress','in-progress','copilot:working','copilot:review']){
    assert.equal(select([issue(1,{labels:[{name:'copilot:ready'},{name}]})],'dev',new Set()),undefined);
  }
});
test('atomic developer reservation prevents two concurrent launches',async()=>{
  const refs=new Set<string>();let starts=0;
  const create=async(ref:string)=>{if(refs.has(ref))throw Error('already exists');refs.add(ref);};
  const remove=async(ref:string)=>{refs.delete(ref);};
  const results=await Promise.allSettled([reserve('dev',1,{create,remove}),reserve('dev',2,{create,remove})]);
  for(const r of results)if(r.status==='fulfilled')starts++;
  assert.equal(starts,1);assert.equal(refs.size,2);
});
test('issue collision releases only the newly acquired developer reservation',async()=>{
  const refs=new Set(['refs/heads/jo/assist-claim-1']);
  const create=async(ref:string)=>{if(refs.has(ref))throw Error('already exists');refs.add(ref);};
  await assert.rejects(reserve('dev',1,{create,remove:async(ref:string)=>{refs.delete(ref);}}));
  assert.deepEqual([...refs],['refs/heads/jo/assist-claim-1']);
});

test('real CLI preview queries GitHub but never reserves or starts a model',async()=>{
  const {mkdtempSync,writeFileSync,readFileSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');const {join,resolve}=await import('node:path');
  const dir=mkdtempSync(join(tmpdir(),'reflow-auto-preview-'));const trace=join(dir,'trace');
  const fake=`#!${process.execPath}\nconst fs=require('node:fs');const a=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(trace)},JSON.stringify(a)+'\\n');
if(a[0]==='repo')console.log('example/reflow');
else if(a[1]==='user')console.log('dev');
else if(a.some(x=>x.includes('matching-refs')))console.log('[]');
else if(a.includes('--paginate'))console.log(JSON.stringify([[{number:2,state:'open',assignees:[{login:'dev'}],labels:[{name:'copilot:ready'}]}]]));
else if(a[0]==='worktree')console.log('');
else process.exit(91);`;
  for(const cmd of ['gh','git','copilot'])writeFileSync(join(dir,cmd),fake,{mode:0o755});
  try {
    const result=await launcher.runCommand(process.execPath,['--import','tsx',resolve('scripts/copilot-assist.ts'),'--preview-auto','--no-vault'],{env:{...process.env,PATH:`${dir}:${process.env.PATH}`},timeoutMs:10000});
    assert.equal(result.code,0,result.stderr);assert.match(result.stdout,/Selected #2 for dev/);assert.match(result.stdout,/Preview only/);
    const calls=readFileSync(trace,'utf8');assert.doesNotMatch(calls,/POST|DELETE|--version|--model|--method/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('CLI auto reserves once, retains completed work, and explicitly releases its own claim',async()=>{
  const {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync,existsSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');const {join,resolve}=await import('node:path');
  const dir=mkdtempSync(join(tmpdir(),'reflow-auto-lifecycle-'));const bin=join(dir,'bin');mkdirSync(bin);
  const state=join(dir,'state.json');writeFileSync(state,JSON.stringify({refs:[],starts:0,ready:true,message:''}));
  const fake=`#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');const a=process.argv.slice(2),cmd=path.basename(process.argv[1]);
const state=${JSON.stringify(state)},dir=${JSON.stringify(dir)};let s=JSON.parse(fs.readFileSync(state,'utf8'));
const out=x=>console.log(typeof x==='string'?x:JSON.stringify(x));
const issue={number:2,state:'OPEN',title:'Bounded fix',body:'Fix it',assignees:[{login:'dev'}],labels:s.ready?[{name:'copilot:ready'}]:[]};
const value=key=>{const v=a.find(x=>x.startsWith(key+'='));return v?.slice(key.length+1);};
if(cmd==='gh'){
 if(a[0]==='repo')out('example/reflow');
 else if(a[0]==='issue'&&a[1]==='view')out(issue);
 else if(a[0]==='issue'&&a[1]==='edit')s.ready=false;
 else if(a[1]==='user')out('dev');
 else if(a.some(x=>x.includes('matching-refs')))out(s.refs);
 else if(a.includes('--paginate'))out([[{...issue,state:'open'}]]);
 else if(a.includes('POST')&&a.includes('repos/example/reflow/git/commits')){s.message=value('message');out('claimsha');}
 else if(a.includes('POST')){const ref=value('ref');if(s.refs.some(r=>r.ref===ref))process.exit(22);s.refs.push({ref,object:{sha:'claimsha'}});}
 else if(a.includes('DELETE')){const endpoint=a.find(x=>x.startsWith('repos/'));s.refs=s.refs.filter(r=>!endpoint.endsWith(r.ref.slice(5)));}
 else if(a.includes('repos/example/reflow/git/commits/claimsha'))out(s.message);
 else if(a.includes('repos/example/reflow/git/commits/base'))out('tree');
 else process.exit(92);
}else if(cmd==='git'){
 if(a[0]==='worktree'&&a[1]==='list')out('');
 else if(a[0]==='worktree'&&a[1]==='add'){s.worktree=a[4];fs.mkdirSync(s.worktree,{recursive:true});}
 else if(a[0]==='rev-parse')out(a[1]==='--git-common-dir'?path.join(dir,'common'):'base');
 else if(a[0]==='symbolic-ref')out('origin/main');
 else if(a[0]==='config')out(a[1]==='user.name'?'Test Developer':'dev@example.invalid');
 else if(a[0]!=='fetch'&&a[0]!=='remote')process.exit(93);
}else if(cmd==='copilot'){
 if(a.includes('--version'))out('test-version');else{s.starts++;out('worker completed');process.stdin.resume();}
}else if(cmd!=='npm')process.exit(94);
fs.writeFileSync(state,JSON.stringify(s));`;
  for(const cmd of ['gh','git','copilot','npm'])writeFileSync(join(bin,cmd),fake,{mode:0o755});
  const run=(args:string[])=>launcher.runCommand(process.execPath,['--import','tsx',resolve('scripts/copilot-assist.ts'),...args],{env:{...process.env,HOME:dir,PATH:`${bin}:${process.env.PATH}`},timeoutMs:15000});
  try {
    const first=await run(['--auto','--no-vault']);assert.equal(first.code,0,first.stderr);assert.match(first.stdout,/Worker finished/);
    const claimed=JSON.parse(readFileSync(state,'utf8'));assert.equal(claimed.starts,1);assert.equal(claimed.refs.length,2);assert.ok(existsSync(claimed.worktree));
    const second=await run(['--auto','--no-vault']);assert.equal(second.code,0,second.stderr);assert.match(second.stdout,/reserved run for #2/);
    const wrong=await run(['--release','3']);assert.equal(wrong.code,1);assert.equal(JSON.parse(readFileSync(state,'utf8')).refs.length,2);
    const released=await run(['--release','2']);assert.equal(released.code,0,released.stderr);
    const done=JSON.parse(readFileSync(state,'utf8'));assert.equal(done.starts,1);assert.equal(done.refs.length,0);assert.equal(done.ready,false);assert.ok(existsSync(done.worktree));
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('default branch discovery repairs missing origin HEAD and honors a non-main remote',async()=>{
  const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const dir=mkdtempSync(join(tmpdir(),'assist-default-'));const remote=join(dir,'remote.git'),local=join(dir,'local');
  async function git(args:string[],cwd=dir){const r=await launcher.runCommand('git',args,{cwd});assert.equal(r.code,0,r.stderr);return r.stdout.trim();}
  try{
    await git(['init','--bare','--initial-branch=release',remote]);await git(['init','--initial-branch=release',local]);
    await git(['-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-m','fixture'],local);
    await git(['remote','add','origin',remote],local);await git(['push','origin','release'],local);
    const before=await launcher.runCommand('git',['symbolic-ref','refs/remotes/origin/HEAD'],{cwd:local});assert.notEqual(before.code,0);
    const base=await (launcher as any).discoverDefaultBranch((tool:string,args:string[])=>{assert.equal(tool,'git');return git(args,local);});
    assert.equal(base,'origin/release');assert.equal(await git(['symbolic-ref','--short','refs/remotes/origin/HEAD'],local),'origin/release');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
