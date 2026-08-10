// Reexporta el mismo componente de "pago confirmado" para tiendas
// resueltas por subdominio o dominio propio. El middleware reescribe
// /tienda/pago-exitoso -> /tienda/[slug]/pago-exitoso para esas tiendas;
// sin este archivo, esa reescritura no tenía a dónde apuntar y devolvía
// 404 (mismo patrón que ya resuelve /tienda/[slug]/success).
export { default } from "../../pago-exitoso/page";
