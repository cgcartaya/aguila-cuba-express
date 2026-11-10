import { emptyDeparture, emptyTravelContent, type TravelContent } from './types';

const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const plain = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const dateString = (year: number, month: number, day: number) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
export type TravelImport = { content: TravelContent; warnings: string[] };

/** Conservative extraction. The complete source remains available for review. */
export function travelDraftFromText(text: string, filename: string): TravelImport {
  const content = emptyTravelContent();
  const warnings = ['Revisa fechas, tarifas por ocupación, inclusiones y condiciones antes de publicar.'];
  const clean = text.replace(/\r/g, '').replace(/\u0000/g, '').trim();
  content.source_text = clean.slice(0, 150000);
  content.title = filename.replace(/\.pdf$/i, '').replace(/^(?:ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*(?:DEL?\s*)?\d{1,2}\s*AL\s*\d{1,2}\s*(?:ABRIL)?\s*[-–]?\s*/i, '').replace(/\s+pdf$/i, '').trim().slice(0, 200);
  const lines = clean.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const first = plain(lines.slice(0, 65).join(' '));
  const year = Number(first.match(/\b(20\d{2})\b/)?.[1]);
  const range = first.match(/(?:del?\s+)?(\d{1,2})\s*(?:de\s+)?(?:([a-z]+)\s+)?al\s+(\d{1,2})\s*(?:de\s+)?([a-z]+)\s*(?:de\s+)?(20\d{2})/);
  const departure = emptyDeparture();
  if (range) {
    const endMonth = months.indexOf(range[4]);
    const startMonth = range[2] ? months.indexOf(range[2]) : endMonth;
    if (endMonth >= 0 && startMonth >= 0) {
      const endYear = Number(range[5]);
      departure.start = dateString(endYear - Number(startMonth > endMonth), startMonth + 1, Number(range[1]));
      departure.end = dateString(endYear, endMonth + 1, Number(range[3]));
      const days = Math.round((Date.parse(departure.end) - Date.parse(departure.start)) / 86400000) + 1;
      if (days > 0 && days <= 365) content.days = days;
    }
  }
  if (!departure.start) {
    warnings.push('No se identificó una fecha completa con seguridad. Completa salida y regreso.');
    if (!year) warnings.push('El año del viaje requiere confirmación.');
  }
  const fileRange = plain(filename).match(/^(\w+)\s+del?\s+(\d{1,2})\s+al\s+(\d{1,2})/);
  if (fileRange && departure.start && (Number(departure.start.slice(8)) !== Number(fileRange[2]) || Number(departure.end.slice(8)) !== Number(fileRange[3]))) warnings.push('La fecha del nombre del archivo difiere de la fecha del documento. Confirma cuál es correcta.');
  const countryNames = ['Japón','China','Corea del Sur','España','Francia','Italia','Portugal','Grecia','Turquía','Egipto','Sudáfrica','Marruecos','Perú','Tailandia','Austria','Hungría','República Checa','Suiza','Emiratos Árabes Unidos','Estados Unidos','Cuba'];
  content.countries = countryNames.filter(country => plain(content.title + ' ' + lines.slice(0, 35).join(' ')).includes(plain(country)));
  if (/dubai|abu dhabi/.test(first) && !content.countries.includes('Emiratos Árabes Unidos')) content.countries.push('Emiratos Árabes Unidos');
  const nights = first.match(/(\d{1,2})\s+noches/);
  if (nights) content.nights = Number(nights[1]);
  let section: 'includes' | 'excludes' | 'conditions' | 'itinerary' | 'other' = 'other';
  let currentDay: { number: number; title: string; description: string } | null = null;
  const dayRows: { number: number; title: string; description: string }[] = [];
  for (const line of lines) {
    const normalized = plain(line);
    if (/^el (paquete|precio) incluye|^incluye:/.test(normalized)) { section = 'includes'; currentDay = null; continue; }
    if (/^el precio no incluye|^no incluye:/.test(normalized)) { section = 'excludes'; currentDay = null; continue; }
    if (/^politicas|^a tomar en cuenta|^terminos y condiciones|^condiciones de viaje/.test(normalized)) { section = 'conditions'; currentDay = null; }
    if (/expertos en grupos|mas de 25 anos|viajando junto|^\d{1,2}$/.test(normalized)) continue;
    const day = normalized.match(/^dia\s+(\d{1,3})\b(.*)/);
    if (day) {
      section = 'itinerary';
      currentDay = { number: Number(day[1]), title: `Día ${day[1]}${day[2].trim() ? ' · ' + line.slice(line.toLowerCase().indexOf(day[1]) + day[1].length).trim() : ''}`, description: '' };
      dayRows.push(currentDay);
      continue;
    }
    if (currentDay && section === 'itinerary') currentDay.description += (currentDay.description ? '\n' : '') + line;
    else if (section === 'includes' || section === 'excludes') content[section].push(line);
    else if (section === 'conditions') content.conditions += (content.conditions ? '\n' : '') + line;
  }
  content.itinerary = dayRows.sort((a, b) => a.number - b.number).map(({ title, description }) => ({ title, description }));
  // Only assign amounts explicitly adjacent to their occupancy label.
  // Other amounts can refer to children, supplements, tips or deposits.
  const labeledRates = [...clean.matchAll(/(?:^|\n)\s*(TRIPLE|DOBLE|SIMPLE|SENCILLA|INDIVIDUAL)[ \t]*\$[ \t]*([\d,]+(?:\.\d{2})?)/gi)];
  departure.rates = labeledRates.map(match => ({ label: /^simple|sencilla|individual$/i.test(match[1]) ? 'Individual' : /^doble$/i.test(match[1]) ? 'Doble' : 'Triple', amount: Number(match[2].replace(/,/g, '')) }));
  if (!departure.rates.length) warnings.push('Las tarifas no se asignaron automáticamente. Confirma los importes y su ocupación.');
  content.departures = [departure];
  content.review_notes = warnings;
  content.description = content.title;
  if (!content.itinerary.length) warnings.push('No se separó el itinerario por días. Puedes editarlo y consultar el texto original.');
  if (clean.length < 100) warnings.push('El PDF parece escaneado o contiene poco texto. Completa los datos manualmente usando el documento original.');
  return { content, warnings };
}
