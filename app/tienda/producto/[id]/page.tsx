"use client";

/* =========================================================
   IMPORTS
========================================================= */

import Image from "next/image";
import { use, useEffect, useState } from "react";
import { X } from "lucide-react";

import ProductHeader from "@/components/tienda/product-detail/ProductHeader";
import ProductGallery from "@/components/tienda/product-detail/ProductGallery";
import ProductInfo from "@/components/tienda/product-detail/ProductInfo";
import RelatedProducts from "@/components/tienda/product-detail/RelatedProducts";

import {
  getStoreProductById,
  getRelatedProducts,
} from "@/lib/services/products";

import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types/cart";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   PRODUCT DETAIL PAGE
========================================================= */

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { cart, addToCart } = useCart();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  /* =========================================================
     CART COUNT
  ========================================================= */

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  /* =========================================================
     LOAD PRODUCT
  ========================================================= */

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
          .sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0)
          ) || [];

      const mainImage =
        orderedImages.find((img) => img.is_main) ||
        orderedImages[0];

      setProduct(productData);

      setSelectedImage(
        mainImage?.image_url ||
          productData.image_url ||
          "/placeholder-product.png"
      );

      if (productData.category) {
        const { data: relatedData } = await getRelatedProducts(
          productData.category,
          productData.id
        );

        setRelatedProducts((relatedData as Product[]) || []);
      }
    }

    loadProduct();
  }, [id]);

  /* =========================================================
     LOADING STATE
  ========================================================= */

  if (!product) {
    return (
      <main className="min-h-screen bg-white text-[#061b3a]">
        <ProductHeader cartCount={cartCount} />

        <div className="px-4 py-10">
          <p className="text-center text-sm text-slate-500">
            Cargando producto...
          </p>
        </div>
      </main>
    );
  }

  /* =========================================================
     PRODUCT IMAGES
  ========================================================= */

  const productImages =
    product.product_images
      ?.slice()
      .sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0)
      ) || [];

  const imagesToShow =
    productImages.length > 0
      ? productImages
      : [
          {
            id: "fallback",
            image_url:
              product.image_url || "/placeholder-product.png",
            is_main: true,
            position: 0,
          },
        ];

  /* =========================================================
     ADD TO CART
  ========================================================= */

  const handleAddToCart = () => {
    if (Number(product.stock) <= 0) return;

    for (let i = 0; i < quantity; i++) {
      addToCart({
        ...product,
        image_url:
          selectedImage ||
          product.image_url ||
          "/placeholder-product.png",
      });
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-white pb-24 text-[#061b3a]">
      <ProductHeader cartCount={cartCount} />

      <div className="mx-auto max-w-6xl px-4 py-5">
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

        <RelatedProducts products={relatedProducts} />
      </div>

      {/* MODAL DE ZOOM */}

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