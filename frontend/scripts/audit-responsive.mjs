#!/usr/bin/env node
/**
 * Responsive & accessibility audit — Week 9 Stage 4 (headless Chrome, read-only, no dependencies)
 *
 * Visits every route as a visitor, a student and a club operator at 375 / 768 / 1024 / 1440 px,
 * saves full-page screenshots and checks each page for:
 *   - horizontal page overflow and elements sticking out past the viewport
 *   - tap targets smaller than 24×24 px at 375 px (WCAG 2.2 target size, minimum)
 *   - images without alt, buttons/links without an accessible name, form fields without a label
 *   - JavaScript exceptions and console errors
 *
 * Needs the dev server and backend running.
 *   npm run audit:responsive                      (screenshots go to a temp folder)
 *   npm run audit:responsive -- --out ./qa-output --widths 375,1440 --only operator
 * Environment: APP_URL (default http://localhost:5173), API_URL (default http://127.0.0.1:8000),
 *   STUDENT_LOGIN / OPERATOR_LOGIN / DEMO_PASSWORD to use other accounts, CHROME_PATH.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { launchChrome } from "./lib/cdp.mjs";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const APP = (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
const API = (process.env.API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const OUT = resolve(arg("out", join(tmpdir(), `jnuverse-qa-${Date.now()}`)));
const WIDTHS = arg("widths", "375,768,1024,1440").split(",").map(Number);
const ONLY = arg("only", "");
const PASSWORD = process.env.DEMO_PASSWORD || "Demo-Pass-12345";
const STUDENT = process.env.STUDENT_LOGIN || "demo1@demo.jnuverse.test";
const OPERATOR = process.env.OPERATOR_LOGIN || "democlub1@demo.jnuverse.test";

async function login(identifier) {
  const res = await fetch(`${API}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed for ${identifier}: ${res.status}`);
  return res.json();
}

async function apiGet(path, token) {
  const res = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.json();
}

// ---- Accounts and route ids (read-only) ----
const student = await login(STUDENT);
const operator = await login(OPERATOR);
const slug = operator.user.club?.slug || (await apiGet("/api/auth/me/", operator.access)).club.slug;
const mine = await apiGet("/api/events/?mine=true&page_size=50", operator.access);
const events = mine.results || [];
const ended = events.find((e) => e.status === "published" && e.is_completed) || events[0];
const upcoming = events.find((e) => e.status === "published" && !e.is_completed) || events[0];

const ROUTES = {
  visitor: ["/login", "/operator/login", "/register", "/register/club", "/clubs", `/clubs/${slug}`, "/events", `/events/${ended.id}`, "/no-such-page"],
  student: ["/", "/profile", "/my-clubs", "/my-activity", "/my-reports", "/notifications", "/events?tab=registered", `/clubs/${slug}`, `/events/${ended.id}`],
  operator: [
    "/",
    "/operator/members",
    "/operator/events",
    "/operator/events/new",
    `/operator/events/${upcoming.id}/edit`,
    `/operator/events/${ended.id}/attendees`,
    `/operator/events/${ended.id}/analytics`,
    "/operator/analytics",
    "/operator/notices",
    "/operator/collaborations",
    `/clubs/${slug}`,
    "/my-reports",
  ],
};
const SESSIONS = {
  visitor: null,
  student: { access_token: student.access, refresh_token: student.refresh, user: JSON.stringify(student.user) },
  operator: { access_token: operator.access, refresh_token: operator.refresh, user: JSON.stringify(operator.user) },
};

// ---- In-page checks ----
const CHECK = `(() => {
  const vw = window.innerWidth;
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
  const inScroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const ox = getComputedStyle(p).overflowX; if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true; } return false; };
  const label = (el) => (el.getAttribute("aria-label") || el.textContent || el.title || el.getAttribute("alt") || "").trim().replace(/\\s+/g, " ").slice(0, 40);
  const describe = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (label(el) ? ' "' + label(el) + '"' : "");

  const pageOverflow = document.documentElement.scrollWidth - vw;
  const sticking = [...document.querySelectorAll("body *")]
    .filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1 && !inScroller(el))
    .filter((el) => ![...el.children].some((c) => c.getBoundingClientRect().right > vw + 1)) // innermost only
    .slice(0, 6).map(describe);

  const interactive = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [tabindex]:not([tabindex='-1'])")].filter(visible);
  const smallTargets = vw <= 400 ? interactive.filter((el) => {
    // WCAG 2.5.8 exceptions: a checkbox/radio whose label is also clickable, and links inside a sentence
    if (el.matches("input[type=checkbox], input[type=radio]") && (el.closest("label") || (el.id && document.querySelector('label[for="' + el.id + '"]')))) return false;
    if (el.tagName === "A" && [...el.parentElement.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2)) return false;
    const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24; }).map(describe) : [];

  const noAlt = [...document.querySelectorAll("img")].filter((i) => visible(i) && !i.hasAttribute("alt")).map((i) => i.src.split("/").pop().slice(0, 40));
  const unnamed = [...document.querySelectorAll("a[href], button, [role=button]")].filter((el) => visible(el) && !label(el) && !el.getAttribute("aria-labelledby")).map(describe);
  const unlabeled = [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")].filter((el) => {
    if (!visible(el) && el.type !== "file") return false;
    if (el.type === "file") return false; // hidden file inputs are triggered by labelled buttons
    return !(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.closest("label") || (el.id && document.querySelector('label[for="' + el.id + '"]')));
  }).map((el) => describe(el) + (el.placeholder ? ' placeholder="' + el.placeholder.slice(0, 30) + '"' : ""));
  const crashed = document.body.innerText.includes("Something went wrong on this page");
  return { pageOverflow, sticking, smallTargets, noAlt, unnamed, unlabeled, crashed, title: document.title };
})()`;

// Wait until the page has really rendered: no loading text, and the height stable for 3 polls.
// (Protected pages check the session, load their chunk and call the API before showing content.)
const LOADING = /Checking authentication|Loading page|Loading your|Loading club|Loading event|Loading analytics|Retrieving|Loading\.\.\./i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForReady(maxMs = 15000) {
  let last = -1;
  let stable = 0;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const { text, height, busy } = await page.eval(
      "({ text: document.body.innerText.slice(0, 4000), height: document.documentElement.scrollHeight, busy: !!document.querySelector('[aria-busy=true], [aria-label^=\"Loading\"]') })"
    );
    const loading = LOADING.test(text) || busy;
    stable = !loading && height === last ? stable + 1 : 0;
    if (stable >= 3) return Date.now() - start;
    last = height;
    await sleep(250);
  }
  return -1; // timed out — recorded in the report
}

// ---- Run ----
mkdirSync(OUT, { recursive: true });
const { page, close } = await launchChrome({ port: 9335 });
const errors = [];
page.on((e) => {
  if (e.method === "Runtime.exceptionThrown") errors.push(e.params.exceptionDetails?.exception?.description?.split("\n")[0] || "exception");
  if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error")
    errors.push(e.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 160));
});

const results = [];
try {
  for (const [role, routes] of Object.entries(ROUTES)) {
    if (ONLY && ONLY !== role) continue;
    await page.goto(`${APP}/login`, 1000);
    await page.clearStorage();
    if (SESSIONS[role]) await page.setLocalStorage(SESSIONS[role]);
    for (const width of WIDTHS) {
      await page.setViewport(width, 900);
      for (const route of routes) {
        errors.length = 0;
        const file = `${role}_${width}_${route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}.png`;
        try {
          await page.goto(`${APP}${route}`, 300);
          const readyMs = await waitForReady();
          const check = await page.eval(CHECK);
          await page.screenshot(join(OUT, file));
          results.push({ role, width, route, file, readyMs, finalPath: await page.path(), errors: [...new Set(errors)], ...check });
          process.stdout.write(".");
        } catch (e) {
          // A stuck screen is recorded as a failure; the rest of the audit still runs
          const empty = { pageOverflow: 0, sticking: [], smallTargets: [], noAlt: [], unnamed: [], unlabeled: [] };
          results.push({ role, width, route, file, readyMs: -1, finalPath: route, errors: [`audit step failed: ${e.message}`], ...empty });
          process.stdout.write("x");
        }
      }
    }
  }
} finally {
  await close();
}

// ---- Report ----
const issues = (r) =>
  (r.pageOverflow > 1 ? 1 : 0) + r.sticking.length + r.smallTargets.length + r.noAlt.length + r.unnamed.length + r.unlabeled.length + r.errors.length + (r.crashed ? 1 : 0);
writeFileSync(join(OUT, "report.json"), JSON.stringify(results, null, 2));
const lines = [`# Responsive & accessibility audit\n`, `Screens: ${results.length} · output: ${OUT}\n`, "| Role | Width | Route | Overflow px | Sticking out | Small targets | No alt | Unnamed | Unlabelled | Errors |", "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|"];
for (const r of results) {
  lines.push(`| ${r.role} | ${r.width} | ${r.route}${r.finalPath !== r.route ? ` → ${r.finalPath}` : ""}${r.readyMs < 0 ? " (not ready after 15 s)" : ""} | ${Math.max(0, r.pageOverflow)} | ${r.sticking.length} | ${r.smallTargets.length} | ${r.noAlt.length} | ${r.unnamed.length} | ${r.unlabeled.length} | ${r.errors.length}${r.crashed ? " (crash)" : ""} |`);
}
writeFileSync(join(OUT, "report.md"), lines.join("\n") + "\n");
const flagged = results.filter((r) => issues(r) > 0);
console.log(`\n${results.length} screens · ${flagged.length} with findings · report: ${join(OUT, "report.md")}`);
process.exit(0);
