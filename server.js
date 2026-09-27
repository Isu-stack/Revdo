"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const dataPath = path.join(root, "data", "site.json");
const assetsDir = path.join(root, "assets");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const isProduction = process.env.NODE_ENV === "production";
const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? "" : "admin12345");
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? "" : crypto.randomBytes(32).toString("hex"));
const sessions = new Map();
const loginAttempts = new Map();
const normalizeIp = value => value.startsWith("::ffff:") ? value.slice(7) : value;
const trustedProxyIps = new Set((process.env.TRUSTED_PROXY_IPS || "").split(",").map(value => normalizeIp(value.trim())).filter(Boolean));
const supportedRoutes = new Set(["home", "work", "services", "studio", "contact"]);
const maxLoginAttemptEntries = 5000;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};
const publicAssetExtensions = new Set([".svg", ".webp", ".png", ".jpg", ".jpeg", ".ico"]);

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
    ...headers
  });
  res.end(body);
}

function json(res, status, value, headers = {}) {
  send(res, status, JSON.stringify(value), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
}

function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("Payload too large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").map(v => v.trim()).filter(Boolean).map(v => {
    const index = v.indexOf("=");
    try {
      return [decodeURIComponent(v.slice(0, index)), decodeURIComponent(v.slice(index + 1))];
    } catch {
      return null;
    }
  }).filter(Boolean));
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function createSession() {
  const id = crypto.randomBytes(32).toString("hex");
  const token = `${id}.${sign(id)}`;
  sessions.set(id, { createdAt: Date.now() });
  return token;
}

function getSession(req) {
  const token = parseCookies(req).revdo_session;
  if (!token) return null;
  const [id, signature] = token.split(".");
  if (!id || !signature || !safeEqual(sign(id), signature)) return null;
  const session = sessions.get(id);
  if (!session) return null;
  const maxAge = 1000 * 60 * 60 * 12;
  if (Date.now() - session.createdAt > maxAge) {
    sessions.delete(id);
    return null;
  }
  return { id, ...session };
}

function clientIp(req) {
  const remoteAddress = normalizeIp(req.socket.remoteAddress || "unknown");
  if (!trustedProxyIps.has(remoteAddress)) return remoteAddress;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return remoteAddress;
}

function isRateLimited(req) {
  const key = clientIp(req);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxFailures = 5;
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (now - entry.firstAt > windowMs) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= maxFailures;
}

function recordLoginFailure(req) {
  const key = clientIp(req);
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, firstAt: now };
  if (now - entry.firstAt > 10 * 60 * 1000) {
    entry.count = 0;
    entry.firstAt = now;
  }
  entry.count += 1;
  if (!loginAttempts.has(key) && loginAttempts.size >= maxLoginAttemptEntries) {
    const oldestKey = loginAttempts.keys().next().value;
    if (oldestKey !== undefined) loginAttempts.delete(oldestKey);
  }
  loginAttempts.set(key, entry);
}

setInterval(() => {
  const now = Date.now();
  const attemptWindowMs = 10 * 60 * 1000;
  const sessionLifetimeMs = 12 * 60 * 60 * 1000;
  for (const [key, attempt] of loginAttempts) {
    if (now - attempt.firstAt > attemptWindowMs) loginAttempts.delete(key);
  }
  for (const [id, session] of sessions) {
    if (now - session.createdAt > sessionLifetimeMs) sessions.delete(id);
  }
}, 60 * 1000).unref();

function clearLoginFailures(req) {
  loginAttempts.delete(clientIp(req));
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function requireAuth(req, res) {
  if (getSession(req)) return true;
  json(res, 401, { error: "Unauthorized" });
  return false;
}

function safeJsonParse(buffer) {
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    return null;
  }
}

function isSafeAssetPath(value) {
  return value === "" || (typeof value === "string" && /^\/assets\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:svg|webp|png|jpe?g)$/i.test(value));
}

function isSafeFooterHref(value) {
  if (typeof value !== "string" || value !== value.trim()) return false;
  if (value.startsWith("#")) return supportedRoutes.has(value.slice(1));
  if (/^tel:\+?[0-9(). -]+$/i.test(value)) return true;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === "https:") return Boolean(url.hostname) && !url.username && !url.password;
  if (url.protocol === "mailto:") return /^[^@\s?]+@[^@\s?]+\.[^@\s?]+$/.test(url.pathname);
  return false;
}

function loadSite() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function saveSite(nextSite) {
  const tmp = `${dataPath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(nextSite, null, 2)}\n`);
  fs.renameSync(tmp, dataPath);
}

function normalizeSite(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw Object.assign(new Error("Invalid site data"), { statusCode: 400 });
  }
  const requiredArrays = ["nav", "work", "services", "process"];
  for (const key of requiredArrays) {
    if (!Array.isArray(input[key])) {
      throw Object.assign(new Error(`${key} must be an array`), { statusCode: 400 });
    }
  }
  if (
    input.nav.length !== supportedRoutes.size ||
    input.nav.some(item => !item || !supportedRoutes.has(item.slug) || typeof item.label !== "string") ||
    new Set(input.nav.map(item => item.slug)).size !== supportedRoutes.size
  ) {
    throw Object.assign(new Error("nav must contain one labeled entry for each supported page"), { statusCode: 400 });
  }
  if (!input.brand?.name || !input.hero?.title || !input.contact?.email) {
    throw Object.assign(new Error("brand.name, hero.title and contact.email are required"), { statusCode: 400 });
  }
  if (!isSafeAssetPath(input.brand.logo || "") || !isSafeAssetPath(input.hero.image || "") || input.work.some(item => !item || !isSafeAssetPath(item.image || ""))) {
    throw Object.assign(new Error("Image paths must point to local assets"), { statusCode: 400 });
  }
  if (!Array.isArray(input.footer?.links) || input.footer.links.some(item => !item || typeof item.label !== "string" || !isSafeFooterHref(item.href))) {
    throw Object.assign(new Error("Footer links must use a supported safe destination"), { statusCode: 400 });
  }
  return input;
}

function serveFile(req, res, pathname) {
  let target;
  let isAsset = false;
  if (pathname === "/") {
    target = path.join(root, "index.html");
  } else if (pathname === "/admin") {
    target = path.join(root, "admin.html");
  } else if (pathname.startsWith("/assets/")) {
    isAsset = true;
    const filename = pathname.slice("/assets/".length);
    if (!filename || filename.includes("/") || !/^[A-Za-z0-9._-]+$/.test(filename)) {
      send(res, 404, "Not found");
      return;
    }
    target = path.join(assetsDir, filename);
  } else {
    send(res, 404, "Not found");
    return;
  }
  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      send(res, 404, "Not found");
      return;
    }
    const ext = path.extname(target).toLowerCase();
    if (isAsset && !publicAssetExtensions.has(ext)) {
      send(res, 404, "Not found");
      return;
    }
    const stream = fs.createReadStream(target);
    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": target.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=86400" : "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
    });
    stream.pipe(res);
  });
}

function parseMultipart(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(delimiter);
  while (start !== -1) {
    start += delimiter.length;
    if (buffer[start] === 45 && buffer[start + 1] === 45) break;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), start);
    if (headerEnd === -1) break;
    const header = buffer.slice(start, headerEnd).toString("utf8");
    const next = buffer.indexOf(delimiter, headerEnd + 4);
    if (next === -1) break;
    let content = buffer.slice(headerEnd + 4, next);
    if (content.length >= 2 && content[content.length - 2] === 13 && content[content.length - 1] === 10) {
      content = content.slice(0, -2);
    }
    parts.push({ header, content });
    start = next;
  }
  return parts;
}

function extensionForMime(mime) {
  return {
    "image/webp": ".webp",
    "image/png": ".png",
    "image/jpeg": ".jpg"
  }[mime] || "";
}

function hasExpectedImageSignature(buffer, ext) {
  if (ext === ".png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (ext === ".jpg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  if (ext === ".webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

async function handleUpload(req, res) {
  if (!requireAuth(req, res)) return;
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  if (!boundaryMatch) {
    json(res, 400, { error: "Missing multipart boundary" });
    return;
  }
  const body = await readBody(req, 12 * 1024 * 1024);
  const parts = parseMultipart(body, boundaryMatch[1] || boundaryMatch[2]);
  const filePart = parts.find(part => /name="file"/.test(part.header));
  if (!filePart) {
    json(res, 400, { error: "Missing file" });
    return;
  }
  const contentTypeMatch = filePart.header.match(/Content-Type:\s*([^\r\n]+)/i);
  const mime = contentTypeMatch?.[1]?.trim().toLowerCase();
  const ext = extensionForMime(mime);
  if (!ext) {
    json(res, 415, { error: "Only webp, png and jpg images are allowed" });
    return;
  }
  if (filePart.content.length < 10) {
    json(res, 400, { error: "File is empty" });
    return;
  }
  if (!hasExpectedImageSignature(filePart.content, ext)) {
    json(res, 415, { error: "File content does not match the selected image type" });
    return;
  }
  fs.mkdirSync(assetsDir, { recursive: true });
  const filename = `upload-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const target = path.join(assetsDir, filename);
  fs.writeFileSync(target, filePart.content);
  json(res, 201, { path: `/assets/${filename}` });
}

async function router(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (req.method === "GET" && pathname === "/api/site") {
      json(res, 200, loadSite());
      return;
    }

    if (req.method === "GET" && pathname === "/api/session") {
      json(res, 200, { authenticated: Boolean(getSession(req)) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/login") {
      if (isRateLimited(req)) {
        json(res, 429, { error: "Too many login attempts. Try again later." });
        return;
      }
      const payload = safeJsonParse(await readBody(req, 128 * 1024));
      if (!payload || !safeEqual(payload.username, adminUser) || !safeEqual(payload.password, adminPassword)) {
        recordLoginFailure(req);
        json(res, 401, { error: "Invalid username or password" });
        return;
      }
      clearLoginFailures(req);
      const secure = isProduction ? "; Secure" : "";
      const cookie = `revdo_session=${encodeURIComponent(createSession())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}`;
      json(res, 200, { ok: true }, { "Set-Cookie": cookie });
      return;
    }

    if (req.method === "POST" && pathname === "/api/logout") {
      const token = parseCookies(req).revdo_session;
      const id = token?.split(".")[0];
      if (id) sessions.delete(id);
      json(res, 200, { ok: true }, { "Set-Cookie": "revdo_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
      return;
    }

    if (req.method === "PUT" && pathname === "/api/site") {
      if (!requireAuth(req, res)) return;
      const payload = safeJsonParse(await readBody(req, 2 * 1024 * 1024));
      const nextSite = normalizeSite(payload);
      saveSite(nextSite);
      json(res, 200, { ok: true, site: nextSite });
      return;
    }

    if (req.method === "POST" && pathname === "/api/upload") {
      await handleUpload(req, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      if (pathname === "/admin") {
        serveFile(req, res, "/admin");
        return;
      }
      serveFile(req, res, pathname);
      return;
    }

    send(res, 405, "Method not allowed");
  } catch (err) {
    const status = err.statusCode || 500;
    json(res, status, { error: status === 500 ? "Server error" : err.message });
  }
}

fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });

if (isProduction) {
  if (!adminPassword) throw new Error("ADMIN_PASSWORD is required when NODE_ENV=production");
  if (!sessionSecret || sessionSecret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters when NODE_ENV=production");
}

http.createServer(router).listen(port, host, () => {
  console.log(`Revdo running at http://${host}:${port}`);
  console.log(`Admin dashboard: http://${host}:${port}/admin`);
});
