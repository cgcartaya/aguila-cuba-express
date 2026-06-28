"use client";

/* =========================================================
   PRODUCT DETAIL PAGE
   El Header y BottomNavigation son manejados por:
   app/tienda/layout.tsx
========================================================= */

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, X } from "lucide-react";

import ProductGallery from "@/components/tienda/product-detail/ProductGallery";
import ProductInfo from "@/components/tienda/product-detail/ProductInfo";
import RelatedProducts from "@/components/tienda/product-detail/RelatedProducts";

import {
  getStoreProductById,
  getRelatedProducts,
} from "@/lib/services/products";

import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types/cart";

type ProductImage = {
  id: string;
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type StoreProduct = Product & {
  product_images?: ProductImage[];
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { addToCart } = useCart();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      const { data, error } = await getStoreProductById(id);

      if (error || !data) {
        console.error("Error cargando producto:", error);
        return;
      }

      const productData = data as StoreProduct;

      const orderedImages =
        productData.product_images
          ?.slice()
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) || [];

      const mainImage =
        orderedImages.find((img) => img.is_main) || orderedImages[0];

      setProduct(productData);

      setSelectedImage(
        mainImage?.image_url ||
          productData.image_url ||
          "/placeholder-product.png"
      );

      if (productData.category) {
        const { data: relatedData } = await getRelatedProducts(
          productData.category,
          String(productData.id)
        );

        setRelatedProducts((relatedData as Product[]) || []);
      }
    }

    loadProduct();
  }, [id]);

  if (!product) {
    return (
      <div className="px-4 py-10">
        <p className="text-center text-sm text-slate-500">
          Cargando producto...
        </p>
      </div>
    );
  }

  const productImages =
    product.product_images
      ?.slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) || [];

  const imagesToShow =
    productImages.length > 0
      ? productImages
      : [
          {
            id: "fallback",
            image_url: product.image_url || "/placeholder-product.png",
            is_main: true,
            position: 0,
          },
        ];

  const handleAddToCart = () => {
    if (Number(product.stock) <= 0) return;

    for (let i = 0; i < quantity; i++) {
      addToCart({
        ...product,
        image_url:
          selectedImage || product.image_url || "/placeholder-product.png",
      });
    }
  };

  return (
    <main className="min-h-screen bg-white pb-24 text-[#061b3a]">
      <div className="mx-auto max-w-6xl px-4 py-5">
        {/* BOTÓN VOLVER A TIENDA */}
        <div className="mb-5">
          <Link
            href="/tienda"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#061b3a] shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md"
          >
            <ArrowLeft size={18} />
            Volver a tienda
          </Link>
        </div>

        {/* INFORMACIÓN PRINCIPAL DEL PRODUCTO */}
        <div className="grid gap-8 md:grid-cols-2">
          <ProductGallery
            productName={product.name}
            selectedImage={selectedImage}
            images={imagesToShow}
            onSelectImage={setSelectedImage}
            onOpenZoom={() => setIsZoomOpen(true)}
          />

          <ProductInfo
            name={product.name}
            price={Number(product.price)}
            description={product.description}
            tag={product.tag}
            stock={Number(product.stock)}
            quantity={quantity}
            setQuantity={setQuantity}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* PRODUCTOS RELACIONADOS */}
        <RelatedProducts products={relatedProducts} />
      </div>

      {isZoomOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white p-3 text-black"
          >
            <X size={22} />
          </button>

          <div className="relative h-[80vh] w-full max-w-4xl">
            <Image
              src={selectedImage || "/placeholder-product.png"}
              alt={product.name}
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}