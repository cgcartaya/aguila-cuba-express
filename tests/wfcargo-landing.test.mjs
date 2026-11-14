import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const page = fs.readFileSync("app/page.tsx", "utf8");
const ast = ts.createSourceFile(
  "page.tsx",
  page,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const resolver = ast.statements
  .find((n) => ts.isFunctionDeclaration(n) && n.name?.text === "resolveLanding")
  .getText(ast);
function loadHosts(path) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { module, exports: module.exports });
  return module.exports;
}
const context = {
  ...loadHosts("lib/luxury/hosts.ts"),
  ...loadHosts("lib/saas/wfcargo-hosts.ts"),
  PLATFORM_DOMAIN: "perlamarketplace.com",
  normalizeHost: (v) =>
    v
      .split(",")[0]
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(":")[0]
      .toLowerCase(),
};
vm.createContext(context);
vm.runInContext(
  ts.transpileModule(resolver, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText + ";globalThis.resolve=resolveLanding;",
  context,
);
test("WF Cargo is selected only for its own exact domain", () => {
  assert.equal(context.resolve("wf-cargo.perlamarketplace.com"), "wfcargo");
  assert.equal(context.resolve("WF-CARGO.PERLAMARKETPLACE.COM:443"), "wfcargo");
  assert.equal(context.resolve("wfcargoenviospsl.com"), "wfcargo");
  assert.equal(context.resolve("www.wfcargoenviospsl.com"), "wfcargo");
  for (const host of [
    "wf-cargo.evil.test",
    "wf-cargo.perlamarketplace.com.evil.test",
    "unknown.perlamarketplace.com",
    "perlamarketplace.com",
  ])
    assert.equal(context.resolve(host), "perla");
});
test("existing customer landing routes retain their identity", () => {
  for (const [host, expected] of [
    ["aguila.perlamarketplace.com", "aguila"],
    ["alvarez-travel.perlamarketplace.com", "alvarez"],
    ["yoyo.perlamarketplace.com", "yoyo"],
    ["depariscienfuegos.com", "deparis"],
    ["jotajota.perlamarketplace.com", "jotajota"],
    ["bar1820.perlamarketplace.com", "bar1820"],
    ["tumercadolajero.perlamarketplace.com", "tumercadolajero"],
  ])
    assert.equal(context.resolve(host), expected);
});
const module = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync("components/landing/wfcargo/content.ts", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  { module, exports: module.exports, encodeURIComponent },
);
const content = module.exports;
test("every promotional asset exists and is scoped to WF Cargo", () => {
  assert.equal(content.slides.length, 4);
  for (const slide of content.slides) {
    assert.match(slide.image, /^\/wfcargo\//);
    assert.ok(fs.existsSync("public" + slide.image));
    assert.ok(slide.href.startsWith("#"));
  }
});
test("contact and tariff data match the supplied business brief", () => {
  assert.equal(
    new URL(content.whatsapp("Prueba & recogida")).pathname,
    "/17725771507",
  );
  assert.equal(
    new URL(content.whatsapp("Prueba & recogida")).searchParams.get("text"),
    "Prueba & recogida",
  );
  assert.equal(content.shipping.perPound, 1.5);
  assert.equal(content.shipping.boxes[0].price, 50);
  assert.equal(content.shipping.maxBoxWeight, 100);
  assert.equal(content.branches.length, 2);
});
