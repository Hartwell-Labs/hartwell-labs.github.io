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

24 h
Early warning to ENISA and the national CSIRT for an actively exploited vulnerability (Art. 14)
72 h
Full vulnerability notification, with severity and mitigation
14 days
Final report, including the fix and what was learned
5 years
Minimum support period, free security updates, signed and installable

## Why this is where products fail

The reporting duty under Article 14 has applied since 11 September 2026: an actively exploited vulnerability has to reach ENISA and the national CSIRT within 24 hours, with a notification at 72 hours and a final report at 14 days. That clock does not start in a policy document — it starts with someone being able to answer, within an hour, whether a given CVE affects a given release. If the answer requires rebuilding an image to find out, the deadline is already gone.

The same gap shows up earlier, in the radio equipment route: EN 18031 has applied since 1 August 2025, and its clauses on secure updates, access control, key storage and network monitoring are firmware clauses. Products that claim them without a signed update path and a protected key store do not survive a technical review.

## What we deliver

Click a tile for the detail — scope, artefacts and the method behind each one.

#### Signed update chain

engineering

Ed25519 or RSA-3072 image signing, verified in the bootloader before execution; signed manifest over every partition; A/B slots with atomic switch and rollback; anti-rollback counter in OTP fuses; staged rollout and recovery path.

Details →

The update path is the first thing an assessor tests, and the first thing an attacker looks for. It is built as one chain, not as a feature bolted onto an existing updater.

##### Signing

          - Algorithm and keys. Ed25519 by default, RSA-3072 or ECDSA P-256 where the boot ROM requires it. Private keys live in an HSM or on an offline machine, never on the build server.
          - Manifest. Every partition and every file hashed; manifest carries version, target device model, minimum bootloader version and the security-relevant change flag.
          - Key ceremony. Written procedure for generation, backup and rotation, including what happens to devices in the field when a key is rotated or a key is compromised.

##### On the device

          - Verification before execution. The bootloader verifies the manifest signature and each hash before jumping; a failure leaves the device in the last known-good slot, never in an unbootable state.
          - Rollback. A/B slots with an atomic switch, a boot-success flag and an automatic revert if the new image fails to start twice.
          - Anti-rollback. A monotonic counter in OTP fuses or a secure element, so a signed but older image is refused — the attack that signing alone does not stop.

##### What you get

          - Working update path in your build, not a reference implementation.
          - Signing pipeline integrated with your CI, plus the offline procedure for production keys.
          - Test record: successful update, corrupt image, truncated image, wrong model, downgrade attempt, power loss mid-write.

#### Secure boot

engineering

Root of trust pinned to what the silicon already has: boot ROM, OTP fuses, TPM 2.0 or a secure element. Measured boot with a signed event log where available, plus the factory provisioning procedure.

Details →

Secure boot is a decision about which key the device trusts before any of your code runs. On most shipped hardware that decision is already made by the silicon — the work is using it correctly instead of adding a second, weaker check on top.

##### Root of trust

          - Boot ROM verification. Where the ROM checks a signature, the public key hash goes into OTP. That write is irreversible; it is planned, tested on a sample, then locked.
          - TPM 2.0 or secure element. Used for measured boot and sealed secrets where the SoC does not provide a ROM root, or where the key must survive flash replacement.
          - Where there is no root. Some parts cannot verify anything at boot. We say so at scope time rather than selling a signature check that an attacker can patch out.

##### Provisioning

          - Per-device key injection on the production line, with a log that ties a serial number to a key.
          - Secure debug locked at the same station, so JTAG cannot be used after provisioning.
          - Failure handling: what the line does with a device that fails provisioning, and how that is recorded.

##### What you get

          - Boot chain implementation with the fuse map documented.
          - Provisioning procedure and the test that proves a tampered image is rejected.
          - A written key-loss and recovery path — required by auditors, usually missing.

#### Firmware review

assessment

Boot chain, update path, key and credential storage, debug and recovery interfaces (JTAG, UART console, factory and service modes), update server authentication. Every finding carries the evidence.

Details →

A review of the image that ships, not of the source you wish you had. It works on a firmware binary and a device, so it applies to products with third-party components and to code written years ago by someone who has left.

##### What is examined

          - Boot chain. What runs first, what verifies what, and where verification can be skipped.
          - Update path. Transport authentication, signature check, downgrade protection, and the recovery mode that bypasses all three.
          - Secrets. Keys and passwords in flash, in NVRAM, in the filesystem and in the update server API; hardcoded credentials in the binary.
          - Interfaces. JTAG, UART console, telnet or SSH with default credentials, factory and service modes, hidden HTTP endpoints.
          - Network services. What listens, on which interface, with which authentication — including services that only start in a debug build.

##### Method

          - Static analysis of the image, then dynamic testing on hardware: memory and flash dumps, emulation where the part allows it, traffic capture on the update channel.
          - No source code required, though it shortens the work when available.

##### Output

          - Findings with severity, evidence and reproducible steps, written so an assessor or your own team can repeat each one.
          - A short list of what to fix first, priced: what a hardware change costs versus what a software mitigation buys.

#### SBOM and vulnerability handling

process

SBOM generated at build time in SPDX or CycloneDX and stored with the released artifact; dependency monitoring mapped to the versions actually shipped; triage and a rehearsed 24-hour reporting path.

Details →

The requirement is not "have an SBOM". It is: given a CVE published this morning, know within the hour whether it affects a release you shipped three years ago, and be able to say so to a customer and to a regulator.

##### SBOM

          - Generated during the build, in SPDX or CycloneDX, one file per release, stored next to the artefact you signed.
          - At least top-level dependencies, with versions and package identifiers — for firmware that often means Yocto or Buildroot manifests, vendor SDK components and third-party libraries linked into the image.
          - A mapping from release version to SBOM that survives a rebuild, so "which SBOM belongs to the device in the field" has one answer.

##### Monitoring and triage

          - Dependency monitoring against the versions you actually shipped, not the ones in the repository today.
          - Triage in four states: not present, present but not reachable, reachable but not exploitable, exploitable. Documented per case, because the difference decides whether the 24-hour clock starts.
          - VEX statements for the "not affected" cases, so the same question is not answered from scratch next month.

##### Reporting readiness

          - CVD policy and a public intake channel — a security contact and a security.txt that a researcher can actually find.
          - Who decides, who writes, who signs off — named roles, not a department.
          - A rehearsal against a real scenario, timed: detection, decision, early warning at 24 hours, notification at 72, final report at 14 days.

#### Assessment evidence

documentation

Architecture and data flow, requirement-to-artefact mapping, test records, and the rationale wherever a requirement is not applicable. Written so an assessor can test the claim without us in the room.

Details →

The technical documentation is where a good product and a compliant product diverge. It has to be readable by an assessor who will try to falsify each claim, and it has to still make sense at the five-year support date.

##### Contents

          - Architecture and data flow. What the product does, what it connects to, which data crosses which boundary, and where the security functions sit.
          - Requirement mapping. Each essential requirement traced to the artefact that satisfies it: a design section, a test record, a configuration, a procedure.
          - Risk assessment. Threats considered, assumptions made, and the residual risk the manufacturer accepts and why.
          - Test records. What was tested, on which hardware and firmware version, with the result and the date.
          - Not applicable, and why. A requirement that is genuinely out of scope is argued in writing, not left blank.

##### Retention and update

          - Documentation kept for the period the regulation requires — ten years for the technical file — in a form that survives staff turnover.
          - Updated when the product changes, not reconstructed when someone asks.

#### Retrofit on shipped products

engineering

Where the boot ROM verifies a signature, a signed update path can be added to hardware already in the field without a board revision. Where it cannot, we say so at scope time.

Details →

Most products that need this were designed before anyone asked. The question is whether the existing hardware can be brought up to a defensible update path, or whether the honest answer is a board change.

##### The decision, in order

          - Does the boot ROM verify a signature? If yes, a signed update path is usually achievable in firmware alone.
          - Is there an OTP area or secure element for the key? If yes, the root of trust can be anchored without new silicon.
          - Is there a spare slot or enough flash for A/B? If not, a single-slot updater with a verified recovery path is the fallback.
          - Can the update server authenticate the device? Without it, a signed image still leaks version information and allows targeted rollback attempts.

##### When the answer is no

If the part cannot verify anything at boot and the flash is readable, we say that in the first week and price the alternatives: a board revision, an external secure element, or a compensating control with the residual risk written down. A review that ends in "you cannot fix this" is still worth more than a report claiming otherwise.

## Who this is for

##### Manufacturers

You ship a connected device or an embedded system and someone has now asked you for an SBOM, an update policy and a vulnerability process. We build the technical part and leave you the file that proves it.

##### Test laboratories and notified bodies

You assess radio equipment or products with digital elements and the file arrives with firmware claims nobody on the team can test. We take that section, under your procedure and your template.

##### Consultancies and law firms

You sell the compliance project and need an engineering answer for the parts that are not legal questions. Fixed-price line items, your client relationship, our name absent from the report.

## Where the line is
We are not a notified body.
We prepare a product for assessment and answer the technical questions during it. We do not issue certificates, and we do not pretend an assessment has happened.
We do not write the legal opinion.
Classification, the declaration of conformity and the regulatory argument belong to a lawyer or your compliance function. We supply the technical facts they argue from.
We do not sell "compliance" without the fix.
If a review finds that updates are unsigned, the finding comes with the work to sign them and the price of that work. A report alone is a document, not a fix.

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

## Questions that come up first
Is an SBOM enough for the vulnerability requirement?

No. It answers "what is inside", which is necessary and is what most teams start with. The requirement is the handling process around it: who watches for a new CVE, how you decide whether your release is affected, who starts the 24-hour clock, and who writes the report. An SBOM without that process is a file nobody opens.

How long does a signed update path take?

On hardware whose boot ROM already verifies a signature and where a spare slot exists, four to six weeks including the test record. Without a spare slot, or with a production line that has to change its provisioning station, add two to three weeks. If the silicon cannot verify anything at boot, the honest answer is a hardware change, and that is a different project.

Our product has been in the field for years. Is it too late?

No, and it is the common case. The reporting duty covers products already on the market, including those placed before December 2027. What changes is the starting point: an existing fleet with no update path is a different engagement from a new design, and the first deliverable is usually a decision on whether the current hardware can be retrofitted.

Do you work under NDA and under a partner's name?

Yes to both. Work is delivered under the partner's documentation template, with our name absent from the client-facing report. White-label, fixed scope, 14-day payment from the partner, no exclusivity unless it comes with a volume commitment.

What does it cost?

Firmware review of a single product: quoted per product after the scope call, typically a few days of work. Signed update path: fixed price per platform, agreed before anything starts. Vulnerability handling and reporting readiness: priced as a package with the rehearsal included. The first conversation is a scope call, not a sales call, and it ends with a number or with "this is not our work".

## Tell us what ships, and what it runs on.

Product, silicon, and whether an update path already exists. That is enough for a scope and a price, usually within two working days.

####

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
3. **Sekcja `#—`** — *(bez nagłówka)*
4. **Sekcja `#—`** — *Why this is where products fail*
   - Zawartość: tekst (2 akapitów)
5. **Sekcja `#delivery`** — *What we deliver*
   - Zawartość: 6 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
6. **Sekcja `#—`** — *Who this is for*
   - Zawartość: tekst (3 akapitów)
7. **Sekcja `#—`** — *Where the line is*
8. **Sekcja `#—`** — *How an engagement runs*
9. **Sekcja `#—`** — *Questions that come up first*
   - Zawartość: tekst (5 akapitów)
10. **Sekcja `#—`** — *Tell us what ships, and what it runs on.*
   - Zawartość: tekst (1 akapitów)
11. **Footer** — tło `--bg-subtle`, kolumny: Products, Services, Resources, Company (13 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 1 linków-kotwic do sekcji na tej samej stronie (`#id`).
- 2 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

