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
TRUSTED_PROXY_IPS=<comma-separated-direct-proxy-addresses>
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Security

- Use HTTPS.
- Keep the reverse proxy configured to overwrite `X-Forwarded-For` before forwarding requests.
- Change default admin credentials.
- Set `SESSION_SECRET`.
- Keep `.env` outside Git.
- Restrict server file permissions.
- Back up `data/site.json`.
- Back up uploaded files in `assets/upload-*`.
- Revoke any temporary GitHub token after push.

Only set `TRUSTED_PROXY_IPS` when a reverse proxy connects directly to this server. List the proxy peer addresses, not visitor addresses. Configure the proxy to replace incoming `X-Forwarded-For` values before forwarding requests. Leave the variable empty when clients connect directly.

## Server Behavior

Static hosting uses an allowlist. Only `/`, `/admin`, and safe filenames directly inside `assets/` are served. Source files, application data and project documentation remain unavailable through static routes, including encoded traversal requests.

The public CMS content remains available through `/api/site`. The admin write endpoint and uploads require a valid admin session.

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
npm test
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

`npm test` starts an isolated local server and checks public routes, blocked files, encoded traversal, admin sessions, navigation validation and login throttling.
