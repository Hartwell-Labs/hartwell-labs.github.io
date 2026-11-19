---
title: "talus-process-monitor — Behavioral ransomware detection & response for Linux | Hartwell Labs"
url: https://hartwell-labs.pl/talus-process-monitor/
canonical: https://hartwell-labs.pl/talus-process-monitor/
lang: en
page_type: product
description: "Behavioral ransomware detection with instant response for Linux fleets. eBPF-based, ~280k events/sec, seccomp and Landlock self-sandboxing, one static binary. $50 per machine per year; $30 from 10 machines."
source_html: https://hartwell-labs.pl/talus-process-monitor/
markdown_twin: https://hartwell-labs.pl/talus-process-monitor.md
last_generated: 2026-11-19
generator: tools/build-ai-pages.py
---

# talus-process-monitor — Behavioral ransomware detection & response for Linux | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Flagship · Rust · eBPF*

# Talus Process Monitor — behavioral ransomware detection that answers with a kill signal.

talus-process-monitor hooks syscall tracepoints in the Linux kernel, scores per-process open-rates in one-second windows and terminates the encryptor with SIGKILL — guardrailed, whitelist-aware, and never at the cost of the host. One static binary. No kernel modules. No telemetry.

[Try 14 days free](mailto:metaforicmail@proton.me?subject=Talus%2014-day%20trial&body=Please%20send%20me%20a%2014-day%20evaluation%20license%20for%20Talus.%0A%0AMachines:%201) → [Deployment guide](https://hartwell-labs.pl/docs#talus) → [Source ↗](https://github.com/Hartwell-Labs/talus-process-monitor)

$50 per machine per year · fleet tier from $30 · one key per machine, delivered by email on payment · VAT invoice · or request a quote by email

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

## Real-world guardrails, real-world results.

*Built for production*

Talus runs where attacks happen: inside the kernel, on your hosts, on your terms.

#### eBPF-native

Kernel-level process events via eBPF. No kernel modules, no reboot, near-zero overhead.

#### Privacy-first

Runs entirely on your servers. No cloud dependency, no telemetry, no third-party servers.

#### Instant activation

Buy through Stripe → activate in under 5 minutes. Ed25519-signed keys, server-side seats.

#### Active development

Ship every week. See the changelog and documentation.

## From install to kill-switch.

*Three minutes, three steps*

1

#### Install

pip install talus-process-monitor && talus license activate <KEY> — eBPF probes attach to the kernel in seconds, zero config.

2

#### Activate

One key per machine. Seats enforced server-side. 30-day Enterprise trial on first run — no card required.

3

#### Monitor

Real-time process events, anomaly alerts, SIGKILL under 1s. Fleet dashboard at your domain.

## Standalone Linux, not Kubernetes.

*Why Talus?*

Talus monitors individual servers and small fleets — no sidecars, no cluster, no Helm.

| Feature | Talus | bpftrace | Falco | Tetragon |
|---|---|---|---|---|
| Feature | Talus | bpftrace | Falco | Tetragon |
| eBPF kernel events | ✅ | ✅ | ✅ | ✅ |
| Process tree visualization | ✅ | ❌ | ⚠️ | ⚠️ |
| Fleet dashboard | ✅ | ❌ | ⚠️ | ⚠️ |
| Anomaly detection | ✅ | ❌ | ✅ | ✅ |
| No Kubernetes required | ✅ | ✅ | ❌ | ❌ |
| Standalone (no sidecar) | ✅ | ✅ | ❌ | ❌ |
| Setup time | 5 min | CLI only | 30+ min | 30+ min |
| Price / year | $50 | Free | Free–$500+ | Free–$500+ |
| Privacy (no cloud) | ✅ | ✅ | ⚠️ | ⚠️ |

Comparison based on publicly available documentation as of 2026. Talus targets standalone Linux servers, not Kubernetes-native security.

## Frequently asked.

*Questions*

How is Talus different from Falco or Tetragon?

Talus is built for standalone Linux servers, not Kubernetes. No sidecars, no cluster, no Helm charts — deploy one binary and monitor.

What are the system requirements?

Linux kernel 5.8+ with BTF enabled. Ubuntu 20.04+, Debian 11+, RHEL 8+, Arch. Root for eBPF attachment. Minimal RAM/CPU overhead.

How does licensing work?

Single: one server, $50 / 200 PLN per year. Fleet: per-node, minimum 10 nodes ($30 / 117 PLN per node/year). Annual subscription, instant activation, cancel anytime.

Can I try before buying?

Yes — a 30-day Enterprise trial starts automatically on first run, no credit card. Need longer? Ask for 14 more days.

Is my data sent to the cloud?

No. Talus runs entirely on your servers. The optional fleet dashboard aggregates from your own nodes — no third-party servers.

What payment methods do you accept?

Stripe checkout — card payments globally, priced in USD or PLN.

## Priced like a tool, not like a platform.

*Pricing*

$50
 / machine / year
Valid from 16 Nov through 30 Nov 2026.
 New price from 1 Dec 2026: 
$100 / machine / year
.

Enterprise tier — one key per machine, one year of updates.

        - Web dashboard, REST API, WebSocket event stream
        - Auto-kill response engine with guardrails
        - SIEM forwarding (RFC5424 / CEF), Kafka, ClickHouse, MemGraph
        - One key per machine — a key activates on exactly one host
        - License key delivered by email the moment payment settles
        - Email support — 48h business-day response
        - Detection engine stays MIT, forever

$30
 / machine / year
Valid from 16 Nov through 30 Nov 2026.
 New price from 1 Dec 2026: 
$60 / machine / year
 (min. 10 machines).

Enterprise Fleet — the same features, minimum 10 machines.

        - Everything in Enterprise, per machine
        - Minimum 10 machines — set the quantity on the checkout page
        - Each machine gets its own key, issued automatically on payment
        - One subscription, one invoice, cancel or change size any time

10 machines or more: 
$150
 / session, billed in USD

Support Session — two hours with the engineer who wrote it.

        - Screen-shared, recorded on request
        - Written follow-up: config diffs, tuning values, exact commands
        - 14 days of email follow-up on the same topic
        - Tuning detectors & response guardrails for your workload
        - Air-gapped install, or lab → production migration

#### Component licensing

| Detection engine (eBPF, scoring, sweep detectors) | MIT — free |
|---|---|
| Dashboard, REST API, WebSocket | per machine |
| Auto-kill response path | per machine |
| SIEM / Kafka / ClickHouse / MemGraph sinks | per machine |
| Source | Public, MIT |

#### MSPs & resellers

Fleet tier starts at $30 per machine for 10 or more — your margin above that. Write to important@hartwell-labs.pl for the vendor order form — net-30 available on direct invoice.

## Verifiable end-to-end.

*Supply chain*

Every release ships with an SBOM and build attestation; provenance is continuous, not advertised in slide decks.

#### SBOM (SPDX)

Full dependency inventory attached to every release asset.

#### Build attestation

Sigstore-style provenance linking source commit to published binary.

#### OpenSSF Scorecard

Supply-chain posture measured continuously on the flagship repository.

## Security stack, one engineering house.

*Other Hartwell Labs tools*

Each tool shares the same eBPF-first, no-Kubernetes, privacy-first DNA as Talus.

## Get eBPF & Linux security insights

*Email*

Monthly. No spam. Unsubscribe anytime.

🛰️ Monitor your Linux servers in real time

    Stripe Checkout is temporarily unavailable. Email 
 for an invoice.

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
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Flagship · Rust · eBPF_
   - H1: _Talus Process Monitor — behavioral ransomware detection that answers with a kill signal._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _talus-process-monitor hooks syscall tracepoints in the Linux kernel, scores per-process open-rates in one-second windows and terminates the encryptor with SIGKI_
   - przycisk drugorzędny: **Try 14 days free** → `mailto:metaforicmail@proton.me?subject=Talus%2014-day%20trial&body=Please%20send%20me%20a%2014-day%20evaluation%20license%20for%20Talus.%0A%0AMachines:%201`
   - przycisk drugorzędny: **Deployment guide** → `https://hartwell-labs.pl/docs#talus`
   - przycisk drugorzędny: **Source ↗** → `https://github.com/Hartwell-Labs/talus-process-monitor`
   - link: **request a quote by email** → `mailto:contact@hartwell-labs.pl?subject=Talus%20Enterprise%20quote&body=Machines%3A%0AHostnames%2FIP%3A%0AWhat%20you%20want%20detected%3A%0AProcurement%20process%3A%0A`
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
6. **Sekcja `#trust`** — *Real-world guardrails, real-world results.*
   - Kicker: _Built for production_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 4 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
7. **Sekcja `#how-it-works`** — *From install to kill-switch.*
   - Kicker: _Three minutes, three steps_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (3 akapitów)
8. **Sekcja `#comparison`** — *Standalone Linux, not Kubernetes.*
   - Kicker: _Why Talus?_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 1 tabel; tekst (2 akapitów)
9. **Sekcja `#faq`** — *Frequently asked.*
   - Kicker: _Questions_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (6 akapitów)
10. **Sekcja `#pricing`** — *Priced like a tool, not like a platform.*
   - Kicker: _Pricing_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 1 tabel; tekst (4 akapitów)
11. **Sekcja `#trust`** — *Verifiable end-to-end.*
   - Kicker: _Supply chain_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 3 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
12. **Sekcja `#related`** — *Security stack, one engineering house.*
   - Kicker: _Other Hartwell Labs tools_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (4 akapitów)
13. **Sekcja `#newsletter-wrap`** — *Get eBPF & Linux security insights*
   - Kicker: _Email_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (1 akapitów)
14. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (13 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 4 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 7 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

