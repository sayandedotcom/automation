import { NextRequest, NextResponse } from "next/server";
import {
  launchBrowser,
  setupStealthMode,
  randomDelay,
} from "@/lib/playwright-utils";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { Page } from "playwright";
import path from "path";
import fs from "fs";

export const maxDuration = 60;

// Path to stored auth state
const AUTH_STATE_PATH = path.join(process.cwd(), "data", "uber-auth.json");

// Gemini vision model for screenshot analysis
const visionModel = google("gemini-2.0-flash", {
  safetySettings: [
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  ],
});

// Schema for auth check
const authCheckSchema = z.object({
  isLoggedIn: z.boolean().describe("Whether the user is logged in to Uber"),
  hasLoginButton: z
    .boolean()
    .describe("Whether a Login button is visible on the page"),
  hasSignUpButton: z
    .boolean()
    .describe("Whether a Sign up button is visible on the page"),
  description: z.string().describe("Description of what was found on the page"),
});

// Schema for ride options extraction
const rideOptionsSchema = z.object({
  rides: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            "Name of the ride type (e.g., 'Uber Go', 'Go Non AC', 'Bike', 'UberXL')"
          ),
        description: z
          .string()
          .optional()
          .describe(
            "Description of the ride (e.g., 'Affordable, compact AC rides')"
          ),
        fare: z.string().describe("Price/fare of the ride (e.g., '₹525.88')"),
        eta: z
          .string()
          .optional()
          .describe("Estimated time of arrival (e.g., '2 min away')"),
        capacity: z
          .string()
          .optional()
          .describe("Capacity of vehicle (e.g., '4 seats')"),
      })
    )
    .describe("List of available ride options"),
  totalOptions: z
    .number()
    .optional()
    .describe("Total number of ride options shown"),
});

// Ensure screenshots directory exists
function ensureScreenshotDir() {
  const screenshotDir = path.join(process.cwd(), "public", "screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  return screenshotDir;
}

// Save screenshot to public/screenshots
async function saveScreenshot(page: Page, name: string): Promise<string> {
  const screenshotDir = ensureScreenshotDir();
  const timestamp = Date.now();
  const filename = `uber_${name}_${timestamp}.png`;
  const filepath = path.join(screenshotDir, filename);

  await page.screenshot({ path: filepath, fullPage: false });

  // Return the public URL path
  return `/screenshots/${filename}`;
}

export async function POST(request: NextRequest) {
  let browser;
  const steps: Array<{
    step: number;
    action: string;
    result: string;
    screenshotUrl?: string;
    timestamp: string;
  }> = [];

  try {
    const body = await request.json();
    const { pickup, dropoff } = body;

    console.log("🚗 Starting Uber automation with:", {
      pickup,
      dropoff,
    });

    // Check if auth state exists
    const hasAuthState = fs.existsSync(AUTH_STATE_PATH);
    console.log(`🔐 Auth state exists: ${hasAuthState}`);

    // Launch browser
    const headless = process.env.HEADFUL !== "true";
    console.log(`🌐 Launching browser (headless: ${headless})...`);

    browser = await launchBrowser({ headless });

    // Create context with saved auth state if available
    const contextOptions: {
      viewport: { width: number; height: number };
      userAgent: string;
      storageState?: string;
    } = {
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    if (hasAuthState) {
      contextOptions.storageState = AUTH_STATE_PATH;
      console.log("✅ Loading saved auth state from:", AUTH_STATE_PATH);
    }

    const context = await browser.newContext(contextOptions);

    const page = await context.newPage();
    await setupStealthMode(page);

    // ==================
    // STEP 1: Load Uber mobile website
    // ==================
    console.log("📍 Step 1: Loading Uber website...");
    const url = "https://m.uber.com/";
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await randomDelay(3000, 4000);

    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {
      console.log("ℹ️ Network idle timeout, continuing anyway");
    });
    await randomDelay(2000, 3000);

    steps.push({
      step: 1,
      action: "Load Uber website",
      result: "✅ Page loaded successfully",
      timestamp: new Date().toISOString(),
    });

    // ==================
    // STEP 2: Take Initial Screenshot and Check Auth
    // ==================
    console.log("📸 Step 2: Taking initial screenshot and checking auth...");
    const screenshot1Url = await saveScreenshot(page, "01-initial-page");
    const screenshot1 = await page.screenshot({ fullPage: false, type: "png" });
    const base64Screenshot1 = screenshot1.toString("base64");

    steps.push({
      step: 2,
      action: "Take initial screenshot",
      result: "✅ Screenshot captured",
      screenshotUrl: screenshot1Url,
      timestamp: new Date().toISOString(),
    });

    // ==================
    // STEP 3: Check if user is authenticated
    // ==================
    console.log("🔐 Step 3: Checking authentication status...");

    const { object: authCheck } = await generateObject({
      model: visionModel,
      schema: authCheckSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this screenshot of the Uber website (m.uber.com).

I need to determine if the user is LOGGED IN or NOT.

IMPORTANT: Look for these specific indicators:

LOGGED OUT indicators (user NOT authenticated):
- A "Login" button visible in the top right corner or header
- A "Sign up" button visible in the top right corner or header
- Any login/signup prompts or forms

LOGGED IN indicators (user IS authenticated):
- User profile icon or avatar instead of login/signup buttons
- "Activity" button showing ride history
- The ride booking form is fully functional
- No login prompts visible

Look at the TOP RIGHT area of the page carefully. If you see "Login" and "Sign up" buttons, the user is NOT logged in.

Tell me:
- Is the user logged in?
- Is there a Login button visible?
- Is there a Sign up button visible?`,
            },
            {
              type: "image",
              image: base64Screenshot1,
            },
          ],
        },
      ],
    });

    console.log("🔍 Auth check result:", JSON.stringify(authCheck, null, 2));

    // If Login/Signup buttons are visible, user is not authenticated
    if (
      authCheck.hasLoginButton ||
      authCheck.hasSignUpButton ||
      !authCheck.isLoggedIn
    ) {
      console.log("🔒 User is not authenticated - cancelling automation");

      steps.push({
        step: 3,
        action: "Check authentication",
        result: "🔒 User is NOT logged in - Login/Sign up buttons detected",
        timestamp: new Date().toISOString(),
      });

      await browser.close();

      return NextResponse.json(
        {
          success: false,
          authRequired: true,
          message:
            "Please login to Uber first. We detected Login/Sign up buttons on the page, indicating you are not authenticated.",
          steps,
          requested: {
            pickup,
            dropoff,
          },
        },
        { status: 200 }
      );
    }

    steps.push({
      step: 3,
      action: "Check authentication",
      result: "✅ User is logged in",
      timestamp: new Date().toISOString(),
    });

    await randomDelay(1000, 1500);

    // ==================
    // STEP 4: Fill in Pickup Location (FIRST input)
    // ==================
    console.log(`📍 Step 4: Filling pickup location: ${pickup}...`);

    let pickupFilled = false;

    // Click on the FIRST input or pickup field
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
          } catch (e) {
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

    steps.push({
      step: 4,
      action: `Fill pickup location: ${pickup}`,
      result: pickupFilled
        ? `✅ Pickup location set to "${pickup}"`
        : `⚠️ Could not fill pickup location`,
      timestamp: new Date().toISOString(),
    });

    await randomDelay(1500, 2000);

    // ==================
    // STEP 5: Fill in Dropoff Location (SECOND input)
    // ==================
    console.log(`📍 Step 5: Filling dropoff location: ${dropoff}...`);

    let dropoffFilled = false;

    try {
      // After pickup is selected, there should be a second input for dropoff
      // Click on the SECOND input
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
          } catch (e) {
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
          } catch (e) {
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

    steps.push({
      step: 5,
      action: `Fill dropoff location: ${dropoff}`,
      result: dropoffFilled
        ? `✅ Dropoff location set to "${dropoff}"`
        : `⚠️ Could not fill dropoff location`,
      timestamp: new Date().toISOString(),
    });

    await randomDelay(1500, 2000);

    // ==================
    // STEP 6: Click Save/Search Button
    // ==================
    console.log("🔍 Step 6: Clicking Save/Search button...");

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
      } catch (e) {
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
      } catch (e) {
        // Try Enter key
        console.log("   🔄 Trying Enter key...");
        await page.keyboard.press("Enter");
        searchClicked = true;
      }
    }

    steps.push({
      step: 6,
      action: "Click Save/Search button",
      result: searchClicked
        ? "✅ Search initiated"
        : "⚠️ Could not click search button",
      timestamp: new Date().toISOString(),
    });

    // Wait for results to load
    console.log("   ⏳ Waiting for ride options to load...");
    await randomDelay(4000, 6000);

    // Additional wait if page is still loading
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
      console.log("   ℹ️ Network idle timeout, continuing anyway");
    });

    await randomDelay(2000, 3000);

    // ==================
    // STEP 7: Take Results Screenshot
    // ==================
    console.log("📸 Step 7: Taking results screenshot...");
    const screenshot2Url = await saveScreenshot(page, "02-results-page");
    const screenshot2 = await page.screenshot({ fullPage: false, type: "png" });
    const base64Screenshot2 = screenshot2.toString("base64");

    steps.push({
      step: 7,
      action: "Take results screenshot",
      result: "✅ Screenshot captured",
      screenshotUrl: screenshot2Url,
      timestamp: new Date().toISOString(),
    });

    // ==================
    // STEP 8: Extract Ride Options using Gemini Vision
    // ==================
    console.log("🚗 Step 8: Extracting ride options with AI...");

    let rideDetails: {
      rides: Array<{
        name: string;
        description?: string;
        fare: string;
        eta?: string;
        capacity?: string;
      }>;
      totalOptions?: number;
    } = { rides: [], totalOptions: 0 };

    try {
      const { object: extractedRides } = await generateObject({
        model: visionModel,
        schema: rideOptionsSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract ride options from this Uber ride selection screenshot.

Look for the "Choose a ride" section that shows available ride options.

For EACH ride option card, extract:
1. **Name**: The ride type name (e.g., "Uber Go", "Go Non AC", "Bike", "UberXL", "Premier")
2. **Description**: Any tagline or description (e.g., "Affordable, compact AC rides", "Everyday affordable rides")
3. **Fare**: The price shown (e.g., "₹525.88", "₹451.88", "₹170.14")
4. **ETA**: Estimated arrival time if shown (e.g., "2 min away", "4 mins away")
5. **Capacity**: Passenger capacity if shown

IMPORTANT:
- Extract the FIRST 3 ride options shown
- Make sure to capture the correct fare for each ride
- Fares are typically shown on the RIGHT side of each card
- The name is usually on the LEFT with an icon

Return the rides in order from top to bottom as they appear.`,
              },
              {
                type: "image",
                image: base64Screenshot2,
              },
            ],
          },
        ],
      });

      rideDetails = {
        rides: (extractedRides.rides || []).slice(0, 3).map((r) => ({
          name: r.name || "Unknown",
          description: r.description,
          fare: r.fare || "N/A",
          eta: r.eta,
          capacity: r.capacity,
        })),
        totalOptions: extractedRides.totalOptions,
      };

      console.log("🚗 Extracted rides:", JSON.stringify(rideDetails, null, 2));

      steps.push({
        step: 8,
        action: "Extract ride options",
        result: `✅ Extracted ${rideDetails.rides.length} ride options`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("❌ Failed to extract rides:", e);
      steps.push({
        step: 8,
        action: "Extract ride options",
        result: "⚠️ Could not extract ride details",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Found ${rideDetails.rides.length} ride options`,
        steps,
        rides: rideDetails.rides,
        requested: {
          pickup,
          dropoff,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error in Uber automation:", error);

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
