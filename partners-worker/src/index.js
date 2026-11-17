// ── Talus Partners — affiliate Worker ─────────────────────────────────────
//
// Deployed from the main site repository on partners.hartwell-labs.pl.
//
//   GET  /                              → program landing
//   GET  /apply                         → affiliate application form
//   POST /v1/apply                      → affiliate application + optional PDFs
//   GET  /v1/dashboard?token=...        → affiliate dashboard
//   GET  /v1/dahboard?token=...         → legacy spelling alias
//   POST /v1/dashboard/payout           → request a manual payout
//   POST /v1/dashboard/profile          → update payout email
//   GET  /r/:code                       → tracked referral redirect
//   POST /api/v1/checkout-session       → partner-attributed Stripe checkout
//   POST /api/v1/webhook/stripe         → commission ledger
//   GET  /api/v1/health
//
// Admin panel (cookie session from POST /v1/admin/login):
//   GET  /v1/admin
//   POST /v1/admin/panel/create | rotate | status | delete | payout
//   POST /v1/admin/logout
//
// Admin API (Authorization: Bearer PARTNERS_ADMIN_TOKEN):
//   GET  /v1/admin/applications?status=new
//   GET  /v1/admin/applications/:id/files/:index
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
  create_application,
  delete_affiliate,
  dollars_to_cents,
  ensure_schema,
  format_money,
  get_affiliate_by_token,
  get_dashboard,
  hash_token,
  get_application,
  list_affiliates,
  list_applications,
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
    "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
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

function html(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { ...HTML_HEADERS, ...extra } });
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

const MAX_APPLICATION_FILES = 3;
const MAX_APPLICATION_FILE_BYTES = 10 * 1024 * 1024;
const MAX_APPLICATION_BODY_BYTES = 32 * 1024 * 1024;

async function read_application_form(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('multipart/form-data')) {
    throw new PartnerError('form submission required', 400);
  }
  const declared = Number.parseInt(request.headers.get('content-length') || '0', 10);
  if (Number.isFinite(declared) && declared > MAX_APPLICATION_BODY_BYTES) {
    throw new PartnerError('application files are too large', 413);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    throw new PartnerError('invalid form body', 400);
  }

  const values = {};
  const files = [];
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') {
      values[key] = value;
    } else if (key === 'files' && value.size > 0) {
      files.push(value);
    }
  }
  return { values, files };
}

function pdf_file_name(file) {
  return String(file.name || '')
    .split(/[\\/]/)
    .pop()
    .trim()
    .slice(0, 160);
}

async function upload_application_files(env, files) {
  if (!files.length) return [];
  if (!env.APPLICATIONS_BUCKET) {
    throw new PartnerError('PDF uploads are temporarily unavailable', 503);
  }
  if (files.length > MAX_APPLICATION_FILES) {
    throw new PartnerError('attach at most 3 PDF files', 400);
  }
  const total = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  if (total > MAX_APPLICATION_BODY_BYTES) {
    throw new PartnerError('application files are too large', 413);
  }

  const uploaded = [];
  try {
    for (const file of files) {
      const original = pdf_file_name(file);
      const type = String(file.type || '').toLowerCase();
      if (!original.toLowerCase().endsWith('.pdf')) {
        throw new PartnerError('only PDF files can be attached', 400);
      }
      if (type && type !== 'application/pdf' && type !== 'application/octet-stream') {
        throw new PartnerError('only PDF files can be attached', 400);
      }
      if (file.size > MAX_APPLICATION_FILE_BYTES) {
        throw new PartnerError('each PDF must be 10 MB or smaller', 413);
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const magic = String.fromCharCode(...bytes.slice(0, 5));
      if (magic !== '%PDF-') {
        throw new PartnerError('only valid PDF files can be attached', 400);
      }

      const base =
        original
          .replace(/[^A-Za-z0-9._-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 100) || 'attachment.pdf';
      const key = `applications/${crypto.randomUUID().replace(/-/g, '')}/${base}`;
      await env.APPLICATIONS_BUCKET.put(key, bytes, {
        httpMetadata: { contentType: 'application/pdf' },
        customMetadata: { originalName: original },
      });
      uploaded.push({ key, name: original, size: bytes.byteLength });
    }
  } catch (err) {
    await Promise.allSettled(
      uploaded.map((file) => env.APPLICATIONS_BUCKET.delete(file.key)),
    );
    throw err;
  }
  return uploaded;
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

function redirect(location, status = 303, extra = {}) {
  return new Response(null, {
    status,
    headers: { location, 'cache-control': 'no-store', ...extra },
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
<meta name="description" content="Earn 20% recurring on every Talus subscription. Talus is eBPF ransomware detection and response for Linux, sold per node to teams that run servers.">
<meta name="theme-color" content="#0a0e14">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light;--bg:#ffffff;--bg-subtle:#f8fafc;--border:#e2e8f0;--border-strong:#cbd5e1;--txt:#0f172a;--txt-2:#475569;--txt-3:#64748b;--accent:#4f46e5;--accent-hover:#4338ca;--accent-soft:#eef2ff;--green:#059669;--green-soft:#ecfdf5;--red:#dc2626;--red-soft:#fef2f2;--amber:#d97706;--amber-soft:#fffbeb;--mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
body{background:var(--bg);color:var(--txt);font-family:"Inter",-apple-system,"Segoe UI",sans-serif;font-size:16px;line-height:1.65}
a{color:inherit}
code,pre{font-family:var(--mono)}
.wrap{max-width:1100px;margin:0 auto;padding:0 24px}
header.site{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.88);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.header-in{display:flex;align-items:center;justify-content:space-between;height:64px;gap:16px}
.brand,.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px;letter-spacing:-.01em;text-decoration:none;color:var(--txt)}
.brand span{display:none}
nav.main{display:flex;gap:24px;align-items:center}
nav.main a{font-size:14px;color:var(--txt-2);text-decoration:none;font-weight:500}
nav.main a:hover,nav.main a[aria-current="page"]{color:var(--txt)}
nav.main a[aria-current="page"]{font-weight:600}
.header-cta{display:inline-flex;align-items:center;height:36px;padding:0 16px;border-radius:8px;background:var(--txt);color:#fff!important;font-size:13.5px;font-weight:600;text-decoration:none;white-space:nowrap}
.header-cta:hover{background:#1e293b;text-decoration:none}
main{padding:0}
section{padding:80px 0}
section+section{border-top:1px solid var(--border)}
section.hero{border-top:0;padding:88px 0 72px}
.kicker{font-size:13px;font-weight:600;color:var(--txt-3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
.kicker:before{content:""}
h1{font-size:clamp(34px,5.2vw,54px);line-height:1.1;letter-spacing:-.03em;font-weight:700}
h1 .dim{color:var(--txt-3)}
h2{font-size:clamp(25px,3.2vw,32px);letter-spacing:-.02em;line-height:1.18;font-weight:700}
h3{font-size:15.5px;font-weight:600;letter-spacing:-.01em;line-height:1.4}
.lede{margin-top:22px;font-size:18px;line-height:1.65;color:var(--txt-2);max-width:620px}
.muted{color:var(--txt-2)}
.dim{color:var(--txt-3)}
.hero-grid{display:grid;grid-template-columns:1.04fr .96fr;gap:48px;align-items:center}
.hero-copy{max-width:620px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:5px 14px;margin-bottom:26px}
.eyebrow:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--accent)}
.hero-actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:34px}
.btn{display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 22px;border-radius:10px;background:var(--accent);color:#fff;font-size:15px;font-weight:600;text-decoration:none;transition:background .15s ease,border-color .15s ease}
.btn:hover{text-decoration:none}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:var(--accent-hover)}
.btn.secondary,.btn-secondary{border:1px solid var(--border);color:var(--txt);background:transparent}
.btn.secondary:hover,.btn-secondary:hover{background:var(--bg-subtle)}
.btn.ghost{background:transparent;border:0;color:var(--txt-2);height:auto;padding:0}
.btn.ghost:hover{color:var(--txt)}
.btn.small{height:36px;padding:0 14px;font-size:13px}
.hero-note{font-size:13px;color:var(--txt-3);margin-top:14px}
.stat-strip{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--bg-subtle);margin-top:44px;border-radius:0}
.stat{background:transparent;padding:22px 24px}
.stat+.stat{border-left:1px solid var(--border)}
.stat .n{font-size:24px;font-weight:700;letter-spacing:-.02em;color:var(--txt)}
.stat .l{font-size:13px;color:var(--txt-2);margin-top:2px}
.terminal{border:1px solid #1e293b;border-radius:10px;background:#0f172a;overflow:hidden;color:#e2e8f0}
.term-bar{display:flex;align-items:center;gap:6px;padding:11px 14px;border-bottom:1px solid #1e293b;background:#111c30}
.dot{width:8px;height:8px;border-radius:50%;background:#334155}
.dot.r{background:#f87171}
.dot.a{background:#fbbf24}
.dot.g{background:#34d399}
.term-title{margin-left:8px;font:400 11px/1 var(--mono);color:#94a3b8;letter-spacing:.04em}
.term-body{padding:18px 16px 20px;font:12px/1.9 var(--mono);color:#cbd5e1;white-space:pre-wrap;overflow-x:auto}
.term-body .cmd{color:#fff}
.term-body .ok{color:#6ee7b7}
.term-body .warn{color:#fbbf24}
.term-body .kill{color:#f87171;font-weight:700}
.term-body .path{color:#a5b4fc}
.term-body .c{color:#64748b}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr));gap:16px}
.grid.two{grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr))}
.grid.three{grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))}
.card{border:1px solid var(--border);border-radius:12px;padding:22px;background:var(--bg);transition:border-color .15s ease,box-shadow .15s ease}
.card:hover{border-color:#c7d2fe;box-shadow:0 4px 16px rgba(79,70,229,.08)}
.card p{margin-top:8px;color:var(--txt-2);font-size:14px;line-height:1.6}
.icon{display:inline-block;font-size:12px;font-weight:700;color:var(--accent);background:var(--accent-soft);border-radius:6px;padding:2px 8px;margin-bottom:10px}
.k{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--txt-3);font-weight:600}
label.k{display:block;margin-bottom:6px}
.v{font-size:26px;font-weight:700;letter-spacing:-.02em;margin-top:4px;color:var(--txt)}
.box{border:1px solid var(--border);border-radius:12px;padding:22px;margin-top:18px;background:var(--bg)}
.link{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
input,textarea,select{width:100%;max-width:560px;padding:11px 13px;border:1px solid var(--border-strong);border-radius:8px;font:15px/1.5 "Inter",sans-serif;background:var(--bg);color:var(--txt)}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(79,70,229,.14)}
textarea{min-height:120px;resize:vertical}
input[readonly]{background:var(--bg-subtle);font-family:var(--mono);font-size:12.5px}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
button{appearance:none;border:1px solid var(--accent);border-radius:9px;background:var(--accent);color:#fff;padding:11px 18px;font:600 14px/1 "Inter",sans-serif;cursor:pointer;transition:background .15s ease}
button:hover{background:var(--accent-hover)}
button:disabled{opacity:.45;cursor:not-allowed}
button.small{padding:7px 11px;font-size:12px}
button.danger{background:var(--red);border-color:var(--red);color:#fff}
input[type=file]{padding:10px;background:var(--bg-subtle);font-size:14px}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:end}
.row>div{flex:1;min-width:180px}
.actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.actions form{margin:0}
code{font-size:12.5px;background:var(--bg-subtle);border:1px solid var(--border);padding:1px 6px;border-radius:5px;color:var(--txt)}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--border);vertical-align:top}
tr:last-child td{border-bottom:0}
th{color:var(--txt-3);font-size:12px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;border-bottom:2px solid var(--border)}
.pos{color:var(--green);font-weight:600}
.neg{color:var(--red);font-weight:600}
.badge{display:inline-block;border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--txt-2);background:var(--bg-subtle)}
.notice{border:1px solid #c7d2fe;background:var(--accent-soft);padding:12px 14px;border-radius:9px;margin:16px 0;color:#3730a3;font-size:14px}
.notice strong{color:var(--txt)}
.notice.err{border-color:#fecaca;background:var(--red-soft);color:#991b1b}
.notice.ok{border-color:#a7f3d0;background:var(--green-soft);color:#065f46}
.notice a{color:inherit;text-decoration:underline}
.foot{border-top:1px solid var(--border);margin-top:0;padding:40px 0 46px;background:var(--bg-subtle);font-size:14px;color:var(--txt-2)}
.foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px}
.foot h5{font-size:12.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--txt-3);margin-bottom:12px}
.foot a{display:block;font-size:14px;color:var(--txt-2);text-decoration:none;padding:3px 0}
.foot a:hover{color:var(--txt)}
.foot .brand{font-size:15px;margin-bottom:14px}
.foot .about{font-size:14px;color:var(--txt-2);max-width:300px}
.foot-fine{margin-top:34px;padding-top:18px;border-top:1px solid var(--border);font-size:12.5px;color:var(--txt-3);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.foot-fine a{display:inline;padding:0}
.foot .logo{font-size:15px}
.eyebrow-row{display:flex;justify-content:space-between;gap:24px;align-items:end;margin-bottom:44px;flex-wrap:wrap;max-width:660px}
.eyebrow-row p{color:var(--txt-2);max-width:520px;font-size:16px}
.section-head{max-width:660px;margin-bottom:44px}
.section-head p{margin-top:13px;color:var(--txt-2);font-size:16.5px}
.steps{counter-reset:s;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.step{counter-increment:s;border:1px solid var(--border);border-radius:12px;padding:22px;background:var(--bg)}
.step:before{content:counter(s,decimal-leading-zero);display:inline-block;font-size:12px;font-weight:700;color:var(--accent);background:var(--accent-soft);border-radius:6px;padding:2px 8px;letter-spacing:.06em}
.step h3{margin:10px 0 6px}
.step p{color:var(--txt-2);font-size:14px}
.earn{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center}
.earn-table{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg)}
.earn-table table{font-size:14px}
.earn-table td:last-child{text-align:right;font-weight:700;color:var(--accent)}
.earn-table th:last-child{text-align:right}
.pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600;color:var(--accent);background:var(--accent-soft)}
.faq{border-top:1px solid var(--border)}
details{border-bottom:1px solid var(--border);padding:18px 0}
summary{cursor:pointer;font-weight:600;font-size:15.5px;list-style:none;display:flex;justify-content:space-between;gap:16px}
summary::-webkit-details-marker{display:none}
summary:after{content:"+";color:var(--accent);font-weight:700;font-size:18px;line-height:1}
details[open] summary:after{content:"-"}
details p{margin:10px 0 0;color:var(--txt-2);font-size:14.5px;max-width:760px;line-height:1.65}
.apply-grid{display:grid;grid-template-columns:1.5fr .8fr;gap:28px;align-items:start}
.aside{border:1px solid var(--border);border-radius:12px;background:var(--bg-subtle);padding:22px}
.aside ul{margin:0;padding-left:18px;color:var(--txt-2);font-size:14px}
.aside li{margin:6px 0}
.dash-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;flex-wrap:wrap;margin-bottom:24px;padding-top:48px}
.dash-head h1{font-size:clamp(28px,4vw,40px)}
.stat-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.stat-cards .card{padding:18px}
.stat-cards .v{color:var(--txt)}
@media(max-width:920px){.hero-grid,.earn,.apply-grid{grid-template-columns:1fr}.grid,.grid.two,.grid.three,.steps{grid-template-columns:1fr}.stat-cards{grid-template-columns:repeat(2,1fr)}}
@media(max-width:720px){nav.main{display:none}.header-in{height:auto;flex-wrap:wrap;padding:10px 0;row-gap:6px}section{padding:52px 0}section.hero{padding:54px 0 46px}.hero-grid{gap:30px}.stat-strip{grid-template-columns:1fr}.stat+.stat{border-left:0;border-top:1px solid var(--border)}.foot-grid{grid-template-columns:1fr 1fr}}
@media(max-width:420px){.wrap{padding:0 18px}h1{font-size:clamp(28px,8.4vw,34px)}.stat-cards{grid-template-columns:1fr}.hero-actions .btn{width:100%}}
</style>
</head>
<body>
<header class="site"><div class="wrap header-in">
  <a class="logo" href="https://hartwell-labs.pl/">
    <svg width="22" height="22" viewBox="0 0 46 46" aria-hidden="true"><path d="M23,2 L42,13 L42,33 L23,44 L4,33 L4,13 Z" fill="none" stroke="#4f46e5" stroke-width="3.4" stroke-linejoin="round"/><polyline points="13,26 19,26 22,17 26,29 29,24 33,24" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    Hartwell Labs
  </a>
  <nav class="main">
    <a href="https://hartwell-labs.pl/products">Products</a>
    <a href="https://hartwell-labs.pl/catalog">Catalog</a>
    <a href="https://hartwell-labs.pl/docs">Docs</a>
    <a href="https://hartwell-labs.pl/security">Security</a>
    <a href="https://hartwell-labs.pl/company">Company</a>
    <a href="/" aria-current="page">Partners</a>
  </nav>
  <a class="header-cta" href="/apply">Apply</a>
</div></header>
<main class="wrap">
${body}
</main>
<div class="foot"><div class="wrap">
<div class="foot-grid">
  <div>
    <a class="logo" href="https://hartwell-labs.pl/" style="margin-bottom:14px">
      <svg width="20" height="20" viewBox="0 0 46 46" aria-hidden="true"><path d="M23,2 L42,13 L42,33 L23,44 L4,33 L4,13 Z" fill="none" stroke="#4f46e5" stroke-width="3.4" stroke-linejoin="round"/></svg>
      Hartwell Labs
    </a>
    <p class="about">Affiliate program for Talus — behavioral ransomware detection and response for Linux.</p>
  </div>
  <div><h5>Program</h5><a href="/">Overview</a><a href="/apply">Apply</a><a href="mailto:contact@hartwell-labs.pl?subject=Talus%20Partners%20dashboard%20link">Dashboard link</a></div>
  <div><h5>Product</h5><a href="https://hartwell-labs.pl/talus-process-monitor/">talus-process-monitor</a><a href="https://download.hartwell-labs.pl/">Downloads</a><a href="https://wiki.hartwell-labs.pl/">Documentation</a></div>
  <div><h5>Company</h5><a href="https://hartwell-labs.pl/company">About</a><a href="https://hartwell-labs.pl/security">Security</a><a href="https://hartwell-labs.pl/privacy/">Privacy</a></div>
</div>
<div class="foot-fine"><span>© 2026 Hartwell Labs. All software released under the MIT License unless stated otherwise.</span><span>20% recurring · 90-day attribution · <a href="mailto:contact@hartwell-labs.pl">contact@hartwell-labs.pl</a></span></div>
</div></div>
</body></html>`;
}

function landing_page(flash = {}, values = {}) {
  const flash_html = flash.ok
    ? `<div class="notice ok">${escape_html(flash.ok)}</div>`
    : flash.err
      ? `<div class="notice err">${escape_html(flash.err)}</div>`
      : '';

  return page_shell(
    'Affiliate program',
    `<section class="hero">
  <div class="hero-grid">
    <div>
      <div class="eyebrow">Talus partner program</div>
      <h1>Refer the agent that <span class="dim">kills ransomware.</span></h1>
      <p class="lede">Talus traces syscalls with eBPF, scores per-process file activity and terminates the encryptor with SIGKILL. You bring the team that runs Linux servers; we pay <strong style="color:var(--text)">20% of every subscription, for as long as they stay</strong>.</p>
      <div class="hero-actions">
        <a class="btn" href="/apply">Apply to the program →</a>
        <a class="btn secondary" href="https://hartwell-labs.pl/talus-process-monitor/">See the product</a>
      </div>
      <p class="hero-note">Manual review · private dashboard · payouts on request · 90-day attribution</p>
    </div>
    <div class="terminal" aria-hidden="true">
      <div class="term-bar"><span class="dot r"></span><span class="dot a"></span><span class="dot g"></span><span class="term-title">TALUS_MONITOR // LIVE</span></div>
      <div class="term-body"><span class="c"># one encryptor, 4,812 files in 1s</span>
<span class="path">/srv/app</span>  open   <span class="warn">OPEN_WRITE</span>  pid 8412
<span class="path">/srv/app</span>  write  <span class="warn">score 35</span>  pid 8412
<span class="c"># evidence: 82 marker extensions</span>
<span class="path">.locked</span>  marker <span class="warn">+40</span>  family <span class="dim">lockbit</span>

<span class="kill">VERDICT  ransomware  score 78</span>
<span class="kill">SIGKILL  pid 8412  in 0.4s</span>
<span class="ok">host intact · 3 files touched · audit logged</span></div>
    </div>
  </div>
  <div class="stat-strip">
    <div class="stat"><div class="n">20%</div><div class="l">recurring, first payment and renewals</div></div>
    <div class="stat"><div class="n">90 days</div><div class="l">attribution window from the click</div></div>
    <div class="stat"><div class="n">$10</div><div class="l">per node per year at list price</div></div>
  </div>
  ${flash_html}
  <div class="notice" style="margin-top:22px"><strong>Already an affiliate?</strong> Open the dashboard link we sent you. The link is a private credential; do not forward it. <a href="mailto:contact@hartwell-labs.pl?subject=Talus%20Partners%20dashboard%20link">Lost it?</a></div>
</section>

<section id="fit">
  <div class="eyebrow-row"><div><div class="kicker">Who it is for</div><h2>You already have the trust. We have the tool.</h2></div><p>The program is built for people who advise teams running Linux servers — not for coupon sites or paid-link farms.</p></div>
  <div class="grid">
    <div class="card"><div class="icon">01</div><h3>MSPs &amp; MSSPs</h3><p>You manage fleets and already sell uptime. Add ransomware response as a per-node line item and keep the client relationship.</p></div>
    <div class="card"><div class="icon">02</div><h3>DevSecOps consultants</h3><p>You are already doing hardening, NIS2 or SOC 2 work. Talus is the control that proves a host can detect and respond.</p></div>
    <div class="card"><div class="icon">03</div><h3>Linux creators</h3><p>Newsletters, YouTube, podcasts and self-hosting communities where admins look for tools they can deploy this week.</p></div>
    <div class="card"><div class="icon">04</div><h3>Freelance sysadmins</h3><p>You touch dozens of hosts a year. A referral survives the handover, and renewals keep paying after the project ends.</p></div>
  </div>
</section>

<section id="earn">
  <div class="earn">
    <div>
      <div class="kicker">What it pays</div>
      <h2>A recurring share, not a one-off bounty.</h2>
      <p class="lede" style="font-size:15.5px;margin-bottom:18px">Talus is licensed per node, per year. You earn 20% of the pre-tax amount actually collected — on the first payment and on every renewal. Refunds reverse the commission proportionally.</p>
      <div class="link"><span class="pill">20% recurring</span><span class="pill">paid on request</span><span class="pill">USD or PLN invoice</span></div>
      <p class="muted" style="font-size:12.5px;margin-top:14px">Illustration at the $50/node list price. Fleet pricing is lower per node; the commission stays 20%.</p>
    </div>
    <div class="earn-table">
      <table><thead><tr><th>Nodes referred</th><th>Your share / year</th></tr></thead><tbody>
        <tr><td>10 nodes</td><td>$100</td></tr>
        <tr><td>50 nodes</td><td>$500</td></tr>
        <tr><td>200 nodes</td><td>$2,000</td></tr>
        <tr><td>500 nodes</td><td>$5,000</td></tr>
      </tbody></table>
    </div>
  </div>
</section>

<section id="how">
  <div class="eyebrow-row"><div><div class="kicker">How it works</div><h2>Three steps, no dashboard to babysit.</h2></div></div>
  <div class="steps">
    <div class="step"><h3>Apply</h3><p>Tell us who you are, where you publish and who you advise. We review every application manually and reply by email.</p></div>
    <div class="step"><h3>Share your link</h3><p>You get a tracked link and a private dashboard with clicks, sales, balance and payout history. Attribution lasts 90 days.</p></div>
    <div class="step"><h3>Get paid</h3><p>Request a payout whenever you want. We review it and send it manually, so there is no minimum balance trap.</p></div>
  </div>
</section>

<section id="terms">
  <div class="eyebrow-row"><div><div class="kicker">The terms</div><h2>Short, because they should be.</h2></div></div>
  <div class="grid two">
    <div class="card"><h3>20% of collected revenue</h3><p>Commission is 20% of the pre-tax amount actually collected by Stripe, including renewals for as long as the customer stays.</p></div>
    <div class="card"><h3>90-day attribution</h3><p>The click is remembered in the buyer's browser for 90 days and travels through Stripe as <code>client_reference_id</code>.</p></div>
    <div class="card"><h3>Refunds reverse it</h3><p>If a payment is refunded, the matching commission is reversed proportionally. No clawback games beyond what was refunded.</p></div>
    <div class="card"><h3>Manual payouts</h3><p>Request any amount from the dashboard. We review and send it manually; PayPal is the default rail, invoices are available.</p></div>
  </div>
</section>

<section id="faq">
  <div class="eyebrow-row"><div><div class="kicker">FAQ</div><h2>Questions partners ask first.</h2></div></div>
  <div class="faq">
    <details><summary>Can I install Talus for my clients?</summary><p>Yes. Talus is licensed per machine, so each protected host needs its own seat. Many partners deploy it during an engagement and the customer keeps the license afterwards.</p></details>
    <details><summary>Does the commission really recur?</summary><p>Yes. You are credited on the first paid invoice and on renewals, for as long as the subscription remains active. Refunds reverse the corresponding commission.</p></details>
    <details><summary>How is a sale attributed to me?</summary><p>Your tracked link stores your code in the buyer's browser for 90 days. Checkout carries the same code through Stripe, and the webhook writes the commission to your ledger.</p></details>
    <details><summary>When do I get paid?</summary><p>Request a payout whenever your balance is above zero. Payouts are reviewed manually and sent by PayPal or invoice. The dashboard shows every request and its status.</p></details>
    <details><summary>Do you accept coupon or deal sites?</summary><p>No. The program is for people with an audience or client base that actually runs Linux servers. Low-effort link placements are declined.</p></details>
  </div>
</section>

<section id="apply" style="text-align:center">
  <div class="kicker" style="justify-content:center">Ready?</div>
  <h2 style="margin-bottom:12px">Apply once. Refer when it fits.</h2>
  <p class="muted" style="max-width:520px;margin:0 auto 26px">Applications are reviewed manually. If approved, you receive a private dashboard link and a tracked referral link.</p>
  <a class="btn" href="/apply">Apply to the program →</a>
</section>`,
  );
}

function application_page(flash = {}, values = {}) {
  const flash_html = flash.err
    ? `<div class="notice err">${escape_html(flash.err)}</div>`
    : '';

  return page_shell(
    'Apply to the program',
    `<section style="padding-top:48px">
<p style="margin:0 0 18px"><a href="/" style="font-size:13px">← Back to the program</a></p>
<div class="kicker">Partner application</div>
<h1 style="font-size:clamp(32px,4.4vw,48px)">Apply to the Talus partner program.</h1>
<p class="lede" style="font-size:16px">We review every application manually. If approved, you receive a private dashboard link and a tracked referral link. All fields except the PDFs are required.</p>
${flash_html}
<div class="apply-grid">
  <div class="box" style="margin-top:0">
    <form method="post" action="/v1/apply" enctype="multipart/form-data">
      <div class="row">
        <div><label class="k" for="name">Name or handle</label><input id="name" name="name" maxlength="120" value="${escape_attr(values.name || '')}" placeholder="How we should address you" required></div>
        <div><label class="k" for="email">Contact email</label><input id="email" name="email" type="email" maxlength="254" value="${escape_attr(values.email || '')}" placeholder="you@example.com" required></div>
      </div>
      <div class="row" style="margin-top:16px">
        <div><label class="k" for="age">Age</label><input id="age" name="age" type="number" min="1" max="120" step="1" value="${escape_attr(values.age || '')}" required></div>
        <div><label class="k" for="country">Country</label><input id="country" name="country" maxlength="80" autocomplete="country-name" value="${escape_attr(values.country || '')}" placeholder="Poland" required></div>
      </div>
      <div style="margin-top:16px"><label class="k" for="message">Who are you, and who do you advise?</label><textarea id="message" name="message" maxlength="2000" required placeholder="Your work, the audience or clients you reach, and why Talus fits them.">${escape_html(values.message || '')}</textarea></div>
      <div style="margin-top:16px"><label class="k" for="channel">Where will you promote Talus?</label><input id="channel" name="channel" maxlength="200" value="${escape_attr(values.channel || '')}" placeholder="Newsletter, YouTube, MSP client base, community…" required><p class="muted" style="font-size:12.5px;margin:7px 0 0">A link or an approximate audience size helps us review faster.</p></div>
      <div style="margin-top:16px">
        <label class="k" for="files">PDFs (optional)</label>
        <input id="files" name="files" type="file" accept="application/pdf,.pdf" multiple>
        <p class="muted" style="font-size:12.5px;margin:7px 0 0">Up to 3 PDF files, 10 MB each. Media kit, portfolio or audience stats.</p>
      </div>
      <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
      <button type="submit" style="margin-top:20px">Send application →</button>
    </form>
  </div>
  <aside class="aside">
    <h3>What happens next</h3>
    <ul>
      <li>We read the application and check the channel or client base.</li>
      <li>If it fits, you get a private dashboard link and a tracked referral link by email.</li>
      <li>You earn 20% of every collected payment, including renewals, for 90 days after each click.</li>
      <li>Payouts are manual and available on request — no minimum balance.</li>
    </ul>
    <p class="muted" style="font-size:12.5px;margin:16px 0 0">Not sure whether you qualify? <a href="mailto:contact@hartwell-labs.pl?subject=Talus%20Partners">Ask first</a> — a short email is enough.</p>
  </aside>
</div>
</section>`,
  );
}

function application_received_page() {
  return page_shell(
    'Application received',
    `<h1>Application received.</h1>
<div class="notice ok">Thank you. We review applications manually and will email you at the address you provided if approved.</div>
<p class="muted">You can close this page. If you need to correct something, reply to the address in the footer.</p>
<p><a class="btn" href="/">Back to the partner program</a></p>`,
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
    `<div class="dash-head">
  <div><div class="kicker">Partner dashboard</div><h1 style="font-size:clamp(28px,4vw,40px)">${escape_html(affiliate.name || affiliate.email)}</h1>
  <p class="muted" style="margin:0">Your private dashboard. Do not share this URL — anyone with it can see your balance and request payouts.</p></div>
  <a class="btn secondary small" href="https://hartwell-labs.pl/talus-process-monitor/" target="_blank" rel="noreferrer">Product page ↗</a>
</div>
${flash_html}
<div class="stat-cards">
  <div class="card"><div class="k">Clicks</div><div class="v">${data.clicks}</div></div>
  <div class="card"><div class="k">Paid sales</div><div class="v">${data.sales}</div></div>
  <div class="card"><div class="k">Available</div><div class="v">${format_money(available)}</div></div>
  <div class="card"><div class="k">Paid out</div><div class="v">${format_money(data.paid_cents)}</div></div>
</div>

<div class="box">
  <h3>Your referral link</h3>
  <div class="link"><input readonly value="${escape_attr(referral)}" aria-label="Referral link"></div>
  <p class="muted">20% of every paid invoice, including renewals. Attribution is kept for 90 days from the click.</p>
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

function cookie_value(request, name) {
  for (const part of String(request.headers.get('cookie') || '').split(';')) {
    const at = part.indexOf('=');
    if (at < 0) continue;
    if (part.slice(0, at).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(at + 1).trim());
    } catch {
      return '';
    }
  }
  return '';
}

function admin_cookie(token) {
  return `partners_admin=${encodeURIComponent(token)}; Path=/v1/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
}

const ADMIN_COOKIE_CLEAR =
  'partners_admin=; Path=/v1/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0';

async function secret_matches(provided, expected) {
  if (!provided || !expected) return false;
  const [a, b] = await Promise.all([
    hash_token(String(provided).trim()),
    hash_token(String(expected).trim()),
  ]);
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function admin_ok(request, env) {
  const expected = env.PARTNERS_ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const candidates = [match?.[1]?.trim(), cookie_value(request, 'partners_admin')].filter(Boolean);
  for (const candidate of candidates) {
    if (await secret_matches(candidate, expected)) return true;
  }
  return false;
}

async function load_admin_data(env) {
  await ensure_schema(env.DB);
  const affiliates = await list_affiliates(env.DB);
  const payouts = await list_payouts(env.DB, 'requested');
  const applications = await list_applications(env.DB);
  return { affiliates, payouts, applications };
}

function admin_login_page(error = '') {
  return page_shell(
    'Admin sign in',
    `<h1>Partner admin</h1>
<p class="muted">Sign in with the <code>PARTNERS_ADMIN_TOKEN</code> Worker secret.</p>
${error ? `<div class="notice err">${escape_html(error)}</div>` : ''}
<div class="box">
  <form method="post" action="/v1/admin/login">
    <label class="k" for="admin_token">Admin token</label>
    <input id="admin_token" name="token" type="password" autocomplete="current-password" required>
    <div style="margin-top:14px"><button type="submit">Sign in</button></div>
  </form>
</div>`,
  );
}

function credentials_block(title, data) {
  if (!data) return '';
  return `<div class="notice ok"><strong>${escape_html(title)}</strong> — copy this now; it is shown once.
  <div style="margin-top:10px"><label class="k" for="new_dashboard">Dashboard URL</label><input id="new_dashboard" readonly value="${escape_attr(data.dashboard_url || '')}"></div>
  <div style="margin-top:10px"><label class="k" for="new_referral">Referral link</label><input id="new_referral" readonly value="${escape_attr(data.referral_url || '')}"></div>
</div>`;
}

function admin_flash_from_url(url) {
  const ok = url.searchParams.get('ok');
  const err = url.searchParams.get('err');
  const messages = {
    deleted: 'Account and its history were deleted.',
    status: 'Account status updated.',
    payout: 'Payout updated.',
  };
  return {
    ok: ok ? messages[ok] || 'Done.' : null,
    err: err || null,
  };
}

function admin_page(data, opts = {}) {
  const { affiliates, payouts, applications = [] } = data;
  const flash = opts.flash || {};
  const values = opts.values || {};
  const delete_target = opts.delete_target || null;

  const flash_html = flash.ok
    ? `<div class="notice ok">${escape_html(flash.ok)}</div>`
    : flash.err
      ? `<div class="notice err">${escape_html(flash.err)}</div>`
      : '';

  const created_html = opts.created
    ? credentials_block('Account created', opts.created)
    : '';
  const rotated_html = opts.rotated
    ? credentials_block('New dashboard link generated', opts.rotated)
    : '';

  const rows = affiliates
    .map((a) => {
      const paused = a.status !== 'active';
      return `<tr>
  <td><strong>${escape_html(a.name || a.email)}</strong><br><span class="muted">${escape_html(a.email)}</span></td>
  <td><code>${escape_html(a.code)}</code><br><a href="/r/${encodeURIComponent(a.code)}" target="_blank" rel="noreferrer">referral</a></td>
  <td><span class="badge">${escape_html(a.status)}</span></td>
  <td>${Number(a.clicks) || 0} clicks<br>${Number(a.sales) || 0} sales</td>
  <td>${format_money(Number(a.earned_cents) || 0)}</td>
  <td><div class="actions">
    <form method="post" action="/v1/admin/panel/rotate"><input type="hidden" name="id" value="${escape_attr(a.id)}"><button class="small" type="submit">New link</button></form>
    <form method="post" action="/v1/admin/panel/status"><input type="hidden" name="id" value="${escape_attr(a.id)}"><input type="hidden" name="status" value="${paused ? 'active' : 'paused'}"><button class="small" type="submit">${paused ? 'Resume' : 'Pause'}</button></form>
    <a href="/v1/admin?delete=${encodeURIComponent(a.id)}">Delete</a>
  </div></td>
</tr>`;
    })
    .join('');

  const application_rows = applications
    .map((a) => {
      const files = (a.attachments ?? [])
        .map(
          (file, index) =>
            `<a href="/v1/admin/applications/${encodeURIComponent(a.id)}/files/${index}" target="_blank" rel="noreferrer">${escape_html(file.name)}</a>`,
        )
        .join('<br>');
      return `<tr>
  <td><strong>${escape_html(a.name)}</strong><br><span class="muted">${escape_html(a.email)}</span></td>
  <td>${escape_html(a.age ?? '—')} · ${escape_html(a.country || '—')}</td>
  <td style="max-width:340px"><span class="muted">${escape_html(a.message || '')}</span><br>${escape_html(a.channel || '')}</td>
  <td>${files || '<span class="muted">—</span>'}</td>
  <td>${escape_html(String(a.created_at || '').slice(0, 10))}</td>
</tr>`;
    })
    .join('');

  const payout_rows = payouts
    .map(
      (p) => `<tr>
  <td>#${escape_html(p.id)}</td>
  <td><strong>${escape_html(p.name || p.email)}</strong><br><span class="muted">${escape_html(p.email)}</span></td>
  <td>${format_money(p.amount_cents)}</td>
  <td>${escape_html(String(p.requested_at || '').slice(0, 10))}</td>
  <td><div class="actions">
    <form method="post" action="/v1/admin/panel/payout"><input type="hidden" name="id" value="${escape_attr(p.id)}"><input type="hidden" name="status" value="paid"><button class="small" type="submit">Mark paid</button></form>
    <form method="post" action="/v1/admin/panel/payout"><input type="hidden" name="id" value="${escape_attr(p.id)}"><input type="hidden" name="status" value="rejected"><button class="small danger" type="submit">Reject</button></form>
  </div></td>
</tr>`,
    )
    .join('');

  const delete_html = delete_target
    ? `<div class="box" style="border-color:var(--bad)">
  <h3>Delete ${escape_html(delete_target.name || delete_target.email)}?</h3>
  <p class="muted">This permanently removes the account, its referral clicks, commissions and payout history. This cannot be undone.</p>
  <form method="post" action="/v1/admin/panel/delete">
    <input type="hidden" name="id" value="${escape_attr(delete_target.id)}">
    <button class="danger" type="submit">Delete permanently</button>
    <a href="/v1/admin" style="margin-left:12px">Cancel</a>
  </form>
</div>`
    : '';

  return page_shell(
    'Admin',
    `<div class="actions" style="justify-content:space-between">
  <h1>Partner admin</h1>
  <form method="post" action="/v1/admin/logout"><button class="small" type="submit">Sign out</button></form>
</div>
${flash_html}${created_html}${rotated_html}${delete_html}

<h2 id="create">Create account</h2>
<div class="box">
  <form method="post" action="/v1/admin/panel/create">
    <div class="row">
      <div><label class="k" for="admin_name">Name</label><input id="admin_name" name="name" maxlength="120" value="${escape_attr(values.name || '')}"></div>
      <div><label class="k" for="admin_email">Email</label><input id="admin_email" name="email" type="email" maxlength="254" value="${escape_attr(values.email || '')}" required></div>
    </div>
    <div style="margin-top:12px"><label class="k" for="admin_payout">Payout email (PayPal, optional)</label><input id="admin_payout" name="payout_email" type="email" maxlength="254" value="${escape_attr(values.payout_email || '')}"></div>
    <div style="margin-top:14px"><button type="submit">Create account</button></div>
  </form>
</div>

<h2>Accounts (${affiliates.length})</h2>
<div class="box" style="padding:0;overflow:auto">
  <table><thead><tr><th>Account</th><th>Code</th><th>Status</th><th>Activity</th><th>Earned</th><th>Actions</th></tr></thead><tbody>
  ${rows || '<tr><td colspan="6" class="muted">No affiliate accounts yet.</td></tr>'}
  </tbody></table>
</div>

<h2>Applications (${applications.length})</h2>
<div class="box" style="padding:0;overflow:auto">
  <table><thead><tr><th>Applicant</th><th>Age · country</th><th>About · where</th><th>PDFs</th><th>Received</th></tr></thead><tbody>
  ${application_rows || '<tr><td colspan="5" class="muted">No applications yet.</td></tr>'}
  </tbody></table>
</div>

<h2>Payout requests (${payouts.length})</h2>
<div class="box" style="padding:0;overflow:auto">
  <table><thead><tr><th>ID</th><th>Account</th><th>Amount</th><th>Requested</th><th>Actions</th></tr></thead><tbody>
  ${payout_rows || '<tr><td colspan="5" class="muted">No pending payout requests.</td></tr>'}
  </tbody></table>
</div>`,
  );
}

async function handle_admin_panel(request, env, pathname) {
  if (!(await admin_ok(request, env))) {
    return html(admin_login_page('Sign in first.'), 401);
  }

  let form = {};
  try {
    form = await read_form(request);
    const id = String(form.id ?? '').trim();
    if (pathname === '/v1/admin/panel/create') {
      const created = await create_affiliate(env.DB, env, form);
      const data = await load_admin_data(env);
      return html(admin_page(data, { created, flash: { ok: 'Account created.' } }));
    }

    if (pathname === '/v1/admin/panel/rotate') {
      const rotated = await rotate_affiliate_token(env.DB, env, id);
      const data = await load_admin_data(env);
      return html(
        admin_page(data, { rotated, flash: { ok: 'Previous dashboard link no longer works.' } }),
      );
    }

    if (pathname === '/v1/admin/panel/status') {
      await set_affiliate_status(env.DB, id, String(form.status ?? ''));
      return redirect('/v1/admin?ok=status');
    }

    if (pathname === '/v1/admin/panel/delete') {
      await delete_affiliate(env.DB, id);
      return redirect('/v1/admin?ok=deleted');
    }

    if (pathname === '/v1/admin/panel/payout') {
      const payout_id = Number.parseInt(String(form.id ?? ''), 10);
      const status = String(form.status ?? '');
      await update_payout_status(
        env.DB,
        payout_id,
        status,
        status === 'paid' ? 'paid from admin panel' : 'rejected from admin panel',
      );
      return redirect('/v1/admin?ok=payout');
    }

    return html(admin_login_page('Unknown admin action.'), 404);
  } catch (err) {
    const message = err instanceof PartnerError ? err.message : 'Admin action failed.';
    const data = await load_admin_data(env);
    return html(
      admin_page(data, { values: form, flash: { err: message } }),
      err instanceof PartnerError ? err.status : 500,
    );
  }
}

async function handle_admin(request, env, pathname) {
  if (!(await admin_ok(request, env))) {
    return json({ success: false, message: 'unauthorized' }, 401);
  }

  try {
    const file_match = pathname.match(
      /^\/v1\/admin\/applications\/([^/]+)\/files\/(\d+)$/,
    );
    if (file_match && request.method === 'GET') {
      const application = await get_application(
        env.DB,
        decodeURIComponent(file_match[1]),
      );
      const file = application.attachments[Number(file_match[2])];
      if (!file) return json({ success: false, message: 'file not found' }, 404);
      if (!env.APPLICATIONS_BUCKET) {
        return json({ success: false, message: 'file storage unavailable' }, 503);
      }
      const object = await env.APPLICATIONS_BUCKET.get(file.key);
      if (!object) return json({ success: false, message: 'file not found' }, 404);
      const filename = String(file.name || 'application.pdf')
        .replace(/[^A-Za-z0-9._ -]+/g, '_')
        .slice(0, 120);
      return new Response(object.body, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': `attachment; filename="${filename}"`,
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    }

    if (pathname === '/v1/admin/applications' && request.method === 'GET') {
      const status = new URL(request.url).searchParams.get('status');
      return json({ success: true, applications: await list_applications(env.DB, status) });
    }

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

    if (pathname === '/' || pathname === '') {
      return html(landing_page());
    }

    if ((pathname === '/apply' || pathname === '/apply/') && request.method === 'GET') {
      if (url.searchParams.get('received') === '1') {
        return html(application_received_page());
      }
      return html(application_page());
    }

    try {
      await ensure_schema(env.DB);
    } catch {
      return html(page_shell('Unavailable', '<h1>Partner service is temporarily unavailable.</h1>'), 503);
    }

    if (request.method === 'POST' && pathname === '/v1/apply') {
      let values = {};
      let attachments = [];
      try {
        const parsed = await read_application_form(request);
        values = parsed.values;
        // Honeypot: real people never fill this hidden field. Pretend success
        // so a bot cannot tell that its submission was discarded.
        if (String(values.website ?? '').trim()) return redirect('/apply?received=1');
        attachments = await upload_application_files(env, parsed.files);
        await create_application(env.DB, { ...values, attachments });
        return redirect('/apply?received=1');
      } catch (err) {
        if (attachments.length) {
          await Promise.allSettled(
            attachments.map((file) => env.APPLICATIONS_BUCKET?.delete(file.key)),
          );
        }
        const message =
          err instanceof PartnerError ? err.message : 'Could not send your application.';
        return html(
          application_page({ err: message }, values),
          err instanceof PartnerError ? err.status : 500,
        );
      }
    }

    if (pathname === '/v1/admin/login' && request.method === 'POST') {
      let token = '';
      try {
        token = String((await read_form(request)).token ?? '').trim();
      } catch {
        token = '';
      }
      if (await secret_matches(token, env.PARTNERS_ADMIN_TOKEN)) {
        return redirect('/v1/admin', 303, { 'set-cookie': admin_cookie(token) });
      }
      return html(admin_login_page('Invalid admin token.'), 401);
    }

    if (pathname === '/v1/admin/logout' && request.method === 'POST') {
      return redirect('/v1/admin', 303, { 'set-cookie': ADMIN_COOKIE_CLEAR });
    }

    if (pathname === '/v1/admin' && request.method === 'GET') {
      if (!(await admin_ok(request, env))) return html(admin_login_page());
      const data = await load_admin_data(env);
      const delete_id = url.searchParams.get('delete');
      const delete_target = delete_id
        ? data.affiliates.find((a) => a.id === delete_id) || null
        : null;
      return html(
        admin_page(data, { flash: admin_flash_from_url(url), delete_target }),
      );
    }

    if (request.method === 'POST' && pathname.startsWith('/v1/admin/panel/')) {
      return handle_admin_panel(request, env, pathname);
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
