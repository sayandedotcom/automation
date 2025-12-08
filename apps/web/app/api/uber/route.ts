import { NextRequest, NextResponse } from "next/server";
import {
  launchBrowser,
  setupStealthMode,
  randomDelay,
} from "@/lib/playwright-utils";
import { generateObject } from "ai";
import { rideOptionsSchema, uberApiRequestSchema } from "@/lib/schema/uber";
import { visionModel } from "@/lib/ai";
import {
  createStep,
  fillPickupLocation,
  fillDropoffLocation,
  clickSearchButton,
  waitForRideResults,
} from "@/lib/automation/uber";

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

    // Validate request body
    const parseResult = uberApiRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid request: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { pickup, dropoff, authState } = parseResult.data;

    console.log("🚗 Starting Uber automation with:", {
      pickup,
      dropoff,
      hasAuthState: !!authState,
    });

    // Launch browser
    const headless = process.env.HEADFUL !== "true";
    console.log(`🌐 Launching browser (headless: ${headless})...`);

    browser = await launchBrowser({ headless });

    // Create context with auth state from client (localStorage)
    const contextOptions: {
      viewport: { width: number; height: number };
      userAgent: string;
      storageState?: {
        cookies: Array<{
          name: string;
          value: string;
          domain: string;
          path: string;
          expires: number;
          httpOnly: boolean;
          secure: boolean;
          sameSite: "Strict" | "Lax" | "None";
        }>;
        origins: Array<{
          origin: string;
          localStorage: Array<{ name: string; value: string }>;
        }>;
      };
    } = {
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    // Use auth state from client if provided
    if (authState && authState.cookies && authState.origins) {
      contextOptions.storageState =
        authState as typeof contextOptions.storageState;
      console.log("✅ Using auth state from client localStorage");
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

    steps.push(
      createStep(1, "Load Uber website", "✅ Page loaded successfully")
    );

    // ==================
    // STEP 2: Fill in Pickup Location
    // ==================
    const pickupFilled = await fillPickupLocation(page, pickup);

    steps.push(
      createStep(
        2,
        `Fill pickup location: ${pickup}`,
        pickupFilled
          ? `✅ Pickup location set to "${pickup}"`
          : `⚠️ Could not fill pickup location`
      )
    );

    await randomDelay(1500, 2000);

    // ==================
    // STEP 3: Fill in Dropoff Location
    // ==================
    const dropoffFilled = await fillDropoffLocation(page, dropoff);

    steps.push(
      createStep(
        3,
        `Fill dropoff location: ${dropoff}`,
        dropoffFilled
          ? `✅ Dropoff location set to "${dropoff}"`
          : `⚠️ Could not fill dropoff location`
      )
    );

    await randomDelay(1500, 2000);

    // ==================
    // STEP 4: Click Save/Search Button
    // ==================
    const searchClicked = await clickSearchButton(page);

    steps.push(
      createStep(
        4,
        "Click Save/Search button",
        searchClicked
          ? "✅ Search initiated"
          : "⚠️ Could not click search button"
      )
    );

    // Wait for results to load
    await waitForRideResults(page);

    // ==================
    // STEP 5: Capture Results for AI Analysis
    // ==================
    console.log("📸 Step 5: Capturing results for AI analysis...");
    const screenshot = await page.screenshot({ fullPage: false, type: "png" });
    const base64Screenshot = screenshot.toString("base64");

    steps.push(
      createStep(
        5,
        "Capture results for AI",
        "✅ Results captured for AI analysis"
      )
    );

    // ==================
    // STEP 6: Extract Ride Options using Gemini Vision
    // ==================
    console.log("🚗 Step 6: Extracting ride options with AI...");

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
                image: base64Screenshot,
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

      steps.push(
        createStep(
          6,
          "Extract ride options",
          `✅ Extracted ${rideDetails.rides.length} ride options`
        )
      );
    } catch (e) {
      console.error("❌ Failed to extract rides:", e);
      steps.push(
        createStep(
          6,
          "Extract ride options",
          "⚠️ Could not extract ride details"
        )
      );
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

    steps.push(
      createStep(
        steps.length + 1,
        "Error occurred",
        `❌ ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );

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
