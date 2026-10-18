/**
 * hartwell-site — cienki proxy przed GitHub Pages.
 *
 * Ten plik robi dwie rzeczy: serwuje pliki z raw.githubusercontent.com i —
 * co wazniejsze — dowozi naglowki bezpieczenstwa na kazda odpowiedz.
 * Przed zmiana strona firmy bezpieczenstwa nie miala zadnego CSP, HSTS ani
 * nosniff, co na domenie takiej jak ta jest pierwsza rzecz, na ktora patrzy
 * kazdy analityk i kazdy skaner reputacyjny.
 *
 * CSP jest celowo restrykcyjny: skrypt tylko z wlasnej domeny, zadne ramki,
 * zadna zawosc osadzana. Jedyne wyjatki to Google Fonts i Cloudflare
 * Insights, bo bez nich strona wyglada inaczej niz powinna.
 */
const RAW_BASE = "https://raw.githubusercontent.com/Hartwell-Labs/hartwell-labs.github.io/main";
const APEX = "hartwell-labs.pl";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".markdown": "text/markdown; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

function extOf(p) {
  const last = p.split("/").pop();
  const i = last.lastIndexOf(".");
  return i >= 0 ? last.slice(i).toLowerCase() : "";
}

function typeFor(p) {
  return TYPES[extOf(p)] || "application/octet-stream";
}

/* ------------------------------------------------------------ naglowki
   Budujemy je raz i doklejamy do kazdej odpowiedzi — takze 404 i
   przekierowania. Pominieta odpowiedz to odpowiedz bez ochrony, a 404
   na domenie firmy bezpieczenstwa to najgorszy mozliwy komunikat. */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self' https://static.cloudflareinsights.com",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = {
  "content-security-policy": CSP,
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()",
  "cross-origin-opener-policy": "same-origin",
  "x-frame-options": "DENY",
};

function secure(res) {
  if (res.headers.get("content-security-policy")) return res;
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function notFound() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>404 &middot; Hartwell Labs</title>
<meta name="theme-color" content="#0a0e14">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
<link rel="manifest" href="/assets/site.webmanifest">
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
 background:#0b0d12;color:#d7dce5;font:16px/1.6 ui-sans-serif,system-ui,sans-serif}
main{text-align:center;padding:40px}
h1{font-size:64px;margin:0;color:#7aa2f7}
p{color:#8b93a7}
a{color:#7aa2f7}
</style>
</head>
<body>
<main>
<h1>404</h1>
<p>The page you requested does not exist.</p>
<p><a href="/">Back to hartwell-labs.pl</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=120" },
  });
}

// Outbound fetches to raw.githubusercontent are cached by the edge under
// raw's own max-age, and a zone purge does not reach them — so a commit could
// sit unpublished for however long that TTL was. BUILD_ID is evaluated once
// per deploy, which puts a fresh value in the subrequest URL and makes every
// deploy take effect on the first request instead of after the cache lapses.
const BUILD_ID = Date.now().toString(36);

/**
 * Product documentation lives in the product's own repository, not in the site
 * repository. Eleven of them publish GitHub Pages, each already configured with
 * the custom domain of its product page — so Pages was serving
 * hartwell-labs.pl/<slug>/<path> and this worker answered 404 in front of it,
 * because it only ever looked in the site repository.
 *
 * TEST_REPORT.md, EULA.txt, AUDIT-VERIFY-FP-DIAGNOSIS.md: written, published,
 * unreachable. This maps a path prefix onto the repository that actually holds
 * it, so the address the repos were already configured for resolves.
 *
 * The site repository still wins wherever both have a file: a product's page on
 * this site is a landing page, and it should keep being served from one place.
 */
const PRODUCT_PAGES = {
  "talus-process-monitor": ["talus-process-monitor", "master", "docs"],
  "externum": ["externum", "main", ""],
  "Aurora": ["Aurora", "main", ""],
  "CyberForge": ["CyberForge", "main", ""],
  "fortis": ["fortis", "master", ""],
  "linux-aegis": ["linux-aegis", "main", ""],
  "products": ["products", "main", ""],
  "labbridge": ["labbridge", "main", ""],
  "quantum-shield": ["quantum-shield", "main", "docs"],
  "hack-the-lab": ["hack-the-lab", "main", ""],
};

async function repoGet(repo, branch, dir, path) {
  const base = `https://raw.githubusercontent.com/Hartwell-Labs/${repo}/${branch}/${dir}`;
  const sep = path.includes("?") ? "&" : "?";
  return fetch(encodeURI(base + path) + sep + "__b=" + BUILD_ID, { headers: { accept: "*/*" } });
}

async function rawGet(path) {
  const sep = path.includes("?") ? "&" : "?";
  const url = encodeURI(RAW_BASE + path) + sep + "__b=" + BUILD_ID;
  const res = await fetch(url, { headers: { accept: "*/*" } });
  if (!res.ok) return null;
  return res;
}

async function serveFile(request, path, ctx) {
  const body = await rawGet(path);
  if (body) return respond(request, path, body, ctx);

  // Not in the site repository. If the first path segment names a product that
  // publishes its own Pages, try there before giving up — that is where
  // TEST_REPORT.md, EULA.txt and the audit notes actually live.
  const seg = path.split("/").filter(Boolean)[0];
  const entry = seg && PRODUCT_PAGES[seg];
  if (entry) {
    const [repo, branch, dir] = entry;
    const rest = path.slice(seg.length + 1) || "index.html";
    const prefix = dir ? dir + "/" : "";
    const res = await repoGet(repo, branch, prefix, rest);
    if (res.ok) return respond(request, path, res, ctx);
    if (rest !== "index.html") {
      const asIndex = await repoGet(repo, branch, prefix, rest + "/index.html");
      if (asIndex.ok) return respond(request, path, asIndex, ctx);
    }
  }
  return null;
}

function respond(request, path, body, ctx) {
  const headers = new Headers();
  headers.set("content-type", typeFor(path));
  // HTML musi byc walidowany, inaczej zmiana na GitHub Pages bywa widoczna
  // dopiero po godzinie i przy okazji wyglada jak wpadka.
  const isHtml = extOf(path) === ".html" || extOf(path) === ".htm";
  headers.set("cache-control", isHtml ? "public, max-age=300, must-revalidate" : "public, max-age=600");
  const res = new Response(request.method === "HEAD" ? null : body.body, { status: 200, headers });
  if (request.method === "GET") ctx.waitUntil(caches.default.put(cacheKey(request), secure(res.clone())));
  return res;
}

// Cache entries were keyed on the inbound request, which made every edit wait
// out max-age before it appeared — and zone purge_cache does not touch the
// Workers Cache API, so there was no way to force it. Tying the key to
// BUILD_ID means a deploy orphans every previous entry automatically instead
// of serving it, and the version never has to be bumped by hand.
function cacheKey(request) {
  const url = new URL(request.url);
  url.searchParams.set("__cv", BUILD_ID);
  return new Request(url.toString(), { method: "GET" });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.hostname === `www.${APEX}`) {
      url.hostname = APEX;
      return secure(Response.redirect(url.toString(), 301));
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return secure(new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } }));
    }

    const path = url.pathname;
    const last = path.split("/").pop();
    const hasExt = last.includes(".");

    const cached = await caches.default.match(cacheKey(request));
    if (cached) return secure(cached);

    if (path.endsWith("/")) {
      const res = await serveFile(request, path + "index.html", ctx);
      return secure(res || notFound());
    }

    if (hasExt) {
      const res = await serveFile(request, path, ctx);
      return secure(res || notFound());
    }

    const asHtml = await serveFile(request, path + ".html", ctx);
    if (asHtml) return secure(asHtml);

    const dirIndex = await rawGet(path + "/index.html");
    if (dirIndex) {
      url.pathname = path + "/";
      return secure(Response.redirect(url.toString(), 301));
    }

    return secure(notFound());
  },
};
