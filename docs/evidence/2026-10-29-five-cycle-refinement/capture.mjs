import {chromium,expect} from '@playwright/test';
const b=await chromium.launch(); const p=await b.newPage(); const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:4198');await p.locator('html[data-ready=true]').waitFor();
const settle = () => p.evaluate(async()=> { await Promise.all([...document.querySelectorAll('sp-theme, sp-button')].map(n=>n.updateComplete)); await document.fonts.ready; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); });
for (const [width,height] of [[1440,1000],[820,1180],[390,844],[320,640]]) {
 await p.setViewportSize({width,height}); await p.evaluate(()=>scrollTo(0,0)); await settle();
 await p.screenshot({animations:'disabled',path:`reports/five-cycle/viewer-light-${width}.png`});
 await p.locator('#theme-toggle').click();await settle();await p.screenshot({animations:'disabled',path:`reports/five-cycle/viewer-dark-${width}.png`});
 expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await p.getByRole('button',{name:'Inspect Square',exact:true}).click();
 await p.getByRole('dialog').getByRole('button',{name:'Baseline',exact:true}).click();
 await p.screenshot({animations:'disabled',path:`reports/five-cycle/inspector-dark-${width}.png`});
 await p.getByRole('combobox',{name:'Zoom',exact:true}).selectOption('2');
 expect(await p.locator('#inspect-art svg').evaluate(n=>n.getBoundingClientRect().width)).toBe(2160);
 await p.keyboard.press('Escape');await p.locator('#theme-toggle').click();
 if(width<761) {await p.locator('#settings-toggle').click();await p.screenshot({animations:'disabled',path:`reports/five-cycle/settings-${width}.png`});await p.locator('#settings-toggle').click();}
}
expect(errors).toEqual([]);await b.close();
