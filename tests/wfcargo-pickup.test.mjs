import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function load(path, deps = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      Date,
      Intl,
      console,
      URL,
      require: (n) => (n in deps ? deps[n] : require(n)),
    },
  );
  return module.exports;
}
const prefill = load("lib/pickups/planner-prefill.ts");
test("WF pickup carries entered contact, package count, date and ZIP into the shared planner", () => {
  const p = prefill.preparePickupPrefill({
    customerName: "  Prueba WF ",
    phone: "7725550100",
    address: "10546 S US Hwy 1, 34952",
    packageCount: "2",
    preferredDate: "2099-12-20",
  });
  assert.equal(p.form.customer_name, "Prueba WF");
  assert.equal(p.form.postal_code, "34952");
  assert.equal(p.form.address_line_1, "10546 S US Hwy 1");
  assert.equal(p.form.package_count, "2");
  assert.equal(p.selectedDates[0], "2099-12-20");
  assert.equal(p.form.store_slug, undefined);
  assert.equal(p.form.store_id, undefined);
});
test("prefill bounds count and rejects malformed dates without treating street number as ZIP", () => {
  const p = prefill.preparePickupPrefill({
    customerName: "x",
    phone: "1",
    address: "12345 Main Street",
    packageCount: "1000",
    preferredDate: "tomorrow",
  });
  assert.equal(p.form.package_count, "99");
  assert.equal(p.form.postal_code, "");
  assert.equal(p.form.address_line_1, "12345 Main Street");
  assert.equal(p.selectedDates.length, 0);
});
const planner = load("components/pickups/PickupPlannerHero.tsx", {
  "./CityAutocomplete": () => null,
  "@/components/maps/LocationPickerMap": () => null,
  "@/lib/pickups/planner-prefill": prefill,
}).default;
test("shared planner keeps its original entry for YOYO and Alvarez", () => {
  for (const [storeSlug, storeName] of [
    ["yoyo-envios", "YOYO"],
    ["alvarez-travel", "Álvarez Travel"],
  ]) {
    const html = renderToStaticMarkup(
      React.createElement(planner, {
        storeSlug,
        storeName,
        whatsappPhone: "test",
        variant: "horizontal",
      }),
    );
    assert.match(html, /Escribe tu ciudad y dirección/);
    assert.match(html, /Recogemos en tu puerta/);
    assert.doesNotMatch(html, /WF Cargo/);
  }
});
test("custom trigger is the only visible entry while retaining the shared planner", () => {
  const html = renderToStaticMarkup(
    React.createElement(planner, {
      storeSlug: "wf-cago",
      storeName: "WF Cargo Envíos",
      whatsappPhone: "17725771507",
      renderTrigger: (open) =>
        React.createElement(
          "button",
          { "data-ready": typeof open === "function" },
          "Coordina tu recogida",
        ),
    }),
  );
  assert.match(html, /data-ready="true"/);
  assert.match(html, /Coordina tu recogida/);
  assert.doesNotMatch(html, /Recogemos en tu puerta/);
});
let received;
const wf = load("components/landing/wfcargo/PickupForm.tsx", {
  "@/components/pickups/PickupPlannerHero": (props) => {
    received = props;
    return props.renderTrigger(() => {});
  },
  "./content": { contact: { whatsapp: "17725771507" } },
  "./wfcargo.module.css": {},
}).default;
test("WF card retains its design and pins the actual tenant and WhatsApp", () => {
  const html = renderToStaticMarkup(React.createElement(wf));
  assert.equal(received.storeSlug, "wf-cago");
  assert.equal(received.storeName, "WF Cargo Envíos");
  assert.equal(received.whatsappPhone, "17725771507");
  assert.match(html, /Nombre completo/);
  assert.match(html, /Fecha preferida/);
  assert.match(html, /Continuar con mi solicitud/);
  assert.doesNotMatch(html, /Continuar en WhatsApp/);
});
