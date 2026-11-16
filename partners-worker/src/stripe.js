// ── Stripe checkout + webhook signature ───────────────────────────────────
//
// The partner Worker creates its own Checkout Sessions only when a referral
// code is present. The license server remains the system of record for
// fulfilment: Stripe sends checkout.session.completed to both endpoints, and
// this Worker records only the affiliate commission.

import { normalize_code } from './store.js';

const SIGNATURE_TOLERANCE_SECONDS = 300;
const FLEET_MIN_NODES = 10;
const MAX_SEATS = 500;

function str(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function encode_form(value, prefix = '', out = []) {
  if (value === undefined || value === null) return out;
  if (Array.isArray(value)) {
    value.forEach((item, index) => encode_form(item, `${prefix}[${index}]`, out));
    return out;
  }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      encode_form(item, prefix ? `${prefix}[${key}]` : key, out);
    }
    return out;
  }
  out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  return out;
}

async function stripe_call(env, method, path, form = null) {
  if (!env.STRIPE_SECRET_KEY) throw new Error('stripe not configured');
  const init = {
    method,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
  };
  if (form) init.body = encode_form(form).join('&');
  const res = await fetch(`https://api.stripe.com/v1/${path}`, init);
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error?.message ?? `stripe http ${res.status}`);
  }
  return payload;
}

async function hmac_sha256_hex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timing_safe_equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function parse_signature_header(header) {
  const raw = String(header ?? '');
  let timestamp = null;
  const signatures = [];
  for (const part of raw.split(',')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === 't') {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) timestamp = parsed;
    } else if (key === 'v1') {
      for (const sig of value.split(/\s+/)) {
        if (/^[0-9a-f]{64}$/i.test(sig)) signatures.push(sig);
      }
    }
  }
  if (timestamp === null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

export async function verify_stripe_signature(request, raw_body, secret) {
  if (!secret) return false;
  const parsed = parse_signature_header(request.headers.get('stripe-signature'));
  if (!parsed) return false;
  const skew = Math.abs(Math.floor(Date.now() / 1000) - parsed.timestamp);
  if (skew > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = await hmac_sha256_hex(
    String(secret).trim(),
    `${parsed.timestamp}.${raw_body}`,
  );
  return parsed.signatures.some((provided) => timing_safe_equal(provided, expected));
}

export async function handle_create_checkout_session(request, env) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ success: false, message: 'partner checkout not configured' }, 503);
  }

  let body = {};
  try {
    const text = await request.text();
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') body = parsed;
    }
  } catch {
    body = {};
  }

  const tier = body.tier === 'fleet' ? 'fleet' : 'single';
  const currency = body.currency === 'usd' ? 'usd' : 'pln';
  const affiliate = normalize_code(body.affiliate);
  if (affiliate.length < 4) {
    return json({ success: false, message: 'affiliate code required' }, 400);
  }

  const price_id = str(
    tier === 'fleet'
      ? currency === 'usd'
        ? env.STRIPE_FLEET_PRICE_USD
        : env.STRIPE_FLEET_PRICE_PLN
      : currency === 'usd'
        ? env.STRIPE_PRICE_USD
        : env.STRIPE_PRICE_PLN,
  );
  if (!price_id) return json({ success: false, message: 'price not configured' }, 503);

  const requested = Number(body.nodes);
  const min_nodes = tier === 'fleet' ? FLEET_MIN_NODES : 1;
  let nodes = min_nodes;
  if (Number.isFinite(requested)) {
    if (!Number.isInteger(requested)) {
      return json({ success: false, message: 'nodes must be a whole number' }, 400);
    }
    if (requested < min_nodes) {
      return json(
        {
          success: false,
          message:
            tier === 'fleet'
              ? `fleet licences start at ${FLEET_MIN_NODES} nodes`
              : 'single licence is one node',
        },
        400,
      );
    }
    if (requested > MAX_SEATS) {
      return json({ success: false, message: `for more than ${MAX_SEATS} nodes contact us` }, 400);
    }
    nodes = requested;
  }

  const product_url = str(env.PARTNERS_PRODUCT_URL) ?? 'https://hartwell-labs.pl/talus';
  const success_url =
    str(env.PARTNERS_SUCCESS_URL) ?? 'https://hartwell-labs.pl/talus/aktywacja';
  const cancel_url = str(env.PARTNERS_CANCEL_URL) ?? product_url;

  const metadata = {
    product: 'talus',
    tier,
    node_count: String(nodes),
    currency,
    affiliate_code: affiliate,
  };

  try {
    const session = await stripe_call(env, 'POST', 'checkout/sessions', {
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: String(nodes) }],
      'managed_payments[enabled]': 'true',
      'automatic_tax[enabled]': 'true',
      billing_address_collection: 'required',
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url,
      client_reference_id: affiliate,
      metadata,
      subscription_data: { metadata },
    });

    return json({
      success: true,
      session_id: session.id,
      url: session.url,
      tier,
      nodes,
      currency,
    });
  } catch (err) {
    return json({ success: false, message: `checkout failed: ${String(err.message)}` }, 502);
  }
}
