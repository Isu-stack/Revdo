"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const site = JSON.parse(fs.readFileSync(path.join(root, "data", "site.json"), "utf8"));
const supportedRoutes = ["home", "work", "services", "studio", "contact"];

assert.deepEqual(site.nav.map(item => item.slug).sort(), [...supportedRoutes].sort(), "Navigation must match the implemented pages");
assert.ok(site.footer.links.every(link => link.href && link.href !== "#"), "Footer links must have destinations");

const assetPaths = [site.brand.logo, site.hero.image, ...site.work.map(item => item.image)];
for (const assetPath of assetPaths) {
  assert.ok(typeof assetPath === "string" && assetPath.startsWith("/assets/"), `Expected a local asset path, got ${assetPath}`);
  const filename = assetPath.slice("/assets/".length);
  assert.ok(!filename.includes("/"), `Asset paths must name a file directly: ${assetPath}`);
  assert.ok(fs.statSync(path.join(root, "assets", filename)).isFile(), `Missing asset: ${assetPath}`);
}

for (const htmlFile of ["index.html", "admin.html"]) {
  const source = fs.readFileSync(path.join(root, htmlFile), "utf8");
  const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, `${htmlFile} has no inline scripts to validate`);
  scripts.forEach((match, index) => {
    new vm.Script(match[1], { filename: `${htmlFile}:inline-script-${index + 1}` });
  });
}

console.log("Project check passed: content, local assets and inline JavaScript are valid.");
