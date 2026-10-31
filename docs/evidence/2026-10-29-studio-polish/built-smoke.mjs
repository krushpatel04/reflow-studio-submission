import { chromium, expect } from '@playwright/test';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
await mkdir('reports/studio-polish-2026-10-29', {recursive:true});
const browser = await chromium.launch({headless:true});
try {
 const context = await browser.newContext({viewport:{width:1440,height:1000}});
 const page = await context.newPage(), errors=[], external=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
  const url=route.request().url();
  if(url.startsWith('http://127.0.0.1:4176/'))return route.continue();
  external.push(url);return route.abort();
 });
 await page.goto('http://127.0.0.1:4176');await page.waitForSelector('html[data-ready=true]');
 await context.setOffline(true);
 const copy='Design for every format.';
 await page.locator('#headline').fill(copy);await page.locator('#update-copy').click();
 await expect(page.locator('#retry-layout')).toBeVisible();await expect(page.locator('#update-error')).toContainText('previous version');
 const retained=await page.locator('.original-card [data-element-id="headline"]').textContent();
 await context.setOffline(false);await page.locator('#retry-layout').click();
 await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy','false');
 // SVG line boxes are separate tspans: textContent alone drops line separators.
 const lines=await page.locator('.original-card [data-element-id="headline"] tspan').allTextContents();
 expect(lines.join(' ')).toBe(copy);
 await page.getByRole('button',{name:'Inspect Square',exact:true}).click();
 expect((await page.locator('#inspect-art [data-element-id="headline"] tspan').allTextContents()).join(' ')).toBe(copy);
 await page.getByRole('combobox',{name:'Zoom',exact:true}).selectOption('1');await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Inspect Square',exact:true})).toBeFocused();
 const pending=page.waitForEvent('download');await page.locator('#export').click();const download=await pending;
 const path='reports/studio-polish-2026-10-29/edited-export.json';await download.saveAs(path);
 const data=JSON.parse(await readFile(path,'utf8'));
 expect(data.source.elements.find(e=>e.id==='headline').text).toBe(copy);
 for(const variant of data.variants)expect(variant.design.elements.find(e=>e.id==='headline').text).toBe(copy);
 await page.screenshot({path:'reports/studio-polish-2026-10-29/built-desktop.png',fullPage:true});
 const proof={built:true,external_network_blocked:true,local_http_server_required:true,local_server_disconnect:{failure_visible:true,retained_headline:retained,retry_recovered:true},edit:true,inspection:true,actual_size:true,escape_focus:true,export:download.suggestedFilename(),export_copy_preserved:true,page_errors:errors,external_requests:external};
 expect(errors).toEqual([]);expect(external).toEqual([]);
 await writeFile('reports/studio-polish-2026-10-29/built-smoke.json',JSON.stringify(proof,null,2)+'\n');console.log(proof);
} finally { await browser.close(); }
