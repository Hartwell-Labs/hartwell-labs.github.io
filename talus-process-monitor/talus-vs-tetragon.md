---
title: "Talus vs Tetragon — standalone eBPF vs Cilium/K8s"
url: https://hartwell-labs.pl/talus-process-monitor/talus-vs-tetragon.html
canonical: https://hartwell-labs.pl/talus-process-monitor/talus-vs-tetragon.html
lang: en
page_type: product
description: "Talus vs Tetragon: Tetragon needs Cilium + Kubernetes; Talus is a standalone eBPF binary for Linux servers. No sidecars required."
source_html: https://hartwell-labs.pl/talus-process-monitor/talus-vs-tetragon.html
markdown_twin: https://hartwell-labs.pl/talus-process-monitor/talus-vs-tetragon.html.md
last_generated: 2026-11-24
generator: tools/build-ai-pages.py
---

# Talus vs Tetragon — standalone eBPF vs Cilium/K8s

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

Comparison

## Talus vs Tetragon

Tetragon is a Cilium/Hubble project that excels inside Kubernetes. Talus exists for the rest of your fleet — individual Linux servers, edge, and small clusters where the CNI stack is not on the menu.

| Capability | Talus | Tetragon |
|---|---|---|
| Capability | Talus | Tetragon |
| eBPF kernel events | ✅ | ✅ |
| Requires Kubernetes | ❌ | ⚠️ yes (Cilium) |
| CNI / sidecar dependency | ❌ none | ⚠️ Cilium+Hubble |
| Standalone host deploy | ✅ 1 binary | ❌ |
| Auto response | ✅ SIGKILL | ⚠️ via policy |
| Fleet dashboard | ✅ | ⚠️ via Hubble |
| Setup time | 5 min | 30+ min (k8s) |
| Price / node / year | $50 | Free (ops cost) |

When to pick Tetragon

Inside Kubernetes, with Cilium already deployed, Tetragon is the richer signal. On a bare server or non-K8s fleet, Talus is simpler.

Compare pricing →

← Back to product

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Talus` → `https://hartwell-labs.pl/talus-process-monitor/`, `Firmware` → `https://hartwell-labs.pl/firmware`
2. **Footer** — tło `--bg-subtle`, kolumny: (proste) (0 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

