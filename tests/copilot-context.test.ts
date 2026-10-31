import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,statSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {saveVaultConfig,loadVaultContext} from '../scripts/copilot-context';
function fixture(){const root=mkdtempSync(join(tmpdir(),'reflow-vault-'));const vault=join(root,'vault');mkdirSync(join(vault,'00-Home'),{recursive:true});mkdirSync(join(vault,'Projects'));
writeFileSync(join(vault,'AI_CONTEXT.md'),'manual-only vault writes');writeFileSync(join(vault,'00-Home/Current Focus.md'),'focus-marker');writeFileSync(join(vault,'Projects/Reflow.md'),'private-project-marker');writeFileSync(join(vault,'unrelated.md'),'DO-NOT-LOAD');return {root,vault,config:join(root,'local','config.json')};}
test('vault opt-in is per user and absent or disabled configuration reads nothing',()=>{
 const f=fixture();try {assert.equal(loadVaultContext(f.config).text,'');saveVaultConfig(f.config,f.vault,'Projects/Reflow.md');assert.equal(loadVaultContext(f.config,true).text,'');}finally{rmSync(f.root,{recursive:true});}
});
test('configured context loads only required notes, labels evidence, and never modifies vault',()=>{
 const f=fixture();try {const before=readFileSync(join(f.vault,'Projects/Reflow.md'),'utf8');saveVaultConfig(f.config,f.vault,'Projects/Reflow.md');const r=loadVaultContext(f.config);
 assert.match(r.text,/private-project-marker/);assert.match(r.text,/focus-marker/);assert.match(r.text,/manual-only/);assert.doesNotMatch(r.text,/DO-NOT-LOAD/);assert.equal(r.files.length,3);assert.equal(readFileSync(join(f.vault,'Projects/Reflow.md'),'utf8'),before);
 if(process.platform!=='win32')assert.equal(statSync(f.config).mode&0o777,0o600);
 }finally{rmSync(f.root,{recursive:true});}
});
test('configuration rejects traversal, outside links and missing vault',()=>{
 const f=fixture();try {assert.throws(()=>saveVaultConfig(f.config,f.vault,'../outside.md'));assert.throws(()=>saveVaultConfig(f.config,join(f.root,'missing')));
 writeFileSync(join(f.root,'outside.md'),'outside');symlinkSync(join(f.root,'outside.md'),join(f.vault,'escape.md'));assert.throws(()=>saveVaultConfig(f.config,f.vault,'escape.md'));
 }finally{rmSync(f.root,{recursive:true});}
});
test('missing notes and oversized context are explicit; reads remain bounded',()=>{
 const f=fixture();try {saveVaultConfig(f.config,f.vault,'Projects/missing.md');let r=loadVaultContext(f.config);assert.ok(r.warnings.some(w=>w.includes('missing')));
 writeFileSync(join(f.vault,'AI_CONTEXT.md'),'x'.repeat(100000));r=loadVaultContext(f.config);assert.ok(r.warnings.some(w=>w.includes('truncated')));assert.ok(r.text.length<50000);
 }finally{rmSync(f.root,{recursive:true});}
});
test('later symlink changes cannot escape the configured vault',()=>{
 const f=fixture();try {saveVaultConfig(f.config,f.vault,'Projects/Reflow.md');writeFileSync(join(f.root,'outside.md'),'secret-outside');rmSync(join(f.vault,'Projects/Reflow.md'));symlinkSync(join(f.root,'outside.md'),join(f.vault,'Projects/Reflow.md'));assert.throws(()=>loadVaultContext(f.config));}finally{rmSync(f.root,{recursive:true});}
});
