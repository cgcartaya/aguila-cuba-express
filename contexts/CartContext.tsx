"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

import { useStore } from "@/hooks/useStore";
import type { Product, Combo, CartItem } from "@/types/cart";
import {
  getPurchaseQuantityLimit,
  getUnitPriceForQuantity,
  normalizeQuantityPriceTiers,
} from "@/lib/storefront/product-quantity-pricing";

type CartContextType = {
  cart: CartItem[];

  addToCart: (product: Product, quantity?: number) => void;
  addComboToCart: (combo: Combo) => void;

  increaseQuantity: (itemId: string) => void;
  decreaseQuantity: (itemId: string) => void;

  removeFromCart: (itemId: string) => void;
  clearCart: () => void;

  getItemQuantity: (itemId: string) => number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { store } = useStore();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  const cartStorageKey = useMemo(() => {
    const isAguilaStore = store?.slug === "aguila";

    return store?.slug && !isAguilaStore
      ? `cart-${store.slug}`
      : "cart-aguila";
  }, [store?.slug]);

  /* =========================================================
     CARGAR CARRITO SEGÚN TIENDA
  ========================================================= */

  useEffect(() => {
    try {
      setCartLoaded(false);

      const savedCart = localStorage.getItem(cartStorageKey);

      if (!savedCart) {
        setCart([]);
        return;
      }

      const parsed = JSON.parse(savedCart) as CartItem[];

      const normalizedCart = parsed.map((item) => {
        const basePrice = Number(
          item.base_price ?? item.price ?? 0
        );

        if (item.type !== "product") {
          return {
            ...item,
            base_price: basePrice,
          };
        }

        const tiers = normalizeQuantityPriceTiers(
          item.product_price_tiers
        );

        return {
          ...item,
          base_price: basePrice,
          product_price_tiers: tiers,
          price: getUnitPriceForQuantity(
            basePrice,
            item.quantity,
            tiers
          ),
        };
      });

      setCart(normalizedCart);
    } catch (error) {
      console.error("Error cargando carrito:", error);
      setCart([]);
    } finally {
      setCartLoaded(true);
    }
  }, [cartStorageKey]);

  /* =========================================================
     GUARDAR CARRITO SEGÚN TIENDA
  ========================================================= */

  useEffect(() => {
    if (!cartLoaded) return;

    localStorage.setItem(
      cartStorageKey,
      JSON.stringify(cart)
    );
  }, [cart, cartLoaded, cartStorageKey]);

  /* =========================================================
     AGREGAR PRODUCTO
  ========================================================= */

  const addToCart = (
    product: Product,
    requestedQuantity = 1
  ) => {
    const cartId = `product-${product.id}`;
    const basePrice = Number(product.price || 0);

    const tiers = normalizeQuantityPriceTiers(
      product.product_price_tiers
    );

    const maxAllowed = getPurchaseQuantityLimit({
      stock: product.stock,
      maxQuantityPerOrder:
        product.max_quantity_per_order,
    });

    setCart((prevCart) => {
      const existing = prevCart.find(
        (item) => item.id === cartId
      );

      if (maxAllowed <= 0) {
        return prevCart;
      }

      const currentQuantity =
        existing?.quantity || 0;

      const quantityToAdd = Math.max(
        1,
        Math.floor(Number(requestedQuantity || 1))
      );

      const newQuantity = Math.min(
        maxAllowed,
        currentQuantity + quantityToAdd
      );

      if (newQuantity <= currentQuantity) {
        return prevCart;
      }

      const effectivePrice =
        getUnitPriceForQuantity(
          basePrice,
          newQuantity,
          tiers
        );

      if (existing) {
        return prevCart.map((item) =>
          item.id === cartId
            ? {
                ...item,
                quantity: newQuantity,
                base_price: basePrice,
                price: effectivePrice,
                stock:
                  product.stock == null
                    ? undefined
                    : Number(product.stock),
                max_quantity_per_order:
                  product.max_quantity_per_order ?? null,
                product_price_tiers: tiers,
                minimum_order_exempt:
                  product.minimum_order_exempt ?? null,
                delivery_included:
                  product.delivery_included ?? null,
              }
            : item
        );
      }

      return [
        ...prevCart,
        {
          id: cartId,
          name: product.name,
          price: effectivePrice,
          base_price: basePrice,
          image_url:
            product.image_url ||
            "/placeholder-product.png",
          quantity: newQuantity,
          type: "product",
          stock:
            product.stock == null
              ? undefined
              : Number(product.stock),
          max_quantity_per_order:
            product.max_quantity_per_order ?? null,
          product_price_tiers: tiers,
          minimum_order_exempt:
            product.minimum_order_exempt ?? null,
          delivery_included:
            product.delivery_included ?? null,
        },
      ];
    });
  };

  /* =========================================================
     AGREGAR COMBO
  ========================================================= */

  const addComboToCart = (combo: Combo) => {
    const cartId = `combo-${combo.id}`;

    setCart((prevCart) => {
      const existing = prevCart.find(
        (item) => item.id === cartId
      );

      if (existing) {
        return prevCart.map((item) =>
          item.id === cartId
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...prevCart,
        {
          id: cartId,
          name: combo.name,
          price: Number(combo.price),
          base_price: Number(combo.price),
          image_url:
            combo.image_url ||
            "/placeholder-product.png",
          quantity: 1,
          type: "combo",
        },
      ];
    });
  };

  /* =========================================================
     OBTENER CANTIDAD
  ========================================================= */

  const getItemQuantity = (itemId: string) => {
    const item = cart.find(
      (item) => item.id === itemId
    );

    return item?.quantity || 0;
  };

  /* =========================================================
     AUMENTAR CANTIDAD
  ========================================================= */

  const increaseQuantity = (itemId: string) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (
          item.id === itemId &&
          item.type === "product"
        ) {
          const maxAllowed =
            getPurchaseQuantityLimit({
              stock: item.stock,
              maxQuantityPerOrder:
                item.max_quantity_per_order,
            });

          if (item.quantity >= maxAllowed) {
            return item;
          }

          const newQuantity =
            item.quantity + 1;

          const basePrice = Number(
            item.base_price ?? item.price
          );

          return {
            ...item,
            quantity: newQuantity,
            price: getUnitPriceForQuantity(
              basePrice,
              newQuantity,
              item.product_price_tiers
            ),
          };
        }

        if (
          item.id === itemId &&
          item.type === "combo"
        ) {
          return {
            ...item,
            quantity: item.quantity + 1,
          };
        }

        return item;
      })
    );
  };

  /* =========================================================
     DISMINUIR CANTIDAD
  ========================================================= */

  const decreaseQuantity = (itemId: string) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          const newQuantity =
            item.quantity - 1;

          if (
            item.type !== "product" ||
            newQuantity <= 0
          ) {
            return {
              ...item,
              quantity: newQuantity,
            };
          }

          const basePrice = Number(
            item.base_price ?? item.price
          );

          return {
            ...item,
            quantity: newQuantity,
            price: getUnitPriceForQuantity(
              basePrice,
              newQuantity,
              item.product_price_tiers
            ),
          };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  /* =========================================================
     ELIMINAR ITEM
  ========================================================= */

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) => item.id !== itemId
      )
    );
  };

  /* =========================================================
     LIMPIAR CARRITO
  ========================================================= */

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        addComboToCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart debe usarse dentro de CartProvider"
    );
  }

  return context;
}
