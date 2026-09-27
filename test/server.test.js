"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const http = require("node:http");
const path = require("node:path");
const { after, before, test } = require("node:test");

const root = path.resolve(__dirname, "..");
const adminUser = "revdo-audit-admin";
const adminPassword = "revdo-audit-password";
let baseUrl;
let serverProcess;
let sessionCookie;

async function freePort() {
  const server = http.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

before(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(port),
      ADMIN_USER: adminUser,
      ADMIN_PASSWORD: adminPassword,
      SESSION_SECRET: "revdo-test-session-secret-at-least-32-characters"
    },
    stdio: "ignore"
  });

  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (serverProcess.exitCode !== null) throw new Error("Test server exited before becoming ready");
    try {
      const response = await fetch(`${baseUrl}/api/session`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, "Test server did not become ready");
});

after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  serverProcess.kill("SIGTERM");
  await Promise.race([
    once(serverProcess, "exit"),
    new Promise(resolve => setTimeout(resolve, 3000))
  ]);
});

test("public pages and content API respond, while private files stay blocked", async () => {
  for (const route of ["/", "/admin", "/api/site", "/assets/revdo-mark.svg"]) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 200, `${route} should respond successfully`);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }

  for (const route of ["/server.js", "/admin.html", "/package.json", "/data/site.json", "/.env"]) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 404, `${route} should not be public`);
  }

  const siteResponse = await fetch(`${baseUrl}/api/site`);
  const site = await siteResponse.json();
  assert.deepEqual(site.nav.map(item => item.slug).sort(), ["contact", "home", "services", "studio", "work"]);
});

test("encoded path traversal cannot reach project source files", async () => {
  const traversal = `/assets/%2e%2e%2f%2e%2e%2f${path.basename(root)}/server.js`;
  const response = await fetch(`${baseUrl}${traversal}`);
  assert.equal(response.status, 404);
});

test("admin sessions work and unsafe navigation, footer links and images are rejected", async () => {
  const login = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: adminUser, password: adminPassword })
  });
  assert.equal(login.status, 200);
  sessionCookie = login.headers.get("set-cookie").split(";")[0];

  const session = await fetch(`${baseUrl}/api/session`, { headers: { Cookie: sessionCookie } });
  assert.deepEqual(await session.json(), { authenticated: true });

  const unauthenticatedWrite = await fetch(`${baseUrl}/api/site`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  assert.equal(unauthenticatedWrite.status, 401);

  const site = await (await fetch(`${baseUrl}/api/site`)).json();
  site.nav[0].slug = "about";
  const invalidNavigation = await fetch(`${baseUrl}/api/site`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    body: JSON.stringify(site)
  });
  assert.equal(invalidNavigation.status, 400);

  for (const change of [
    siteData => { siteData.footer.links[0].href = "javascript:alert(1)"; },
    siteData => { siteData.hero.image = "https://tracker.example/image.webp"; }
  ]) {
    const candidate = await (await fetch(`${baseUrl}/api/site`)).json();
    change(candidate);
    const rejected = await fetch(`${baseUrl}/api/site`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify(candidate)
    });
    assert.equal(rejected.status, 400);
  }
});

test("client supplied forwarding headers cannot evade login throttling", async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": `198.51.100.${attempt + 1}`
      },
      body: JSON.stringify({ username: adminUser, password: "wrong-password" })
    });
    assert.equal(response.status, 401);
  }

  const throttled = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.99" },
    body: JSON.stringify({ username: adminUser, password: "wrong-password" })
  });
  assert.equal(throttled.status, 429);
});
