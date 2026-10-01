/**
 * Hartwell Mail Worker — webmail + API + brandowane szablony
 *
 * https://mail.hartwell-labs.pl
 *   GET  /          webmail UI (login hasłem → sesja w KV)
 *   POST /login     {password} → {token}
 *   GET  /me        sesja → aliases
 *   POST /send      {from: alias, to, subject, text|html} → wysyła + loguje do KV
 *   GET  /outbox    historia wysłanych
 *   GET  /health    publiczny
 *
 * Sekrety: MAIL_TOKEN (API dla automatów), MAIL_PASSWORD (webmail)
 */

import PostalMime from "postal-mime";

export interface Env {
  EMAIL: SendEmail;
  KV: KVNamespace;
  MAIL_TOKEN: string;
  MAIL_PASSWORD: string;
  RESEND_API_KEY?: string;
}

interface Alias {
  email: string;
  name: string;
  replyTo?: string;
}

const DOMAIN = "hartwell-labs.pl";

const FROM_ALIASES: Record<string, Alias> = {
  important: { email: `important@${DOMAIN}`, name: "Hartwell Labs — Important" },
  contact: { email: `contact@${DOMAIN}`, name: "Hartwell Labs — Contact" },
  business: { email: `business@${DOMAIN}`, name: "Hartwell Labs — Business" },
  noreply: { email: `noreply@${DOMAIN}`, name: "Hartwell Labs", replyTo: `contact@${DOMAIN}` },
};

const ACCENT = "#F15A24";
const INK = "#0a0e14";

/** Brandowany szablon HTML maila (light body = czytelność w klientach) */
function renderEmail(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8ee;">
    <tr><td style="background:${INK};padding:22px 32px;">
      <table role="presentation" width="100%"><tr>
        <td style="font-size:16px;font-weight:800;letter-spacing:2px;color:#ffffff;">HARTWELL&nbsp;LABS</td>
        <td align="right" style="font-size:11px;color:#8fa0b3;">security&nbsp;·&nbsp;built&nbsp;in&nbsp;the&nbsp;open</td>
      </tr></table>
      <div style="height:3px;background:${ACCENT};margin-top:14px;border-radius:2px;"></div>
    </td></tr>
    <tr><td style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:19px;color:${INK};">${title}</h2>
      <div style="font-size:15px;line-height:1.65;color:#1a202c;">${bodyHtml}</div>
    </td></tr>
    <tr><td style="padding:20px 32px;background:#fafbfc;border-top:1px solid #e3e8ee;">
      <div style="font-size:12px;color:#6b7a8c;line-height:1.6;">
        <strong style="color:${INK};">Hartwell Labs</strong> · <a href="https://${DOMAIN}" style="color:${ACCENT};text-decoration:none;">${DOMAIN}</a><br>
        Security systems, languages and tools — built in the open.<br>
        <span style="color:#9aa8b6;">Wysłano z własnego stacka pocztowego. Zero vendorów.</span>
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Tekst → proste akapity HTML (podwójny newline = nowy paragraf, **bold** wspierany) */
function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;">${p
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });

const uid = () => crypto.randomUUID();

async function readAuth(request: Request, env: Env): Promise<"api" | "session" | null> {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  if (token === env.MAIL_TOKEN) return "api";
  const session = await env.KV.get(`session:${token}`);
  return session ? "session" : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "hartwell-mail", time: new Date().toISOString() });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/app")) {
      return new Response(page(), { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    if (request.method === "POST" && url.pathname === "/login") {
      const { password } = (await request.json().catch(() => ({ password: "" }))) as {
        password?: string;
      };
      if (!password || password !== env.MAIL_PASSWORD) {
        return json({ success: false, error: "złe hasło" }, 401);
      }
      const token = uid();
      await env.KV.put(`session:${token}`, "webmail", { expirationTtl: 7 * 24 * 3600 });
      return json({ success: true, token });
    }

    if (request.method === "GET" && url.pathname === "/me") {
      if (!(await readAuth(request, env))) return json({ success: false, error: "unauthorized" }, 401);
      return json({ success: true, aliases: Object.keys(FROM_ALIASES) });
    }

    if (request.method === "POST" && url.pathname === "/send") {
      if (!(await readAuth(request, env))) return json({ success: false, error: "unauthorized" }, 401);

      let body: {
        from?: string;
        to?: string | { email: string; name?: string };
        toName?: string;
        subject?: string;
        html?: string;
        text?: string;
      };
      try {
        body = await request.json();
      } catch {
        return json({ success: false, error: "invalid json" }, 400);
      }
      if (!body.to || (!body.subject && !body.html && !body.text)) {
        return json({ success: false, error: "missing 'to' and 'subject'/'html'/'text'" }, 400);
      }

      const alias = (body.from ?? "noreply").toLowerCase();
      const from = FROM_ALIASES[alias];
      if (!from) {
        return json(
          { success: false, error: `unknown alias '${alias}'`, allowed: Object.keys(FROM_ALIASES) },
          400,
        );
      }

      const to = (typeof body.to === "string" && body.toName
        ? { email: body.to, name: body.toName }
        : body.to) as string | EmailAddress;

      // html z body -> wysyłamy 1:1 (dla kampanii); inaczej brandujemy text
      const html = body.html ?? renderEmail(body.subject ?? "", textToHtml(body.text ?? ""));
      const text = body.text ?? body.html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

      try {
        const result = await env.EMAIL.send({
          to,
          from: { email: from.email, name: from.name },
          replyTo: from.replyTo,
          subject: body.subject ?? "(no subject)",
          html,
          text,
        });
        const key = `sent:${Date.now()}:${uid()}`;
        await env.KV.put(
          key,
          JSON.stringify({
            from: from.email,
            to: typeof body.to === "string" ? body.to : body.to.email,
            subject: body.subject ?? "(no subject)",
            messageId: result.messageId,
            ts: new Date().toISOString(),
          }),
        );
        return json({ success: true, from: from.email, messageId: result.messageId, via: "cloudflare" });
      } catch (e: any) {
        // Fallback: Cloudflare Email Sending ogranicza odbiorcow do zweryfikowanych
        // adresow. Z weryfikacja domeny w Resend wysylamy na dowolny adres.
        const toEmail = typeof body.to === "string" ? body.to : body.to.email;
        if (env.RESEND_API_KEY) {
          try {
            const rr = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                authorization: `Bearer ${env.RESEND_API_KEY}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                from: `${from.name} <${from.email}>`,
                to: [toEmail],
                reply_to: from.replyTo,
                subject: body.subject ?? "(no subject)",
                html,
                text,
              }),
            });
            const rj: any = await rr.json().catch(() => ({}));
            if (rr.ok && rj.id) {
              const key = `sent:${Date.now()}:${uid()}`;
              await env.KV.put(
                key,
                JSON.stringify({
                  from: from.email,
                  to: toEmail,
                  subject: body.subject ?? "(no subject)",
                  messageId: rj.id,
                  via: "resend",
                  ts: new Date().toISOString(),
                }),
              );
              return json({ success: true, from: from.email, messageId: rj.id, via: "resend" });
            }
            return json({ success: false, error: rj.message ?? "resend send failed", code: rr.status }, 502);
          } catch (re: any) {
            return json({ success: false, error: re?.message ?? "resend request failed", code: null }, 502);
          }
        }
        return json({ success: false, error: e?.message ?? "send failed", code: e?.code ?? null }, 502);
      }
    }

    // ---------- inbox (odebrane) ----------
    if (request.method === "GET" && url.pathname === "/inbox") {
      if (!(await readAuth(request, env))) return json({ success: false, error: "unauthorized" }, 401);
      const list = await env.KV.list({ prefix: "inbox:", limit: 50 });
      const items = await Promise.all(
        list.keys.map(async (k) => {
          const v = await env.KV.get(k.name);
          return v ? JSON.parse(v) : null;
        }),
      );
      return json({
        success: true,
        items: items.filter(Boolean).sort((a, b) => (a.ts < b.ts ? 1 : -1)),
      });
    }

    const inboxId = url.pathname.match(/^\/inbox\/([\w-]+)$/);
    if (request.method === "GET" && inboxId) {
      if (!(await readAuth(request, env))) return json({ success: false, error: "unauthorized" }, 401);
      const meta = await env.KV.get(`inbox:${inboxId[1]}`);
      if (!meta) return json({ success: false, error: "not found" }, 404);
      const full = (await env.KV.get(`inboxfull:${inboxId[1]}`)) ?? "";
      return json({ success: true, message: { ...JSON.parse(meta), body: full } });
    }

    if (request.method === "GET" && url.pathname === "/outbox") {
      if (!(await readAuth(request, env))) return json({ success: false, error: "unauthorized" }, 401);
      const list = await env.KV.list({ prefix: "sent:", limit: 100 });
      const items = await Promise.all(
        list.keys.map(async (k) => {
          const v = await env.KV.get(k.name);
          return v ? JSON.parse(v) : null;
        }),
      );
      return json({ success: true, items: items.filter(Boolean).reverse() });
    }

    return json({ ok: true, service: "hartwell-mail" });
  },

  // Inbound: zapis do Odebranych (webmail) + forward na gmaila (nic nie ginie)
  async email(message: ForwardableEmailMessage, env: Env) {
    const id = crypto.randomUUID().slice(0, 8);
    try {
      const raw = await new Response(message.raw).arrayBuffer();
      const parsed = await PostalMime.parse(raw);
      const meta = {
        id,
        from: parsed.from ? `${parsed.from.name ? parsed.from.name + " " : ""}<${parsed.from.address}>` : message.from,
        to: message.to,
        subject: parsed.subject ?? "(no subject)",
        preview: (parsed.text ?? "").replace(/\s+/g, " ").slice(0, 120),
        ts: new Date().toISOString(),
      };
      await env.KV.put(`inbox:${id}`, JSON.stringify(meta));
      await env.KV.put(`inboxfull:${id}`, parsed.html ?? parsed.text ?? "");
    } catch {
      // parsing nie może zablokować dostarczenia
    }
    await message.forward("mmc29213@gmail.com");
  },
};

// ---------- Webmail UI ----------
function page(): string {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hartwell Mail</title>
<style>
  :root{--bg:#0a0e14;--panel:#11161f;--line:#1e2633;--txt:#d7e0ea;--dim:#7a8aa0;--acc:#F15A24;--ok:#37c988;--err:#ff5c74}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--txt);font:15px/1.5 ui-monospace,Menlo,monospace;min-height:100vh;display:flex;justify-content:center;padding:40px 16px}
  .box{width:100%;max-width:680px}
  h1{font-size:18px;letter-spacing:.12em;margin-bottom:4px}
  h1 b{color:var(--acc)}
  .sub{color:var(--dim);font-size:12px;margin-bottom:24px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:20px;margin-bottom:16px}
  label{display:block;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em;margin:12px 0 4px}
  input,select,textarea{width:100%;background:#0d1219;border:1px solid var(--line);border-radius:6px;color:var(--txt);padding:10px;font:inherit}
  textarea{min-height:130px;resize:vertical}
  button{background:var(--acc);border:0;border-radius:6px;color:#fff;padding:11px 18px;font:inherit;font-weight:700;cursor:pointer;margin-top:14px}
  button:hover{filter:brightness(1.12)}
  .row{display:flex;gap:10px}.row>*{flex:1}
  .msg{margin-top:12px;font-size:13px}
  .ok{color:var(--ok)}.err{color:var(--err)}
  .outbox{border-top:1px solid var(--line);margin-top:14px;padding-top:10px;font-size:12px}
  .outbox div{padding:6px 0;border-bottom:1px dashed var(--line)}
  .outbox .d{color:var(--dim)}
  .hidden{display:none}
  #logout{background:none;border:1px solid var(--line);color:var(--dim);padding:6px 10px;margin:0;float:right;font-size:11px}
  .hint{font-size:11px;color:var(--dim);margin-top:6px}
  .tabs{display:flex;gap:8px;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px}
  .tab{background:none;border:1px solid var(--line);color:var(--dim);padding:7px 12px;margin:0;font-size:12px;font-weight:400}
  .tab.active{color:var(--acc);border-color:var(--acc)}
  .mlist div{padding:7px 6px;border-bottom:1px dashed var(--line);font-size:12px;cursor:pointer}
  .mlist div:hover{background:#151c27}
  .mlist .d{color:var(--dim);cursor:default}
  .mlist div:hover .d{cursor:default}
  #inbox-view{margin-top:12px}
  #inbox-view iframe{width:100%;border:1px solid var(--line);border-radius:8px;background:#fff;min-height:300px}
  #inbox-view .back{font-size:11px}
</style>
</head>
<body>
<div class="box">
  <h1>HARTWELL <b>MAIL</b></h1>
  <div class="sub">mail.hartwell-labs.pl &middot; własny stack, zero vendorów</div>

  <div class="card" id="login-card">
    <label>hasło</label>
    <input type="password" id="pw" placeholder="••••••••" autofocus>
    <button onclick="login()">Wejdź</button>
    <div class="msg" id="login-msg"></div>
  </div>

  <div class="card hidden" id="app-card">
    <button id="logout" onclick="logout()">wyloguj</button>
    <div class="tabs">
      <button class="tab active" data-tab="compose" onclick="switchTab('compose')">✉️ pisz</button>
      <button class="tab" data-tab="inbox" onclick="switchTab('inbox')">📥 odebrane <span id="inbx-n"></span></button>
      <button class="tab" data-tab="sent" onclick="switchTab('sent')">📤 wysłane</button>
    </div>

    <div id="tab-compose">
      <label>skrzynka nadawcy</label>
      <select id="from">
        <option value="important">important@hartwell-labs.pl</option>
        <option value="contact">contact@hartwell-labs.pl</option>
        <option value="business" selected>business@hartwell-labs.pl</option>
        <option value="noreply">noreply@hartwell-labs.pl (reply→contact)</option>
      </select>
      <label>do</label>
      <input id="to" placeholder="ktoś@example.com">
      <div class="row"><div><label>temat</label><input id="subj" placeholder="Temat"></div></div>
      <label>treść</label>
      <textarea id="body" placeholder="Pisz..."></textarea>
      <div class="hint">puste linie = nowe akapity, **pogrubienie** działa. Mail leci w brandowanym szablonie.</div>
      <button onclick="send()">Wyślij</button>
      <div class="msg" id="send-msg"></div>
    </div>

    <div id="tab-inbox" class="hidden">
      <label>odebrane (ostatnie 50, trafiają też na gmaila)</label>
      <div id="inbox-list" class="mlist"><div class="d">ładowanie...</div></div>
      <div id="inbox-view"></div>
    </div>

    <div id="tab-sent" class="hidden">
      <label>wysłane (ostatnie 100)</label>
      <div id="outbox" class="mlist"></div>
    </div>
  </div>
</div>
<script>
const $=id=>document.getElementById(id);
let TOKEN=localStorage.getItem("hm_token")||"";
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

async function api(path,body){
  const r=await fetch(path,{method:body?"POST":"GET",
    headers:{"content-type":"application/json",authorization:"Bearer "+TOKEN},
    body:body?JSON.stringify(body):undefined});
  return r.json();
}

async function login(){
  const r=await fetch("/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:$("pw").value})});
  const j=await r.json();
  if(j.success){TOKEN=j.token;localStorage.setItem("hm_token",TOKEN);showApp();}
  else $("login-msg").innerHTML="<span class='err'>"+esc(j.error||"błąd")+"</span>";
}

async function showApp(){
  const j=await api("/me").catch(()=>({success:false}));
  if(!j.success){TOKEN="";localStorage.removeItem("hm_token");return;}
  $("login-card").classList.add("hidden");
  $("app-card").classList.remove("hidden");
  loadInbox();
}

async function send(){
  $("send-msg").textContent="wysyłam...";
  const j=await api("/send",{from:$("from").value,to:$("to").value,subject:$("subj").value,text:$("body").value});
  if(j.success){
    $("send-msg").innerHTML="<span class='ok'>✓ wysłane z "+esc(j.from)+"</span>";
    $("to").value="";$("subj").value="";$("body").value="";
  } else $("send-msg").innerHTML="<span class='err'>"+esc(j.error||"błąd")+"</span>";
}

async function loadOutbox(){
  const j=await api("/outbox");
  if(!j.success)return;
  $("outbox").innerHTML=j.items.map(i=>
    "<div><span class='d'>"+esc(i.ts.slice(0,16).replace("T"," "))+"</span> → "+esc(i.to)+" — "+esc(i.subject)+"</div>").join("")||"<div class='d'>pusto</div>";
}

async function loadInbox(){
  const j=await api("/inbox");
  if(!j.success)return;
  const items=j.items;
  $("inbx-n").textContent=items.length?("("+items.length+")"):"";
  $("inbox-list").classList.remove("hidden");
  $("inbox-view").innerHTML="";
  $("inbox-list").innerHTML=items.map(i=>
    "<div data-id='"+esc(i.id)+"'><span class='d'>"+esc(i.ts.slice(5,16).replace("T"," "))+"</span> <b>"+esc(i.from.slice(0,45))+"</b><br>"+esc(i.subject)+"</div>").join("")||"<div class='d'>pusto</div>";
}

async function openMsg(id){
  const j=await api("/inbox/"+id);
  if(!j.success)return;
  const m=j.message;
  const isHtml=m.body&&m.body.trim().startsWith("<");
  const blob=new Blob([m.body||m.preview||""],{type:isHtml?"text/html":"text/plain"});
  const u=URL.createObjectURL(blob);
  $("inbox-list").classList.add("hidden");
  $("inbox-view").innerHTML="<button class='back' onclick='backToInbox()'>← wróć</button>"
    +"<h3 style='margin:10px 0 4px;font-size:14px'>"+esc(m.subject)+"</h3>"
    +"<div class='d' style='font-size:11px;margin-bottom:8px'>od: "+esc(m.from)+" · "+esc(m.ts.slice(0,16).replace("T"," "))+"</div>"
    +"<iframe src='"+u+"' sandbox=''></iframe>";
}

function backToInbox(){$("inbox-list").classList.remove("hidden");$("inbox-view").innerHTML="";}

function switchTab(t){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===t));
  ["compose","inbox","sent"].forEach(x=>$("tab-"+x).classList.toggle("hidden",x!==t));
  if(t==="inbox")loadInbox();
  if(t==="sent")loadOutbox();
}

document.addEventListener("click",e=>{
  const row=e.target.closest("#inbox-list div[data-id]");
  if(row)openMsg(row.dataset.id);
});

function logout(){TOKEN="";localStorage.removeItem("hm_token");location.reload();}
if(TOKEN)showApp();
</script>
</body>
</html>`;
}
