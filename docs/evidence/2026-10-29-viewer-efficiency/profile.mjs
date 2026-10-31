// Run with Vite on 4175. Baseline module is the archived pre-change worker,
// with only its relative import paths adjusted for reports/viewer-efficiency-2026-10-29/.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const baselineSha = 'f14d8312e1206a030593f4115062b78b78efb9fc';
await mkdir('reports/viewer-efficiency-2026-10-29', { recursive: true });
await writeFile('reports/viewer-efficiency-2026-10-29/layout-worker-before.ts', execFileSync('git', ['show', `${baselineSha}:src/layout-worker.ts`], { encoding: 'utf8' }).replaceAll("from './", "from '../../src/"));
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 await page.goto('http://127.0.0.1:4175'); await page.locator('html[data-ready=true]').waitFor();
 const results = await page.evaluate(async () => {
   const { browserExportFonts } = await import('/src/svg-export.ts');
   const faces = browserExportFonts();
   const latin = structuredClone(window.reflowLab.fixtures[0]);
   const multilingual = structuredClone(window.reflowLab.fixtures.find(f => f.id === 'type-pairing'));
   for (const e of multilingual.elements) if (e.type === 'text') e.text = 'Café Ā Ł Ω Ж ệ';
   const unsupported = structuredClone(multilingual);
   for (const e of unsupported.elements) if (e.type === 'text') e.text = 'A 🐓';
   const empty = structuredClone(multilingual);
   for (const e of empty.elements) if (e.type === 'text') e.text = '';
   const results = [];
   for (const [name, source, repeats] of [['latin', latin, 7], ['multilingual', multilingual, 1], ['unsupported', unsupported, 1], ['empty', empty, 1], ...window.reflowLab.fixtures.slice(1).map(f => [f.id, structuredClone(f), 1])]) {
    for (let trial = 0; trial < repeats; trial++) {
     for (const version of trial % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate']) {
      const path = version === 'baseline' ? '/reports/viewer-efficiency-2026-10-29/layout-worker-before.ts' : '/src/layout-worker.ts';
      const code = `let loads=0; const Native=FontFace; globalThis.FontFace=class extends Native {load(){loads++; return super.load();}};
       const post=postMessage.bind(globalThis); globalThis.postMessage=(data)=>post({...data, loads, resources: performance.getEntriesByType('resource').filter(r=>r.name.includes('.woff2')).map(r=>({name:r.name,bytes:r.encodedBodySize}))});
       await import(${JSON.stringify(location.origin + path)}); post({ready:true});`;
      const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      const worker = new Worker(url, { type: 'module' });
      try {
       const output = await new Promise((resolve, reject) => {
        let start, fontsMs;
        worker.onerror = reject;
        worker.onmessage = e => {
         if (e.data.ready) { start=performance.now(); worker.postMessage({source, targets:window.reflowLab.targets, faces}); }
         if (e.data.stage) fontsMs=performance.now()-start;
         if (e.data.error) reject(new Error(e.data.error));
         if (e.data.result) resolve({name, trial, version, fontsMs, totalMs:performance.now()-start, loads:e.data.loads, resources:e.data.resources, result:JSON.parse(JSON.stringify(e.data.result,(k,v)=>k==='elapsedMs'?undefined:v))});
        };
       });
       results.push(output);
      } finally { worker.terminate(); URL.revokeObjectURL(url); }
     }
    }
   }
   return { faceCount: faces.length, results };
 });
 for (const row of results.results) {
  row.sha256 = createHash('sha256').update(JSON.stringify(row.result)).digest('hex'); delete row.result;
  row.fontBytes = row.resources.reduce((sum,r) => sum+r.bytes,0); delete row.resources;
 }
 await writeFile('reports/viewer-efficiency-2026-10-29/profile.json', JSON.stringify({baselineSha,browser:browser.version(), ...results},null,2));
 for (const name of new Set(results.results.map(r => r.name))) {
  if (new Set(results.results.filter(r => r.name === name).map(r => r.sha256)).size !== 1) throw new Error(`Output changed: ${name}`);
 }
 console.log(JSON.stringify(results));
} finally { await browser.close(); }
