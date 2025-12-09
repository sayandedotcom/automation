import { chromium, type Browser, type Page } from "playwright";

export interface PlaywrightConfig {
  headless?: boolean;
  timeout?: number;
}

export async function launchBrowser(
  config: PlaywrightConfig = {}
): Promise<Browser> {
  const { headless = true, timeout = 60000 } = config;

  return await chromium.launch({
    headless,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });
}

export async function setupStealthMode(page: Page): Promise<void> {
  // Remove webdriver property
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });
  });

  // Set realistic user agent
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });
}

export async function randomDelay(min: number = 500, max: number = 1500): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function typeWithDelay(
  page: Page,
  selector: string,
  text: string,
  minDelay: number = 50,
  maxDelay: number = 150
): Promise<void> {
  await page.click(selector);
  await randomDelay(200, 400);
  
  for (const char of text) {
    await page.keyboard.type(char);
    await randomDelay(minDelay, maxDelay);
  }
}

export function formatCityForUrl(city: string): string {
  return city.trim().replace(/\s+/g, "-").toLowerCase();
}
