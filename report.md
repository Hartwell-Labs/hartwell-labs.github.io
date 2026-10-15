---
title: "US county & K-12 DNS posture 700 domains — Hartwell Labs"
url: https://hartwell-labs.pl/report/
canonical: https://hartwell-labs.pl/report/
lang: en
page_type: report
description: "Passive DNS audit of 700 US county and K-12 government domains: 286 (41%) publish no DMARC record, only 97 (14%) enforce p=reject. Method, full numbers and free per-domain records."
source_html: https://hartwell-labs.pl/report/
markdown_twin: https://hartwell-labs.pl/report.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# US county & K-12 DNS posture 700 domains — Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Published data · October 2026*

# 700 US county domains,one TXT record from safe.

Passive DNS only — MX, TXT, CAA. No scanning, no probing, no service enumeration. Every record parsed per RR and confirmed against at least two independent resolvers. 286 of these domains (41%) publish no DMARC record at all.

[Get my domain's records](mailto:contact@hartwell-labs.pl?subject=Records%20for%20my%20domain&body=Domain%3A%0A) → [See the numbers](#numbers)

## What came back

| Value | Label |
|---|---|
| **41%** | no DMARC record286 of 700 |
| **14%** | DMARC at p=reject97 of 700 |
| **32%** | SPF soft-fail227 of 700 |
| **56** | fully enforcingSPF -all + p=reject |

| Check | Result | Share |
|---|---|---|
| Check | Result | Share |
| No DMARC record at all | 286 / 700 | 41% |
| DMARC p=none (detect, deliver anyway) | 156 | 22% |
| DMARC p=quarantine | 161 | 23% |
| DMARC p=reject (blocking) | 97 | 14% |
| No SPF record | 115 | 16% |
| SPF soft-fail (~all) | 227 | 32% |
| SPF hard-fail (-all) | 312 | 45% |
| No CAA record | 690 | 99% |

### Why p=none is not "we have DMARC"

p=none asks receiving servers to watch and report. It does not ask them to refuse anything. Spoofed mail claiming your domain is still delivered to the inbox — it is just marked, and users have been trained to click through that mark. p=reject is what turns "detect" into "do not deliver".

The path that works, and the order matters: start at p=quarantine with a rua= address, read the aggregate reports until the only senders listed are ones you recognise, then move to p=reject. Only after that tighten SPF from ~all to -all. Deploying -all before the reports are clean is the single most common way a DMARC rollout gets rolled back.

```console
_dmarc.yourdomain.org. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.org"
```

### The audit was wrong the first time, and that matters

An earlier pass resolved each RR set into one concatenated string and tested for a v=spf1 prefix, so any leading verification record broke the match and the domain came back as "no SPF". A second pass used a 3-second resolver timeout under 48-way concurrency and wrote those timeouts down as "record absent". Between them, 22 of the first 82 contact emails carried a finding that was not true.

All 22 were corrected by email the same day, and this page is generated from the corrected pass: parse per record, confirm with two or more resolvers, and if the answer is not confirmed, publish nothing rather than guess. A number in a report that gets forwarded to an auditor should survive dig.

### Where the gaps are

| Domain | Organization | State | Finding |
|---|---|---|---|
| Domain | Organization | State | Finding |
| 211dupage.gov | DuPage County | IL | no DMARC |
| acwdca.gov | Alameda County Water District - ACWD | CA | no DMARC |
| adacountyelections.gov | Ada County Information Technology | ID | no DMARC |
| adamscosheriffms.gov | Adams County Sheriff's Office | MS | no DMARC |
| adamscountyiowa.gov | Adams County Iowa | IA | no DMARC |
| alachuacountyfl.gov | Alachua County BOCC | FL | no DMARC |
| alachuacountyfla.gov | Alachua County BOCC | FL | no DMARC |
| alachuacountyflorida.gov | Alachua County BOCC | FL | no DMARC |
| alamedacountylibraryca.gov | Alameda County Library | CA | no DMARC |
| alertoc.gov | Orange County Sheriff-Coroner Department | CA | no DMARC |
| alleganycountysheriff-ny.gov | Allegany County Sheriff's Office | NY | no DMARC |
| allencountykentucky.gov | Allen County Fiscal Court | KY | no DMARC |
| allencountyohiocsb.gov | Allen County Children Services | OH | no DMARC |
| amherstcountyva.gov | Amherst County VA | VA | no DMARC |
| anokacountybuys.gov | Anoka County | MN | no DMARC |
| anokacountymnservices.gov | Anoka County | MN | no DMARC |
| applingcounty.gov | Appling County Board of Commissioners | GA | no DMARC |
| arapahoedrives.gov | Arapahoe County Clerk Recorder | CO | no DMARC |
| arapahoerecords.gov | Arapahoe County Clerk Recorder | CO | no DMARC |
| arapahoesheriff.gov | Arapahoe Conty | CO | no DMARC |
| bakercosheriffor.gov | baker county | OR | no DMARC |
| bakercounty911or.gov | Baker County | OR | no DMARC |
| bakercountysheriffor.gov | Baker County | OR | no DMARC |
| barrycountymo.gov | Barry County Missouri | MO | no DMARC |
| bartonsheriffks.gov | Barton County Sheriff's Office | KS | no DMARC |
| bastropcounty.gov | Bastrop County | TX | no DMARC |
| bastropcountyhistorical.gov | Bastrop County | TX | no DMARC |
| baxtercountyjsar.gov | Baxter County Juvenile Services | AR | no DMARC |
| baycounty911-mi.gov | Bay County Central Dispatch | MI | no DMARC |
| baysidetx.gov | Town of Bayside | TX | no DMARC |
| bciltransit.gov | County of Boone | IL | no DMARC |
| beaverutahsheriff.gov | Beaver County Sheriffs office | UT | no DMARC |
| bedfordcountyvaes.gov | Bedford County, Virginia | VA | no DMARC |
| bencosoar.gov | Benton County Sheriff's Office | AR | no DMARC |
| bergencountyclerk.gov | Office of the Bergen County Clerk | NJ | no DMARC |
| bibbassessorsga.gov | Macon Bibb County Board of Tax Assessors | GA | no DMARC |
| bibbcosheriffga.gov | Macon-Bibb County Sheriff's Office | GA | no DMARC |
| bouldercountyassessor.gov | Boulder County | CO | no DMARC |
| bouldercountyhhs.gov | Boulder County | CO | no DMARC |
| bouldercountynavigatingdisaster.gov | Boulder County | CO | no DMARC |

Largest concentration of audited domains by state: GA 41, TX 36, MO 33, FL 32, KY 31, TN 31, NC 27, VA 27.

### Get your own records

If you run one of these domains, mail us and you get the exact SPF, DMARC, CAA and MX records as they resolve today — free, as text, with no call and no pitch. Enough to hand to whoever holds your DNS.

Don't want to hand your findings to someone else? The same audit for your own domain, with the exact records to paste and a re-check after your provider applies them: **$49**, delivered by email within 24h. Rollout by us: $199.

See the published ranking of US .gov domains and their DMARC/SPF status →

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Report` → `https://hartwell-labs.pl/report`, `Docs` → `https://hartwell-labs.pl/docs`, `Company` → `https://hartwell-labs.pl/company`, `GitHub ↗` → `https://github.com/Hartwell-Labs`
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Published data · October 2026_
   - H1: _700 US county domains,one TXT record from safe._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _Passive DNS only — MX, TXT, CAA. No scanning, no probing, no service enumeration. Every record parsed per RR and confirmed against at least two independent reso_
   - przycisk główny: **Get my domain's records** → `mailto:contact@hartwell-labs.pl?subject=Records%20for%20my%20domain&body=Domain%3A%0A`
   - przycisk drugorzędny: **See the numbers** → `#numbers`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **41%** — no DMARC record286 of 700
   - **14%** — DMARC at p=reject97 of 700
   - **32%** — SPF soft-fail227 of 700
   - **56** — fully enforcingSPF -all + p=reject
4. **Sekcja `#numbers`** — *What came back*
   - Zawartość: 1 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka); 2 tabel
5. **Footer** — tło `--bg-subtle`, kolumny: Products, Sources, Company (8 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 1 linków-kotwic do sekcji na tej samej stronie (`#id`).
- 4 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

