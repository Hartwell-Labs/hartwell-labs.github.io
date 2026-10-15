---
title: "Externum — nowy polski język programowania | Hartwell Labs"
url: https://hartwell-labs.pl/pl/externum/
canonical: https://hartwell-labs.pl/pl/externum/
lang: pl
page_type: product
description: "Externum to nowy polski język programowania kompilujący do czytelnego Pythona, Bash i natywnego bytecode EXBC. Pipeline'y, pattern matching, REPL w przeglądarce, 400+ testów. Open source, licencja MIT."
source_html: https://hartwell-labs.pl/pl/externum/
markdown_twin: https://hartwell-labs.pl/pl/externum.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# Externum — nowy polski język programowania | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Język programowania · Rust · MIT*

# Externum — nowy polski język programowania.

Externum to nowy polski język programowania, który kompiluje do czytelnego Pythona, Bash oraz natywnego bytecode EXBC. Ma pipeline'y, pattern matching i REPL w przeglądarce. Napisany w Rust, open source na licencji MIT, z ponad 400 testami w zestawie i CI na każdym pushu.

[Kod źródłowy ↗](https://github.com/Hartwell-Labs/externum) → [Dokumentacja](https://hartwell-labs.pl/docs)

## Polski język programowania, który nie zamyka Cię w swoim ekosystemie.

*Dlaczego Externum*

Zamiast kolejnej izolowanej wyspy, Externum transpiluje do kodu, który już masz na produkcji — czytelnego Pythona i Bash — albo do własnego bytecode EXBC, gdy potrzebujesz wydajności i braku zależności runtime.

#### Transpilacja do Pythona i Bash

Twój kod staje się czytelnym Pythonem lub skryptem Bash — łatwy audyt, brak lock-inu.

#### Natywny bytecode EXBC

Własny format wykonywalny dla środowisk bez interpretera Pythona.

#### Pipeline'y i pattern matching

Składnia zbudowana pod strumienie danych i przetwarzanie systemowe.

#### REPL w przeglądarce

Wypróbuj język bez instalacji — od razu w przeglądarce.

#### Statically typed

Typy wykrywane na etapie kompilacji, nie w produkcji.

#### 400+ testów, CI

Każdy push przechodzi pełny zestaw testów i analizę statyczną.

#### Zbuduj coś nowego w polskim języku.

Externum jest open source (MIT). Zacznij od repozytorium albo przeczytaj dokumentację.

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
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Język programowania · Rust · MIT_
   - H1: _Externum — nowy polski język programowania._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _Externum to nowy polski język programowania, który kompiluje do czytelnego Pythona, Bash oraz natywnego bytecode EXBC. Ma pipeline'y, pattern matching i REPL w _
   - przycisk główny: **Kod źródłowy ↗** → `https://github.com/Hartwell-Labs/externum`
   - przycisk drugorzędny: **Dokumentacja** → `https://hartwell-labs.pl/docs`
3. **Sekcja `#why`** — *Polski język programowania, który nie zamyka Cię w swoim ekosystemie.*
   - Kicker: _Dlaczego Externum_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 6 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
4. **Sekcja `#cta`** — *(bez nagłówka)*
   - Zawartość: 1 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
5. **Footer** — tło `--bg-subtle`, kolumny: Produkty, Zasoby, Firma (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 5 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

