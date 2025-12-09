import type { Page } from "playwright";
import { randomDelay } from "@/lib/playwright-utils";

/**
 * Click save/search/confirm button after location entry
 * @param page Playwright page instance
 * @returns true if button was clicked
 */
export async function clickSearchButton(page: Page): Promise<boolean> {
  console.log("🔍 Clicking Save/Search button...");

  let searchClicked = false;

  // Uber uses "Save" button after selecting both locations
  const searchButtonSelectors = [
    'button:has-text("Save")',
    'button:has-text("Confirm")',
    'button:has-text("Done")',
    'button:has-text("Search")',
    'button:has-text("See prices")',
    'button:has-text("Request")',
    'button[type="submit"]',
    '[data-testid*="confirm"]',
    '[data-testid*="save"]',
  ];

  for (const selector of searchButtonSelectors) {
    try {
      console.log(`   Trying selector: ${selector}`);
      const element = page.locator(selector).first();

      if (await element.isVisible({ timeout: 2000 })) {
        await element.click({ timeout: 3000 });
        await randomDelay(500, 1000);
        searchClicked = true;
        console.log(`   ✅ Clicked button: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  // Fallback: Try to find any visible primary button
  if (!searchClicked) {
    console.log("   🔄 Trying to find primary button...");
    try {
      const primaryBtn = page
        .locator('button[class*="primary" i], button[class*="submit" i]')
        .first();
      if (await primaryBtn.isVisible({ timeout: 2000 })) {
        await primaryBtn.click({ timeout: 3000 });
        searchClicked = true;
        console.log("   ✅ Clicked primary button");
      }
    } catch {
      // Try Enter key
      console.log("   🔄 Trying Enter key...");
      await page.keyboard.press("Enter");
      searchClicked = true;
    }
  }

  return searchClicked;
}

/**
 * Wait for ride options to load after search
 * @param page Playwright page instance
 */
export async function waitForRideResults(page: Page): Promise<void> {
  console.log("   ⏳ Waiting for ride options to load...");
  await randomDelay(4000, 6000);

  // Additional wait if page is still loading
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
    console.log("   ℹ️ Network idle timeout, continuing anyway");
  });

  await randomDelay(2000, 3000);
}
