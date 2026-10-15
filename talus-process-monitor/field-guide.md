---
title: "Talus Field Guide — deployment & tuning playbook | Hartwell Labs"
url: https://hartwell-labs.pl/talus-process-monitor/field-guide.html
canonical: https://hartwell-labs.pl/talus-process-monitor/field-guide.html
lang: en
page_type: guide
description: "A practical, honest playbook for deploying and tuning Talus eBPF ransomware protection on real Linux servers: deployment modes, installation, threshold tuning, MeMLP, enterprise wiring and the alert runbook."
source_html: https://hartwell-labs.pl/talus-process-monitor/field-guide.html
markdown_twin: https://hartwell-labs.pl/talus-process-monitor/field-guide.html.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# Talus Field Guide — deployment & tuning playbook | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

On this page

← talus-process-monitor

## Talus Field Guide

Deployment & tuning playbook for real Linux servers. Written by the author — every flag here is a real interface of the agent, nothing invented.

### 1. Pick your deployment mode before anything else

| Mode | Command | Use when |
|---|---|---|
| Mode | Command | Use when |
| Observe | sudo process-monitor monitor | First week. Learn what normal looks like on YOUR hosts. Zero risk. |
| Pipeline | sudo process-monitor monitor --json | You already run a log stack (rsyslog, Loki, SIEM). Detection without response. |
| EDR | sudo process-monitor monitor --auto-kill | Hosts that hold things worth keeping, after tuning. Requires Enterprise license. |

Rule of thumb: never start in EDR mode. Tune in Observe, graduate to EDR. A wrong kill on a backup job is worse than a slow alert.

### 2. Install and sanity-check in five minutes

```
# Option A: pip installer (pulls the prebuilt release binary, no compiler needed) pip install talus-process-monitor talus-monitor install # downloads the agent from GitHub Releases # (v0.8.3: eBPF object is embedded — no .o install step) # Option B: cargo (builds from crates.io) cargo install process-monitor # Option C: build from source git clone https://github.com/Hartwell-Labs/talus-process-monitor.git cd talus-process-monitor && ./build.sh # TUI variant, ~1.7MB # or: ./build.sh --web # + REST API, WebSocket, Prometheus (Enterprise) ./install.sh # user-local install (default) sudo ./install.sh --system # /usr/local system-wide # 5-second end-to-end self-diagnostic (eBPF loads? events flowing?): sudo process-monitor monitor --diagnose
```

If --diagnose completes cleanly, the pipeline works end-to-end on your kernel. If it fails: check you are root (or CAP_BPF/CAP_SYS_ADMIN, as in the Docker example), and that BTF is available (ls /sys/kernel/btf/vmlinux).

### 3. Tuning the one knob that matters: the threshold

Talus alerts when a process opens N or more files within 1 second (default --alert-threshold 50). That single number is your false-positive dial:

    - Backups, sync jobs, media encoding — these legitimately touch hundreds of files per second. Run during a real backup window; if Talus flags the backup process, raise the threshold above the observed rate (e.g. --alert-threshold 400 ).
    - Typical web/API hosts — the default 50 rarely fires on legitimate traffic. Keep it.
    - Paranoid mode (tiny document sets, archives) — --alert-threshold 20 . Expect noise; tune or accept.

```
# Measure what normal looks like on this host: sudo process-monitor monitor --benchmark 30 # throughput + hot processes # Narrow the view to the file types you actually protect: sudo process-monitor monitor --filter-ext pdf sudo process-monitor monitor --filter-ext enc
```

FP triage method: run --json for 24h into a file, jq the alerts, and whitelist the two or three noisy legitimate processes by adjusting the threshold — not by disabling the agent. One evening of work, once per host type.

### 4. Ship it as a service

```
# /etc/systemd/system/talus.service [Unit] Description=Talus eBPF ransomware tripwire After=network.target [Service] ExecStart=/usr/local/bin/process-monitor monitor --json --alert-threshold 400 Restart=always RestartSec=5 [Install] WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload && sudo systemctl enable --now talus journalctl -u talus -f # watch the NDJSON stream
```

### 5. MeMLP — the neural layer, when to switch it on

--memlp enables the online-training detection engine. It learns from live events and saves a checkpoint every 30 seconds:

```console
sudo process-monitor monitor --memlp --memlp-checkpoint /var/lib/talus/memlp.json
```

    - Switch it on after the threshold is sane — it learns from the stream you give it.
    - The checkpoint persists across restarts: the model you trained stays yours.

### 6. Enterprise wiring (license → dashboard → exports)

```
# Activate your license (no root required): process-monitor license activate KEY process-monitor license verify # Web dashboard + REST API + Prometheus (build with ./build.sh --web first): sudo process-monitor monitor --web 0.0.0.0:8080 --auto-kill # Stream detections into your data stack: sudo process-monitor monitor --auto-kill \ --kafka-brokers localhost:9092 --kafka-topic talus-detections \ --clickhouse http://localhost:8123 \ --memgraph http://localhost:7474
```

Kafka/ClickHouse/Memgraph flags are independent — wire only what your stack already has. Nothing leaves the host by default.

### 7. Runbook: an alert fired — now what

    - In Observe/Pipeline mode: identify the process from the JSON event (pid, comm, exe). If it is not a known job — stop it, snapshot the directory tree, check for rename chains and new .enc -style extensions.
    - In EDR mode: Talus already killed the process (SIGKILL at threshold breach). Verify with journalctl -u talus | grep kill , then preserve evidence before restoring from backup.
    - After any incident: re-run --diagnose , review whether the threshold should move, and keep the 24h JSON window as evidence.

### 8. Honest limits

    - Talus watches file-event behaviour . It is not an antivirus, not a network IDS, and it will not catch a threat that touches zero files.
    - eBPF requires BTF/CO-RE support (recent kernels; the Docker runbook mounts /sys/kernel/btf explicitly). Old LTS boxes need a plan.
    - One threshold for the whole host: workloads with wildly different IO profiles on one box need either separate hosts or a higher threshold.

### Frequently asked questions

Which Talus deployment mode should I start with?

Start in Observe mode (sudo process-monitor monitor) for about a week. It is detection-only with zero risk of a wrong kill, and it teaches you what normal file activity looks like on your hosts. Graduate to Pipeline mode (--json) when you run a log stack, and to EDR mode (--auto-kill) only after tuning, on hosts that hold things worth keeping.

How do I install Talus without a compiler?

pip install talus-process-monitor, then run talus-monitor install — the Python installer pulls the prebuilt release binary (~4 MB) from GitHub Releases, no Rust toolchain needed. Alternatively cargo install process-monitor builds from crates.io, or ./build.sh compiles from source.

What threshold should I set for Talus alerts?

Talus alerts when a process opens N or more files within 1 second (default --alert-threshold 50). Keep 50 on typical web/API hosts, raise it above the observed rate of legitimate write-heavy jobs like backups (e.g. --alert-threshold 400), or lower it to 20 in paranoid mode for tiny document sets. Run monitor --benchmark 30 to measure what normal looks like on your host first.

What Linux kernels does Talus support?

Talus needs eBPF with BTF/CO-RE support, which means recent kernels. Check with ls /sys/kernel/btf/vmlinux — if that file exists, the agent loads. The Docker runbook mounts /sys/kernel/btf explicitly. Old LTS kernels without BTF need a separate plan; there is no kernel module fallback by design.

An alert fired — what do I do first?

Do not panic-kill. First identify the process from the alert output, then check whether it is a legitimate write-heavy job (backup, sync, media encoding) that simply crossed the threshold — if so, raise the threshold instead of disabling the agent. If the process is unknown, snapshot-preserve the target directories before any response, then pause or kill. The runbook section above walks through this decision step by step.

### Want the rest of the product?

Capabilities, the sixty-second start and the component licensing table are on the product page. The agent itself is free and MIT forever — the Enterprise license adds auto-kill, the web dashboard and the Kafka/ClickHouse exports.

Product page & pricingSource ↗

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `GitHub ↗` → `https://github.com/Hartwell-Labs`
2. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (12 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 1 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 9 linków-kotwic do sekcji na tej samej stronie (`#id`).
- 4 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

