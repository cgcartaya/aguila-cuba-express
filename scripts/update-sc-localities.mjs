// Refresh checked-in reference data; never called by the running application.
import fs from 'node:fs/promises';
const censusVintage = 2026;
const censusSource = `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/${censusVintage}_Gazetteer/${censusVintage}_gaz_place_45.txt`;
const gnisSource = 'https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer';
const supplements = ['Cherry Grove Beach', 'Johns Island', 'Longs', 'Okatie', 'Pritchardville', 'Saint Helena Island', 'Wadmalaw Island'];
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Reference download failed: ${response.status}`);
  return response;
}
function point(name, latitude, longitude, source, sourceId) {
  const lat = Number(latitude), lon = Number(longitude);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < 32 || lat > 35.3 || lon < -83.5 || lon > -78.4) throw new Error(`Invalid SC coordinate: ${name}`);
  return { name, latitude: lat, longitude: lon, source, sourceId: String(sourceId) };
}
const text = await (await download(censusSource)).text();
const lines = text.trim().replace(/^\uFEFF/, '').split(/\r?\n/);
const delimiter = lines[0].includes('|') ? '|' : '\t';
const header = lines.shift().split(delimiter).map(x => x.trim());
const places = lines.map(line => {
  const values = line.split(delimiter).map(x => x.trim());
  const row = Object.fromEntries(header.map((key, i) => [key, values[i]]));
  if (row.USPS !== 'SC') throw new Error('Unexpected state in Census file');
  return point(row.NAME.replace(/ (city|town|CDP)$/, ''), row.INTPTLAT, row.INTPTLONG, 'Census', row.GEOID);
});
if (places.length < 400) throw new Error('Incomplete Census reference file');
const names = new Set(places.map(p => p.name.toLowerCase()));
const where = `state_alpha = 'SC' AND gaz_name IN (${supplements.map(name => `'${name.replaceAll("'", "''")}'`).join(',')})`;
for (const layer of [3, 5]) {
  const query = new URLSearchParams({ where, outFields: 'gaz_id,gaz_name,gaz_featureclass,state_alpha', outSR: '4326', returnGeometry: 'true', f: 'json' });
  const data = await (await download(`${gnisSource}/${layer}/query?${query}`)).json();
  if (data.error || data.exceededTransferLimit) throw new Error('Incomplete GNIS response');
  for (const feature of data.features || []) {
    const a = feature.attributes;
    if (a.state_alpha !== 'SC') throw new Error('Unexpected state in GNIS response');
    const allowed = layer === 3 ? a.gaz_featureclass === 'Populated Place' : a.gaz_name === 'Saint Helena Island' && a.gaz_featureclass === 'Island';
    if (!allowed || !supplements.includes(a.gaz_name) || names.has(a.gaz_name.toLowerCase())) continue;
    const [longitude, latitude] = feature.geometry?.points?.[0] || [];
    places.push(point(a.gaz_name, Number(latitude).toFixed(6), Number(longitude).toFixed(6), 'GNIS', a.gaz_id));
    names.add(a.gaz_name.toLowerCase());
  }
}
for (const name of supplements) if (!names.has(name.toLowerCase())) throw new Error(`Supplement missing: ${name}`);
places.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en'));
const metadata = { retrievedOn: new Date().toISOString().slice(0, 10), censusVintage, censusSource, gnisSource };
await fs.writeFile('lib/geo/data/south-carolina-places.json', JSON.stringify({ ...metadata, places }, null, 2) + '\n');
console.log(`Saved ${places.length} SC reference places; review the diff before committing.`);
