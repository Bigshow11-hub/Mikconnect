import { expect, test } from "../fixtures/mikconnect-test";

test("le dashboard publie une baseline de performance mobile/desktop", async ({
  page,
  loginAs,
}, testInfo) => {
  await loginAs("ownerA");
  await expect(page.locator("main")).toBeVisible();
  await page.waitForLoadState("load");
  await page.waitForTimeout(750);

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const scripts = performance
      .getEntriesByType("resource")
      .filter(
        (entry) => entry.name.includes("/_next/static/") && entry.name.endsWith(".js"),
      ) as PerformanceResourceTiming[];
    return {
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd - navigation.startTime),
      loadMs: Math.round(navigation.loadEventEnd - navigation.startTime),
      scriptTransferBytes: scripts.reduce((total, entry) => total + entry.transferSize, 0),
    };
  });

  await testInfo.attach("performance-baseline.json", {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: "application/json",
  });

  testInfo.annotations.push({
    type: "performance-baseline",
    description: `${metrics.scriptTransferBytes} octets JS, chargement ${metrics.loadMs} ms`,
  });
  expect(metrics.loadMs).toBeGreaterThanOrEqual(0);
});
