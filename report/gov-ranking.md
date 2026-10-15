---
title: "2,229 US government domains checked - SPF, DMARC, CAA as published"
url: https://hartwell-labs.pl/report/gov-ranking.html
canonical: https://hartwell-labs.pl/report/gov-ranking/
lang: en
page_type: product
description: "Passive DNS audit of 2,229 US county and K-12 government domains. SPF, DMARC and CAA records exactly as published, confirmed against two independent resolvers. No scanning."
source_html: https://hartwell-labs.pl/report/gov-ranking.html
markdown_twin: https://hartwell-labs.pl/report/gov-ranking.html.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# 2,229 US government domains checked - SPF, DMARC, CAA as published

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

## 2,229 US government domains, checked from the outside

SPF, DMARC and CAA records exactly as published in public DNS on 2026-10-03. Every record confirmed against two independent resolvers before it appears here. Nothing was scanned, probed or logged into — these are answers the DNS already gives anyone who asks.

2,229
public .gov domains checked
682
publish no DMARC record at all
551
publish DMARC at p=none
707
have SPF ending in ~all (soft-fail)
0
actually enforce p=reject
What this means, in one paragraph.
 If a domain publishes no DMARC record,
receiving mail servers get no instruction at all about mail claiming to come from it —
so it is delivered. If DMARC is set to 
p=none
, spoofed mail is detected but
still delivered. Only 
p=reject
 makes receiving servers refuse it. A domain with
SPF ending in 
~all
 labels spoofed mail instead of refusing it. Each of these is
one TXT record, and the safe order is the same everywhere: quarantine first, read the reports,
then reject.

### How the rollout works

```
; step 1 - watch, do not block _dmarc.example.gov. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.gov" ; step 2 - after 2-4 weeks, when reports only list senders you recognise _dmarc.example.gov. IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc@example.gov" ; step 3 - only after every legitimate sender is listed in SPF example.gov. IN TXT "v=spf1 include:_spf.google.com -all"
```

Doing step 3 before step 1 is the single most common way a DMARC rollout gets rolled back: one forgotten sender stops sending and mail disappears silently.

### The 200 weakest records in the set

| # | Domain | As published |
|---|---|---|
| # | Domain | As published |
| 1 | 211dupage.gov | no SPF, no DMARC, no CAA |
| 2 | adamscountyiowa.gov | no SPF, no DMARC, no CAA |
| 3 | baycounty911-mi.gov | no SPF, no DMARC, no CAA |
| 4 | bedfordcountyvaes.gov | no SPF, no DMARC, no CAA |
| 5 | burlesoncountytx.gov | no SPF, no DMARC, no CAA |
| 6 | chowancounty-nc.gov | no SPF, no DMARC, no CAA |
| 7 | coffeesheriffga.gov | no SPF, no DMARC, no CAA |
| 8 | cookcountyassessoril.gov | no SPF, no DMARC, no CAA |
| 9 | cookcountycourtil.gov | no SPF, no DMARC, no CAA |
| 10 | coronavirusfortbend.gov | no SPF, no DMARC, no CAA |
| 11 | crawfordcountywi.gov | no SPF, no DMARC, no CAA |
| 12 | duvalclerk.gov | no SPF, no DMARC, no CAA |
| 13 | edgecombecountync.gov | no SPF, no DMARC, no CAA |
| 14 | essexcountyvermont.gov | no SPF, no DMARC, no CAA |
| 15 | fairfieldcountyohioworkforcecenter.gov | no SPF, no DMARC, no CAA |
| 16 | fcgmdps.gov | no SPF, no DMARC, no CAA |
| 17 | florencesheriffwi.gov | no SPF, no DMARC, no CAA |
| 18 | flysmf.gov | no SPF, no DMARC, no CAA |
| 19 | fortbendlibraries.gov | no SPF, no DMARC, no CAA |
| 20 | gastoncountync.gov | no SPF, no DMARC, no CAA |
| 21 | greenvillecountysc.gov | no SPF, no DMARC, no CAA |
| 22 | greenwoodcounty-sc.gov | no SPF, no DMARC, no CAA |
| 23 | humalertca.gov | no SPF, no DMARC, no CAA |
| 24 | jeffersoncountywvassessor.gov | no SPF, no DMARC, no CAA |
| 25 | kingsportcityschoolstn.gov | no SPF, no DMARC, no CAA |
| 26 | kitsapvotes.gov | no SPF, no DMARC, no CAA |
| 27 | lakeclerkfl.gov | no SPF, no DMARC, no CAA |
| 28 | linncountyor.gov | no SPF, no DMARC, no CAA |
| 29 | lycomingcountypa.gov | no SPF, no DMARC, no CAA |
| 30 | lyoncountymn.gov | no SPF, no DMARC, no CAA |
| 31 | maconcountyal.gov | no SPF, no DMARC, no CAA |
| 32 | marshallcountykssheriff.gov | no SPF, no DMARC, no CAA |
| 33 | mcleancountynd.gov | no SPF, no DMARC, no CAA |
| 34 | miamidadesheriff.gov | no SPF, no DMARC, no CAA |
| 35 | monroecountysheriff-ny.gov | no SPF, no DMARC, no CAA |
| 36 | natronasheriff.gov | no SPF, no DMARC, no CAA |
| 37 | occlerkrecorder.gov | no SPF, no DMARC, no CAA |
| 38 | ocunclaimed.gov | no SPF, no DMARC, no CAA |
| 39 | passaiccountynj.gov | no SPF, no DMARC, no CAA |
| 40 | pchdtx.gov | no SPF, no DMARC, no CAA |
| 41 | putnamcountywv.gov | no SPF, no DMARC, no CAA |
| 42 | randolphcountyal.gov | no SPF, no DMARC, no CAA |
| 43 | readybrunswickcountync.gov | no SPF, no DMARC, no CAA |
| 44 | rivcoda.gov | no SPF, no DMARC, no CAA |
| 45 | robertsoncountytn.gov | no SPF, no DMARC, no CAA |
| 46 | sacramentocounty.gov | no SPF, no DMARC, no CAA |
| 47 | sanbenitocounty-ca-cre.gov | no SPF, no DMARC, no CAA |
| 48 | sandiegocounty.gov | no SPF, no DMARC, no CAA |
| 49 | sandiegosheriff.gov | no SPF, no DMARC, no CAA |
| 50 | scottcountymn.gov | no SPF, no DMARC, no CAA |
| 51 | sdarcc.gov | no SPF, no DMARC, no CAA |
| 52 | sdlaw.gov | no SPF, no DMARC, no CAA |
| 53 | sheridancountyks.gov | no SPF, no DMARC, no CAA |
| 54 | spotsy.gov | no SPF, no DMARC, no CAA |
| 55 | spotsylvaniacountyva.gov | no SPF, no DMARC, no CAA |
| 56 | summitcountysheriffutah.gov | no SPF, no DMARC, no CAA |
| 57 | thurstonauditor.gov | no SPF, no DMARC, no CAA |
| 58 | toombscountyga.gov | no SPF, no DMARC, no CAA |
| 59 | votajeffcoco.gov | no SPF, no DMARC, no CAA |
| 60 | waltoncountyga.gov | no SPF, no DMARC, no CAA |
| 61 | warrencountynj.gov | no SPF, no DMARC, no CAA |
| 62 | zerowastesonoma.gov | no SPF, no DMARC, no CAA |
| 63 | adaircoclerkky.gov | no SPF, no DMARC, no CAA |
| 64 | alexandercounty-nc.govAlexander County NC | no SPF, no DMARC, no CAA |
| 65 | auglibva.gov | no SPF, no DMARC, no CAA |
| 66 | bathcoclerkky.gov | no SPF, no DMARC, no CAA |
| 67 | bexar.gov | no SPF, no DMARC, no CAA |
| 68 | blainecosheriff-ok.govBlaine County Board of Commissioners | no SPF, no DMARC, no CAA |
| 69 | bondcountysa.gov | no SPF, no DMARC, no CAA |
| 70 | bonnercoid.gov | no SPF, no DMARC, no CAA |
| 71 | cabarruscountync.govCabarrus County Govt. | no SPF, no DMARC, no CAA |
| 72 | campbellcountytn.gov | no SPF, p=none, no CAA |
| 73 | carolinemd.gov | no SPF, no DMARC, no CAA |
| 74 | cartercountymo.govCarter County | no SPF, no DMARC, no CAA |
| 75 | casscountyia.gov | no SPF, p=none, no CAA |
| 76 | charlestoncounty.gov | no SPF, no DMARC, no CAA |
| 77 | chesterfieldcounty.govChesterfield County, VA | no SPF, no DMARC, no CAA |
| 78 | coffeecountytn.govCoffee County | no SPF, no DMARC, no CAA |
| 79 | collierclerk.govCollier County Clerk of the Circuit Court & Comptroller | no SPF, no DMARC, no CAA |
| 80 | costillacounty.gov | no SPF, no DMARC, no CAA |
| 81 | crawfordmo.gov | no SPF, no DMARC, no CAA |
| 82 | delcopa.govDelaware County Courthouse and Government Center | no SPF, no DMARC, no CAA |
| 83 | doolycountyga.gov | no SPF, p=none, no CAA |
| 84 | durhamcountync.gov | no SPF, p=none, no CAA |
| 85 | fultoncountyil.gov | no SPF, p=none, no CAA |
| 86 | garfieldcopublichealthwa.gov | no SPF, p=none, no CAA |
| 87 | graysharbor.gov | no SPF, no DMARC, no CAA |
| 88 | hancockcountyia.gov | no SPF, p=none, no CAA |
| 89 | harrisoncountyms.govHarrison County Board of Supervisors | no SPF, no DMARC, no CAA |
| 90 | henryctyil.govHenry County Government | no SPF, no DMARC, no CAA |
| 91 | inyocoapps.gov | no SPF, no DMARC, no CAA |
| 92 | jacksoncountyok.gov | no SPF, no DMARC, no CAA |
| 93 | jaspercountyin.gov | no SPF, no DMARC, no CAA |
| 94 | kinggeorgecountyva.govKing George County | no SPF, no DMARC, no CAA |
| 95 | knoxcountytexas.govKnox County Texas | no SPF, no DMARC, no CAA |
| 96 | knoxky.gov | no SPF, no DMARC, no CAA |
| 97 | limestonecountyema-al.gov | no SPF, no DMARC, no CAA |
| 98 | maconcountytn.govMacon County Mayor's Office | no SPF, no DMARC, no CAA |
| 99 | millardsheriff.gov | no SPF, no DMARC, no CAA |
| 100 | monongaliaprosecutor.gov | no SPF, no DMARC, no CAA |
| 101 | monroecountywv.govMonroe County Commission | no SPF, no DMARC, no CAA |
| 102 | morriscountynj.gov | no SPF, no DMARC, no CAA |
| 103 | natronaincident.gov | no SPF, no DMARC, no CAA |
| 104 | nemahacountysheriffne.gov | no SPF, no DMARC, no CAA |
| 105 | pikecoclerkky.gov | no SPF, no DMARC, no CAA |
| 106 | poinsettar.gov | no SPF, no DMARC, no CAA |
| 107 | prowersco.gov | no SPF, no DMARC, no CAA |
| 108 | publicnoticesbaycountyfl.gov | no SPF, no DMARC, no CAA |
| 109 | readyalbanycounty-ny.gov | no SPF, no DMARC, no CAA |
| 110 | ripleycountymo.gov | no SPF, no DMARC, no CAA |
| 111 | rockcastlecountysheriff.gov | no SPF, no DMARC, no CAA |
| 112 | saltlakehealth.gov | no SPF, p=none, no CAA |
| 113 | santaclaracounty.gov | no SPF, no DMARC |
| 114 | slopecountynd.gov | no SPF, no DMARC, no CAA |
| 115 | sussexcountyva.gov | no SPF, no DMARC, no CAA |
| 116 | tillmancountyok.gov | no SPF, no DMARC, no CAA |
| 117 | traillcountynd.gov | no SPF, no DMARC, no CAA |
| 118 | unioncountyga.gov | no SPF, no DMARC, no CAA |
| 119 | washcowi.gov | no SPF, p=none, no CAA |
| 120 | yeadonboroughpa.govYeadon Borough | no SPF, no DMARC, no CAA |
| 121 | yellcountyar.gov | no SPF, p=none, no CAA |
| 122 | ballardcoclerkky.gov | no SPF, p=none, no CAA |
| 123 | blandcountyva.gov | SPF ~all, no DMARC, no CAA |
| 124 | blounttn.gov | no SPF, p=none, no CAA |
| 125 | boerandolphcountyga.gov | SPF ~all, no DMARC, no CAA |
| 126 | cerrogordoauditor.gov | SPF ~all, no DMARC, no CAA |
| 127 | claycoclerkky.gov | no SPF, p=none, no CAA |
| 128 | cobbtax.gov | no SPF, p=none, no CAA |
| 129 | cumberlandcountynj.gov | no SPF, p=none, no CAA |
| 130 | daviscountyiowa.gov | SPF ~all, no DMARC, no CAA |
| 131 | earlycountyga.gov | SPF ~all, no DMARC, no CAA |
| 132 | gogebic.gov | no SPF, p=none, no CAA |
| 133 | goshensheriff.gov | SPF ~all, no DMARC, no CAA |
| 134 | laruecountyky.govLaRue County Courthouse | no SPF, p=none, no CAA |
| 135 | lincolncountysheriffok.gov | SPF ~all, no DMARC, no CAA |
| 136 | marshallcoclerkky.gov | no SPF, p=none, no CAA |
| 137 | mccrackenpva.gov | SPF ~all, no DMARC, no CAA |
| 138 | pittsburgcountyok.gov | no SPF, p=none, no CAA |
| 139 | renoks.gov | no SPF, p=none, no CAA |
| 140 | waynecountyoh.gov | SPF ~all, no DMARC, no CAA |
| 141 | adamscountyne.gov | SPF ~all, no DMARC, no CAA |
| 142 | alamedasheriff.gov | SPF ~all, no DMARC, no CAA |
| 143 | allencountyohiochildsupport.gov | SPF ~all, p=none, no CAA |
| 144 | atchisoncountyks.gov | SPF ~all, p=none, no CAA |
| 145 | audraincounty.gov | SPF ~all, no DMARC, no CAA |
| 146 | bacacountyco.gov | SPF ~all, no DMARC, no CAA |
| 147 | barbourcountyal.gov | SPF ~all, no DMARC, no CAA |
| 148 | barbourcountywv.gov | no SPF, DMARC reject, no CAA |
| 149 | barrencountyky.gov | SPF ~all, no DMARC, no CAA |
| 150 | bcvetsoh.gov | no DMARC, no CAA |
| 151 | bedfordcountytn.gov | SPF ~all, no DMARC, no CAA |
| 152 | bentsheriff.gov | SPF ~all, no DMARC, no CAA |
| 153 | blainecounty-mt.gov | SPF ~all, no DMARC, no CAA |
| 154 | blainesheriffid.gov | no DMARC, no CAA |
| 155 | blaircountypa.gov | SPF ~all, no DMARC, no CAA |
| 156 | boonecountyfpdmo.gov | SPF ~all, no DMARC, no CAA |
| 157 | buchanancountyvirginia.gov | SPF ~all, no DMARC, no CAA |
| 158 | buchmo.gov | SPF ~all, no DMARC, no CAA |
| 159 | cachecounty.gov | SPF ~all, no DMARC, no CAA |
| 160 | calhouncountyil.gov | SPF ~all, no DMARC, no CAA |
| 161 | cameroncopa.gov | SPF ~all, no DMARC, no CAA |
| 162 | cannoncountytn.govCannon County Government | SPF ~all, no DMARC, no CAA |
| 163 | carrollcountytn.govCarroll County Mayor's Office | SPF ~all, no DMARC, no CAA |
| 164 | cecilsheriffmd.gov | SPF ~all, no DMARC, no CAA |
| 165 | cecilstatesattorneymd.gov | SPF ~all, no DMARC, no CAA |
| 166 | charitonco.gov | no SPF, DMARC quarantine, no CAA |
| 167 | cheathamcountyclerk.govCheatham County Clerk | SPF ~all, no DMARC, no CAA |
| 168 | chelancounty.gov | no DMARC, no CAA |
| 169 | chiltoncountyso.gov | SPF ~all, no DMARC, no CAA |
| 170 | christiancountyky.gov | SPF ~all, no DMARC, no CAA |
| 171 | christiancountymo.gov | SPF ~all, no DMARC, no CAA |
| 172 | clarendoncountysheriff.gov | SPF ~all, no DMARC, no CAA |
| 173 | clarioncounty.gov | SPF ~all, no DMARC, no CAA |
| 174 | clarkcoky.gov | SPF ~all, no DMARC, no CAA |
| 175 | clarkcountyattyky.gov | no SPF, DMARC quarantine, no CAA |
| 176 | clarkcountywi.gov | SPF ~all, no DMARC, no CAA |
| 177 | cochise.gov | SPF ~all, no DMARC, no CAA |
| 178 | colliertaxcollector.gov | no SPF, DMARC quarantine, no CAA |
| 179 | collincountytexas.gov | SPF ~all, no DMARC, no CAA |
| 180 | collincountytx.gov | SPF ~all, no DMARC, no CAA |
| 181 | columbiacountyor.gov | SPF ~all, no DMARC, no CAA |
| 182 | conversecountywy.gov | SPF ~all, no DMARC, no CAA |
| 183 | copiahcountyms.gov | SPF ~all, no DMARC, no CAA |
| 184 | cortlandcountysheriffny.gov | no SPF, DMARC reject, no CAA |
| 185 | countyofmodoc.gov | SPF ~all, no DMARC, no CAA |
| 186 | crawfordcountykansas.gov | SPF ~all, no DMARC, no CAA |
| 187 | crenshawal911.gov | SPF ~all, no DMARC, no CAA |
| 188 | dareabc-nc.gov | SPF ~all, no DMARC, no CAA |
| 189 | darencsheriff.gov | SPF ~all, no DMARC, no CAA |
| 190 | dekalbgastatecourt.gov | SPF ~all, p=none, no CAA |
| 191 | dentoncountysheriffjobs.gov | no SPF, DMARC reject, no CAA |
| 192 | dickinsoncountymi.gov | SPF ~all, no DMARC, no CAA |
| 193 | dickinsoncountysheriffmi.gov | SPF ~all, no DMARC, no CAA |
| 194 | dicksoncountytn.govDickson County Government | SPF ~all, no DMARC, no CAA |
| 195 | doddridgecoprosecutor.gov | SPF ~all, no DMARC, no CAA |
| 196 | fbctx.gov | SPF ~all, no DMARC, no CAA |
| 197 | finneycountyks.gov | SPF ~all, no DMARC, no CAA |
| 198 | finneycountysheriffks.gov | SPF ~all, no DMARC, no CAA |
| 199 | first5alameda.gov | SPF ~all, no DMARC, no CAA |
| 200 | floydcountyga.gov | no DMARC, no CAA |

Showing the 200 highest-risk of 1,557 domains with a mail-authentication gap. The full set is available as a report for any single domain.

### Get yours checked

One domain, written up properly — every gap, the exact record to paste, the order it is safe to apply them in, and a free re-verification after your DNS provider makes the changes.

Hartwell Labs · Szczecin, Poland · contact@hartwell-labs.pl

Data collected 2026-10-03. Passive DNS only: MX, TXT and CAA lookups against public resolvers.
No scanning, no port probing, no login to anyone's DNS panel. Records change — re-run before
you act on a row. If your domain is listed here and you want it fixed, the report includes the
exact change to make.

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

1. **Footer** — tło `--bg-subtle`, kolumny: (proste) (0 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 201 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

