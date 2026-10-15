---
title: "Talus — anty-ransomware dla Linuksa (eBPF) | Hartwell Labs"
url: https://hartwell-labs.pl/pl/talus-process-monitor/
canonical: https://hartwell-labs.pl/pl/talus-process-monitor/
lang: pl
page_type: product
description: "Talus Process Monitor to anty-ransomware dla Linuksa oparty na eBPF: behawioralne wykrywanie ransomware, samosandboxing seccomp i Landlock, ~280 tys. zdarzeń/s, jeden statyczny plik binarny bez modułów jądra. Open source, MIT."
source_html: https://hartwell-labs.pl/pl/talus-process-monitor/
markdown_twin: https://hartwell-labs.pl/pl/talus-process-monitor.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# Talus — anty-ransomware dla Linuksa (eBPF) | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Security infrastructure · Rust + eBPF · MIT*

# Talus — anty-ransomware dla Linuksa.

Talus Process Monitor to anty-ransomware dla Linuksa oparty na eBPF. Zamiast polegać na sygnaturach, wykrywa ransomware behawioralnie — po tym, jak procesy faktycznie się zachowują. Obsługuje ~280 tys. zdarzeń na sekundę, stosuje samosandboxing seccomp i Landlock i dostarcza jeden statyczny plik binarny, bez modułów jądra.

[Poradnik wdrożenia](https://hartwell-labs.pl/docs#deployment) → [Kod źródłowy ↗](https://github.com/Hartwell-Labs/talus-process-monitor)

## Anty-ransomware, który patrzy na zachowanie, nie na sygnatury.

*Jak to działa*

Tradycyjne antywirusy działają na sygnaturach i nie nadążają za serwerami produkcyjnymi. Talus śledzi zachowanie procesów w czasie rzeczywistym przez eBPF i reaguje, zanim dane zostaną zaszyfrowane.

#### Behawioralna detekcja

Wykrywanie ransomware po wzorcach zachowań procesów, a nie po znanych sygnaturach.

#### ~280 tys. zdarzeń/s

Wydajny potok zdarzeń eBPF z ciągłym fuzzingiem.

#### Samosandboxing

seccomp i Landlock ograniczają uszkodzenia jeszcze w trakcie reakcji.

#### Bez modułów jądra

Jeden statyczny plik binarny — proste wdrożenie i aktualizacje.

#### SBOM w każdym wydaniu

Wydania z dowodem pochodzenia builda, SBOM (SPDX) i OpenSSF Scorecard.

#### SLA reakcji 48h

Skoordynowane ujawnianie podatności z publicznymi notkami hardeningowymi.

## Zacznij w kilka sekund.

*Instalacja*

```console
pip install talus-process-monitor
```

```console
docker pull ghcr.io/hartwell-labs/talus-process-monitor:latest
```

#### Chroń serwery Linux przed ransomware.

Open source (MIT). Wdróż z pip, Dockera albo przeczytaj dokumentację.

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/pl/`, `Produkty` → `https://hartwell-labs.pl/products`, `Katalog` → `https://hartwell-labs.pl/catalog`, `Dokumentacja` → `https://hartwell-labs.pl/docs`, `Bezpieczeństwo` → `https://hartwell-labs.pl/security`, `Firma` → `https://hartwell-labs.pl/company`, `GitHub ↗` → `https://github.com/Hartwell-Labs`
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Security infrastructure · Rust + eBPF · MIT_
   - H1: _Talus — anty-ransomware dla Linuksa._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _Talus Process Monitor to anty-ransomware dla Linuksa oparty na eBPF. Zamiast polegać na sygnaturach, wykrywa ransomware behawioralnie — po tym, jak procesy fakt_
   - przycisk główny: **Poradnik wdrożenia** → `https://hartwell-labs.pl/docs#deployment`
   - przycisk drugorzędny: **Kod źródłowy ↗** → `https://github.com/Hartwell-Labs/talus-process-monitor`
3. **Sekcja `#how`** — *Anty-ransomware, który patrzy na zachowanie, nie na sygnatury.*
   - Kicker: _Jak to działa_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 6 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
4. **Sekcja `#install`** — *Zacznij w kilka sekund.*
   - Kicker: _Instalacja_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 2 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
5. **Sekcja `#cta`** — *(bez nagłówka)*
   - Zawartość: 1 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
6. **Footer** — tło `--bg-subtle`, kolumny: Produkty, Zasoby, Firma (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 2 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 4 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

