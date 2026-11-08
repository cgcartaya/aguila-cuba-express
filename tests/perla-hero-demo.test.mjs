import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(path, deps = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, console, ...globals, require: name => deps[name] ?? require(name) });
  return module.exports;
}
const model = load('components/landing/perla/hero-demo.ts');

test('cart, order amount and stock stay synchronized through a complete demo cycle', () => {
  const initial = model.getDemoFrame(0), cart = model.getDemoFrame(1), order = model.getDemoFrame(2), stock = model.getDemoFrame(3);
  assert.equal(initial.cartTotal, 0); assert.equal(initial.amount, 1280.5);
  assert.equal(cart.cartTotal, 4.5); assert.equal(cart.count, 24);
  assert.equal(order.amount, initial.amount + cart.cartTotal); assert.equal(order.count, initial.count + 1);
  assert.equal(order.inventory, initial.inventory - 1); assert.equal(stock.amount, order.amount);
  assert.equal(model.getDemoFrame(4).scene.id, 'shipping');
  assert.equal(model.getDemoFrame(7).tracking, 'Entregado');
  assert.equal(model.getDemoFrame(8).scene.id, 'restaurant');
  assert.equal(model.getDemoFrame(10).cartTotal, 12);
  assert.equal(model.getDemoFrame(12).scene.id, 'shop');
  assert.equal(model.getDemoFrame(12).cartTotal, 0);
});

function harness(reduced = false) {
  const state = [], effects = [], refs = [], timers = new Map(), preferenceListeners = new Map(), documentListeners = new Map();
  let stateCursor, effectCursor, refCursor, observerCallback, nextTimer = 0;
  const preference = { matches: reduced, addEventListener: (key, fn) => preferenceListeners.set(key, fn), removeEventListener: key => preferenceListeners.delete(key) };
  const document = { hidden: false, addEventListener: (key, fn) => documentListeners.set(key, fn), removeEventListener: key => documentListeners.delete(key) };
  let disconnected = false;
  class IntersectionObserver {
    constructor(callback) { observerCallback = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  }
  const window = { matchMedia: () => preference, setInterval: (fn, ms) => { assert.equal(ms, model.DEMO_TICK_MS); timers.set(++nextTimer, fn); return nextTimer; }, clearInterval: id => timers.delete(id) };
  const react = { ...React,
    useState(initial) { const i = stateCursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef(initial) { const i = refCursor++; return refs[i] ??= { current: initial ?? {} }; },
    useEffect(fn, deps) {
      const i = effectCursor++; const old = effects[i];
      if (!old || deps.some((value, index) => value !== old.deps[index])) effects[i] = { fn, deps, cleanup: old?.cleanup, pending: true };
    },
  };
  const Component = load('components/landing/perla/HeroShowcase.tsx', {
    react, './hero-demo': model,
    'next/image': { __esModule: true, default: ({ unoptimized, priority, ...props }) => React.createElement('img', props) },
    './hero-showcase.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) },
  }, { window, document, IntersectionObserver }).default;
  function render() {
    stateCursor = effectCursor = refCursor = 0;
    const tree = Component();
    for (const effect of effects) if (effect.pending) { effect.cleanup?.(); effect.cleanup = effect.fn(); effect.pending = false; }
    return tree;
  }
  function buttons(tree, result = []) {
    if (Array.isArray(tree)) tree.forEach(child => buttons(child, result));
    else if (tree?.props) { if (tree.type === 'button') result.push(tree.props); buttons(tree.props.children, result); }
    return result;
  }
  return { render, buttons, timers, preference, document,
    inView(value) { observerCallback([{ isIntersecting: value }]); },
    tick() { for (const fn of Array.from(timers.values())) fn(); },
    visibility(value) { document.hidden = value; documentListeners.get('visibilitychange')(); },
    reduced(value) { preference.matches = value; preferenceListeners.get('change')(); },
    cleanup() { effects.forEach(effect => effect.cleanup?.()); return { disconnected, listeners: preferenceListeners.size + documentListeners.size }; },
  };
}

test('one timer drives both devices and stops for pause, hidden tabs and offscreen banners', () => {
  const h = harness(); h.render(); assert.equal(h.timers.size, 0);
  h.inView(true); h.render(); assert.equal(h.timers.size, 1);
  h.tick(); let tree = h.render();
  let html = renderToStaticMarkup(tree);
  assert.match(html, /Producto agregado al carrito/); assert.match(html, /Tu carrito se actualiza/); assert.match(html, /\$4\.50/);
  h.tick(); tree = h.render(); html = renderToStaticMarkup(tree);
  assert.match(html, /Nuevo pedido recibido/); assert.match(html, /aria-label="\$1,285\.00"/);
  h.buttons(tree).find(button => button['aria-label'] === 'Pausar animación del banner').onClick();
  tree = h.render(); assert.equal(h.timers.size, 0);
  h.buttons(tree).find(button => button['aria-label'] === 'Reanudar animación del banner').onClick(); h.render(); assert.equal(h.timers.size, 1);
  h.visibility(true); h.render(); assert.equal(h.timers.size, 0);
  h.visibility(false); h.render(); assert.equal(h.timers.size, 1);
  h.inView(false); h.render(); assert.equal(h.timers.size, 0);
  h.inView(true); h.render(); assert.equal(h.timers.size, 1);
  assert.deepEqual(h.cleanup(), { disconnected: true, listeners: 0 }); assert.equal(h.timers.size, 0);
});

test('reduced motion never autoplays and manual scene controls remain available', () => {
  const h = harness(true); h.render(); h.inView(true); let tree = h.render();
  assert.equal(h.timers.size, 0); assert.match(renderToStaticMarkup(tree), /Movimiento reducido/);
  const tabs = h.buttons(tree).filter(button => 'aria-pressed' in button);
  assert.equal(tabs.length, 3); tabs[1].onClick(); tree = h.render();
  assert.match(renderToStaticMarkup(tree), /Centro de operaciones/);
  assert.equal(h.timers.size, 0);
  h.reduced(false); h.render(); assert.equal(h.timers.size, 1);
  h.reduced(true); h.render(); assert.equal(h.timers.size, 0); h.cleanup();
});

test('demo images are local and the entire set stays below 50 KB', () => {
  const images = new Set(model.demoScenes.flatMap(scene => scene.products.map(item => item.image)));
  assert.equal(images.size, 6);
  let bytes = 0;
  for (const image of images) { assert.match(image, /^\/perla\/demo\/.+\.webp$/); bytes += fs.statSync(`public${image}`).size; }
  assert.ok(bytes < 50 * 1024, `${bytes} bytes`);
});
