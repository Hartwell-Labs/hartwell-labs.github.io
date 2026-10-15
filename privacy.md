---
title: "Privacy Policy — Data We Collect & Your Rights | Hartwell Labs"
url: https://hartwell-labs.pl/privacy/
canonical: https://hartwell-labs.pl/privacy/
lang: en
page_type: legal
description: "Hartwell Labs privacy policy: what data we collect across our sites and bots (Talus Process Monitor, TrustNode, Scryer, Externum), how it is used, your GDPR/CCPA rights and contact information."
source_html: https://hartwell-labs.pl/privacy/
markdown_twin: https://hartwell-labs.pl/privacy.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# Privacy Policy — Data We Collect & Your Rights | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Privacy*

# Privacy Policy

What we collect, why, and how you stay in control. Last updated: 9 October 2026.

## Who we are

Hartwell Labs (Bartosz Osiej, sole proprietorship, Poland) builds open-source security tooling: Talus Process Monitor, TrustNode, Scryer and Externum. This policy applies to our websites (hartwell-labs.pl and product pages), our bots and any tooling we operate.

### What we collect — websites

Our sites are static pages served over HTTPS. You can read them without an account and we do not run advertising, analytics trackers or social pixels. We keep standard server logs (IP address, user agent, requested resource, timestamp) for security and abuse prevention; these are retained no longer than 14 days. If you enable dark mode or site preferences, they are stored in your browser only (local storage) and never transmitted to us.

### What we collect — bots (TrustNode)

When you install our TrustNode bot into a community chat (e.g. a Root App or Discord server), the bot stores the community/channel identifiers and configured announcement targets needed to deliver bot commands and validator alerts. We do not read private messages, do not store message contents longer than necessary to answer a command, and never sell or share this data. Command usage is logged briefly for abuse monitoring.

### What we collect — support and email

If you contact us by email, we process your address and message solely to answer you and to maintain our records of the correspondence. We keep it for the duration of the business relationship plus retention required by Polish tax law (5 years for invoices).

### Legal bases

We process personal data under: performance of a contract (delivering the bot features you requested), legitimate interest (security of our services, anti-abuse, correspondence), and legal obligation (tax/finance records under Polish law). Where we rely on legitimate interest, you may object at any time.

### Retention & security

Data is retained only as long as needed for the purpose above. We apply encryption in transit (TLS), least-privilege access, and review secrets handling continuously. Our security disclosure process is documented on our /security/ page.

### Your rights

Under the GDPR you may request access, rectification, erasure, restriction, portability and — where processing is based on legitimate interest — object. You also have the right to lodge a complaint with a supervisory authority (in Poland: PUODO). Contact us to exercise any of these rights; we respond within 30 days.

### Children

Our services are not directed at children under 13 (or under 16 in the EEA). If you believe a child provided us personal data, contact us and we will delete it.

### Changes & contact

We may update this policy; the version date below governs. For any privacy request write to contact@hartwell-labs.pl with subject “Privacy”, or use the postal contact listed on our company page.

---
## Visual specification

> Everything below is derived from the live `assets/site.css` and the page DOM. If you regenerate this file (or restyle the site) it stays in sync.

### 1. Palette (CSS custom properties, `assets/site.css` → `:root`)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#ffffff` | tło strony |
| `--bg-subtle` | `#f8fafc` | tło pasków (stats, footer, kod inline) |
| `--border` | `#e2e8f0` | obramowania 1px |
| `--border-strong` | `#cbd5e1` | obramowania wzmocnione |
| `--txt` | `#0f172a` | tekst główny |
| `--txt-2` | `#475569` | tekst drugorzędny (nav, opisy) |
| `--txt-3` | `#94a3b8` | tekst trzeciorzędny (kicker, stopka) |
| `--accent` | `#4f46e5` | akcent / CTA / hover |
| `--accent-hover` | `#4338ca` | akcent po najechaniu |
| `--accent-soft` | `#eef2ff` | tło akcentowe (blockquote) |
| `--green` | `#059669` | stan OK / pozytywny |
| `--green-soft` | `#ecfdf5` | tło stanu OK |
| `--red` | `#dc2626` | błąd / zagrożenie |
| `--red-soft` | `#fef2f2` | tło błędu |
| `--amber` | `#d97706` | ostrzeżenie |
| `--amber-soft` | `#fffbeb` | tło ostrzeżenia |

Motyw jest **jasny** (białe tło). Uwaga: `<meta name="theme-color">` na stronie deklaruje `#0a0e14` (ciemny) i jest niespójne z faktycznym, jasnym CSS-em — przy renderowaniu miej na uwadze, że jasny to stan poprawny.

### 2. Typography and layout

- Body: **Inter** (400/500/600/700), 16px, `line-height: 1.65`, kolor `--txt`.
- Kod inline i bloki: **JetBrains Mono** (400/600).
- Oba kroje z Google Fonts, z `preconnect` do `fonts.googleapis.com` i `fonts.gstatic.com`.
- `.container`: `max-width: 1100px`, wycentrowany, padding 24px po bokach.
- Nagłówek: sticky, wysokość **64px**, tło `rgba(255,255,255,.88)` z `backdrop-filter: blur(10px)`, dolna linia 1px `--border`, `z-index: 50`.
- Stopka: tło `--bg-subtle`, górna linia `--border`, siatka wielokolumnowa + cienka linia legalna.
- Przyciski: wysokość 44px, `border-radius: 10px`, `font-weight: 600`; `.btn-primary` wypełniony akcentem, `.btn-secondary` z obramowaniem.
- Breakpointy w CSS: `@media (max-width: 720px)`, `@media (max-width: 820px)`, `@media (max-width: 420px)` — na wąskich ekranach nawigacja w nagłówku jest ukrywana.

### 3. Page structure (in document order)

1. **Header** — sticky, logo (SVG sześciokąt + zygzak sygnału) po lewej, nawigacja pośrodku, przycisk GitHub po prawej.
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `GitHub ↗` → `https://github.com/Hartwell-Labs`
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Privacy_
   - H1: _Privacy Policy_ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _What we collect, why, and how you stay in control. Last updated: 9 October 2026._
3. **Sekcja `#—`** — *Who we are*
   - Zawartość: tekst (9 akapitów)
4. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 3 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

