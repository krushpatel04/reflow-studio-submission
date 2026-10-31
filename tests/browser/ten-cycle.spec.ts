import {test,expect,type Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const ready=async(page:Page)=>{await page.goto('/');await page.locator('html[data-ready=true]').waitFor();};
const capture=async(page:Page,cycle:number)=>page.screenshot({path:`reports/ten-cycle/cycle-${cycle}.png`,animations:'disabled'});
async function campaign(page:Page) {
 return page.evaluate(async()=>{
  let blob:Blob|undefined;const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;
  URL.createObjectURL=value=>{if(value instanceof Blob)blob=value;return create(value);};HTMLAnchorElement.prototype.click=function(){};
  try{document.querySelector<HTMLElement>('#export')!.click();return JSON.parse(await blob!.text());}
  finally{URL.createObjectURL=create;HTMLAnchorElement.prototype.click=click;}
 });
}
test('cycle 1: discard draft cancels pending copy and preserves the committed campaign',async({page})=>{
 await ready(page);const before=await campaign(page),copy=await page.locator('#headline').inputValue();
 await page.locator('#headline').fill('Discard this revision');
 await expect(page.getByRole('button',{name:'Discard changes',exact:true})).toBeVisible({timeout:2000});
 await page.route('**/src/layout-worker.ts*',async route=>{await new Promise(r=>setTimeout(r,700));await route.continue();});
 const workerCreated=page.waitForEvent('worker');await page.locator('#update-copy').click();
 const worker=await workerCreated;const stopped=new Promise<void>(r=>worker.once('close',()=>r()));
 await page.getByRole('button',{name:'Discard changes',exact:true}).click();await stopped;
 await expect(page.locator('#headline')).toHaveValue(copy);await expect(page.locator('#copy-status')).toBeEmpty();
 expect(await campaign(page)).toEqual(before);await expect(page.locator('#retry-layout')).toBeHidden();
 await expect(page.locator('#headline')).toBeFocused();await capture(page,1);
});
test('cycle 2: copy keyboard shortcuts apply without taking plain Enter',async({page})=>{
 await ready(page);await page.locator('#headline').fill('Keyboard revision');await page.locator('#headline').press('Control+Enter');
 await expect(page.locator('#request-status')).toHaveText('Layout updated.',{timeout:3000});
 expect((await campaign(page)).source.elements.find((e:any)=>e.id==='headline').text).toBe('Keyboard revision');
 await page.locator('#headline').fill('Second keyboard revision');await page.locator('#headline').press('Meta+Enter');
 await expect(page.locator('#copy-status')).toBeEmpty();
 await page.locator('#headline').press('End');await page.locator('#headline').press('Enter');await page.locator('#headline').press('x');
 expect(await page.locator('#headline').inputValue()).toContain('\nx');
 expect((await campaign(page)).source.elements.find((e:any)=>e.id==='headline').text).toBe('Second keyboard revision');
 await capture(page,2);
});
test('cycle 3: dimensions support Enter and identify invalid fields accessibly',async({page})=>{
 await ready(page);await page.locator('.custom-size summary').click();
 await page.locator('#custom-width').fill('0');await page.locator('#custom-height').fill('600');await page.locator('#custom-apply').click();
 await expect(page.locator('#custom-width')).toHaveAttribute('aria-invalid','true',{timeout:2000});
 await expect(page.locator('#custom-width')).toBeFocused();await expect(page.locator('#custom-width')).toHaveAttribute('aria-describedby','size-error');
 await expect(page.locator('.design-card')).toHaveCount(4);await capture(page,3);
 await page.locator('#custom-width').fill('800');await page.locator('#custom-height').fill('8001');await page.locator('#custom-apply').click();
 await expect(page.locator('#custom-height')).toHaveAttribute('aria-invalid','true');await expect(page.locator('#custom-height')).toBeFocused();
 await page.locator('#custom-height').fill('600');await page.locator('#custom-height').press('Enter');
 await expect(page.locator('.design-card')).toHaveCount(5);await expect(page.locator('#custom-width')).not.toHaveAttribute('aria-invalid','true');
 await expect(page.locator('#size-error')).toBeEmpty();
});
test('cycle 4: active presentation controls preserve DOM and avoid work',async({page})=>{
 await ready(page);
 const result=await page.evaluate(()=>{
  const grid=document.querySelector('#canvas-grid')!,before=grid.innerHTML,svg=grid.querySelector('.stage > svg');
  const post=Worker.prototype.postMessage;let workers=0;Worker.prototype.postMessage=function(...args:any[]){workers++;return post.apply(this,args as any);};
  try{
   document.querySelector<HTMLButtonElement>('#mode-selected')!.click();
   document.querySelector('#show-issues')!.dispatchEvent(new Event('change'));
   return {sameMarkup:before===grid.innerHTML,sameNode:svg===grid.querySelector('.stage > svg'),workers};
  }finally{Worker.prototype.postMessage=post;}
 });
 await writeFile('reports/ten-cycle/noop-counts.json',JSON.stringify(result,null,2));expect(result).toEqual({sameMarkup:true,sameNode:true,workers:0});
 expect(await page.evaluate(()=>{
  const before=document.querySelector('.stage svg');document.fonts.dispatchEvent(new Event('loadingdone'));
  document.querySelector<HTMLButtonElement>('#mode-selected')!.click();return before!==document.querySelector('.stage svg');
 })).toBe(true); // font changes still require fresh presentation
 await page.locator('#mode-baseline').click();await expect(page.locator('#mode-baseline')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Inspect Square',exact:true}).click();
 await page.locator('#inspect-viewport').evaluate(n=>n.scrollTo(0,100));
 const before=await page.locator('#inspect-art').innerHTML();await page.locator('#inspect-baseline').click();expect(await page.locator('#inspect-art').innerHTML()).toBe(before);
 await capture(page,4);
});
test('cycle 5: inspector issue overlay is local and shows honest findings',async({page})=>{
 await ready(page);const before=await campaign(page);await page.getByRole('button',{name:'Inspect Square',exact:true}).click();
 await expect(page.locator('#inspect-issues')).toBeVisible({timeout:2000});await expect(page.locator('#inspect-findings')).toContainText('issue');
 await page.locator('#inspect-issues').check();expect(await page.locator('#inspect-art svg > rect[stroke]').count()).toBeGreaterThan(0);
 await page.locator('#inspect-baseline').click();await expect(page.locator('#inspect-issues')).toBeChecked();
 await capture(page,5);await page.keyboard.press('Escape');await expect(page.locator('#show-issues')).not.toBeChecked();expect(await campaign(page)).toEqual(before);
});
test('cycle 6: artwork keyboard review navigates and zooms without hijacking controls',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'Inspect Square',exact:true}).click();
 const viewport=page.locator('#inspect-viewport');await viewport.focus();await viewport.press('PageDown');
 await expect(page.locator('#inspect-title')).toHaveText('Story · Reflow',{timeout:2000});
 await viewport.press('2');await expect(page.locator('#inspect-zoom')).toHaveValue('2');
 await viewport.press('0');await expect(page.locator('#inspect-zoom')).toHaveValue('fit');
 await page.locator('#inspect-zoom').focus();await page.locator('#inspect-zoom').press('ArrowDown');await expect(page.locator('#inspect-title')).toHaveText('Story · Reflow');
 await viewport.focus();await viewport.press('Home');await expect(page.locator('#inspect-title')).toHaveText('Original · Source');
 await viewport.press('PageUp');await expect(page.locator('#inspect-title')).toHaveText('Original · Source');
 await viewport.press('End');await expect(page.locator('#inspect-title')).toHaveText('Landscape · Reflow');await capture(page,6);
});
test('cycle 7: enlarged artwork can be panned by mouse drag',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'Inspect Square',exact:true}).click();await page.locator('#inspect-zoom').selectOption('2');
 const view=page.locator('#inspect-viewport');await view.evaluate(n=>n.scrollTo(200,250));const box=(await view.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-80,box.y+box.height/2-60,{steps:4});await page.mouse.up();
 const position=await view.evaluate(n=>({x:n.scrollLeft,y:n.scrollTop}));expect(position.x).toBeCloseTo(280,0);expect(position.y).toBeCloseTo(310,0);
 await expect(view).not.toHaveClass(/is-panning/);
 expect(await view.evaluate(n=>n.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',isPrimary:true,cancelable:true,bubbles:true,pointerId:4})))).toBe(true);
 await expect(view).not.toHaveClass(/is-panning/);await capture(page,7);
 await page.locator('#inspect-zoom').selectOption('fit');await expect(view).not.toHaveClass(/can-pan/);
});
test('cycle 8: theme preference survives reload and denied storage remains usable',async({page,browser})=>{
 await page.emulateMedia({colorScheme:'dark'});await ready(page);await expect(page.locator('html')).toHaveAttribute('data-theme','dark',{timeout:2000});
 await page.locator('#theme-toggle').click();await page.reload();await page.locator('html[data-ready=true]').waitFor();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await capture(page,8);
 await page.evaluate(()=>localStorage.setItem('reflow-theme','invalid'));await page.reload();await page.locator('html[data-ready=true]').waitFor();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 const context=await browser.newContext({colorScheme:'light'});const isolated=await context.newPage();const errors:string[]=[];isolated.on('pageerror',e=>errors.push(e.message));
 await isolated.addInitScript(()=>{Storage.prototype.getItem=function(){throw new Error('storage denied');};Storage.prototype.setItem=function(){throw new Error('storage denied');};});
 await isolated.goto('http://127.0.0.1:4173/');await isolated.locator('html[data-ready=true]').waitFor();await isolated.locator('#theme-toggle').click();await expect(isolated.locator('html')).toHaveAttribute('data-theme','dark');expect(errors).toEqual([]);await context.close();
});
test('cycle 9: SVG export is single-flight and recovers after preparation failure',async({page})=>{
 await ready(page);await page.locator('#fixture').selectOption('type-pairing');await expect(page.locator('#design-title')).toHaveText('Two voices, one design');
 await page.route('**/*.woff2',async route=>{await new Promise(r=>setTimeout(r,600));await route.continue();});
 const button=page.getByRole('button',{name:'Export Original as SVG',exact:true});let downloads=0;page.on('download',()=>downloads++);
 const firstDownload=page.waitForEvent('download');await button.click();await expect(button).toBeDisabled({timeout:2000});await expect(button).toHaveAttribute('aria-busy','true');
 await button.evaluate(n=>(n as HTMLButtonElement).click());await capture(page,9);await firstDownload;await expect(button).toBeEnabled();expect(downloads).toBe(1);
 await page.unroute('**/*.woff2');await page.route('**/*.woff2',route=>route.abort('failed'));
 await button.click();await expect(page.locator('.original-card [data-export-error]')).toContainText('not exported');await expect(button).toBeEnabled();
 await page.unroute('**/*.woff2');const recoveredDownload=page.waitForEvent('download');await button.click();await recoveredDownload;await expect(button).toBeEnabled();await expect(page.locator('.original-card [data-export-error]')).toHaveCount(0);expect(downloads).toBe(2);
});
test('cycle 10: desktop comparison tools stay reachable while reviewing lower artboards',async({page})=>{
 await ready(page);await page.locator('.design-card').last().scrollIntoViewIfNeeded();
 const heading=(await page.locator('.workspace-heading').boundingBox())!;expect(heading.y).toBeGreaterThanOrEqual(0);
 const position=await page.evaluate(()=>scrollY);expect(position).toBeGreaterThan(0);
 await expect(page.locator('.inspect-button svg').first()).toBeVisible({timeout:2000});
 await page.locator('#mode-baseline').click();await expect(page.locator('#mode-baseline')).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>scrollY)).toBeCloseTo(position,0);
 await capture(page,10);await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 const art=(await page.locator('.stage').first().boundingBox())!;expect(art.y+150).toBeLessThan(844);
});
