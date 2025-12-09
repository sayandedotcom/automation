import { NextRequest, NextResponse } from "next/server";
import { launchBrowser, setupStealthMode } from "@/lib/playwright-utils";

export const maxDuration = 120; // Allow more time for manual login

// Configuration constants
const AUTH_CONFIG = {
  maxWaitTime: 180000, // 3 minutes for login
  checkInterval: 2000, // Check every 2 seconds
  initialLoadDelay: 3000, // Wait for page to stabilize
  navigationTimeout: 60000, // 60 seconds for slow connections
  viewport: { width: 1280, height: 800 },
} as const;

// Selectors for detecting authenticated state
const AUTH_SELECTORS = {
  activityButton: 'text="Activity"',
  accountButton:
    '[aria-label*="Account" i], [aria-label*="Profile" i], [data-testid*="account"]',
  rideTab: 'a[href*="/go/ride"], button:has-text("Ride")',
  pickupInput: '[data-testid="pickup-input"], input[placeholder*="Pickup" i]',
  loginButtons:
    'button:has-text("Log in"), button:has-text("Sign up"), a:has-text("Log in"), a:has-text("Sign up"), button:has-text("Continue")',
} as const;

// GET: Simple endpoint - auth checking is now done on client via localStorage
export async function GET() {
  return NextResponse.json({
    message: "Auth status should be checked from localStorage on the client",
    clientSideAuth: true,
  });
}

// POST: Setup authentication - opens browser for user to login
export async function POST(request: NextRequest) {
  let browser;

  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    // If action is "clear", just return success (client handles clearing localStorage)
    if (action === "clear") {
      return NextResponse.json({
        success: true,
        message: "Auth state cleared",
      });
    }

    console.log("🔐 Starting Uber auth setup...");

    // Launch browser in HEADED mode so user can login
    browser = await launchBrowser({ headless: false });
    const context = await browser.newContext({
      viewport: AUTH_CONFIG.viewport,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();
    await setupStealthMode(page);

    // Navigate to Uber login (with longer timeout)
    console.log("📍 Navigating to Uber...");
    try {
      await page.goto("https://auth.uber.com/", {
        waitUntil: "domcontentloaded",
        timeout: AUTH_CONFIG.navigationTimeout,
      });
    } catch (navError) {
      console.log("⚠️ Initial navigation slow, waiting for page...");
      // Wait a bit more for slow connections
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Wait for page to stabilize
    await new Promise((resolve) =>
      setTimeout(resolve, AUTH_CONFIG.initialLoadDelay)
    );
    console.log("✅ Page loaded, waiting for user to login...");

    // Wait for user to login (max 3 minutes)
    console.log("⏳ Waiting for user to login (max 3 minutes)...");
    console.log("   Please login to Uber in the browser window that opened.");

    let isAuthenticated = false;
    let browserClosedByUser = false;
    const { maxWaitTime, checkInterval } = AUTH_CONFIG;
    let waitedTime = 0;

    // Set up instant browser close detection using event listener
    browser.on("disconnected", () => {
      console.log("⚠️ Browser was closed by user (instant detection)");
      browserClosedByUser = true;
    });

    // Wait for initial page to fully render
    await new Promise((resolve) =>
      setTimeout(resolve, AUTH_CONFIG.initialLoadDelay)
    );

    while (
      waitedTime < maxWaitTime &&
      !isAuthenticated &&
      !browserClosedByUser
    ) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waitedTime += checkInterval;

      // Check immediately if browser was disconnected
      if (browserClosedByUser) {
        break;
      }

      // Backup check if browser was closed by user
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

      // Look for POSITIVE indicators of being logged in
      const activityButtonVisible = await page
        .locator(AUTH_SELECTORS.activityButton)
        .isVisible()
        .catch(() => false);

      const accountButtonVisible = await page
        .locator(AUTH_SELECTORS.accountButton)
        .first()
        .isVisible()
        .catch(() => false);

      const rideTabVisible = await page
        .locator(AUTH_SELECTORS.rideTab)
        .first()
        .isVisible()
        .catch(() => false);

      const pickupInputVisible = await page
        .locator(AUTH_SELECTORS.pickupInput)
        .first()
        .isVisible()
        .catch(() => false);

      const currentUrl = page.url();
      const isOnAuthenticatedPage =
        currentUrl.includes("/go/") ||
        currentUrl.includes("/looking") ||
        currentUrl.includes("/ride");

      const hasPositiveAuthProof =
        activityButtonVisible ||
        accountButtonVisible ||
        (rideTabVisible && pickupInputVisible) ||
        (isOnAuthenticatedPage && (rideTabVisible || pickupInputVisible));

      if (hasPositiveAuthProof) {
        const loginButtonVisible = await page
          .locator(AUTH_SELECTORS.loginButtons)
          .first()
          .isVisible()
          .catch(() => false);

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
      // Get the authentication state (don't save to file, return it to client)
      console.log("💾 Getting auth state...");
      const authState = await context.storageState();

      console.log("✅ Auth state retrieved successfully");

      await browser.close();

      // Return auth state to client for localStorage storage
      return NextResponse.json({
        success: true,
        message: "Successfully logged in! Your session has been saved.",
        authState: authState, // Send auth state to client
        timestamp: new Date().toISOString(),
      });
    } else {
      await browser.close();

      return NextResponse.json({
        success: false,
        message:
          "Login timed out. Please try again and complete the login within 3 minutes.",
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
