/**
 * bo.hartwell-labs.pl — proxy dla bartoszosiej.github.io
 * (Cloudflare edge + nasz cert; GitHub Pages zostaje upstreamem)
 */

const UPSTREAM = "https://bartoszosiej.github.io";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const upstream = UPSTREAM + url.pathname + url.search;

    const resp = await fetch(upstream, {
      method: request.method,
      headers: {
        "user-agent": request.headers.get("user-agent") ?? "hartwell-cf-proxy",
        "accept": request.headers.get("accept") ?? "*/*",
      },
      redirect: "follow",
      cf: { cacheEverything: true, cacheTtl: 300 },
    });

    const out = new Response(resp.body, resp);
    out.headers.set("x-served-by", "hartwell-cf-proxy");
    return out;
  },
};
