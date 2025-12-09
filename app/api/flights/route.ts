import { NextRequest, NextResponse } from "next/server";
import {
  launchBrowser,
  setupStealthMode,
  randomDelay,
} from "@/lib/playwright-utils";
import { generateObject } from "ai";
import {
  pageAnalysisSchema,
  verificationSchema,
  flightDetailsSchema,
  flightsApiRequestSchema,
} from "@/lib/schema/flights";
import { visionModel } from "@/lib/ai";
import {
  handleCookieConsent,
  createStep,
  CLASS_LABELS,
  selectTripType,
  selectTravelClass,
  selectDirectFlights,
  clickSearchButton,
  selectOriginAirport,
  selectDestinationAirport,
  selectTravelDates,
  selectTravelers,
} from "@/lib/automation/flights";

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
    const parseResult = flightsApiRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid request: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const {
      tripType,
      travelClass,
      directFlights,
      from,
      to,
      departDate,
      returnDate,
      adults,
    } = parseResult.data;

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

    await handleCookieConsent(page);
    await randomDelay(1000, 2000);

    steps.push(
      createStep(1, "Load booking.com/flights", "✅ Page loaded successfully")
    );

    // ==================
    // STEP 2: Take Initial Screenshot for AI analysis
    // ==================
    console.log("📸 Step 2: Taking initial screenshot for AI...");
    const screenshot1 = await page.screenshot({ fullPage: false, type: "png" });
    const base64Screenshot1 = screenshot1.toString("base64");

    steps.push(
      createStep(2, "Capture page for AI analysis", "✅ Screenshot captured")
    );

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

    steps.push(
      createStep(
        3,
        "Gemini AI analyzing page elements",
        `✅ Analysis complete - Trip type: ${analysis.currentTripType || "unknown"}, Class: ${analysis.currentClass || "unknown"}, Direct flights: ${analysis.directFlightsChecked ? "checked" : "unchecked"}`
      )
    );

    // ==================
    // STEP 4: Select Trip Type
    // ==================
    const tripTypeText = tripType === "round-trip" ? "Round-trip" : "One-way";
    console.log(`🖱️ Step 4: Selecting trip type: ${tripType}...`);

    const tripTypeClicked = await selectTripType(page, tripType);
    await randomDelay(500, 1000);

    steps.push(
      createStep(
        4,
        `Select trip type: ${tripTypeText}`,
        tripTypeClicked
          ? `✅ Selected ${tripTypeText}`
          : `⚠️ Could not click ${tripTypeText} (may already be selected)`
      )
    );

    // ==================
    // STEP 5: Select Travel Class
    // ==================
    const classText = CLASS_LABELS[travelClass] || travelClass;
    console.log(`🖱️ Step 5: Selecting travel class: ${travelClass}...`);

    const classClicked = await selectTravelClass(page, travelClass);
    await randomDelay(500, 1000);

    steps.push(
      createStep(
        5,
        `Select travel class: ${classText}`,
        classClicked
          ? `✅ Selected ${classText}`
          : `⚠️ Could not select ${classText} (may already be selected)`
      )
    );

    // ==================
    // STEP 6: Select Origin Airport
    // ==================
    let originSelected = false;

    if (from) {
      console.log(`🖱️ Step 6: Selecting origin airport: ${from}...`);
      originSelected = await selectOriginAirport(page, from);
      console.log(`   ✅ Selected origin: ${from}`);

      steps.push(
        createStep(
          6,
          `Select origin: ${from}`,
          originSelected ? `✅ ${from} selected` : `⚠️ Could not select origin`
        )
      );
    } else {
      steps.push(
        createStep(
          6,
          "Skip origin selection",
          "ℹ️ Skipped (no origin provided)"
        )
      );
    }

    await randomDelay(500, 1000);

    // ==================
    // STEP 7: Select Destination Airport
    // ==================
    let destinationSelected = false;

    if (to) {
      console.log(`🖱️ Step 7: Selecting destination airport: ${to}...`);
      destinationSelected = await selectDestinationAirport(page, to);
      console.log(`   ✅ Selected destination: ${to}`);

      steps.push(
        createStep(
          7,
          `Select destination: ${to}`,
          destinationSelected
            ? `✅ Selected ${to}`
            : `⚠️ Could not select destination`
        )
      );
    } else {
      steps.push(
        createStep(
          7,
          "Skip destination selection",
          "ℹ️ Skipped (no destination provided)"
        )
      );
    }

    await randomDelay(500, 1000);

    // ==================
    // STEP 8: Select Travel Dates
    // ==================
    let datesSelected = false;

    if (departDate) {
      console.log(
        `📅 Step 8: Selecting travel dates: ${departDate}${returnDate ? ` to ${returnDate}` : ""}...`
      );
      datesSelected = await selectTravelDates(
        page,
        departDate,
        returnDate,
        tripType
      );

      steps.push(
        createStep(
          8,
          `Select travel dates: ${departDate}${returnDate ? ` - ${returnDate}` : ""}`,
          datesSelected ? `✅ Dates selected` : `⚠️ Could not select dates`
        )
      );
    } else {
      steps.push(
        createStep(8, "Skip date selection", "ℹ️ Skipped (no date provided)")
      );
    }

    await randomDelay(500, 1000);

    // ==================
    // STEP 9: Select Travelers
    // ==================
    const targetAdults = adults || 1;

    if (targetAdults > 1) {
      console.log(
        `👥 Step 9: Setting travelers to ${targetAdults} adult(s)...`
      );
      const travelersSelected = await selectTravelers(page, targetAdults);

      steps.push(
        createStep(
          9,
          `Set travelers to ${targetAdults} adult(s)`,
          travelersSelected
            ? `✅ Set to ${targetAdults} adult(s)`
            : `⚠️ Could not set travelers`
        )
      );
    } else {
      console.log("👥 Step 9: Skipping travelers (already 1 adult by default)");
      steps.push(
        createStep(
          9,
          "Travelers: 1 adult",
          "✅ Default (1 adult) - no action needed"
        )
      );
    }

    await randomDelay(500, 1000);

    // ==================
    // STEP 10: Select Direct Flights (if requested)
    // ==================
    if (directFlights) {
      console.log("🖱️ Step 10: Checking 'Direct flights only' checkbox...");
      const directClicked = await selectDirectFlights(page);

      steps.push(
        createStep(
          10,
          "Check 'Direct flights only' checkbox",
          directClicked ? "✅ Checkbox clicked" : "❌ Could not click checkbox"
        )
      );
    } else {
      steps.push(
        createStep(
          10,
          "Skip 'Direct flights only' checkbox",
          "ℹ️ Skipped (not requested)"
        )
      );
    }

    await randomDelay(500, 1000);

    // ==================
    // STEP 11: Click Search Button
    // ==================
    console.log("🖱️ Step 11: Clicking Explore/Search button...");
    const searchClicked = await clickSearchButton(page);

    if (searchClicked) {
      console.log("   ⏳ Waiting for results page to load...");
      try {
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

    steps.push(
      createStep(
        11,
        "Click Explore/Search button",
        searchClicked
          ? "✅ Search initiated, waiting for results"
          : "❌ Could not click search button"
      )
    );

    // ==================
    // STEP 12: Take results screenshot for AI
    // ==================
    console.log("📸 Step 12: Taking results screenshot for AI...");
    await randomDelay(1000, 1500);

    const screenshot2 = await page.screenshot({ fullPage: false, type: "png" });
    const base64Screenshot2 = screenshot2.toString("base64");

    steps.push(
      createStep(
        12,
        "Capture results for AI analysis",
        "✅ Screenshot captured"
      )
    );

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

    steps.push(
      createStep(
        13,
        "Gemini AI verifying results",
        verification.success
          ? `✅ ${verification.description}`
          : `❌ ${verification.description}`
      )
    );

    // ==================
    // STEP 14: Extract flight details
    // ==================
    console.log("✈️ Step 14: Extracting flight details...");

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

      steps.push(
        createStep(
          14,
          "Extract flight details",
          `✅ Extracted ${flightDetails.flights.length} flights`
        )
      );
    } catch (e) {
      console.error("❌ Failed to extract flights:", e);
      steps.push(
        createStep(
          14,
          "Extract flight details",
          "⚠️ Could not extract flight details"
        )
      );
    }

    return NextResponse.json(
      {
        success: verification.success,
        message: verification.description,
        steps,
        flights: flightDetails.flights.slice(0, 5),
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
