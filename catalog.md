---
title: "Product Catalog — eBPF Security, PQC & Dev Tools | Hartwell Labs"
url: https://hartwell-labs.pl/catalog/
canonical: https://hartwell-labs.pl/catalog/
lang: en
page_type: catalog
description: "Complete map of Hartwell Labs products: corporate product sites, source repositories and machine-readable registry."
source_html: https://hartwell-labs.pl/catalog/
markdown_twin: https://hartwell-labs.pl/catalog.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# Product Catalog — eBPF Security, PQC & Dev Tools | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Catalog*

# Everything, in one place.

Every product of the lab with exactly two destinations: the corporate product website and the source repository. No guesswork.

| Product | Line | Website | Source |
|---|---|---|---|
| Product | Line | Website | Source |
| talus-process-monitor | Security infrastructure | /talus-process-monitor | GitHub ↗ |
| scryer-core | Intelligence platform | /scryer-core | GitHub ↗ |
| externum | Developer tools | /externum | GitHub ↗ |
| Aurora | Operating systems | /Aurora | GitHub ↗ |
| quantum-shield | Security infrastructure | /quantum-shield | GitHub ↗ |
| linux-aegis | Security infrastructure | /linux-aegis | GitHub ↗ |
| fortis | Security infrastructure | /fortis | GitHub ↗ |
| labbridge | Ruby division | /labbridge | GitHub ↗ |
| products (Registry API) | Ruby division | /products | GitHub ↗ |
| CyberForge | Offensive security | /CyberForge | GitHub ↗ |
| hack-the-lab | Challenges program | /hack-the-lab | GitHub ↗ |

No website cell? The product site ships from the repository's gh-pages branch as releases land.

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `GitHub ↗` → `#`
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Catalog_
   - H1: _Everything, in one place._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _Every product of the lab with exactly two destinations: the corporate product website and the source repository. No guesswork._
3. **Sekcja `#—`** — *(bez nagłówka)*
   - Zawartość: 1 tabel; tekst (1 akapitów)
4. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 12 linków-kotwic do sekcji na tej samej stronie (`#id`).
- 1 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

