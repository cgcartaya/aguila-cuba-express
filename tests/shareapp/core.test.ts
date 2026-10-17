import test from "node:test";
import assert from "node:assert/strict";
import {
  signReceipt,
  verifyReceipt,
  cookieName,
  destination,
  storefront,
  isPreviewBot,
  type Receipt,
} from "../../lib/shareapp/core";
const store = "11111111-1111-4111-8111-111111111111";
const receipt: Receipt = {
  linkId: "22222222-2222-4222-8222-222222222222",
  storeId: store,
  visitId: "33333333-3333-4333-8333-333333333333",
  issuedAt: 1000000000,
};
const secret = "test-only-key";
test("signed attribution is bound to its store and cannot be modified", () => {
  const value = signReceipt(receipt, secret);
  assert.deepEqual(
    verifyReceipt(value, store, secret, 7, receipt.issuedAt + 1),
    receipt,
  );
  assert.equal(
    verifyReceipt(value, "other-store", secret, 7, receipt.issuedAt + 1),
    null,
  );
  assert.equal(
    verifyReceipt(value, store, "wrong-key", 7, receipt.issuedAt + 1),
    null,
  );
  assert.equal(
    verifyReceipt(value + "x", store, secret, 7, receipt.issuedAt + 1),
    null,
  );
});
test("expired, future and malformed attribution is rejected", () => {
  const value = signReceipt(receipt, secret);
  assert.equal(
    verifyReceipt(value, store, secret, 7, receipt.issuedAt + 7 * 86400000 + 1),
    null,
  );
  assert.equal(
    verifyReceipt(value, store, secret, 7, receipt.issuedAt - 1),
    null,
  );
  for (const input of [undefined, "bad", "a.b.c", ".", "a."])
    assert.equal(verifyReceipt(input, store, secret, 7), null);
});
test("each tenant has its own cookie and canonical product/combos URLs", () => {
  assert.notEqual(cookieName(store), cookieName(receipt.linkId));
  assert.equal(
    destination({ id: store, slug: "demo" }, "product", receipt.linkId),
    `https://perlamarketplace.com/tienda/demo/producto/${receipt.linkId}`,
  );
  assert.equal(
    destination(
      {
        id: store,
        slug: "demo",
        domain: "https://example.com/",
        has_landing: true,
      },
      "combo",
      receipt.linkId,
    ),
    `https://example.com/tienda/combos/${receipt.linkId}`,
  );
  assert.equal(
    destination(
      { id: store, slug: "demo", subdomain: "demo", has_landing: false },
      "store",
      null,
    ),
    "https://demo.perlamarketplace.com",
  );
  assert.equal(
    storefront({ id: store, slug: "demo", domain: "evil.com/path" }).origin,
    "https://perlamarketplace.com",
  );
});
test("social preview crawlers do not receive attribution", () => {
  for (const agent of [
    "facebookexternalhit/1.1",
    "WhatsApp/2.0",
    "TelegramBot",
    "Twitterbot",
    "Googlebot",
  ])
    assert.ok(isPreviewBot(agent));
  assert.equal(isPreviewBot("Mozilla/5.0 Chrome/125.0 Safari/537.36"), false);
});
