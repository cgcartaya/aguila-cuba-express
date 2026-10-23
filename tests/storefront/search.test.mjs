import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports });
  return module.exports;
}

const { searchProducts, productMatchesSearch, normalizeSearchText } = load('lib/utils/search.ts');
const { getStorefrontSearchPath } = load('lib/storefront/search-navigation.ts');
// Regression from the actual storefront: recipe copy used to outrank meat.
const catalog = [
  { id: 'pasta', name: 'Espagueti Doğa de Sémola de Trigo Duro', category: 'Alimentos', description: 'Ideal para acompañar con carne, pollo o mariscos.' },
  { id: 'mayo', name: 'Mayonesa Findy – Frasco de 500 g', category: 'Alimentos', description: 'Ideal para ensaladas, hamburguesas y carnes.' },
  { id: 'spice', name: 'Comino en Grano Badia 1 oz', category: 'Sazones', description: 'Ideal para sazonar carnes.' },
  { id: 'beef', name: 'Bola de Res de 1 KG', category: 'Carnicería ', description: '' },
  { id: 'pork', name: 'Bandeja de Bistec de Cerdo 2.10 libras', category: 'Carnicería ', description: '' },
  { id: 'mince', name: 'Picadillo de Res 1 KG', category: 'Carnicería ', description: '' },
];

test('carne finds meat categories without matching pasta, mayonnaise or spices', () => {
  for (const query of ['carne', 'carnes', 'cárnicos', 'CARNICERÍA']) {
    assert.deepEqual(Array.from(searchProducts(catalog, query), p => p.id), ['beef', 'pork', 'mince']);
  }
});

test('all meaningful words must match, across name and category', () => {
  assert.deepEqual(Array.from(searchProducts(catalog, 'carne de res'), p => p.id), ['beef', 'mince']);
  assert.equal(searchProducts(catalog, 'carne de pollo').length, 0);
  assert.equal(searchProducts(catalog, 'res cerdo').length, 0);
});

test('meat search includes poultry categories, not chicken-flavoured soup', () => {
  assert.equal(productMatchesSearch({ name: 'Muslos', category: 'Pollo' }, 'carne'), true);
  assert.equal(productMatchesSearch({ name: 'Sopa instantánea de pollo', category: 'Alimentos' }, 'carne'), false);
  assert.equal(productMatchesSearch({ name: 'Sazón para carnes', category: 'Sazones' }, 'pollo'), false);
});

test('accents, punctuation, repeated whitespace, word prefixes and units normalize', () => {
  assert.equal(normalizeSearchText('  CAFÉ\t 500g '), 'cafe 500 g');
  assert.equal(productMatchesSearch({ name: 'Café molido 500 g' }, 'cafe 500g'), true);
  assert.equal(productMatchesSearch({ name: 'Bistec de Res' }, 'bis'), true);
  assert.equal(productMatchesSearch({ name: 'Bistec de Res' }, 'iste'), false);
  assert.equal(productMatchesSearch({ name: 'Pollo', category: 'Cárnicos' }, 'carne\n pollo'), true);
});

test('singular/plural match without broad description searches', () => {
  assert.equal(productMatchesSearch({ name: 'Cartón de huevos' }, 'huevo'), true);
  assert.equal(productMatchesSearch({ name: 'Limón' }, 'limones'), true);
  assert.equal(productMatchesSearch({ name: 'Tomate' }, 'tomates'), true);
  assert.equal(productMatchesSearch({ name: 'Queso', category: 'Lácteos' }, 'lacteos'), true);
});

test('exact and title matches outrank category matches with stable ordering', () => {
  const products = [{ id: 1, name: 'Molida de res', category: 'Carne' }, { id: 2, name: 'Carne picada', category: 'Alimentos' }, { id: 3, name: 'Carne', category: 'Alimentos' }];
  assert.deepEqual(Array.from(searchProducts(products, 'carne'), p => p.id), [3, 2, 1]);
  assert.equal(products[0].id, 1, 'ranking must not mutate the catalog');
});

test('empty query preserves catalog; punctuation and unrelated queries have no matches', () => {
  assert.equal(searchProducts(catalog, '   '), catalog);
  assert.equal(searchProducts(catalog, '!!!').length, 0);
  assert.equal(searchProducts(catalog, 'televisor').length, 0);
  assert.equal(productMatchesSearch({ name: null, category: null }, 'carne'), false);
});

test('typing a brand still finds it in the product name', () => {
  assert.deepEqual(Array.from(searchProducts(catalog, 'findy'), p => p.id), ['mayo']);
});

test('global search submits to the same store from categories, products and checkout', () => {
  for (const child of ['categorias/Carnicer%C3%ADa', 'producto/123', 'combos', 'cart', 'checkout', 'productos-destacados']) {
    assert.equal(getStorefrontSearchPath(`/tienda/${child}`), '/tienda');
    assert.equal(getStorefrontSearchPath(`/tienda/combos-martinez/${child}`), '/tienda/combos-martinez');
  }
  assert.equal(getStorefrontSearchPath('/tienda'), '/tienda');
  assert.equal(getStorefrontSearchPath('/tienda/aguila/'), '/tienda/aguila');
});
