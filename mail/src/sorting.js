/**
 * Talus Mail sorting — heurystyka kategorii dla skrzynki Hartwell Labs.
 *
 * Kategorie:
 *   priority  — znany kontakt / odpowiedź w wątku / temat Talus
 *   sales     — zapytanie ofertowe, demo, współpraca
 *   hosting   — dostawca hostingu / infrastruktury
 *   normal    — reszta
 *   spam      — wysoki score i brak zaufanego nadawcy
 *
 * To nie jest antywirus. To filtr porządkowy: nie usuwa maili, tylko je układa.
 * Ręczna korekta w UI ustawia sort_locked=1 i wyłącza nadpisywanie.
 */

export const CATEGORY_LABELS = {
  priority: "Priorytet",
  sales: "Sprzedaż",
  hosting: "Hosting",
  normal: "Normalne",
  spam: "Spam",
};

const PROSPECT_EMAILS = new Set([
  "info@webh.pl",
  "support@hostovita.pl",
  "admin@mathost.eu",
  "kontakt@nazwa.pl",
  "sales@oktawave.com",
  "kontakt@hostersi.pl",
  "biuro@awhost.pl",
  "kontakt@lcloud.pl",
  "damian@qlos.com",
  "sales@cloudlinux.com",
  "sales@plesk.com",
  "sales@cpanel.net",
  "sales@sherweb.com",
  "sales@upcloud.com",
  "partners@digitalocean.com",
  "biuro@4prime.pl",
  "handlowy@itns.pl",
  "biuro@allnetgroup.pl",
  "damiko@damiko.pl",
  "biuro@wingu.pl",
]);

const PROSPECT_DOMAINS = new Set([
  "webh.pl",
  "hostovita.pl",
  "mathost.eu",
  "nazwa.pl",
  "oktawave.com",
  "hostersi.pl",
  "awhost.pl",
  "lcloud.pl",
  "qlos.com",
  "cloudlinux.com",
  "plesk.com",
  "cpanel.net",
  "sherweb.com",
  "upcloud.com",
  "digitalocean.com",
  "4prime.pl",
  "itns.pl",
  "allnetgroup.pl",
  "damiko.pl",
  "wingu.pl",
]);

const SALES_RE = /\b(oferta|oferty|cennik|wycena|wycen|demo|prezentacj|wsp[oó]?[łl]praca|partnerstw|zapytanie|pilot[aż]|licencj|zakup|purchase|pricing|quote|proposal|partnership|trial|pilot)\b/i;
const BUYING_RE = /\b(zapytanie|wycena|wycen|cennik|demo|pilot[aż]|licencj|zakup|purchase|pricing|quote|proposal|trial)\b/i;
const HOSTING_RE = /\b(hosting|vps|vds|kvm|serwer|serwery|dedyk|cloud|chmura|msp|reseller|whm|cpanel|plesk|domena|domeny|datacenter|kolokacj|infrastruktur)\b/i;
const TALUS_RE = /\b(talus|ransomware|e?bpf|edr|xdr|auto-kill|pilot[aż])\b/i;
const REPLY_RE = /^\s*(re|odp|aw|fwd|fw)\s*:/i;

const SPAM_TERMS = [
  /\b(seo|guest post|backlink|link building|linki sponsorowane)\b/i,
  /\b(crypto|bitcoin|forex|inwestycj|investment|loan|po[żz]yczk)\b/i,
  /\b(viagra|casino|kasyno|pills|tabletki)\b/i,
  /\b(web design|website redesign|digital marketing|agencja marketingowa)\b/i,
  /\b(bitcoin|crypto|nft|airdrop|token)\b/i,
];

const SUSPICIOUS_TLDS = new Set([
  "xyz", "top", "click", "loan", "work", "buzz", "monster", "icu", "cyou", "rest", "sbs",
]);

function addressOf(value) {
  const raw = String(value || "").trim();
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

function domainOf(address) {
  const at = address.lastIndexOf("@");
  return at >= 0 ? address.slice(at + 1) : "";
}

function plainText(html) {
  return String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {{from?: string, fromName?: string, subject?: string, text?: string, html?: string}} msg
 * @returns {{category: string, spamScore: number, reason: string}}
 */
export function classifyEmail(msg) {
  const address = addressOf(msg.from);
  const domain = domainOf(address);
  const subject = String(msg.subject || "");
  const text = String(msg.text || "") || plainText(msg.html);
  const body = `${subject}\n${text}`.toLowerCase();

  if (!address || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { category: "spam", spamScore: 100, reason: "brak poprawnego nadawcy" };
  }

  const trusted =
    PROSPECT_EMAILS.has(address) ||
    PROSPECT_DOMAINS.has(domain) ||
    domain === "hartwell-labs.pl" ||
    domain.endsWith(".hartwell-labs.pl");

  let spamScore = 0;
  const reasons = [];

  if (trusted) reasons.push("znany kontakt");
  if (REPLY_RE.test(subject)) {
    spamScore -= 20;
    reasons.push("odpowiedź w wątku");
  }
  if (TALUS_RE.test(body)) {
    spamScore -= 15;
    reasons.push("temat Talus");
  }

  if (!trusted) {
    const tld = domain.split(".").pop() || "";
    if (SUSPICIOUS_TLDS.has(tld)) {
      spamScore += 25;
      reasons.push(`podejrzana domena .${tld}`);
    }
    if (subject.length > 12 && subject === subject.toUpperCase() && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(subject)) {
      spamScore += 15;
      reasons.push("temat CAPS");
    }
    let hits = 0;
    for (const re of SPAM_TERMS) if (re.test(body)) hits++;
    if (hits) {
      spamScore += Math.min(60, hits * 25);
      reasons.push(`słowa spamowe ×${hits}`);
    }
    const links = (String(msg.html || "").match(/https?:\/\//g) || []).length;
    if (links > 12 && text.length < 2500) {
      spamScore += 20;
      reasons.push(`dużo linków (${links})`);
    }
    if (/(unsubscribe|wypisz|rezygnacja)/i.test(body) && /(offer|promocj|rabat|discount)/i.test(body)) {
      spamScore += 10;
      reasons.push("masowa oferta");
    }
  }

  if (!trusted && spamScore >= 70) {
    return { category: "spam", spamScore, reason: reasons.join(", ") || "wysoki score" };
  }

  if (trusted || REPLY_RE.test(subject) || TALUS_RE.test(body)) {
    return {
      category: "priority",
      spamScore,
      reason: reasons.join(", ") || "znany kontakt",
    };
  }

  const hosting = HOSTING_RE.test(body);
  if (SALES_RE.test(body) && (!hosting || BUYING_RE.test(body))) {
    return { category: "sales", spamScore, reason: reasons.join(", ") || "zapytanie ofertowe" };
  }

  if (hosting) {
    return { category: "hosting", spamScore, reason: reasons.join(", ") || "temat hostingowy" };
  }

  return {
    category: "normal",
    spamScore,
    reason: reasons.join(", ") || "brak sygnałów",
  };
}
