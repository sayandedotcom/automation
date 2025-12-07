import type { Page } from "playwright";
import { randomDelay } from "@/lib/playwright-utils";

/**
 * Open the travelers dropdown
 */
export async function openTravelersDropdown(page: Page): Promise<boolean> {
  const travelersSelectors = [
    'text="Travelers"',
    'text="1 adult"',
    'text="2 adults"',
    'span:has-text("Travelers")',
    'span:has-text("adult")',
    'button:has-text("adult")',
    '[data-ui-name*="occupancy"]',
    '[data-testid*="occupancy"]',
    '[data-testid*="traveler"]',
  ];

  for (const selector of travelersSelectors) {
    try {
      console.log(`   Trying selector: ${selector}`);
      const element = page.locator(selector).first();

      if (await element.isVisible({ timeout: 2000 })) {
        await element.click({ timeout: 3000 });
        await randomDelay(800, 1200);
        console.log(`   ✅ Clicked travelers field`);
        return true;
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: Try JavaScript click
  console.log("   🔄 Trying JavaScript click for travelers field...");
  try {
    await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll("*"));
      for (const el of allElements) {
        if (
          el.textContent?.includes("Travelers") ||
          el.textContent?.match(/\d+\s*adult/)
        ) {
          const rect = el.getBoundingClientRect();
          if (rect.top > 50 && rect.top < 400 && rect.width > 50) {
            (el as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });
    await randomDelay(800, 1200);
    console.log("   ✅ Clicked via JavaScript");
    return true;
  } catch (e) {
    console.log("   ❌ JavaScript click failed");
  }

  return false;
}

/**
 * Get current number of adults from the travelers dropdown
 */
export async function getCurrentAdultsCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    // Method 1: Look for the specific InputStepper value span for adults
    const minusBtn = document.querySelector(
      '[data-ui-name="button_occupancy_adults_minus"]'
    );
    const plusBtn = document.querySelector(
      '[data-ui-name="button_occupancy_adults_plus"]'
    );

    if (minusBtn && plusBtn) {
      const container =
        minusBtn.closest('[class*="InputStepper"]') ||
        minusBtn.parentElement?.parentElement;

      if (container) {
        const valueSpans = container.querySelectorAll(
          'span[class*="value"], span[aria-hidden="true"]'
        );
        for (const span of Array.from(valueSpans)) {
          const text = span.textContent?.trim();
          if (text && /^\d+$/.test(text)) {
            const num = parseInt(text);
            if (num >= 1 && num <= 9) {
              return num;
            }
          }
        }
      }

      // Alternative: Look for any span between the two buttons
      const parent = minusBtn.parentElement;
      if (parent) {
        const allSpans = parent.querySelectorAll("span");
        for (const span of Array.from(allSpans)) {
          const text = span.textContent?.trim();
          if (text && /^[1-9]$/.test(text)) {
            return parseInt(text);
          }
        }
      }
    }

    // Method 2: Find all spans with class containing "value"
    const allValueSpans = document.querySelectorAll(
      '[class*="InputStepper"] span[class*="value"], [class*="occupancy"] span[class*="value"]'
    );
    if (allValueSpans.length > 0) {
      const firstValue = allValueSpans[0].textContent?.trim();
      if (firstValue && /^\d+$/.test(firstValue)) {
        return parseInt(firstValue);
      }
    }

    // Method 3: Look for spans in the dropdown
    const dropdownArea = document.querySelector(
      '[class*="occupancy"], [class*="traveler"], [class*="Popover"]'
    );
    if (dropdownArea) {
      const allSpans = dropdownArea.querySelectorAll("span");
      for (const span of Array.from(allSpans)) {
        const text = span.textContent?.trim();
        if (text && /^[1-9]$/.test(text)) {
          const className = span.className || "";
          const hasValueClass =
            className.includes("value") || className.includes("Value");
          const isAriaHidden = span.getAttribute("aria-hidden") === "true";

          if (hasValueClass || isAriaHidden) {
            return parseInt(text);
          }
        }
      }
    }

    // Default
    return 1;
  });
}

/**
 * Adjust adults count by clicking plus/minus buttons
 */
export async function adjustAdultsCount(
  page: Page,
  targetAdults: number
): Promise<boolean> {
  const currentAdults = await getCurrentAdultsCount(page);
  console.log(
    `   📊 Current adults: ${currentAdults}, Target: ${targetAdults}`
  );

  const clicksNeeded = targetAdults - currentAdults;

  if (clicksNeeded === 0) {
    console.log(`   ✅ Already at ${targetAdults} adult(s)`);
    return true;
  }

  if (clicksNeeded > 0) {
    // Increase adults
    console.log(`   ➕ Need to click + button ${clicksNeeded} times`);

    for (let i = 0; i < clicksNeeded; i++) {
      try {
        const plusButton = page.locator(
          '[data-ui-name="button_occupancy_adults_plus"]'
        );

        if (await plusButton.isVisible({ timeout: 2000 })) {
          const isDisabled = await plusButton.getAttribute("disabled");
          if (isDisabled === null) {
            await plusButton.click({ force: true, timeout: 3000 });
            console.log(`   ➕ Clicked + (${i + 1}/${clicksNeeded})`);
            await randomDelay(400, 600);
          } else {
            console.log(`   ⚠️ Plus button is disabled`);
            break;
          }
        } else {
          // Fallback: Try clicking by class pattern
          const plusByClass = page
            .locator('button[class*="add"], button[class*="Add"]')
            .first();
          if (await plusByClass.isVisible({ timeout: 1000 })) {
            await plusByClass.click({ force: true });
            console.log(`   ➕ Clicked + by class (${i + 1}/${clicksNeeded})`);
            await randomDelay(400, 600);
          } else {
            console.log(`   ❌ Could not find + button`);
            break;
          }
        }
      } catch (e) {
        console.log(`   ❌ Error clicking + button:`, e);
        break;
      }
    }
  } else {
    // Decrease adults
    const decreaseClicks = Math.abs(clicksNeeded);
    console.log(`   ➖ Need to click - button ${decreaseClicks} times`);

    for (let i = 0; i < decreaseClicks; i++) {
      try {
        const minusButton = page.locator(
          '[data-ui-name="button_occupancy_adults_minus"]'
        );

        if (await minusButton.isVisible({ timeout: 2000 })) {
          const isDisabled = await minusButton.getAttribute("disabled");
          if (isDisabled === null) {
            await minusButton.click({ force: true, timeout: 3000 });
            console.log(`   ➖ Clicked - (${i + 1}/${decreaseClicks})`);
            await randomDelay(400, 600);
          } else {
            console.log(
              `   ⚠️ Minus button is disabled (may have reached minimum)`
            );
            break;
          }
        } else {
          // Fallback
          const minusByClass = page
            .locator('button[class*="subtract"], button[class*="Subtract"]')
            .first();
          if (await minusByClass.isVisible({ timeout: 1000 })) {
            await minusByClass.click({ force: true });
            console.log(
              `   ➖ Clicked - by class (${i + 1}/${decreaseClicks})`
            );
            await randomDelay(400, 600);
          } else {
            console.log(`   ❌ Could not find - button`);
            break;
          }
        }
      } catch (e) {
        console.log(`   ❌ Error clicking - button:`, e);
        break;
      }
    }
  }

  return true;
}

/**
 * Close travelers dropdown by clicking Done button
 */
export async function closeTravelersDropdown(page: Page): Promise<void> {
  await randomDelay(300, 500);
  try {
    const doneButton = page.locator('button:has-text("Done")').first();
    if (await doneButton.isVisible({ timeout: 1000 })) {
      await doneButton.click();
      console.log("   ✅ Clicked Done button");
    }
  } catch (e) {
    console.log("   ℹ️ No Done button or already closed");
  }
  await randomDelay(300, 500);
}

/**
 * Select number of travelers (adults)
 */
export async function selectTravelers(
  page: Page,
  targetAdults: number
): Promise<boolean> {
  // Skip if 1 adult (default)
  if (targetAdults === 1) {
    console.log("   ℹ️ 1 adult is the default, no action needed");
    return true;
  }

  const opened = await openTravelersDropdown(page);
  if (!opened) {
    return false;
  }

  await randomDelay(500, 800);

  const adjusted = await adjustAdultsCount(page, targetAdults);
  await closeTravelersDropdown(page);

  return adjusted;
}
