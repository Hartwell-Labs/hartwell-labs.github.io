-- Talus Partners — D1 schema
-- Apply with:
--   npx wrangler d1 execute talus-partners --remote --file=schema.sql
-- The Worker also applies the same additive schema at runtime, so a fresh
-- database starts working without a separate migration step.

CREATE TABLE IF NOT EXISTS partner_affiliates (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  name         TEXT,
  code         TEXT NOT NULL UNIQUE,
  token_hash   TEXT NOT NULL UNIQUE,
  payout_email TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_partner_affiliates_code ON partner_affiliates (code);
CREATE INDEX IF NOT EXISTS idx_partner_affiliates_status ON partner_affiliates (status);

CREATE TABLE IF NOT EXISTS partner_applications (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  channel     TEXT NOT NULL,
  message     TEXT,
  age         INTEGER,
  country     TEXT,
  attachments TEXT,
  status      TEXT NOT NULL DEFAULT 'new',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_partner_applications_created ON partner_applications (created_at);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications (status);

CREATE TABLE IF NOT EXISTS partner_clicks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id TEXT NOT NULL,
  code         TEXT NOT NULL,
  clicked_at   TEXT NOT NULL,
  ip_hash      TEXT,
  user_agent   TEXT,
  referer      TEXT
);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_affiliate ON partner_clicks (affiliate_id, clicked_at);

CREATE TABLE IF NOT EXISTS partner_commissions (
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
);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_affiliate ON partner_commissions (affiliate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_payment ON partner_commissions (payment_intent);

CREATE TABLE IF NOT EXISTS partner_subscriptions (
  subscription_id TEXT PRIMARY KEY,
  affiliate_id    TEXT NOT NULL,
  code            TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_payouts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'requested',
  method       TEXT,
  details      TEXT,
  requested_at TEXT NOT NULL,
  processed_at TEXT,
  note         TEXT
);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_affiliate ON partner_payouts (affiliate_id, requested_at);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_status ON partner_payouts (status);

CREATE TABLE IF NOT EXISTS partner_stripe_events (
  event_id    TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  received_at TEXT NOT NULL
);
