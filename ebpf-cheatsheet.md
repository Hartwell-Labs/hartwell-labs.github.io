---
title: "Free eBPF Cheat Sheet — 20 Commands for Linux Process Monitoring"
url: https://hartwell-labs.pl/ebpf-cheatsheet.html
canonical: https://hartwell-labs.pl/ebpf-cheatsheet.html
lang: en
page_type: product
description: "Free eBPF cheat sheet — 20 essential commands for Linux process monitoring: tracepoints, kprobes, USDT, maps, and Talus commands."
source_html: https://hartwell-labs.pl/ebpf-cheatsheet.html
markdown_twin: https://hartwell-labs.pl/ebpf-cheatsheet.html.md
last_generated: 2026-11-24
generator: tools/build-ai-pages.py
---

# Free eBPF Cheat Sheet — 20 Commands for Linux Process Monitoring

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

Free resource

## eBPF Cheat Sheet for Linux Process Monitoring

20 commands you reach for every day: tracepoints, kprobes, USDT, maps, and the Talus CLI equivalents.

Free download

Enter your email and we’ll show the full sheet below (plus a monthly eBPF newsletter, one click unsubscribe).

1. List loaded BPF programs

```
bpftool prog show --json
```

2. Attach a kprobe

```
bpftool prog load --prog prog.o /sys/fs/bpf/myprog type kprobe\ && bpftool net attach xdpgeneric dev eth0 prog /sys/fs/bpf/myprog
```

3. Trace an openat tracepoint

```
bpftrace -e ''tracepoint:syscalls:sys_enter_openat { printf("%s opening %s\n", comm, str(args->filename)); }''
```

4. Count opens per process (1s)

```
bpftrace -e ''interval:s:1 { print(@opens[comm]); clear(@opens); } /tracepoint:syscalls:sys_enter_openat/ { @opens[comm]++; }''
```

5. Read process name from a map

```
struct { char comm[16]; } bpf_map_lookup_elem(&proc_map, &pid);
```

6. USDT probe on a userspace binary

```
bpftrace -e ''uprobe:/usr/bin/node:gc.start { printf("gc start pid %d\n", pid); }''
```

7. Follow a PID across exec

```
bpftrace -e ''tracepoint:syscalls:sys_enter_execve { @[pid] = args->filename; }''
```

8. Measure syscall latency

```
bpftrace -e ''kprobe:sys_open, kretprobe:sys_open { @t[pid] = nsecs; } kretprobe:sys_open /@t[pid]/ { printf("lat %dns\n", nsecs - @t[pid]); delete(@t[pid]); }''
```

9. Drop packets at XDP (early)

```
tc qdisc add dev eth0 clsact && tc filter add dev eth0 ingress bpf da obj xdp.o sec xdp
```

9b. List maps

```
bpftool map show —json | jq '.[].name'
```

10. Trace file-write rate (Talus detector core)

```
tracepoint:syscalls:sys_enter_openat /args->flags & O_ACCMODE == O_WRONLY/ { @writes[pid] = count(); } interval:s:1 { print(@writes); clear(@writes); }
```

11. Whitelist a path

```
/args->filename == "/var/lib/.canary" { /* skip canary reads */ }
```

12. Kill the culprit (userspace)

```
kill -9 pid # Talus: SIGKILL from kernel verdict < 1s
```

13. Attach to a syscall with a filter

```
bpftrace -e ''tracepoint:syscalls:sys_enter_openat /comm == "rsync"/ { printf("rsync opened %s\n", str(args->filename)); }''
```

14. Export to JSON stream

```
talus monitor --json | jq . # NDJSON, sink-ready
```

15. Canary self-test (Talus)

```
talus-monitor selftest --canary # harmless ransomware burst
```

16. One-liner: top writers now

```
bpftrace -e ''tracepoint:syscalls:sys_enter_write { @[comm] = sum(args->count); }'>1s
```

17. Filter by extension

```
args->filename =~ /\.((pdf)|(docx))$/
```

18. Landlock restrict (userspace side)

```
/* eBPF sets verdict; agent applies Landlock before probing */ bpf_set_ifindex_btf... /* kernel: allow then lock */ landlock_create_ruleset(…)
```

19. Run Talus one-liner

```
sudo talus monitor --auto-kill --alert-threshold 20
```

20. Verify a signing key

```
talus license verify # Ed25519 + expiry + seat count
```

Buy Talus →Join the newsletter →

← Back to Talus Process Monitor

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Talus` → `https://hartwell-labs.pl/talus-process-monitor/`, `Firmware` → `https://hartwell-labs.pl/firmware`, `Docs` → `https://hartwell-labs.pl/docs`, `Company` → `https://hartwell-labs.pl/company`
2. **Sekcja `#—`** — *(bez nagłówka)*
   - Zawartość: tekst (1 akapitów)
3. **Footer** — tło `--bg-subtle`, kolumny: (proste) (0 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

