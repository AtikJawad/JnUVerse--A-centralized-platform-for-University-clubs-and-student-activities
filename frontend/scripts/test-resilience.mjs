#!/usr/bin/env node
/**
 * Resilience checks in headless Chrome — Week 9 Stage 2 (read-only; no dependencies)
 *
 * Needs the dev server (`npm run dev`, default http://localhost:5173) and the backend running.
 *   npm run test:resilience            or   APP_URL=http://localhost:5174 npm run test:resilience
 *
 * Checks: Not Found page; logged-out navbar shows public links only; expired session on a student
 * page and on an operator page (correct login page, notice shown once, return path kept);
 * "waking up the server" notice on slow requests and its clearing; offline notice.
 */
import { launchChrome } from "./lib/cdp.mjs";

const APP = (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BAD_TOKENS = { access_token: "invalid", refresh_token: "invalid", user: "{}" };
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const { page, close } = await launchChrome();
try {
  await page.setViewport(1280, 800);

  // 1. Not Found page
  await page.goto(`${APP}/this-page-does-not-exist`);
  let text = await page.text();
  check("Unknown URL shows the Not Found page", text.includes("This page does not exist") && (await page.path()) === "/this-page-does-not-exist");

  // 2. Logged-out navbar
  const nav = await page.eval("[...document.querySelectorAll('nav[aria-label=\"Main Navigation\"] a')].map(a => a.textContent.trim())");
  check("Logged-out navbar shows only public links", JSON.stringify(nav) === JSON.stringify(["Overview", "Explore Clubs", "Events"]), nav.join(", "));

  // 3. Expired session on a student page
  await page.clearStorage();
  await page.setLocalStorage(BAD_TOKENS);
  await page.goto(`${APP}/my-activity`, 5000);
  text = await page.text();
  check(
    "Expired session (student page) → student login with notice and return path",
    (await page.path()) === "/login" && text.includes("Your session has expired") && (await page.eval("history.state?.usr?.from?.pathname")) === "/my-activity"
  );
  await page.goto(`${APP}/login`);
  check("Session notice is shown only once", !(await page.text()).includes("Your session has expired"));

  // 4. Expired session on an operator page
  await page.clearStorage();
  await page.setLocalStorage(BAD_TOKENS);
  await page.goto(`${APP}/operator/analytics`, 5000);
  text = await page.text();
  check(
    "Expired session (operator page) → operator login with notice and return path",
    (await page.path()) === "/operator/login" &&
      text.includes("Your session has expired") &&
      /operator email/i.test(text) &&
      (await page.eval("history.state?.usr?.from?.pathname")) === "/operator/analytics"
  );

  // 5. Slow server notice. Visit /events first so its lazily loaded page chunk is cached; the emulated
  //    latency then delays only the API requests (otherwise the chunk download itself is delayed and the
  //    app correctly shows the "Loading page..." fallback instead).
  await page.clearStorage();
  await page.goto(`${APP}/events`, 4000);
  await page.eval("history.pushState({}, '', '/clubs'); dispatchEvent(new PopStateEvent('popstate'))");
  await sleep(4000);
  await page.send("Network.enable");
  await page.send("Network.emulateNetworkConditions", { offline: false, latency: 6000, downloadThroughput: -1, uploadThroughput: -1 });
  await page.eval("history.pushState({}, '', '/events'); dispatchEvent(new PopStateEvent('popstate'))");
  await sleep(5000);
  check("Slow request (> 4 s) shows the waking-up notice", (await page.text()).includes("Waking up the server"));
  await page.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  let cleared = false;
  for (let i = 0; i < 30 && !cleared; i++) {
    await sleep(1000);
    cleared = !(await page.text()).includes("Waking up the server");
  }
  check("Waking-up notice clears when requests finish", cleared);

  // 6. Offline notice
  await page.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await sleep(800);
  check("Offline shows the offline notice", (await page.text()).includes("You are offline"));
  await page.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await sleep(800);
  check("Back online hides the offline notice", !(await page.text()).includes("You are offline"));
} finally {
  await close();
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
