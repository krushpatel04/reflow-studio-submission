import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { assertBrowserReport } from '../support/browser-report';

test('real browser acceptance report is complete and all checks pass', async ({ page, browser }, testInfo) => {
  const fault = process.env.REFLOW_BROWSER_FAULT || 'none';
  expect(['none', 'separate-badge', 'font-parity-mismatch', 'crop-mismatch', 'rendered-mismatch']).toContain(fault);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const path = fault === 'none' ? '/verify.html' : `/verify.html?fault=${fault}`;
  const out = 'reports/ci/browser';
  await mkdir(out, { recursive: true });
  let report: unknown;
  try {
    await page.goto(path);
    const result = page.locator('#browser-verification[data-status]');
    await result.waitFor({ state: 'attached', timeout: 60000 });
    report = JSON.parse((await result.textContent())!);
    await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
    await testInfo.attach('browser-report', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    assertBrowserReport(report);
    await expect(result).toHaveAttribute('data-status', 'passed');
    expect(errors, 'No browser errors may be hidden by a passing page report').toEqual([]);
  } finally {
    await writeFile(`${out}/runtime.json`, JSON.stringify({ chromium: browser.version(), node: process.version, platform: process.platform,
      schemaVersion: 'reflow.design.v0', fault, page: path, errors, reportProduced: report !== undefined }, null, 2));
    // Evidence capture must not replace the original failure with a screenshot failure.
    if (await page.locator('#grouped-preview').count()) {
      await page.locator('#grouped-preview').screenshot({ path: `${out}/badge.png`, timeout: 5000 }).catch(() => {});
    }
    await page.screenshot({ path: `${out}/page.png`, fullPage: true, timeout: 5000 }).catch(() => {});
  }
});

test('finding selection works with keyboard at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.original-card')).toBeVisible();
  await page.getByRole('button', { name: 'Design settings', exact: true }).click();
  await page.locator('#headline').fill('A very long headline '.repeat(20));
  await page.locator('#update-copy').click();
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  await page.locator('.original-card .findings summary').click();
  const finding = page.locator('.original-card .finding-select').filter({ hasText: /text/i }).first();
  await finding.focus();
  await page.keyboard.press('Enter');
  await expect(finding).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.original-card [data-element-id="headline"]')).toHaveClass(/finding-selected/);
  await expect(page.locator('.design-card:not(.original-card) .finding-selected')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(finding).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.original-card .finding-selected')).toHaveCount(0);
});
