import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/pickups/itinerary.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, Date, Intl, Set });
const { validateItinerary, localDate, validRouteDate, itineraryCities, timeWindow } = module.exports;
const group = (cities, start = null, end = null) => ({ cities, start_time: start, end_time: end });

test('Monday poster retains grouped cities and their shared hours in printed order', () => {
  const groups = [group(['Conway'], '08:00', '09:00'), group(['North Myrtle Beach', 'Little River'], '09:30', '11:30'), group(['Myrtle Beach'], '12:00', '14:00'), group(['Surfside Beach', 'Murrells Inlet'], '14:30', '16:30')];
  const parsed = validateItinerary(groups);
  assert.equal(JSON.stringify(itineraryCities(parsed)), JSON.stringify(['Conway','North Myrtle Beach','Little River','Myrtle Beach','Surfside Beach','Murrells Inlet']));
  assert.equal(parsed[1].start_time, '09:30');
  assert.equal(timeWindow(parsed[3].start_time, parsed[3].end_time), '2:30 PM – 4:30 PM');
});
test('routes need cities but do not need customer requests or hours', () => {
  assert.equal(validateItinerary([group(['Georgetown']), group(['Charleston'])]).length, 2);
  assert.equal(timeWindow(null, null), 'Horario por coordinar');
});
test('rejects impossible, duplicate and conflicting itinerary data', () => {
  for (const input of [[], [group([''])], [group(['Greenville']),group([' greenville '])], [group(['X'],'25:00','26:00')], [group(['X'],'08:00',null)], [group(['X'],'09:00','08:00')], [group(['X'],'08:00','10:00'),group(['Y'],'09:00','11:00')]]) assert.throws(() => validateItinerary(input));
});
test('date validation catches rollover and uses South Carolina day at UTC midnight', () => {
  assert.equal(validRouteDate('2026-02-30'), false);
  assert.equal(validRouteDate('2026-10-24'), true);
  assert.equal(localDate('America/New_York', new Date('2026-10-24T02:00:00Z')), '2026-10-23');
});
