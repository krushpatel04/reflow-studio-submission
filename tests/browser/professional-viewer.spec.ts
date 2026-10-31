import {test, expect} from '@playwright/test';

test('desktop properties remain reachable while reviewing lower artboards, including short windows', async ({page}) => {
  for (const height of [1000, 600]) {
    await page.setViewportSize({width:1440, height});
    await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
    await page.evaluate(() => window.scrollTo(0, 650));
    const panel = await page.locator('.sidebar').boundingBox();
    expect(panel!.y, 'properties stay below the application bar during canvas review').toBeGreaterThanOrEqual(56);
    expect(panel!.y + panel!.height, 'properties panel fits the available window').toBeLessThanOrEqual(height);
    await page.locator('#export').focus();
    await expect(page.locator('#export')).toBeInViewport({ratio:1});
    await page.locator('#fixture').focus();
    await expect(page.locator('#fixture')).toBeInViewport({ratio:1});
    await page.locator('#fixture').selectOption('type-pairing');
    await expect(page.locator('#design-title')).toHaveText('Two voices, one design');
  }
});

test('scrolling an artboard into view clears the comparison toolbar when it wraps', async ({page}) => {
  for (const width of [1025, 1440]) {
    await page.setViewportSize({width, height:800});
    await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
    const card = page.locator('.design-card').nth(2);
    await card.evaluate(n => n.scrollIntoView());
    const toolbar = await page.locator('.workspace-heading').boundingBox();
    const board = await card.boundingBox();
    expect(board!.y, 'format name and dimensions stay clear of sticky tools').toBeGreaterThanOrEqual(toolbar!.y + toolbar!.height + 8);
  }
});
