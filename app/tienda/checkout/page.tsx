// Antes: implementación propia y desactualizada del checkout,
// separada de la de /tienda/[slug]/checkout. Causaba bugs que
// solo existían aquí (ej. zonas de entrega que a veces no
// cargaban) porque nadie mantenía las dos copias en paralelo.
//
// Ahora: reexporta el mismo componente que ya usan las demás
// tiendas. Como CheckoutPage no depende del parámetro [slug] de
// la URL (usa el hook useStore() para saber en qué tienda está),
// funciona igual sirviendo esta ruta sin slug — la usa Águila
// en su dominio propio (aguilacubaexpress.com), donde el
// middleware no reescribe nada.
export { default } from "../[slug]/checkout/page";
