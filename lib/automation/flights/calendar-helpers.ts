import type { Page } from "playwright";
import { randomDelay } from "@/lib/playwright-utils";

/**
 * Month names for calendar navigation
 */
export const MONTH_NAMES = [
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

/**
 * Open the travel dates field
 */
export async function openDatePicker(page: Page): Promise<boolean> {
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

  for (const selector of travelDatesSelectors) {
    try {
      console.log(`   Trying selector: ${selector}`);
      const element = page.locator(selector).first();

      if (await element.isVisible({ timeout: 2000 })) {
        await element.click({ timeout: 3000 });
        await randomDelay(800, 1200);
        console.log(`   ✅ Clicked travel dates field`);
        return true;
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: Try JavaScript click
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
    console.log("   ✅ Clicked via JavaScript");
    return true;
  } catch (e) {
    console.log("   ❌ JavaScript click failed");
  }

  return false;
}

/**
 * Navigate calendar to a specific month/year
 */
export async function navigateToMonth(
  page: Page,
  targetMonth: string,
  targetYear: number
): Promise<boolean> {
  const targetMonthIndex = MONTH_NAMES.indexOf(targetMonth);
  let maxNavigations = 24;
  let foundCorrectMonth = false;

  while (maxNavigations > 0 && !foundCorrectMonth) {
    maxNavigations--;

    const pageText = (await page.textContent("body")) || "";

    if (pageText.includes(`${targetMonth} ${targetYear}`)) {
      console.log(`   ✅ Found ${targetMonth} ${targetYear} in view`);
      foundCorrectMonth = true;
      break;
    }

    const monthMatches = pageText.matchAll(
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/g
    );
    const displayedMonths = Array.from(monthMatches);

    if (displayedMonths.length > 0) {
      const firstDisplayedMonth = displayedMonths[0][1];
      const firstDisplayedYear = parseInt(displayedMonths[0][2]);
      const displayedMonthIndex = MONTH_NAMES.indexOf(firstDisplayedMonth);

      const targetTotal = targetYear * 12 + targetMonthIndex;
      const displayedTotal = firstDisplayedYear * 12 + displayedMonthIndex;
      const monthDiff = targetTotal - displayedTotal;

      console.log(
        `   📊 Current calendar shows: ${firstDisplayedMonth} ${firstDisplayedYear}, target: ${targetMonth} ${targetYear}, diff: ${monthDiff} months`
      );

      if (monthDiff < 0) {
        console.log(
          `   ⬅️ Navigating back (${Math.abs(monthDiff)} months to go)`
        );
        const clicked = await clickCalendarNavButton(page, "prev");
        if (clicked) {
          await randomDelay(500, 700);
        } else {
          console.log("   ❌ Could not find previous button");
          break;
        }
      } else if (monthDiff > 1) {
        console.log(`   ➡️ Navigating forward (${monthDiff} months to go)`);
        const clicked = await clickCalendarNavButton(page, "next");
        if (clicked) {
          await randomDelay(500, 700);
        } else {
          console.log("   ❌ Could not find next button");
          break;
        }
      } else {
        foundCorrectMonth = true;
      }
    } else {
      console.log("   ⚠️ Could not determine currently displayed month");
      break;
    }
  }

  return foundCorrectMonth;
}

/**
 * Click calendar navigation button (previous or next)
 */
async function clickCalendarNavButton(
  page: Page,
  direction: "prev" | "next"
): Promise<boolean> {
  return page.evaluate((dir) => {
    // First try: Use the specific booking.com class name
    const byClass = document.querySelector(
      `button[class*="Calendar-module__control--${dir}"]`
    );
    if (byClass) {
      (byClass as HTMLElement).click();
      return true;
    }

    // Second try: Find button with SVG in the right area
    const allButtons = Array.from(document.querySelectorAll("button"));
    const isLeft = dir === "prev";
    const positionThreshold = isLeft ? 400 : 500;

    for (const btn of allButtons) {
      const rect = btn.getBoundingClientRect();
      const inCorrectPosition = isLeft
        ? rect.left < positionThreshold
        : rect.left > positionThreshold;

      if (rect.top > 150 && rect.top < 350 && inCorrectPosition) {
        const svg = btn.querySelector("svg");
        const className = btn.className || "";

        if (
          svg &&
          rect.width < 80 &&
          rect.height < 80 &&
          (className.includes("control") ||
            className.includes(dir) ||
            className.includes("Calendar") ||
            className.includes("Button"))
        ) {
          (btn as HTMLElement).click();
          return true;
        }
      }
    }

    // Third try: Click the leftmost/rightmost button with an SVG
    const buttonsWithSvg = allButtons
      .filter((btn) => {
        const rect = btn.getBoundingClientRect();
        const hasSvg = btn.querySelector("svg") !== null;
        return hasSvg && rect.top > 150 && rect.top < 350 && rect.width < 80;
      })
      .sort((a, b) => {
        const diff =
          a.getBoundingClientRect().left - b.getBoundingClientRect().left;
        return isLeft ? diff : -diff;
      });

    if (buttonsWithSvg.length > 0) {
      (buttonsWithSvg[0] as HTMLElement).click();
      return true;
    }

    return false;
  }, direction);
}

/**
 * Click on a specific day in the calendar
 */
export async function clickDay(
  page: Page,
  day: number,
  targetMonth: string,
  targetYear: number
): Promise<boolean> {
  const monthIndex = MONTH_NAMES.indexOf(targetMonth);
  const paddedMonth = String(monthIndex + 1).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  const dateStr = `${targetYear}-${paddedMonth}-${paddedDay}`;

  console.log(
    `   🔍 Looking for day ${day} (${dateStr}) in ${targetMonth} ${targetYear}...`
  );

  const clicked = await page.evaluate(
    ({ dayNum, dateString, month, year }) => {
      // Method 1: Try data-date attribute
      const byDataDate = document.querySelector(
        `[data-date="${dateString}"], [data-value="${dateString}"]`
      );
      if (byDataDate) {
        (byDataDate as HTMLElement).click();
        return true;
      }

      // Method 2: Find the correct calendar panel
      const allSpans = Array.from(document.querySelectorAll("span, div, h3"));
      let targetCalendarPanel: Element | null = null;

      for (const el of allSpans) {
        if (el.textContent?.trim() === `${month} ${year}`) {
          targetCalendarPanel =
            el.closest('[class*="Calendar"]') ||
            el.closest("table")?.parentElement ||
            el.parentElement?.parentElement;
          break;
        }
      }

      // Method 3: Find day cells
      const allCells = document.querySelectorAll("td, span, div, button");
      const matchingCells: { el: Element; score: number }[] = [];

      for (const cell of Array.from(allCells)) {
        const text = cell.textContent?.trim();
        if (text === String(dayNum)) {
          const rect = cell.getBoundingClientRect();
          if (
            rect.top > 200 &&
            rect.top < 700 &&
            rect.left > 100 &&
            rect.left < 800 &&
            rect.width > 20 &&
            rect.height > 20
          ) {
            const style = window.getComputedStyle(cell);
            const isDisabled =
              parseFloat(style.opacity) < 0.5 ||
              cell.closest('[aria-disabled="true"]') !== null ||
              cell.hasAttribute("disabled");

            if (!isDisabled) {
              let score = 1;
              if (targetCalendarPanel && targetCalendarPanel.contains(cell)) {
                score = 10;
              }
              matchingCells.push({ el: cell, score });
            }
          }
        }
      }

      matchingCells.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return (
          a.el.getBoundingClientRect().left - b.el.getBoundingClientRect().left
        );
      });

      if (matchingCells.length > 0) {
        (matchingCells[0].el as HTMLElement).click();
        return true;
      }

      return false;
    },
    { dayNum: day, dateString: dateStr, month: targetMonth, year: targetYear }
  );

  return clicked;
}

/**
 * Select travel dates (departure and optionally return)
 */
export async function selectTravelDates(
  page: Page,
  departDate: string,
  returnDate?: string,
  tripType: string = "round-trip"
): Promise<boolean> {
  const dateFieldClicked = await openDatePicker(page);

  if (!dateFieldClicked) {
    return false;
  }

  // Wait for calendar to open
  await randomDelay(1500, 2000);

  // Parse departure date
  const departDateObj = new Date(departDate);
  const departDay = departDateObj.getDate();
  const departMonthIndex = departDateObj.getMonth();
  const departYear = departDateObj.getFullYear();
  const departMonth = MONTH_NAMES[departMonthIndex];

  console.log(
    `   📅 Target departure date: ${departMonth} ${departDay}, ${departYear}`
  );

  try {
    // Navigate to correct month
    const foundDepartMonth = await navigateToMonth(
      page,
      departMonth,
      departYear
    );

    if (foundDepartMonth) {
      await randomDelay(300, 500);

      // Click departure day
      const departDayClicked = await clickDay(
        page,
        departDay,
        departMonth,
        departYear
      );

      if (departDayClicked) {
        console.log(`   ✅ Clicked departure day ${departDay}`);
        await randomDelay(800, 1200);

        // Select return date if round-trip
        if (returnDate && tripType === "round-trip") {
          const returnDateObj = new Date(returnDate);
          const returnDay = returnDateObj.getDate();
          const returnMonthIndex = returnDateObj.getMonth();
          const returnYear = returnDateObj.getFullYear();
          const returnMonth = MONTH_NAMES[returnMonthIndex];

          console.log(
            `   📅 Target return date: ${returnMonth} ${returnDay}, ${returnYear}`
          );

          // Navigate if different month
          if (returnMonth !== departMonth || returnYear !== departYear) {
            console.log(
              `   📆 Return date is in different month, navigating...`
            );
            await navigateToMonth(page, returnMonth, returnYear);
            await randomDelay(300, 500);
          }

          // Click return day
          const returnDayClicked = await clickDay(
            page,
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

        // Close calendar
        await page.keyboard.press("Escape");
        await randomDelay(300, 500);
        return true;
      } else {
        console.log(`   ⚠️ Could not click departure day ${departDay}`);
      }
    } else {
      console.log(`   ⚠️ Could not navigate to ${departMonth} ${departYear}`);
    }
  } catch (e) {
    console.error("   ❌ Error selecting date:", e);
  }

  await page.keyboard.press("Escape");
  await randomDelay(300, 500);
  return false;
}
