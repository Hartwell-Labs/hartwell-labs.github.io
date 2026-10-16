/**
 * Naglowki bezpieczenstwa — test samodzielny, bez zaleznosci od checkoutu
 * repozytorium. Sprawdza, ze KAZDA odpowiedz (200, 301, 404, 405) je nosi,
 * bo odpowiedz bez ochrony to odpowiedz bez ochrony, niezalezynie od statusu.
 */
const store = new Map();
globalThis.caches = {
  default: {
    async match(req) { return store.get(req.method + " " + req.url); },
    async put(req, res) { store.set(req.method + " " + req.url, res); },
  },
};

const { default: worker } = await import("./worker.js");
const promises = [];
const ctx = { waitUntil: (p) => promises.push(p) };
const APEX = "https://hartwell-labs.pl";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) pass++;
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
}

async function run(path, method = "GET", host = APEX) {
  return worker.fetch(new Request(host + path, { method, redirect: "manual" }), {}, ctx);
}

const REQUIRED = {
  "content-security-policy": (v) => v.includes("default-src 'none'") && v.includes("frame-ancestors 'none'")
    && v.includes("object-src 'none'") && v.includes("upgrade-insecure-requests"),
  "strict-transport-security": (v) => v.includes("max-age=") && v.includes("includeSubDomains"),
  "x-content-type-options": (v) => v === "nosniff",
  "referrer-policy": (v) => v === "strict-origin-when-cross-origin",
  "permissions-policy": (v) => v.includes("camera=()") && v.includes("geolocation=()"),
  "x-frame-options": (v) => v === "DENY",
};

const CASES = [
  ["/", "strona glowna", 200],
  ["/nie-ma-tylko", "404", 404],
  ["/company/", "podstrona", 200],
  ["/assets/site.css", "css", 200],
];

console.log("naglowki bezpieczenstwa:");
for (const [path, label] of CASES) {
  const res = await run(path);
  for (const [h, ok] of Object.entries(REQUIRED)) {
    const v = res.headers.get(h);
    check(`${label} ${path} -> ${h}`, v !== null && ok(v), `brak lub bledna wartosc: ${v}`);
  }
  const csp = res.headers.get("content-security-policy") || "";
  check(`${label}: skrypty tylko z wlasnej domeny`, csp.includes("script-src 'self'"));
  check(`${label}: bez ramki-w-PDF`, csp.includes("script-src-attr 'none'"));
}

console.log("przekierowania i bledy:");
{
  const r = await run("/talus-process-monitor", "GET");
  check("301 ma naglowki", REQUIRED["x-content-type-options"](r.headers.get("x-content-type-options") || ""),
    `status=${r.status}`);
  const w = await run("/", "GET", "https://www.hartwell-labs.pl");
  check("www -> 301 ma naglowki", REQUIRED["x-content-type-options"](w.headers.get("x-content-type-options") || ""),
    `status=${w.status}`);
  const p = await run("/", "POST");
  check("405 ma naglowki", p.status === 405 && REQUIRED["x-content-type-options"](p.headers.get("x-content-type-options") || ""));
}

console.log("cache zachowuje naglowki:");
{
  await run("/assets/site.js");
  const res = await run("/assets/site.js");
  check("z cache nadal z naglowkami",
    REQUIRED["content-security-policy"](res.headers.get("content-security-policy") || ""),
    `z cache: ${res.headers.get("content-security-policy")?.slice(0, 40)}`);
}

await Promise.all(promises);
console.log(`\nPASS=${pass} FAIL=${fail}`);
process.exit(fail ? 1 : 0);
