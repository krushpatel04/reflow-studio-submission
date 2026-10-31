import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
async function ready(page: Page) { await page.goto('/'); await page.locator('html[data-ready=true]').waitFor(); }
async function campaign(page: Page) {
  return page.evaluate(async () => {
    let blob: Blob | undefined;
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = value => { if (value instanceof Blob) blob = value; return create(value); };
    HTMLAnchorElement.prototype.click = function () {};
    try { document.querySelector<HTMLElement>('#export')!.click(); return JSON.parse(await blob!.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  });
}

test('cycle 1: finishing an earlier edit preserves newer draft and committed export', async ({page}) => {
  await ready(page);
  await page.route('**/src/layout-worker.ts*', async route => { await new Promise(resolve => setTimeout(resolve, 700)); await route.continue(); });
  await page.locator('#headline').fill('Submitted copy');
  await page.locator('#update-copy').click();
  await page.locator('#headline').fill('Newer draft still being edited');
  await expect(page.locator('#request-status')).toHaveText('Layout updated.');
  await expect(page.locator('#headline')).toHaveValue('Newer draft still being edited');
  await expect(page.locator('#copy-status')).toContainText('Unapplied changes');
  expect((await campaign(page)).source.elements.find((e:any)=>e.id==='headline').text).toBe('Submitted copy');
  await page.screenshot({path:'reports/five-cycle/cycle-1-draft.png'});
  await page.locator('#update-copy').click();
  await expect(page.locator('#copy-status')).toBeEmpty();
  expect((await campaign(page)).source.elements.find((e:any)=>e.id==='headline').text).toBe('Newer draft still being edited');
  await page.locator('#fixture').selectOption('type-pairing');
  await expect(page.locator('#design-title')).toHaveText('Two voices, one design');
  await expect(page.locator('#headline')).not.toHaveValue('Newer draft still being edited');
});

test('cycle 2: exact browser measurements are reused and refreshed after font events', async ({page}) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const path = '/src/typography.ts';
    const {browserMeasure} = await import(/* @vite-ignore */ path);
    const original = CanvasRenderingContext2D.prototype.measureText;
    let calls = 0;
    CanvasRenderingContext2D.prototype.measureText = function(text) { calls++; return original.call(this,text); };
    try {
      const measure = browserMeasure();
      const e = window.reflowLab.fixtures[0].elements.find(e=>e.type==='text')!;
      const first = measure('A precise comparison', e);
      const initial = calls;
      const again = measure('A precise comparison', {...e, x: e.x+1});
      const repeat = calls-initial;
      again.width = -1;
      const unchanged = measure('A precise comparison', e);
      measure('Different text', e);
      measure('A precise comparison', {...e, fontSize:e.fontSize+1});
      measure('A precise comparison', {...e, fontWeight:400});
      measure('A precise comparison', {...e, fontFamily:'Source Serif 4'});
      const distinct = calls-initial;
      document.fonts.dispatchEvent(new Event('loadingdone'));
      const beforeRefresh = calls;
      const refreshed = measure('A precise comparison', e);
      const refreshCalls = calls-beforeRefresh;
      document.fonts.dispatchEvent(new Event('loadingerror'));
      const beforeError = calls;
      measure('A precise comparison', e);
      const errorCalls = calls-beforeError;
      // Cache ceilings must evict old text; oversized strings must bypass retention.
      for(let i=0;i<1100;i++) measure(`Unique ${i}`, e);
      const beforeEvicted = calls;
      measure('A precise comparison', e);
      const evictionCalls = calls-beforeEvicted;
      const huge = 'X'.repeat(70000), beforeHuge = calls;
      measure(huge,e); measure(huge,e);
      return {first, unchanged, refreshed, repeat, distinct, refreshCalls, errorCalls, evictionCalls, hugeCalls:calls-beforeHuge};
    } finally {CanvasRenderingContext2D.prototype.measureText = original;}
  });
  await mkdir('reports/five-cycle',{recursive:true});
  await writeFile('reports/five-cycle/measurement-counts.json',JSON.stringify(result,null,2));
  expect(result.repeat).toBe(0);
  expect(result.distinct).toBe(4);
  expect(result.unchanged).toEqual(result.first);
  expect(result.refreshed).toEqual(result.first);
  expect(result.refreshCalls).toBe(1); expect(result.errorCalls).toBe(1);
  expect(result.evictionCalls).toBe(1); expect(result.hugeCalls).toBe(2);
  await page.screenshot({path:'reports/five-cycle/cycle-2-render.png'});
});

test('cycle 3: custom format removal is transactional and keeps unapplied copy', async ({page}) => {
  await ready(page);
  await page.locator('.custom-size summary').click();
  await page.locator('#custom-width').fill('800'); await page.locator('#custom-height').fill('600');
  await page.locator('#custom-apply').click();
  await expect(page.locator('.design-card')).toHaveCount(5);
  await page.locator('#headline').fill('Keep this unapplied draft');
  const before = await campaign(page);
  await expect(page.locator('#custom-remove')).toBeVisible();
  await page.route('**/src/layout-worker.ts*', route=>route.abort('failed'));
  await page.locator('#custom-remove').click();
  await expect(page.locator('#request-status')).toContainText('failed');
  await expect(page.locator('.design-card')).toHaveCount(5);
  expect(await campaign(page)).toEqual(before);
  await page.unroute('**/src/layout-worker.ts*');
  await page.locator('#retry-layout').click();
  await expect(page.locator('.design-card')).toHaveCount(4);
  expect((await campaign(page)).variants.map((v:any)=>v.target.id)).toEqual(before.variants.slice(0,3).map((v:any)=>v.target.id));
  await expect(page.locator('#headline')).toHaveValue('Keep this unapplied draft');
  await expect(page.locator('#custom-remove')).toBeHidden();
  await page.locator('#custom-apply').click();
  await expect(page.locator('.design-card')).toHaveCount(5);
  await page.locator('#custom-remove').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.design-card')).toHaveCount(4);
  await expect(page.locator('#custom-apply')).toBeFocused();
  await page.screenshot({path:'reports/five-cycle/cycle-3-formats.png'});
});

test('cycle 4: zoom keeps the inspected artwork point centered and Fit recovers', async ({page}) => {
  await ready(page);
  await page.getByRole('button',{name:'Inspect Square',exact:true}).click();
  const zoom = page.getByRole('combobox',{name:'Zoom',exact:true});
  await zoom.selectOption('1');
  await page.locator('#inspect-viewport').evaluate(n=>n.scrollTo(150,240));
  const center = () => page.locator('#inspect-viewport').evaluate(n=>{
    const v=n.getBoundingClientRect(), s=n.querySelector('svg')!.getBoundingClientRect();
    return {x:(v.left+n.clientWidth/2-s.left)/s.width, y:(v.top+n.clientHeight/2-s.top)/s.height};
  });
  const before = await center();
  await zoom.selectOption('2');
  const after = await center();
  expect(after.x).toBeCloseTo(before.x,2); expect(after.y).toBeCloseTo(before.y,2);
  await page.screenshot({path:'reports/five-cycle/cycle-4-zoom.png'});
  await zoom.selectOption('1');
  const restored = await center();
  expect(restored.x).toBeCloseTo(before.x,2); expect(restored.y).toBeCloseTo(before.y,2);
  await zoom.selectOption('fit');
  expect(await page.locator('#inspect-viewport').evaluate(n=>({x:n.scrollLeft,y:n.scrollTop}))).toEqual({x:0,y:0});
  const fit = await page.locator('#inspect-art svg').boundingBox();
  const viewport = await page.locator('#inspect-viewport').boundingBox();
  expect(fit!.height).toBeLessThan(viewport!.height); expect(fit!.width).toBeLessThan(viewport!.width);
});

test('cycle 5: tablet review gives artwork room and keeps touch tools usable', async ({page}) => {
  await page.setViewportSize({width:820,height:1180}); await ready(page);
  await page.screenshot({path:'reports/five-cycle/cycle-5-tablet.png'});
  for (const width of [768,820,1024]) {
    await page.setViewportSize({width,height:1180});
    const square = await page.locator('.stage').nth(1).evaluate(n=> {
      const css=getComputedStyle(n);
      return Math.min(n.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),n.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom));
    });
    expect(square, `square artwork at ${width}px`).toBeGreaterThanOrEqual(360);
    expect((await page.getByRole('button',{name:'Inspect Square',exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({width:1440,height:1000});
  const a=await page.locator('.stage').nth(0).boundingBox(), b=await page.locator('.stage').nth(1).boundingBox();
  expect(a!.y).toBe(b!.y); // desktop comparison still uses two columns
});

test('cycle 2 parity: cached browser layout and SVG match uncached canvas across 30 cases', async ({page}) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const paths=['/src/typography.ts','/src/engine.ts','/src/render.ts'];
    const [{browserMeasure},{reflow},{renderSvg}] = await Promise.all(paths.map(p=>import(/* @vite-ignore */ p)));
    const ctx=document.createElement('canvas').getContext('2d')!;
    const raw = (text:string,e:any) => {
      ctx.font=`${e.fontWeight} ${e.fontSize}px "${e.fontFamily}"`;
      const m=ctx.measureText(text);
      return {width:m.width,ascent:Math.max(m.actualBoundingBoxAscent,m.fontBoundingBoxAscent),descent:Math.max(m.actualBoundingBoxDescent,m.fontBoundingBoxDescent)};
    };
    const cached=browserMeasure(), original=CanvasRenderingContext2D.prototype.measureText;
    let calls=0, rawCalls=0, cachedCalls=0;
    const mismatches:string[]=[];
    const clean=(v:any)=>JSON.stringify(v,(k,v)=>k==='elapsedMs'?undefined:v);
    const cleanSvg=(v:string)=>v.replaceAll(/design-\d+/g,'design');
    CanvasRenderingContext2D.prototype.measureText=function(text){calls++;return original.call(this,text);};
    try {
      for(const fixture of window.reflowLab.fixtures) {
        await Promise.all(fixture.elements.filter(e=>e.type==='text').map(e=>document.fonts.load(`${e.fontWeight} ${e.fontSize}px "${e.fontFamily}"`,e.text)));
        await document.fonts.ready;
        for(const target of window.reflowLab.targets) {
          calls=0; const expected=reflow(fixture,target,raw); rawCalls+=calls;
          calls=0; const actual=reflow(fixture,target,cached); cachedCalls+=calls;
          if(clean(actual)!==clean(expected)) mismatches.push(`${fixture.id}/${target.id}/layout`);
          for(const mode of ['baseline','selected']) {
            const a=actual[mode], b=expected[mode];
            if(cleanSvg(renderSvg(a.design,cached,a.metrics))!==cleanSvg(renderSvg(b.design,raw,b.metrics))) mismatches.push(`${fixture.id}/${target.id}/${mode}/SVG`);
          }
        }
      }
      return {cases:30,svgComparisons:60,mismatches,rawCalls,cachedCalls};
    } finally {CanvasRenderingContext2D.prototype.measureText=original;}
  });
  await writeFile('reports/five-cycle/render-parity.json',JSON.stringify(result,null,2));
  expect(result.mismatches).toEqual([]);
  expect(result.cachedCalls).toBeLessThan(result.rawCalls);
});
