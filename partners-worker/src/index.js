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
    "default-src 'none'; script-src 'sha256-C2Qu9gU/T9QUq//aVRRybKIEao2a/ORXWB9cn+mkbqw='; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
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
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
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
.grid.two{grid-template-columns:repeat(2,1fr)}
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
.legal{max-width:760px}.legal h1{font-size:clamp(30px,4.4vw,44px);margin-bottom:10px}.legal h2{font-size:19px;line-height:1.3;text-transform:none;letter-spacing:-.01em;margin:30px 0 8px}.legal p,.legal li{font-size:14px;line-height:1.78;color:var(--txt-2);margin:8px 0}.legal ul{padding-left:20px;margin:8px 0}.legal .meta{font-size:12.5px;color:var(--txt-3)}.legal code{font-size:12px}.legal a{color:var(--accent)}.terms-bar{position:sticky;top:64px;z-index:30;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);border-bottom:1px solid var(--border);padding:10px 0}
.terms-tools{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:760px}
.terms-search{display:flex;align-items:center;gap:9px;flex:1;height:44px;border:1px solid var(--border-strong);border-radius:10px;background:#fff;padding:0 12px;transition:border-color .15s,box-shadow .15s}
.terms-search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px rgba(79,70,229,.12)}
.terms-search input{flex:1;min-width:0;height:100%;border:0!important;background:transparent!important;padding:0!important;font-size:14px;box-shadow:none!important;outline:0}
.terms-search kbd{font:600 10px/1 var(--mono);color:var(--txt-3);border:1px solid var(--border);border-bottom-width:2px;border-radius:5px;padding:4px 6px;background:var(--bg-subtle)}
.terms-search button{width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:50%;background:var(--bg-subtle);color:var(--txt-2);font:400 17px/1 Inter,sans-serif;padding:0}
.terms-search button:hover{background:var(--border);color:var(--txt)}
.terms-meta{display:flex;flex-direction:column;align-items:flex-end;gap:1px;font-size:11px;color:var(--txt-3);white-space:nowrap;font-variant-numeric:tabular-nums}
.terms-meta span:first-child{font-weight:600;color:var(--txt-2)}
.toc{max-width:760px;margin:18px 0 0;display:grid;grid-template-columns:repeat(3,1fr);gap:1px 20px}
.toc[hidden]{display:none}
.toc a{font-size:12.5px;line-height:1.5;color:var(--txt-3);text-decoration:none;padding:2px 0;border-radius:3px}
.toc a:hover{color:var(--accent)}
.toc a.toc-key{color:var(--accent);font-weight:600}
.terms-empty{max-width:760px;margin:22px 0 0;padding:16px 18px;border:1px dashed var(--border-strong);border-radius:10px;display:flex;flex-direction:column;gap:4px;font-size:13.5px;color:var(--txt-2)}
.terms-empty[hidden]{display:none}
.terms-empty strong{color:var(--txt)}
.clause{padding-top:2px}
.clause[hidden]{display:none}
.legal ol.flow{counter-reset:step;list-style:none;padding:0;display:grid;gap:9px;margin:14px 0 18px}
.legal ol.flow li{counter-increment:step;position:relative;padding:12px 15px 12px 48px;border:1px solid var(--border);border-radius:10px;background:var(--bg-subtle);font-size:13.5px;line-height:1.65}
.legal ol.flow li:before{content:counter(step);position:absolute;left:14px;top:12px;width:23px;height:23px;border-radius:50%;background:var(--accent);color:#fff;font:700 11px/23px Inter,sans-serif;text-align:center}
.legal .callout{border-left:3px solid var(--accent);background:var(--accent-soft);padding:13px 16px;border-radius:0 8px 8px 0;margin:16px 0;font-size:13.5px;line-height:1.65;color:#3730a3}
.legal .callout strong{color:var(--txt)}
.legal .callout-key{border-color:var(--amber);background:var(--amber-soft);color:#92400e}
.legal h2.clause-key{color:var(--accent)}
.legal .example{border:1px solid var(--border);border-radius:10px;margin:18px 0;overflow:hidden}
.legal .example-head{padding:9px 14px;background:var(--bg-subtle);border-bottom:1px solid var(--border);font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--txt-3)}
.legal .example table{font-size:13px}
.legal .example td{padding:8px 14px;border-bottom:1px solid var(--border)}
.legal .example tr:last-child td{border-bottom:0}
.legal .example td:last-child{text-align:right;font-weight:600}
.legal .example p{padding:9px 14px;margin:0;font-size:11.5px;line-height:1.5;color:var(--txt-3);border-top:1px solid var(--border)}
.legal ul.defs{list-style:none;padding:0;margin:10px 0}
.legal ul.defs li{padding:5px 0;border-bottom:1px solid var(--border);margin:0}
.legal ul.defs li:last-child{border-bottom:0}
mark.tm{background:#fef08a;color:inherit;border-radius:2px;padding:0 1px;box-shadow:0 0 0 1px #fde68a}
@media(max-width:720px){.terms-bar{top:56px}.terms-tools{max-width:none;gap:10px}.terms-meta span:last-child{display:none}.terms-search kbd{display:none}.toc{grid-template-columns:1fr 1fr;gap:0 14px}.toc a{font-size:12px}}
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
@media(max-width:720px){.header-in{height:auto;flex-wrap:wrap;padding:10px 0;row-gap:6px}nav.main{display:flex;width:100%;order:3;gap:18px;overflow-x:auto;-webkit-overflow-scrolling:touch}nav.main a{white-space:nowrap;font-size:13.5px;padding:6px 0}section{padding:52px 0}section.hero{padding:54px 0 46px}.hero-grid{gap:30px}.stat-strip{grid-template-columns:1fr}.stat+.stat{border-left:0;border-top:1px solid var(--border)}.grid.two{grid-template-columns:1fr}.foot-grid{grid-template-columns:1fr 1fr}}
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
  <div><h5>Program</h5><a href="/">Overview</a><a href="/apply">Apply</a><a href="/terms">Terms</a><a href="mailto:contact@hartwell-labs.pl?subject=Talus%20Partners%20dashboard%20link">Dashboard link</a></div>
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
  <p style="margin-top:18px"><a href="/terms">Full program terms →</a></p>
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


function terms_page() {
  return page_shell(
    'Partner program terms',
    `<section class="hero" style="padding-bottom:18px">
  <div class="legal">
    <div class="eyebrow">Legal</div>
    <h1>Partner Program Terms</h1>
    <p class="meta">Version 2.0 &middot; Effective 17 November 2026 &middot; Hartwell Labs, Szczecin, Poland</p>
    <p class="lede" style="font-size:15px">These terms govern participation in the Talus Partner Program. By applying, accepting a referral link or requesting a payout, you agree to them. Section 1 explains the whole arrangement in plain language; the sections after it are the binding agreement.</p>
  </div>
</section>

<div class="terms-bar">
  <div class="wrap">
    <div class="terms-tools">
      <div class="terms-search">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="#64748b" stroke-width="1.8"/><path d="m16.5 16.5 4 4" stroke="#64748b" stroke-width="1.8" stroke-linecap="round"/></svg>
        <input id="terms-search" type="search" placeholder="Search the terms &mdash; equity, payouts, termination&hellip;" aria-label="Search the terms" autocomplete="off" spellcheck="false">
        <kbd aria-hidden="true">/</kbd>
        <button type="button" id="terms-clear" aria-label="Clear search" hidden>&times;</button>
      </div>
      <div class="terms-meta"><span id="terms-count" aria-live="polite">23 sections</span><span>Version 2.0</span></div>
    </div>
  </div>
</div>

<nav class="toc" id="terms-toc" aria-label="Contents">
  <a href="#summary">1. The short version</a>
  <a href="#scope">2. Scope</a>
  <a href="#definitions">3. Definitions</a>
  <a href="#eligibility">4. Eligibility</a>
  <a href="#attribution">5. Attribution</a>
  <a href="#commission">6. Commission</a>
  <a href="#payouts">7. Payouts</a>
  <a href="#obligations">8. Your obligations</a>
  <a href="#prohibited">9. Prohibited conduct</a>
  <a href="#ip">10. Intellectual property</a>
  <a href="#confidentiality">11. Confidentiality</a>
  <a href="#data">12. Data protection</a>
  <a href="#term">13. Term and termination</a>
  <a href="#equity" class="toc-key">14. Founding equity</a>
  <a href="#warranties">15. Representations</a>
  <a href="#indemnity">16. Indemnity</a>
  <a href="#liability">17. Liability</a>
  <a href="#force-majeure">18. Force majeure</a>
  <a href="#changes">19. Changes</a>
  <a href="#notices">20. Notices</a>
  <a href="#general">21. General</a>
  <a href="#law">22. Governing law</a>
  <a href="#contact">23. Contact</a>
</nav>

<div class="terms-empty" id="terms-empty" hidden>
  <strong>No section matches that search.</strong>
  <span>Try a broader word: &ldquo;equity&rdquo;, &ldquo;payout&rdquo;, &ldquo;refund&rdquo;, &ldquo;termination&rdquo; or &ldquo;tax&rdquo;.</span>
</div>

<section style="padding-top:10px">
  <div class="legal" id="terms-doc">

    <h2 id="summary">1. The short version</h2>
    <p>This section is a map, not a substitute for the terms. Where it differs from a later section, the later section wins.</p>
    <ol class="flow">
      <li><strong>Apply.</strong> We review every application by hand and accept or decline it in writing.</li>
      <li><strong>Get your link.</strong> If accepted, you receive a private dashboard and a tracked referral link.</li>
      <li><strong>Refer.</strong> A new customer clicks your link. We attribute the purchase to you for 90 days.</li>
      <li><strong>Earn.</strong> You receive 20% of Net Revenue on the first invoice and on every renewal, for as long as the customer stays.</li>
      <li><strong>Get paid.</strong> Request a payout from the dashboard. We review it and pay, normally within 14 business days.</li>
      <li><strong>Founding affiliates.</strong> The first four approved affiliates may, at our sole discretion, be considered for up to 0.5% equity after the company has existed for five years. This is a possibility, not a promise. Section 14 controls.</li>
    </ol>
    <div class="callout">
      <strong>The one number to remember:</strong> 20% of what we actually collect, recurring. No one-time bounty, no fixed cap.
    </div>

    <h2 id="scope">2. Scope and acceptance</h2>
    <p>Hartwell Labs (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the Talus Partner Program (the &ldquo;Program&rdquo;) from Szczecin, Poland. The Program lets approved affiliates (&ldquo;Affiliate&rdquo;, &ldquo;you&rdquo;) refer customers to Talus, an eBPF-based ransomware detection and response product for Linux, and earn a commission on collected revenue.</p>
    <p>You accept these terms when you submit an application, use a referral link, access the dashboard or request a payout. The agreement between us consists of these terms, your written acceptance and any notices we publish in the dashboard. If you do not agree, do not participate.</p>
    <p>The Program is free to join. It does not create employment, agency, franchise, joint venture, partnership or fiduciary duties. You are an independent contractor and may not bind the Company or speak as its official representative.</p>
    <p>If you act as a consumer within the meaning of Polish or EU law, mandatory consumer-protection provisions apply and prevail over anything in these terms that would reduce your statutory rights. Nothing here is legal, tax or investment advice to you.</p>

    <h2 id="definitions">3. Definitions</h2>
    <p>These words have the following meanings throughout the agreement.</p>
    <ul class="defs">
      <li><strong>Affiliate</strong> &mdash; a person or entity accepted into the Program in writing by the Company.</li>
      <li><strong>Application</strong> &mdash; the form and materials you submit to join the Program.</li>
      <li><strong>Attribution Window</strong> &mdash; 90 days from the click on your Referral Link.</li>
      <li><strong>Business Day</strong> &mdash; Monday to Friday, excluding Polish public holidays.</li>
      <li><strong>Commission</strong> &mdash; 20% of Net Revenue, calculated under section 6.</li>
      <li><strong>Company</strong> &mdash; Hartwell Labs, Szczecin, Poland.</li>
      <li><strong>Confidential Information</strong> &mdash; non-public information described in section 11.</li>
      <li><strong>Customer</strong> &mdash; a person or entity that was not already a paying Talus customer at the time of the click and that purchases a subscription after an eligible click on your Referral Link.</li>
      <li><strong>Dashboard</strong> &mdash; the private web page where you see clicks, referrals, Commission and payouts.</li>
      <li><strong>Founding Affiliate</strong> &mdash; one of the first four Affiliates approved into the Program, as recorded by the Company under section 14.</li>
      <li><strong>Net Revenue</strong> &mdash; the pre-tax amount actually collected from a Customer, less refunds, chargebacks, payment-processor fees, taxes and any amount the Company does not ultimately retain.</li>
      <li><strong>Program</strong> &mdash; the Talus Partner Program operated under these terms.</li>
      <li><strong>Referral Link</strong> &mdash; the tracked link or code assigned to you in the Dashboard.</li>
      <li><strong>Talus</strong> &mdash; the Talus process monitor product line, including its MIT community edition and licensed enterprise edition.</li>
      <li><strong>Taxes</strong> &mdash; VAT, sales tax, withholding, social contributions and any similar charge.</li>
      <li><strong>Term</strong> &mdash; the period from written acceptance until termination under section 13.</li>
    </ul>

    <h2 id="eligibility">4. Eligibility and enrollment</h2>
    <p>You must be at least 18 years old, have legal capacity to contract, and not be barred from the Program by law, sanctions or a previous removal for cause. If you apply on behalf of a company, you confirm that you are authorised to bind it.</p>
    <p>We review every Application manually. We may accept or decline it for any lawful reason, including audience quality, brand fit, compliance risk or the existence of a conflict. We do not have to give a reason for a decline, and a decline is not a breach of these terms.</p>
    <p>Enrollment takes effect when we send a written acceptance and Dashboard access. We may ask for business details, tax forms or identity verification before enrollment or before a payout, and may withhold payment until verification is complete. We may limit the number of active Affiliates and close enrollment at any time.</p>
    <p>You may hold one Affiliate account unless we agree otherwise in writing. You must keep your details accurate and must not apply through automated means, false identities or another person&rsquo;s details.</p>

    <h2 id="attribution">5. Attribution</h2>
    <p>A click on your Referral Link stores your code in the buyer&rsquo;s browser for 90 days. At checkout the code travels to Stripe as <code>client_reference_id</code>; our webhook records the resulting Commission in your ledger. This is the chain we rely on.</p>
    <p>The most recent eligible click before checkout replaces an earlier one. Attribution depends on the buyer using the same browser, not blocking or deleting cookies, and completing the purchase within the Attribution Window. We do not attribute direct visits, purchases on another device, purchases after the window, or purchases influenced by another channel that we cannot verify.</p>
    <p>Our ledger is presumptive evidence of attribution. If you believe a referral is missing, write to us within 30 days of the invoice with the order, date, link and any supporting evidence. We will review it in good faith and correct genuine errors. We do not adjust the ledger for suspected but unverifiable referrals.</p>
    <p>No Commission is payable on an order that results from prohibited conduct, even if the technical attribution is present.</p>

    <h2 id="commission">6. Commission</h2>
    <p>We pay <strong>20% of Net Revenue</strong> on the first paid invoice and on every renewal for as long as the Customer remains subscribed. Commission is recurring, not a one-time bounty.</p>
    <p>Net Revenue excludes Taxes, refunds, chargebacks, payment-processor fees, credits, write-offs, amounts never collected and any amount the Company does not ultimately retain. If a Customer pays in a currency other than USD, we convert at the rate our payment processor reports on the collection date.</p>
    <p>No Commission is payable on purchases by you, your employees, contractors or related parties; on fraudulent, disputed or test orders; on orders generated through prohibited conduct; on customers that already had a paid Talus subscription before the click; or on amounts that are later reversed.</p>
    <p>If a payment is refunded or charged back, the related Commission is reversed proportionally. If the reversal exceeds your available balance, the negative amount may be offset against future Commission. Commission is not salary, does not accrue benefits, and does not create an employment relationship.</p>
    <div class="example">
      <div class="example-head">Worked example &mdash; illustrative only</div>
      <table>
        <tbody>
          <tr><td>Customer pays</td><td>$100 per month</td></tr>
          <tr><td>Your Commission</td><td>$20 per month</td></tr>
          <tr><td>Customer stays 12 months</td><td>$240 in total</td></tr>
          <tr><td>One $100 invoice is refunded</td><td>$20 is reversed</td></tr>
        </tbody>
      </table>
      <p>Actual amounts depend on the customer&rsquo;s plan, currency, taxes and payments collected. This example is not a promise of earnings.</p>
    </div>

    <h2 id="payouts">7. Payouts</h2>
    <p>You can request a payout from the Dashboard whenever your available balance is above zero. We review each request manually and normally process approved payouts within 14 Business Days. PayPal is the default method; payment by invoice is available where we agree in writing.</p>
    <p>Payouts are made in USD to an account in your name. Currency conversion and payment-provider fees may be deducted. We may set a reasonable minimum payout amount in the Dashboard; if we do, it applies equally to all Affiliates. We do not pay interest on balances.</p>
    <p>You are responsible for your own Taxes, social contributions and any registration required where you live. We may withhold amounts required by law and may ask for a tax form before paying. You must tell us promptly if your tax status or payout details change.</p>
    <p>We may pause a payout while we investigate fraud, a chargeback, a duplicate account or a breach of these terms. A pause is not a forfeiture; once the review ends, we release what is properly payable or explain in writing what was reversed and why.</p>
    <p>If you dispute a statement, write to us within 30 days of the payout or statement date. After that period, the statement is treated as accepted, except for manifest error or fraud.</p>

    <h2 id="obligations">8. Your obligations</h2>
    <ul>
      <li>Promote Talus honestly, with claims you can support from our published documentation.</li>
      <li>Clearly disclose that you earn a commission, wherever you promote the Program and in line with advertising and consumer-protection rules.</li>
      <li>Comply with all applicable laws, platform rules, anti-spam rules and sanctions.</li>
      <li>Do not promise security outcomes, certifications, savings or performance that Talus does not guarantee.</li>
      <li>Keep your Dashboard link, login and payout details secure. Anyone with the link can see your balance and request a payout.</li>
      <li>Keep your contact, business and tax details accurate and respond to reasonable verification requests.</li>
      <li>Maintain the audience or channel you described in your Application; if it changes materially, tell us.</li>
    </ul>
    <p>You are responsible for your content, your audience and anyone who acts on your behalf. We are not responsible for statements you make that go beyond our published materials.</p>

    <h2 id="prohibited">9. Prohibited conduct</h2>
    <p>The following is not permitted:</p>
    <ul>
      <li>unsolicited bulk email, messages, comments or automated DMs;</li>
      <li>coupon, cashback, rebate, deal or &ldquo;discount code&rdquo; sites, unless we approve the channel in writing;</li>
      <li>paid search or social bidding on &ldquo;Talus&rdquo;, &ldquo;Hartwell Labs&rdquo; or confusingly similar terms;</li>
      <li>registering domains, social handles or ads that impersonate Talus or the Company;</li>
      <li>cookie stuffing, click fraud, forced redirects, adware, malware or traffic from botnets;</li>
      <li>self-referrals, circular referrals, fake customers or purchases made to generate Commission;</li>
      <li>fake reviews, fabricated endorsements or paid engagement that is not disclosed;</li>
      <li>incentivising clicks or purchases in a way that is not clearly disclosed;</li>
      <li>reselling, sharing or publishing license keys, or distributing the licensed enterprise binary;</li>
      <li>reverse engineering the licensed binary except where mandatory law permits it;</li>
      <li>violating privacy, data-protection, intellectual-property or export-control law;</li>
      <li>any other conduct that is unlawful, deceptive or harms the Company or its customers.</li>
    </ul>
    <p>We may withhold or reclaim Commission connected to prohibited conduct, suspend the account during an investigation and terminate immediately. We may also report conduct to the relevant platform or authority where the law requires or permits it.</p>

    <h2 id="ip">10. Intellectual property and brand use</h2>
    <p>We grant you a limited, revocable, non-exclusive, non-transferable licence to use the Talus name, logo and approved marketing materials solely to promote the Program during the Term. You may not modify the marks, combine them with your own marks in a confusing way, register domain names or social handles similar to them, or use them after termination.</p>
    <p>All goodwill from your use belongs to the Company. You may not suggest that you are Talus, an official reseller, a certified partner or an employee unless we say so in writing. The MIT community edition remains under the MIT licence; the licensed enterprise edition is governed by its own commercial licence and is not redistributable.</p>
    <p>If you send us feedback or suggestions, you grant us a perpetual, worldwide, royalty-free licence to use them without obligation to you. This does not transfer your own pre-existing content or customer list.</p>

    <h2 id="confidentiality">11. Confidentiality</h2>
    <p>Confidential Information includes your Dashboard link, Commission data, customer information, unpublished pricing, roadmaps, security details and any non-public business information we share. You may use it only to perform under these terms and must protect it with at least reasonable care.</p>
    <p>This does not apply to information that is public without your breach, that you already lawfully knew, that you receive from a third party without a duty of confidence, or that the law requires you to disclose (after notice where lawful).</p>
    <p>The duty lasts during the Term and for three years after it, and indefinitely for trade secrets. On termination you must stop using Confidential Information and delete or return it on request. A breach may cause harm that money cannot repair, so we may seek injunctive relief in addition to other remedies.</p>

    <h2 id="data">12. Data protection and privacy</h2>
    <p>The Company is the controller of personal data processed to run the Program. We process your contact, business, payout and tax details to assess your Application, administer the Program, prevent fraud, pay Commission and comply with law. The legal bases are performance of these terms, our legitimate interests and legal obligations.</p>
    <p>We share data only with providers that help us run the Program &mdash; for example Stripe for payments, Cloudflare for hosting and our email provider &mdash; under appropriate safeguards. Some providers may process data outside the EEA; where that happens, we rely on an adequacy decision or standard contractual clauses. We do not sell personal data.</p>
    <p>We keep data for as long as you participate and for the period needed to meet tax, accounting, fraud-prevention and limitation obligations. You may request access, correction, deletion, restriction, portability or objection by writing to <a href="mailto:contact@hartwell-labs.pl">contact@hartwell-labs.pl</a>. You may also complain to the Polish supervisory authority (UODO).</p>
    <p>Attribution cookies are used only to measure referrals and are described in our cookie notice. If you collect your own leads, you are an independent controller for that data and must have your own lawful basis and privacy notice. Do not send us personal data you are not allowed to share.</p>

    <h2 id="term">13. Term, suspension and termination</h2>
    <p>These terms apply from written acceptance until terminated. Either party may terminate with 30 days&rsquo; written notice. We may suspend or terminate immediately for breach, prohibited conduct, fraud, a security risk, a legal requirement or conduct that harms the Company or its customers.</p>
    <p>On termination you must stop promoting Talus, remove your Referral Link and stop using the Company&rsquo;s marks. Dashboard access ends. Commission properly earned on Customers acquired before termination remains payable under section 7, subject to refunds, chargebacks, holds and these terms. We do not pay compensation for lost opportunity, goodwill or expected future Commission.</p>
    <p>Sections that by their nature should survive &mdash; including definitions, confidentiality, intellectual property, data protection, indemnity, liability, general provisions and governing law &mdash; survive termination. Termination does not affect accrued rights or remedies.</p>

    <h2 id="equity" class="clause-key">14. Founding affiliate equity consideration (first four affiliates)</h2>
    <div class="callout callout-key">
      <strong>Read this section as a possibility, not a promise.</strong> The Company may decide to offer equity. It is never obliged to, and no Affiliate has a claim to it.
    </div>
    <p><strong>Who is eligible.</strong> This section applies only to the first four Affiliates approved into the Program, determined by the timestamp of the Company&rsquo;s written acceptance. The Company&rsquo;s record of that order is conclusive. It does not apply to any other Affiliate, regardless of performance, revenue or tenure.</p>
    <p><strong>What may happen.</strong> After the Company has existed for five years, the Company <strong>may</strong>, in its sole and absolute discretion, decide to offer an eligible Founding Affiliate a grant of up to <strong>0.5% of the Company&rsquo;s shares</strong>. The Company may also decide not to grant any equity, to grant less than 0.5%, or to make an offer to fewer than four Affiliates. Each case is considered individually.</p>
    <p><strong>No entitlement.</strong> Nothing in these terms, the Program, an acceptance email, a Dashboard, a Referral Link or any communication creates an obligation, promise, expectation or right to receive shares, options, dividends, profit participation or any other equity interest. Eligibility is not a guarantee and may not be relied on for any purpose, including raising finance, making a claim or valuing your business.</p>
    <p><strong>Conditions.</strong> Any grant would be subject to the Company&rsquo;s board and shareholder approvals, satisfactory due diligence, definitive grant and shareholder agreements, vesting and leaver provisions, and any other conditions the Company requires. The Company does not promise any valuation, liquidity event, dividend, information right or exit. Any shares would be subject to dilution and to the Company&rsquo;s constitutional documents. Nothing here obliges the Company to create an option pool or reserve shares.</p>
    <p><strong>When eligibility ends.</strong> Eligibility ends automatically on termination for cause, material breach, fraud or prohibited conduct, or after 12 consecutive months without an active referral. Eligibility is personal and may not be transferred, assigned or inherited. Any grant would be subject to the tax rules applicable to you at the time.</p>
    <p><strong>Not an offer of securities.</strong> This section is not an offer of securities, investment advice or a promise of future employment or engagement. Any actual offer would be made in a separate document and only where lawful.</p>

    <h2 id="warranties">15. Representations and warranties</h2>
    <p>You represent that you have authority to enter these terms, that your participation does not breach any agreement or law, that the information you give us is true and complete, and that your promotion will not contain malware, unlawful content or misleading claims. You will tell us promptly if any of this changes.</p>
    <p>We represent that we operate the Program with reasonable skill and care and that we have the right to grant the licences in section 10. We do not warrant that the Program will be uninterrupted, error-free or produce any particular number of clicks, customers or revenue.</p>

    <h2 id="indemnity">16. Indemnity</h2>
    <p>You will indemnify and hold harmless the Company, its directors, employees and contractors from third-party claims, losses, liabilities, damages and reasonable costs (including legal fees) arising from your promotion of Talus, your breach of these terms, your violation of law, or your infringement of intellectual-property, privacy or publicity rights.</p>
    <p>We will notify you promptly of a covered claim, may control its defence, and will reasonably cooperate. You may not settle a claim in a way that admits fault by the Company without our written consent. This section does not apply to the extent the claim is caused by our own breach, negligence or wilful misconduct.</p>

    <h2 id="liability">17. Limitation of liability</h2>
    <p>To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, data, goodwill or business opportunity, even if advised of the possibility.</p>
    <p>Our aggregate liability under these terms is limited to the Commission paid or payable to you in the six months before the event giving rise to the claim. This cap does not apply to fraud, wilful misconduct, death or personal injury caused by negligence, or any liability that mandatory law does not allow us to limit.</p>
    <p>We do not guarantee any level of traffic, sales, revenue or Commission. You decide whether participating is worthwhile; we do not reimburse your costs, advertising spend or time.</p>

    <h2 id="force-majeure">18. Force majeure</h2>
    <p>Neither party is liable for a delay or failure caused by an event beyond its reasonable control, including natural disaster, war, civil unrest, epidemic, network or hosting failure, government action, sanctions or a prolonged third-party payment outage. The affected party will notify the other promptly and use reasonable efforts to resume. If the event lasts more than 30 days, either party may terminate.</p>

    <h2 id="changes">19. Changes to the Program and these terms</h2>
    <p>We may update these terms to reflect changes in the Program, law, payment rails or our business. We will give at least 14 days&rsquo; notice by email or in the Dashboard before a material change takes effect. Continued participation after the effective date means acceptance. If you do not agree, you may terminate before the change takes effect.</p>
    <p>Changes do not apply retroactively to Commission already earned. We may change or close the Program, but we will honour properly earned Commission under section 7.</p>

    <h2 id="notices">20. Notices</h2>
    <p>We may send notices to the email address on your Application or publish them in the Dashboard. You are responsible for keeping that address current. A notice is treated as received 24 hours after sending, unless we receive a delivery failure. Legal notices to the Company must go to <a href="mailto:contact@hartwell-labs.pl">contact@hartwell-labs.pl</a>.</p>

    <h2 id="general">21. General</h2>
    <p>These terms are the entire agreement about the Program and replace earlier discussions. If a provision is invalid, the rest stays in force and the invalid part is replaced by the closest lawful meaning. A failure to enforce a right is not a waiver. You may not assign these terms without our written consent; we may assign them to a successor of the business. No third party has rights under this agreement except as stated in section 16.</p>
    <p>Headings are for navigation only. The English version prevails over any translation. Where these terms conflict with your written acceptance, these terms prevail unless the acceptance expressly says otherwise.</p>

    <h2 id="law">22. Governing law and disputes</h2>
    <p>These terms are governed by Polish law, without regard to conflict-of-law rules. Before starting proceedings, the parties will try in good faith for 30 days to resolve the dispute through the contact address in section 23. If that fails, the competent courts for Szczecin, Poland, have jurisdiction, subject to any mandatory consumer forum.</p>
    <p>Nothing in this section prevents either party from seeking urgent injunctive relief to protect confidentiality or intellectual property. If you are a consumer, mandatory rules on jurisdiction and applicable law still apply.</p>

    <h2 id="contact">23. Contact and version</h2>
    <p>Questions, notices and disputes: <a href="mailto:contact@hartwell-labs.pl">contact@hartwell-labs.pl</a>. Hartwell Labs, Szczecin, Poland.</p>
    <p class="meta">Version 2.0 &middot; 17 November 2026. Version 1.0 was published on the same date and replaced by this version. This document is not legal advice to you; if you need advice about your own position, consult a lawyer.</p>

  </div>
</section>

<script>
(function () {
  'use strict';
  var doc = document.getElementById('terms-doc');
  if (!doc) return;
  var input = document.getElementById('terms-search');
  var clear = document.getElementById('terms-clear');
  var count = document.getElementById('terms-count');
  var empty = document.getElementById('terms-empty');
  var toc = document.getElementById('terms-toc');
  var headings = Array.prototype.slice.call(doc.querySelectorAll('h2'));
  var clauses = [];

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  headings.forEach(function (heading) {
    var box = document.createElement('div');
    box.className = 'clause';
    heading.parentNode.insertBefore(box, heading);
    var node = heading;
    while (node) {
      var next = node.nextSibling;
      if (node !== heading && node.nodeType === 1 && node.tagName === 'H2') break;
      box.appendChild(node);
      if (!next) break;
      node = next;
    }
    clauses.push({ el: box, text: normalize(box.textContent) });
  });

  function clearMarks() {
    Array.prototype.slice.call(doc.querySelectorAll('mark.tm')).forEach(function (mark) {
      var parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });
  }

  function markTokens(box, tokens) {
    var walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (!node.nodeValue.trim()) return;
      var text = node.nodeValue;
      var lower = text.toLowerCase();
      var ranges = [];
      tokens.forEach(function (token) {
        if (token.length < 2) return;
        var from = 0;
        while (from < lower.length) {
          var at = lower.indexOf(token, from);
          if (at < 0) break;
          ranges.push([at, at + token.length]);
          from = at + token.length;
        }
      });
      if (!ranges.length) return;
      ranges.sort(function (a, b) { return a[0] - b[0]; });
      var merged = [];
      ranges.forEach(function (range) {
        var last = merged[merged.length - 1];
        if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
        else merged.push(range.slice());
      });
      var fragment = document.createDocumentFragment();
      var cursor = 0;
      merged.forEach(function (range) {
        if (range[0] > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, range[0])));
        var mark = document.createElement('mark');
        mark.className = 'tm';
        mark.textContent = text.slice(range[0], range[1]);
        fragment.appendChild(mark);
        cursor = range[1];
      });
      if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
      node.parentNode.replaceChild(fragment, node);
    });
  }

  function apply() {
    var query = normalize(input.value);
    var tokens = query ? query.split(' ') : [];
    var shown = 0;
    clearMarks();
    clauses.forEach(function (clause) {
      var match = !tokens.length || tokens.every(function (token) {
        return clause.text.indexOf(token) >= 0;
      });
      clause.el.hidden = !match;
      if (match) shown++;
    });
    if (tokens.length) clauses.forEach(function (clause) {
      if (!clause.el.hidden) markTokens(clause.el, tokens);
    });
    count.textContent = tokens.length
      ? shown + (shown === 1 ? ' section matches' : ' sections match')
      : clauses.length + ' sections';
    empty.hidden = shown !== 0 || !tokens.length;
    toc.hidden = tokens.length > 0;
    clear.hidden = !input.value;
  }

  input.addEventListener('input', apply);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      input.value = '';
      apply();
      input.blur();
    }
  });
  clear.addEventListener('click', function () {
    input.value = '';
    apply();
    input.focus();
  });
  document.addEventListener('keydown', function (event) {
    var tag = (event.target && event.target.tagName) || '';
    if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });

  apply();
})();
</script>`,
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
      <p class="muted" style="font-size:12px;margin:16px 0 0">By submitting this application you agree to the <a href="/terms">Partner Program Terms</a>.</p>
      <button type="submit" style="margin-top:14px">Send application →</button>
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

const SITE_ICONS = {
  "/favicon.svg": { type: "image/svg+xml", b64: "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NiA0NiI+CiAgPHBhdGggZD0iTTIzLDMuNSBMNDAuNSwxMy41IEw0MC41LDMyLjUgTDIzLDQyLjUgTDUuNSwzMi41IEw1LjUsMTMuNSBaIiBmaWxsPSJub25lIiBzdHJva2U9IiM0ZjQ2ZTUiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgogIDxwb2x5bGluZSBwb2ludHM9IjEzLDI2LjUgMTksMjYuNSAyMiwxNyAyNiwyOS41IDI5LDI0IDMzLDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0ZjQ2ZTUiIHN0cm9rZS13aWR0aD0iMy4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==" },
  "/favicon.ico": { type: "image/x-icon", b64: "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" },
  "/apple-touch-icon.png": { type: "image/png", b64: "iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAYAAAA9zQYyAABXiUlEQVR4nO39yZNcWZbmif2++97TWW02hWF0uEdHZtKjpJJZqJYMklIEKFLJCrJTWCvLDZtSuQqpTfNfQOBf4IoVK5awVoFVd0cJU9gLwqVZxSxhOrszqwOSWZHhDsdkBpvNVE3Hd+/HxVP4FPBwA+AD4I5PxF3gg+q7776j5517zne+A2/wBt8h6NtewHcX/pK9lb+ZdXy/kH/bC/iu4eZNh62t97PJhCw+Jjtp7oXpVAKo1eyF0VrKLhDr9b+K589fi7duKX3ba/4u4Y2H/oqxyS+y0Z/+r+pAqyjrjTLOCjTLAHAR86yYzfLJGBhe++WF8S3eGPRXiTce+itG/yf/8zyn26qNx8sl08Uszxp2kQMohDKW03GtLI6njQb/4Se/jvwFk297zd8lvPHQLwXrJujuJlr+gDBc2a6dQlvTfIXarGe8atSWVVT/t2fCp0L7TIsd18qDAZy+fbAx/bvOHd9470a6BfPY+k2M/SJ4Y9AvgJs4/PLa+9k77/RyDme1Uq36zKmRo3amuJCcrxHogVcNbdtzg9ZMcBrQPokd0L7Jjz3rj2q0xkWnPpkNJrN+83jW7f6wvH1b8du+19cNb0KOF8DdTfQ/O7pYOz2i7eguhZckVkxaKa3VJK9iVmUvIjWBAgC7tDVMwccmHQR0kBwPQ61+MAs+msThseqpX6+v9+FXQ+CNQT8n3hj0C+DBg/9Pbb31TieG0Uqh2pqSzkvpkoMuyKwLrwi6Fi3hOpDNPxodNIE0kkLf6EjB+05+QvLjTGx7FnbDbBQm3XPReKY3ocdz4U3I8YWo8sg26Gc/081bcOf6jVCr/UE9hGyhRlyRyx4xXAiBK0l+B7gCoSfSIlbDoia7sAgAMglUImbgCYQTwx5Oj1H4KJAeKOWPyNOWAjvDVDscjVaHN26QuAXchFu38Jv4+ovxxqC/AJubzuBX2Wi0nDfHzaKfj2t56aZi2SXPl0isSfQSPh8CV4Tesn1JsAq0kWo2QXNj/hi2jZKgRAyNDpTSNiE8sP0Q9BjSFvITpWJvFtNJPdcod30yaoxmzQ8Oy3c3f1S+yV8/G29Cji/A8geE7XpW7zSy1ljDxVr0chIrKvKV5LSqkK/YaS1Ia9jnwD3EiqErqAPSs9yFJKEMyGwksIMQZEhtm5VA6NnsQtot6nE/xnzfxfCwM8yPh0vnhr/85fsG3hj0M/DGQz8Dm5vO2NlplmnUjUVtmVznlHwpKV7C2kCsCpYRi5gFoAtqS24BddCZHIXthMJE9tjoFNJA0rHQUSIdYPaMtoL10EEPKf2kHrODei31J0v//fj27T97c2j8HN4Y9Kc4F5ubhJ2de0WnE5r5LOvkpZdnhXqYyyS9Lfz2/OC3ilgwbss0LRVAhh2AoGf75mdd2zZJwlixylMzsjkVOkl4P4hHSvowBX+IeFAo35mU8agZ4mBnEoe93tXZu+/iKraG73t8/T03aOv6dbJe70HR74+LYpo1k/J2HrIFOSzacU1Z1kvmkkhvGa4gnQOWhNs2DUnZl17meVZkR8QYdAocYT8BP4DsXhAPDTtGB5nS8TSmfkY6jWNGWsonFy5cmJ3/OfH7XE7/3sfQV7mX748m7cakuTgrtBpivmJ51faaQlgH1iGes0JP9jqwaOgY6pLCl33/80JSZruJHIQEBCvkOLXtsA7sS96P9kEewkFZhv2iob1pyg6HH27377Ix/qrX9Drhe+uhjfVnmxTF8H67P9NqKLPzClwyvmBpA1Ed9KxllJYgtDFNRB1cF2Rw1tDiuVdnoxKYYibII6EBuI/DkeEAaQ/ijpIeAQ/yLDxMid3ZQRo03/93k9t8P+Pr74lBW4A2N9HTVFzWn9ZqbRqT6EVS41yAK4l0FYXL2Bckb9isCS1aauCUV9vlQJXB0Ndq0MaAQQmMpGg8EQyMDm32kLaVuC/xgfCHIjxmWh5NY/dUS4uTZpMSiLdv/8zws+9F/vp7YdDXrzvvdh/XmtPYGBY066gVp2oT1BWsYJ1LxEskLoMugHqINcnLQAuCPuYMfWsQYLAnJvQRB9h7Fo8z85ETH5HpsYkHWRmOLQ+KRuOU2XA0qmXjfv/C9L33VH7LN/G143sQQ1u9yYNivFDrjmA5n3klwYoVVkJKa4hV8JrQusWaYMViUfaCrUblib9tY4ZPSHjUsNuyMSELpFqSWsq1opguhZDtpiLtkeL+dDbej2QHUnbYmzw4oeKGvAo387XhO++hr11z8Xudx4unTfVSGc5n2exCSuE8+ILQBvI6hEXZHeSmTVNSHVNHrn0FYcXnDEhfwQ/EJWYKmiCNsIdIfewjw67QVgp+HNBWjOFxyNNWe+Sd7mDr+Ofv/+PZS178lcZ3yKCrOPnm9Tvhbu9G2NkhLM72irIYtPOsvpIX6UJprhC4TOIS9mURzlNV+joWhUywEHaGkDhrFsN2ZaNJItkqJUqjiElobsG2qOKXzDgHZYgADuJ5YvIqxpZI8zJ6wswMA8GuSVtID4CHwINc3C9n4XE9Zge1UTachuGsvzROo9EPY6+Hf/ELkvTdiK+/Mwa9uensAQ9q53a69XHjuNkuG82ZZ51Q1BdTLNfBF5AvBnQBfB5x3tADLQnVXs5rOlVZCU9lxkinmFMUTsFTcAQwCsKF7Zaklk0b0QA3sAqJl8hpC9tT5CPBDmYLtAV+LOmRo7ai2AtOJwFOPWUUFzVq9vMxu7vT23d/NPsuHBq/MzH0zs69Yo1au8xPFopZsRTDdD0L+XpKZS8orVusy2ENpTXDCmZZ0EG8pDFD5S09sTWwwhGOe5KeOKX9IAZJnuJgKRYoayKtkNK60BqwZLSA6MLLGLSRXMN0jGJFinILtGSrZ3E5WHtk2Z7NXtZIBy51OCnCEUtZH/hOhCLfCQ997ZqLpfBoodVKy26E9ZC0kcHlGLgicxFYAy8hOk5qAy3kRuWZ5+T750a1dSYlwQjCsfEB1pMkPwjJ94QeEdIhKRtJmBBqybNFOd/A6Qr4kqVzyD3QCna3qjzOMxrPDWM0A0+xxsBQMDQ6FRwj7UN6IvPIQQ+TvV0L2ZPksJsvjI9u374yerG9eHXwmnlo6+ZNdOcOYTB4X+vrC6F2EmtlsdOmCMtSWieygXwpwttKvG3pIvYKUhu7LlwYcoyQdfbf9Ce5YQnbtggz0NhwAhxY3gU9kn3P6O8TPMhTth8iw6xtR4e6YrY0S+kkM1NEKXsGoTQugRl225BLDvMwIpw95y2Ec5tMoo7pVNdgihjidGRYBlp2qgWrFmPKs6zMpsch/6f/9OBkNjue9HpX0/IH7/vwnWvp9m3S6xSKvEYe2rp+/U7W6/2g4LBTO60dN2uj0J7R6ORhupzEisU61rmgbEOKV4wuYp+TWHhZ3oXtRMVhnsfJDG1OJZ3YHBrtC3Ytb4fEg6T8o5S81coaR6Pa4rjZfGAOZ7VpqC+I0IvRlxR8SdKG7Q2hHtKKSUtYHeSW5k0C2MXLcUZsCBOsvpX2hLaMHwW0lcx2CN5OeDc4HIYinmQjD8kZjWqXxxe2mP38fcrXxahfGw9t4M8hHx7TnGbHC7UyrJZ56GWK6wmtK7EqsQqsQlw1WgVWJHVsvzSJaF6pm2L1wYegXcQOZg+FvUA6iEn7mbWvoL1UeG82mx7tTEbD3uLi7N13L/vu3V/F2iFMQ508c1k67+O4g8MjiTWbtXn40ZNV5cShKwU9rVC+2OqDwHWDhRImAC3LK4INmz2Cdp28G6f5ziyUu1DbKya/OXl8vjlg898lbr8e/Y2vhYe+icOd6/dqy/moHUNrIVN9PcqXlHjL8mVZG5hV5CXhBQe1MRU32dTA+YsSiaqEnErBCDEADmxvofCRle6HqK0Y2MvEful0Qiz6wZzOavno3Kg/vcfV8sYN0q1beHOT0O//Ou+OFosRZYOCVsjVycq4kGDFIa0phfMOXJH1FugC0qrxgkzz5fLi1X1gzRAT4zFogOlDOpG0R9ITBz904qMszx8kz3azlB3O6mlw7dqF8evQJfMKGvTTOPlO6O2uh9E7y3lzGhtTQtuh7IayWElKG5KuYr1jeAvrHPKycBfRAtX8cS75Kc5iCDYVM8iSEhCrVJiG2KeII6Edoh+SZb8B7qH02NI+ZXE05OQ0z+O42/0fy3ff3fTPbj1b4M6GP/uz22H5g82wXf/bhhu1ViPvdCeerkrhvJ3eFnrHhMtAr2omSAu2Woi6IP9UbH3mXPmn/mSJhJkajSUNwEeYHeC+pQ/A91LytkOxlysdx3EaLNXCaC/rl0/z169ifP0qGnT4F9fv1IbFH9bLrGw5TLvE0JW1GClXsNYInLO5GOAy6LzRapX2cksvnLX4GDNggj02nFYVOE4EhwT2XelpPM7Qw6T4qEzeVWPxsNk8Or19+/L4+R+w9V/95Ne1/azeGg+LhTJj3Z5dVKhdwr5osR7MqpWWhRaBLqIDtAwN4eJlqpm2I2gkPEA6AG8bPcB6JGk7kvaFDqx0HBSOlVJ/RDqt7Wfj5jsXJq+adsgrF0Nfv04YFn9Yn2bHy471NUX3ktJ6cFgL0nqU12VV8bJZSfKSoI1pSi9jzMLYqtJep1WKi13MHoQdSLsphl0p7hGyPYgHZRmPVOYnNPpD+MspXHkBbyX/X/4fnv75jXs6pWkVKbmM0xg4Vsl2HliN9hpiDbMmWAfOGa8DYZ7ReOHzQXW2cMMWsmWUS7SQ14wvB2sf2JfCXpqxm0tPWg47LHX2+/1fR/Ar5aVfGYPe3PxFBu9mHH7QHDUai/k061Vl6nBZcJHgDYtzIWWrVloStJDqwoVMYZxR0S1fwFvZoChrankgsw96JPzQCg+Nt3DcRuwEhwO7HMwmC6PYnE67p8PZ8mCnPP+nmy/8UCW4fv1eCVfHi4NOnHS6p8XsyX5U+zExLAqtpqheCN6QfBEzEcJCEq4MkuzFzwmoIj0REHXjJcwGqC/5MKF9Oe0ohEcpqR2kLIZxasxabP74wZDLnr4q4ce3FHJUcfLWL9/PDotePuk185T260XZbuRWO5nVmbkohbdIvmp8UUEbQA+zbNHGzqsYEs9v4zkeppMtA1G4tDQFpkKnxscy2wQ9cEr3A+FBibeyPNsKKezNitlxs3lh8u5tfAuAn/HVcI0rLsrTf9rcvK1+fzPPR4+7LtKyg9Zz6xxwOaC3E1yFdFHSEtC2aSDXZeUVTwQ9n4F7fg+WqwR9tBmBToBDix3sxwE+dNJvCor7KZR7Kt13rlG+VJ/wYDDl8kmEu/H27c05l/ubxbdm0Nev36t3YmjWstBWPXQc1Y2kxSyEpRhYU4rnLV3AXBD05qf9FUznZVNwtqPEGBgZTqGKky2OcNgTaafSx9AW4klmdvMi7LXWe0f/+l/rG21xunbtr4rV1V63NfOyQrGSQtpQCBed4iWryu5Uh0YtYHcttWV3gAZV8+5LwMYeQThJcCCxG6xHCR6AHstpT0mHMfNJLUv9acz7s8yDPPfpL395YfxtGPS3EnJcv34n68R3mvV6fbkMs/UshbUU4rqtcxGv47RmhRWhZctL4AWbjlCDlyTwAEgqTTqVdQjsg3eQnuCwbeJO5mwvhnTowFE+S8dMa32mHlz9z5l+JRvwHHj//Wvl9ev3hov1jNMZZVHLx6FMxyXhicRqUurJ6mH3QOvY659wOV72gCwZ6sidgAQqXPFDVsGXQXvO2EPam0XthVTu1mLcmVLjpz9l9vOff/PaId+gh64yWPNcbLuI3dWgeN4OF7AvIi5ZXAr4vNGKoFO9RlWDVK/iZPIX986iyiprhjiR055hG8JjKT6y9FGMPMiUPSHkR3IYpvJoGuLKJHaXphcuMPtX/4rym6dZVhXSq1zNDxc7RTid1JLq9ZCnZulyMYN12xdkLlm6OOeuXDRsIC2J1HjJLEgComBmaSYztTVGHmAdInZE3DbZI5QeKeX3nZUPY97Z2d5eHLz/PvMumW9m375Gg7Y2NwnLHxD+pniQ93qneSeezweT42YK+UKmYl1xdsniMtJFSJdtLlGR7pdl1U3FZ5A+HV+e8eHYCSlhInKsdC80xZyCDyU9MXFLDg8JepDK8iPy4sE4sbu0tNFf/oDy8B3SJ5oX3+aBR0DSzZvo7t3bgk36ffKV7LjVn01W5XghS76cMi4hz1vJuACsWnQEdaOsauwln0uUPadjcKoy2ULVvk7BJxZ7srcsPRI8xNzLQvbRJHm7lhVHs3wybo7HsyO1yqWljRkQb/+CxNfkGL5Wg/7JT6jVR/eaLkIrOOuQha5DWkpmVYl1SRvG51Udds5ZlaayoP0VdIqUc0HEEfjU8Ek+2exb7EJ4YuJOcNpOSVtQPGmsnju8fVvfeGjxItjcdMbxg8VZFtaYqZeUNgj5OaV03tI5nNYlLZm0KIeOcVuihdV48arjJx8xjGUfVUbNLvK2pcckP5by7UQ6sNKxyE6KzIPhCcPY1HBpaWP8deWvv7YY+vr1O1lZ/mEjL2oLmbwSg9ZFPK8ynA8h9UBrdlqRsiWUlux50QDVeekf2lMapU7Bx1i7Fk+CeZzEEwJ7AR2gdOTo4xiyo1k2O04pH/y3t18fXvDt26Tr1+Ow280OatOsTPYpKveT2QohrLjiW6+jbMP2OWDNhGWRZFPMs0TPiaeOVeBUM+rMcyN1oQ7WKtIFu9wDdkV4gvREZdhttcoDW+r3q270r2wjPoWvxaCvX3deFIftdjZZdtSaHc7Jvox0NQXeEjoPWgJ1wE1XHqMOKqr2pxe3Z0PCmiD3cTgw7CIe4XRPIXwYEg9LaS9L7oeahmlWjJvUxs3lOF3+4FEJG1/dRnwjuFeW5Y1+aP/tJKWFk6L0rjO1lOhEecX2BZIOgSFoglNEAZzCvHPmBcVyPlYea7gSn2wCC9g9UTU6BNixeYjLxWi17FDLspx81E+bm/+Tb9/+6rtkXsITWhUngQC/ylqtdhjea+XH9UmtHdQqJ2kx1JorlO4lpfOEdCXA25grkDZM6AINidw4m9MunmM9n/TVYcV5m1PpSkarDzoy7GNvS3qYkj8Ef0jQo8ILB/nScAi9KRCrokDw69sQXcXYm5u3A7ybLY+W852RmxRxySk7p6S3CLzlxCUqIZ1ziDXhRUwTmPc3OpvH18+pOeKPNURsImii6tC4W8XW6T7iAcmPhR4b79TcOph5eJra/elO/Q/Ky/wqwo/ivL8RXvBhvJRBX79ONpk8KM7VY91FaJFlXVK25DRbRtkygVViWFNIPfB5Sefn3N/likT0Mm+ISl1IeAoaAoOnuWTZR6ADpD1Lu4rejqTHOeHxOGdvNJr079y5OvmuNIY+Cz/9qYsnT47ampysOmXnbF8Anaukf0NPgXXjVVlLiAWgA24Z1VQ18L6gbQjbSWIEOsbsWumJrG2kJ8ATE3eV2Etw4BCOXMZ+K3QGDwaDab1+efbee8QX9dwvbNA3bzrcuXOv1omhqUbeDfaq5PMQLljasNKazArSEvZSlULyomEB06p4Fy+TTiIKTywNZA6Nd6h+/dty2AX2AzqIIR06xiNl9cNGaB6P8v5ps/nqkWq+elTFq159uRVnw+6kiEtK2VKQV2RWIfWkbD3hp5IOPYtl2R2j+ss27FKRvMY2A8EJ4sjmSOLAZk+kXcvbStkjO20lad/jsj/I0ujGjavTF6WqvqCHtO7duVfr1bPWdFIsxCytpMTFQHjb+B0FLmHWhZaMO0ItQwOoYXJerhnUNqVgbDSQfWxpW9Z94EPEfUJ8kkX2J2THBR6IMCwmTPrN7mzU78Zf/vK1jS2eC73e1Vm//+vTvN0e43QSJo1dwqTr5KU8y1bTLG0o6Bg0sYiqpgtE4U7V4cMLemrPW8fUkCiwO/PWr6FNHzgy2rHDKsRWCsoIKM9qoVef6d6de1QZquf30s+92Js3He7dobbP446LtJwHracUNoQvV8ast2VdRGnVVhepiV2b98g99/WqPSaq0k8usSbAcE53PDYcyGxbuqfEh1gPbO8QZke0Wv2NRx+Nf/7+tdemhejrg/XTa+/n2xffamQTd+KsXJbUQ77skN6WddVio5JG86JRh6qZuOKHyBkVAeqF3qo2ETHDDIX7EPYtP3Lyh0IfGD0IIW2XybuahcNVLgyu3uC5PfWZF3fzpsPdu6i1Q3GcP2pDbTWGyaVAfsWOVwjhIviS4LzNuqq2/BYvVX59Go+FsZ1OkftCx65yyYfCB1bYE96RwmOTbWXj2e4syw4XMw9+8N9tjL7PWsnPwubmL7L60T9pHEd1HONy1ijWRTxvpwtGPTmtGa0glgXLxotYXSm07dSosiIv7hsMU2CEdSJ5z7AFekhKj6TsfqK8n6X6Q5juL5YXT4c95oLuZ3uOZww5rDt37gS4mnc6oZmXtS6z0TnI3zb8gQg/qA57rCC6Em1Mwzh7wR8089+aQaXxSOgAs43YUvIOmZ7Y3sXei9ZBEcqjaE5qUYN99kaPj8fTf8PG99wr/zZu395MP73GdNLZOSUqjVOc5CpPypQ9CfKK5TVJ60SfI6gn6zxoY161zeHp2edFt9a5qjQtQCbTMl4WYd3QhZDZoxlFbbrXuJ8GO4mdnXvlJ2zA340zx9C93fXQv9KtZRM3QxgvlkWxHpIuJ6XfQ/xQaB3cNGTzJszsBRL3ruIv0jzMKAVD4LA67HEP+CjKj7PEY2DHyveLTjppjZrj43y13JneS4PBOL7zzgfp/fevPeflvx84fOd2+uCDdyadzmrZrV89bZX7+8P2rFGeZgvydBW7F+X9zDrCTCwzl0UzpmU5x84qApTgOd70qqwyf6q1LbEotGp5yTgLDqepKA5zlyfZpDVtNhW799cTZyzEnG24DfBnCwtZl2l95tRxypay4FWjXoBzWOeMl6U53/zj2zu75kW1YJWYqcTEc6EUKw1w2DM8knQP0oPM3spTsTULkz3Xy6N/+A9/Pr5169ZnXknvv3/GS3/vIN+uOrgjn1JLunnz5uD993860DgN81QfEaZT5AkKpXHEjFFak0MHqyW5UQlaVk3InFkAXppnUOaJAWG7JRQknwC9zF51yvaDJ6MuYcbCwswwO4s1ncnibt50+B/+u79tq9NdcgrnFHwJ83tGf4j4h+AfiNB88UljNmZkMVAVWx07cUzIDoQPktkDPwn2NnntiWLcj84PFrR2/H//fzL8LueTv0nY1v/pf0vrxHuLmcoVZ9kq5fRckjZA54Ko4usUVxRYtLVoeUGVoE3zxdOwAZNGoN9g/kb4rxH/yUkPFdITD/pHf/Qnf3B6ljj6TB761i345/98I9Ng1nQWu1hLxovA06bUl4iphE0peShzYPEE6wnB28nltpRv47ivTIcz+6SYjAal6oNZ7XDUurI2fWPMXx0k+ac/9XTv/uGgmC7ErByNZkU4yqUtx7SclK3a5UYI2rC1YXFOpkQEW4Wk4kUlzOYSVoWhZbQoa4nAsWLthPWN/q1bZ/umM9Xxb94EDU4z11Jdjh1EV6Yj3MDOPI99z7h4V8k4V2XSqj/uGHsf2ALft/wbwd8i/cdM2V9b5X8MKfxdPik/KlLjyUkcHY9GPxyeP/96iJ+8Tjh/njga/XB4EkfHRWo8ySflRyGFv7PK/5gp+2uk/yj4W8u/Ad8HtrD3q2fIxCZWHOrqOZ/tqn56eMqEG3OP35Vjx7VU1+A0u3nzbN90Jg999y4aFyHUXOZJoRZMA1zH1BQU9Gz5ic8uuSKKW6hEnglNkcaVnJaPIOzY3gIeSnoUrYchC4/KSX/nJIbjG+/9X6e3+NnHjBiA9947202+wdkxf61Xsmfz53qTn+nO9T8/Wcj6w1Bvz2JMZZBntieGiRSG4BNbS5LaVPZRwyrO2t+oimgdnFyrbEuNytbKfFKEcPfu2cLjM2c5usAshYAVgshSRRjXXPDkS2AjRUxpqhl8lRGzD+xB2HVIuyFpx3g3pbQbXOw6TfYbw+Lkv/3LK+PKds/43nmDrwiV47gF5r1b480f39ckTLJAnaTZNEh9SfspsKUU1iGtA2vIq6Zq3qVqm8urH8fvtpR5dVGGLIgMK4QUQvc5+IDPXfoOAVUKssKyzhJpzFlxERgbBqB9w5bMR0HhIztuK7LvoCMS/SxL/Thl0FhtnO7Meq8NP/m7jp365VlveedkvO+Y1dLQMTtw4LGilyCuBmUbdnrL0ltUAvBPX93NuX7Il7s+uXrhOymEcCb7+jRekg9tzngocyUXq3FV9vSBzSPE36cUf51leqiyPJo16qcpTabTaW26tHpuBsQbN/CrH1o8HRtXtUd9Hrdv85Re+VofYG/cIN292xs1VpkeHW0ParXpQQj1WjGctJ3nSzHGAwVmmFxyHagZ5eCCM1SMJeaKxS9OAj2jQd+mjP9EyVMpzH9o83y6zZcWA6uFUkoeg05sH0rsGm1D+TjP0mMWrh5n8MoIlpwdDj/5ya+L2kmscfzjgrCVjachAOTZwE6N+JOfDGfA5I//2LPXQfDwi/CptUdgCh5ubhJocMLpvWGMIZi8K3nVZllSS1Wxrakz+NpK8GZuWwY7yimqdE05t8+0xhfy0HaqNHvO+EuqUiCaYg9tn1gc4HRI0FFO87g+i/1/c5sX0IX79nH9+p3QLf+wMe0MF2YpdEq5SS1VRQM3YxbCpBU6g4laJ7/cYsCLJ+tfQTwt0nj8X/5JI0Sy41KTIycfmnBAcleii9T2J+HHGZBkWy+S1n4hg5aCXansnO0DVQxdIkaSTjDHQieU+elUs8kwOy3h/GtnzIB6kx8Uw2zQUcrWybymqI6UasFSCpraHuJyvz4bsvLhaEoVer2O9/o7IO9l/6nMy/YkK/NTQnkCOlbgBLwiKO0q2Xw2BEtPByY8H57boKXM+PmcjJDtFKVsXM3U80DOTiFOArHc3f3ha+a1Kimzg//w6+LXg7xTD+UKaAP7AoGluZ4I2FPsE0JWs1wWRTb5F9fvxas3PP32pRG+Wuzu/jBdXL5fimwC2WlFWdAQhbEdowjPz21WVnV0PQe+GeUkYaxkHJFnSprZaWaFWaasfOcd0uvCvZjTaPO7d3Zq2cJCu1Ybr0rFecNlCJdxWpXVNEkijJOyQ5WxQI7ZeFoeFiE8+Q+/HvzkJ69/TP1pvPMOqTyqlRHPlNJM0szBMyqOziezGr9mfNNSYIZq6A5gBZwH+913X58Okjt3CEXxQbNdry+EiVcUwkaU3grJP7C4AqwJNYwC8hjigYPqKJJVhdmi7u5+mU+Pt75DMfW77+K7/8F2wiRc5QueZne+OXxjBl0dXKv0lgPCyAmVls5aBXoV0Gz+OgujolnWvVI4u4DiFZm3Lb8DXBGsEtxUpd08MiwFXJAyR7DIQggmDkJ5+DcPxnxH5gPevYvKKCVbCghVz7jyX98cvhmDnmvXzufAy1V0JIzKNNQrI1J9BnSPGmHcLZohspyyeN4pXJK4LOmizXnklXn/JEIziQa2CZoqVSPcsMeNXP3J4uD4276frxJlHCpXUxjFqkIxf+RGL5i1eF68Trb0SuCoW4SuUj3BImgdeUPQs1kRLIBan6KD17EXECNwT2JopVMSB8rcrA/PvaDIyxt8Ed5s6HNiaRpkUt1KC45UUlt4RXo6ZvmzcCXX0DIsV3MUWSdoMZrGsN5/s/9fMd5s6HPisBhksUrLdR1YAVYNizaNZ2Vaq1CSOmZBaIXAivFictaQ8pcSbn+D38Ybg35O2PU8OWtgdQVLWEui8s5+ZqODhamrGmy0hFlG6irQLGZFwRmot29wdrwx6OfA5qaztmJdLpuJ1JHTguQuqIVdB2efpwNUWnEugFY1eo4uruYplik2Nt/91cuOoXuDT+GNQX8pnnpQiwcParnrjUxqBdQ2oQ20kZuS8vkYiM9gzuTKjeqGFqhjQjtE2src7F+pNW7iUF3njbd+WbzJcnwJKtV8h/7/8OuchV4zpnEbaBvaVPP8mhDm+/gse6xyVfNO5wbQxLRTSJ2Usk5RLjTfv/a4vN65ML0xH6H8Td3bdxFvDPoMaO3cK7ia1UfptJOFvIvdldRKpAYOxVnTq7YLiQZyS846udVNubr5ksveygPfufObGd+RyuG3hTchx5fgzp074XDWKcqs28qmcZEUl6xsAdQKqPasMOOLMK8e1gwtKS0Q0lJGXCylNoed2mBw403I8ZJ4Y9Bfgt///a5Cc1JzOe26ni8Dq7IWbbdt5X4emm/VCRpADdCCYFV4RVnolprU19d//eZ5vCTebOCX4PDwmpTXaqXVSQorUayBliQ1q7j4udXOMuwmeBF7NdqrJi7MnBrdo8ab5/GSeLOBX4KdnXtBWVkjqBtiuaLk1WQvUYkMPvcZxJBJatheTIQVwUqe1K2R6kfd4s3zeEm82cAvQW+SaTLNa4HYscIygVVlXgI1sfJqLPbZofmAHcGiQlq1wrKlrpXXm838zfN4SbzZwC/BaC1TyGJNQR3k5UoQXIuIlioVzedDNZinaVis5nR7Baeu5Xp9mL15Hi+JNxv4JWj286Ay1pLVQVoyrMheBLeQc55LMlgYZZIbggXbK09L4SbVh+Pw5nm8JN5s4JdgyjC38rqgLbwYFBaNukYNHLLnPBKq0s5W3dABFhGLpNSNiWatOXrD7XhJvDHo3wlrEutFyOYCgolF48XKuKmj9AJsOWc2daGWxILNIiHrKNBMivXr119moNIbvKkU/g5cu0ZOFusx0QzK2pC6mC7Qnlf9nnNAJVSFGAcgVOOb6dp0gmhPI81abbsOns/ps75LneHfBN4Y9G/Bugm6u4nY2akPC5ooa8mpbdFWNQip9uL9RB9/LpfVhNQGOoZ2Iyuas0nZ/MlPfl12uy7fffdnPhu3Yy41dGZ8d38obwz6t6FfXiM7P3pcFLXQylLZCc46SZWSpqGuZw7NqbSQn6WO8oWeXKlmq1HRT+lMQ7ngoKNuuTbb2bk3gZ/NPq+4urnpDMhGo/fzZvNy6Pez0C2PBctMZ8dn+5EtHcHRhx//46TZTbWavTAqUzbdiPegrIhSr5/EwhuD/hwqwcUf56OdrDUtysXM+VKqZmK3BDVD9tvO7enccaXqv8kfa33PyXZzqdjw2U8RJBXGLVBXKS0FpeMJcba42Ek7O5Sfu476/V/nWdZr1eK59viYRq2c1qahyEI4DW4WIbkUQFD+TA+cXIrxMTRElvKUsjw14zDNxll5TJhEdkY/WAynW7/8aMxrSJR6Y9Cfw87OunpFp1Zrj9tO2VKasQIsGrWsVPx2qftjY46YhJRk25Jly1VbVqDqZvFve2rnqiZCLYqwkgVOKDwuj2fTXu9Xk89dTLBSz8vRYoxpLeSzRTJaJNVKKaNUFkJVbdQX6GhlFMwXYeOkWMakbIY1ET6t19LB3nAc6kWv5DWUWHhj0J/DYHBDvfWt2mw062R5vqwsrTqFJYJb1bSnZ0QOIhlKVbp10SgJJQvJBORCFp8cJD8FEyw1AixmpFWH/FixHISiNtjZaX/Go2/++EGdKd2RWBf5BZWsW+qG4IbsgpByVyP1sL5AestJELBwqNZaYk2zlEYK2WGpWFcs0qydJteu/VX5/vv/+LUy6jcG/Tm8886vNNxfqGUOHcvLyawGsQS0VGkdf0Z1da6sWgITxAQzA0d7HlOjXKZOJQ7/W/vtqm2rmcyi0ErAh7PEYZaVte5hLTw9pP77P9luTpwvSmm9CD6fHK/Y2hAsJLuJlNt8qmvGXxDPP43/jaUIlEpMU9AwUR4ICvJUzhKz1dX/zJs/vj/aqf9mdufOjfg6DGh6Y9C/hR9hb+UuYpvEshxWyLwkq10NnPysHrZQAs8gDEGnyGMRZiLZlYB23agtk1GJfmef+jCy8nkMvZRgFXyYwZMylkWrcxx+em0r/w/rC83g7kqcjXoiu2D0tuyrmA0CCxJ14yCcPc2+GHiW/amaC1g1o9tJkJIosYZCyxY1AVkwWXlUTDo6ap5cHPzjf/z+iNcgBHlj0J9Dv4+6RVZMndoOWpJZpZoX0pJVPMNFJcwEMQAOZYaGqUWiMt4mkOaaHc1Pf7By9c4xTYlFYBV5X5k7mbICmtlhh3o9tRYV43krXDG+gnkb6QpBG9gdS/lcmejjt4e+UAn/aUcYrizeyErIU6NlmQIFQ8R5kecOobvWSOdOi+n7bwz69UOeP87SLNSV1LG9DF6xtFgpIlUTnT5jKLZRmGAGxoegE+QJOEHIjDtBDqB29e8+b2Qhk1ITvCC0bLNs6KBUH81mRbe7XIzLtCxnF7Hftn01EN4y6bLwmuV2Fadj/FR0bS679oxzoT816Xeej5nH3J5hWlV+Ok0hTISnKaTxeMZpvXa1/9Xv9leP75BBV5rNLyL8+MkYDCvr36vNinpTKS2QZ0uktFx1l7g5nxfy+Y9H8BQxEDo0OsQeBSkaCsSk0ov2Ciaiz2Y6TMpBdeEOZgm8FKxu9KxVNNuN4SzkqQwrgXReWbiM0yXwBeR10JJQ7eM71ucC/GcdYD//Z1WGr/mEH+EB1rLxEkHdmLJmCLPaSX3vtaBJfIcMWr5712H5A8L952xl+um1H6afv+/402vvZ1vZcl2xbJHlHewlpCVgwVKDZ01yko01tRiADuW0Z8LAxJScajiUEl2hsUmfy+tKksNc3NHgKbBkeSGjaHvmVnLZyLJsDeu87EtCF5BXhdrwW9JjL0FsCpLdgGoGZcD1lKiFMC3KmIU0/dTwk1cY3xmD3tx01tqhOOzs5KushGkZBFDL0+98AtMyqKzvpf/yT8p06Hfywv12DHnHeBGFRTstAu1K8/kZTLgq/pzg0LfSgc1uUBwkhxJcr8Q3vYKYSIqfN4gqzeZaVU/0VLBoe9F4IcOLDnkrkHoinLd0AdzDLCDXX8p+nwnPT5LBVY7EKGavtgV/Dq+hQT8doYaWPyD8XedetjjrFLODR7WTRq2maaydxBQKS7NgjyMw/h1f14BpgbPSTszyWVFbzVO5irQMXrTUmR/asnnR73OrUQQmKA2kcIjSXpmFk7x0VEaDUpkzTmzGyPHzJvhJ9dA1Q1tWF3lJZtVBp4HUAfUSPgdel7VsaOh3WvNZRxJXK5h/JiENDWMRx4JxJEwUwsyxjLXaU/3yVxuvkUE7XL9+JzSbv85qteVavz9rxHO02lNa5JNGlOtZHNdjCEVwyqIyQhWtulJr/oJvNVKNSq26nOZFCksJXQH1jBflp82wX4hINSJ4INIRId9jOj2JRVbmkVYKqpE8kBjPJ+n62QMoJaBm0RHZCviCq8pzG3yBoDVgEbn5RcQo2wkpVnlxR5lUjUbVFw7/U1XJlMVU5hDYN2Ef+SCQjkV2Wsuz6XBUvhZl8NfEoK1r197PepMf5MPOQiMvhwsxsZZi7BVZvkaiK6uZQiggy5zKrPLk4UtHIhhkp7kUe8is1BHasHRReAH9roGRNhCRJsFpYIdDYrkfsuLIMUVQm6AGKfRNHINmkhIQnrksO5do25xDDIKzBdtNBy4BS4LG04zbZyF4On4aTzFDiRFoilOaH/w++R1VKb6nY6ZskiGMLQ6ABxb3MQ8VvK0YDyUNp9Px803v+ZbwWhj05iYBevlw6IaHw4VpKHu1EK4a/jMcrgCriCaQ4RQQ4Skjzl9Ik5w7nE+nsAKSQg3oQloR6toOTzMBn8ecw1FixijvA0d58kGm4RGzUYT2dJTXO1IaiDCSPbOJ0rP3XVW5o6lKQB2TNggqqAoui7ayZxfrbFCUmVmcShwlfII8FKGswvjqkxKfOHg5YSJWiRkStB/Mg4Q/tLkXEzs16XgAp3C1fMaFXzm8Fgb9wQfvh/VsocjWG61McVFSL5m3UPgDw+9JPofVBMJ8fGL4pOp71rivSldQMeAyrBpy8SXKSCWJCYFRSunUjoPJzCf/9n/9Tp9b8p/8yZbb5XiQQn4KDC1GsqeYGnqWp4V5e9YKULc0xc5U/Vjb/q0OI9tWQiRVGZIh5hh5V7BndGIzm+fzAukplfXppxWDVCZ7JnzqxEEKPEyJj6TZ48Hs8PDRo/boj/7oh2WV2nz18VoY9Pr6QmDQqWfDopOy2XJQWhfaMFzAXDSc07xkCzxvE8mn8MnnnnUArOCnYUxCDC2fKuk0Cx5ms2LYycYj5jzi6fRvJ63GH4xkn0I6tUPfMADnwrnt7LOUUsmQC9qWazKpGvKoXLhQVaD5/IpL0Bh8anEswk4ibcnaBh/jNEXBAQcUVFW7KwQ7RkIZYCrnQ2flMTF7EvK4q8biIdMPB3//939U/v3fv+B2fgt4LQw6xm5eb6QmKpcCqYd0zok1gpeArtBvjYL4ujCPO0vBBNSXfJxIgyyFkbNyWj+5+nGseePGnfRXf/WDWVZqLIcT5GPZx672vSVR53NeV3JwRWLK/HHHbNWy9flfahXyeGrrBGkftGP8GNJDQvYo2IdRYSJhR2cOUZARHJWETUiyI7gs5YlSfpppdJxmzaPl8dH4v37vf/NahBmfxmth0M1mHphMmimlxRDCKmbVSkughuzwDQ+FM2JqawAcYY6EThwYzRzLv+vc+TiOuHXrZ97839+L49QYmdQHHxDCIk41rMz4Gcql82LLPGb6pK74rP+TZDOGdAR6DDwkpgdBfOQQHwY4sKqkZSALcf42sPJqy4KdJ1LKSPk4RhdMi1AfFyON7r0mMfPn8RoYtKgPT8I4a+UhxIatqq9PqkHIUPKzifNfG+aZ7dQHHWDtSfFIzoZ5ls16vd3PBMb9VI91xbETJ4gDOy1RdXw3QM1nX0KfY2p+wb2ZKBghDo23Er4f0L2IPnLMHqscHexMskm9Hl2rNbLpeF8APdbZYRdYp1ZLrmfJnOSsdqZp2DtNdH8U33tNYubP4zUwaOjni26U05RwlDxLqBSKUnKVgvrm1iIp2R5jHUnaMX4SFPY88yDG6ewfvvurzxh0SgcxanmsjGMSB4Kl+ai3ReAZZKVPrvRla7GYgU6F9o23AnoQiY/q8CRTc/8Xd86dvA4c5q8SrwHhxMQ4i1EaI/dlHQZ8BD6taJr6Jr0zVVyrkeAg2VtIj4CdkKeTRl7MfnbrZ58yIBHCRhlmGot0IjgwOqiyD57IL+4FqyHEmso+NWk/2FsppUfKwva0EQ5ZXh5934wZXguDhqWlD1OjCCO5dgjeSdITmT3svmCMn9Iyv+6/ADwx7lvsBvRYSo+Svasi708ap7PP/bLcHcUUFcYinFTGnA4RfRTGc870c8J2VaaeIo8QJ5j95LCtLG4zYa/fvzCA269FIeSrxmsRcsBCHJ6MJ/WF4qSclnXH0LG0DuxiVoxzOTX91FN/lUHIZ9qYPBHaM97BYSsSH8thO03SQar7tLnT/txBSoy6ZcrGtfEslf08hEOcHQhO5DQ2v00n/ZLFVJVJNJN1inyMdCC0B+x5Vt+78Pvnjn/+c814FpHqe4DXwqB3dnZTrVlOY+oNM2bHed7csb0o1HFVBNsHmrhqQTIST5X1510Zzwd9XB5W5REtkSrvrAPMPZTuh6StwPSAvHly0tf4wmyrhCuf/gFQlqdxZk8WnZ9MA02FtEx0v8o+qHzOtdloJntg0qEcnhh2QPsl8aQds9PKmIHvqJDMl+G1MOgbN26ku7d/NdtZPxit1FYViUHRWQphGpR2bC9BaEguSMpU5W0rPA/x7JMPffJZKykoQopVAYMTzJOk+Eh5bWuaFYd5HobN6eHssHct8f5nv2k0+mHsdhkNy62Q566FUgeWTmTPPfTzrsoTiyMctsAPlPzIeD8LadBv9l75FqmvG6+FQd+6hTc378bf/2Bz8uHKtttNokf5JLk8xOFDpFZFTg+1oFQgZQAic5XZehko4hjLFKchz8eCoXMG5YQT6j7pnjL6Ve/J9Ef1H8VnlYdv3CDdvcsESp+cpFypOBYeoDASaWaTvoTN98lKeJp31r7QQ+CexKOE9mcTjbu7v/peeuVP47UwaJBv3yaC082bG/GXv3x/+k4xHbq3vD8et4t8Uq/FcFpX1qmFbFQLsR5SmgkSITyrr/XLkdJMIRROmZOmlCGlSchnE5f5dFIMZ921xoxfHUR+dDfevb2Z7hKeGdp8Iqfl8f/y//C3g9Vpo0+ij9MQNAKmfK559otgqwSfAgfIj016KKctRR/m3WK8w49ey9zxV4nXxKCfQk/FC9OnOpC1uenQ75PXTvZq9c5iwXiYPVULGGXxuQ26GaXq8wlarcjJfqQopjv8ZvbeezfiZ+LTu2df+8X6/zSZnZbjGDzCOiUwkDl1JXGQAUH6ogOirao/cYDYT/gJxC2T78RmOs7CyaTX+3dvPPS3vYCvAL59WxGI1687/sPAdPv8SYDLwAOaD17gGy8//dsDNvqLacLfp5//5bXPHfheBD+KzrenWfQwyX0lji2fCGWIpv053Y5PkEBTmyHoxE4HGeFJsrYnufdW47i/H7PpH/3R5huD/rYX8FXixg3SnTvw+7uX56/eyy/2RR88/cNl/qaDe+9c8+cPey+KoLK0spHQsZUOhRao5BEq2upnDLriOQOlraHhRPJRcNiX2FNIe2uxdjhZ+uH4j9/ljNK73218pwx6/kDje9/2Qr4A776L796plaMiDjP7SEG7xh1QHVObs+8+7pCZE5Rm4BHiSGhP1q7EntFBOw/H/+bfbgy/rym6Z+GbqRSqmn1mjGWrYuU6CudZ6yt8GPLX+9fL4dYtPMtnszwykNizvC3rCfaRxKiqeH7ujuQp0hFmW4kHoIeGnUA6KQZXRq+SMedZy1E4CUu2511ec7LgN7LOb6z0Xd2NTNX4byUcAs4z+913vz+vynbRmBFS37l3lPQI/Fiwhxk+oxRuzFh4X+I+8m+seE8pe+KQBvXf55Upb7/7bvUsQ/jk+fK0ZfMbXMc3HXJUHcZGGDmh0nohtaPXFcf5pAxlHGQp7E1xPRAawivAOaFTKtGZvCoKMjY6xjwRvmfzmwx/NAvlXj7T6O/+7tVxBHfvojJKqWperMgv+gwJ5hvBN2PQldJUECHDFA4ugkOhlIpIzO9/QIBXx9t8fZCbTZfDo/ujvMiOsmxWIFpYq8CqK0HImeUmEDEnwGPggcR9Mu5Hsu1myI6Y7E56vX//yhj0Bx8QLi5P8+CsIIQiKRWyCqTMpPBF4g1fNZ5/VrXjc6+sao4OGaQGUgurY2Ib8npC+fpzSne9ztjZIXWX8kkapUF0PQuKdTm1JBdYp4gl7HrV+KqBg5/I+k2S72cxf0LIDie5TqfN2uyPb786abr19V+HVLZzEepQtnHoIFqQGlLI7Oe3aP+2Ls+X4oU8tJ0+I936pRBV86dp2l6wWAQvkJftWqzXl2I3r3TdXp0DzteFXu+2P/hgc7ay8teqT9eVNXNFSpLSaU64nxzboFzgZMYBHyvoCSq2YpwcdNU+3Z8eTLvdH5a3XhkpI2stbudDsnqZT9okLxgvkliQaFo858TdpErD+vld+gsZtBRszs5iE8i4hmhJWsBekcKyraWS0eKkSP3NTRJ4+okS6HcTt29vpps38Z07fzi5APFodK9MWTYu6mFXMTbJUxHivPcvy8pEmgTnpxNOTtfUHU6627MuT3kj3/Y+WZVmCrXJ6bhbTsMizpckL2NWFLQAboFrZ/d+AMGf6OA8H85o0Jvk2Zadikok24mn4sJn6YqwESK31RBekBjarEveMFm/jHnSwf3WrFU//S/+i8l0Ot2aLi1tzID47rv4dRwv9sX4pHz/Ho6bm//fWe1X7w5ZWDiod4vwoBO0ODlQvb7i06Pkej33pOzH0eiH8QfvkW6x8ZWkEF8EN286zA/w2dHRdlGr3a+Nx/VaMZy0ndeWwBeEN6pnyzL2glEDOffnJh88C9I89f4x8zezQnAebNg80xpf8lAozrJQQNV8EhpGXdC0UuykDCEUKcUVQrYfpvEopKxfZNP+eP/JoLGq0zt3eq/leLGz4Snp6mwH4m+7YHTnDqHX22mM991u16YdT7MuIXZjyJZIXg0h27DTW4iLRivg7ly+LH+mcuvnUDm+lzs5PrdBp4SDQiW1ap3ptaAqhs7gqWyiJZwjtZLTupTtOqTdkNix2I0x7IbA7uRwvN+bPIjw+Xl9b/BtoDd5UEwOvRBCfTXGsB7Eusx6ytRTCuvVs2RNeNWwRKX21IBn6Gp/ASqbAhRc2drzrfHMBt0HaiGllELCitjRYAWlL4+lJeyKTYYCuMBqIa0AFyAdKbFTNZ3yMITQTU61kNUZt07j9esf+sZ7/7fpLZ42oH7bseP3BZVXvcnPdOf6n9fG2WwhFO3VFNPFoHDJ9kXbl5R0HlKPahZNG9OQXAMVrmbI6CzvcUnJqWozSygmORFS6hPonnHFZzLod9/Ff/3/Tsm1vMxcTlE2xpogT7GT9eXvk0/pIAegZtzCWNWcvGWIC0ItQ912PcNFjCnPi26xkA1bf/Mn//L0n0/vTWu0yh0+LOHqazu+91XGzZsOd+4Q4F7eYyefMsz/pvYvawtM2nnoLpdxeiGDy8lcBi4JLuF0AbJVQdd2Xr2Bq9zWWWMIg2UniWllW4wzpynKy8a0TGetJp/JoG/dgn/+z9tRg9kkZdlApj8fwTCWiJ+M9jjLNT/WAXp6o9l8bPC8IVVBpm65jb0Uietyvp+ydFjW8xPNxoMFNQez2q9HW1s/HPGdja+/HWxtkTWbv24W04XmzONOWeSdXGlBMV+OjqvYG5Y2ZG1YnAOfQ1q1vSipeNql/HxQJScpxUoYnrmNZYMwDRN32vHWrbN905kKGjdvgne3o7PpiOQ+SkfCx8DQMKvydy8azBtV8/9aFisyFyX/gMQ/CMr/UcA/RuGPnfijIun3qTcv5ZnXa+VyZ/ghNfv72d38dcC2hh9Sq5XLnTzzOvXmpSLp9534IxT+OOAfB+X/iMQ/kPwDmYsWK5iW5GcNVDojxFz+agYMhY9ROiK572w68u52vHnzrN90lhvF+rMfP2iwlHdms7SMwnmCf88Of4TSP8L6ofGyvlAi9kuv8LQ9v8SeIiZ2qPr3lAY47Bk/CugepAc4beWptjULk73UyI+uXfv5+NatW2889Uvg5s2b4f33f9oI43KpSPW1MkzPo3AewuWErwpdRGlNDh1DS0oNTL2SZHMOZGeXY/g0VIkCo0PkX+Pw/5PS/0DSf8JpqyjCIUfl4Bd/eXmsM5ydzhRyCNg8OYn9pY1JTR5kYXxUKtsPZifBE8kL84mqTUNGNfsum8u/nuEmpflaMkTdpo0csUo5DBELmAZ2hpRHqU5W1iA0Nc1bf/M3//Lk//iT/2p8nK+W/f69NBjsx3fe+SDdvr35ChQfXjVYm5u3wwcfvBM6ndWs270aFsv9/G/+ZtbQNCygtFpmZS+iCxm6gP2WxFWJCzgsA615Xjn7RDv7eQx5rmlddbxXLGJpZLxreBJgJ0r7eYhHMTUGfTTpnhycuQZ+5izHzvpuYtSeZp0wUlk7DrPpbsryB3Joy46WjwQrEl1UnXRtfntY++9GdZYQGVVbUjGXlpVQqmjJ1LOkJTKtYu/K5d6sr4NhGB1psn3Si/UBncbogw/emfAmvn4mlj/YDO90durE2BxPtjtDlQuzfrYUVK4g1pDWs8g5Aj3g/FyLewXoShTiOZ/qpzAvm5RUqqinmL7xgaxtpN8k0oMwK3dTUTuO9eFoNEjT0frumZ/jGQ1avnHD6e5dZq0dOM4fBdR8ApNChGhSH4WLxpcE5+eVIqoU3Ytyrk31y3cuQtOkFeRCaMFBPRIXhQ4s7WXyjpU/Dsq2YjbbXcjWDi+v2H8K8dXhO7wa2Ny8HYZH/6Q2jmobL2chXzecz0K6YNSTtWazQtCyYNnyIqY7fwY5z5zx8jxQaTHGOpG8Z7EFeminRyK7b9J9qfmEctpfG18ZtXrM3n33qt9772xv2uf+nd286XDvDrV9HndcpOU8aD2lsCF82fgdBb0t6yJKq7a6SE3s2tnDj8/CthFRVrRcYk2oDg4DpGPDgcy2pXtKfIj1wPYOYXZEq9XfePTR+OfvXyvfhB7WT6+9n29ffKuRTdyJs3JZUg/5skN6W9ZViw3BCvaiUYcqvKjLyi1n1eDRFyvl2UTEDDMU7kPYt/zIyR8KfWD0IIS0XSbvahYOV7kwuHqD6fOmZV/0xaF/cf1efVjPWtNJsRAbaYXkiwG9PTfqS7bXg7VkuSOrZdEQrj1Vp6/irxfZHNumFIyNBsLHlrZl7gMfWr6P/CSL7E/IjouQBoPIcKUsJjsMy8FgP/7pn16L3/38dUUc6vd/ned5O7PLejZpNckmXZKX8ixbTbO04aArwNsWV2RvGC0KdwyNarjRixqw43ziV8SeWYwwQ6oa3RFox+ihHD9M0gcEPcrG4aBWn520JnH4r9+7OnkRJ/SCXA756g1P79y5RyfainkKxlKKIgydtIe8ZrwCWjJemleRFucHvBYvHIpIqmLrIJxZymRknIHqNktK2a5hP0MHifywSToaFtOjFTWOu+evDe7e+n7E1js794pevdeKp8PupAhLidlSSFqRtRrL2FPI1o3Pgy/I6llalt0xqp9VzenZEHNjHtsMhE4ER4YjiQObPZF2UdqWs0chpa1k9ss47R9N0ujGjatTzhhi/PaVXxjW9etkk8mD4lw91l2EFlnWJWVLTrNllC0TWCWGNYXUA5+XdB57A7Rckb9fhhxlG5XV9CcNgQHmxOJI9hHoAGnP0i5l+UTSIxEeFzl7rdH5/tX3mN7iu+ulf/pTF0+eHLU1OVl1ys7ZvgA6h30OQk+BdeNVWUuIBaADbhnVhF/YM8/TcGk+J/EYs2ulJ/ND3xPgiYm7SuwlOHAIRy5jvxU6gweDwbRevzx77z3ii4aIL2XQNvzZnxHgV1mr1Q7De638uD6ptYNa5SQthlpzhdK9pHSekK4E/DbWFfA5owXmrzVTqYY+33rsamgOFbcEV/oVlapnH3Rk2Mfelv1I5B9A+aEIjxspHLQ62bA9XZtud5mPLHu2lNfrAQFJm5u3A7ybLY+W852RmxRxySk7p6S3CLzlxCXwBUvnqEhEi5gmkFdZJWc2ocphPF8qjqq4lmwiaCJ5gLVr6ZFI9xEPSH4s9Nh4p+bWwczD09TuT3fqf1Be5lcRfhR/8QvSPEz/pg36i3H9uvOiOGy3s8myo9dA58CXUbpq+S0RNjDLQEeVYlBjPoy9qKap6oVbsgwJM0Hu43Bg2A3iEYl7KfChkh4h9ojuq9AwzTRqhNqY5cF0+YOd8vU6QFrXr9/J4Gq+uDguUlqoF2VqWGopqRPxCvaFyonwFugCeEMKa3ZaAVovtdfVCN4EmoGnQmObsdDA4kiwY/MQ0oNgPbTDVpbl29NJfa/Zu39y+/aPZl/1Xn8tTbLvvafy+vX/1+kpf0gtHrnIa2WSpsLD4HDgQE+JNSutgpYklmwtIrpIbV5CXkHV8M2m530yQhl2TlBdyQuQNoLCbsrSYXI4IpRHoxCPZifp+Gjl4gmvGVV1MvlBsbaWtfPT5kJJuRgzlpy8HDKtYK0JrTtog+Rz4DUUlnFa4qWM+eNpBmCNBQNrftiTDqs3Y9pLsIvCE5Q/yaxdUx7Y5UHZXOvfvv0Ppl/NDnwWX1vX93vv3Yg/+QnjYnZ8bMdZlrIhWXZgp0eIFYueFDaMN2RtCM65KoTkvFQMBxXZhQLcphp4XMdeAJ2TdOjkfZTtyvGJpZ0sxe2MxuOUSJubzG7f5mvZ7K8a16+T1es085FXYh7PkcI5lM4F+bytczitIy3huChCx9AWqQWqz7V/XgCf+pjCVPbAYk/WLvI24jHJj6V826QDKx0LnThPg+GJhrHJcKn79TmNr1XGoNulXN69evo3xYNJL/T7cbm1WyubjejpgoJ6Tt4PITsxcQjMeMrsrpxr3VSTU+ebP9/JMxp6NaO7jqtGAsQyMDWcIh1KfmK8FhwWyfJGKqeiKNLR0bY3N91f/oDy8B3Sux9rxn2bYUgVI9+8ie7eva2dnU01m2QpPWgXqbFaany+KLNLKfMl4BLosuwLwKpxR6hukQllQG6ezkJ/HsyZylS8ZcxU+ASxJ3uripX1UIl7Wcg/miRv17La0SyfjBvj4ewotcql81Vb3e1fkL4uSYNvmKlW5UYnk72WJuWq0PmU0kXsi4hLFpcCPm+0IuhUsbVqkOoyhSGfCxq+AMScRzBDnMhpz7AN4bEUH1n6KEYeZMqeEPIjOQxTeTQNcWUSu0vTCxeY/at/RfnNT5aq4uSrXM0PFztFOt6vh2K15pBaibgYKNdFcZ4ULxN0QeYicNGwgbQkUuNl3nau5MmiYGZpJjNFGjn6FHGItCPitskeofRIKb/vrHwY887O9vbi4P33n3rjb2bfvmHlpKqHbnPzF8Pp8X+ezfJmyEJMWcYoJR07ac/SI5TWTFiRtGy8JFgw6gjaPFtu9gyoSukSNXDXUprnr2u2WqCFoLCeiDt5ZC+GdOha80iz0+PieNY/7Lv/s5/1It9KKuRqPqxnrbI/62ZZezExWg7OVjKxZmXrsnuIHmbdeB20KrEAbn4FPsuICdU8xBPjI5sDgvaC2Qf2krQnpz1F79rjnWleO7hycXHwb/+tvvERGd8Sl9i6fv1evdNZbtZiv60UOo7qRtJiVoSlaNaU4nlLFzAXBD2kVeMVTOfFvfT86pVazhgYGU5B/ac5bBz2RNoBPQZtIZ5kZjcvwl5rvXf0r/+1xl/RJpwJ1679VbG62uu2Zl4uQ7FCSBshhItK8ZKljWBWLZZBC9hdS23ZHaCBVHzpBX4nbOwRhJMEBxK72I8gPAA/Ds52S82OMtWOU5gOiHl/lnmQ5z795S8vjPkW8vzfmpzujRtXp1u/fD8eFr3xpFc7Tmm/XpTtRu6iHTxZnaF9EfrYE+OpRDnnwyZDu0rvPW2TETxHZkRCthpAIdyyWERMAzq10rHMNoFFp9gODvUZLpKlcntXf/qnj46bzQuTd2/jqoniZ8DPvoIY+9PnBNjcvK1+fzPPR4+7Tml5WoT13D4HukzibZNdxemiVfXxVeEZdZncPGUoPtf15/dgGVkQbY0gnACHiB1bjyB9GJz9BqcHCtO9VOb9Ik+jWtmeMBhMG5dPIvzoW5N1e2W6PTY3f5HBuxmHzeao0VjMp3HD5JdJvmxxUWID+RwprFppSdAC1Y0LuWrGfBl+CISImVoeyOyBHoEfWuGh8ZZcbptsJ7MOHNIgThZGZXM67R4NZ8uznfL8S/FDPpVPnnWKcacoivJJM6ndzgiLgtUEvRC8EarzxlugKxY9wQK4UfGTXywNZzsiRdmlpSl4WvEu1Jc4TGhfpJ0EjwPhHuZeyLJHRZoc7kzisNe7Ons1hG9eIYN+iuvXnfeKw/Y0O152rK+J2EvSenBYk9J6xOtCq4hVmZUkloTamGYVH78oxHxw+AjcB/ZdDfbcg7Aj0m5y2JXiHiHfy4gH07I8Upmf0GXYbP67ye3bf/ZCnsm2/vzGvfoRSw3qqZvK4XIq8hWVXs0zVmPyGsFrstYE64hzttcrHTyaLxuCgUtbY+FTo2OJg/n9H2DtA/sE9pLZzZOfzCieFJ4ejIvh4C/+4vcnr1KF9ZVT8H/vPdK/uP7XE/jDwzIrJw7pJIvhidBixCuy1gics7kouBysmVFCc1HITyngPx+qUgy4oAppMqCNtIrTeeAwZGnfSTuk9BjCwzzLHpVKWTWH/scGj5/fS1n/5//dr2uzTr2ZDUcLZWIdpYtZ4hLiYjTrAa3aXhYsAl2gI6llM6flvjhsR9B4Tsc9EN42eoD1SNJ2VNpXNdL5OIRwbNyfMT7dP2F0+fIPn3dw6NeOV86gAV+9cWN6586dsvd4fTR6Z/m4GcvGVKFNiN1QFivJaS9Ip1jlvNRdVqVXTyvSk2q2s8/20J8lFLGBzJXXq1epQy8jDW2fYo4krRPTYsqyGmQhz1LmclBMDptH//SffnC6vOwR3I7vvrvpn916trxDxYG5HZY/2Azb9b9t3JvWWo280S3z6aoUzuPwtojvWOFydSBmWWLBpoWoC/KqU/55OBef6I5/woFhWnXuawAcYXZA95E+QL4XU9p2KPYypeM41mChptFeNiwnox/Gy5dv+xe3L6dX7RX/qq3nmbiJw53r92rL+agdQ2shU309ypeUeMvyZVkbmFXkJeEFB7XnFNU6pgYvzg+xbVApGCEGwIHtLRQ+stL9ELUVA3vB8SBKx8SiH8zpKJyOL87emdyDuX4IfspP7o4WixFlg4JWyNXJyriQYMUhrSmF8w5ckVVxL6rszoJMk0q85UU57K6akDVDTFy9TQaYPqQTSXskPXHwQyc+yvL8QfJsN0vZ4ayeBteuXRi/Dhzy18KgoQon/vz6nfqw/oPWVHFBDqulQy8oWzdpXYlVAquYVWAVaRVYESzYbr18nMnMeILVFz5E2jXsyOxZYU+kg5i0n8G+FfdDWdsjzI4Wy4unwx6zd9/Fd+/+Kuew2ZyG+kLAK6XzVRFXcVgNYs2wZsUeDj3BmmAlia5QE1zjhZ/Xx0WlscQJ5sj4UGIfs4/Yc2BXkV0IO8nlLqG2l7t/Mqs3B79s/rsJL3g++KbxKoYcz4SA61D2FhnVDhfjae14XBtxNKP2OA9xOYkVm3Wsc0HZhohXjOL81RxsN17GqF3F1DXkLqYAdzA9pBOcDkH7QewibyuFB2VWFnksOM4fcXqUje/e3UgcNmvTUF8QoVdGX1KIlyRtmLRh1Kuk0bQEdCy3qFKLNTvlL9r6VCEZwkRoYNKBpC3gkdBWgu0gb9velcJhKMqT2shDwmQ0qv9gfGGLGe9vvvKe+SleG4MG+b33HG/eJN25w2xw+MFwfX3hsHYyrM2KlTZFXM4p94wOIQ6qId9VsGh7htQ2/riEDuh5YtAqd02OyRANm0URZrbHwInhwGJN1gJKtcya1zQbtVaYjeLplqnXapql5RJdyMRV4CrJF+ckrR5Oy6oEDvOKNQh8HCufFU954kpUfXwlDlPEENIRZht8H/kjm4cBPc7kbSf2BqlxMhscT3q9q2n5g/fNO5fTz99/NdJxZ8VrE3L8Lly75mIpPFpotdKyG2E9JG1kcDkGrsy5DWvgJUTHSW2q5s+GUI0XzopUW2dSElV3RoIDoSckHgS4J8KjFNJhkMZOToRQS54tyvkGTlfAlyqyvXugFexu9RaZ14ueG8ZzbjLWGBgKhkangmOkfUhPZB456GGyt2she5IcdvOF8dHt21dGL7YXrw6+EwYNcP36h40utY7zckHOl7IQ16V8PUFPpHWLdTmsVTwRVjDLggWk1stee94QOrQZSOHIjnuSniixjxhYmqpKLhRITTutyqyB1hBLhgWgK14mjw4VP5nhPJd8CD4E7WPt2exh7ZGxJ7OXkQ7KTIeUxRHDvf5/8+//YPA6eeIvwmsUcvxu9HpXZw94cHpuZ6EcN45HtbJxNEuzrVDUF1Ms17EvWOlisC4IDxHRVbk8rzz1iz/Luf51HVk4FtVgJFYdwil4Co5Vj5KC7ALTosojt4EGuIGVvZx7ETZT5IHwPmYLtAV+LPGIpK0o74WYTgSnccooLTJqjtKYo/ha8L/Pgu+Mh37Khbh5/U6427sRdnYIi7O9oiwG7Tyrr+RFulCaKwQuk7iEfVmE80hr2B2LQiZYVFrWlTzQGVN9VXIPSBLJVilRGkVMqrQIgUpYMggyV00MGSJQ6Xo/V075aS7ZkIQSZmYYgPfAj5EeAA+BB7m4X87C43rMDmqjbDgNw1l/aZxGox/GXg/P+/hee+8M3ymDfjauXXPxe53Hi6dN9VIZzmfZ7EJKoWrdRxvI6xAWZXeQm0+LKpUQ4cvkfT/G5wzlZZWHAFzOiyITnupdSH3sI8Ou8RZBjwPaijE8Dnnaao+80x1sHf/8/X/8jVM6v0l85w0arM0fP2iM12sLnsTlDK8IVhJhJTitIVaBNcO6XeV+LS2qGnjTfjl9iq8D83wyPjXhWPIBaAeFJ05pV2JXZg+lfcNBRAeqZ4eN3enJ7b+8MuZVq1V/xfjOxNBfDHmn7lnXj/tN4mxY0K+jXU9T20HdSvpK50y8hLlsNMLMLCE5A1pVlPBt28E882GmQqeWDrD3EjyWdM/2R0FslTHuZ+h4Bqeh0ThtzYajkRnv1C/P+PZv4mvH98BDw9P4enMTwa+y0Wg5z/rTWq1NYxK9SGqcC3Alka6icBn7guSNymNr0VIDp3xuVIHnzGG/wHqfDulzRZI3kqLxBBiADm32kLYF9034DcQPc4etaZwdMl0YTpujj0fj3b79M381nO1XH98Tg/5tGOvPNimK4f12f6bVUGbnFbjkSohlg2rcQg9rGaUlCG1ME1EH1/XCAt9nWp2NSmA61xgZCQ3AfRyODAdIexB3JD2Kifsh08M6nd0HR0eDf/aXlyffZVWo34XvQcjxbAiZ2579i+tp5O7kSLOmZ0GTEPNDBW+TWJO0Lmk9mXOInqp+vUWj4I8zE189bIxcCg3Bx0a7tndE2AH2JfZNPBA6KGHf1l4aTQ5T16f/7J9dntz6y++nMcP32KCf4h5Xy17zwWm/HE+LaTZI8l7ubEGERae4Rpb1ILskp4ErEZpEFcOkl+WHPAtV9whj0KnhCHiC0wPI7kk8NOwYHWTS8TSmfkY6jWNGWqpNtrYuzOZTar+3+N6GHJ/gE8ry5iZhZ+de0emEZj7LOnnp5VmhHuYySW8Lv+1KKmAVsWDclmm6akbNsAMQzk4ksm2SKtJJtDwTjGxOhU4S3g/ikZI+TMEfIh4UyncmZTxqhjh42v70iXYIfB/i5N+FNwb9DGxuOmNnp1mmUTcWtWVynVPypaR4CWsDsSpYRiziqmwNakuuONjVGOgvRaUNFyayx0ankAaSjoWOEukAs2e0FayHDnpI6Sf1mB3Ua6k/Wfrvxy/a8vVdxhuD/gL89JqL7frfNlqN5dZY5WIKXk6wEhRWktOqyFdwWpNYA58T9CzWgAVVRv079nZObDLTShfOh0K7hl2b3QA7hl2ZXfK475jvhzweNib58XCcDR9NPhq//x0vkLwovvcx9Bfh8B1SnTgZjGJsjlvjfjY+zEtvuSy7yvMlUlqT6CX7fAgMqm6Qjw+KCVGbS9N+tnxeVcmToJQYGh0qeZugB9gPK7nZtIX8BBd7swkn9ZxRPmtNBq3RrLm9V/7p5rX4/vvfzr686njjob8QVWxtg372M928BXeu3wi12h/UQ8gWasQVuewRw4UQuJLkd4ArEHoiLWI1LGqyC8+NWiaBSsQMPIFwYtjD6TEKHwXSA6X8EXnaUmBnmGqHo9Hq8MYNEreAm/Dt6+y92nhj0C+AH//43zfXW+8sxDBaKVJtTSGcT4qXCLqgxLqr1q+uoVWFHx+Xz6MVJiKNcCXKjrxP8hMUHgd52zN2A+yV3eLgv/5v1gZnGTb5Bp/gTcjxArh8+X8xrR9tD05p2J5OCcXQ6DDYj4BVE1YNq7IXLTXn0ggAJclDgo7tdBDQQUochqADgo6ifKwi9WOz3a/XHk3E+htjfk68MegXwLu38S+vPZq+804vcVhOStf6tndFaGeKC6nSDukhVl3JdBUAlmYSpwHtQ7ZT9SHmx572RzVa46LTmsxGk1k/7M5qtW9PTut1xpuQ46Vg3QTd3UTLHxCGK9u1U2hrmq9Qm/WMV43asuYG7ZnwqdA+02LHtfJgAKdvH2xM/65zxzfeu5Fu8Saf/DJ4Y9BfMX7yk/9Uz/ONbm08Xi4pF0OeNeyUA0ihTGUc5+TH00bjsCy3+3/xF783+bbX/F3CS8lIvcFvo/sX/2MJ/eG0MTvM8tp2jOlR8uxh8uxhjOlRlte2p43ZIfSHf/wXP3yTS/6K8cagv2K8e3PTFy5szVZXLwzacfVQzXxvFlo7s9DaUTPfa8fVw9XVC4MLF7Zm3Py2V/vdw5uQ42vDlw3leRMjv8EbvMGX4P8Pbkbsf1qX4qIAAAAASUVORK5CYII=" }
};

function site_icon(pathname) {
  const i = SITE_ICONS[pathname];
  if (!i) return null;
  const bin = Uint8Array.from(atob(i.b64), (c) => c.charCodeAt(0));
  return new Response(bin, { headers: { "content-type": i.type, "cache-control": "public, max-age=604800" } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (SITE_ICONS[pathname]) return site_icon(pathname);

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

    if (pathname === '/terms' || pathname === '/terms/') {
      return html(terms_page());
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
