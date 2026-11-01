# hartwell-web — Company Website & Product Catalog

**The official Hartwell Labs website**, served via GitHub Pages at https://hartwell-labs.github.io

![Hartwell Labs Website](https://via.placeholder.com/1200x628/0a0e14/ffffff?text=Hartwell+Labs+Website)

---

## 🌐 Overview

Corporate website and product catalog for Hartwell Labs, containing:

- **Landing page** — Company overview, engineering practices, and primary CTAs
- **Product catalog** — Showcase of all products and services
- **Documentation** — Per-product docs and technical articles
- **Security policy** — 48-hour disclosure SLA, safe harbor, vulnerability reporting
- **Company page** — About, team, and company information
- **Various tool pages** — Including Talus Process Monitor, EDR, and other security tools

---

## 📄 Key Pages

| Path | Description |
| ---- | ----------- |
| `/` | Landing page — flagship engineering practices, company CTA |
| `/products` | Product catalog — all Hartwell Labs products |
| `/docs` | Documentation entry points per product |
| `/security` | Security policy, 48h disclosure SLA, safe harbor |
| `/company` | About Hartwell Labs |
| `/privacy` | Privacy policy |
| `/robots.txt` | Search engine robots directives |
| `/sitemap.xml` | SEO sitemap |

---

## 🎨 Design System

**Consistent branding** across all Hartwell Labs properties:

- **Color palette**:
  - Dark mode: `#0a0e14` (bg), `#f1f5f9` (txt), `#4f46e5` (accent)
  - Light mode: `#f8fafc` (bg), `#0f172a` (txt)
- **Typography**: `Inter` font for UI, `JetBrains Mono` for code
- **Icon style**: Custom SVGs with brand colors
- **Badge style**: Flat-square badges in indigo (`#4f46e5`) and orange (`#F15A24`)

**Animation highlights**:

- Subtle header sticky-effect with blur backdrop filter
- Color scheme toggle (dark/light mode with `prefers-color-scheme`)
- Smooth page transitions via `scroll-behavior: smooth`
- Hover states on navigation and interactive elements
- SVG path animations in site logo

---

## 🚀 Quick Start

```bash
# Local development
python3 -m http.server 8080
# → Visit http://localhost:8080

# Or use GitHub Pages
# Push to main branch on hartwell-labs.github.io repo
```

---

## 📦 Project Structure

```
hartwell-web/
├── index.html          # Landing page
├── products.html       # Product catalog
├── docs.html           # Documentation portal
├── security.html       # Security policy page
├── company.html        # About page
├── talus-process-monitor/
│   └── talus-process-monitor.md  # Talus docs
├── talus/
│   └── talus-process-monitor.html  # Talus page
├── viralitycheck/      # Virality calculator tool
├── report/             # Reports and analytics
├── scripts/            # Utility scripts
├── .github/            # GitHub Actions, workflows
├── .github/io/         # GitHub Pages configuration
├── LICENSE             # MIT License
├── sitemap.xml         # SEO sitemap
└── robots.txt          # Robot directives
```

---

## 🛠️ Development

```bash
# Local preview
python3 -m http.server 8080

# No build step - pure HTML/CSS/JS site
# All CSS inline, no preprocessors needed
# Add new pages by creating .html files in root

# GitHub Pages deployment
# Push to main branch of hartwell-labs.github.io
```

---

## 📱 Responsive Design

The site is fully responsive with breakpoints at:

- **1200px**: Full desktop layout
- **768px**: Tablet layout, stacked content
- **480px**: Mobile-first, simplified navigation
- **< 480px**: Single-column layout, touch-friendly

---

## 🔐 Security

- **RFC 9116 security.txt** at `/.well-known/security.txt`
- **Inline CSP** - no external scripts loaded
- **Sitemap + robots.txt** for search engine optimization
- **Vulnerability reporting** via `/security` page (48h SLA)

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🤝 Related Projects

- [Talus Process Monitor](https://github.com/hartwell-labs/talus-process-monitor) - EDR/ESR solution
- [hartwell-ai](https://github.com/hartwell-labs/hartwell-ai) - AI-related tools
- [hartwell-products](https://github.com/hartwell-labs/hartwell-products) - Product catalog

---

## 📞 Contact

- **Website**: https://hartwell-labs.github.io
- **Email**: Via contact form on company page
- **GitHub**: @Hartwell-Labs

---

## 🙏 Credits

- **Company**: Hartwell Labs
- **Designed**: 2026
- **Maintained**: Open source, built in the open