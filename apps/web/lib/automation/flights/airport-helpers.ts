import type { Page } from "playwright";
import { randomDelay } from "@/lib/playwright-utils";

/**
 * Extract 3-letter airport code from a string
 */
export function extractAirportCode(airportString: string): string {
  const match = airportString.match(/^([A-Z]{3})/i);
  return match ? match[1].toUpperCase() : airportString.toUpperCase();
}

/**
 * Get pre-filled airport info from the page
 */
export async function getPrefilledAirportInfo(
  page: Page,
  containerAriaLabel: string
): Promise<{ hasChip: boolean; code: string; fullText: string }> {
  return page.evaluate((ariaLabel) => {
    const container = document.querySelector(`div[aria-label="${ariaLabel}"]`);
    if (container) {
      const chipBtn = container.querySelector(
        "button[data-autocomplete-chip-idx]"
      ) as HTMLElement;
      if (chipBtn) {
        const bTag = chipBtn.querySelector("b");
        const code = bTag?.textContent?.trim() || "";
        return {
          hasChip: true,
          code: code,
          fullText: chipBtn.textContent?.slice(0, 50) || "",
        };
      }
    }

    // Fallback: look for any chip button
    const anyChip = document.querySelector(
      "button[data-autocomplete-chip-idx]"
    ) as HTMLElement;
    if (anyChip) {
      const bTag = anyChip.querySelector("b");
      const code = bTag?.textContent?.trim() || "";
      return {
        hasChip: true,
        code: code,
        fullText: anyChip.textContent?.slice(0, 50) || "",
      };
    }

    return { hasChip: false, code: "", fullText: "" };
  }, containerAriaLabel);
}

/**
 * Clear pre-filled airport chip
 */
export async function clearAirportChip(
  page: Page,
  containerAriaLabel: string
): Promise<boolean> {
  // Method 1: Click the chip button directly using the data attribute
  try {
    console.log(
      `   🔍 Looking for chip in '${containerAriaLabel}' container...`
    );
    const chipSelector = `div[aria-label="${containerAriaLabel}"] button[data-autocomplete-chip-idx]`;
    await page.waitForSelector(chipSelector, { timeout: 3000 });
    console.log("   ✅ Found chip button in container");
    await page.click(chipSelector, { force: true });
    await randomDelay(600, 900);
    console.log("   ✅ Clicked chip button to remove pre-filled airport");
    return true;
  } catch (e) {
    console.log("   ⚠️ Container/chip selector didn't work");
  }

  // Method 2: Try using the Actionable-module class
  try {
    console.log("   Trying Method 2: Actionable-module class...");
    const chipSelector2 =
      'button[class*="Actionable-module"][class*="Chip-module"]';
    await page.waitForSelector(chipSelector2, { timeout: 2000 });
    await page.click(chipSelector2, { force: true });
    await randomDelay(600, 900);
    console.log("   ✅ Clicked chip using Actionable-module class");
    return true;
  } catch (e) {
    console.log("   ⚠️ Method 2 failed");
  }

  // Method 3: Use JavaScript
  try {
    console.log("   Trying Method 3: Direct JavaScript element.click()...");
    const clicked = await page.evaluate((ariaLabel) => {
      const container = document.querySelector(
        `div[aria-label="${ariaLabel}"]`
      );
      if (container) {
        const chipBtn = container.querySelector("button") as HTMLElement;
        if (chipBtn) {
          chipBtn.click();
          return { success: true, text: chipBtn.textContent?.slice(0, 30) };
        }
      }

      const anyChip = document.querySelector(
        "button[data-autocomplete-chip-idx]"
      ) as HTMLElement;
      if (anyChip) {
        anyChip.click();
        return { success: true, text: anyChip.textContent?.slice(0, 30) };
      }

      return { success: false, text: "" };
    }, containerAriaLabel);

    if (clicked.success) {
      await randomDelay(600, 900);
      console.log(`   ✅ JS click on chip: ${clicked.text}`);
      return true;
    }
  } catch (e) {
    console.log("   ⚠️ Method 3 failed");
  }

  // Method 4: Click on the b tag
  try {
    console.log("   Trying Method 4: Click on airport code text (b tag)...");
    await page.click(`button[data-autocomplete-chip-idx] b`, { force: true });
    await randomDelay(600, 900);
    console.log("   ✅ Clicked on airport code text");
    return true;
  } catch (e) {
    console.log("   ⚠️ Method 4 failed");
  }

  // Method 5: Use keyboard - Backspace to clear
  try {
    console.log("   Trying Method 5: Backspace key...");
    await page.keyboard.press("Backspace");
    await randomDelay(400, 600);
    console.log("   ✅ Used Backspace to remove chip");
    return true;
  } catch (e) {
    console.log("   ⚠️ Method 5 failed");
  }

  return false;
}

/**
 * Type airport code into input field
 */
export async function typeAirportCode(
  page: Page,
  airportCode: string,
  containerAriaLabel: string
): Promise<boolean> {
  const inputSelectors = [
    'input[data-ui-name="input_text_autocomplete"]',
    'input[class*="AutoComplete-module__textInput"]',
    `div[aria-label="${containerAriaLabel}"] input[type="text"]`,
    'input[role="combobox"][aria-controls*="suggestions"]',
    'input[type="text"][class*="autocomplete" i]',
    'input[type="text"]',
  ];

  for (const selector of inputSelectors) {
    try {
      console.log(`   Trying input selector: ${selector}`);
      const input = page.locator(selector).first();

      if (await input.isVisible({ timeout: 2000 })) {
        await input.click({ timeout: 2000 });
        await randomDelay(200, 300);
        await input.fill(airportCode);
        await randomDelay(300, 500);
        console.log(`   ✅ Typed airport code using: ${selector}`);
        return true;
      }
    } catch (e) {
      console.log(`   ⚠️ Selector ${selector} failed`);
      continue;
    }
  }

  // Fallback: Try keyboard.type()
  console.log("   🔄 Fallback: Using keyboard.type()...");
  try {
    await page.click(`div[aria-label="${containerAriaLabel}"]`, {
      timeout: 2000,
    });
    await randomDelay(300, 500);
    await page.keyboard.type(airportCode, { delay: 100 });
    console.log("   ✅ Typed using keyboard after container click");
    return true;
  } catch (e) {
    console.log("   ⚠️ Container click fallback failed");
  }

  // Last resort: Just type on the page
  console.log("   🔄 Last resort: Typing directly...");
  await page.keyboard.type(airportCode, { delay: 150 });
  return true;
}

/**
 * Select airport from suggestion dropdown
 */
export async function selectAirportSuggestion(
  page: Page,
  airportCode: string
): Promise<boolean> {
  try {
    const clicked = await page.evaluate((code) => {
      const listItems = document.querySelectorAll('li, [role="option"]');

      // First: Find the first item with SVG that contains the airport code
      for (const item of Array.from(listItems)) {
        const text = item.textContent || "";
        const upperText = text.toUpperCase();

        if (text.includes("Anywhere") || text.includes("Explore")) {
          continue;
        }

        if (!upperText.includes(code)) {
          continue;
        }

        const svg = item.querySelector("svg");
        if (svg) {
          (item as HTMLElement).click();
          return { success: true, text: text.slice(0, 60) };
        }
      }

      // Fallback: Just click the first item with the airport code
      for (const item of Array.from(listItems)) {
        const text = item.textContent || "";
        const upperText = text.toUpperCase();

        if (text.includes("Anywhere") || text.includes("Explore")) {
          continue;
        }

        if (upperText.includes(code)) {
          (item as HTMLElement).click();
          return { success: true, text: text.slice(0, 60) };
        }
      }

      return { success: false, text: "" };
    }, airportCode);

    if (clicked.success) {
      console.log(`   ✅ Selected airport: ${clicked.text}`);
      await randomDelay(500, 800);
      return true;
    } else {
      console.log("   ⚠️ No matching suggestion found");
    }
  } catch (e) {
    console.log("   ⚠️ JS selection failed");
  }

  // Fallback: Try Playwright locator
  try {
    console.log("   🔍 Trying Playwright locator...");
    const airportOption = page
      .locator(`li:has(svg):has-text("${airportCode}")`)
      .first();

    if (await airportOption.isVisible({ timeout: 2000 })) {
      await airportOption.click({ timeout: 3000 });
      console.log("   ✅ Clicked airport via locator");
      await randomDelay(500, 800);
      return true;
    }
  } catch (e) {
    console.log("   ⚠️ Locator for Airport option failed");
  }

  // Last fallback: Just press Enter
  console.log("   ⌨️ Fallback: pressing Enter on current selection");
  await page.keyboard.press("Enter");
  await randomDelay(500, 800);
  return true;
}

/**
 * Select origin airport (Leaving from)
 */
export async function selectOriginAirport(
  page: Page,
  from: string
): Promise<boolean> {
  const targetAirportCode = extractAirportCode(from);
  console.log(`   🔍 Target airport code: ${targetAirportCode}`);

  // Click on "Leaving from" field
  const leavingFromSelectors = [
    'text="Leaving from"',
    'span:has-text("Leaving from")',
    'div:has-text("Leaving from")',
    '[data-ui-name*="origin"]',
    '[data-testid*="origin"]',
  ];

  let leavingFromClicked = false;

  for (const selector of leavingFromSelectors) {
    try {
      console.log(`   Trying selector: ${selector}`);
      const element = page.locator(selector).first();

      if (await element.isVisible({ timeout: 2000 })) {
        await element.click({ timeout: 3000 });
        await randomDelay(500, 800);
        console.log(`   ✅ Clicked "Leaving from" field`);
        leavingFromClicked = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: Try JavaScript click
  if (!leavingFromClicked) {
    console.log("   🔄 Trying JavaScript click for Leaving from...");
    try {
      await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll("*"));
        for (const el of allElements) {
          if (el.textContent?.includes("Leaving from")) {
            const rect = el.getBoundingClientRect();
            if (rect.top > 50 && rect.top < 400) {
              (el as HTMLElement).click();
              return true;
            }
          }
        }
        return false;
      });
      await randomDelay(500, 800);
      leavingFromClicked = true;
      console.log("   ✅ Clicked via JavaScript");
    } catch (e) {
      console.log("   ❌ JavaScript click failed");
    }
  }

  if (!leavingFromClicked) {
    console.log("   ❌ Could not open Leaving from field");
    return false;
  }

  await randomDelay(800, 1200);

  // Check for pre-filled airport
  const prefilledInfo = await getPrefilledAirportInfo(
    page,
    "Departure airport or city"
  );
  console.log(`   🔍 Pre-filled airport info:`, prefilledInfo);

  const prefilledAirportCode = prefilledInfo.code.toUpperCase();

  // If already matches, skip
  if (prefilledInfo.hasChip && prefilledAirportCode === targetAirportCode) {
    console.log(
      `   ✅ Airport ${targetAirportCode} already pre-filled, skipping change`
    );
    await page.keyboard.press("Escape");
    await randomDelay(300, 500);
    return true;
  }

  // Clear if needed
  if (prefilledInfo.hasChip) {
    console.log(
      `   🗑️ Clearing existing airport chip: ${prefilledAirportCode}...`
    );
    await clearAirportChip(page, "Departure airport or city");
    await randomDelay(500, 700);
  }

  // Type and select airport
  console.log(`   ⌨️ Typing airport code: ${from}`);
  await typeAirportCode(page, from, "Departure airport or city");

  console.log("   ⏳ Waiting for airport suggestions...");
  await randomDelay(1500, 2000);

  const airportCode = extractAirportCode(from);
  console.log(`   🔍 Looking for airport with code: ${airportCode}`);

  return selectAirportSuggestion(page, airportCode);
}

/**
 * Select destination airport (Going to)
 */
export async function selectDestinationAirport(
  page: Page,
  to: string
): Promise<boolean> {
  // Click on "Going to" field
  const goingToSelectors = [
    'text="Going to"',
    'span:has-text("Going to")',
    'input[placeholder*="Going" i]',
    'input[placeholder*="destination" i]',
    '[data-ui-name*="destination"]',
    '[data-testid*="destination"]',
    'button:has-text("Going to")',
  ];

  let goingToClicked = false;

  for (const selector of goingToSelectors) {
    try {
      console.log(`   Trying selector: ${selector}`);
      const element = page.locator(selector).first();

      if (await element.isVisible({ timeout: 2000 })) {
        await element.click({ timeout: 3000 });
        await randomDelay(500, 800);
        console.log(`   ✅ Clicked "Going to" field`);
        goingToClicked = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: Try JavaScript click
  if (!goingToClicked) {
    console.log("   🔄 Trying JavaScript click for Going to...");
    try {
      await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll("*"));
        for (const el of allElements) {
          if (el.textContent?.includes("Going to")) {
            const rect = el.getBoundingClientRect();
            if (rect.top > 50 && rect.top < 400) {
              (el as HTMLElement).click();
              return true;
            }
          }
        }
        return false;
      });
      await randomDelay(500, 800);
      goingToClicked = true;
      console.log("   ✅ Clicked via JavaScript");
    } catch (e) {
      console.log("   ❌ JavaScript click failed");
    }
  }

  if (!goingToClicked) {
    return false;
  }

  await randomDelay(300, 500);

  // Type and select destination
  console.log(`   ⌨️ Entering airport: ${to}`);

  const destInputSelectors = [
    'input[data-ui-name="input_text_autocomplete"]',
    'input[class*="AutoComplete-module__textInput"]',
    'div[aria-label="Destination airport or city"] input[type="text"]',
    'input[role="combobox"]',
    'input[type="text"]',
  ];

  let inputFilled = false;
  for (const selector of destInputSelectors) {
    try {
      const input = page.locator(selector).first();
      if (await input.isVisible({ timeout: 1000 })) {
        await input.fill(to);
        inputFilled = true;
        console.log(`   ✅ Filled input using: ${selector}`);
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!inputFilled) {
    console.log("   🔄 Fallback: using keyboard.type...");
    await page.keyboard.type(to, { delay: 50 });
  }

  console.log("   ⏳ Waiting for airport suggestions...");
  await randomDelay(1500, 2000);

  const destCode = extractAirportCode(to);
  console.log(`   🔍 Looking for airport with code: ${destCode}`);

  return selectAirportSuggestion(page, destCode);
}
