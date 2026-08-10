/* =========================================================
   ICONOS AUTOMÁTICOS DE CATEGORÍAS

   El administrador NO tiene que escribir el icono.
   El sistema asigna uno automáticamente según el nombre.
========================================================= */

export function getCategoryIcon(categoryName: string) {
  const name = categoryName.toLowerCase();

  if (
    name.includes("alimento") ||
    name.includes("comida") ||
    name.includes("despensa")
  ) {
    return "ShoppingBasket";
  }

  if (
    name.includes("electr") ||
    name.includes("telefono") ||
    name.includes("teléfono") ||
    name.includes("celular")
  ) {
    return "Plug";
  }

  if (
    name.includes("medicina") ||
    name.includes("farmacia") ||
    name.includes("salud")
  ) {
    return "Pill";
  }

  if (
    name.includes("hogar") ||
    name.includes("casa")
  ) {
    return "Home";
  }

  if (
    name.includes("ropa") ||
    name.includes("zapato") ||
    name.includes("calzado")
  ) {
    return "Shirt";
  }

  if (
    name.includes("aseo") ||
    name.includes("limpieza")
  ) {
    return "Sparkles";
  }

  if (
    name.includes("mascota") ||
    name.includes("perro") ||
    name.includes("gato")
  ) {
    return "PawPrint";
  }

  if (
    name.includes("bebida") ||
    name.includes("refresco") ||
    name.includes("jugo")
  ) {
    return "CupSoda";
  }

  if (
    name.includes("carne") ||
    name.includes("carnicer")
  ) {
    return "Beef";
  }

  return "Grid3X3";
}