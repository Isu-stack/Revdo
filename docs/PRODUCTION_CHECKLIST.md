# Production Checklist

Use this before deploying Revdo publicly.

## Environment

Required production variables:

```txt
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
ADMIN_USER=<admin-user>
ADMIN_PASSWORD=<strong-password>
SESSION_SECRET=<long-random-string-32-chars-minimum>
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Security

- Use HTTPS.
- Change default admin credentials.
- Set `SESSION_SECRET`.
- Keep `.env` outside Git.
- Restrict server file permissions.
- Back up `data/site.json`.
- Back up uploaded files in `assets/upload-*`.
- Revoke any temporary GitHub token after push.

## Server Behavior

The server blocks direct access to:

```txt
.env
.git/
data/
skills/
antislop.md
AGENTS.md
DESIGN.md
package.json
server.js
```

Only the public site, admin page, API routes and image assets should be reachable.

## Uploads

Allowed upload types:

```txt
WebP
PNG
JPG
```

SVG upload is intentionally disabled because SVG can carry active content when served from the same origin.

## Deployment Notes

File-based CMS storage is suitable for a VPS or any platform with persistent disk.

Avoid serverless platforms unless you replace file storage with a database and object storage. On serverless deployments, edits to `data/site.json` and uploaded assets may disappear after redeploy.

## Verification

Run:

```bash
npm run check
npm start
```

Check:

```txt
GET /                 200
GET /admin            200
GET /api/site         200
POST /api/login       200 with valid credential
PUT /api/site         200 after login
POST /api/upload      201 after login with valid image
```
