---
title: "Talus Process Monitor — license activation"
url: https://hartwell-labs.pl/talus-process-monitor/activated.html
canonical: https://hartwell-labs.pl/talus-process-monitor/activated.html
lang: en
page_type: product
description: "Confirm your Talus Process Monitor purchase. Your license key is issued on payment and delivered by email. Activate in under five minutes with talus license activate."
source_html: https://hartwell-labs.pl/talus-process-monitor/activated.html
markdown_twin: https://hartwell-labs.pl/talus-process-monitor/activated.html.md
last_generated: 2026-11-20
generator: tools/build-ai-pages.py
---

# Talus Process Monitor — license activation

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

### Confirming your payment…

One moment — we are asking Stripe for the status of this order.

### We could not match this link to a payment

Either the link is incomplete, or the payment has not finished settling yet. If you were charged, the licence key still reaches you by email — see below.

Try again later, or email contact@hartwell-labs.pl with your order id — a key is sent on payment regardless.

### Payment received. Your licence key is on its way.

We send one email with the key —. It usually arrives within a minute. If it has not arrived after ten, check spam, then use the fallback below.

Order 
—
Status 
—
Renews 
1 year from today

#### No email after ten minutes?

Write to contact@hartwell-labs.pl quoting the order id above. We resend the key by hand — usually the same day.

Back to Talus

Next

### From key to running agent

    - #### Download the binary One static ELF for x86_64 and aarch64, from the releases page. No kernel modules, no agent to install separately.
    - #### Activate Run talus-monitor activate and paste the key from the email. The key binds to this machine and activates on this node.
    - #### Watch talus-monitor run starts the eBPF probes. The dashboard and REST API come up on the port you chose during activation.

Deployment guideProduct page

### Nothing to confirm — this is the manual path

You reached this page directly, without a payment link. If you have already paid, the key comes by email. If you are here to buy:

Buy Talus Enterprise · single machine

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Firmware` → `https://hartwell-labs.pl/firmware`, `Docs` → `https://hartwell-labs.pl/docs`, `Talus` → `https://hartwell-labs.pl/talus-process-monitor/`
2. **Footer** — tło `--bg-subtle`, kolumny: (proste) (0 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 2 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

