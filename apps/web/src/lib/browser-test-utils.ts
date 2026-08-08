/**
 * Shared Puppeteer helpers — domcontentloaded + selector waits (no networkidle2).
 */
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

export const BASE = 'http://localhost:3000';
export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const BROWSER_ARGS = ['--no-sandbox', '--disable-setuid-sandbox'] as const;

export async function launchTestBrowser(): Promise<Browser> {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [...BROWSER_ARGS],
  });
}

/** Navigate and wait for a ready selector instead of network idle. */
export async function gotoPage(
  page: Page,
  path: string,
  waitSelector?: string,
  timeout = 30000
): Promise<void> {
  const url = path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout });
  }
}

export async function reloadPage(
  page: Page,
  waitSelector?: string,
  timeout = 30000
): Promise<void> {
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout });
  }
}

export async function waitForLoadingGone(page: Page, text: string, timeout = 30000): Promise<void> {
  await page.waitForFunction(
    (t) => !document.body.textContent?.includes(t),
    { timeout },
    text
  );
}

export async function setReactInput(page: Page, selector: string, value: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: 15000 });
  await page.$eval(
    selector,
    (el, val) => {
      const input = el as HTMLInputElement;
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    value
  );
}

/** Open POS terminal for a table — waits for menu load, not network idle. */
export async function openPosTable(page: Page, tableId: string): Promise<void> {
  await gotoPage(page, '/orders?tab=tables', `[data-testid="pos-table-${tableId}"]`);
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/api/menu/categories') && res.request().method() === 'GET',
      { timeout: 30000 }
    ),
    page.evaluate((id) => {
      document.querySelector<SVGGElement>(`[data-testid="pos-table-${id}"]`)?.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true })
      );
    }, tableId),
  ]);
  await page.waitForSelector('[data-testid="pos-terminal-modal"]', { timeout: 30000 });
  await waitForLoadingGone(page, 'Loading menu');
}
