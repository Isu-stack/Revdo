# Revdo

Revdo is a production-oriented website and lightweight content management system for Revdo Studios, an independent design and software studio based in Bandung, Indonesia.

The project combines a public studio website, an authenticated admin dashboard, editable content storage, local image assets, upload handling, project-level quality rules, and operational documentation. It is designed as a focused Node.js application with no external runtime dependencies.

Repository:

```txt
https://github.com/Isu-stack/Revdo
```

## Executive Summary

Revdo provides a compact CMS-backed studio website that can be deployed on any Node.js host with persistent disk. The public site renders content from `data/site.json`, while `/admin` provides a private dashboard for updating copy, navigation, work items, services, process, studio profile, contact details, and selected image assets.

The application is intentionally simple:

- No database service required.
- No build step required.
- No npm dependency required.
- No external CDN required.
- Uses Node.js built-in modules only.

This makes the project suitable for small studio websites, internal landing pages, portfolio sites, and early-stage brand websites where operational simplicity matters more than enterprise-scale multi-user publishing.

## Current Status

| Area | Status |
| --- | --- |
| Public website | Implemented |
| Admin login | Implemented |
| Admin content editor | Implemented |
| Image upload | Implemented for WebP, PNG, JPG |
| File-based CMS storage | Implemented |
| Git workflow documentation | Implemented |
| Production checklist | Implemented |
| Antislop project guidance | Implemented |
| External database | Not included |
| Multi-user role management | Not included |
| Password hashing service | Not included |
| Audit log | Not included |

## Core Capabilities

### Public Website

- Home, Work, Services, Studio and Contact views
- Single HTML front end with internal hash routing
- Mobile hamburger navigation
- Generated RD logo asset
- Local WebP image assets
- Contact form that opens the user's email client with a prepared inquiry

### Admin CMS

- Admin login at `/admin`
- Session-based authentication using HTTP-only cookies
- Editable site content stored in `data/site.json`
- Raw JSON editor for advanced changes
- Image upload for logo, hero image and work images
- Upload validation for WebP, PNG and JPG
- SVG upload intentionally disabled

### Operations

- Git workflow documentation
- Production deployment checklist
- Security notes
- Antislop quality filter and skill files
- Project design direction in `DESIGN.md`
- Agent guidance in `AGENTS.md`

## Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 18 or newer |
| Server | Node.js `http` module |
| File system | Node.js `fs` module |
| Auth/session signing | Node.js `crypto` module |
| Public UI | HTML, CSS, vanilla JavaScript |
| Admin UI | HTML, CSS, vanilla JavaScript |
| CMS storage | JSON file |
| Image assets | Local WebP, SVG logo, uploaded WebP/PNG/JPG |
| Package manager | npm, only for scripts |

## Architecture

```txt
Browser
  |
  | GET /
  v
index.html
  |
  | GET /api/site
  v
server.js
  |
  | read/write
  v
data/site.json

Admin Browser
  |
  | GET /admin
  v
admin.html
  |
  | POST /api/login
  | PUT  /api/site
  | POST /api/upload
  v
server.js
  |
  | write content and uploaded files
  v
data/site.json + assets/
```

## Repository Structure

```txt
Revdo/
├── AGENTS.md
├── DESIGN.md
├── README.md
├── admin.html
├── antislop.md
├── assets/
│   ├── revdo-hero.webp
│   ├── revdo-mark.svg
│   ├── revdo-work-01.webp
│   ├── revdo-work-02.webp
│   ├── revdo-work-03.webp
│   └── revdo-work-04.webp
├── data/
│   └── site.json
├── docs/
│   ├── GIT_WORKFLOW.md
│   └── PRODUCTION_CHECKLIST.md
├── index.html
├── package.json
├── server.js
└── skills/
    ├── antislop/
    ├── antislop-code/
    ├── antislop-copywriting/
    ├── antislop-human/
    ├── antislop-layoutmobile/
    └── antislop-ui/
```

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Isu-stack/Revdo.git
cd Revdo
```

### 2. Check Node Version

```bash
node -v
```

Required:

```txt
Node.js 18 or newer
```

### 3. Start Application

```bash
npm start
```

Public website:

```txt
http://localhost:3000
```

Admin dashboard:

```txt
http://localhost:3000/admin
```

## Default Local Credential

For local development only:

```txt
Username: admin
Password: admin12345
```

Do not use this credential in production.

## Environment Variables

The project does not load `.env` automatically. Set environment variables directly in your hosting platform, process manager, shell, Docker runtime or system service.

Development example:

```txt
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
ADMIN_USER=admin
ADMIN_PASSWORD=admin12345
SESSION_SECRET=development-secret-at-least-32-characters
```

Production example:

```txt
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
ADMIN_USER=<admin-user>
ADMIN_PASSWORD=<strong-password>
SESSION_SECRET=<long-random-secret-minimum-32-characters>
TRUSTED_PROXY_IPS=<optional-direct-proxy-peer-addresses>
```

Generate a strong session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Application Scripts

```bash
npm start
```

Starts the Node.js server.

```bash
npm run check
```

Checks server syntax, parses inline browser scripts, validates configured navigation routes and checks that referenced local images exist.

```bash
npm test
```

Runs isolated HTTP regression tests for static-file access, encoded traversal, admin sessions, navigation validation and login throttling.

## API Reference

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/site` | No | Read public site content |
| `GET` | `/api/session` | No | Check admin session status |
| `POST` | `/api/login` | No | Create admin session |
| `POST` | `/api/logout` | Yes | Clear admin session |
| `PUT` | `/api/site` | Yes | Replace site content JSON |
| `POST` | `/api/upload` | Yes | Upload image asset |

## Data Model

The CMS source of truth is:

```txt
data/site.json
```

Main sections:

| Key | Purpose |
| --- | --- |
| `seo` | Browser title and meta description |
| `brand` | Brand name and logo path |
| `nav` | Public navigation views |
| `hero` | Home hero content and image |
| `sections` | Section-level headings and intro copy |
| `work` | Work/project cards |
| `services` | Service list |
| `process` | Process list |
| `studio` | Studio statement, facts and principles |
| `contact` | Contact page content and email |
| `footer` | Footer copy and links |

## Admin Editing Scope

The admin dashboard can update:

- SEO title and description
- Brand name and logo path
- Navigation menu
- Hero eyebrow, title, subtitle, image and alt text
- Work item title, scope, description, image and alt text
- Services
- Process steps
- Studio location, statement, copy, facts and principles
- Contact title, copy and email
- Footer description, links, copyright and timezone
- Raw JSON for advanced editing

## Image Upload Policy

Allowed formats:

```txt
WebP
PNG
JPG/JPEG
```

Rejected formats:

```txt
SVG
GIF
PDF
HTML
Any non-image file
```

SVG uploads are disabled because SVG can contain active content when served from the same origin. The project still includes the original `revdo-mark.svg` as a trusted static asset.

Uploaded files are stored in:

```txt
assets/
```

Upload validation checks both declared MIME type and file signature.

## Security Model

This project includes practical hardening for a small private CMS.

Implemented controls:

- HTTP-only session cookie
- `SameSite=Lax` cookie policy
- `Secure` cookie flag when `NODE_ENV=production`
- HMAC-signed session token
- Login rate limiting by client IP
- Forwarded client IPs are used only for explicitly trusted proxy peers
- Login attempt and expired session records are pruned and capped
- Static serving allowlists the public pages and direct asset filenames
- Security headers disable MIME sniffing and framing
- Timing-safe credential comparison
- Production startup guard for missing `ADMIN_PASSWORD`
- Production startup guard for missing or weak `SESSION_SECRET`
- Upload type allowlist
- Upload file signature validation

Static routes allow only `/`, `/admin`, and safe filenames directly within `assets/`. The API exposes public site content at `/api/site`; internal files are not served through the static handler.

Security limits:

- Admin password is still an environment variable, not a hashed database record.
- Session storage is in memory, so sessions reset on server restart.
- File-based storage does not include per-user audit logs.
- No multi-role authorization is implemented.
- No CSRF token layer is implemented beyond `SameSite=Lax`.

For a larger SaaS product, replace the file-based CMS with a database, hashed admin users, audit logs, role-based access control, CSRF tokens, object storage and backups.

## Deployment Guidance

Recommended deployment target:

```txt
VPS, VM, container host or any Node.js platform with persistent disk
```

Use persistent storage for:

```txt
data/site.json
assets/upload-*
```

Avoid pure serverless deployments unless storage is redesigned. Serverless platforms may discard runtime file edits after redeploy.

Production command:

```bash
npm start
```

Production environment:

```txt
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
ADMIN_USER=<admin-user>
ADMIN_PASSWORD=<strong-password>
SESSION_SECRET=<long-random-secret>
TRUSTED_PROXY_IPS=<optional-direct-proxy-peer-addresses>
```

Read before publishing:

```txt
docs/PRODUCTION_CHECKLIST.md
```

## Validation Procedure

Run:

```bash
npm run check
npm test
```

Validate JSON:

```bash
node -e "JSON.parse(require('fs').readFileSync('data/site.json','utf8')); console.log('site json ok')"
```

Run server:

```bash
npm start
```

Manual endpoint checks:

```txt
GET  /                 should return 200
GET  /admin            should return 200
GET  /api/site         should return 200
GET  /data/site.json   should return 404
GET  /.env             should return 404
GET  /server.js        should return 404
POST /api/login        should return 200 with valid credential
POST /api/upload       should reject SVG with 415
```

## Git Workflow

Detailed workflow:

```txt
docs/GIT_WORKFLOW.md
```

Standard update flow:

```bash
git pull --rebase origin main
npm run check
git add .
git commit -m "Describe the change"
git push origin main
```

Recommended commit messages:

```txt
Harden admin upload handling
Add Git workflow documentation
Update Revdo site content
Enhance README documentation
```

Avoid:

```txt
update
fix
final
changes
```

## Quality System

This repository includes antislop from:

```txt
https://github.com/miqdadbadjuber/anti-slop
```

Project-level files:

```txt
AGENTS.md
DESIGN.md
antislop.md
skills/
```

Purpose:

- Keep UI work specific to Revdo's identity
- Remove generic AI-style landing page patterns
- Improve copy quality
- Protect accessibility and mobile layout quality
- Keep comments useful and short

Revdo's design direction is defined in:

```txt
DESIGN.md
```

Agent instructions are defined in:

```txt
AGENTS.md
```

## Operational Responsibilities

### Content Owner

- Maintain site copy in admin dashboard.
- Keep work/project descriptions accurate.
- Avoid fabricated claims, fake testimonials and fake metrics.

### Developer

- Maintain `server.js`, `index.html` and `admin.html`.
- Validate before push.
- Keep security hardening intact.
- Update documentation with code changes.

### Operator

- Set production environment variables.
- Back up `data/site.json`.
- Back up uploaded assets.
- Rotate admin password and session secret when needed.
- Revoke temporary GitHub tokens after use.

## Backup Strategy

Minimum backup scope:

```txt
data/site.json
assets/upload-*
```

Suggested schedule:

| Environment | Frequency |
| --- | --- |
| Local development | Before major edits |
| Staging | Daily |
| Production | Daily minimum, hourly if content changes often |

Backup example:

```bash
mkdir -p backups
cp data/site.json backups/site-$(date +%Y%m%d-%H%M%S).json
```

## Troubleshooting

### Server does not start in production

Check required variables:

```txt
ADMIN_PASSWORD
SESSION_SECRET
```

`SESSION_SECRET` must be at least 32 characters.

### Admin login fails

Check:

- `ADMIN_USER`
- `ADMIN_PASSWORD`
- browser cookie settings
- rate limit after failed attempts

### Uploaded image does not work

Check:

- file type is WebP, PNG or JPG
- file content matches its MIME type
- uploaded path is stored in `data/site.json`
- `assets/` is persistent on the host

### Content disappears after deploy

Likely cause:

```txt
runtime file storage is not persistent
```

Fix:

- deploy on a host with persistent disk, or
- move content storage to a database and image storage to object storage

### Git push fails

Check:

- remote URL
- token permission
- selected repository access
- `Contents: Read and write`

See:

```txt
docs/GIT_WORKFLOW.md
```

## Roadmap

Recommended next improvements:

1. Add password hashing and admin user storage.
2. Add CSRF token protection.
3. Add content version history.
4. Add audit log for admin edits.
5. Add database-backed CMS storage.
6. Add object storage for uploads.
7. Add server-side rendered routes for stronger SEO.
8. Add browser-based responsive UI tests.
9. Add automated accessibility regression checks.
10. Add deployment pipeline.

## License

Private project for Revdo Studios. All rights reserved unless a separate license is added by the project owner.
