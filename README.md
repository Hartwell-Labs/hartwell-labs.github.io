<div align="center">

<img src="https://raw.githubusercontent.com/Hartwell-Labs/.github/main/profile/assets/hartwell-logo.svg" width="72" alt="Hartwell Labs" />

## Hartwell Labs — Root Site

The official company website, served via GitHub Pages.

[![Website](https://img.shields.io/badge/site-hartwell--labs.github.io-4f46e5?style=flat-square)](https://hartwell-labs.github.io) [![License](https://img.shields.io/badge/license-MIT-F15A24?style=flat-square)](LICENSE)

[Website](https://hartwell-labs.github.io) · [All products](https://hartwell-labs.github.io/products/) · [Security](https://hartwell-labs.github.io/security/) · [Hack the Lab](https://github.com/Hartwell-Labs/hack-the-lab)

</div>

## Pages

| Path | Page |
|---|---|
| `/` | Landing — flagship, engineering practices, company CTA |
| `/products` | Product catalog |
| `/docs` | Documentation entry points per product |
| `/security` | Security policy, 48h disclosure SLA, safe harbor |
| `/company` | About the company |
| `/.well-known/security.txt` | RFC 9116 security.txt |

Clean URLs via folder-per-page structure (`.html` stubs redirect); `.nojekyll`
keeps dotfiles (security.txt) served. Inline-only CSP, no external scripts;
`sitemap.xml` + `robots.txt` included.

## Brand

Single corporate identity across the site, the [org profile](https://github.com/Hartwell-Labs/.github)
and every repo README: own logo (hex + pulse), flat-square badges (orange
`#F15A24` / indigo `#4f46e5`), Inter + JetBrains Mono, direct external links
(no redirectors, no third-party banner generators).

## Local preview

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

---

<div align="center">

**[Hartwell Labs](https://github.com/Hartwell-Labs)** — security systems, languages and tools, built in the open.

[Website](https://hartwell-labs.github.io) · [All products](https://hartwell-labs.github.io/products/) · [Security policy](https://hartwell-labs.github.io/security/) · [Report a vulnerability](https://hartwell-labs.github.io/security/)

<sub>MIT License · © 2026 Hartwell Labs</sub>

</div>
