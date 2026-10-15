---
title: "Hartwell Labs — Detekcja zagrożeń eBPF i infrastruktura bezpieczeństwa"
url: https://hartwell-labs.pl/pl/
canonical: https://hartwell-labs.pl/pl/
lang: pl
page_type: landing
description: "Hartwell Labs — niezależna firma inżynierska ze Szczecina: Talus (anty-ransomware dla Linuksa oparty na eBPF) oraz Externum (nowy polski język programowania). Kryptografia postkwantowa, testy penetracyjne, open source, licencja MIT."
source_html: https://hartwell-labs.pl/pl/
markdown_twin: https://hartwell-labs.pl/pl.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# Hartwell Labs — Detekcja zagrożeń eBPF i infrastruktura bezpieczeństwa

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Niezależna firma inżynierska*

# Infrastruktura klasy enterprise. Open source.

Projektujemy i utrzymujemy infrastrukturę bezpieczeństwa oraz narzędzia deweloperskie: detekcję zagrożeń eBPF, kryptografię postkwantową i self-hosted język programowania. Otwarty kod, dyscyplina inżynierska klasy enterprise.

[Poznaj produkty](https://hartwell-labs.pl/products) → [Przeczytaj dokumentację](https://hartwell-labs.pl/docs)

| Value | Label |
|---|---|
| **10** | Publicznych produktów |
| **3** | Obrazy kontenerów na GHCR |
| **48h** | SLA reakcji bezpieczeństwa |
| **400+** | Testów w zestawie Externum |

## talus-process-monitor

*Flagowy produkt*

Behawioralna detekcja ransomware i response dla Linuksa. Oparta na eBPF, ~280 tys. zdarzeń na sekundę, samosandboxing seccomp i Landlock, jeden statyczny plik binarny — bez modułów jądra.

```console
pip install talus-process-monitor
```

```console
docker pull ghcr.io/hartwell-labs/talus-process-monitor:latest
```

## Anty-ransomware dla Linuksa i nowy polski język programowania.

*Produkty*

Dwa flagowe projekty open source Hartwell Labs — dla bezpieczeństwa serwerów Linux oraz dla programistów szukających nowego języka.

#### Talus — anty-ransomware dla Linuksa (eBPF)

Behawioralne wykrywanie ransomware dla serwerów Linux: ~280 tys. zdarzeń/s, samosandboxing seccomp i Landlock, jeden statyczny plik binarny bez modułów jądra.

#### Externum — nowy polski język programowania

Kompiluje do czytelnego Pythona, Bash i natywnego bytecode EXBC. Pipeline'y, pattern matching i REPL w przeglądarce. Open source, MIT.

## Praktyki inżynierskie, nie obietnice.

*Jak dostarczamy*

Każde repozytorium w organizacji przechodzi te same bramki jakości. Produkt flagowy dodatkowo dostarcza dowody dla łańcucha dostaw.

#### CI przy każdym pushu

Buildy, lintery i zestawy testów działają we wszystkich aktywnych repozytoriach. Funkcja bez CI nie wychodzi z drzewa.

#### Analiza statyczna i fuzzing

CodeQL w całej organizacji; ciągły fuzzing potoku eBPF w talusie.

#### Podpisane wydania

Artefakty wydań z dowodem pochodzenia builda i atestacją w stylu Sigstore.

#### SBOM w zestawie

Każde wydanie talus zawiera software bill of materials w formacie SPDX — wiedz dokładnie, co wdrażasz.

#### OpenSSF Scorecard

Postawa łańcucha dostaw mierzona ciągle, nie reklamowana w prezentacjach.

#### Skoordynowane ujawnianie podatności

SLA potwierdzenia 48h, publiczne notki hardeningowe, Hall of Fame dla zgłaszających.

#### Zbuduj na Hartwell. Albo przeciwko nam.

Używaj produktów, czytaj kod albo próbuj je złamać — na wszystkie trzy przypadki uważnie patrzymy.

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
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Niezależna firma inżynierska_
   - H1: _Infrastruktura klasy enterprise. Open source._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _Projektujemy i utrzymujemy infrastrukturę bezpieczeństwa oraz narzędzia deweloperskie: detekcję zagrożeń eBPF, kryptografię postkwantową i self-hosted język pro_
   - przycisk główny: **Poznaj produkty** → `https://hartwell-labs.pl/products`
   - przycisk drugorzędny: **Przeczytaj dokumentację** → `https://hartwell-labs.pl/docs`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **10** — Publicznych produktów
   - **3** — Obrazy kontenerów na GHCR
   - **48h** — SLA reakcji bezpieczeństwa
   - **400+** — Testów w zestawie Externum
4. **Sekcja `#flagship`** — *talus-process-monitor*
   - Kicker: _Flagowy produkt_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 2 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
5. **Sekcja `#produkty-pl`** — *Anty-ransomware dla Linuksa i nowy polski język programowania.*
   - Kicker: _Produkty_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 2 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
6. **Sekcja `#practices`** — *Praktyki inżynierskie, nie obietnice.*
   - Kicker: _Jak dostarczamy_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 6 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
7. **Sekcja `#cta`** — *(bez nagłówka)*
   - Zawartość: 1 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
8. **Footer** — tło `--bg-subtle`, kolumny: Produkty, Zasoby, Firma (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 2 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 4 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

