// Local, deterministic demonstration. These figures are not customer activity.
export const DEMO_TICK_MS = 2600;
export const TICKS_PER_SCENE = 4;
export const demoScenes = [
  {
    id: "shop", label: "Tienda online", subtitle: "Productos que se convierten en pedidos",
    title: "Catálogo de productos", phoneTitle: "Tu tienda", currency: true,
    products: [
      { name: "Galletas de mantequilla", short: "Galletas", image: "/perla/demo/galletas.webp", price: 4.5 },
      { name: "Olla eléctrica", short: "Olla eléctrica", image: "/perla/demo/olla.webp", price: 35 },
      { name: "Estación de energía", short: "Energía portátil", image: "/perla/demo/energia.webp", price: 650 },
    ],
  },
  {
    id: "shipping", label: "Envíos", subtitle: "Cada paquete, en el lugar correcto",
    title: "Centro de operaciones", phoneTitle: "Tu envío", currency: true,
    products: [],
  },
  {
    id: "restaurant", label: "Restaurante", subtitle: "Del menú a la mesa de tus clientes",
    title: "Menú digital", phoneTitle: "Tu restaurante", currency: true,
    products: [
      { name: "Especial de la casa", short: "Especial del día", image: "/perla/demo/especial.webp", price: 12 },
      { name: "Desayuno completo", short: "Desayuno", image: "/perla/demo/desayuno.webp", price: 8 },
      { name: "Pan artesanal", short: "Pan artesanal", image: "/perla/demo/pan.webp", price: 4 },
    ],
  },
] as const;

export const DEMO_TOTAL_TICKS = TICKS_PER_SCENE * demoScenes.length;

export function getDemoFrame(tick: number) {
  const safeTick = ((tick % DEMO_TOTAL_TICKS) + DEMO_TOTAL_TICKS) % DEMO_TOTAL_TICKS;
  const sceneIndex = Math.floor(safeTick / TICKS_PER_SCENE);
  const phase = safeTick % TICKS_PER_SCENE;
  const scene = demoScenes[sceneIndex];
  const shipping = scene.id === "shipping";
  const confirmed = phase >= 2;
  const cartTotal = !shipping && phase > 0 ? scene.products[0]!.price : 0;
  const amount = shipping ? 960 + (phase === 3 ? 25 : 0) : 1280.5 + (confirmed ? cartTotal : 0);
  const count = shipping ? 18 + (phase === 3 ? 1 : 0) : 24 + (confirmed ? 1 : 0);
  const events = shipping
    ? ["Paquete recibido en agencia", "Salida registrada", "En reparto con el cliente", "Entrega confirmada"]
    : ["Catálogo listo para comprar", "Producto agregado al carrito", "Nuevo pedido recibido", "Inventario actualizado"];
  return {
    scene, sceneIndex, phase, confirmed, cartTotal, amount, count,
    inventory: 128 - (confirmed ? 1 : 0),
    event: events[phase],
    tracking: ["En agencia", "En tránsito", "En reparto", "Entregado"][phase],
  };
}
