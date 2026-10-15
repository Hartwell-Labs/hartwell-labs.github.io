---
title: "Security & Coordinated Disclosure (CVD) — Hartwell Labs"
url: https://hartwell-labs.pl/security/
canonical: https://hartwell-labs.pl/security/
lang: en
page_type: security
description: "Hartwell Labs security policy: coordinated vulnerability disclosure (CVD), 48-hour acknowledgment SLA, severity classification, supported versions, safe harbor for security researchers and ENISA SRP reporting."
source_html: https://hartwell-labs.pl/security/
markdown_twin: https://hartwell-labs.pl/security.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# Security & Coordinated Disclosure (CVD) — Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Security*

# Found something? Tell us first.

We practice coordinated disclosure across all products. This page defines exactly what you can expect from us — response times, severity handling and legal safe harbor for researchers.

[Report a vulnerability](mailto:important@hartwell-labs.pl?subject=Security%20report%3A%20%5Bproduct%5D) → [security.txt](https://hartwell-labs.pl/.well-known/security.txt)

## How disclosure works

Send a report to the security contact below. Include a description, reproduction steps and affected product/version. We will:

48 hours
Acknowledgment.
You receive a confirmation with a tracking reference.
Days 2–7
Triage & severity.
We reproduce, classify per the table below and agree on a coordination timeline with you.
Fix
Remediation.
Patch developed, tested and released per the severity SLA. You get pre-release access to verify the fix.
Release
Public disclosure.
Advisory published with credit (opt-in). Nothing is published before a fix ships, unless the vulnerability is already being exploited.

### Severity & response targets

| Severity (CVSS 3.1) | Examples | Acknowledgment | Fix target |
|---|---|---|---|
| Severity (CVSS 3.1) | Examples | Acknowledgment | Fix target |
| Critical 9.0–10.0 | RCE, auth bypass, signature-verified pipeline escape | 48 hours | 7 days |
| High 7.0–8.9 | Privilege escalation, detection evasion by design | 48 hours | 30 days |
| Medium 4.0–6.9 | Info leaks, weak defaults in optional modes | 48 hours | 90 days |
| Low 0.1–3.9 | Hardening opportunities, documentation gaps | 48 hours | Best effort |

### Supported versions

| Product | Supported line | Latest release | Security fixes |
|---|---|---|---|
| Product | Supported line | Latest release | Security fixes |
| talus-process-monitor | v0.8.x | v0.8.2 (2026-09-23) | Yes |
| Externum | v4.3.x | v4.3.0 (2026-09-23) | Yes |
| All other products | latest | see releases page | Yes |
| Older releases | — | — | Unsupported |

### Safe harbor

We consider security research conducted in good faith and in accordance with this policy to be authorized. We will not pursue legal action against researchers who: use only their own accounts and test data, avoid service degradation, give us reasonable time to remediate before public disclosure, and do not access data belonging to other users. If you are unsure whether your activity fits, contact us first — we will help you draw the line.

### Hall of Fame

No external reports yet — the list is empty on purpose, not by omission. If you find a real issue in our products, this is where your name goes.

Impatient? Try to break our products — the challenge lives in the hack-the-lab repository.

#### Your name here

opt-in credit

We credit only with your explicit consent — anonymous acknowledgment ("a friendly researcher") works just as well.

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
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Security_
   - H1: _Found something? Tell us first._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _We practice coordinated disclosure across all products. This page defines exactly what you can expect from us — response times, severity handling and legal safe_
   - przycisk główny: **Report a vulnerability** → `mailto:important@hartwell-labs.pl?subject=Security%20report%3A%20%5Bproduct%5D`
   - przycisk drugorzędny: **security.txt** → `https://hartwell-labs.pl/.well-known/security.txt`
3. **Sekcja `#—`** — *How disclosure works*
   - Zawartość: 1 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień); 2 tabel
4. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 6 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

