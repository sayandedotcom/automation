import { NextRequest, NextResponse } from "next/server";
import { launchBrowser, setupStealthMode } from "@/lib/playwright-utils";
import path from "path";
import fs from "fs";

export const maxDuration = 120; // Allow more time for manual login

// Path to store auth state
const AUTH_STATE_PATH = path.join(process.cwd(), "data", "uber-auth.json");

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

// Check if auth state exists and is recent enough to be valid
// Note: We trust file existence because we only save it after verified UI login detection
export async function GET() {
  try {
    const exists = fs.existsSync(AUTH_STATE_PATH);

    if (!exists) {
      return NextResponse.json({
        authenticated: false,
        lastModified: null,
        path: AUTH_STATE_PATH,
      });
    }

    // Get file stats to check last modification time
    const stats = fs.statSync(AUTH_STATE_PATH);
    const lastModified = stats.mtime;
    const now = new Date();
    const ageInDays =
      (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

    // If auth state is older than 7 days, consider it expired
    // Uber sessions typically don't last longer than this
    if (ageInDays > 7) {
      fs.unlinkSync(AUTH_STATE_PATH);
      return NextResponse.json({
        authenticated: false,
        lastModified: null,
        path: AUTH_STATE_PATH,
        reason: "Session expired (older than 7 days)",
      });
    }

    // Read the auth state to verify it has content
    const authState = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, "utf-8"));
    const cookies = authState.cookies || [];

    // Basic sanity check - auth state should have cookies
    if (cookies.length === 0) {
      fs.unlinkSync(AUTH_STATE_PATH);
      return NextResponse.json({
        authenticated: false,
        lastModified: null,
        path: AUTH_STATE_PATH,
        reason: "Invalid auth state (no cookies)",
      });
    }

    return NextResponse.json({
      authenticated: true,
      lastModified: lastModified.toISOString(),
      path: AUTH_STATE_PATH,
      cookieCount: cookies.length,
      ageInDays: Math.round(ageInDays * 10) / 10,
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Setup authentication - opens browser for user to login
export async function POST(request: NextRequest) {
  let browser;

  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    // If action is "clear", delete the auth state
    if (action === "clear") {
      if (fs.existsSync(AUTH_STATE_PATH)) {
        fs.unlinkSync(AUTH_STATE_PATH);
      }
      return NextResponse.json({
        success: true,
        message: "Auth state cleared",
      });
    }

    ensureDataDir();

    // IMPORTANT: Clear any existing auth state before starting new auth flow
    // This prevents false-positive auth status if user abandons the login
    if (fs.existsSync(AUTH_STATE_PATH)) {
      fs.unlinkSync(AUTH_STATE_PATH);
      console.log("🗑️ Cleared existing auth state to start fresh");
    }

    console.log("🔐 Starting Uber auth setup...");

    // Launch browser in HEADED mode so user can login
    browser = await launchBrowser({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();
    await setupStealthMode(page);

    // Navigate to Uber login (with longer timeout)
    console.log("📍 Navigating to Uber...");
    try {
      await page.goto("https://m.uber.com/", {
        waitUntil: "domcontentloaded",
        timeout: 60000, // 60 seconds for slow connections
      });
    } catch (navError) {
      console.log("⚠️ Initial navigation slow, waiting for page...");
      // Wait a bit more for slow connections
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Wait for page to stabilize
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("✅ Page loaded, waiting for user to login...");

    // Wait for user to login (max 3 minutes)
    // We require POSITIVE proof of authentication - Activity button or profile must be visible
    console.log("⏳ Waiting for user to login (max 3 minutes)...");
    console.log("   Please login to Uber in the browser window that opened.");

    let isAuthenticated = false;
    let browserClosedByUser = false;
    const maxWaitTime = 180000; // 3 minutes
    const checkInterval = 3000; // Check every 3 seconds
    let waitedTime = 0;

    // Wait for initial page to fully render (Login buttons need time to appear)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    while (
      waitedTime < maxWaitTime &&
      !isAuthenticated &&
      !browserClosedByUser
    ) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waitedTime += checkInterval;

      // Check if browser was closed by user
      if (!browser.isConnected()) {
        console.log("⚠️ Browser was closed by user");
        browserClosedByUser = true;
        break;
      }

      // Check if page was closed
      if (page.isClosed()) {
        console.log("⚠️ Page was closed by user");
        browserClosedByUser = true;
        break;
      }

      // Look for POSITIVE indicators of being logged in:
      // 1. Activity button (ride history) - most reliable
      // 2. Profile/account icon or menu
      // 3. Pickup/dropoff form with user name visible
      // NOTE: We do NOT use cookies for detection because Uber sets session/sid cookies
      //       even for unauthenticated visitors!

      const activityButtonVisible = await page
        .locator('text="Activity"')
        .isVisible()
        .catch(() => false);

      const accountButtonVisible = await page
        .locator(
          '[aria-label*="Account" i], [aria-label*="Profile" i], [data-testid*="account"]'
        )
        .first()
        .isVisible()
        .catch(() => false);

      // Check for "Ride" tab which appears when logged in on m.uber.com
      const rideTabVisible = await page
        .locator('a[href*="/go/ride"], button:has-text("Ride")')
        .first()
        .isVisible()
        .catch(() => false);

      // Check for pickup location input which only appears when authenticated
      const pickupInputVisible = await page
        .locator('[data-testid="pickup-input"], input[placeholder*="Pickup" i]')
        .first()
        .isVisible()
        .catch(() => false);

      // Check URL - after login, URL changes to these authenticated routes
      const currentUrl = page.url();
      const isOnAuthenticatedPage =
        currentUrl.includes("/go/") ||
        currentUrl.includes("/looking") ||
        currentUrl.includes("/ride");

      // Require POSITIVE proof: UI elements that ONLY appear when logged in
      const hasPositiveAuthProof =
        activityButtonVisible ||
        accountButtonVisible ||
        (rideTabVisible && pickupInputVisible) ||
        (isOnAuthenticatedPage && (rideTabVisible || pickupInputVisible));

      if (hasPositiveAuthProof) {
        // Double-check by ensuring login/signup buttons are NOT visible
        const loginButtonVisible = await page
          .locator(
            'button:has-text("Log in"), button:has-text("Sign up"), a:has-text("Log in"), a:has-text("Sign up"), button:has-text("Continue")'
          )
          .first()
          .isVisible()
          .catch(() => false);

        // Only consider authenticated if login buttons are gone OR we have very strong proof
        if (
          !loginButtonVisible ||
          activityButtonVisible ||
          accountButtonVisible
        ) {
          isAuthenticated = true;
          const detectedBy = activityButtonVisible
            ? "Activity button"
            : accountButtonVisible
              ? "Account button"
              : rideTabVisible
                ? "Ride tab + pickup form"
                : "Authenticated page";
          console.log(`✅ User is logged in! (Detected: ${detectedBy})`);
        }
      } else {
        const mins = Math.floor(waitedTime / 60000);
        const secs = Math.floor((waitedTime % 60000) / 1000);
        console.log(`⏳ Waiting for login... (${mins}m ${secs}s)`);
      }
    }

    // Handle browser closed by user
    if (browserClosedByUser) {
      return NextResponse.json({
        success: false,
        message:
          "Browser was closed. Please try again and complete the login process.",
      });
    }

    if (isAuthenticated) {
      // Save the authentication state
      console.log("💾 Saving auth state...");
      await context.storageState({ path: AUTH_STATE_PATH });

      console.log("✅ Auth state saved to:", AUTH_STATE_PATH);

      await browser.close();

      return NextResponse.json({
        success: true,
        message: "Successfully logged in! Your session has been saved.",
        path: AUTH_STATE_PATH,
      });
    } else {
      await browser.close();

      return NextResponse.json({
        success: false,
        message:
          "Login timed out. Please try again and complete the login within 2 minutes.",
      });
    }
  } catch (error) {
    console.error("❌ Auth setup error:", error);

    if (browser) {
      await browser.close();
    }

    return NextResponse.json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
