import { NextRequest, NextResponse } from "next/server";
import {
  launchBrowser,
  setupStealthMode,
  randomDelay,
} from "@/lib/playwright-utils";
import { generateObject } from "ai";
import type { Page } from "playwright";
import {
  pageAnalysisSchema,
  verificationSchema,
  flightDetailsSchema,
} from "@/lib/schema/flights";
import { visionModel } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let browser;
  const steps: Array<{
    step: number;
    action: string;
    result: string;
    timestamp: string;
  }> = [];

  try {
    const body = await request.json();
    const {
      tripType,
      travelClass,
      directFlights,
      from,
      to,
      departDate,
      returnDate,
      adults,
    } = body;

    console.log("🚀 Starting automation with:", {
      tripType,
      travelClass,
      directFlights,
      from,
      to,
      departDate,
      returnDate,
      adults,
    });

    // Launch browser
    const headless = process.env.HEADFUL !== "true";
    console.log(`🌐 Launching browser (headless: ${headless})...`);

    browser = await launchBrowser({ headless });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();
    await setupStealthMode(page);

    // ==================
    // STEP 1: Load booking.com/flights
    // ==================
    console.log("📍 Step 1: Loading booking.com/flights...");
    const url = "https://www.booking.com/flights";
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await randomDelay(3000, 4000);

    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {
      console.log("ℹ️ Network idle timeout, continuing anyway");
    });
    await randomDelay(2000, 3000);

    // Handle cookie consent
    await handleCookieConsent(page);
    await randomDelay(1000, 2000);

    steps.push({
      step: 1,
      action: "Load booking.com/flights",
      result: "✅ Page loaded successfully",
      timestamp: new Date().toISOString(),
    });

    // ==================
    // STEP 2: Take Initial Screenshot for AI analysis
    // ==================
    console.log("📸 Step 2: Taking initial screenshot for AI...");
    const screenshot1 = await page.screenshot({ fullPage: false, type: "png" });
    const base64Screenshot1 = screenshot1.toString("base64");

    steps.push({
      step: 2,
      action: "Capture page for AI analysis",
      result: "✅ Screenshot captured",
      timestamp: new Date().toISOString(),
    });

    // ==================
    // STEP 3: Gemini analyzes the page
    // ==================
    console.log("🤖 Step 3: Asking Gemini to analyze the page...");

    const { object: analysis } = await generateObject({
      model: visionModel,
      schema: pageAnalysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this screenshot of booking.com/flights page.

Look for these UI elements:
1. Trip type options - "Round-trip" and "One-way" radio buttons (usually at the top left of the form)
2. Travel class dropdown - shows "Economy", "Premium Economy", "Business", "First" (usually next to trip type)
3. "Direct flights only" checkbox (usually on the right side of the form options)

Tell me:
- Are the trip type radio buttons visible?
- What is currently selected (Round-trip or One-way)?
- Is the class dropdown visible?
- What class is currently selected?
- Is the "Direct flights only" checkbox visible?
- Is it currently checked or unchecked?`,
            },
            {
              type: "image",
              image: base64Screenshot1,
            },
          ],
        },
      ],
    });

    console.log("🔍 Gemini analysis:", JSON.stringify(analysis, null, 2));

    steps.push({
      step: 3,
      action: "Gemini AI analyzing page elements",
      result: `✅ Analysis complete - Trip type: ${analysis.currentTripType || "unknown"}, Class: ${analysis.currentClass || "unknown"}, Direct flights: ${analysis.directFlightsChecked ? "checked" : "unchecked"}`,
      timestamp: new Date().toISOString(),
    });

    // ==================
    // STEP 4: Select Trip Type (Round-trip / One-way)
    // ==================
    console.log(`🖱️ Step 4: Selecting trip type: ${tripType}...`);

    let tripTypeClicked = false;
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
          tripTypeClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    steps.push({
      step: 4,
      action: `Select trip type: ${tripTypeText}`,
      result: tripTypeClicked
        ? `✅ Selected ${tripTypeText}`
        : `⚠️ Could not click ${tripTypeText} (may already be selected)`,
      timestamp: new Date().toISOString(),
    });

    await randomDelay(500, 1000);

    // ==================
    // STEP 5: Select Travel Class
    // ==================
    console.log(`🖱️ Step 5: Selecting travel class: ${travelClass}...`);

    let classClicked = false;
    // Match booking.com's exact dropdown text
    const classLabels: Record<string, string> = {
      economy: "Economy",
      premium_economy: "Premium economy",
      business: "Business",
      first: "First-class",
    };
    const classText = classLabels[travelClass] || travelClass;

    // Map class to number of arrow down presses needed (Economy=0, Premium=1, Business=2, First=3)
    const arrowPresses: Record<string, number> = {
      economy: 0,
      premium_economy: 1,
      business: 2,
      first: 3,
    };
    const numPresses = arrowPresses[travelClass] ?? 0;

    // Skip if already Economy (default)
    if (travelClass === "economy") {
      console.log("   ℹ️ Economy is the default, skipping");
      classClicked = true;
    } else {
      // Find and click the dropdown trigger
      console.log("   🔍 Looking for class dropdown trigger...");

      let dropdownOpened = false;

      // Strategy 1: Find the Economy dropdown trigger by looking for the text with a chevron/arrow
      // On booking.com, it's usually "Economy ∨" or similar
      const triggerSelectors = [
        // Most specific selectors first
        '[data-ui-name*="cabin"]',
        '[data-testid*="cabin"]',
        '[class*="cabin"]',
        // Look for Economy with dropdown indicator
        'button:has-text("Economy")',
        'div:has-text("Economy"):has(svg)', // Economy with dropdown arrow
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

              // Form area on booking.com is typically in the top 400px
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

      // Strategy 2: If still not found, try clicking first visible "Economy" text
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

      // Strategy 3: Use JavaScript to find and click the element
      if (!dropdownOpened) {
        console.log("   🔄 Trying JavaScript click...");
        try {
          await page.evaluate(() => {
            // Find all elements containing "Economy" text
            const allElements = Array.from(document.querySelectorAll("*"));
            for (const el of allElements) {
              if (
                el.textContent?.trim() === "Economy" ||
                el.textContent?.includes("Economy")
              ) {
                const rect = el.getBoundingClientRect();
                // Must be in form area (top portion of page)
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
        // Use KEYBOARD NAVIGATION - most reliable method
        console.log(
          `   ⌨️ Using keyboard navigation: ${numPresses} ArrowDown presses`
        );

        // Small delay to ensure dropdown is open
        await randomDelay(300, 500);

        // Press ArrowDown to navigate to the option
        for (let i = 0; i < numPresses; i++) {
          await page.keyboard.press("ArrowDown");
          await randomDelay(150, 250);
        }

        // Press Enter to select
        await page.keyboard.press("Enter");
        await randomDelay(500, 800);
        classClicked = true;
        console.log(`   ✅ Selected ${classText} using keyboard navigation`);
      } else {
        console.log("   ⚠️ Could not open dropdown after all attempts");

        // Last resort: Try clicking at approximate coordinates where the dropdown should be
        // Based on the screenshot, the Economy dropdown is around x=380, y=137
        try {
          console.log(
            "   🎯 Trying coordinate click at approximate position..."
          );
          await page.mouse.click(380, 137);
          await randomDelay(600, 900);

          // Try keyboard navigation anyway
          for (let i = 0; i < numPresses; i++) {
            await page.keyboard.press("ArrowDown");
            await randomDelay(150, 250);
          }
          await page.keyboard.press("Enter");
          await randomDelay(500, 800);
          classClicked = true;
          console.log("   ✅ Selected using coordinate click + keyboard");
        } catch (e) {
          console.log("   ❌ Coordinate click also failed");
        }
      }
    }

    steps.push({
      step: 5,
      action: `Select travel class: ${classText}`,
      result: classClicked
        ? `✅ Selected ${classText}`
        : `⚠️ Could not select ${classText} (may already be selected)`,
      timestamp: new Date().toISOString(),
    });

    await randomDelay(500, 1000);

    // ==================
    // STEP 6: Select "Leaving from" origin
    // ==================
    let originSelected = false;

    if (from) {
      console.log(`🖱️ Step 6: Selecting origin airport: ${from}...`);

      // Extract the 3-letter airport code from the full name (e.g., "CCU" from "CCU Netaji Subhash...")
      const targetCodeMatch = from.match(/^([A-Z]{3})/i);
      const targetAirportCode = targetCodeMatch
        ? targetCodeMatch[1].toUpperCase()
        : from.toUpperCase();
      console.log(`   🔍 Target airport code: ${targetAirportCode}`);

      // Step 1: Click on "Leaving from" field to open the dropdown first
      let leavingFromClicked = false;

      const leavingFromSelectors = [
        'text="Leaving from"',
        'span:has-text("Leaving from")',
        'div:has-text("Leaving from")',
        '[data-ui-name*="origin"]',
        '[data-testid*="origin"]',
      ];

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

      // Fallback: Try JavaScript click for "Leaving from"
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

      if (leavingFromClicked) {
        // Wait for the dropdown to open
        await randomDelay(800, 1200);

        // Step 2: Check if there's a pre-filled airport chip and get its code
        const prefilledInfo = await page.evaluate(() => {
          // Look for the chip button inside the Departure airport container
          const container = document.querySelector(
            'div[aria-label="Departure airport or city"]'
          );
          if (container) {
            const chipBtn = container.querySelector(
              "button[data-autocomplete-chip-idx]"
            ) as HTMLElement;
            if (chipBtn) {
              // Extract airport code from the <b> tag inside the chip
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
        });

        console.log(`   🔍 Pre-filled airport info:`, prefilledInfo);

        const prefilledAirportCode = prefilledInfo.code.toUpperCase();

        // Step 3: Check if pre-filled CODE matches target CODE
        if (
          prefilledInfo.hasChip &&
          prefilledAirportCode === targetAirportCode
        ) {
          // Airport already matches, no need to change
          console.log(
            `   ✅ Airport ${targetAirportCode} already pre-filled, skipping change`
          );
          originSelected = true;

          // Click outside to close the dropdown
          await page.keyboard.press("Escape");
          await randomDelay(300, 500);
        } else {
          // Need to remove pre-filled and/or enter new airport
          console.log(
            `   🔄 Changing from ${prefilledAirportCode || "none"} to ${targetAirportCode}`
          );

          // Step 4: If there's a pre-filled chip, click it to remove
          if (prefilledInfo.hasChip) {
            console.log(
              `   🗑️ Clearing existing airport chip: ${prefilledAirportCode}...`
            );

            let cleared = false;

            // Method 1: Click the chip button directly using the data attribute
            try {
              console.log(
                "   🔍 Looking for chip in 'Departure airport or city' container..."
              );

              const chipSelector =
                'div[aria-label="Departure airport or city"] button[data-autocomplete-chip-idx]';
              await page.waitForSelector(chipSelector, { timeout: 3000 });
              console.log("   ✅ Found chip button in container");

              await page.click(chipSelector, { force: true });
              await randomDelay(600, 900);
              console.log(
                "   ✅ Clicked chip button to remove pre-filled airport"
              );
              cleared = true;
            } catch (e) {
              console.log(
                "   ⚠️ Container/chip selector didn't work:",
                (e as Error).message?.slice(0, 60)
              );
            }

            // Method 2: Try using the Actionable-module class which is on the button
            if (!cleared) {
              try {
                console.log("   Trying Method 2: Actionable-module class...");
                const chipSelector2 =
                  'button[class*="Actionable-module"][class*="Chip-module"]';
                await page.waitForSelector(chipSelector2, { timeout: 2000 });
                await page.click(chipSelector2, { force: true });
                await randomDelay(600, 900);
                console.log("   ✅ Clicked chip using Actionable-module class");
                cleared = true;
              } catch (e) {
                console.log(
                  "   ⚠️ Method 2 failed:",
                  (e as Error).message?.slice(0, 50)
                );
              }
            }

            // Method 3: Use JavaScript to find and click the button element directly
            if (!cleared) {
              try {
                console.log(
                  "   Trying Method 3: Direct JavaScript element.click()..."
                );
                const clicked = await page.evaluate(() => {
                  // Find the container with aria-label
                  const container = document.querySelector(
                    'div[aria-label="Departure airport or city"]'
                  );
                  if (container) {
                    const chipBtn = container.querySelector(
                      "button"
                    ) as HTMLElement;
                    if (chipBtn) {
                      chipBtn.click();
                      return {
                        success: true,
                        text: chipBtn.textContent?.slice(0, 30),
                      };
                    }
                  }

                  // Fallback: find any chip button
                  const anyChip = document.querySelector(
                    "button[data-autocomplete-chip-idx]"
                  ) as HTMLElement;
                  if (anyChip) {
                    anyChip.click();
                    return {
                      success: true,
                      text: anyChip.textContent?.slice(0, 30),
                    };
                  }

                  return { success: false, text: "" };
                });

                if (clicked.success) {
                  await randomDelay(600, 900);
                  console.log(`   ✅ JS click on chip: ${clicked.text}`);
                  cleared = true;
                }
              } catch (e) {
                console.log("   ⚠️ Method 3 failed");
              }
            }

            // Method 4: Click on the b tag inside the chip (the airport code text)
            if (!cleared) {
              try {
                console.log(
                  "   Trying Method 4: Click on airport code text (b tag)..."
                );
                await page.click(`button[data-autocomplete-chip-idx] b`, {
                  force: true,
                });
                await randomDelay(600, 900);
                console.log("   ✅ Clicked on airport code text");
                cleared = true;
              } catch (e) {
                console.log("   ⚠️ Method 4 failed");
              }
            }

            // Method 5: Use keyboard - Backspace to clear
            if (!cleared) {
              try {
                console.log("   Trying Method 5: Backspace key...");
                await page.keyboard.press("Backspace");
                await randomDelay(400, 600);
                console.log("   ✅ Used Backspace to remove chip");
                cleared = true;
              } catch (e) {
                console.log("   ⚠️ Method 5 failed");
              }
            }

            // Wait for DOM to update after chip removal
            await randomDelay(500, 700);
            console.log("   ✅ Chip removal attempted, proceeding...");
          }

          // Step 5: Find and focus the input field, then type the new airport
          console.log(`   ⌨️ Typing airport code: ${from}`);

          // Try to find the exact autocomplete input field
          let inputTyped = false;

          // Specific selectors for booking.com's autocomplete input (most specific first)
          const inputSelectors = [
            'input[data-ui-name="input_text_autocomplete"]',
            'input[class*="AutoComplete-module__textInput"]',
            'div[aria-label="Departure airport or city"] input[type="text"]',
            'input[role="combobox"][aria-controls*="suggestions"]',
            'input[type="text"][class*="autocomplete" i]',
            'input[type="text"]',
          ];

          for (const selector of inputSelectors) {
            try {
              console.log(`   Trying input selector: ${selector}`);
              const input = page.locator(selector).first();

              if (await input.isVisible({ timeout: 2000 })) {
                // Click to ensure focus
                await input.click({ timeout: 2000 });
                await randomDelay(200, 300);

                // Clear any existing text and type new airport code
                await input.fill(from);
                await randomDelay(300, 500);

                inputTyped = true;
                console.log(`   ✅ Typed airport code using: ${selector}`);
                break;
              }
            } catch (e) {
              console.log(`   ⚠️ Selector ${selector} failed`);
              continue;
            }
          }

          // Fallback: Try keyboard.type() if fill() didn't work
          if (!inputTyped) {
            console.log("   🔄 Fallback: Using keyboard.type()...");
            try {
              // Try to focus on any visible input in the departure container
              await page.click('div[aria-label="Departure airport or city"]', {
                timeout: 2000,
              });
              await randomDelay(300, 500);

              // Type the airport code
              await page.keyboard.type(from, { delay: 100 });
              inputTyped = true;
              console.log("   ✅ Typed using keyboard after container click");
            } catch (e) {
              console.log("   ⚠️ Container click fallback failed");
            }
          }

          // Last resort: Just type on the page (if input is already focused)
          if (!inputTyped) {
            console.log("   🔄 Last resort: Typing directly...");
            await page.keyboard.type(from, { delay: 150 });
          }

          // Step 6: Wait for suggestions and select the TOP airport option
          console.log("   ⏳ Waiting for airport suggestions...");
          await randomDelay(1500, 2000);

          // Extract the 3-letter airport code from the full name (e.g., "SFO" from "SFO San Francisco...")
          const airportCodeMatch = from.match(/^([A-Z]{3})/i);
          const airportCode = airportCodeMatch
            ? airportCodeMatch[1].toUpperCase()
            : from.toUpperCase();
          console.log(`   🔍 Looking for airport with code: ${airportCode}`);

          // Try to find and click the FIRST/TOP airport suggestion (item with airplane SVG icon)
          let suggestionClicked = false;

          try {
            // Use JavaScript to find the FIRST suggestion with SVG icon containing the airport code
            const clicked = await page.evaluate((code) => {
              // Find all list items in the dropdown
              const listItems = document.querySelectorAll(
                'li, [role="option"]'
              );

              // First: Find the first item with SVG that contains the airport code
              for (const item of listItems) {
                const text = item.textContent || "";
                const upperText = text.toUpperCase();

                // Skip generic options
                if (text.includes("Anywhere") || text.includes("Explore")) {
                  continue;
                }

                // Must contain the airport code
                if (!upperText.includes(code)) {
                  continue;
                }

                // Check if this item contains an SVG (airplane icon = airport)
                const svg = item.querySelector("svg");
                if (svg) {
                  (item as HTMLElement).click();
                  return { success: true, text: text.slice(0, 60) };
                }
              }

              // Fallback: Just click the first item with the airport code
              for (const item of listItems) {
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
              suggestionClicked = true;
              originSelected = true;
            } else {
              console.log("   ⚠️ No matching suggestion found");
            }
          } catch (e) {
            console.log(
              "   ⚠️ JS selection failed:",
              (e as Error).message?.slice(0, 50)
            );
          }

          // Fallback: Try Playwright locator
          if (!suggestionClicked) {
            try {
              console.log("   🔍 Trying Playwright locator...");
              const airportOption = page
                .locator(`li:has(svg):has-text("${airportCode}")`)
                .first();

              if (await airportOption.isVisible({ timeout: 2000 })) {
                await airportOption.click({ timeout: 3000 });
                console.log("   ✅ Clicked airport via locator");
                await randomDelay(500, 800);
                suggestionClicked = true;
                originSelected = true;
              }
            } catch (e) {
              console.log("   ⚠️ Locator for Airport option failed");
            }
          }

          // Last fallback: Just press Enter on the first highlighted option
          if (!suggestionClicked) {
            console.log("   ⌨️ Fallback: pressing Enter on current selection");
            await page.keyboard.press("Enter");
            await randomDelay(500, 800);
            originSelected = true;
          }

          console.log(`   ✅ Selected origin: ${from}`);
        }
      } else {
        console.log("   ❌ Could not open Leaving from field");
      }

      steps.push({
        step: 6,
        action: `Select origin: ${from}`,
        result: originSelected
          ? `✅ ${from} selected`
          : `⚠️ Could not select origin`,
        timestamp: new Date().toISOString(),
      });
    } else {
      steps.push({
        step: 6,
        action: "Skip origin selection",
        result: "ℹ️ Skipped (no origin provided)",
        timestamp: new Date().toISOString(),
      });
    }

    await randomDelay(500, 1000);

    // ==================
    // STEP 7: Select "Going to" destination
    // ==================
    let destinationSelected = false;

    if (to) {
      console.log(`🖱️ Step 7: Selecting destination airport: ${to}...`);

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

      if (goingToClicked) {
        // Wait for input field to be active
        await randomDelay(300, 500);

        // Paste the airport name (using fill for speed, like origin)
        console.log(`   ⌨️ Entering airport: ${to}`);

        // Try to find and fill the input field directly
        let inputFilled = false;
        const destInputSelectors = [
          'input[data-ui-name="input_text_autocomplete"]',
          'input[class*="AutoComplete-module__textInput"]',
          'div[aria-label="Destination airport or city"] input[type="text"]',
          'input[role="combobox"]',
          'input[type="text"]',
        ];

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

        // Fallback: use keyboard.type if fill didn't work
        if (!inputFilled) {
          console.log("   🔄 Fallback: using keyboard.type...");
          await page.keyboard.type(to, { delay: 50 });
        }

        // Wait for suggestions to load
        console.log("   ⏳ Waiting for airport suggestions...");
        await randomDelay(1500, 2000);

        // Extract the 3-letter airport code from the full name
        const destCodeMatch = to.match(/^([A-Z]{3})/i);
        const destCode = destCodeMatch
          ? destCodeMatch[1].toUpperCase()
          : to.toUpperCase();
        console.log(`   🔍 Looking for airport with code: ${destCode}`);

        // Try to find and click the FIRST/TOP airport suggestion
        let destSuggestionClicked = false;

        try {
          // Use JavaScript to find the FIRST suggestion with SVG icon containing the airport code
          const clicked = await page.evaluate((code) => {
            // Find all list items in the dropdown
            const listItems = document.querySelectorAll('li, [role="option"]');

            // First: Find the first item with SVG that contains the airport code
            for (const item of listItems) {
              const text = item.textContent || "";
              const upperText = text.toUpperCase();

              // Skip generic options
              if (text.includes("Anywhere") || text.includes("Explore")) {
                continue;
              }

              // Must contain the airport code
              if (!upperText.includes(code)) {
                continue;
              }

              // Check if this item contains an SVG (airplane icon = airport)
              const svg = item.querySelector("svg");
              if (svg) {
                (item as HTMLElement).click();
                return { success: true, text: text.slice(0, 60) };
              }
            }

            // Fallback: Just click the first item with the airport code
            for (const item of listItems) {
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
          }, destCode);

          if (clicked.success) {
            console.log(`   ✅ Selected airport: ${clicked.text}`);
            await randomDelay(500, 800);
            destSuggestionClicked = true;
            destinationSelected = true;
          } else {
            console.log("   ⚠️ No matching suggestion found");
          }
        } catch (e) {
          console.log(
            "   ⚠️ JS selection failed:",
            (e as Error).message?.slice(0, 50)
          );
        }

        // Fallback: Try Playwright locator
        if (!destSuggestionClicked) {
          try {
            console.log("   🔍 Trying Playwright locator...");
            const airportOption = page
              .locator(`li:has(svg):has-text("${destCode}")`)
              .first();

            if (await airportOption.isVisible({ timeout: 2000 })) {
              await airportOption.click({ timeout: 3000 });
              console.log("   ✅ Clicked airport via locator");
              await randomDelay(500, 800);
              destSuggestionClicked = true;
              destinationSelected = true;
            }
          } catch (e) {
            console.log("   ⚠️ Locator failed");
          }
        }

        // Last fallback: Just press Enter on the first highlighted option
        if (!destSuggestionClicked) {
          console.log("   ⌨️ Fallback: pressing Enter");
          await page.keyboard.press("Enter");
          await randomDelay(500, 800);
          destinationSelected = true;
        }

        console.log(`   ✅ Selected destination: ${to}`);
      }

      steps.push({
        step: 7,
        action: `Select destination: ${to}`,
        result: destinationSelected
          ? `✅ Selected ${to}`
          : `⚠️ Could not select destination`,
        timestamp: new Date().toISOString(),
      });
    } else {
      steps.push({
        step: 7,
        action: "Skip destination selection",
        result: "ℹ️ Skipped (no destination provided)",
        timestamp: new Date().toISOString(),
      });
    }

    await randomDelay(500, 1000);

    // ==================
    // STEP 8: Select travel dates
    // ==================
    let datesSelected = false;

    if (departDate) {
      console.log(
        `📅 Step 8: Selecting travel dates: ${departDate}${returnDate ? ` to ${returnDate}` : ""}...`
      );

      // Click on "Travel dates" field
      const travelDatesSelectors = [
        'text="Travel dates"',
        'text="Travel date"',
        'span:has-text("Travel dates")',
        'span:has-text("Travel date")',
        'button:has-text("Travel")',
        '[data-ui-name*="date"]',
        '[data-testid*="date"]',
        'input[placeholder*="date" i]',
      ];

      let dateFieldClicked = false;

      for (const selector of travelDatesSelectors) {
        try {
          console.log(`   Trying selector: ${selector}`);
          const element = page.locator(selector).first();

          if (await element.isVisible({ timeout: 2000 })) {
            await element.click({ timeout: 3000 });
            await randomDelay(800, 1200);
            console.log(`   ✅ Clicked travel dates field`);
            dateFieldClicked = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Fallback: Try JavaScript click
      if (!dateFieldClicked) {
        console.log("   🔄 Trying JavaScript click for travel dates...");
        try {
          await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll("*"));
            for (const el of allElements) {
              if (
                el.textContent?.includes("Travel date") ||
                el.textContent?.includes("Travel dates")
              ) {
                const rect = el.getBoundingClientRect();
                if (rect.top > 50 && rect.top < 400) {
                  (el as HTMLElement).click();
                  return true;
                }
              }
            }
            return false;
          });
          await randomDelay(800, 1200);
          dateFieldClicked = true;
          console.log("   ✅ Clicked via JavaScript");
        } catch (e) {
          console.log("   ❌ JavaScript click failed");
        }
      }

      if (dateFieldClicked) {
        // Wait for calendar to open
        await randomDelay(1500, 2000);

        // Helper function to navigate calendar to a specific month/year
        const navigateToMonth = async (
          targetMonth: string,
          targetYear: number,
          monthNames: string[]
        ): Promise<boolean> => {
          const targetMonthIndex = monthNames.indexOf(targetMonth);
          let maxNavigations = 24; // Allow navigating up to 2 years back/forward
          let foundCorrectMonth = false;

          while (maxNavigations > 0 && !foundCorrectMonth) {
            maxNavigations--;

            // Check what months are currently displayed
            const pageText = (await page.textContent("body")) || "";

            // Check if target month is visible
            if (pageText.includes(`${targetMonth} ${targetYear}`)) {
              console.log(`   ✅ Found ${targetMonth} ${targetYear} in view`);
              foundCorrectMonth = true;
              break;
            }

            // Extract currently displayed months from the page (booking.com shows 2 months)
            const monthMatches = pageText.matchAll(
              /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/g
            );
            const displayedMonths = Array.from(monthMatches);

            if (displayedMonths.length > 0) {
              // Use the first displayed month for comparison
              const firstDisplayedMonth = displayedMonths[0][1];
              const firstDisplayedYear = parseInt(displayedMonths[0][2]);
              const displayedMonthIndex =
                monthNames.indexOf(firstDisplayedMonth);

              // Calculate the difference in months
              const targetTotal = targetYear * 12 + targetMonthIndex;
              const displayedTotal =
                firstDisplayedYear * 12 + displayedMonthIndex;
              const monthDiff = targetTotal - displayedTotal;

              console.log(
                `   📊 Current calendar shows: ${firstDisplayedMonth} ${firstDisplayedYear}, target: ${targetMonth} ${targetYear}, diff: ${monthDiff} months`
              );

              if (monthDiff < 0) {
                // Need to go back - click previous button
                console.log(
                  `   ⬅️ Navigating back (${Math.abs(monthDiff)} months to go)`
                );

                // Use the specific booking.com calendar navigation button class
                const prevButtonClicked = await page.evaluate(() => {
                  // First try: Use the specific booking.com class name for prev button
                  const prevByClass = document.querySelector(
                    'button[class*="Calendar-module__control--prev"]'
                  );
                  if (prevByClass) {
                    console.log("Found prev button by Calendar-module class");
                    (prevByClass as HTMLElement).click();
                    return true;
                  }

                  // Second try: Find button with SVG that has the left-pointing chevron path
                  const allButtons = Array.from(
                    document.querySelectorAll("button")
                  );
                  for (const btn of allButtons) {
                    const rect = btn.getBoundingClientRect();
                    // Calendar navigation buttons are typically in the upper area
                    if (rect.top > 150 && rect.top < 350 && rect.left < 400) {
                      const svg = btn.querySelector("svg");
                      const path = btn.querySelector("path");
                      const className = btn.className || "";

                      // Check if it's a navigation button (has SVG, small size, specific class patterns)
                      if (
                        (svg || path) &&
                        rect.width < 80 &&
                        rect.height < 80 &&
                        (className.includes("control") ||
                          className.includes("prev") ||
                          className.includes("Calendar") ||
                          className.includes("Button") ||
                          className.includes("icon"))
                      ) {
                        // Check the path direction - left arrow has path going left
                        const pathD = path?.getAttribute("d") || "";
                        // Left arrow typically has path that starts going left (contains "l-" or decreasing x values)
                        if (
                          pathD.includes("14.09") || // booking.com specific left arrow
                          pathD.includes("M14") ||
                          className.includes("prev") ||
                          rect.left < 350
                        ) {
                          console.log(
                            "Found prev button by SVG at x:",
                            rect.left
                          );
                          (btn as HTMLElement).click();
                          return true;
                        }
                      }
                    }
                  }

                  // Third try: Click the leftmost button with an SVG in the calendar header area
                  const buttonsWithSvg = allButtons
                    .filter((btn) => {
                      const rect = btn.getBoundingClientRect();
                      const hasSvg = btn.querySelector("svg") !== null;
                      return (
                        hasSvg &&
                        rect.top > 150 &&
                        rect.top < 350 &&
                        rect.width < 80
                      );
                    })
                    .sort(
                      (a, b) =>
                        a.getBoundingClientRect().left -
                        b.getBoundingClientRect().left
                    );

                  if (buttonsWithSvg.length > 0) {
                    console.log("Clicking leftmost SVG button as prev");
                    (buttonsWithSvg[0] as HTMLElement).click();
                    return true;
                  }

                  return false;
                });

                if (prevButtonClicked) {
                  console.log("   ⬅️ Clicked previous button");
                  await randomDelay(500, 700);
                } else {
                  console.log("   ❌ Could not find previous button");
                  break;
                }
              } else if (monthDiff > 1) {
                // Need to go forward (accounting for 2-month view)
                console.log(
                  `   ➡️ Navigating forward (${monthDiff} months to go)`
                );

                const nextButtonClicked = await page.evaluate(() => {
                  // First try: Use the specific booking.com class name for next button
                  const nextByClass = document.querySelector(
                    'button[class*="Calendar-module__control--next"]'
                  );
                  if (nextByClass) {
                    console.log("Found next button by Calendar-module class");
                    (nextByClass as HTMLElement).click();
                    return true;
                  }

                  // Second try: Find button with SVG that has the right-pointing chevron path
                  const allButtons = Array.from(
                    document.querySelectorAll("button")
                  );
                  for (const btn of allButtons) {
                    const rect = btn.getBoundingClientRect();
                    if (rect.top > 150 && rect.top < 350 && rect.left > 500) {
                      const svg = btn.querySelector("svg");
                      const path = btn.querySelector("path");
                      const className = btn.className || "";

                      if (
                        (svg || path) &&
                        rect.width < 80 &&
                        rect.height < 80 &&
                        (className.includes("control") ||
                          className.includes("next") ||
                          className.includes("Calendar") ||
                          className.includes("Button") ||
                          className.includes("icon"))
                      ) {
                        const pathD = path?.getAttribute("d") || "";
                        if (
                          pathD.includes("9.91") || // booking.com specific right arrow
                          pathD.includes("M9") ||
                          className.includes("next") ||
                          rect.left > 500
                        ) {
                          console.log(
                            "Found next button by SVG at x:",
                            rect.left
                          );
                          (btn as HTMLElement).click();
                          return true;
                        }
                      }
                    }
                  }

                  // Third try: Click the rightmost button with an SVG
                  const buttonsWithSvg = allButtons
                    .filter((btn) => {
                      const rect = btn.getBoundingClientRect();
                      const hasSvg = btn.querySelector("svg") !== null;
                      return (
                        hasSvg &&
                        rect.top > 150 &&
                        rect.top < 350 &&
                        rect.width < 80
                      );
                    })
                    .sort(
                      (a, b) =>
                        b.getBoundingClientRect().left -
                        a.getBoundingClientRect().left
                    );

                  if (buttonsWithSvg.length > 0) {
                    console.log("Clicking rightmost SVG button as next");
                    (buttonsWithSvg[0] as HTMLElement).click();
                    return true;
                  }

                  return false;
                });

                if (nextButtonClicked) {
                  console.log("   ➡️ Clicked next button");
                  await randomDelay(500, 700);
                } else {
                  console.log("   ❌ Could not find next button");
                  break;
                }
              } else {
                // Target month should be visible in the 2-month view
                foundCorrectMonth = true;
              }
            } else {
              console.log(
                "   ⚠️ Could not determine currently displayed month"
              );
              break;
            }
          }

          return foundCorrectMonth;
        };

        // Helper function to click on a specific day in the calendar
        const clickDay = async (
          day: number,
          targetMonth: string,
          targetYear: number
        ): Promise<boolean> => {
          // Format the date for potential data-date attribute matching
          const monthNames = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ];
          const monthIndex = monthNames.indexOf(targetMonth);
          const paddedMonth = String(monthIndex + 1).padStart(2, "0");
          const paddedDay = String(day).padStart(2, "0");
          const dateStr = `${targetYear}-${paddedMonth}-${paddedDay}`;

          console.log(
            `   🔍 Looking for day ${day} (${dateStr}) in ${targetMonth} ${targetYear}...`
          );

          const clicked = await page.evaluate(
            ({
              dayNum,
              dateString,
              month,
              year,
            }: {
              dayNum: number;
              dateString: string;
              month: string;
              year: number;
            }) => {
              // Method 1: Try data-date attribute (most reliable if available)
              const byDataDate = document.querySelector(
                `[data-date="${dateString}"], [data-value="${dateString}"]`
              );
              if (byDataDate) {
                console.log("Found day by data-date attribute");
                (byDataDate as HTMLElement).click();
                return true;
              }

              // Method 2: Find the correct calendar panel for the target month
              // Look for the month header text and find days within that panel
              const allSpans = Array.from(
                document.querySelectorAll("span, div, h3")
              );
              let targetCalendarPanel: Element | null = null;

              for (const el of allSpans) {
                if (el.textContent?.trim() === `${month} ${year}`) {
                  // Found the month header, get its parent calendar panel
                  targetCalendarPanel =
                    el.closest('[class*="Calendar"]') ||
                    el.closest("table")?.parentElement ||
                    el.parentElement?.parentElement;
                  break;
                }
              }

              // Method 3: Find day cells - prefer those in the correct panel
              const allCells = document.querySelectorAll(
                "td, span, div, button"
              );
              const matchingCells: { el: Element; score: number }[] = [];

              for (const cell of allCells) {
                const text = cell.textContent?.trim();
                if (text === String(dayNum)) {
                  const rect = cell.getBoundingClientRect();
                  // Must be in calendar area (not too small, not in header)
                  if (
                    rect.top > 200 &&
                    rect.top < 700 &&
                    rect.left > 100 &&
                    rect.left < 800 &&
                    rect.width > 20 &&
                    rect.height > 20
                  ) {
                    // Check if not disabled
                    const style = window.getComputedStyle(cell);
                    const isDisabled =
                      parseFloat(style.opacity) < 0.5 ||
                      cell.closest('[aria-disabled="true"]') !== null ||
                      cell.hasAttribute("disabled");

                    if (!isDisabled) {
                      // Score based on whether it's in the target panel
                      let score = 1;
                      if (
                        targetCalendarPanel &&
                        targetCalendarPanel.contains(cell)
                      ) {
                        score = 10; // Prefer cells in the correct month panel
                      }
                      matchingCells.push({ el: cell, score });
                    }
                  }
                }
              }

              // Sort by score (prefer cells in correct month) then by position
              matchingCells.sort((a, b) => {
                if (a.score !== b.score) return b.score - a.score;
                return (
                  a.el.getBoundingClientRect().left -
                  b.el.getBoundingClientRect().left
                );
              });

              if (matchingCells.length > 0) {
                const target = matchingCells[0].el;
                console.log(
                  "Clicking day cell at",
                  target.getBoundingClientRect().left,
                  target.getBoundingClientRect().top
                );
                (target as HTMLElement).click();
                return true;
              }

              return false;
            },
            {
              dayNum: day,
              dateString: dateStr,
              month: targetMonth,
              year: targetYear,
            }
          );

          return clicked;
        };

        // Parse the departure date
        const departDateObj = new Date(departDate);
        const departDay = departDateObj.getDate();
        const departMonthIndex = departDateObj.getMonth();
        const departYear = departDateObj.getFullYear();
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const departMonth = monthNames[departMonthIndex];

        console.log(
          `   📅 Target departure date: ${departMonth} ${departDay}, ${departYear}`
        );

        try {
          // Navigate to the correct month for departure date
          const foundDepartMonth = await navigateToMonth(
            departMonth,
            departYear,
            monthNames
          );

          if (foundDepartMonth) {
            await randomDelay(300, 500);

            // Click on the departure day
            const departDayClicked = await clickDay(
              departDay,
              departMonth,
              departYear
            );

            if (departDayClicked) {
              console.log(`   ✅ Clicked departure day ${departDay}`);
              await randomDelay(800, 1200);
              datesSelected = true;

              // If round-trip, select return date
              if (returnDate && tripType === "round-trip") {
                const returnDateObj = new Date(returnDate);
                const returnDay = returnDateObj.getDate();
                const returnMonthIndex = returnDateObj.getMonth();
                const returnYear = returnDateObj.getFullYear();
                const returnMonth = monthNames[returnMonthIndex];

                console.log(
                  `   📅 Target return date: ${returnMonth} ${returnDay}, ${returnYear}`
                );

                // Check if we need to navigate to a different month for return date
                if (returnMonth !== departMonth || returnYear !== departYear) {
                  console.log(
                    `   📆 Return date is in different month, navigating...`
                  );
                  await navigateToMonth(returnMonth, returnYear, monthNames);
                  await randomDelay(300, 500);
                }

                // Click on the return day
                const returnDayClicked = await clickDay(
                  returnDay,
                  returnMonth,
                  returnYear
                );

                if (returnDayClicked) {
                  console.log(`   ✅ Clicked return day ${returnDay}`);
                } else {
                  console.log(`   ⚠️ Could not click return day ${returnDay}`);
                }

                await randomDelay(500, 800);
              }
            } else {
              console.log(`   ⚠️ Could not click departure day ${departDay}`);
            }
          } else {
            console.log(
              `   ⚠️ Could not navigate to ${departMonth} ${departYear}`
            );
          }
        } catch (e) {
          console.error("   ❌ Error selecting date:", e);
        }

        // Press Escape to close calendar (or it might auto-close after selection)
        await page.keyboard.press("Escape");
        await randomDelay(300, 500);
      }

      steps.push({
        step: 8,
        action: `Select travel dates: ${departDate}${returnDate ? ` - ${returnDate}` : ""}`,
        result: datesSelected
          ? `✅ Dates selected`
          : `⚠️ Could not select dates`,
        timestamp: new Date().toISOString(),
      });
    } else {
      steps.push({
        step: 8,
        action: "Skip date selection",
        result: "ℹ️ Skipped (no date provided)",
        timestamp: new Date().toISOString(),
      });
    }

    await randomDelay(500, 1000);

    // ==================
    // STEP 9: Select number of travelers (adults)
    // ==================
    let travelersSelected = false;
    const targetAdults = adults || 1; // Default to 1 adult if not specified

    // Only open travelers dropdown if we need more than 1 adult
    // (booking.com defaults to 1 adult, so no action needed for 1)
    if (targetAdults > 1) {
      console.log(
        `👥 Step 9: Setting travelers to ${targetAdults} adult(s)...`
      );

      // Click on "Travelers" field to open the dropdown
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

      let travelersFieldClicked = false;

      for (const selector of travelersSelectors) {
        try {
          console.log(`   Trying selector: ${selector}`);
          const element = page.locator(selector).first();

          if (await element.isVisible({ timeout: 2000 })) {
            await element.click({ timeout: 3000 });
            await randomDelay(800, 1200);
            console.log(`   ✅ Clicked travelers field`);
            travelersFieldClicked = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Fallback: Try JavaScript click
      if (!travelersFieldClicked) {
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
          travelersFieldClicked = true;
          console.log("   ✅ Clicked via JavaScript");
        } catch (e) {
          console.log("   ❌ JavaScript click failed");
        }
      }

      if (travelersFieldClicked) {
        // Wait for the travelers dropdown to open
        await randomDelay(500, 800);

        // Get the current number of adults displayed
        const currentAdults = await page.evaluate(() => {
          // Method 1: Look for the specific InputStepper value span for adults
          // The span has class "InputStepper-module__value___B6jEw" and contains just the number
          const minusBtn = document.querySelector(
            '[data-ui-name="button_occupancy_adults_minus"]'
          );
          const plusBtn = document.querySelector(
            '[data-ui-name="button_occupancy_adults_plus"]'
          );

          if (minusBtn && plusBtn) {
            // The value span is typically between the minus and plus buttons
            // Find the common parent container
            const container =
              minusBtn.closest('[class*="InputStepper"]') ||
              minusBtn.parentElement?.parentElement;

            if (container) {
              // Look for span with the value class or just a span with a number between buttons
              const valueSpans = container.querySelectorAll(
                'span[class*="value"], span[aria-hidden="true"]'
              );
              for (const span of valueSpans) {
                const text = span.textContent?.trim();
                if (text && /^\d+$/.test(text)) {
                  const num = parseInt(text);
                  if (num >= 1 && num <= 9) {
                    console.log("Found adult count in value span:", num);
                    return num;
                  }
                }
              }
            }

            // Alternative: Look for any span between the two buttons that contains just a number
            const parent = minusBtn.parentElement;
            if (parent) {
              const allSpans = parent.querySelectorAll("span");
              for (const span of allSpans) {
                const text = span.textContent?.trim();
                // Must be just a single digit (1-9 for adults)
                if (text && /^[1-9]$/.test(text)) {
                  console.log("Found adult count in sibling span:", text);
                  return parseInt(text);
                }
              }
            }
          }

          // Method 2: Find all spans with class containing "value" in the occupancy/traveler area
          const allValueSpans = document.querySelectorAll(
            '[class*="InputStepper"] span[class*="value"], [class*="occupancy"] span[class*="value"]'
          );
          if (allValueSpans.length > 0) {
            // The first one is typically the adult count
            const firstValue = allValueSpans[0].textContent?.trim();
            if (firstValue && /^\d+$/.test(firstValue)) {
              console.log("Found adult count in first value span:", firstValue);
              return parseInt(firstValue);
            }
          }

          // Method 3: Look for spans in the dropdown that contain just a single digit
          const dropdownArea = document.querySelector(
            '[class*="occupancy"], [class*="traveler"], [class*="Popover"]'
          );
          if (dropdownArea) {
            const allSpans = dropdownArea.querySelectorAll("span");
            for (const span of allSpans) {
              const text = span.textContent?.trim();
              // Specifically looking for just "1", "2", etc. (not "18+" or other text)
              if (text && /^[1-9]$/.test(text)) {
                // Make sure this is the value span, not some other number
                const parent = span.parentElement;
                const className = span.className || "";
                const hasValueClass =
                  className.includes("value") || className.includes("Value");
                const isAriaHidden =
                  span.getAttribute("aria-hidden") === "true";

                // If it has value class or is aria-hidden (common pattern), it's likely the count
                if (hasValueClass || isAriaHidden) {
                  console.log("Found adult count:", text);
                  return parseInt(text);
                }
              }
            }
          }

          // Default: assume 1 adult (the default on booking.com)
          console.log("Defaulting to 1 adult");
          return 1;
        });

        console.log(
          `   📊 Current adults: ${currentAdults}, Target: ${targetAdults}`
        );

        // Calculate how many clicks needed
        const clicksNeeded = targetAdults - currentAdults;

        if (clicksNeeded === 0) {
          console.log(`   ✅ Already at ${targetAdults} adult(s)`);
          travelersSelected = true;
        } else if (clicksNeeded > 0) {
          // Need to increase adults - click plus button
          console.log(`   ➕ Need to click + button ${clicksNeeded} times`);

          for (let i = 0; i < clicksNeeded; i++) {
            try {
              // Use Playwright's native locator click - much more reliable than JS click
              const plusButton = page.locator(
                '[data-ui-name="button_occupancy_adults_plus"]'
              );

              if (await plusButton.isVisible({ timeout: 2000 })) {
                // Check if button is not disabled
                const isDisabled = await plusButton.getAttribute("disabled");
                if (isDisabled === null) {
                  // Use force: true to click even if the button has aria-hidden
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
                  console.log(
                    `   ➕ Clicked + by class (${i + 1}/${clicksNeeded})`
                  );
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
          travelersSelected = true;
        } else {
          // Need to decrease adults - click minus button
          const decreaseClicks = Math.abs(clicksNeeded);
          console.log(`   ➖ Need to click - button ${decreaseClicks} times`);

          for (let i = 0; i < decreaseClicks; i++) {
            try {
              // Use Playwright's native locator click
              const minusButton = page.locator(
                '[data-ui-name="button_occupancy_adults_minus"]'
              );

              if (await minusButton.isVisible({ timeout: 2000 })) {
                // Check if button is not disabled
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
                // Fallback: Try clicking by class pattern
                const minusByClass = page
                  .locator(
                    'button[class*="subtract"], button[class*="Subtract"]'
                  )
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
          travelersSelected = true;
        }

        // Click "Done" button to close the dropdown if present
        await randomDelay(300, 500);
        try {
          const doneButton = page.locator('button:has-text("Done")').first();
          if (await doneButton.isVisible({ timeout: 1000 })) {
            await doneButton.click();
            console.log("   ✅ Clicked Done button");
          }
        } catch (e) {
          // Done button might not be present or dropdown auto-closes
          console.log("   ℹ️ No Done button or already closed");
        }

        await randomDelay(300, 500);
      }

      steps.push({
        step: 9,
        action: `Set travelers to ${targetAdults} adult(s)`,
        result: travelersSelected
          ? `✅ Set to ${targetAdults} adult(s)`
          : `⚠️ Could not set travelers`,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Skip travelers step since booking.com defaults to 1 adult
      console.log("👥 Step 9: Skipping travelers (already 1 adult by default)");
      travelersSelected = true;
      steps.push({
        step: 9,
        action: "Travelers: 1 adult",
        result: "✅ Default (1 adult) - no action needed",
        timestamp: new Date().toISOString(),
      });
    }

    await randomDelay(500, 1000);

    // ==================
    // STEP 10: Check "Direct flights only" (if requested)
    // ==================
    if (directFlights) {
      console.log("🖱️ Step 10: Checking 'Direct flights only' checkbox...");

      let directClicked = false;

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
            directClicked = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      steps.push({
        step: 10,
        action: "Check 'Direct flights only' checkbox",
        result: directClicked
          ? "✅ Checkbox clicked"
          : "❌ Could not click checkbox",
        timestamp: new Date().toISOString(),
      });
    } else {
      steps.push({
        step: 10,
        action: "Skip 'Direct flights only' checkbox",
        result: "ℹ️ Skipped (not requested)",
        timestamp: new Date().toISOString(),
      });
    }

    await randomDelay(500, 1000);

    // ==================
    // STEP 11: Click "Explore" / "Search" button
    // ==================
    console.log("🖱️ Step 11: Clicking Explore/Search button...");

    let searchClicked = false;

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
            // Only click if it's in the form area
            if (box && box.y > 50 && box.y < 400) {
              await element.click({ timeout: 5000 });
              await randomDelay(500, 1000);
              console.log(`   ✅ Clicked search button using: ${selector}`);
              searchClicked = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (searchClicked) break;
      } catch (e) {
        continue;
      }
    }

    // Fallback: Try JavaScript click
    if (!searchClicked) {
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
          // Also try submit buttons
          const submitBtns = document.querySelectorAll(
            'button[type="submit"], input[type="submit"]'
          );
          for (const btn of submitBtns) {
            const rect = btn.getBoundingClientRect();
            if (rect.top > 50 && rect.top < 400) {
              (btn as HTMLElement).click();
              return true;
            }
          }
          return false;
        });
        searchClicked = true;
        console.log("   ✅ Clicked via JavaScript");
      } catch (e) {
        console.log("   ❌ JavaScript click failed");
      }
    }

    // Wait for results page to load
    if (searchClicked) {
      console.log("   ⏳ Waiting for results page to load...");
      try {
        // Wait for navigation
        await page
          .waitForLoadState("networkidle", { timeout: 30000 })
          .catch(() => {
            console.log("   ℹ️ Network idle timeout, continuing anyway");
          });
        await randomDelay(3000, 5000);
      } catch (e) {
        console.log("   ℹ️ Page load wait timed out");
        await randomDelay(3000, 5000);
      }
    }

    steps.push({
      step: 11,
      action: "Click Explore/Search button",
      result: searchClicked
        ? "✅ Search initiated, waiting for results"
        : "❌ Could not click search button",
      timestamp: new Date().toISOString(),
    });

    // ==================
    // STEP 12: Take results screenshot for AI analysis
    // ==================
    console.log("📸 Step 12: Taking results screenshot for AI...");
    await randomDelay(1000, 1500);

    const screenshot2 = await page.screenshot({ fullPage: false, type: "png" });
    const base64Screenshot2 = screenshot2.toString("base64");

    steps.push({
      step: 12,
      action: "Capture results for AI analysis",
      result: "✅ Screenshot captured",
      timestamp: new Date().toISOString(),
    });

    // ==================
    // STEP 13: Gemini verifies the results
    // ==================
    console.log("🤖 Step 13: Asking Gemini to verify results...");

    const { object: verification } = await generateObject({
      model: visionModel,
      schema: verificationSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Verify the current state of booking.com/flights form.

We wanted to set:
- Trip type: ${tripType === "round-trip" ? "Round-trip" : "One-way"}
- Travel class: ${classText}
- Origin: ${from || "Auto-detected"}
- Destination: ${to || "Not specified"}
- Direct flights only: ${directFlights ? "Checked" : "Unchecked"}

Look at the page and tell me:
1. Is this a flight search results page?
2. Are there flight results showing?
3. Does the route shown match our search (${from || "origin"} to ${to || "destination"})?
4. Were all the actions successful?`,
            },
            {
              type: "image",
              image: base64Screenshot2,
            },
          ],
        },
      ],
    });

    console.log(
      "🔍 Verification result:",
      JSON.stringify(verification, null, 2)
    );

    steps.push({
      step: 12,
      action: "Gemini AI verifying results",
      result: verification.success
        ? `✅ ${verification.description}`
        : `❌ ${verification.description}`,
      timestamp: new Date().toISOString(),
    });

    // ==================
    // STEP 13: Extract flight details
    // ==================
    console.log("✈️ Step 13: Extracting flight details...");

    let flightDetails: {
      flights: Array<{
        departureTime: string;
        arrivalTime: string;
        departureAirport: string;
        arrivalAirport: string;
        departureDate?: string;
        arrivalDate?: string;
        duration: string;
        stops: string;
        airlines: string;
        price: string;
      }>;
      totalResults?: number;
    } = { flights: [], totalResults: 0 };

    try {
      const { object: extractedFlights } = await generateObject({
        model: visionModel,
        schema: flightDetailsSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract flight information from this booking.com search results page.

Look at EACH FLIGHT CARD individually. Each flight card shows:
- A departure time (like "6:30 PM") on the LEFT
- An arrival time (like "2:20 AM") on the RIGHT
- Airport codes below the times (like "CCU" and "LHR")
- Duration in the MIDDLE (like "9h 20m")
- Stops indicator (like "Direct" or "1 stop")
- Airline name at the bottom of the card
- Price on the RIGHT side (like "INR35,389.83")

IMPORTANT RULES:
1. Extract ONLY the first 5 flight cards
2. Each departureTime should be ONLY the time (e.g., "9:00 PM"), NOT any other text
3. Each arrivalTime should be ONLY the time (e.g., "6:35 AM")
4. Ignore any promotional text, banners, or "We found better prices" messages
5. Duration should be short (e.g., "15h 05m")
6. Stops should be "Direct", "1 stop", "2 stops", etc.
7. Airlines should be just the airline names (e.g., "Air India")
8. Price should be the fare amount (e.g., "INR64,694.00")

DO NOT include any promotional text, comparison text, or banner content in any field.`,
              },
              {
                type: "image",
                image: base64Screenshot2,
              },
            ],
          },
        ],
      });

      // Map the extracted flights with fallback values
      flightDetails = {
        flights: (extractedFlights.flights || []).map((f) => ({
          departureTime: f.departureTime || "N/A",
          arrivalTime: f.arrivalTime || "N/A",
          departureAirport: f.departureAirport || "N/A",
          arrivalAirport: f.arrivalAirport || "N/A",
          departureDate: f.departureDate,
          arrivalDate: f.arrivalDate,
          duration: f.duration || "N/A",
          stops: f.stops || "N/A",
          airlines: f.airlines || "N/A",
          price: f.price || "N/A",
        })),
        totalResults: extractedFlights.totalResults,
      };
      console.log(
        "✈️ Extracted flights:",
        JSON.stringify(flightDetails, null, 2)
      );

      steps.push({
        step: 13,
        action: "Extract flight details",
        result: `✅ Extracted ${flightDetails.flights.length} flights`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("❌ Failed to extract flights:", e);
      steps.push({
        step: 13,
        action: "Extract flight details",
        result: "⚠️ Could not extract flight details",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: verification.success,
        message: verification.description,
        steps,
        flights: flightDetails.flights.slice(0, 5), // Ensure max 5 flights
        totalResults: flightDetails.totalResults,
        requested: {
          tripType,
          travelClass: classText,
          from,
          to,
          directFlights,
        },
        analysis: {
          initial: analysis,
          verification,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error in automation:", error);

    steps.push({
      step: steps.length + 1,
      action: "Error occurred",
      result: `❌ ${error instanceof Error ? error.message : "Unknown error"}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        steps,
      },
      { status: 200 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Handle cookie consent banners
 */
async function handleCookieConsent(page: Page): Promise<void> {
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
