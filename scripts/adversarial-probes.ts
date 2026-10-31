import { writeFile, mkdir } from 'node:fs/promises';
import { FIXTURES } from '../src/fixtures';
import { reflow } from '../src/engine';
import { evaluate } from '../src/evaluate';
import { validateDesign } from '../src/model';
import { measure, renderPng } from './native';
// Exploratory measurements, not pass/fail tests. See docs/adversarial-review.md.
const out='reports/adversarial-latest';
await mkdir(out,{recursive:true});
const results:any[]=[];
const base=structuredClone(FIXTURES[0]);
for(const [name,mutate] of [
  ['invisible-headline',(d:any)=>{d.elements.find((e:any)=>e.id==='headline').opacity=0;}],
  ['changed-brand-color',(d:any)=>{d.elements.find((e:any)=>e.id==='headline').color='#ff00ff';}],
  ['removed-group-membership',(d:any)=>{delete d.elements.find((e:any)=>e.id==='ticket-label').groupId;}],
  ['paint-order-reversed',(d:any)=>{d.elements.reverse();}],
  ['extra-decorative-cover',(d:any)=>{d.elements.push({id:'cover',type:'rect',role:'decoration',x:0,y:0,width:d.width,height:d.height,color:d.background});}],
] as const){
  const changed=structuredClone(base);mutate(changed);
  const metrics=evaluate(base,changed,measure);
  results.push({test:name,kind:'fault injection into evaluator',errors:metrics.errors,warnings:metrics.warnings,findings:metrics.findings});
  if(name==='extra-decorative-cover') await writeFile(out+'/hidden-content.png',renderPng(changed));
}
for(const [name,mutate] of [
 ['missing-font-family',(d:any)=>{delete d.elements.find((e:any)=>e.type==='text').fontFamily;}],
 ['unknown-asset',(d:any)=>{d.elements.find((e:any)=>e.type==='image').assetId='customer-upload';}],
 ['missing-focal-point',(d:any)=>{delete d.elements.find((e:any)=>e.type==='image').focalPoint;}],
 ['invalid-opacity',(d:any)=>{d.elements[0].opacity=-4;}],
] as const){
 const changed=structuredClone(base);mutate(changed);
 let validation='accepted';try{validateDesign(changed);}catch(e){validation=String(e);}
 let rendering='rendered';try{renderPng(changed);}catch(e){rendering=String(e);}
 results.push({test:name,validation,rendering});
}
const button:any={schemaVersion:'reflow.design.v0',id:'mixed-role-group',name:'Mixed role group',description:'Button with decorative background',provenance:'synthetic',width:1000,height:1000,background:'#ffffff',groups:[{id:'button',label:'Button'}],elements:[
 {id:'badge',type:'rect',role:'decoration',groupId:'button',x:100,y:100,width:500,height:200,color:'#16362a'},
 {id:'label',type:'text',role:'content',groupId:'button',x:140,y:160,width:420,height:70,text:'CALL TODAY',fontFamily:'Inter',fontSize:40,fontWeight:700,lineHeight:1.1,color:'#ffffff'},
]};
const b=reflow(button,{id:'tall',label:'Tall',width:600,height:1200},measure);
results.push({test:'mixed-role-group',selected:b.selected.strategy,metrics:b.selected.metrics,elements:b.selected.design.elements});
await writeFile(out+'/mixed-role-source.png',renderPng(button));
await writeFile(out+'/mixed-role-selected.png',renderPng(b.selected.design));
const shifts=[];
for(const source of FIXTURES){
 const r=reflow(source,{id:'near',label:'One pixel wider',width:source.width+1,height:source.height},measure);
 const movement=Math.max(...source.elements.map((s:any,i:number)=>{const e=r.selected.design.elements[i];return Math.hypot(e.x/r.target.width-s.x/source.width,e.y/r.target.height-s.y/source.height);}));
 if (source.id === 'edge-subject') {
  await writeFile(out+'/one-pixel-source.png',renderPng(source));
  await writeFile(out+'/one-pixel-selected.png',renderPng(r.selected.design));
 }
 shifts.push({id:source.id,strategy:r.selected.strategy,maxNormalizedOriginMovement:movement,errors:r.selected.metrics.errors,warnings:r.selected.metrics.warnings});
}
results.push({test:'one-pixel-width-change',cases:shifts});
await writeFile(out+'/results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
