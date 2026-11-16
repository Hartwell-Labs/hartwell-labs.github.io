// ── Talus Partners — affiliate Worker ─────────────────────────────────────
//
// Deployed from the main site repository on partners.hartwell-labs.pl.
//
//   GET  /                              → program landing
//   GET  /v1/dashboard?token=...        → affiliate dashboard
//   GET  /v1/dahboard?token=...         → legacy spelling alias
//   POST /v1/dashboard/payout           → request a manual payout
//   POST /v1/dashboard/profile          → update payout email
//   GET  /r/:code                       → tracked referral redirect
//   POST /api/v1/checkout-session       → partner-attributed Stripe checkout
//   POST /api/v1/webhook/stripe         → commission ledger
//   GET  /api/v1/health
//
// Admin (Authorization: Bearer PARTNERS_ADMIN_TOKEN):
//   GET  /v1/admin/affiliates
//   POST /v1/admin/affiliates
//   POST /v1/admin/affiliates/:id/token
//   POST /v1/admin/affiliates/:id/status
//   GET  /v1/admin/payouts?status=requested
//   POST /v1/admin/payouts/:id

import {
  PartnerError,
  MAX_BODY,
  affiliate_referral_url,
  claim_stripe_event,
  create_affiliate,
  dollars_to_cents,
  ensure_schema,
  format_money,
  get_affiliate_by_token,
  get_dashboard,
  hash_token,
  list_affiliates,
  list_payouts,
  record_checkout_commission,
  record_click,
  record_invoice_commission,
  record_refund_commission,
  referral_redirect,
  release_stripe_event,
  request_payout,
  rotate_affiliate_token,
  set_affiliate_status,
  update_payout_email,
  update_payout_status,
} from './store.js';
import {
  handle_create_checkout_session,
  verify_stripe_signature,
} from './stripe.js';

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });
}

function html(body, status = 200) {
  return new Response(body, { status, headers: HTML_HEADERS });
}

function escape_html(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escape_attr(value) {
  return escape_html(value);
}

function token_from_url(url) {
  return (
    url.searchParams.get('token') ||
    url.searchParams.get('t') ||
    [...url.searchParams.values()][0] ||
    ''
  );
}

function cors_headers(env, request) {
  const allowed = env.PARTNERS_ALLOWED_ORIGIN || 'https://hartwell-labs.pl';
  const origin = request.headers.get('origin') || '';
  if (origin !== allowed && origin !== 'https://www.hartwell-labs.pl') return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, accept',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

async function read_form(request) {
  const type = request.headers.get('content-type') || '';
  const declared = Number.parseInt(request.headers.get('content-length') || '0', 10);
  if (Number.isFinite(declared) && declared > MAX_BODY) {
    throw new PartnerError('body too large', 413);
  }
  try {
    if (type.includes('application/json')) {
      const text = await request.text();
      if (text.length > MAX_BODY) throw new PartnerError('body too large', 413);
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
    const form = await request.formData();
    const out = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch (err) {
    if (err instanceof PartnerError) throw err;
    throw new PartnerError('invalid form body', 400);
  }
}

async function read_json(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new PartnerError('JSON body required', 415);
  const text = await request.text();
  if (text.length > MAX_BODY) throw new PartnerError('body too large', 413);
  try {
    const parsed = JSON.parse(text || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new PartnerError('invalid JSON', 400);
  }
}

function redirect(location, status = 303) {
  return new Response(null, {
    status,
    headers: { location, 'cache-control': 'no-store' },
  });
}

function page_shell(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escape_html(title)} · Talus Partners</title>
<style>
:root{color-scheme:light;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--soft:#f8fafc;--accent:#4f46e5;--good:#047857;--bad:#b91c1c}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:15px/1.55 Inter,system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:980px;margin:0 auto;padding:32px 20px 64px}
header{display:flex;justify-content:space-between;gap:16px;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:26px}
.brand{font-weight:800;letter-spacing:-.03em;font-size:20px}.brand span{color:var(--accent)}
.muted{color:var(--muted)}h1{font-size:30px;letter-spacing:-.04em;margin:0 0 6px}h2{font-size:18px;margin:30px 0 12px}h3{font-size:15px;margin:0 0 8px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.card{border:1px solid var(--line);border-radius:12px;padding:16px;background:var(--soft)}
.k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700}.v{font-size:24px;font-weight:800;letter-spacing:-.04em;margin-top:6px}
.box{border:1px solid var(--line);border-radius:12px;padding:18px;margin-top:18px}.link{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
input{width:100%;max-width:520px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:inherit;background:#fff;color:var(--ink)}
input[readonly]{background:var(--soft)}
button{appearance:none;border:0;border-radius:8px;background:var(--accent);color:#fff;padding:10px 16px;font:700 14px/1 inherit;cursor:pointer}
button:hover{filter:brightness(.95)}button:disabled{opacity:.5;cursor:not-allowed}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:end}.row>div{flex:1;min-width:180px}
table{width:100%;border-collapse:collapse;font-size:13.5px}th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.pos{color:var(--good);font-weight:700}.neg{color:var(--bad);font-weight:700}.badge{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 8px;font-size:11px;color:var(--muted);background:#fff}
.notice{border-left:3px solid var(--accent);background:#eef2ff;padding:10px 12px;border-radius:0 8px 8px 0;margin:12px 0;color:#3730a3;font-size:13.5px}
.err{border-left-color:var(--bad);background:#fef2f2;color:#991b1b}.ok{border-left-color:var(--good);background:#ecfdf5;color:#065f46}
a{color:var(--accent)}.foot{margin-top:34px;padding-top:16px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}
@media(max-width:760px){.grid{grid-template-columns:1fr 1fr}}@media(max-width:480px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body><main>
<header><div class="brand">Talus <span>Partners</span></div><div class="muted">20% recurring affiliate</div></header>
${body}
<div class="foot">Talus Partners · Hartwell Labs · manual payouts after review · <a href="mailto:contact@hartwell-labs.pl">contact@hartwell-labs.pl</a></div>
</main></body></html>`;
}

function landing_page() {
  return page_shell(
    'Affiliate program',
    `<h1>Earn 20% on every Talus subscription.</h1>
<p class="muted">Refer a team to Talus and keep 20% of every paid subscription — first year and renewals. Payouts are reviewed and sent manually, so you can request one whenever you want.</p>
<div class="notice"><strong>Already an affiliate?</strong> Open the dashboard link we sent you. The link is a private credential; do not forward it.</div>
<div class="box">
  <h3>How it works</h3>
  <p class="muted">Share your tracked link. When a buyer completes checkout within 60 days, the subscription is attributed to you. Your dashboard shows clicks, sales, available balance and payout history.</p>
  <p><a href="mailto:contact@hartwell-labs.pl?subject=Talus%20Partners%20application">Apply to the program →</a></p>
</div>`,
  );
}

function dashboard_page(data, token, env, flash = {}) {
  const affiliate = data.affiliate;
  const referral = affiliate_referral_url(env, affiliate.code);
  const available = data.available_cents;
  const can_request = available > 0 && Boolean(affiliate.payout_email);

  const commissions = (data.commissions ?? [])
    .map((c) => {
      const amount = Number(c.commission_cents) || 0;
      const cls = amount < 0 ? 'neg' : 'pos';
      const date = String(c.created_at ?? '').slice(0, 10);
      return `<tr><td>${escape_html(date)}</td><td>${escape_html(c.description || c.source_type)}</td><td class="${cls}">${format_money(amount)}</td></tr>`;
    })
    .join('');

  const payouts = (data.payouts ?? [])
    .map((p) => {
      const status = String(p.status ?? '');
      const date = String(p.requested_at ?? '').slice(0, 10);
      const processed = p.processed_at ? String(p.processed_at).slice(0, 10) : '—';
      return `<tr><td>${escape_html(date)}</td><td>${format_money(p.amount_cents)}</td><td><span class="badge">${escape_html(status)}</span></td><td>${escape_html(processed)}</td><td>${escape_html(p.note || '')}</td></tr>`;
    })
    .join('');

  const flash_html = flash.ok
    ? `<div class="notice ok">${escape_html(flash.ok)}</div>`
    : flash.err
      ? `<div class="notice err">${escape_html(flash.err)}</div>`
      : '';

  return page_shell(
    'Dashboard',
    `<h1>${escape_html(affiliate.name || affiliate.email)}</h1>
<p class="muted">Your private dashboard. Do not share this URL — anyone with it can see your balance and request payouts.</p>
${flash_html}
<div class="grid">
  <div class="card"><div class="k">Clicks</div><div class="v">${data.clicks}</div></div>
  <div class="card"><div class="k">Paid sales</div><div class="v">${data.sales}</div></div>
  <div class="card"><div class="k">Available</div><div class="v">${format_money(available)}</div></div>
  <div class="card"><div class="k">Paid out</div><div class="v">${format_money(data.paid_cents)}</div></div>
</div>

<div class="box">
  <h3>Your referral link</h3>
  <div class="link"><input readonly value="${escape_attr(referral)}" aria-label="Referral link"></div>
  <p class="muted">20% of every paid invoice, including renewals. Attribution is kept for 60 days from the click.</p>
</div>

<div class="box">
  <h3>Request a payout</h3>
  <p class="muted">Available balance: <strong>${format_money(available)}</strong>. Payouts are manual; request any amount and we will review it.</p>
  ${affiliate.payout_email
    ? `<p class="muted">Payout email: <strong>${escape_html(affiliate.payout_email)}</strong></p>`
    : `<div class="notice err">Add a payout email below before requesting a payout.</div>`}
  <form method="post" action="/v1/dashboard/profile">
    <input type="hidden" name="token" value="${escape_attr(token)}">
    <div class="row">
      <div><label class="k" for="payout_email">Payout email (PayPal)</label><input id="payout_email" name="payout_email" type="email" value="${escape_attr(affiliate.payout_email || '')}" placeholder="you@example.com" required></div>
      <div style="flex:0 0 auto"><button type="submit">Save email</button></div>
    </div>
  </form>
  <form method="post" action="/v1/dashboard/payout" style="margin-top:16px">
    <input type="hidden" name="token" value="${escape_attr(token)}">
    <div class="row">
      <div><label class="k" for="amount">Amount (USD)</label><input id="amount" name="amount" type="number" min="0.01" step="0.01" max="${(Math.max(0, available) / 100).toFixed(2)}" placeholder="25.00" ${can_request ? '' : 'disabled'} required></div>
      <div style="flex:0 0 auto"><button type="submit" ${can_request ? '' : 'disabled'}>Request payout</button></div>
    </div>
  </form>
</div>

<h2>Recent commissions</h2>
<div class="box" style="padding:0;overflow:auto">
  <table><thead><tr><th>Date</th><th>Source</th><th>Commission</th></tr></thead><tbody>
  ${commissions || '<tr><td colspan="3" class="muted">No commissions yet.</td></tr>'}
  </tbody></table>
</div>

<h2>Payout history</h2>
<div class="box" style="padding:0;overflow:auto">
  <table><thead><tr><th>Requested</th><th>Amount</th><th>Status</th><th>Processed</th><th>Note</th></tr></thead><tbody>
  ${payouts || '<tr><td colspan="5" class="muted">No payouts requested yet.</td></tr>'}
  </tbody></table>
</div>`,
  );
}

function invalid_link_page() {
  return html(page_shell(
    'Invalid dashboard link',
    `<h1>This dashboard link is not valid.</h1>
<p class="muted">The link may have been rotated or copied incorrectly. Ask for a fresh dashboard link.</p>
<p><a href="mailto:contact@hartwell-labs.pl?subject=Talus%20Partners%20dashboard%20link">Request a new link →</a></p>`,
  ), 401);
}

async function admin_ok(request, env) {
  const expected = env.PARTNERS_ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const [provided, wanted] = await Promise.all([
    hash_token(match[1].trim()),
    hash_token(String(expected).trim()),
  ]);
  let diff = provided.length ^ wanted.length;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ wanted.charCodeAt(i);
  }
  return diff === 0;
}

async function handle_admin(request, env, pathname) {
  if (!(await admin_ok(request, env))) {
    return json({ success: false, message: 'unauthorized' }, 401);
  }

  try {
    if (pathname === '/v1/admin/affiliates' && request.method === 'GET') {
      return json({ success: true, affiliates: await list_affiliates(env.DB) });
    }
    if (pathname === '/v1/admin/affiliates' && request.method === 'POST') {
      const body = await read_json(request);
      const created = await create_affiliate(env.DB, env, body);
      return json({ success: true, ...created }, 201);
    }

    const token_match = pathname.match(/^\/v1\/admin\/affiliates\/([^/]+)\/token$/);
    if (token_match && request.method === 'POST') {
      const rotated = await rotate_affiliate_token(
        env.DB,
        env,
        decodeURIComponent(token_match[1]),
      );
      return json({ success: true, ...rotated });
    }

    const status_match = pathname.match(/^\/v1\/admin\/affiliates\/([^/]+)\/status$/);
    if (status_match && request.method === 'POST') {
      const body = await read_json(request);
      const updated = await set_affiliate_status(
        env.DB,
        decodeURIComponent(status_match[1]),
        body.status,
      );
      return json({ success: true, ...updated });
    }

    if (pathname === '/v1/admin/payouts' && request.method === 'GET') {
      const status = new URL(request.url).searchParams.get('status');
      return json({ success: true, payouts: await list_payouts(env.DB, status) });
    }

    const payout_match = pathname.match(/^\/v1\/admin\/payouts\/(\d+)$/);
    if (payout_match && request.method === 'POST') {
      const body = await read_json(request);
      const updated = await update_payout_status(
        env.DB,
        Number.parseInt(payout_match[1], 10),
        body.status,
        body.note,
      );
      return json({ success: true, ...updated });
    }

    return json({ success: false, message: 'not found' }, 404);
  } catch (err) {
    const status = err instanceof PartnerError ? err.status : 500;
    return json(
      { success: false, message: err instanceof PartnerError ? err.message : 'internal error' },
      status,
    );
  }
}

async function handle_webhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return json({ success: false, message: 'invalid signature' }, 401);
  }
  const raw = await request.text();
  if (raw.length > 64 * 1024) return json({ success: false, message: 'body too large' }, 413);
  if (!(await verify_stripe_signature(request, raw, env.STRIPE_WEBHOOK_SECRET))) {
    return json({ success: false, message: 'invalid signature' }, 401);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ success: false, message: 'invalid JSON' }, 400);
  }
  const event_id = typeof event?.id === 'string' ? event.id : '';
  const type = typeof event?.type === 'string' ? event.type : '';
  if (!event_id || !type) return json({ success: false, message: 'unrecognized payload' }, 400);

  await ensure_schema(env.DB);
  const claimed = await claim_stripe_event(env.DB, event_id, type);
  if (!claimed) return json({ success: true, message: 'already processed' });

  const object = event?.data?.object ?? {};
  try {
    switch (type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await record_checkout_commission(env.DB, object, event_id);
        return json({ success: true, message: 'checkout recorded' });
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await record_invoice_commission(env.DB, object, event_id);
        return json({ success: true, message: 'invoice recorded' });
      case 'charge.refunded':
        await record_refund_commission(env.DB, object, event_id);
        return json({ success: true, message: 'refund recorded' });
      default:
        return json({ success: true, message: `ignored ${type}` });
    }
  } catch (err) {
    await release_stripe_event(env.DB, event_id);
    return json({ success: false, message: 'handler error' }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS' && pathname === '/api/v1/checkout-session') {
      return new Response(null, { status: 204, headers: cors_headers(env, request) });
    }

    if (pathname === '/api/v1/health') {
      return json({ success: true, service: 'talus-partners' });
    }

    if (pathname === '/api/v1/checkout-session' && request.method === 'POST') {
      const response = await handle_create_checkout_session(request, env);
      return new Response(response.body, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), ...cors_headers(env, request) },
      });
    }

    if (pathname === '/api/v1/webhook/stripe' && request.method === 'POST') {
      return handle_webhook(request, env);
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ success: false, message: 'method not allowed' }, 405);
    }

    if (pathname === '/' || pathname === '') return html(landing_page());

    try {
      await ensure_schema(env.DB);
    } catch {
      return html(page_shell('Unavailable', '<h1>Partner service is temporarily unavailable.</h1>'), 503);
    }

    if (pathname.startsWith('/v1/admin/')) {
      return handle_admin(request, env, pathname);
    }

    if (
      request.method === 'GET' &&
      (pathname === '/v1/dashboard' || pathname === '/v1/dahboard')
    ) {
      const token = token_from_url(url);
      const affiliate = await get_affiliate_by_token(env.DB, token);
      if (!affiliate) return invalid_link_page();
      if (affiliate.status !== 'active') {
        return html(
          page_shell(
            'Dashboard paused',
            '<h1>Your partner account is paused.</h1><p class="muted">Contact contact@hartwell-labs.pl to reactivate it.</p>',
          ),
        );
      }
      const data = await get_dashboard(env.DB, affiliate);
      const flash = {
        ok:
          url.searchParams.get('ok') === 'requested'
            ? 'Payout request received. We review requests manually and will contact you at your payout email.'
            : url.searchParams.get('ok') === 'profile'
              ? 'Payout email saved.'
              : null,
        err: url.searchParams.get('err'),
      };
      return html(dashboard_page(data, token, env, flash));
    }

    if (request.method === 'POST' && pathname === '/v1/dashboard/payout') {
      const form = await read_form(request);
      const token = String(form.token ?? '');
      const affiliate = await get_affiliate_by_token(env.DB, token);
      if (!affiliate || affiliate.status !== 'active') return invalid_link_page();
      try {
        const amount = dollars_to_cents(form.amount);
        if (!amount) throw new PartnerError('Enter a valid amount with at most two decimals.', 400);
        await request_payout(env.DB, affiliate, amount);
        return redirect(`/v1/dashboard?token=${encodeURIComponent(token)}&ok=requested`);
      } catch (err) {
        const message = err instanceof PartnerError ? err.message : 'Could not request payout.';
        return redirect(
          `/v1/dashboard?token=${encodeURIComponent(token)}&err=${encodeURIComponent(message)}`,
        );
      }
    }

    if (request.method === 'POST' && pathname === '/v1/dashboard/profile') {
      const form = await read_form(request);
      const token = String(form.token ?? '');
      const affiliate = await get_affiliate_by_token(env.DB, token);
      if (!affiliate || affiliate.status !== 'active') return invalid_link_page();
      try {
        await update_payout_email(env.DB, affiliate.id, form.payout_email);
        return redirect(`/v1/dashboard?token=${encodeURIComponent(token)}&ok=profile`);
      } catch (err) {
        const message = err instanceof PartnerError ? err.message : 'Could not save payout email.';
        return redirect(
          `/v1/dashboard?token=${encodeURIComponent(token)}&err=${encodeURIComponent(message)}`,
        );
      }
    }

    if (request.method === 'GET' && pathname.startsWith('/r/')) {
      const code = decodeURIComponent(pathname.slice('/r/'.length));
      await record_click(env.DB, env, code, request);
      return redirect(referral_redirect(env, code), 302);
    }

    return html(
      page_shell(
        'Not found',
        '<h1>Not found.</h1><p class="muted">This partner link does not exist.</p>',
      ),
      404,
    );
  },
};
