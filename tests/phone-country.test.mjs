import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, require = () => { throw new Error('Unexpected import'); }) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, require });
  return module.exports;
}
const constants = load('lib/constants/phone-countries.ts');
const { splitPhone, normalizeStoreWhatsapp } = load('lib/utils/store-whatsapp.ts', () => constants);
test('saved and pasted international values split into selector and national number', () => {
  for (const [value, iso, national] of [
    ['18032623676', 'us', '8032623676'], ['+1 (803) 262-3676', 'us', '8032623676'],
    ['0018032623676', 'us', '8032623676'], ['5358731040', 'cu', '58731040'],
    ['+53 5 6880056', 'cu', '56880056'], ['+34 612345678', 'es', '612345678'],
  ]) {
    const parsed = splitPhone(value);
    assert.equal(parsed.country.iso2, iso);
    assert.equal(parsed.nationalNumber, national);
    assert.equal(normalizeStoreWhatsapp(`${parsed.country.dialCode} ${parsed.nationalNumber}`), normalizeStoreWhatsapp(value));
  }
});
test('national input uses selected country and never loses digits', () => {
  for (const country of constants.PHONE_COUNTRIES) {
    const national = '9'.repeat(country.digits);
    const parsed = splitPhone(national, country);
    assert.equal(parsed.country.iso2, country.iso2);
    assert.equal(parsed.nationalNumber, national);
    assert.equal(normalizeStoreWhatsapp(`${country.dialCode} ${national}`), country.dialCode.slice(1) + national);
  }
});
test('Canada selection survives shared +1 prefix; empty values stay empty', () => {
  const canada = constants.findPhoneCountry('ca');
  assert.equal(splitPhone('+18032623676', canada).country.iso2, 'ca');
  assert.equal(splitPhone('', canada).nationalNumber, '');
  assert.equal(normalizeStoreWhatsapp(''), null);
  assert.equal(normalizeStoreWhatsapp('+1 803262'), null);
  assert.equal(normalizeStoreWhatsapp('8032623676'), null);
});
test('controlled field loads, edits, clears and pastes without duplicating prefixes', async () => {
  const jsx = await import('react/jsx-runtime');
  const states = []; let cursor = 0;
  const react = { useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; } };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/checkout/PhoneCountryField.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    module, exports: module.exports, require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return jsx;
      if (name.includes('phone-countries')) return constants;
      if (name.includes('store-whatsapp')) return { splitPhone };
      if (name.includes('FlagIcon')) return { default: () => null };
      throw new Error(name);
    },
  });
  let value = '18032623676';
  function render() {
    cursor = 0;
    const root = module.exports.default({ name: 'whatsapp', value, onChange: (event) => { value = event.target.value; } });
    const found = {};
    function visit(node) { if (!node || typeof node !== 'object') return; if (node.type === 'input' || node.type === 'select') found[node.type] = node.props; const children = node.props?.children; (Array.isArray(children) ? children : [children]).forEach(visit); }
    visit(root); return found;
  }
  assert.equal(render().input.value, '8032623676');
  render().input.onChange({ target: { value: '8032623677' } });
  assert.equal(value, '+1 8032623677');
  render().input.onChange({ target: { value: '' } });
  render().select.onChange({ target: { value: 'cu' } });
  assert.equal(render().select.value, 'cu');
  render().input.onChange({ target: { value: '58731040' } });
  assert.equal(value, '+53 58731040');
  assert.equal(render().input.value, '58731040');
  render().input.onChange({ target: { value: '+1 (803) 262-3676' } });
  assert.equal(render().select.value, 'us');
  assert.equal(value, '+1 8032623676');
  value = '+5358731040';
  assert.equal(render().select.value, 'cu');
  assert.equal(render().input.value, '58731040');
});
