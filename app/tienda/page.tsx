"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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

type Product = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  is_active: boolean;
  tag?: string | null;
  created_at?: string;
};

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

const categorias = [
  { nombre: "Electrónicos", icono: Smartphone },
  { nombre: "Hogar", icono: Sofa },
  { nombre: "Alimentos", icono: ShoppingBasket },
  { nombre: "Deportes", icono: Dumbbell },
  { nombre: "Medicinas", icono: Pill },
  { nombre: "Más", icono: Ellipsis },
];

export default function TiendaPage() {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Product[]>([]);
  const { cart, addToCart } = useCart();

  useEffect(() => {
    const cargarProductos = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true);

      if (error) {
        console.log("Error cargando productos:", error);
        return;
      }

      setProductos((data as Product[]) || []);
    };

    cargarProductos();
  }, []);

  const productosBuscados = productos.filter((producto) =>
    producto.name.toLowerCase().includes(busqueda.toLowerCase())
  );

  const cartCount = cart.reduce(
    (total: number, item: { quantity: number }) => total + item.quantity,
    0
  );

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