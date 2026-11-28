#!/usr/bin/env node
/**
 * Role-permission matrix — Week 9 Stage 7 (read-only, no dependencies)
 *
 * Calls every GET operation the frontend uses as four identities — visitor, student, the club's own
 * operator and another club's operator — and checks the status code against what the frontend expects
 * (which screens it shows to whom). Only GET requests are sent, plus the logins.
 *
 *   npm run audit:roles
 * Environment: API_URL, STUDENT_LOGIN, OPERATOR_LOGIN, OTHER_OPERATOR_LOGIN, DEMO_PASSWORD.
 */
const API = (process.env.API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const PASSWORD = process.env.DEMO_PASSWORD || "Demo-Pass-12345";
const LOGINS = {
  student: process.env.STUDENT_LOGIN || "demo1@demo.jnuverse.test",
  operator: process.env.OPERATOR_LOGIN || "democlub1@demo.jnuverse.test",
  other: process.env.OTHER_OPERATOR_LOGIN || "democlub2@demo.jnuverse.test",
};

async function login(identifier) {
  const res = await fetch(`${API}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed for ${identifier} (${res.status})`);
  return res.json();
}
const get = async (path, token) => {
  const res = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, body: res.headers.get("content-type")?.includes("json") ? await res.json() : null };
};

const tokens = { visitor: null };
const sessions = {};
for (const [who, id] of Object.entries(LOGINS)) {
  sessions[who] = await login(id);
  tokens[who] = sessions[who].access;
}
const slug = sessions.operator.user.club.slug;

// An event of the operator's club that has ended and has registrations (for event-level reports)
const myClub = await get("/api/analytics/my-club/", tokens.operator);
const event = myClub.body.events.find((e) => e.is_completed && e.registered > 0) || myClub.body.events[0];
if (!event) throw new Error("The operator's club has no events to check");
const ev = event.id;

// [path, visitor, student, own operator, other operator] — "-" = not checked
const MATRIX = [
  ["/api/auth/me/", 401, 200, 200, 200],
  ["/api/auth/me/interests/", 401, 200, 403, 403],
  ["/api/auth/interests/", 200, 200, 200, 200],
  ["/api/auth/departments/", 200, 200, 200, 200],
  ["/api/clubs/", 200, 200, 200, 200],
  ["/api/clubs/?joined=true", 401, 200, 403, 403],
  ["/api/clubs/?following=true", 401, 200, 403, 403],
  [`/api/clubs/${slug}/`, 200, 200, 200, 200],
  [`/api/clubs/${slug}/membership/`, 401, 200, 403, 403],
  [`/api/clubs/${slug}/members/`, 401, 403, 200, 403],
  [`/api/clubs/${slug}/membership-requests/`, 401, 403, 200, 403],
  [`/api/clubs/${slug}/partners/`, 200, 200, 200, 200],
  ["/api/events/", 200, 200, 200, 200],
  ["/api/events/?registered=true", 401, 200, 403, 403],
  [`/api/events/${ev}/`, 200, 200, 200, 200],
  [`/api/events/${ev}/registrations/`, 401, 403, 200, 403],
  [`/api/events/${ev}/rating/`, 401, 200, 403, 403],
  [`/api/events/${ev}/rating-summary/`, 401, 403, 200, 403],
  ["/api/notices/", 200, 200, 200, 200],
  ["/api/notifications/", 401, 200, 200, 200],
  ["/api/notifications/unread-count/", 401, 200, 200, 200],
  ["/api/collaborations/", 401, 403, 200, 200],
  ["/api/reports/", 401, 200, 200, 200],
  ["/api/dashboard/student/", 401, 200, 403, 403],
  ["/api/dashboard/club/", 401, 403, 200, 200],
  ["/api/analytics/student-activity/", 401, 200, 403, 403],
  ["/api/analytics/my-club/", 401, 403, 200, 200],
  ["/api/analytics/club-comparison/", 401, 403, 200, 200],
  [`/api/analytics/events/${ev}/department-participation/`, 401, 403, 200, 403],
  [`/api/analytics/events/${ev}/ratings/`, 401, 403, 200, 403],
];
const WHO = ["visitor", "student", "operator", "other"];

let checks = 0;
let failed = 0;
console.log(`Role matrix against ${API} — club "${slug}", event "${event.title}"\n`);
for (const [path, ...expected] of MATRIX) {
  const cells = [];
  for (let i = 0; i < WHO.length; i += 1) {
    if (expected[i] === "-") continue;
    const { status } = await get(path, tokens[WHO[i]]);
    checks += 1;
    const ok = status === expected[i];
    if (!ok) failed += 1;
    cells.push(`${WHO[i]} ${status}${ok ? "" : ` (expected ${expected[i]})`}`);
  }
  const bad = cells.some((c) => c.includes("expected"));
  console.log(`${bad ? "FAIL" : "PASS"}  ${path.replace(ev, "{event}").replace(slug, "{slug}")}  — ${cells.join(", ")}`);
}
console.log(`\n${checks - failed}/${checks} checks passed (${MATRIX.length} operations × 4 identities)`);
process.exit(failed ? 1 : 0);
