// Reexporta el mismo componente de éxito para tiendas SIN landing
// resueltas por subdominio (ej. DL Racing). El middleware reescribe
// /success -> /tienda/[slug]/success para esas tiendas; sin este
// archivo, esa reescritura no tenía a dónde apuntar y devolvía 404.
export { default } from "../../success/page";
