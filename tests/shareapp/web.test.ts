import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { pwaManifest, serviceWorker } from "../../lib/shareapp/pwa";
import {
  itemAvailable,
  type CatalogItem,
} from "../../lib/shareapp/workspace-types";
test("manifest installs only the ShareAPP section", () => {
  const origin = "https://example.com";
  const start = new URL(pwaManifest.start_url, origin);
  const scope = new URL(pwaManifest.scope, origin);
  assert.equal(start.origin, scope.origin);
  assert.ok(
    start.pathname === scope.pathname ||
      start.pathname.startsWith(scope.pathname + "/"),
  );
  assert.equal(pwaManifest.display, "standalone");
  assert.ok(pwaManifest.icons.some((icon) => icon.purpose === "maskable"));
});
test("service worker never caches or intercepts private APIs and falls back to a public offline page", async () => {
  const listeners: Record<string, (event: unknown) => void> = {};
  const precached: string[] = [];
  const deleted: string[] = [];
  let failNetwork = false;
  vm.runInNewContext(serviceWorker, {
    URL,
    Promise,
    self: {
      location: { origin: "https://example.com" },
      addEventListener: (type: string, listener: (event: unknown) => void) =>
        (listeners[type] = listener),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => ({
        addAll: async (urls: string[]) => precached.push(...urls),
      }),
      keys: async () => [
        "shareapp-public-old",
        "another-app-cache",
        "shareapp-public-v1",
      ],
      delete: async (key: string) => {
        deleted.push(key);
      },
      match: async (url: string) => ({ offline: true, url }),
    },
    fetch: async () => {
      if (failNetwork) throw Error("offline");
      return { network: true };
    },
  });
  let work: Promise<unknown> | undefined;
  listeners.install({
    waitUntil: (promise: Promise<unknown>) => (work = promise),
  });
  await work;
  assert.ok(precached.includes("/shareapp/offline.html"));
  assert.ok(precached.every((url) => url.startsWith("/shareapp/")));
  listeners.activate({
    waitUntil: (promise: Promise<unknown>) => (work = promise),
  });
  await work;
  assert.deepEqual(deleted, ["shareapp-public-old"]);
  for (const [path, method, mode] of [
    ["/api/shareapp/me", "GET", "cors"],
    ["/api/shareapp/password", "POST", "cors"],
    ["/admin", "GET", "navigate"],
    ["https://auth.example.com/token", "GET", "cors"],
    ["/gestoresmalicious", "GET", "navigate"],
  ]) {
    let intercepted = false;
    listeners.fetch({
      request: { url: new URL(path, "https://example.com").href, method, mode },
      respondWith: () => (intercepted = true),
    });
    assert.equal(intercepted, false, path);
  }
  let response: Promise<unknown> | undefined;
  const event = {
    request: {
      url: "https://example.com/gestores",
      method: "GET",
      mode: "navigate",
    },
    respondWith: (promise: Promise<unknown>) => (response = promise),
  };
  listeners.fetch(event);
  assert.deepEqual(await response, { network: true });
  failNetwork = true;
  listeners.fetch(event);
  assert.deepEqual(await response, {
    offline: true,
    url: "/shareapp/offline.html",
  });
});
test("combo availability aggregates repeated components", () => {
  const product = {
    id: "same",
    store_id: "store",
    stock: 5,
    is_active: true,
    deleted_at: null,
  };
  const item = {
    combo_items: [
      { quantity: 3, products: product },
      { quantity: 3, products: product },
    ],
  } as CatalogItem;
  assert.equal(itemAvailable(item, "store", "combo"), false);
  item.combo_items![1].quantity = 2;
  assert.equal(itemAvailable(item, "store", "combo"), true);
  assert.equal(itemAvailable(item, "other-store", "combo"), false);
});

test("drafts keep their catalogue photo and saved previews use the gestor media route", async () => {
  const { newDraft, publicationImage } =
    await import("../../lib/shareapp/workspace-types");
  const draft = newDraft({
    id: "p",
    name: "Cerveza",
    price: 13,
    description: "",
    image_url: "",
    product_images: [
      { image_url: "https://example.com/photo.jpg", is_main: true },
    ],
  });
  assert.equal(draft.imageUrl, "https://example.com/photo.jpg");
  const code = "a".repeat(48);
  assert.equal(
    publicationImage(`https://www.example.com/r/${code}`),
    `/r/${code}/image`,
  );
  assert.equal(publicationImage("https://example.com/other"), null);
  assert.equal(publicationImage("invalid"), null);
});
