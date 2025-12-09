import type { Page } from "playwright";
import { randomDelay } from "@/lib/playwright-utils";

/**
 * Travel class labels mapping for booking.com
 */
export const CLASS_LABELS: Record<string, string> = {
  economy: "Economy",
  premium_economy: "Premium economy",
  business: "Business",
  first: "First-class",
};

/**
 * Number of arrow presses needed for each travel class
 */
export const CLASS_ARROW_PRESSES: Record<string, number> = {
  economy: 0,
  premium_economy: 1,
  business: 2,
  first: 3,
};

/**
 * Select trip type (round-trip or one-way)
 */
export async function selectTripType(
  page: Page,
  tripType: string
): Promise<boolean> {
  const tripTypeText = tripType === "round-trip" ? "Round-trip" : "One-way";

  const tripTypeSelectors = [
    `label:has-text("${tripTypeText}")`,
    `span:has-text("${tripTypeText}")`,
    `text="${tripTypeText}"`,
    `input[type="radio"][value*="${tripType}"]`,
    `[data-testid*="${tripType}"]`,
  ];

  for (const selector of tripTypeSelectors) {
    try {
      console.log(`   Trying selector: ${selector}`);
      const element = page.locator(selector).first();

      if (await element.isVisible({ timeout: 2000 })) {
        await element.click({ timeout: 3000 });
        await randomDelay(500, 1000);
        console.log(`   ✅ Clicked trip type using selector: ${selector}`);
        return true;
      }
    } catch (e) {
      continue;
    }
  }

  return false;
}

/**
 * Select travel class from dropdown
 */
export async function selectTravelClass(
  page: Page,
  travelClass: string
): Promise<boolean> {
  const numPresses = CLASS_ARROW_PRESSES[travelClass] ?? 0;

  // Skip if already Economy (default)
  if (travelClass === "economy") {
    console.log("   ℹ️ Economy is the default, skipping");
    return true;
  }

  // Find and click the dropdown trigger
  console.log("   🔍 Looking for class dropdown trigger...");

  let dropdownOpened = false;

  // Strategy 1: Use specific selectors
  const triggerSelectors = [
    '[data-ui-name*="cabin"]',
    '[data-testid*="cabin"]',
    '[class*="cabin"]',
    'button:has-text("Economy")',
    'div:has-text("Economy"):has(svg)',
    'span:has-text("Economy")',
  ];

  for (const selector of triggerSelectors) {
    if (dropdownOpened) break;

    try {
      console.log(`   Trying selector: ${selector}`);
      const elements = await page.locator(selector).all();
      console.log(`   Found ${elements.length} elements`);

      for (const el of elements) {
        try {
          const box = await el.boundingBox();
          console.log(`   Element bounding box: y=${box?.y}`);

          if (box && box.y < 400 && box.y > 50) {
            await el.click({ timeout: 3000 });
            await randomDelay(600, 900);
            console.log(`   ✅ Clicked dropdown trigger at y=${box.y}`);
            dropdownOpened = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.log(`   Selector failed: ${e}`);
      continue;
    }
  }

  // Strategy 2: Try clicking first visible "Economy" text
  if (!dropdownOpened) {
    console.log("   🔄 Trying fallback: first visible Economy text...");
    try {
      const economyText = page.locator('text="Economy"').first();
      if (await economyText.isVisible({ timeout: 2000 })) {
        await economyText.click({ timeout: 3000 });
        await randomDelay(600, 900);
        dropdownOpened = true;
        console.log("   ✅ Clicked first visible Economy text");
      }
    } catch (e) {
      console.log("   ❌ Fallback also failed");
    }
  }

  // Strategy 3: Use JavaScript
  if (!dropdownOpened) {
    console.log("   🔄 Trying JavaScript click...");
    try {
      await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll("*"));
        for (const el of allElements) {
          if (
            el.textContent?.trim() === "Economy" ||
            el.textContent?.includes("Economy")
          ) {
            const rect = el.getBoundingClientRect();
            if (rect.top > 50 && rect.top < 400 && rect.width < 200) {
              (el as HTMLElement).click();
              return true;
            }
          }
        }
        return false;
      });
      await randomDelay(600, 900);
      dropdownOpened = true;
      console.log("   ✅ Clicked via JavaScript");
    } catch (e) {
      console.log("   ❌ JavaScript click failed");
    }
  }

  if (dropdownOpened) {
    // Use keyboard navigation
    console.log(
      `   ⌨️ Using keyboard navigation: ${numPresses} ArrowDown presses`
    );

    await randomDelay(300, 500);

    for (let i = 0; i < numPresses; i++) {
      await page.keyboard.press("ArrowDown");
      await randomDelay(150, 250);
    }

    await page.keyboard.press("Enter");
    await randomDelay(500, 800);
    console.log(
      `   ✅ Selected ${CLASS_LABELS[travelClass]} using keyboard navigation`
    );
    return true;
  }

  // Last resort: Try coordinate click
  console.log("   ⚠️ Could not open dropdown after all attempts");
  try {
    console.log("   🎯 Trying coordinate click at approximate position...");
    await page.mouse.click(380, 137);
    await randomDelay(600, 900);

    for (let i = 0; i < numPresses; i++) {
      await page.keyboard.press("ArrowDown");
      await randomDelay(150, 250);
    }
    await page.keyboard.press("Enter");
    await randomDelay(500, 800);
    console.log("   ✅ Selected using coordinate click + keyboard");
    return true;
  } catch (e) {
    console.log("   ❌ Coordinate click also failed");
    return false;
  }
}

/**
 * Select "Direct flights only" checkbox
 */
export async function selectDirectFlights(page: Page): Promise<boolean> {
  const directSelectors = [
    'label:has-text("Direct flights only")',
    'span:has-text("Direct flights only")',
    'text="Direct flights only"',
    'input[type="checkbox"][name*="direct" i]',
    'input[type="checkbox"][id*="direct" i]',
    '[data-testid*="direct"]',
    '[role="checkbox"]:has-text("Direct")',
    "text=/Direct/i",
  ];

  for (const selector of directSelectors) {
    try {
      console.log(`   Trying selector: ${selector}`);
      const element = page.locator(selector).first();

      if (await element.isVisible({ timeout: 2000 })) {
        await element.click({ timeout: 3000 });
        await randomDelay(500, 1000);
        console.log(`   ✅ Clicked direct flights checkbox`);
        return true;
      }
    } catch (e) {
      continue;
    }
  }

  return false;
}

/**
 * Click the search/explore button
 */
export async function clickSearchButton(page: Page): Promise<boolean> {
  const searchButtonSelectors = [
    'button:has-text("Explore")',
    'button:has-text("Search")',
    'button[type="submit"]',
    'input[type="submit"]',
    '[data-testid*="search"]',
    '[data-testid*="submit"]',
    '[data-ui-name*="search"]',
    "button.search",
    'button[class*="search" i]',
    'button[class*="submit" i]',
  ];

  for (const selector of searchButtonSelectors) {
    try {
      console.log(`   Trying selector: ${selector}`);
      const elements = await page.locator(selector).all();

      for (const element of elements) {
        try {
          const box = await element.boundingBox();
          if (box && box.y > 50 && box.y < 400) {
            await element.click({ timeout: 5000 });
            await randomDelay(500, 1000);
            console.log(`   ✅ Clicked search button using: ${selector}`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: JavaScript click
  console.log("   🔄 Trying JavaScript to find search button...");
  try {
    await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll("button"));
      for (const btn of allButtons) {
        const text = btn.textContent?.toLowerCase() || "";
        if (text.includes("explore") || text.includes("search")) {
          const rect = btn.getBoundingClientRect();
          if (rect.top > 50 && rect.top < 400) {
            (btn as HTMLElement).click();
            return true;
          }
        }
      }
      const submitBtns = document.querySelectorAll(
        'button[type="submit"], input[type="submit"]'
      );
      for (const btn of Array.from(submitBtns)) {
        const rect = btn.getBoundingClientRect();
        if (rect.top > 50 && rect.top < 400) {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    console.log("   ✅ Clicked via JavaScript");
    return true;
  } catch (e) {
    console.log("   ❌ JavaScript click failed");
    return false;
  }
}
