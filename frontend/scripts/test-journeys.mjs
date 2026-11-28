#!/usr/bin/env node
/**
 * End-to-end journeys in headless Chrome — Week 9 Stage 5 (read-only, no dependencies)
 *
 * Logs in through the real login forms and walks the visitor, student and operator journeys,
 * checking that each screen shows what the API returns for the same account (UI ↔ backend agreement).
 * Only reads data (plus the login requests themselves).
 *
 * Needs the dev server and backend running.
 *   npm run test:journeys
 * Environment: APP_URL, API_URL, STUDENT_LOGIN, OPERATOR_LOGIN, DEMO_PASSWORD, CHROME_PATH.
 */
import { launchChrome } from "./lib/cdp.mjs";

const APP = (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
const API = (process.env.API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const PASSWORD = process.env.DEMO_PASSWORD || "Demo-Pass-12345";
const STUDENT = process.env.STUDENT_LOGIN || "demo1@demo.jnuverse.test";
const OPERATOR = process.env.OPERATOR_LOGIN || "democlub1@demo.jnuverse.test";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- API side (expected values) ----
async function apiLogin(identifier) {
  const res = await fetch(`${API}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`API login failed for ${identifier}`);
  return res.json();
}
const apiGet = (path, token) =>
  fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json());

// ---- Browser helpers ----
const { page, close } = await launchChrome({ port: 9339 });
const results = [];
const check = (journey, name, pass, detail = "") => {
  results.push({ journey, name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  [${journey}] ${name}${detail ? `  (${detail})` : ""}`);
};
const text = () => page.text();
async function waitFor(predicate, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate(await text())) return true;
    await sleep(300);
  }
  return false;
}
const waitForText = (needle, timeoutMs) => waitFor((t) => t.toLowerCase().includes(String(needle).toLowerCase()), timeoutMs);
async function open(path, readyText) {
  await page.goto(`${APP}${path}`, 300);
  return readyText ? waitForText(readyText) : true;
}
// Number shown right after a label (labels may be CSS-uppercased in innerText)
async function numberAfter(label) {
  const t = await text();
  const m = t.match(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\n?\\s*★?\\s*([\\d.,]+)", "i"));
  return m ? m[1].replace(/,/g, "") : null;
}
async function loginThroughForm(path, identifier) {
  await page.goto(`${APP}${path}`, 500);
  await page.clearStorage();
  await page.goto(`${APP}${path}`, 300);
  await waitFor(() => page.eval("document.querySelectorAll('input[type=password]').length > 0"));
  await page.eval(`(() => {
    const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
    const inputs = [...document.querySelectorAll("form input")];
    set(inputs.find((i) => i.type !== "password" && i.type !== "checkbox"), ${JSON.stringify(identifier)});
    set(inputs.find((i) => i.type === "password"), ${JSON.stringify(PASSWORD)});
    document.querySelector("form").requestSubmit();
  })()`);
  const start = Date.now();
  while (Date.now() - start < 25000 && (await page.path()).includes("login")) await sleep(300);
  return page.path();
}

try {
  await page.setViewport(1440, 900);
  const student = await apiLogin(STUDENT);
  const operator = await apiLogin(OPERATOR);
  const slug = operator.user.club.slug;

  // ================= Visitor =================
  {
    const J = "visitor";
    const clubs = await apiGet("/api/clubs/?page_size=50");
    await page.clearStorage();
    check(J, "Explore Clubs lists the backend's clubs", await open("/clubs", clubs.results[0].name), clubs.results[0].name);
    const club = await apiGet(`/api/clubs/${slug}/`);
    const opened = await open(`/clubs/${slug}`, club.name);
    check(J, "Club profile shows the club", opened && !(await text()).includes("Edit Profile"), club.name);
    const reportButtons = await page.eval("[...document.querySelectorAll('button')].filter(b => b.textContent.trim().endsWith('Report')).length");
    check(J, "No Report button for logged-out visitors", reportButtons === 0, `${reportButtons} found`);
    const evs = await apiGet("/api/events/?upcoming=true&page_size=5");
    const ev = evs.results.find((e) => e.status === "published");
    if (ev) {
      await open(`/events/${ev.id}`, ev.title);
      check(J, "Event page asks visitors to log in to register", /log ?in to register|sign in to register|login to register/i.test(await text()), ev.title);
    }
  }

  // ================= Student =================
  {
    const J = "student";
    const landed = await loginThroughForm("/login", STUDENT);
    check(J, "Login form signs in and leaves the login page", !landed.includes("login"), landed);
    const dash = await apiGet("/api/dashboard/student/", student.access);
    await open("/", "Find your community.");
    let t = await text();
    check(J, "Dashboard shows the Stitch sections", t.includes("Your communities.") && t.includes("Find your community."));
    if (dash.counts.events_to_rate > 0) check(J, "Rating prompts badge matches events_to_rate", t.includes(`${dash.counts.events_to_rate} to rate`), `${dash.counts.events_to_rate}`);
    if (dash.counts.events_registered_upcoming > 0)
      check(J, "Upcoming badge matches events_registered_upcoming", t.includes(`${dash.counts.events_registered_upcoming} registered`), `${dash.counts.events_registered_upcoming}`);
    if (dash.next_events[0]) check(J, "Next event shown on the dashboard", t.includes(dash.next_events[0].title), dash.next_events[0].title);
    const unread = (await apiGet("/api/notifications/unread-count/", student.access)).unread_count;
    const bell = await page.eval("[...document.querySelectorAll('button')].map(b => b.getAttribute('aria-label') || '').find(l => /notification/i.test(l)) || ''");
    check(J, "Notification bell matches unread-count", bell.includes(String(unread)) || (unread === 0 && !/\d/.test(bell)), `${unread} — "${bell}"`);

    const joined = await apiGet("/api/clubs/?joined=true&page_size=50", student.access);
    await open("/my-clubs", joined.results[0]?.name || "My Clubs");
    t = await text();
    check(J, "My Clubs lists every joined club", joined.results.every((c) => t.includes(c.name)), joined.results.map((c) => c.name).join(", "));

    const activity = await apiGet("/api/analytics/student-activity/", student.access);
    await open("/my-activity", "Activity score"); // the heading renders before the data; wait for the figure
    check(J, "My Activity shows the API activity score", (await numberAfter("Activity score")) === String(activity.activity_score), `${activity.activity_score}`);

    const regs = await apiGet("/api/events/?registered=true&page_size=12", student.access);
    await open("/events?tab=registered", regs.results[0]?.title || "My Registrations");
    t = await text();
    check(J, "My Registrations lists the registered events", regs.results.slice(0, 3).every((e) => t.includes(e.title)), `${regs.count} registered`);

    const reports = await apiGet("/api/reports/?page_size=50", student.access);
    await open("/my-reports", reports.count > 0 ? "Activity Log" : "No reports to display.");
    t = await text();
    check(J, "My Reports shows the report count", reports.count === 0 ? t.includes("No reports to display.") : t.includes(`${reports.count} Record`), `${reports.count}`);

    const interests = (await apiGet("/api/auth/me/interests/", student.access)).interests.map((i) => i.name).sort();
    await open("/profile", "Your Interests");
    await waitFor(() => page.eval("document.querySelectorAll('[role=group] button').length > 0"));
    const pressed = (await page.eval("[...document.querySelectorAll('[role=group] button[aria-pressed=true]')].map(b => b.textContent.replace('check','').trim())")).sort();
    check(J, "Profile shows the saved interests as selected", JSON.stringify(pressed) === JSON.stringify(interests), interests.join(", "));
  }

  // ================= Operator =================
  {
    const J = "operator";
    const landed = await loginThroughForm("/operator/login", OPERATOR);
    check(J, "Operator login form signs in to the operator area", landed.startsWith("/operator") || landed === "/", landed);
    const dash = await apiGet("/api/dashboard/club/", operator.access);
    await open("/", "Membership Requests");
    check(J, "Dashboard Approved Members matches counts.members", (await numberAfter("Approved Members")) === String(dash.counts.members), `${dash.counts.members}`);
    check(J, "Dashboard Pending Requests matches counts", (await numberAfter("Pending Requests")) === String(dash.counts.pending_membership_requests), `${dash.counts.pending_membership_requests}`);
    const pending = await apiGet(`/api/clubs/${slug}/membership-requests/?page_size=50`, operator.access);
    let t = await text();
    check(J, "Dashboard lists the pending requests", pending.results.slice(0, 5).every((r) => t.includes(r.name)), pending.results.map((r) => r.name).join(", ") || "none");

    await open("/operator/members", pending.results[0]?.name || "Members");
    t = await text();
    const members = await apiGet(`/api/clubs/${slug}/members/?page_size=50`, operator.access);
    check(J, "Members page lists approved members", members.results.every((m) => t.includes(m.name)), `${members.count} members`);

    const my = await apiGet("/api/analytics/my-club/", operator.access);
    await open("/operator/analytics", "Your club's performance");
    check(J, "Analytics: events launched matches the report", (await numberAfter("Events launched")) === String(my.summary.events_launched), `${my.summary.events_launched}`);
    if (my.best_rated_event) check(J, "Analytics: best-rated event shown", (await text()).includes(my.best_rated_event.title), my.best_rated_event.title);

    const ended = my.events.find((e) => e.is_completed && e.registered > 0);
    if (ended) {
      const dept = await apiGet(`/api/analytics/events/${ended.id}/department-participation/`, operator.access);
      await open(`/operator/events/${ended.id}/analytics`, "Department-wise participation");
      t = await text();
      check(J, "Event report: departments match the API", dept.departments.every((d) => t.includes(d.department)), dept.departments.map((d) => d.department).join(", "));
      check(J, "Event report: registered total matches", (await numberAfter("Registered")) === String(dept.totals.registered), `${dept.totals.registered}`);
    }

    const collabs = await apiGet("/api/collaborations/?box=received&page_size=20", operator.access);
    await open("/operator/collaborations", collabs.results[0]?.title || "Collaboration");
    t = await text();
    check(J, "Collaborations lists the latest received request", !collabs.results[0] || t.includes(collabs.results[0].title), collabs.results[0]?.title || "none");

    const notices = await apiGet("/api/notices/?mine=true&page_size=10", operator.access);
    await open("/operator/notices", notices.results[0]?.title || "Notice");
    t = await text();
    check(J, "Notices lists the club's notices", notices.results.slice(0, 3).every((n) => t.includes(n.title)), `${notices.count} notices`);
  }
} finally {
  await close();
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
