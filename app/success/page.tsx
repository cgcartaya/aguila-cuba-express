// Espejo de app/tienda/success/page.tsx para las tiendas SIN landing
// (ej. DL Racing, Águila), que el middleware reescribe de
// /tienda/success -> /success. Sin este archivo, esas tiendas
// reciben 404 después de completar un pedido.
export { default } from "../tienda/success/page";
