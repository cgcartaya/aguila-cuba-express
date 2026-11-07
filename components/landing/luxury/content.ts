export const contact = {
  phone: '(239) 265-7294', tel: '+12392657294', whatsapp: '12392657294',
  email: 'sales@luxurytravelpoint.com', address: '3418 51st St W, Lehigh Acres, FL 33971',
  maps: 'https://www.google.com/maps/search/?api=1&query=3418+51st+St+W+Lehigh+Acres+FL+33971',
};
export const whatsapp = (message: string) => `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
export const destinations = [
  { id: 'caribe', name: 'El Caribe', region: 'Caribe', tag: 'SOL · PLAYA · DESCANSO', image: '/luxury/caribe.webp', alt: 'Playa de arena blanca, palmeras y mar turquesa', text: 'Punta Cana, Cancún y Bahamas. Encuentra tu próxima escapada al sol.', details: ['Opciones de hoteles todo incluido', 'Consulta vuelos y traslados', 'Escapadas en pareja, familia o grupo'] },
  { id: 'italia', name: 'Italia', region: 'Europa', tag: 'CULTURA · GASTRONOMÍA', image: '/luxury/europa.webp', alt: 'Casas de colores sobre la costa de Cinque Terre, Italia', text: 'Ciudades con historia, sabores que enamoran y la belleza del Mediterráneo.', details: ['Consulta circuitos y recorridos', 'Opciones privadas o en grupo', 'Itinerario según tus fechas'] },
  { id: 'grecia', name: 'Grecia', region: 'Europa', tag: 'ISLAS · MEDITERRÁNEO', image: '/luxury/hero.webp', alt: 'Arquitectura blanca y cúpulas azules frente al mar en Santorini', text: 'El azul del Egeo y pueblos que parecen una postal. Déjate inspirar.', details: ['Consulta recorridos por las islas', 'Estancias y experiencias a medida', 'Opciones según temporada'] },
  { id: 'francia', name: 'Francia', region: 'Europa', tag: 'ROMANCE · ARTE · HISTORIA', image: '/luxury/paris.webp', alt: 'Torre Eiffel y paisaje urbano de París', text: 'París y mucho más. Un viaje para disfrutar cada pequeño detalle.', details: ['Consulta estancias y circuitos', 'Viajes en pareja o en grupo', 'Planificación personalizada'] },
  { id: 'cuba', name: 'Cuba', region: 'Cuba', tag: 'REENCUENTROS · VACACIONES', image: '/luxury/cuba.webp', alt: 'Automóvil clásico rosa en una calle de La Habana', text: 'Vuelve a los tuyos o redescubre la isla. Vuelos, hoteles y renta de autos.', details: ['Salidas a consultar desde Fort Myers, Miami y Tampa', 'Hoteles en Cuba', 'Renta de autos mecánicos y automáticos'] },
  { id: 'puertorico', name: 'Puerto Rico', region: 'Caribe', tag: 'MAR · CULTURA · AVENTURA', image: '/luxury/puertorico.webp', alt: 'Olas del océano llegando a una playa', text: 'Días de playa, cultura y nuevas experiencias en el Caribe.', details: ['Consulta vuelos y hoteles', 'Opciones para familias y parejas', 'Experiencias según disponibilidad'] },
];
export type Destination = (typeof destinations)[number];
export const boxes = [
  { size: '12 × 12 × 12', weight: '100 lb', first: 45, repeat: 40 },
  { size: '15 × 15 × 15', weight: '100 lb', first: 70, repeat: 65 },
  { size: '22 × 22 × 22', weight: '110 lb', first: 160, repeat: 150 },
];
export const services = [
  { title: 'Boletos aéreos', text: 'Asistencia para reservar vuelos a Cuba y otros destinos. Consulta rutas, equipaje y opciones de pago.', icon: 'plane' },
  { title: 'Hoteles y renta de autos', text: 'Hoteles en Cuba y el mundo. Autos mecánicos o automáticos para moverte por Cuba.', icon: 'car' },
  { title: 'Reunificación en Punta Cana', text: 'Consulta las opciones de viaje y alojamiento para compartir tiempo con tu familia.', icon: 'family' },
  { title: 'Pasaporte cubano y visas', text: 'Gestión de renovación desde casa. Referencia: adultos $300 y niños $260. Consulta vigencia, requisitos y visas a Cuba.', icon: 'passport' },
  { title: 'Remesas y recargas', text: 'USD en efectivo, MLC y CUP; recargas móviles y de tarjetas Clásica y Bandec. Cargo de referencia: 10%; cabeceras 24 h y resto 48–72 h. Confirma tasa, cargo y plazo.', icon: 'money' },
  { title: 'Documentos y notaría', text: 'Traducción y notarización de documentos. Consulta los requisitos de tu gestión con el equipo.', icon: 'file' },
  { title: 'Preparación de documentos', text: 'Asistencia con documentación de inmigración: residencia, reclamación familiar y permiso de trabajo.', icon: 'folder' },
  { title: 'Taxes y compañías', text: 'Preparación de impuestos, creación de compañías y gestiones de EIN y DOT-MC.', icon: 'business' },
];
export const faqs = [
  ['¿Cómo solicito un viaje?', 'Elige un destino o cuéntanos qué experiencia buscas. Prepararemos una consulta por WhatsApp con tus fechas y viajeros. El equipo te confirma itinerario, precio, inclusiones y disponibilidad antes de reservar.'],
  ['¿Qué incluyen los paquetes turísticos?', 'Depende del programa. Podemos consultar opciones con vuelo, hotel, traslado y excursiones, así como viajes privados o en grupo. Las inclusiones se detallan en tu cotización; no todos los programas incluyen los mismos servicios.'],
  ['¿Puedo organizar un crucero?', 'Sí. Consulta opciones para familias, parejas y grupos, incluido Icon of the Seas. La agencia te informa sobre itinerarios, cabinas, fechas y planes de pago disponibles para tu viaje.'],
  ['¿Cuánto demora un envío a Cuba?', 'Según el resumen de noviembre de 2026: aéreo de 7 a 15 días hábiles; marítimo de 25 a 35 días hábiles; marítimo a Isla de la Juventud, 45 días hábiles. Se cuentan desde la salida del avión o barco. Son estimados sujetos a Aduana y operación del transporte.'],
  ['¿Puedo enviar menos de 15 libras?', 'Sí, pero los envíos por libra tienen un mínimo facturable de 15 lb, tanto por vía aérea como marítima. Puedes usar tu propia caja en los envíos por libra. Las cajas doradas tienen sus propias medidas y tarifas.'],
  ['¿Dónde recogen los paquetes?', 'La recogida es gratis en todo Lehigh Acres. En Fort Myers, Cape Coral, Bonita Springs, Estero, LaBelle y alrededores de Lehigh tiene un cargo de $25. Martes a sábado de 9:00 a. m. a 6:00 p. m.; lunes y domingos según disponibilidad y coordinación previa.'],
  ['¿Puedo contactar fuera del horario de oficina?', 'Sí. Hay atención a distancia por teléfono y WhatsApp las 24 horas, todos los días. La oficina abre de martes a sábado de 9:00 a. m. a 6:00 p. m. y domingos de 10:00 a. m. a 2:00 p. m.; los lunes está cerrada. Toda visita o recepción física de paquetes fuera de horario requiere confirmación previa.'],
];
