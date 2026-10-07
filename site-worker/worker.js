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

function notFound() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>404 &middot; Hartwell Labs</title>
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

async function rawGet(path) {
  const res = await fetch(encodeURI(RAW_BASE + path), { headers: { accept: "*/*" } });
  if (!res.ok) return null;
  return res;
}

async function serveFile(request, path, ctx) {
  const body = await rawGet(path);
  if (!body) return null;
  const headers = new Headers();
  headers.set("content-type", typeFor(path));
  headers.set("cache-control", "public, max-age=600");
  const res = new Response(request.method === "HEAD" ? null : body.body, { status: 200, headers });
  if (request.method === "GET") ctx.waitUntil(caches.default.put(request, res.clone()));
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.hostname === `www.${APEX}`) {
      url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const cached = await caches.default.match(request);
    if (cached) return cached;

    const path = url.pathname;
    const last = path.split("/").pop();
    const hasExt = last.includes(".");

    if (path.endsWith("/")) {
      const res = await serveFile(request, path + "index.html", ctx);
      return res || notFound();
    }

    if (hasExt) {
      const res = await serveFile(request, path, ctx);
      return res || notFound();
    }

    const asHtml = await serveFile(request, path + ".html", ctx);
    if (asHtml) return asHtml;

    const dirIndex = await rawGet(path + "/index.html");
    if (dirIndex) {
      url.pathname = path + "/";
      const res = Response.redirect(url.toString(), 301);
      return res;
    }

    return notFound();
  },
};
