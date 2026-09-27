# Revdo

Revdo is a small production-oriented website project for Revdo Studios. It includes a public website, a hamburger navigation flow, local image assets, an admin login, editable site content, and image upload support.

The project is intentionally dependency-free. It runs on Node.js using the built-in HTTP server, file system module, and crypto module.

## Features

- Public Revdo Studios website
- Single HTML front end with internal page routing
- Pages: Home, Work, Services, Studio, Contact
- Mobile hamburger menu
- Minimal RD logo as SVG
- Local WebP image assets
- Admin login
- Admin dashboard at `/admin`
- Editable SEO, brand, menu, hero, work, services, process, studio, contact and footer content
- Image upload for logo, hero image and work images
- Site data stored in `data/site.json`
- No external CDN dependency
- No npm package dependency

## Project Structure

```txt
Revdo/
├── admin.html
├── assets/
│   ├── revdo-hero.webp
│   ├── revdo-mark.svg
│   ├── revdo-work-01.webp
│   ├── revdo-work-02.webp
│   ├── revdo-work-03.webp
│   └── revdo-work-04.webp
├── data/
│   └── site.json
├── index.html
├── package.json
├── server.js
├── .env.example
├── .gitignore
└── README.md
```

## Requirements

- Node.js 18 or newer

No install step is required because the project has no external dependencies.

## Run Locally

```bash
npm start
```

Open:

```txt
http://localhost:3000
```

Admin:

```txt
http://localhost:3000/admin
```

## Admin Login

Default development credential:

```txt
Username: admin
Password: admin12345
```

For real deployment, set environment variables:

```bash
ADMIN_USER=your-admin-user
ADMIN_PASSWORD=your-strong-password
SESSION_SECRET=your-long-random-session-secret
PORT=3000
HOST=127.0.0.1
```

You can copy `.env.example` as reference, but this project does not load `.env` automatically. On most hosting platforms, set those values in the hosting dashboard.

## Admin Editing

The admin dashboard can update:

- Brand name and logo path
- SEO title and description
- Navigation menu
- Hero title, subtitle, image and alt text
- Work items
- Services
- Process steps
- Studio copy, facts and principles
- Contact email and copy
- Footer text and links
- Raw JSON for advanced edits

After saving, the public website immediately reads the updated data from `data/site.json`.

## Image Upload

Supported upload formats:

- WebP
- PNG
- JPG or JPEG
- SVG

Uploaded files are saved into:

```txt
assets/
```

The admin dashboard returns the uploaded asset path and writes it into the selected field.

## API Routes

```txt
GET  /api/site
GET  /api/session
POST /api/login
POST /api/logout
PUT  /api/site
POST /api/upload
```

Protected routes:

```txt
PUT  /api/site
POST /api/upload
```

## Data Model

The public website is rendered from:

```txt
data/site.json
```

Main sections:

```txt
seo
brand
nav
hero
sections
work
services
process
studio
contact
footer
```

If you want to add more sections later, update both:

```txt
data/site.json
index.html
```

If you want the admin interface to manage a new section, update:

```txt
admin.html
```

## Security Notes

This project includes a basic session login using an HTTP-only cookie. It is acceptable for a small private admin area, but for a larger public production system, use a real database, password hashing, rate limiting, HTTPS, backup strategy, and managed authentication.

Before deployment:

- Change `ADMIN_PASSWORD`
- Set a long random `SESSION_SECRET`
- Serve the site over HTTPS
- Keep `data/site.json` backed up
- Restrict server file permissions

## Deployment

Any Node.js hosting platform can run this project.

Typical command:

```bash
npm start
```

Recommended environment variables:

```txt
PORT
HOST
ADMIN_USER
ADMIN_PASSWORD
SESSION_SECRET
```

For platforms with persistent disks, keep the `data/` and `assets/` directories persistent so admin edits and uploads survive redeploys.

## Validation

Run syntax check:

```bash
npm run check
```

Run server:

```bash
npm start
```

Then test:

```txt
/
/admin
/api/site
```

## License

Private project for Revdo Studios.
