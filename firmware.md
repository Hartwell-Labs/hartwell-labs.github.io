---
title: "Firmware engineering for CRA and RED assessment — Hartwell Labs"
url: https://hartwell-labs.pl/firmware/
canonical: https://hartwell-labs.pl/firmware/
lang: en
page_type: product
description: "Signed updates, secure boot, SBOM, vulnerability handling and firmware review for products under the Cyber Resilience Act and the Radio Equipment Directive. Technical delivery for assessment bodies, test labs and consultancies."
source_html: https://hartwell-labs.pl/firmware/
markdown_twin: https://hartwell-labs.pl/firmware.md
last_generated: 2026-11-19
generator: tools/build-ai-pages.py
---

# Firmware engineering for CRA and RED assessment — Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Firmware*

# The firmware part is the hard part.

Most of a cyber-resilience file can be written by a lawyer. The parts that get rejected are the ones that need someone to read the boot chain: is the update actually signed, does the device refuse an old image, can a key be extracted from flash, and can you prove it three years later when a component you shipped has a CVE.

[Describe the product](mailto:business@hartwell-labs.pl?subject=Firmware%20engagement) → [What we deliver](#delivery)

## Why this is where products fail

The reporting duty under Article 14 has applied since 11 September 2026: an actively exploited vulnerability has to reach ENISA and the national CSIRT within 24 hours, with a notification at 72 hours and a final report at 14 days. That clock does not start in a policy document — it starts with someone being able to answer, within an hour, whether a given CVE affects a given release. If the answer requires rebuilding an image to find out, the deadline is already gone.

The same gap shows up earlier, in the radio equipment route: EN 18031 has applied since 1 August 2025, and its clauses on secure updates, access control, key storage and network monitoring are firmware clauses. Products that claim them without a signed update path and a protected key store do not survive a technical review.

## What we deliver

#### Signed update chain

engineering

Ed25519 or RSA-3072 image signing, verified in the bootloader before execution; signed manifest over every partition; A/B slots with atomic switch and rollback; anti-rollback counter in OTP fuses; staged rollout and recovery path. Key ceremony and offline signing procedure included.

#### Secure boot

engineering

Root of trust pinned to what the silicon already has: boot ROM, OTP fuses, TPM 2.0 or a secure element. Measured boot with a signed event log where available, plus the factory provisioning procedure and a written key-loss and recovery path.

#### Firmware review

assessment

Boot chain, update path, key and credential storage, debug and recovery interfaces (JTAG, UART console, factory and service modes), update server authentication. Every finding carries the evidence and the exact steps an assessor can repeat.

#### SBOM and vulnerability handling

process

SBOM generated at build time in SPDX or CycloneDX and stored with the released artifact; dependency monitoring mapped to the versions actually shipped; triage that separates not-affected from exploitable; CVD policy with a working intake channel and a rehearsed 24-hour reporting path.

#### Assessment evidence

documentation

Architecture and data flow, requirement-to-artefact mapping, test records, and the rationale wherever a requirement is not applicable. Written so an assessor can test the claim without us in the room, and so it still holds up at the five-year support date.

#### Retrofit on shipped products

engineering

Where the boot ROM verifies a signature, a signed update path can be added to hardware already in the field without a board revision. Where it cannot, we say so at scope time and price the board change or a compensating control instead of selling a review that ends in a dead end.

## Working with assessment bodies

A large part of this work is delivered behind someone else's name. If you assess products, sell compliance work or run a test laboratory, you own the client relationship and the report — we deliver the firmware analysis, the fixes and the evidence sections, on a fixed scope and a fixed price. You do not need to keep an embedded engineer on payroll to accept a firmware-heavy file, and we do not contact your client.

#### Subcontract terms

white label

Fixed-price line items, 14-day payment from the partner, no exclusivity unless it comes with a volume commitment, and a written boundary on scope changes. Delivered under your documentation template where you have one.

## How an engagement runs
Day 1
Scope.
One call, then a written scope: product, silicon, whether the update path already exists, and which claims in the file need evidence.
Days 2–3
Fixed price.
A priced list, not an estimate. Nothing starts until the scope is agreed in writing.
Weeks 1–4
Work.
Review, then implementation, then re-test. Findings are delivered as they are confirmed, not saved for a final presentation.
Handover
Evidence.
Documents, test records and the signing or provisioning procedure, in a form your assessor can follow without us in the room.

## What we work with

Bare-metal and RTOS on Cortex-M and RISC-V; embedded Linux built with Yocto or Buildroot; U-Boot and TF-A boot chains; TPM 2.0, secure elements and fuse-based verification; HSM-backed or offline signing; OTA over HTTPS, MQTT or a vendor channel. If your platform is outside that list, the first answer will say so rather than the third invoice.

Hartwell Labs is an engineering company in Szczecin, Poland. Work is delivered in English or Polish. For assessment bodies and consultancies, ask for the subcontract sheet with line items and turnaround times.

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Firmware` → `https://hartwell-labs.pl/firmware`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `Talk to us ↗` → `mailto:business@hartwell-labs.pl?subject=Firmware%20engagement`
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Firmware_
   - H1: _The firmware part is the hard part._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _Most of a cyber-resilience file can be written by a lawyer. The parts that get rejected are the ones that need someone to read the boot chain: is the update act_
   - przycisk główny: **Describe the product** → `mailto:business@hartwell-labs.pl?subject=Firmware%20engagement`
   - przycisk drugorzędny: **What we deliver** → `#delivery`
3. **Sekcja `#—`** — *Why this is where products fail*
   - Zawartość: tekst (2 akapitów)
4. **Sekcja `#delivery`** — *What we deliver*
   - Zawartość: 6 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
5. **Sekcja `#—`** — *Working with assessment bodies*
   - Zawartość: 1 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
6. **Sekcja `#—`** — *How an engagement runs*
7. **Sekcja `#—`** — *What we work with*
   - Zawartość: tekst (2 akapitów)
8. **Footer** — tło `--bg-subtle`, kolumny: Products, Services, Resources, Company (13 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 1 linków-kotwic do sekcji na tej samej stronie (`#id`).
- 2 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

