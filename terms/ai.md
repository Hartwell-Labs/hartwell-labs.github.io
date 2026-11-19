---
title: "Hartwell AI — Service Terms — Hartwell Labs"
url: https://hartwell-labs.pl/terms/ai/
canonical: https://hartwell-labs.pl/terms/ai/
lang: en
page_type: product
description: "Terms for Hartwell AI: scope, acceptable use, content, availability and liability."
source_html: https://hartwell-labs.pl/terms/ai/
markdown_twin: https://hartwell-labs.pl/terms/ai.md
last_generated: 2026-11-19
generator: tools/build-ai-pages.py
---

# Hartwell AI — Service Terms — Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

Legal

## Hartwell AI

Version 1.0 · effective 19 November 2026 · master terms · privacy policy

A chat interface that sends your prompts to a language-model provider using your own API key (BYOK).

### 1. Scope

These terms apply to Hartwell AI and form part of our Terms of Service.

We do not provide a model and do not handle billing with the model provider. You use your own API key and pay the provider directly under its pricing.

### 2. Your key and your prompts

Your key is used only to forward requests to the provider you chose. Prefer a key with limited scope that you can revoke.

Prompts are sent to that provider to generate a response. We do not use prompts or outputs to train models. We cannot guarantee the provider does not retain them, so do not submit special-category data, other people’s personal data without a basis, trade secrets or professional secrets.

The provider’s terms and privacy policy apply to its processing.

### 3. Output

Output is a draft, not a fact. It can be incomplete, outdated or wrong. Verify before relying on it, especially in law, medicine, finance and security.

The service does not provide legal, medical, financial or other professional advice.

### 4. Acceptable use

Do not use the service to generate unlawful content, including sexual material involving minors, incitement to violence, weapons-of-mass-destruction instructions, malware, or content that infringes third-party rights. Do not bypass provider safeguards or hammer the service with automated bulk requests.

### 5. Availability and liability

The service depends on a third party and is provided as is, without a service level. We are not liable for provider outages, refusals, price changes or API changes, or for decisions you take based on generated output, to the extent permitted by law.

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
| `--txt-3` | `#64748b` | tekst trzeciorzędny (kicker, stopka) |
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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Firmware` → `https://hartwell-labs.pl/firmware`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `GitHub ↗` → `https://github.com/Hartwell-Labs`
2. **Footer** — tło `--bg-subtle`, kolumny: (proste) (4 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 1 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

