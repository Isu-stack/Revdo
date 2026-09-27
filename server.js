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
const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const sessions = new Map();

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

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", ...headers });
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
    return [decodeURIComponent(v.slice(0, index)), decodeURIComponent(v.slice(index + 1))];
  }));
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
  if (!id || !signature || sign(id) !== signature) return null;
  const session = sessions.get(id);
  if (!session) return null;
  const maxAge = 1000 * 60 * 60 * 12;
  if (Date.now() - session.createdAt > maxAge) {
    sessions.delete(id);
    return null;
  }
  return { id, ...session };
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
  if (!input.brand?.name || !input.hero?.title || !input.contact?.email) {
    throw Object.assign(new Error("brand.name, hero.title and contact.email are required"), { statusCode: 400 });
  }
  return input;
}

function serveFile(req, res, pathname) {
  const target = path.normalize(path.join(root, pathname === "/" ? "index.html" : pathname));
  if (!target.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }
  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      send(res, 404, "Not found");
      return;
    }
    const ext = path.extname(target).toLowerCase();
    const stream = fs.createReadStream(target);
    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": target.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=86400" : "no-store"
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
    "image/jpeg": ".jpg",
    "image/svg+xml": ".svg"
  }[mime] || "";
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
    json(res, 415, { error: "Only webp, png, jpg and svg images are allowed" });
    return;
  }
  if (filePart.content.length < 10) {
    json(res, 400, { error: "File is empty" });
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
      const payload = safeJsonParse(await readBody(req, 128 * 1024));
      if (!payload || payload.username !== adminUser || payload.password !== adminPassword) {
        json(res, 401, { error: "Invalid username or password" });
        return;
      }
      const cookie = `revdo_session=${encodeURIComponent(createSession())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`;
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
        serveFile(req, res, "/admin.html");
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

http.createServer(router).listen(port, host, () => {
  console.log(`Revdo running at http://${host}:${port}`);
  console.log(`Admin dashboard: http://${host}:${port}/admin`);
});
