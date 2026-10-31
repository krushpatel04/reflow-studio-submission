import { test, expect } from '@playwright/test';

test('mobile opens on artwork and keeps settings reachable by keyboard', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  const art = await page.locator('.stage').first().boundingBox();
  expect(art!.y + 150, 'at least 150px of artwork is visible without scrolling').toBeLessThan(844);
  const settings = page.getByRole('button',{name:'Design settings',exact:true});
  await expect(settings).toHaveAttribute('aria-expanded','false');
  await settings.focus(); await page.keyboard.press('Enter');
  await expect(settings).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#fixture')).toBeVisible();
  await page.locator('#fixture').selectOption('type-pairing');
  await expect(page.locator('#design-title')).toHaveText('Two voices, one design');
  await settings.click(); await expect(page.locator('#fixture')).not.toBeVisible();
  await page.setViewportSize({width:1440,height:1000}); await expect(page.locator('#fixture')).toBeVisible();
});

test('full-size comparison retains zoom, target and committed exports', async ({page}) => {
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  const before = await page.locator('.design-card').nth(1).locator('[data-element-id]').evaluateAll(ns=>ns.map(n=>n.outerHTML.replaceAll(/design-\d+/g,'design')));
  await page.getByRole('button',{name:'Inspect Square',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox',{name:'Zoom',exact:true}).selectOption('1');
  await dialog.getByRole('button',{name:'Baseline',exact:true}).click();
  await expect(dialog.locator('#inspect-title')).toHaveText('Square · Baseline');
  await expect(dialog.getByRole('combobox',{name:'Zoom',exact:true})).toHaveValue('1');
  expect(await dialog.locator('[data-element-id]').evaluateAll(ns=>ns.map(n=>n.outerHTML.replaceAll(/design-\d+/g,'design')))).not.toEqual(before);
  await dialog.getByRole('button',{name:'Next format',exact:true}).click();
  await expect(dialog.locator('#inspect-title')).toHaveText('Story · Baseline');
  await dialog.getByRole('button',{name:'Reflow',exact:true}).click();
  await expect(dialog.locator('#inspect-title')).toHaveText('Story · Reflow');
  await page.keyboard.press('Escape');
  await expect(page.locator('#mode-selected')).toHaveAttribute('aria-pressed','true');
  expect(await page.locator('.design-card').nth(1).locator('[data-element-id]').evaluateAll(ns=>ns.map(n=>n.outerHTML.replaceAll(/design-\d+/g,'design')))).toEqual(before);
  await page.getByRole('button',{name:'Inspect Original',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'Baseline',exact:true})).toBeDisabled();
});

test('narrow inspector reserves most of the screen for artwork', async ({page}) => {
  await page.setViewportSize({width:320,height:640});
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  await page.getByRole('button',{name:'Inspect Square',exact:true}).click();
  const area=await page.locator('#inspect-viewport').boundingBox();
  expect(area!.height, 'keep at least 380px for artwork on a 640px screen').toBeGreaterThanOrEqual(380);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
