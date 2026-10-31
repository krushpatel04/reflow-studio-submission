import { writeFile, mkdir } from 'node:fs/promises';
import { reflow } from '../src/engine';
import { FIXTURES } from '../src/fixtures';
import { measure } from './native';
// Exploratory measurements, not pass/fail tests. See docs/adversarial-review.md.
const out='reports/adversarial-latest';
await mkdir(out,{recursive:true});
const rows=[];
const textTemplate = FIXTURES[0].elements.find(e => e.id === 'headline');
if (!textTemplate || textTemplate.type !== 'text') throw new Error('Missing text fixture');
for(const count of [1,10,40,100]) {
  const d=structuredClone(FIXTURES[0]);
  d.elements=Array.from({length:count},(_,i)=>({...structuredClone(textTemplate),id:'text-'+i,groupId:undefined,text:'Approved customer information and pricing '.repeat(25),x:0,y:i*10,width:1000,height:8,fontSize:5}));
  d.groups=[];
  const started=performance.now();
  const r=reflow(d,{id:'stress',label:'Stress',width:200,height:2000},measure);
  const row={elements:count,charactersPerElement:1050,elapsedMs:performance.now()-started,selected:r.selected.strategy,errors:r.selected.metrics.errors,warnings:r.selected.metrics.warnings};
  rows.push(row);
  console.log(JSON.stringify(row));
  await writeFile(out+'/stress.json',JSON.stringify(rows,null,2));
}
