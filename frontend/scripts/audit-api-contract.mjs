#!/usr/bin/env node
/**
 * API contract audit — Week 9 Stage 1
 *
 * Compares every API call in frontend/src with docs/api/openapi.yml (no dependencies, read-only).
 *   node scripts/audit-api-contract.mjs            (from frontend/)
 *
 * Reports:
 *   1. Frontend calls whose path is not in the spec
 *   2. Frontend calls whose method the spec does not allow for that path
 *   3. Frontend calls without a trailing slash (every backend path ends with "/")
 *   4. Spec operations no frontend code calls
 * Exit code 1 when 1–3 find anything.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(here, "..");
const SPEC = join(FRONTEND, "..", "docs", "api", "openapi.yml");
const METHODS = ["get", "post", "put", "patch", "delete"];

// ---- 1. Spec operations (paths are 2-space keys, methods 4-space keys) ----
const spec = new Map(); // path -> Set(methods)
let currentPath = null;
for (const line of readFileSync(SPEC, "utf8").split("\n")) {
  const p = line.match(/^ {2}(\/api\/[^:]*):\s*$/);
  if (p) {
    currentPath = p[1];
    spec.set(currentPath, new Set());
    continue;
  }
  const m = line.match(/^ {4}(get|post|put|patch|delete):\s*$/);
  if (m && currentPath) spec.get(currentPath).add(m[1]);
  if (/^\S/.test(line)) currentPath = null;
}
const specPatterns = [...spec.keys()].map((path) => ({
  path,
  regex: new RegExp("^" + path.replace(/\{[^}]+\}/g, "[^/]+") + "$"),
}));

// ---- 2. Frontend calls ----
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(jsx?|mjs)$/.test(name) ? [full] : [];
  });
}

const CALL_PATTERNS = [
  // api.get("/api/..."), api.post(`/api/...`), axios.post(`${API_BASE_URL}/api/...`)
  { re: /\b(?:api|axios)\.(get|post|put|patch|delete)\(\s*(["'`])((?:\$\{API_BASE_URL\})?\/api\/[^"'`]*)\2/g, method: (m) => m[1], url: (m) => m[3] },
  // fetchAllPages("/api/...") is always GET
  { re: /\bfetchAllPages\(\s*(["'`])(\/api\/[^"'`]*)\1/g, method: () => "get", url: (m) => m[2] },
  // putImage(`/api/...`, field, file) is always PUT
  { re: /\bputImage\(\s*(["'`])(\/api\/[^"'`]*)\1/g, method: () => "put", url: (m) => m[2] },
];

const calls = [];
for (const file of walk(join(FRONTEND, "src"))) {
  const text = readFileSync(file, "utf8");
  for (const { re, method, url } of CALL_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const raw = url(m).replace("${API_BASE_URL}", "");
      const path = raw
        .split("?")[0]
        .replace(/\$\{[^}]+\}/g, "{x}"); // template expressions become one path segment
      const line = text.slice(0, m.index).split("\n").length;
      calls.push({ method: method(m), raw, path, where: `${relative(FRONTEND, file)}:${line}` });
    }
  }
}

// ---- 3. Compare ----
const matchSpec = (path) => specPatterns.filter((s) => s.regex.test(path.replace(/\{x\}/g, "X")));
const unknownPath = [];
const wrongMethod = [];
const noSlash = [];
const used = new Set();

for (const c of calls) {
  if (!c.path.endsWith("/")) noSlash.push(c);
  const matches = matchSpec(c.path.endsWith("/") ? c.path : `${c.path}/`);
  if (matches.length === 0) {
    unknownPath.push(c);
    continue;
  }
  const allowed = matches.filter((s) => spec.get(s.path).has(c.method));
  if (allowed.length === 0) wrongMethod.push({ ...c, allowed: matches.map((s) => [...spec.get(s.path)].join("/")) });
  allowed.forEach((s) => used.add(`${c.method.toUpperCase()} ${s.path}`));
}

const allOps = [...spec.entries()].flatMap(([path, ms]) => [...ms].map((m) => `${m.toUpperCase()} ${path}`));
const unusedOps = allOps.filter((op) => !used.has(op));

// ---- 4. Report ----
const fmt = (c) => `  ${c.method.toUpperCase().padEnd(6)} ${c.raw.padEnd(58)} ${c.where}`;
console.log(`Spec: ${spec.size} paths, ${allOps.length} operations · Frontend: ${calls.length} call sites, ${used.size} operations used\n`);
console.log(`1. Calls to paths not in the spec: ${unknownPath.length}`);
unknownPath.forEach((c) => console.log(fmt(c)));
console.log(`\n2. Calls with a method the spec does not allow: ${wrongMethod.length}`);
wrongMethod.forEach((c) => console.log(`${fmt(c)}  (spec allows ${c.allowed.join(", ")})`));
console.log(`\n3. Calls without a trailing slash: ${noSlash.length}`);
noSlash.forEach((c) => console.log(fmt(c)));
console.log(`\n4. Spec operations not called by the frontend: ${unusedOps.length}`);
unusedOps.forEach((op) => console.log(`  ${op}`));

process.exit(unknownPath.length + wrongMethod.length + noSlash.length > 0 ? 1 : 0);
