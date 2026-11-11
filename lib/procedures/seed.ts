import type { Configuration } from "./catalog";

const variant = (id: string, title: string, required: string[], conditional: string[] = []) => ({
  id, title,
  requirements: [...required, ...conditional].map((label, index) => ({
    id: `req-${index + 1}`, label, optional: index >= required.length,
  })),
});
const fees = (items: [string, number, string?][]) =>
  items.map(([label, amount, unit = "por trámite"]) => ({ label, amount, unit }));

export const initialCatalog: Record<string, Configuration> = {
  "pasaporte-cubano": {
    title: "Pasaporte cubano",
    description: "Primera vez o renovación desde Estados Unidos. WF Cargo confirma la vía de presentación y el plazo de entrega antes de iniciar.",
    agencyFee: null,
    fees: fees([["Pasaporte de 16 años o más", 200], ["Pasaporte menor de 16 años", 160], ["Impuestos", 5], ["Solicitud por correo", 20], ["Verificación de identidad por agencia", 20]]),
    variants: [
      variant("primera-vez", "Primera vez o reposición", ["Certificación de nacimiento cubana", "Dos planillas consulares", "Dos fotos tipo pasaporte de 4.5 × 4.5 cm", "Datos de contacto para verificación"], ["Otros documentos de identidad disponibles", "Autorización notarial de los padres para menores"]),
      variant("renovacion", "Renovación", ["Copia de la página de datos del pasaporte anterior", "Dos fotos tipo pasaporte de 4.5 × 4.5 cm", "Planilla consular", "Copia de identificación vigente", "Postal Money Order de USPS", "Sobre de retorno prepagado con rastreo"]),
    ],
  },
  "pasaporte-americano": {
    title: "Pasaporte americano",
    description: "Primera solicitud en persona con DS-11 o renovación con DS-82, según elegibilidad.",
    agencyFee: null,
    fees: fees([["Libreta de adulto DS-11", 130], ["Libreta y tarjeta de adulto DS-11", 160], ["Libreta de menor de 16 años DS-11", 100], ["Oficina de aceptación DS-11", 35], ["Renovación de libreta DS-82", 130], ["Servicio expedito", 60], ["Búsqueda de archivo", 150]]),
    variants: [
      variant("ds-11", "Primera vez · DS-11", ["Formulario DS-11 sin firmar", "Prueba de ciudadanía original y copia frente y dorso", "Identificación vigente y copia frente y dorso", "Foto a color de 2 × 2 pulgadas", "Pago al U.S. Department of State", "Pago a la oficina de aceptación"], ["Menores de 16 años: presencia de padres, prueba de parentesco y DS-3053 notarizado si aplica"]),
      variant("ds-82", "Renovación · DS-82", ["Formulario DS-82 firmado", "Pasaporte anterior original", "Foto a color de 2 × 2 pulgadas", "Pago al U.S. Department of State"], ["Documento legal de cambio de nombre"]),
    ],
  },
  apostilla: {
    title: "Apostilla", description: "Documentos emitidos, certificados o notarizados en Florida. WF Cargo confirma el procedimiento según el destino.", agencyFee: null,
    fees: fees([["Documento notarizado o acta de Vital Statistics", 10, "por documento"], ["Copia certificada del Clerk of Circuit Court", 20, "por documento"]]),
    variants: [variant("florida", "Documento de Florida", ["Documento original o copia certificada elegible", "Formulario de apostilla con país de destino", "Cheque o money order", "Sobre de retorno prepagado con rastreo"])],
  },
  notarizacion: {
    title: "Notarización de documentos", description: "Notario público de Florida. Coordina con WF Cargo la presencia de los firmantes y testigos.", agencyFee: null,
    fees: fees([["Acto notarial", 10, "por firma notarizada"]]),
    variants: [variant("florida", "Acto notarial", ["Documento completo y sin firmar", "Identificación vigente de cada firmante", "Disponibilidad de todos los firmantes"], ["Testigos requeridos por el documento", "País de destino definido para uso en el extranjero"])],
  },
  "evisa-cuba": {
    title: "eVisa Cuba", description: "Consulta con WF Cargo si corresponde una visa electrónica según tu pasaporte y viaje.", agencyFee: null,
    fees: fees([["eVisa, importe sujeto a confirmación", 50]]),
    variants: [variant("evisa", "Visa electrónica", ["Pasaporte con vigencia suficiente", "Correo del viajero", "Vuelo y boleto de retorno o continuación", "Dirección de estancia confirmada", "Seguro médico con cobertura en Cuba", "Formulario D’Viajeros"], ["Categoría de viaje autorizada para salida desde Estados Unidos"])],
  },
  "renta-carros": {
    title: "Renta de carros", description: "Las tarifas, depósitos y condiciones dependen del destino y la agencia. Solicita confirmación a WF Cargo.", agencyFee: null, fees: [],
    variants: [variant("reserva", "Solicitud de renta", ["Licencia de conducir vigente", "Medio de pago y depósito a nombre del conductor principal"], ["Pasaporte para licencia extranjera o según destino", "Permiso Internacional de Conducir", "Confirmación de reserva", "Prueba de seguro propio", "Licencia y presencia de conductores adicionales"])],
  },
};
