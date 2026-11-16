// ── Talus Partners — storage and money rules ───────────────────────────────
//
// 20% of the pre-tax amount actually collected on every paid subscription
// invoice. The affiliate is attached to the Stripe Checkout Session by
// client_reference_id and metadata.affiliate_code. The subscription id is
// remembered on the first payment, so renewals keep the same attribution.
//
// Money is integer cents and commission rounds DOWN. A dashboard token is a
// bearer credential: only its SHA-256 hash is stored.

const COMMISSION_BPS = 2000; // 20.00%
const TOKEN_BYTES = 16;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_BODY = 16 * 1024;

let schema_ready = false;
let schema_error = null;

export class PartnerError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'PartnerError';
    this.status = status;
  }
}

function now_iso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function str(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function int(value) {
  return Number.isSafeInteger(value) ? value : null;
}

function object_id(value) {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && typeof value.id === 'string') return value.id;
  return null;
}

export function normalize_code(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 24);
}

export function normalize_email(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (email.length < 5 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function commission_cents(net_cents) {
  const net = Number(net_cents);
  if (!Number.isFinite(net) || net <= 0) return 0;
  return Math.floor((net * COMMISSION_BPS) / 10000);
}

export function dollars_to_cents(value) {
  const raw = String(value ?? '').trim().replace(/^\$/, '').replace(/,/g, '.');
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const cents = Math.round(Number(raw) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100_000_000) return null;
  return cents;
}

export function format_money(cents) {
  const n = Number(cents) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

function random_code(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const byte of bytes) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return out;
}

function random_token() {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `aff_${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

export async function hash_token(token) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(String(token ?? '')),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function ensure_schema(db) {
  if (schema_ready) return true;
  if (schema_error) throw schema_error;
  if (!db) throw new PartnerError('database not configured', 503);

  try {
    await db.batch([
      db.prepare(
        `CREATE TABLE IF NOT EXISTS partner_affiliates (
           id           TEXT PRIMARY KEY,
           email        TEXT NOT NULL UNIQUE,
           name         TEXT,
           code         TEXT NOT NULL UNIQUE,
           token_hash   TEXT NOT NULL UNIQUE,
           payout_email TEXT,
           status       TEXT NOT NULL DEFAULT 'active',
           created_at   TEXT NOT NULL,
           updated_at   TEXT NOT NULL
         )`,
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_partner_affiliates_code ON partner_affiliates (code)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_partner_affiliates_status ON partner_affiliates (status)',
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS partner_applications (
           id         TEXT PRIMARY KEY,
           name       TEXT NOT NULL,
           email      TEXT NOT NULL,
           channel    TEXT NOT NULL,
           message    TEXT,
           status     TEXT NOT NULL DEFAULT 'new',
           created_at TEXT NOT NULL
         )`,
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_partner_applications_created ON partner_applications (created_at)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications (status)',
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS partner_clicks (
           id           INTEGER PRIMARY KEY AUTOINCREMENT,
           affiliate_id TEXT NOT NULL,
           code         TEXT NOT NULL,
           clicked_at   TEXT NOT NULL,
           ip_hash      TEXT,
           user_agent   TEXT,
           referer      TEXT
         )`,
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_partner_clicks_affiliate ON partner_clicks (affiliate_id, clicked_at)',
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS partner_commissions (
           id               INTEGER PRIMARY KEY AUTOINCREMENT,
           affiliate_id     TEXT NOT NULL,
           source_key       TEXT NOT NULL UNIQUE,
           stripe_event_id  TEXT,
           kind             TEXT NOT NULL,
           source_type      TEXT NOT NULL,
           source_id        TEXT,
           payment_intent   TEXT,
           subscription_id  TEXT,
           description      TEXT,
           gross_cents      INTEGER NOT NULL DEFAULT 0,
           tax_cents        INTEGER NOT NULL DEFAULT 0,
           commission_cents INTEGER NOT NULL,
           created_at       TEXT NOT NULL
         )`,
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_partner_commissions_affiliate ON partner_commissions (affiliate_id, created_at)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_partner_commissions_payment ON partner_commissions (payment_intent)',
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS partner_subscriptions (
           subscription_id TEXT PRIMARY KEY,
           affiliate_id    TEXT NOT NULL,
           code            TEXT NOT NULL,
           created_at      TEXT NOT NULL
         )`,
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS partner_payouts (
           id           INTEGER PRIMARY KEY AUTOINCREMENT,
           affiliate_id TEXT NOT NULL,
           amount_cents INTEGER NOT NULL,
           status       TEXT NOT NULL DEFAULT 'requested',
           method       TEXT,
           details      TEXT,
           requested_at TEXT NOT NULL,
           processed_at TEXT,
           note         TEXT
         )`,
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_partner_payouts_affiliate ON partner_payouts (affiliate_id, requested_at)',
      ),
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_partner_payouts_status ON partner_payouts (status)',
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS partner_stripe_events (
           event_id    TEXT PRIMARY KEY,
           type        TEXT NOT NULL,
           received_at TEXT NOT NULL
         )`,
      ),
    ]);
    schema_ready = true;
    return true;
  } catch (err) {
    schema_error = err;
    throw err;
  }
}

function base_url(env) {
  return (
    str(env?.PARTNERS_PUBLIC_ORIGIN) ?? 'https://partners.hartwell-labs.pl'
  ).replace(/\/+$/, '');
}

function product_url(env) {
  return str(env?.PARTNERS_PRODUCT_URL) ?? 'https://hartwell-labs.pl/talus';
}

function dashboard_url(env, token) {
  return `${base_url(env)}/v1/dashboard?token=${encodeURIComponent(token)}`;
}

export function affiliate_referral_url(env, code) {
  return `${base_url(env)}/r/${encodeURIComponent(code)}`;
}

export async function create_affiliate(db, env, input = {}) {
  await ensure_schema(db);
  const email = normalize_email(input.email);
  if (!email) throw new PartnerError('valid email required', 400);

  const name = String(input.name ?? '').trim().slice(0, 120) || null;
  const payout_email = input.payout_email ? normalize_email(input.payout_email) : null;
  if (input.payout_email && !payout_email) {
    throw new PartnerError('valid payout email required', 400);
  }

  let code = normalize_code(input.code || '');
  if (input.code && code.length < 4) throw new PartnerError('code must be at least 4 characters', 400);
  if (!code) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      code = random_code(8);
      const existing = await db
        .prepare('SELECT id FROM partner_affiliates WHERE code = ?1')
        .bind(code)
        .first();
      if (!existing) break;
    }
    if (!code) throw new PartnerError('could not allocate a code', 500);
  }

  const duplicate = await db
    .prepare('SELECT id FROM partner_affiliates WHERE email = ?1 OR code = ?2')
    .bind(email, code)
    .first();
  if (duplicate) throw new PartnerError('email or code already in use', 409);

  const token = random_token();
  const token_hash = await hash_token(token);
  const id = `aff_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const now = now_iso();

  await db
    .prepare(
      `INSERT INTO partner_affiliates
         (id, email, name, code, token_hash, payout_email, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?7)`,
    )
    .bind(id, email, name, code, token_hash, payout_email, now)
    .run();

  return {
    affiliate: { id, email, name, code, payout_email, status: 'active' },
    token,
    dashboard_url: dashboard_url(env, token),
    referral_url: affiliate_referral_url(env, code),
  };
}

export function normalize_application(input = {}) {
  const name = String(input.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const email = normalize_email(input.email);
  const channel = String(input.channel ?? '').trim().replace(/\s+/g, ' ').slice(0, 200);
  const message = String(input.message ?? '').trim().slice(0, 2000) || null;

  if (name.length < 2) throw new PartnerError('valid name required', 400);
  if (!email) throw new PartnerError('valid email required', 400);
  if (channel.length < 2) throw new PartnerError('tell us where you will promote Talus', 400);

  return { name, email, channel, message };
}

export async function create_application(db, input = {}) {
  await ensure_schema(db);
  const application = normalize_application(input);
  const id = `app_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const now = now_iso();

  await db
    .prepare(
      `INSERT INTO partner_applications
         (id, name, email, channel, message, status, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 'new', ?6)`,
    )
    .bind(
      id,
      application.name,
      application.email,
      application.channel,
      application.message,
      now,
    )
    .run();

  return { id, ...application, status: 'new', created_at: now };
}

export async function list_applications(db, status = null) {
  await ensure_schema(db);
  const want = str(status);
  const statement = want
    ? db
        .prepare(
          `SELECT id, name, email, channel, message, status, created_at
             FROM partner_applications
            WHERE status = ?1
            ORDER BY created_at DESC`,
        )
        .bind(want)
    : db.prepare(
        `SELECT id, name, email, channel, message, status, created_at
           FROM partner_applications
          ORDER BY created_at DESC`,
      );
  const { results } = await statement.all();
  return results ?? [];
}

export async function list_affiliates(db) {
  await ensure_schema(db);
  const { results } = await db
    .prepare(
      `SELECT a.id, a.email, a.name, a.code, a.payout_email, a.status,
              a.created_at,
              (SELECT COUNT(*) FROM partner_clicks c WHERE c.affiliate_id = a.id) AS clicks,
              (SELECT COUNT(*) FROM partner_commissions m
                 WHERE m.affiliate_id = a.id AND m.kind = 'sale') AS sales,
              (SELECT COALESCE(SUM(m.commission_cents), 0) FROM partner_commissions m
                 WHERE m.affiliate_id = a.id) AS earned_cents
         FROM partner_affiliates a
        ORDER BY a.created_at DESC`,
    )
    .all();
  return results ?? [];
}

export async function rotate_affiliate_token(db, env, affiliate_id) {
  await ensure_schema(db);
  const affiliate = await db
    .prepare('SELECT id, code FROM partner_affiliates WHERE id = ?1')
    .bind(affiliate_id)
    .first();
  if (!affiliate) throw new PartnerError('affiliate not found', 404);

  const token = random_token();
  const token_hash = await hash_token(token);
  await db
    .prepare('UPDATE partner_affiliates SET token_hash = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(token_hash, now_iso(), affiliate_id)
    .run();

  return {
    token,
    dashboard_url: dashboard_url(env, token),
    referral_url: affiliate_referral_url(env, affiliate.code),
  };
}

export async function set_affiliate_status(db, affiliate_id, status) {
  await ensure_schema(db);
  const next = status === 'paused' ? 'paused' : status === 'active' ? 'active' : null;
  if (!next) throw new PartnerError('status must be active or paused', 400);
  const res = await db
    .prepare('UPDATE partner_affiliates SET status = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(next, now_iso(), affiliate_id)
    .run();
  if ((res?.meta?.changes ?? 0) === 0) throw new PartnerError('affiliate not found', 404);
  return { id: affiliate_id, status: next };
}

export async function get_affiliate_by_token(db, token) {
  await ensure_schema(db);
  const raw = String(token ?? '').trim();
  if (!raw || raw.length > 200) return null;
  const token_hash = await hash_token(raw);
  return db
    .prepare(
      `SELECT id, email, name, code, payout_email, status, created_at
         FROM partner_affiliates WHERE token_hash = ?1`,
    )
    .bind(token_hash)
    .first();
}

export async function get_affiliate_by_code(db, code) {
  await ensure_schema(db);
  const normalized = normalize_code(code);
  if (!normalized) return null;
  return db
    .prepare('SELECT id, code, status FROM partner_affiliates WHERE code = ?1')
    .bind(normalized)
    .first();
}

export async function get_dashboard(db, affiliate) {
  await ensure_schema(db);
  const [clicks, totals, commissions, payouts] = await Promise.all([
    db
      .prepare('SELECT COUNT(*) AS n FROM partner_clicks WHERE affiliate_id = ?1')
      .bind(affiliate.id)
      .first(),
    db
      .prepare(
        `SELECT
           COALESCE((SELECT SUM(commission_cents) FROM partner_commissions
                      WHERE affiliate_id = ?1), 0) AS earned_cents,
           COALESCE((SELECT SUM(amount_cents) FROM partner_payouts
                      WHERE affiliate_id = ?1 AND status IN ('requested','approved','paid')), 0) AS committed_cents,
           COALESCE((SELECT SUM(amount_cents) FROM partner_payouts
                      WHERE affiliate_id = ?1 AND status = 'paid'), 0) AS paid_cents,
           COALESCE((SELECT COUNT(*) FROM partner_commissions
                      WHERE affiliate_id = ?1 AND kind = 'sale'), 0) AS sales`,
      )
      .bind(affiliate.id)
      .first(),
    db
      .prepare(
        `SELECT id, kind, description, gross_cents, tax_cents, commission_cents,
                source_type, source_id, created_at
           FROM partner_commissions
          WHERE affiliate_id = ?1
          ORDER BY id DESC LIMIT 20`,
      )
      .bind(affiliate.id)
      .all(),
    db
      .prepare(
        `SELECT id, amount_cents, status, method, details, requested_at,
                processed_at, note
           FROM partner_payouts
          WHERE affiliate_id = ?1
          ORDER BY id DESC LIMIT 20`,
      )
      .bind(affiliate.id)
      .all(),
  ]);

  const earned = Number(totals?.earned_cents ?? 0);
  const committed = Number(totals?.committed_cents ?? 0);
  const paid = Number(totals?.paid_cents ?? 0);

  return {
    affiliate,
    clicks: Number(clicks?.n ?? 0),
    sales: Number(totals?.sales ?? 0),
    earned_cents: earned,
    available_cents: earned - committed,
    pending_cents: Math.max(0, committed - paid),
    paid_cents: paid,
    commissions: commissions?.results ?? [],
    payouts: payouts?.results ?? [],
  };
}

export async function update_payout_email(db, affiliate_id, value) {
  await ensure_schema(db);
  const email = normalize_email(value);
  if (!email) throw new PartnerError('valid payout email required', 400);
  const res = await db
    .prepare('UPDATE partner_affiliates SET payout_email = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(email, now_iso(), affiliate_id)
    .run();
  if ((res?.meta?.changes ?? 0) === 0) throw new PartnerError('affiliate not found', 404);
  return { payout_email: email };
}

export async function request_payout(db, affiliate, amount_cents) {
  await ensure_schema(db);
  if (!Number.isSafeInteger(amount_cents) || amount_cents <= 0) {
    throw new PartnerError('amount must be greater than zero', 400);
  }
  if (!affiliate.payout_email) {
    throw new PartnerError('add a payout email before requesting a payout', 400);
  }

  // The INSERT ... SELECT is the balance check: concurrent requests cannot
  // both consume the same available balance.
  const res = await db
    .prepare(
      `INSERT INTO partner_payouts
         (affiliate_id, amount_cents, status, method, details, requested_at)
       SELECT ?1, ?2, 'requested', 'paypal', ?3, ?4
        WHERE (
          COALESCE((SELECT SUM(commission_cents) FROM partner_commissions
                     WHERE affiliate_id = ?1), 0)
          - COALESCE((SELECT SUM(amount_cents) FROM partner_payouts
                       WHERE affiliate_id = ?1
                         AND status IN ('requested','approved','paid')), 0)
        ) >= ?2`,
    )
    .bind(affiliate.id, amount_cents, affiliate.payout_email, now_iso())
    .run();

  if ((res?.meta?.changes ?? 0) === 0) {
    throw new PartnerError('amount exceeds your available balance', 400);
  }
  return { amount_cents, status: 'requested' };
}

export async function list_payouts(db, status = null) {
  await ensure_schema(db);
  const normalized = ['requested', 'approved', 'paid', 'rejected'].includes(status)
    ? status
    : null;
  const sql = normalized
    ? `SELECT p.*, a.email, a.name, a.code, a.payout_email
         FROM partner_payouts p JOIN partner_affiliates a ON a.id = p.affiliate_id
        WHERE p.status = ?1 ORDER BY p.id DESC LIMIT 200`
    : `SELECT p.*, a.email, a.name, a.code, a.payout_email
         FROM partner_payouts p JOIN partner_affiliates a ON a.id = p.affiliate_id
        ORDER BY p.id DESC LIMIT 200`;
  const stmt = db.prepare(sql);
  const { results } = normalized ? await stmt.bind(normalized).all() : await stmt.all();
  return results ?? [];
}

export async function update_payout_status(db, id, status, note = null) {
  await ensure_schema(db);
  if (!['approved', 'paid', 'rejected'].includes(status)) {
    throw new PartnerError('status must be approved, paid or rejected', 400);
  }
  const res = await db
    .prepare(
      `UPDATE partner_payouts
          SET status = ?1, processed_at = ?2, note = ?3
        WHERE id = ?4 AND status IN ('requested','approved')`,
    )
    .bind(status, now_iso(), note ? String(note).slice(0, 500) : null, id)
    .run();
  if ((res?.meta?.changes ?? 0) === 0) {
    throw new PartnerError('payout not found or already processed', 404);
  }
  return { id, status };
}

export async function record_click(db, env, code, request) {
  await ensure_schema(db);
  const affiliate = await get_affiliate_by_code(db, code);
  if (!affiliate || affiliate.status !== 'active') return null;

  let ip_hash = null;
  if (env?.PARTNER_CLICK_SALT) {
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      '';
    if (ip) ip_hash = (await hash_token(`${env.PARTNER_CLICK_SALT}:${ip}`)).slice(0, 32);
  }

  await db
    .prepare(
      `INSERT INTO partner_clicks
         (affiliate_id, code, clicked_at, ip_hash, user_agent, referer)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(
      affiliate.id,
      affiliate.code,
      now_iso(),
      ip_hash,
      String(request.headers.get('user-agent') ?? '').slice(0, 300) || null,
      String(request.headers.get('referer') ?? '').slice(0, 500) || null,
    )
    .run();

  return affiliate;
}

export function referral_redirect(env, code) {
  const target = new URL(product_url(env));
  target.searchParams.set('ref', code);
  target.searchParams.set('utm_source', 'partners');
  target.searchParams.set('utm_medium', 'affiliate');
  target.searchParams.set('utm_campaign', code);
  return target.toString();
}

async function affiliate_for_code(db, code) {
  const normalized = normalize_code(code);
  if (!normalized) return null;
  return db
    .prepare(
      `SELECT id, code FROM partner_affiliates
        WHERE code = ?1 AND status = 'active'`,
    )
    .bind(normalized)
    .first();
}

async function remember_subscription(db, subscription_id, affiliate) {
  if (!subscription_id) return;
  await db
    .prepare(
      `INSERT INTO partner_subscriptions (subscription_id, affiliate_id, code, created_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(subscription_id) DO NOTHING`,
    )
    .bind(subscription_id, affiliate.id, affiliate.code, now_iso())
    .run();
}

async function insert_commission(db, row) {
  const res = await db
    .prepare(
      `INSERT INTO partner_commissions
         (affiliate_id, source_key, stripe_event_id, kind, source_type, source_id,
          payment_intent, subscription_id, description, gross_cents, tax_cents,
          commission_cents, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
       ON CONFLICT(source_key) DO NOTHING`,
    )
    .bind(
      row.affiliate_id,
      row.source_key,
      row.stripe_event_id,
      row.kind,
      row.source_type,
      row.source_id,
      row.payment_intent,
      row.subscription_id,
      row.description,
      row.gross_cents,
      row.tax_cents,
      row.commission_cents,
      now_iso(),
    )
    .run();
  return (res?.meta?.changes ?? 0) > 0;
}

export async function claim_stripe_event(db, event_id, type) {
  const res = await db
    .prepare(
      `INSERT INTO partner_stripe_events (event_id, type, received_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(event_id) DO NOTHING`,
    )
    .bind(event_id, type, now_iso())
    .run();
  return (res?.meta?.changes ?? 0) > 0;
}

export async function release_stripe_event(db, event_id) {
  await db
    .prepare('DELETE FROM partner_stripe_events WHERE event_id = ?1')
    .bind(event_id)
    .run();
}

export async function record_checkout_commission(db, session, event_id = null) {
  await ensure_schema(db);
  if (!session || typeof session !== 'object') return null;
  if (
    session.payment_status &&
    session.payment_status !== 'paid' &&
    session.payment_status !== 'no_payment_required'
  ) {
    return null;
  }

  const metadata = session.metadata ?? {};
  const code = normalize_code(metadata.affiliate_code || session.client_reference_id);
  const affiliate = await affiliate_for_code(db, code);
  if (!affiliate) return null;

  const subscription_id = object_id(session.subscription);
  await remember_subscription(db, subscription_id, affiliate);

  const payment_intent = object_id(session.payment_intent);
  const source_key = payment_intent ? `pi:${payment_intent}` : `cs:${session.id}`;
  const total = int(session.amount_total);
  if (total === null || total <= 0) return null;
  const tax = int(session.total_details?.amount_tax) ?? 0;
  const net = Math.max(0, total - tax);
  const commission = commission_cents(net);
  if (commission <= 0) return null;

  const tier = str(metadata.tier) ?? 'enterprise';
  const nodes = str(metadata.node_count) ?? '1';
  const description = `Talus ${tier} — ${nodes} machine${nodes === '1' ? '' : 's'}`;

  const inserted = await insert_commission(db, {
    affiliate_id: affiliate.id,
    source_key,
    stripe_event_id: event_id,
    kind: 'sale',
    source_type: 'checkout_session',
    source_id: str(session.id),
    payment_intent,
    subscription_id,
    description,
    gross_cents: net,
    tax_cents: tax,
    commission_cents: commission,
  });

  return inserted ? { commission_cents: commission, source_key } : null;
}

export async function record_invoice_commission(db, invoice, event_id = null) {
  await ensure_schema(db);
  if (!invoice || invoice.status !== 'paid') return null;

  const subscription_id =
    object_id(invoice.subscription) ?? object_id(invoice.subscription_details?.subscription);
  const metadata = invoice.subscription_details?.metadata ?? invoice.metadata ?? {};

  let affiliate = await affiliate_for_code(db, metadata.affiliate_code || metadata.affiliate);
  if (!affiliate && subscription_id) {
    affiliate = await db
      .prepare(
        `SELECT a.id, a.code
           FROM partner_subscriptions s
           JOIN partner_affiliates a ON a.id = s.affiliate_id
          WHERE s.subscription_id = ?1 AND a.status = 'active'`,
      )
      .bind(subscription_id)
      .first();
  }
  if (!affiliate) return null;

  await remember_subscription(db, subscription_id, affiliate);

  const payment_intent = object_id(invoice.payment_intent);
  const source_key = payment_intent ? `pi:${payment_intent}` : `in:${invoice.id}`;
  const tax = int(invoice.tax) ?? 0;
  const net =
    int(invoice.total_excluding_tax) ??
    Math.max(0, (int(invoice.amount_paid) ?? int(invoice.subtotal) ?? 0) - tax);
  if (net <= 0) return null;

  const commission = commission_cents(net);
  if (commission <= 0) return null;

  const inserted = await insert_commission(db, {
    affiliate_id: affiliate.id,
    source_key,
    stripe_event_id: event_id,
    kind: 'sale',
    source_type: 'invoice',
    source_id: str(invoice.id),
    payment_intent,
    subscription_id,
    description: `Talus subscription — ${str(invoice.billing_reason) ?? 'renewal'}`,
    gross_cents: net,
    tax_cents: tax,
    commission_cents: commission,
  });

  return inserted ? { commission_cents: commission, source_key } : null;
}

// Stripe reports cumulative amount_refunded. Reverse the difference between
// the commission due on that cumulative amount and what was already reversed.
export async function record_refund_commission(db, charge, event_id = null) {
  await ensure_schema(db);
  if (!charge || typeof charge !== 'object') return null;

  const payment_intent = object_id(charge.payment_intent);
  const refunded = int(charge.amount_refunded) ?? 0;
  if (!payment_intent || refunded <= 0) return null;

  const sale = await db
    .prepare(
      `SELECT id, affiliate_id, commission_cents, gross_cents
         FROM partner_commissions
        WHERE payment_intent = ?1 AND kind = 'sale'
        ORDER BY id ASC LIMIT 1`,
    )
    .bind(payment_intent)
    .first();
  if (!sale) return null;

  const already = await db
    .prepare(
      `SELECT COALESCE(SUM(-commission_cents), 0) AS reversed_cents
         FROM partner_commissions
        WHERE payment_intent = ?1 AND kind = 'refund'`,
    )
    .bind(payment_intent)
    .first();

  const target = Math.min(
    Number(sale.commission_cents ?? 0),
    commission_cents(refunded),
  );
  const delta = target - Number(already?.reversed_cents ?? 0);
  if (delta <= 0) return null;

  const inserted = await insert_commission(db, {
    affiliate_id: sale.affiliate_id,
    source_key: `refund:${charge.id}:${refunded}`,
    stripe_event_id: event_id,
    kind: 'refund',
    source_type: 'charge',
    source_id: str(charge.id),
    payment_intent,
    subscription_id: null,
    description: 'Refund reversal',
    gross_cents: -Math.min(Number(sale.gross_cents ?? 0), refunded),
    tax_cents: 0,
    commission_cents: -delta,
  });

  return inserted ? { reversed_cents: delta } : null;
}

export { COMMISSION_BPS, MAX_BODY };
