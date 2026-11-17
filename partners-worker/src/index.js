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
