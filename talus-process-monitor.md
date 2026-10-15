---
title: "talus-process-monitor — Behavioral ransomware detection & response for Linux | Hartwell Labs"
url: https://hartwell-labs.pl/talus-process-monitor/
canonical: https://hartwell-labs.pl/talus-process-monitor/
lang: en
page_type: product
description: "Behavioral ransomware detection with instant response for Linux server fleets. eBPF-based, ~280k events per second, seccomp and Landlock self-sandboxing, one static binary, no kernel modules. $50 per node, one year of updates."
source_html: https://hartwell-labs.pl/talus-process-monitor/
markdown_twin: https://hartwell-labs.pl/talus-process-monitor.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# talus-process-monitor — Behavioral ransomware detection & response for Linux | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Flagship · Rust · eBPF*

# Behavioral ransomware detection that answers with a kill signal.

talus-process-monitor hooks syscall tracepoints in the Linux kernel, scores per-process open-rates in one-second windows and terminates the encryptor with SIGKILL — guardrailed, whitelist-aware, and never at the cost of the host. One static binary. No kernel modules. No telemetry.

[Buy Enterprise — $50/node](https://buy.polar.sh/polar_cl_E577BTilme4dnUFsfbG0aE4qo7QILaugmEjsA0oajKK) → [Deployment guide](https://hartwell-labs.pl/docs#talus) → [Source ↗](https://github.com/Hartwell-Labs/talus-process-monitor)

$50 per node · 12 months of updates · license key delivered instantly on checkout · VAT invoice via Polar · or request a quote by email

| Value | Label |
|---|---|
| **~280k** | events per second, single core |
| **7.6%** | sustained CPU under synthetic load |
| **<1s** | verdict to SIGKILL, same second |
| **188** | tests in the CI suite, every push |

## Three layers, one binary.

*What it does*

Detection is the easy half. Talus ships the half nobody writes up: the response path.

#### Detect: behavior, not signatures

Mass file-opens scored per process in 1s windows; canary reads, mass-delete and exfiltration-spike detectors. Signature-free — catches strains nobody has named yet.

#### Respond: SIGKILL in the same second

When the verdict fires, the offending process is killed immediately. Guardrails, per-path whitelists and canary verification keep it fast without being reckless.

#### Contain: Landlock & seccomp self-sandboxing

The agent sandboxes itself before it starts watching: no kernel modules, no writable footprint outside its own directory, verified by its own tests.

#### Ship: SIEM, Kafka, ClickHouse, MemGraph

Forward alerts as RFC5424 or CEF, stream raw events to Kafka, persist to ClickHouse, explore process lineage in MemGraph. Self-hosted, your infrastructure.

## From pip to live dashboard.

*Sixty-second start*

```console
pip install talus-process-monitor
```

```console
talus-monitor install
```

```console
sudo talus --web 10.0.0.5:8443
```

```console
talus-monitor selftest --canary
```

The canary self-test simulates a ransomware burst with harmless file operations and prints the real verdict — detection proof on your hardware in under a minute. Full flags and tuning: /docs and the Field Guide.

## Priced like a tool, not like a platform.

*Pricing*

$50
 / node / year

Enterprise tier — one host, one year of updates.

        - Web dashboard, REST API, WebSocket event stream
        - Auto-kill response engine with guardrails
        - SIEM forwarding (RFC5424 / CEF), Kafka, ClickHouse, MemGraph
        - License key delivered instantly on checkout
        - Email support — 48h business-day response
        - Detection engine stays MIT, forever

$150
 / session

Support Session — two hours with the engineer who wrote it.

        - Screen-shared, recorded on request
        - Written follow-up: config diffs, tuning values, exact commands
        - 14 days of email follow-up on the same topic
        - Tuning detectors & response guardrails for your workload
        - Air-gapped install, or lab → production migration

#### Component licensing

| Detection engine (eBPF, scoring, sweep detectors) | MIT — free |
|---|---|
| Dashboard, REST API, WebSocket | $50/node |
| Auto-kill response path | $50/node |
| SIEM / Kafka / ClickHouse / MemGraph sinks | $50/node |
| Source | Public, MIT |

#### MSPs & resellers

Batch prepaid keys at the $50 floor, your margin above, your pricing. Write to important@hartwell-labs.pl for the vendor order form — net-30 available on direct invoice.

## Verifiable end-to-end.

*Supply chain*

Every release ships with an SBOM and build attestation; provenance is continuous, not advertised in slide decks.

#### SBOM (SPDX)

Full dependency inventory attached to every release asset.

#### Build attestation

Sigstore-style provenance linking source commit to published binary.

#### OpenSSF Scorecard

Supply-chain posture measured continuously on the flagship repository.

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
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Flagship · Rust · eBPF_
   - H1: _Behavioral ransomware detection that answers with a kill signal._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _talus-process-monitor hooks syscall tracepoints in the Linux kernel, scores per-process open-rates in one-second windows and terminates the encryptor with SIGKI_
   - przycisk główny: **Buy Enterprise — $50/node** → `https://buy.polar.sh/polar_cl_E577BTilme4dnUFsfbG0aE4qo7QILaugmEjsA0oajKK`
   - przycisk drugorzędny: **Deployment guide** → `https://hartwell-labs.pl/docs#talus`
   - przycisk drugorzędny: **Source ↗** → `https://github.com/Hartwell-Labs/talus-process-monitor`
   - link: **request a quote by email** → `mailto:contact@hartwell-labs.pl?subject=Talus%20Enterprise%20quote%20%E2%80%94%20%2450%2Fnode&body=Nodes%3A%0AHostnames%2FIP%3A%0AWhat%20you%20want%20detected%3A%0AProcurement%20process%3A%0A`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **~280k** — events per second, single core
   - **7.6%** — sustained CPU under synthetic load
   - **<1s** — verdict to SIGKILL, same second
   - **188** — tests in the CI suite, every push
4. **Sekcja `#capabilities`** — *Three layers, one binary.*
   - Kicker: _What it does_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 4 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
5. **Sekcja `#start`** — *From pip to live dashboard.*
   - Kicker: _Sixty-second start_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 4 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
6. **Sekcja `#pricing`** — *Priced like a tool, not like a platform.*
   - Kicker: _Pricing_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 1 tabel; tekst (3 akapitów)
7. **Sekcja `#trust`** — *Verifiable end-to-end.*
   - Kicker: _Supply chain_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 3 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
8. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 4 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 8 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

