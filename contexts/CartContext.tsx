"use client";

/* =========================================================
   CART CONTEXT

   Soporta:
   - Productos
   - Combos
   - Persistencia con localStorage
   - Validación de stock
   - Consulta de cantidad por itemId
========================================================= */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import type { Product, Combo, CartItem } from "@/types/cart";

/* =========================================================
   CONTEXTO DEL CARRITO
========================================================= */

type CartContextType = {
  cart: CartItem[];

  addToCart: (product: Product) => void;
  addComboToCart: (combo: Combo) => void;

  increaseQuantity: (itemId: string) => void;
  decreaseQuantity: (itemId: string) => void;

  removeFromCart: (itemId: string) => void;
  clearCart: () => void;

  /*
    Ahora recibe directamente el ID real del carrito:
    product-123
    combo-456
  */
  getItemQuantity: (itemId: string) => number;
};

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = "aguila-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  /* =========================================================
     CARGAR CARRITO
  ========================================================= */

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);

      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Error cargando carrito:", error);
    } finally {
      setCartLoaded(true);
    }
  }, []);

  /* =========================================================
     GUARDAR CARRITO
  ========================================================= */

  useEffect(() => {
    if (!cartLoaded) return;

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, cartLoaded]);

  /* =========================================================
     AGREGAR PRODUCTO
  ========================================================= */

  const addToCart = (product: Product) => {
    const cartId = `product-${product.id}`;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === cartId);

      if (Number(product.stock || 0) <= 0) {
        return prevCart;
      }

      if (existing) {
        if (existing.quantity >= Number(product.stock)) {
          return prevCart;
        }

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
          name: product.name,
          price: Number(product.price),
          image_url: product.image_url || "/placeholder-product.png",
          quantity: 1,
          type: "product",
          stock: product.stock,
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
      const existing = prevCart.find((item) => item.id === cartId);

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
          image_url: combo.image_url || "/placeholder-product.png",
          quantity: 1,
          type: "combo",
        },
      ];
    });
  };

  /* =========================================================
     OBTENER CANTIDAD POR ID DEL CARRITO
  ========================================================= */

  const getItemQuantity = (itemId: string) => {
    const item = cart.find((item) => item.id === itemId);

    return item?.quantity || 0;
  };

  /* =========================================================
     AUMENTAR CANTIDAD
  ========================================================= */

  const increaseQuantity = (itemId: string) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === itemId && item.type === "product") {
          const maxStock = Number(item.stock || 999999);

          if (item.quantity >= maxStock) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity + 1,
          };
        }

        if (item.id === itemId && item.type === "combo") {
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
        .map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  /* =========================================================
     ELIMINAR PRODUCTO / COMBO
  ========================================================= */

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
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

/* =========================================================
   HOOK DEL CARRITO
========================================================= */

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }

  return context;
}