const store = new Map();
globalThis.caches = {
  default: {
    async match(req) {
      return store.get(req.method + " " + req.url);
    },
    async put(req, res) {
      store.set(req.method + " " + req.url, res);
    },
  },
};

const { default: worker } = await import("./worker.js");
const ctx = { waitUntil: (p) => promises.push(p) };
const promises = [];

const APEX = "https://hartwell-labs.pl";
let pass = 0, fail = 0;

function check(name, cond, extra = "") {
  if (cond) { pass++; }
  else { fail++; console.log(`FAIL ${name} ${extra}`); }
}

async function run(path, method = "GET", host = APEX) {
  const req = new Request(host + path, { method, redirect: "manual" });
  const res = await worker.fetch(req, {}, ctx);
  return res;
}

// 1) wszystkie URL-e ze sitemapu -> 200 + zgodnosc trescia z repo
import { readFileSync, existsSync } from "node:fs";
const sm = readFileSync("/tmp/opencode/site/sitemap.xml", "utf8");
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`sitemap URLs: ${locs.length}`);

for (const loc of locs) {
  const u = new URL(loc);
  const res = await run(u.pathname);
  let body = "";
  if (res.status === 200) body = await res.text();
  let file = "/tmp/opencode/site" + u.pathname;
  if (u.pathname.endsWith("/")) file += "index.html";
  const expect = existsSync(file) ? readFileSync(file, "utf8") : null;
  check(
    `${u.pathname} status=${res.status}`,
    res.status === 200 && expect !== null && body === expect,
    `status=${res.status} match=${body === expect}`
  );
}

// 2) specjaly
const r1 = await run("/company");
check("/company -> 200 company.html", r1.status === 200 && (await r1.text()) === readFileSync("/tmp/opencode/site/company.html", "utf8"));

const r2 = await run("/talus-process-monitor");
check("/talus-process-monitor -> 301 slash", r2.status === 301 && r2.headers.get("location") === APEX + "/talus-process-monitor/", `got ${r2.status} ${r2.headers.get("location")}`);

const r3 = await run("/nie-ma");
check("/nie-ma -> 404", r3.status === 404);

const r4 = await run("/", "GET", "https://www.hartwell-labs.pl");
check("www -> 301 apex", r4.status === 301 && r4.headers.get("location") === APEX + "/", `got ${r4.status} ${r4.headers.get("location")}`);

const r5 = await run("/assets/site.css");
check("/assets/site.css 200 css", r5.status === 200 && (r5.headers.get("content-type") || "").startsWith("text/css"));

const r6 = await run("/sitemap.xml");
check("/sitemap.xml xml", r6.status === 200 && (r6.headers.get("content-type") || "").includes("xml"));

const r7 = await run("/talus-process-monitor/", "HEAD");
check("HEAD 200", r7.status === 200 && r7.headers.get("content-type").includes("text/html"));

const r8 = await run("/talus-process-monitor/", "POST");
check("POST 405", r8.status === 405);

// 3) cache: drugi identyczny GET z cache
const r9 = await run("/llms.txt");
const r9b = await run("/llms.txt");
check("cache zwraca tresc", r9.status === 200 && r9b.status === 200 && (await r9b.text()) === readFileSync("/tmp/opencode/site/llms.txt", "utf8"));

await Promise.all(promises);
console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail ? 1 : 0);
