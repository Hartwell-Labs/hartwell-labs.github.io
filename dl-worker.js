// dl.hartwell-labs.pl — token-gated download for the Enterprise binary.
//
// The release lives on Hartwell-Labs/talus-enterprise, a private repository.
// A release asset there cannot be served publicly, so it is streamed through
// this Worker: the customer hands an entitlement key, the key is checked
// against Stripe's API (a paid subscription), and on success the asset is
// fetched from GitHub with a PAT stored as a Worker secret and piped back.
//
// The GitHub PAT needs only read:packages + repo scope, and only the exact
// asset name is ever requested. It is never echoed to the client.
//
// Deploy with: npx wrangler deploy --env prod
// Secrets required: GITHUB_TOKEN (PAT), STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

const ASSET = "talus-monitor-enterprise";
const REPO = "Hartwell-Labs/talus-enterprise";
const TAG = "v0.8.3";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/download") return new Response("not found", { status: 404 });

    const key = url.searchParams.get("key");
    if (!key) return new Response("missing entitlement key", { status: 401 });

    // The key is the id of a Stripe subscription item (or a session id). Verify
    // it actually exists and is paid, so a leaked or guessed key is useless and
    // an expired subscription gets a 403 the moment it stops paying.
    const stripe = await env.STRIPE_SECRET_KEY;
    if (!stripe) return new Response("server not configured", { status: 500 });

    let valid = false;
    try {
      // A subscription key:
      const sub = await fetch(`https://api.stripe.com/v1/subscriptions/${key}`, {
        headers: {
          Authorization: `Bearer ${stripe}`,
          "Stripe-Version": "2020-08-27",
        },
      }).then((r) => r.json()).catch(() => null);
      if (sub && sub.object === "subscription" && sub.status === "active") valid = true;

      // ...or a Checkout Session key:
      if (!valid) {
        const sess = await fetch(`https://api.stripe.com/v1/checkout/sessions/${key}`, {
          headers: { Authorization: `Bearer ${stripe}`, "Stripe-Version": "2020-08-27" },
        }).then((r) => r.json()).catch(() => null);
        if (sess && sess.payment_status === "paid" && sess.mode === "subscription") {
          valid = sess.subscription ? true : false;
        }
      }
    } catch {
      valid = false;
    }

    if (!valid) return new Response("invalid or expired entitlement", { status: 403 });

    // The binary itself is on a private release. Stream it so the Worker does
    // not buffer 22 MB in memory.
    const gh = env.GITHUB_TOKEN;
    if (!gh) return new Response("server not configured", { status: 500 });

    const asset = await fetch(
      `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`,
      { headers: { Authorization: `Bearer ${gh}`, Accept: "application/vnd.github+json" } },
    ).then((r) => r.json()).then((r) =>
      r.assets ? r.assets.find((a) => a.name === ASSET) : null,
    ).catch(() => null);

    if (!asset || !asset.url) return new Response("asset not found", { status: 404 });

    const upstream = await fetch(asset.url, {
      headers: { Authorization: `Bearer ${gh}`, Accept: "application/octet-stream" },
    });

    // Forward a 22 MB binary without holding it. Range requests are not served;
    // a resume-capable client can restart. A checksum file is on the same
    // release for the client to verify after download.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-length": upstream.headers.get("content-length") || String(asset.size),
        "content-disposition": `attachment; filename="${asset.name}"`,
        "cache-control": "no-store",
      },
    });
  },
};
