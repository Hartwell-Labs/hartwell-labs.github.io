---
title: "photoscrub — see what your photos leak, then remove it | Hartwell Labs"
url: https://hartwell-labs.pl/photoscrub/
canonical: https://hartwell-labs.pl/photoscrub/
lang: en
page_type: product
description: "photoscrub finds GPS coordinates, embedded thumbnails, body serial numbers, XMP and IPTC fields, appended data and PII in free text — then writes metadata-free copies. Passive, local, no upload. Windows and Linux."
source_html: https://hartwell-labs.pl/photoscrub/
markdown_twin: https://hartwell-labs.pl/photoscrub.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# photoscrub — see what your photos leak, then remove it | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Privacy tooling · Windows & Linux*

# See what your photos leak. Then remove it.

Stripping EXIF is not enough. A JPEG can carry a second complete copy of the image, a PNG hides text in chunks, a video keeps GPS in its container, and the address in the caption is plain text. photoscrub finds all of it, then writes clean copies — passive, local, no upload, no account.

[Source & releases ↩](https://github.com/BartoszOsiej/photoscrub) → [Full catalog](https://hartwell-labs.pl/products)

| Value | Label |
|---|---|
| **12** | classes of finding, incl. free-text PII |
| **0** | bytes uploaded anywhere |
| **1.8 KB** | offline risk classifier |
| **97.4%** | accuracy on held-out metadata profiles |

## The leaks people forget about.

*What it finds*

HEIC/HEIF from iPhones and RAW files (DNG, CR2, NEF, ARW, ORF, RW2) are read too.

#### GPS coordinates — HIGH

Exact position to six decimal places, not a rounded city.

#### Embedded thumbnail — HIGH

A JPEG can carry a second, complete copy of the original as a 160×120 preview. Removing EXIF does not remove it.

#### Body serial number — HIGH

Identifies the device and, through purchase history, you.

#### XMP & IPTC — HIGH

City, country, GPS and byline live in a second place. Cleaning EXIF alone is not enough.

#### PNG text chunks — MED

tEXt, iTXt, zTXt, tIME and eXIf carry author, description and comments.

#### Data appended after the image — MED

Invisible in any preview, readable in a hex editor.

#### GPS in video — HIGH

MP4/MOV has no EXIF; the location sits in the udta atom of the container.

#### PII in free text — MED

Addresses, postcodes and phone numbers in a caption: the leak nobody looks for, because it is not a tag.

#### ZIP internals — LOW

.DS_Store, Thumbs.db and AppleDouble sidecars carry usernames and full paths.

## Report, scrub or pipe it.

*Use*

Originals are never modified, and --scrub refuses to write into the source folder.

```console
photoscrub PATH # report only
```

```console
photoscrub PATH --scrub OUT # write metadata-free copies to OUT
```

```console
photoscrub PATH --json # machine readable
```

## A classifier you can read.

*The model*

Publish risk is scored from 15 features by logistic regression trained in-house (tools/train_model.py) on 8 000 synthetic metadata profiles. It is not an LLM: 1.8 KB, runs offline, and every decision comes from coefficients you can read in model.json. It is also how we found our own bug — it once called a PNG whose description contained a home address “safe”, which is why has_free_text_pii exists.

Licence keys are Ed25519-signed payloads bound to one machine, and activation works offline; private keys never leave the issuing machine.

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `GitHub ↩` → `https://github.com/BartoszOsiej/photoscrub`
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Privacy tooling · Windows & Linux_
   - H1: _See what your photos leak. Then remove it._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _Stripping EXIF is not enough. A JPEG can carry a second complete copy of the image, a PNG hides text in chunks, a video keeps GPS in its container, and the addr_
   - przycisk główny: **Source & releases ↩** → `https://github.com/BartoszOsiej/photoscrub`
   - przycisk drugorzędny: **Full catalog** → `https://hartwell-labs.pl/products`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **12** — classes of finding, incl. free-text PII
   - **0** — bytes uploaded anywhere
   - **1.8 KB** — offline risk classifier
   - **97.4%** — accuracy on held-out metadata profiles
4. **Sekcja `#finds`** — *The leaks people forget about.*
   - Kicker: _What it finds_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 9 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
5. **Sekcja `#use`** — *Report, scrub or pipe it.*
   - Kicker: _Use_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 3 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
6. **Sekcja `#model`** — *A classifier you can read.*
   - Kicker: _The model_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (2 akapitów)
7. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (8 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 3 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 3 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

