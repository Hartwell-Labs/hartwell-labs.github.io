---
title: "About Hartwell Labs — eBPF Security Engineering, Szczecin PL"
url: https://hartwell-labs.pl/company/
canonical: https://hartwell-labs.pl/company/
lang: en
page_type: company
description: "About Hartwell Labs: an independent engineering company from Szczecin, Poland building eBPF security systems, programming languages and penetration testing services. Open source, MIT licensed."
source_html: https://hartwell-labs.pl/company/
markdown_twin: https://hartwell-labs.pl/company.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# About Hartwell Labs — eBPF Security Engineering, Szczecin PL

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Company*

# An engineering company, not a content farm.

Hartwell Labs builds security infrastructure and developer tools the way enterprises build them: with CI gates, supply-chain evidence and a security policy that means something. Everything we make is open source.

## What we do

We maintain ten public products across security infrastructure (eBPF detection, post-quantum crypto, kernel security, embedded attestation), developer tooling (a self-hosted typed language, a browser OS) and offensive security. We dogfood everything: the tools that secure our own systems are the tools we ship.

### Timeline

2026-09-23
talus v0.8.2 & Externum v4.3.0.
Parallel stable releases; talus ships with SBOM and build attestation.
2026-09
First client engagement delivered.
Manual penetration test of a multi-tenant e-commerce platform; English report prepared for the client's external Amazon SP-API audit. Services listed under /company.
2026-09
Article accepted on LinuxSecurity.
Technical deep-dive on eBPF ransomware detection.
2026-09
Hartwell Labs organization launched.
Unified home for all products: GitHub org, product registry, website.
2021–2026
Building in public.
24 repositories with CI/CD, packages on PyPI and crates.io, upstream contributions to aya-rs.

### How we work

01

##### Code over claims

Every feature ships with tests and CI, or it doesn't ship.

02

##### Visibility is defense

You can't protect what you can't see — ask our eBPF hooks.

03

##### Own your stack

Zero dependencies where possible, auditable everywhere.

04

##### Open by default

MIT licensed, issues welcome, egos are not.

### Team

Bartosz Osiej
Founder & CEO · Systems engineering

Rust, eBPF, kernel internals and compilers. Author of talus-process-monitor and Externum; upstream contributor to aya-rs. Technical writer — published on LinuxSecurity.

duds08422-max
Ruby engineering · Bridges & registry

Owns the Ruby division: LabBridge (Rust ⇄ Ruby plugin bridge) and the Products Registry. Cybersecurity and HackTheBox background.

### Engagements

We take a limited number of client engagements each quarter — work where our engineering discipline is the product. Every engagement is performed personally by the named engineer, manual-first, with automated tooling in a supporting role only.

01

##### Manual penetration testing

Web applications, APIs and infrastructure tested by hand against OWASP WSTG, API Security Top 10 and PTES. Deliverable: an English report with CVSS 3.1 scoring, raw evidence annexes and an included retest — written to survive external auditors, not to impress a dashboard.

02

##### Amazon SP-API audit-ready assessment

For teams building on Amazon's Selling Partner API: we test the platform the way the SP-API data-protection assessment will, and assemble the security documentation the auditor expects to see. One pass, no surprises in review.

03

##### Linux hardening and detection

Kernel attack-surface reduction, eBPF-based behavioral detection and incident-ready logging, deployed and documented. The same engineering we ship in talus, applied to your fleet.

04

##### How engagements run

Fixed price, scoped in writing before start. Signed NDA by default. Findings of critical severity are reported during the test, not at the end. Retest included.

Recent: a full external and authenticated penetration test of a multi-tenant e-commerce platform handling Amazon Information — the English report was delivered for the client's external Amazon SP-API audit. To discuss an engagement, reach us at important@hartwell-labs.pl.

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
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Company_
   - H1: _An engineering company, not a content farm._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _Hartwell Labs builds security infrastructure and developer tools the way enterprises build them: with CI gates, supply-chain evidence and a security policy that_
3. **Sekcja `#—`** — *What we do*
   - Zawartość: tekst (13 akapitów)
4. **Footer** — tło `--bg-subtle`, kolumny: Data, Products, Resources, Company (12 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 5 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

