import { test, expect } from '@playwright/test';

test('inspection preserves displayed artwork, supports actual size and restores keyboard focus', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.design-card')).toHaveCount(4);
  const card = page.locator('.design-card').nth(1);
  const inventory = await card.locator('[data-element-id]').evaluateAll(nodes => nodes.map(n => [n.getAttribute('data-element-id'), n.textContent]));
  const open = card.getByRole('button', { name: 'Inspect Square' });
  await open.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Square · Reflow' });
  await expect(dialog).toBeVisible();
  const clipIds = await page.locator('svg clipPath').evaluateAll(nodes => nodes.map(n => n.id));
  expect(new Set(clipIds).size).toBe(clipIds.length);
  expect(await dialog.locator('[data-element-id]').evaluateAll(nodes => nodes.map(n => [n.getAttribute('data-element-id'), n.textContent]))).toEqual(inventory);
  await dialog.getByLabel('Zoom').selectOption('1');
  const size = await dialog.locator('svg').boundingBox();
  expect(size?.width).toBeCloseTo(1080, 0); expect(size?.height).toBeCloseTo(1080, 0);
  await dialog.getByLabel('Zoom').selectOption('2');
  expect((await dialog.locator('svg').boundingBox())?.width).toBeCloseTo(2160, 0);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible(); await expect(open).toBeFocused();
  await page.locator('#mode-baseline').click();
  await card.getByRole('button', { name: 'Inspect Square' }).click();
  await expect(page.getByRole('dialog', { name: 'Square · Baseline' })).toBeVisible();
  expect(await page.locator('#inspect-art svg').getAttribute('viewBox')).toBe(await card.locator('.stage > svg').getAttribute('viewBox'));
  await page.getByRole('button', { name: 'Close preview' }).click();
  // Light-DOM IDs must be unique; Spectrum's separate shadow roots reuse local label IDs.
  const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map(n => n.id));
  expect(new Set(ids).size).toBe(ids.length);
});

test('mobile previews are readable and inspection scrolls artwork without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.design-card')).toHaveCount(4);
  const stage = await page.locator('.stage').first().boundingBox();
  expect(stage!.width).toBeGreaterThan(300);
  expect(await page.locator('.helper').first().evaluate(n => parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(12);
  await page.getByRole('button', { name: 'Inspect Original', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.width).toBeLessThanOrEqual(390);
  await dialog.getByLabel('Zoom').selectOption('1');
  const scroll = await page.locator('#inspect-viewport').evaluate(n => ({ client:n.clientWidth, scroll:n.scrollWidth }));
  expect(scroll.scroll).toBeGreaterThan(scroll.client);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Close preview' }).click();
  await expect(dialog).not.toBeVisible();
});

test('format navigation preserves zoom and artwork and returns focus to the original opener', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.design-card')).toHaveCount(4);
  const opener = page.getByRole('button', { name: 'Inspect Original', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog');
  const previous = dialog.getByRole('button', { name: 'Previous format', exact: true });
  const next = dialog.getByRole('button', { name: 'Next format', exact: true });
  await expect(previous).toBeDisabled();
  await dialog.getByRole('combobox', { name: 'Zoom', exact: true }).selectOption('1');
  for (let index = 1; index < 4; index++) {
    await next.click();
    const card = page.locator('.design-card').nth(index);
    await expect(dialog.locator('#inspect-description')).toContainText(`${index + 1} of 4`);
    await expect(dialog.getByRole('combobox', { name: 'Zoom', exact: true })).toHaveValue('1');
    expect(await dialog.locator('[data-element-id]').evaluateAll(nodes => nodes.map(n => [n.getAttribute('data-element-id'), n.textContent])))
      .toEqual(await card.locator('[data-element-id]').evaluateAll(nodes => nodes.map(n => [n.getAttribute('data-element-id'), n.textContent])));
    expect(await dialog.locator('svg').getAttribute('viewBox')).toEqual(await card.locator('.stage > svg').getAttribute('viewBox'));
  }
  await expect(next).toBeDisabled(); await expect(previous).toBeEnabled();
  await previous.click(); await expect(dialog.locator('#inspect-description')).toContainText('3 of 4');
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await opener.click(); await next.click();
  for (const button of [previous, next, dialog.getByRole('button', { name: 'Close preview' })]) {
    const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 320, height: 640 });
  for (const button of [previous, next]) {
    const lines = await button.evaluate(node => { const range = document.createRange(); range.selectNodeContents(node); return range.getClientRects().length; });
    expect(lines, 'navigation label and arrow stay on one line').toBe(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('custom-format navigation uses the committed baseline after an update failure', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.design-card')).toHaveCount(4);
  await page.locator('.custom-size summary').click();
  await page.locator('#custom-apply').click();
  await expect(page.locator('.design-card')).toHaveCount(5);
  await page.locator('#mode-baseline').click();
  await page.route('**/src/layout-worker.ts*', route => route.abort('failed'));
  await page.locator('#headline').fill('This must not appear in the inspector');
  await page.locator('#update-copy').click();
  await expect(page.locator('#update-error')).toContainText('Update not applied');
  const open = page.locator('.design-card').last().getByRole('button', { name: /^Inspect/ });
  await open.click(); const dialog = page.getByRole('dialog');
  await expect(dialog.locator('#inspect-title')).toContainText('Baseline');
  await expect(dialog.locator('#inspect-description')).toContainText('5 of 5');
  await expect(dialog.getByRole('button', { name: 'Next format', exact: true })).toBeDisabled();
  await expect(dialog).not.toContainText('This must not appear in the inspector');
  expect(await dialog.locator('svg').getAttribute('viewBox')).toEqual('0 0 1600 600');
  await dialog.getByRole('button', { name: 'Previous format', exact: true }).click();
  await expect(dialog.locator('#inspect-description')).toContainText('4 of 5');
  await page.keyboard.press('Escape'); await expect(open).toBeFocused();
});
