/**
 * hartwell-notify — receives GitHub webhooks and posts to Mastodon.
 *
 * GitHub's own Actions already covers build-and-deploy. What it does not cover
 * is telling anyone that something happened. A release, a security advisory or a
 * dependency alert sitting unannounced in a dashboard is a thing that happened
 * to nobody, and this lab has one person, who is asleep half the time.
 *
 * Deliberately narrow: only three event types produce a post, and anything else
 * is acknowledged and dropped. A webhook that forwards everything becomes noise,
 * and noise is why people stop reading notifications.
 */

const ALLOWED = new Set(["release", "repository_advisory", "dependabot_alert"]);

function summarise(event, payload) {
  const repo = payload.repository?.full_name ?? "a repository";

  if (event === "release") {
    const r = payload.release;
    const kind = r.draft ? "Draft" : r.prerelease ? "Pre-release" : "Release";
    const assets = r.assets?.length
      ? ` — ${r.assets.length} asset${r.assets.length === 1 ? "" : "s"}`
      : "";
    return {
      text: `${kind}: ${repo} ${r.tag_name}${assets}\n${r.name || ""}\n${r.html_url}`,
      kind: r.draft ? "draft" : "ship",
    };
  }

  if (event === "repository_advisory") {
    const a = payload.repository_advisory;
    const sev = (a.severity ?? "unknown").toUpperCase();
    return {
      text:
        `Security advisory (${sev}) — ${repo}\n${a.summary}\n` +
        `${a.html_url}\nReport privately: https://hartwell-labs.pl/security/`,
      kind: "security",
    };
  }

  if (event === "dependabot_alert") {
    const a = payload.dependabot_alert;
    if (a.state !== "open") return null; // Resolved alerts are not news.
    const sev = (a.security_advisory?.severity ?? "unknown").toUpperCase();
    return {
      text:
        `Dependabot (${sev}) — ${repo}\n${a.security_advisory?.summary ?? a.dependency?.package?.name ?? "dependency"}\n` +
        `${a.html_url}`,
      kind: "warning",
    };
  }

  return null;
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("expects POST", { status: 405 });
    }

    const event = request.headers.get("x-github-event") ?? "";
    const delivery = request.headers.get("x-github-delivery") ?? "";

    if (!ALLOWED.has(event)) {
      return Response.json({ ok: true, skipped: event }, { status: 202 });
    }

    // Read the body once. A Request stream can only be consumed a single time,
    // so the signature check and the parse have to share one read — reading it
    // inline for the signature left nothing for the parse afterwards.
    const body = await request.text();

    // Verify the signature before the body is parsed into anything. An
    // unauthenticated caller who can reach this Worker can post to your
    // followers' timelines.
    if (env.WEBHOOK_SECRET) {
      const sig = request.headers.get("x-hub-signature-256") ?? "";
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(env.WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const expected = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(body),
      );
      const got = Array.from(new Uint8Array(expected))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (sig !== `sha256=${got}`) {
        return Response.json({ ok: false, error: "bad signature" }, { status: 401 });
      }
    }

    // The body was already consumed above for the signature check, and a
    // Request stream can only be read once — request.json() on a spent body
    // throws. Parse what was read, and say so plainly if it is not JSON: a
    // webhook that throws on every delivery is a webhook that is only ever
    // diagnosed by whoever notices it stopped.
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      return Response.json(
        { ok: false, error: "body is not JSON", got: body.slice(0, 120) },
        { status: 400 },
      );
    }
    const summary = summarise(event, payload);
    if (!summary) return Response.json({ ok: true, posted: false }, { status: 202 });

    const res = await fetch(`https://${env.MASTODON_HOST}/api/v1/statuses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MASTODON_TOKEN}`,
        "Content-Type": "application/json",
        "Idempotency-Key": delivery,
      },
      body: JSON.stringify({ status: summary.text, visibility: "public" }),
    });

    if (!res.ok) {
      return Response.json(
        { ok: false, error: await res.text() },
        { status: 502 },
      );
    }

    return Response.json(
      { ok: true, posted: true, kind: summary.kind, delivery },
      { status: 202 },
    );
  },
};