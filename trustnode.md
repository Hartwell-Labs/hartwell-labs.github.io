---
title: "TrustNode — a Solana-like validator written from scratch in Rust | Hartwell Labs"
url: https://hartwell-labs.pl/trustnode/
canonical: https://hartwell-labs.pl/trustnode/
lang: en
page_type: product
description: "TrustNode is a Solana-style validator built from scratch in Rust: PoH clock, Tower BFT consensus, Sealevel-style parallel execution, Turbine propagation with Reed-Solomon erasure coding, CRDS gossip over real UDP, fee-priority mempool, 228 tests, MIT."
source_html: https://hartwell-labs.pl/trustnode/
markdown_twin: https://hartwell-labs.pl/trustnode.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# TrustNode — a Solana-like validator written from scratch in Rust | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Trusted compute · Rust*

# Built to understand, not to fork.

A Solana-style validator written from scratch in Rust: proof-of-history clock, Tower BFT consensus, Sealevel-style parallel execution, Turbine propagation with real Reed–Solomon erasure coding, CRDS gossip over UDP, a fee-priority mempool and an SBF-inspired program executor. Not a wrapper. Not a fork. Every line mine.

[Source on GitHub ↩](https://github.com/BartoszOsiej/TrustNode) → [Documentation](https://wiki.hartwell-labs.pl/projects/solana-validator)

| Value | Label |
|---|---|
| **12** | crates in the Cargo workspace |
| **228** | tests, all public |
| **~1M** | PoH hashes per second |
| **MIT** | licensed, fully public |

## Eleven subsystems, all real.

*What is inside*

Every cryptographic path is implemented, not stubbed: transactions are Ed25519-verified, votes are signed before they touch state, gossip messages that fail verification are counted and dropped without a reply.

#### Proof of History

A verifiable delay function: N sequential SHA-256 hashes per tick. Verification re-hashes N times and checks the result matches.

#### Tower BFT

Fork choice with lockouts — every vote on the same fork doubles the lockout, so switching forks gets expensive. Finality at two-thirds supermajority.

#### Sealevel-style scheduler

Conflict analysis over read/write account sets. Disjoint transactions batch together; write conflicts serialise. Slot-based with a compute budget.

#### Turbine + Reed–Solomon

Systematic RS over GF(256): any k of n shards reconstruct the block exactly, or the decoder returns None. Shreds are signed and verified on receipt.

#### CRDS gossip

Cluster Replicated Data Store with versioning, timeouts, push/pull and ping/pong — every outgoing message signed.

#### Accounts DB

Append-only store with a DashMap index for O(1) lookups and a Merkle tree over state for a verifiable state root.

#### Fee-priority mempool

Transaction fees are charged against the real accounts DB even when an instruction later fails — because that is Solana semantics.

#### Program executor

A unified native dispatcher with a System program (real SOL transfers, account creation) and an SPL-like Token program. No SBF runtime, so an unsupported program fails honestly instead of faking an Ok.

#### JSON-RPC 2.0

Account queries over a real server, backed by the same state the consensus path commits to.

## Tests first, then the node.

*Run it*

228 tests across the workspace, cargo clippy -D warnings, cargo audit with zero advisories, and CI on Linux and macOS with --locked, plus CodeQL and the OpenSSF Scorecard.

```console
cargo test --workspace
```

```console
cargo bench -- --bench
```

## Research-grade, on purpose.

*What it is not*

No SBF runtime, no QUIC (the transport is real UDP), no snapshot loading, and nothing tuned for production throughput. It has never run on mainnet and we do not claim it has — the README says plainly: do not use it for real transactions or staking. What it demonstrates is that the architecture can be held in one head, end to end.

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `GitHub ↩` → `https://github.com/BartoszOsiej/TrustNode`
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Trusted compute · Rust_
   - H1: _Built to understand, not to fork._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _A Solana-style validator written from scratch in Rust: proof-of-history clock, Tower BFT consensus, Sealevel-style parallel execution, Turbine propagation with _
   - przycisk główny: **Source on GitHub ↩** → `https://github.com/BartoszOsiej/TrustNode`
   - przycisk drugorzędny: **Documentation** → `https://wiki.hartwell-labs.pl/projects/solana-validator`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **12** — crates in the Cargo workspace
   - **228** — tests, all public
   - **~1M** — PoH hashes per second
   - **MIT** — licensed, fully public
4. **Sekcja `#stack`** — *Eleven subsystems, all real.*
   - Kicker: _What is inside_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 9 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
5. **Sekcja `#start`** — *Tests first, then the node.*
   - Kicker: _Run it_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 2 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
6. **Sekcja `#honest`** — *Research-grade, on purpose.*
   - Kicker: _What it is not_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (1 akapitów)
7. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (8 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 2 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 2 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

