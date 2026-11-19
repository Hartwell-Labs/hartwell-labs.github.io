---
title: "Talus Pricing — $50/year single, $30/node/year fleet"
url: https://hartwell-labs.pl/talus-process-monitor/pricing.html
canonical: https://hartwell-labs.pl/talus-process-monitor/pricing.html
lang: en
page_type: product
description: "Talus Process Monitor pricing. Single server $50/yr, fleet $30/node/year (min 10 nodes). PLN + USD. Annual subscription, cancel anytime. Buy and activate in 5 minutes."
source_html: https://hartwell-labs.pl/talus-process-monitor/pricing.html
markdown_twin: https://hartwell-labs.pl/talus-process-monitor/pricing.html.md
last_generated: 2026-11-19
generator: tools/build-ai-pages.py
---

# Talus Pricing — $50/year single, $30/node/year fleet

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

Flagship · Rust · eBPF

## Talus Process Monitor — pricing that scales with your fleet

One static eBPF binary per Linux host. Per-machine annual license. Cancel anytime. PLN and USD, no trial credit card.

 USD ($)
 PLN (zł)

| Plan | Single | Fleet |
|---|---|---|
| Plan | Single | Fleet |
| Price per year | $50 / 200 PLN | $30 / 117 PLN per node |
| Min. quantity | 1 | 10 nodes |
| Billed as | one machine | annual subscription, min $300 |
| Same features | ✅ web dashboard, REST API, SIGKILL auto-response, SIEM sinks, fleet view |
| License delivery | Ed25519 key by email on Stripe payment — instant |
| Support | Email, 48h business-day SLA |

Promotional prices valid from 16 Nov through 30 Nov 2026.

    From 1 Dec 2026: 
$100 / machine / year
 single; 
$60 / machine / year
 fleet (min. 10 machines).
  
$50
 / machine / year
Valid from 16 Nov through 30 Nov 2026.
 New price from 1 Dec 2026: 
$100 / machine / year
.

Enterprise tier — one key per machine.

  - Detection + SIGKILL response + SIEM sinks
  - eBPF, single static binary, no kernel modules
  - No cloud, no telemetry
  - SPDX SBOM + build provenance

Fleet license — nodes
10 nodes
500 nodes
$30
/year
($30 
/node
)
117 zł
/year
(117 zł 
/node
)
Fleet price valid from 16 Nov through 30 Nov 2026.
 New price from 1 Dec 2026: 
$60 / machine / year
 (min. 10 machines).

## Frequent questions
How is Talus different from Falco or Tetragon?

Talus is built for standalone Linux servers, not Kubernetes. No sidecars, no cluster, no Helm charts.

What are the system requirements?

Linux 5.8+ with BTF. Ubuntu 20.04+, Debian 11+, RHEL 8+, Arch. Root for eBPF.

Can I change the number of nodes later?

Yes — fleet is a subscription; change seat count in your Stripe portal any time, prorated.

Do I get a refund if not satisfied?

14-day money-back guarantee on request — email contact@hartwell-labs.pl.

← Back to product page

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Talus` → `https://hartwell-labs.pl/talus-process-monitor/`, `Firmware` → `https://hartwell-labs.pl/firmware`, `Pricing` → `#pricing`, `Docs` → `https://hartwell-labs.pl/docs`
2. **Sekcja `#faq`** — *Frequent questions*
   - Zawartość: tekst (4 akapitów)
3. **Footer** — tło `--bg-subtle`, kolumny: (proste) (0 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 1 linków-kotwic do sekcji na tej samej stronie (`#id`).
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

