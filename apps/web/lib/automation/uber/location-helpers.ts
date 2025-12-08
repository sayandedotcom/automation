import type { Page } from "playwright";
import { randomDelay } from "@/lib/playwright-utils";

/**
 * Fill pickup location field
 * @param page Playwright page instance
 * @param pickup Pickup location string
 * @returns true if successfully filled
 */
export async function fillPickupLocation(
  page: Page,
  pickup: string
): Promise<boolean> {
  console.log(`📍 Filling pickup location: ${pickup}...`);

  let pickupFilled = false;

  try {
    // Try finding all text inputs and click the first one
    const allInputs = page.locator(
      'input[type="text"], input[role="combobox"]'
    );
    const inputCount = await allInputs.count();
    console.log(`   Found ${inputCount} text inputs on page`);

    if (inputCount >= 1) {
      const firstInput = allInputs.nth(0);
      await firstInput.click({ timeout: 3000 });
      await randomDelay(300, 500);
      console.log("   ✅ Clicked first input (pickup)");

      // Fill the pickup location
      await firstInput.fill(pickup);
      console.log(`   ✅ Filled pickup: "${pickup}"`);
      await randomDelay(1500, 2000);

      // Select first suggestion
      console.log("   ⏳ Waiting for suggestions...");
      const suggestionSelectors = [
        '[data-testid*="suggestion"]',
        '[role="option"]',
        'ul[role="listbox"] li',
        "ul li",
      ];

      for (const sugSelector of suggestionSelectors) {
        try {
          const suggestion = page.locator(sugSelector).first();
          if (await suggestion.isVisible({ timeout: 2000 })) {
            await suggestion.click({ timeout: 2000 });
            pickupFilled = true;
            console.log("   ✅ Selected pickup suggestion");
            break;
          }
        } catch {
          continue;
        }
      }

      // Fallback: keyboard
      if (!pickupFilled) {
        await page.keyboard.press("ArrowDown");
        await randomDelay(200, 300);
        await page.keyboard.press("Enter");
        pickupFilled = true;
        console.log("   ✅ Selected pickup via keyboard");
      }
    }
  } catch (e) {
    console.log("   ❌ Error filling pickup:", e);
  }

  return pickupFilled;
}

/**
 * Fill dropoff location field
 * @param page Playwright page instance
 * @param dropoff Dropoff location string
 * @returns true if successfully filled
 */
export async function fillDropoffLocation(
  page: Page,
  dropoff: string
): Promise<boolean> {
  console.log(`📍 Filling dropoff location: ${dropoff}...`);

  let dropoffFilled = false;

  try {
    // After pickup is selected, there should be a second input for dropoff
    const allInputs = page.locator(
      'input[type="text"], input[role="combobox"]'
    );
    const inputCount = await allInputs.count();
    console.log(`   Found ${inputCount} text inputs on page`);

    if (inputCount >= 2) {
      // Use the second input for dropoff
      const secondInput = allInputs.nth(1);
      await secondInput.click({ timeout: 3000 });
      await randomDelay(300, 500);
      console.log("   ✅ Clicked second input (dropoff)");

      // Fill the dropoff location
      await secondInput.fill(dropoff);
      console.log(`   ✅ Filled dropoff: "${dropoff}"`);
      await randomDelay(1500, 2000);

      // Select first suggestion
      console.log("   ⏳ Waiting for suggestions...");
      const suggestionSelectors = [
        '[data-testid*="suggestion"]',
        '[role="option"]',
        'ul[role="listbox"] li',
        "ul li",
      ];

      for (const sugSelector of suggestionSelectors) {
        try {
          const suggestion = page.locator(sugSelector).first();
          if (await suggestion.isVisible({ timeout: 2000 })) {
            await suggestion.click({ timeout: 2000 });
            dropoffFilled = true;
            console.log("   ✅ Selected dropoff suggestion");
            break;
          }
        } catch {
          continue;
        }
      }

      // Fallback: keyboard
      if (!dropoffFilled) {
        await page.keyboard.press("ArrowDown");
        await randomDelay(200, 300);
        await page.keyboard.press("Enter");
        dropoffFilled = true;
        console.log("   ✅ Selected dropoff via keyboard");
      }
    } else if (inputCount === 1) {
      // Maybe only one input visible - try clicking on dropoff label first
      console.log("   Only 1 input found, trying to find dropoff field...");

      const dropoffLabels = [
        'text="Dropoff location"',
        'text="Where to?"',
        '[placeholder*="Dropoff" i]',
        '[placeholder*="Where" i]',
      ];

      for (const labelSelector of dropoffLabels) {
        try {
          const label = page.locator(labelSelector).first();
          if (await label.isVisible({ timeout: 1000 })) {
            await label.click({ timeout: 2000 });
            await randomDelay(500, 800);
            console.log("   ✅ Clicked dropoff label");

            // Now find the active input and fill
            const activeInput = page
              .locator('input:focus, input[type="text"]')
              .first();
            await activeInput.fill(dropoff);
            console.log(`   ✅ Filled dropoff: "${dropoff}"`);
            await randomDelay(1500, 2000);

            await page.keyboard.press("ArrowDown");
            await randomDelay(200, 300);
            await page.keyboard.press("Enter");
            dropoffFilled = true;
            break;
          }
        } catch {
          continue;
        }
      }
    }
  } catch (e) {
    console.log("   ❌ Error filling dropoff:", e);
  }

  // Last fallback
  if (!dropoffFilled) {
    console.log("   🔄 Last fallback: keyboard.type()");
    await page.keyboard.type(dropoff, { delay: 50 });
    await randomDelay(1500, 2000);
    await page.keyboard.press("ArrowDown");
    await randomDelay(200, 300);
    await page.keyboard.press("Enter");
    dropoffFilled = true;
  }

  return dropoffFilled;
}
