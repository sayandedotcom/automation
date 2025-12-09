import type { Page } from "playwright";
import { randomDelay } from "@/lib/playwright-utils";

/**
 * Handle cookie consent banners
 */
export async function handleCookieConsent(page: Page): Promise<void> {
  try {
    const cookieSelectors = [
      'button:has-text("Accept")',
      'button:has-text("Accept all")',
      'button:has-text("I agree")',
      'button[id*="accept"]',
      'button[aria-label*="Accept"]',
    ];

    for (const selector of cookieSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 })) {
        await button.click();
        console.log("✅ Accepted cookies");
        await randomDelay(500, 1000);
        return;
      }
    }
  } catch (e) {
    console.log("ℹ️ No cookie banner found or already accepted");
  }
}

/**
 * Try multiple selectors to click an element
 * Returns true if any selector worked
 */
export async function tryClickSelectors(
  page: Page,
  selectors: string[],
  options: { timeout?: number; logPrefix?: string } = {}
): Promise<boolean> {
  const { timeout = 2000, logPrefix = "" } = options;

  for (const selector of selectors) {
    try {
      console.log(`${logPrefix}   Trying selector: ${selector}`);
      const element = page.locator(selector).first();

      if (await element.isVisible({ timeout })) {
        await element.click({ timeout: 3000 });
        await randomDelay(500, 800);
        console.log(`${logPrefix}   ✅ Clicked using selector: ${selector}`);
        return true;
      }
    } catch (e) {
      continue;
    }
  }

  return false;
}

/**
 * Try to click an element containing specific text using JavaScript
 */
export async function tryJsClickByText(
  page: Page,
  searchText: string,
  options: { minY?: number; maxY?: number } = {}
): Promise<boolean> {
  const { minY = 50, maxY = 400 } = options;

  try {
    const clicked = await page.evaluate(
      ({ text, min, max }) => {
        const allElements = Array.from(document.querySelectorAll("*"));
        for (const el of allElements) {
          if (el.textContent?.includes(text)) {
            const rect = el.getBoundingClientRect();
            if (rect.top > min && rect.top < max) {
              (el as HTMLElement).click();
              return true;
            }
          }
        }
        return false;
      },
      { text: searchText, min: minY, max: maxY }
    );
    return clicked;
  } catch (e) {
    return false;
  }
}

/**
 * Automation step type
 */
export interface AutomationStepData {
  step: number;
  action: string;
  result: string;
  timestamp: string;
}

/**
 * Create an automation step entry
 */
export function createStep(
  stepNumber: number,
  action: string,
  result: string
): AutomationStepData {
  return {
    step: stepNumber,
    action,
    result,
    timestamp: new Date().toISOString(),
  };
}
