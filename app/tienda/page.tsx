"use client";

/* ==========================
   IMPORTS
========================== */

import { useEffect, useState } from "react";
import { getStoreProducts } from "@/lib/services/products";

import Header from "@/components/tienda/Header";
import MainBanner from "@/components/tienda/MainBanner";
import Categories from "@/components/tienda/Categories";
import ProductSearch from "@/components/tienda/ProductSearch";
import ProductsCarousel from "@/components/tienda/ProductsCarousel";
import DeliveryBanner from "@/components/tienda/DeliveryBanner";
import OffersCarousel from "@/components/tienda/OffersCarousel";
import HelpCard from "@/components/tienda/HelpCard";
import BottomNavigation from "@/components/tienda/BottomNavigation";

import {
  Smartphone,
  Sofa,
  ShoppingBasket,
  Dumbbell,
  Pill,
  Ellipsis,
} from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types/cart";

/* ==========================
   TIPOS - IMÁGENES DE PRODUCTO
========================== */

type ProductImage = {
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type ProductFromSupabase = Product & {
  product_images?: ProductImage[];
};

/* ==========================
   DATA TEMPORAL - OFERTAS
========================== */

const ofertas = [
  {
    nombre: "Controlador solar",
    precioAntes: "150.00",
    precio: "120.00",
    descuento: "-20%",
    imagen: "/products/electrical/controlador-solar-1000w.webp",
  },
  {
    nombre: "Combo de alimentos",
    precioAntes: "25.00",
    precio: "18.00",
    descuento: "-15%",
    imagen: "/products/food/chocolisto-sabor-fresa.webp",
  },
  {
    nombre: "Ibuprofeno 200mg",
    precioAntes: "12.00",
    precio: "10.00",
    descuento: "-10%",
    imagen: "/products/medicines/ibuprofeno200.webp",
  },
];

/* ==========================
   DATA TEMPORAL - CATEGORÍAS
========================== */

const categorias = [
  { nombre: "Electrónicos", icono: Smartphone },
  { nombre: "Hogar", icono: Sofa },
  { nombre: "Alimentos", icono: ShoppingBasket },
  { nombre: "Deportes", icono: Dumbbell },
  { nombre: "Medicinas", icono: Pill },
  { nombre: "Más", icono: Ellipsis },
];

/* ==========================
   PÁGINA PRINCIPAL - TIENDA
========================== */

export default function TiendaPage() {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Product[]>([]);

  const { cart, addToCart } = useCart();

  /* ==========================
     PRODUCTOS - CARGA DESDE SUPABASE
  ========================== */

  useEffect(() => {
const cargarProductos = async () => {
  const { data, error } = await getStoreProducts();

  if (error) {
    console.log("Error cargando productos:", error);
    return;
  }

  /*
    TIENDA PÚBLICA - TRANSFORMACIÓN DE IMÁGENES

    El servicio devuelve el producto con la relación:
    product_images

    Buscamos:
    1. La imagen marcada como principal.
    2. Si no existe, la primera por posición.
    3. Si no tiene imágenes nuevas, usamos image_url antiguo.
  */

  const productosConImagenPrincipal =
    (data as ProductFromSupabase[])?.map((producto) => {
      const imagenPrincipal =
        producto.product_images?.find((img) => img.is_main) ||
        producto.product_images
          ?.slice()
          .sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0)
          )[0];

      return {
        ...producto,
        image_url: imagenPrincipal?.image_url || producto.image_url,
      };
    }) || [];

  setProductos(productosConImagenPrincipal);
};

    cargarProductos();
  }, []);

  /* ==========================
     PRODUCTOS - BÚSQUEDA LOCAL
  ========================== */

  const productosBuscados = productos.filter((producto) =>
    producto.name.toLowerCase().includes(busqueda.toLowerCase())
  );

  /* ==========================
     CARRITO - CONTADOR GLOBAL
  ========================== */

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  /* ==========================
     RENDER
  ========================== */

  return (
    <main className="min-h-screen bg-white pb-24 text-[#061b3a]">
      <Header cartCount={cartCount} />

      <div className="mx-auto max-w-7xl px-4">
        <MainBanner />

        <Categories categorias={categorias} />

        <ProductSearch busqueda={busqueda} setBusqueda={setBusqueda} />

        <ProductsCarousel
          productos={productosBuscados}
          agregarAlCarrito={addToCart}
        />

        <DeliveryBanner />

        <OffersCarousel ofertas={ofertas} />

        <HelpCard />
      </div>

      <BottomNavigation />
    </main>
  );
}