import { expect, test } from "@playwright/test";
import { pages } from "../pages";

const BASE_URL = "https://ctja.org/";

async function captureFullPage(page: any) {
  // The site uses Swup page transitions which create a scrollable #swup
  // container (overflow: auto) instead of normal document scrolling.
  // We scroll #swup to trigger lazy loading, then resize the viewport
  // to the full content height so the screenshot captures everything.
  const fullHeight = await page.evaluate(async () => {
    const swup = document.getElementById("swup");
    if (!swup) return document.documentElement.scrollHeight;

    // Scroll the #swup container to trigger lazy-loaded content
    let previousHeight = 0;
    while (true) {
      const currentHeight = swup.scrollHeight;
      swup.scrollTo({ top: currentHeight, behavior: "auto" });
      await new Promise((resolve) => setTimeout(resolve, 300));

      const newHeight = swup.scrollHeight;
      if (newHeight <= previousHeight) break;
      previousHeight = newHeight;
    }

    swup.scrollTo({ top: 0, behavior: "auto" });
    return swup.scrollHeight;
  });

  // Resize viewport to fit the full content height (preserve current width)
  const currentViewport = page.viewportSize();
  await page.setViewportSize({ width: currentViewport?.width ?? 1440, height: Math.ceil(fullHeight) });
  await page.waitForTimeout(500);
}

for (const target of pages) {
  test(`${target.name} visual regression`, async ({ page }, testInfo) => {
    await page.goto(`${BASE_URL}${target.path}`, {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(5000);
    await captureFullPage(page);
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot(
      `${testInfo.project.name}-${target.name}.png`,
      {
        animations: "disabled",
        timeout: 30000,
      },
    );
  });
}
