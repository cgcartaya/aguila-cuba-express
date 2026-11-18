import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(path, modules = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, {
    module, exports: module.exports,
    require: id => id in modules ? modules[id] : require(id),
  });
  return module.exports;
}

const folder = "components/landing/wfcargo";
const language = load(`${folder}/Language.ts`);
const notice = load(`${folder}/NotaryNotice.tsx`, { "./wfcargo.module.css": {} });
const { default: About } = load(`${folder}/AboutSection.tsx`, {
  "./Language": language, "./NotaryNotice": notice, "./wfcargo.module.css": {},
});

test("WF Cargo renders the company profile and both legal notices in either locale", () => {
  assert.equal(language.wfLocale(undefined), "es");
  assert.equal(language.wfLocale("de"), "es");
  for (const [locale, heading, values] of [
    ["es", "Quiénes somos", "Valores corporativos"],
    ["en", "About us", "Corporate values"],
  ]) {
    const html = renderToStaticMarkup(createElement(About, { locale }));
    assert.ok(html.includes(heading));
    assert.ok(html.includes(values));
    assert.ok(html.includes("Alexander Fournier"));
    assert.ok(html.includes("Janett Fournier"));
    assert.equal(html.match(/<dt>/g)?.length, 7);
    assert.match(html, /lang="en">I AM NOT AN ATTORNEY/);
    assert.match(html, /lang="es">NO SOY ABOGADO/);
  }
});

test("legacy notary copy is corrected while published versions and requirement IDs are preserved", () => {
  const { localizeProcedure } = load(`${folder}/procedure-copy.ts`);
  const { initialCatalog } = load("lib/procedures/seed.ts");
  const entry = { service: "notarizacion", version: 7, configuration: {
    ...initialCatalog.notarizacion,
    title: "Notarización de documentos",
    description: "Notario público de Florida.",
  } };
  for (const locale of ["es", "en"]) {
    const result = localizeProcedure(entry, locale);
    assert.equal(result.title, "Notary Public");
    assert.doesNotMatch(result.description, /notario público/i);
    assert.equal(result.variants[0].id, entry.configuration.variants[0].id);
    assert.equal(result.variants[0].requirements[0].id, entry.configuration.variants[0].requirements[0].id);
    assert.equal(result.fees[0].amount, entry.configuration.fees[0].amount);
  }
  assert.equal(localizeProcedure(entry, "en").variants[0].requirements[0].label, "Complete, unsigned document");
});
