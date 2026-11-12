export const dmcHost = 'luxury-travel-point.perlamarketplace.com';
export const sections = ['mice-events', 'our-services', 'destinations'] as const;
export type Section = typeof sections[number];
export type Locale = 'en' | 'es';
type Copy = readonly [english: string, spanish: string];

export function localized(copy: Copy, locale: Locale) {
  return copy[locale === 'es' ? 1 : 0];
}

export const pages: Record<Section, {
  label: Copy;
  title: Copy;
  description: Copy;
  image: string;
  features: readonly (readonly [Copy, Copy])[];
}> = {
  'mice-events': {
    label: ['MICE & Events', 'MICE y eventos'],
    title: ['Exceptional Events. Seamless Experiences.', 'Eventos excepcionales. Experiencias sin contratiempos.'],
    description: ['Meetings, incentives, conferences and exhibitions across the United States.', 'Reuniones, incentivos, congresos y exposiciones en Estados Unidos.'],
    image: '/luxury/nyc.webp',
    features: [
      [['Meetings & Conferences', 'Reuniones y congresos'], ['Venue selection and logistics for meetings, conventions and exhibitions.', 'Selección de sedes y logística para reuniones, convenciones y exposiciones.']],
      [['Incentive Travel', 'Viajes de incentivo'], ['Custom itineraries and exclusive group experiences for corporate rewards.', 'Itinerarios a medida y experiencias exclusivas para programas de incentivos.']],
      [['Gala Dinners & Special Events', 'Cenas de gala y eventos especiales'], ['Themed celebrations, private venues and VIP hospitality.', 'Celebraciones temáticas, espacios privados y hospitalidad VIP.']],
      [['Team Building', 'Actividades de equipo'], ['Corporate retreats and activities tailored to the group.', 'Retiros corporativos y actividades adaptadas al grupo.']],
      [['VIP Transportation', 'Transporte VIP'], ['Airport assistance, private transfers and group transportation coordination.', 'Asistencia en aeropuertos, traslados privados y coordinación de transporte grupal.']],
      [['Event Management', 'Gestión de eventos'], ['Planning, supplier coordination and on-site operational support.', 'Planificación, coordinación de proveedores y apoyo operativo en destino.']],
    ],
  },
  'our-services': {
    label: ['Our Services', 'Nuestros servicios'],
    title: ['Comprehensive Destination Management Services', 'Servicios integrales de gestión de destinos'],
    description: ['Tailor-made travel programs and premium incoming services throughout the United States.', 'Programas de viaje a medida y servicios receptivos premium en Estados Unidos.'],
    image: '/luxury/miami.webp',
    features: [
      [['Accommodation & Travel Planning', 'Alojamiento y planificación'], ['Selected hotels and resorts, private itineraries and multi-destination tours for groups and independent travelers.', 'Hoteles y resorts seleccionados, itinerarios privados y circuitos para grupos y viajeros independientes.']],
      [['Transportation & VIP Services', 'Transporte y servicios VIP'], ['Airport assistance, private transfers and coordination by motorcoach, train or domestic flight.', 'Asistencia aeroportuaria, traslados privados y coordinación por autobús, tren o vuelo nacional.']],
      [['Tours & Unique Experiences', 'Excursiones y experiencias únicas'], ['Guided cultural and culinary tours, private boat excursions and programs for major sporting events.', 'Visitas culturales y gastronómicas, excursiones privadas en barco y programas para grandes eventos deportivos.']],
      [['MICE & Corporate Events', 'MICE y eventos corporativos'], ['Meetings, incentive travel, conventions, gala dinners and corporate hospitality.', 'Reuniones, viajes de incentivo, convenciones, cenas de gala y hospitalidad corporativa.']],
      [['Destination Management & Operational Support', 'Gestión de destinos y apoyo operativo'], ['Custom proposals, supplier coordination and dedicated assistance throughout contracted programs.', 'Propuestas a medida, coordinación de proveedores y asistencia durante los programas contratados.']],
    ],
  },
  destinations: {
    label: ['Destinations', 'Destinos'],
    title: ['Explore the United States', 'Explora Estados Unidos'],
    description: ['Explore destinations for private travel, groups and corporate events.', 'Explora destinos para viajes privados, grupos y eventos corporativos.'],
    image: '/luxury/vegas.webp',
    features: [],
  },
};
