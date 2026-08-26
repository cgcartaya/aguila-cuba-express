"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

import { useStore } from "@/hooks/useStore";
import type { Product, Combo, CartItem } from "@/types/cart";
import {
  getPlatformFeePercent,
  getPurchaseQuantityLimit,
  getUnitPriceForQuantity,
  normalizeQuantityPriceTiers,
} from "@/lib/storefront/product-quantity-pricing";
import { trackMetaAddToCart } from "@/lib/analytics/meta-pixel";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { supabase } from "@/lib/supabase";

type CartContextType = {
  cart: CartItem[];

  addToCart: (product: Product, quantity?: number) => void;
  addComboToCart: (combo: Combo) => void;

  increaseQuantity: (itemId: string) => void;
  decreaseQuantity: (itemId: string) => void;

  removeFromCart: (itemId: string) => void;
  clearCart: () => void;

  getItemQuantity: (itemId: string) => number;
  syncInventory: (
    updates: Array<{ productId: string; stock: number }>
  ) => void;
  inventoryNotice: string;
  clearInventoryNotice: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { store } = useStore();

  const feePercent = getPlatformFeePercent(store);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [inventoryNotice, setInventoryNotice] = useState("");

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
            tiers,
            feePercent
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
  }, [cartStorageKey, feePercent]);

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

  const syncInventory = useCallback(
    (updates: Array<{ productId: string; stock: number }>) => {
      if (updates.length === 0) return;

      const stockByProduct = new Map(
        updates.map((update) => [
          `product-${update.productId}`,
          Math.max(0, Math.trunc(Number(update.stock || 0))),
        ])
      );

      let notice = "";

      setCart((current) =>
        current
          .map((item) => {
            if (item.type !== "product" || !stockByProduct.has(item.id)) {
              return item;
            }

            const liveStock = stockByProduct.get(item.id)!;
            if (liveStock <= 0) {
              notice = `${item.name} se agotó y fue retirado de tu carrito.`;
              return null;
            }

            if (item.quantity > liveStock) {
              notice = `La cantidad de ${item.name} se ajustó a ${liveStock} por disponibilidad.`;
              return { ...item, stock: liveStock, quantity: liveStock };
            }

            return { ...item, stock: liveStock };
          })
          .filter((item): item is CartItem => item !== null)
      );

      if (notice) setInventoryNotice(notice);
    },
    []
  );

  const clearInventoryNotice = useCallback(() => {
    setInventoryNotice("");
  }, []);

  // Sincroniza el stock al recuperar un carrito antiguo del navegador.
  useEffect(() => {
    if (!cartLoaded || !store?.id) return;

    const productIds = cart
      .filter((item) => item.type === "product")
      .map((item) => item.id.replace("product-", ""));

    if (productIds.length === 0) return;

    void supabase
      .from("products")
      .select("id, stock")
      .eq("store_id", store.id)
      .in("id", productIds)
      .then(({ data }) => {
        syncInventory(
          (data || []).map((product) => ({
            productId: String(product.id),
            stock: Number(product.stock || 0),
          }))
        );
      });
    // Se ejecuta cuando termina de cargar el carrito de esta tienda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartLoaded, cartStorageKey, store?.id, syncInventory]);

  // Actualización visual en tiempo real. No reserva productos: solo refleja
  // cambios ya confirmados en la base de datos. La autoridad final sigue
  // siendo reserve_product_inventory al crear la orden.
  useEffect(() => {
    if (!store?.id) return;

    const channel = supabase
      .channel(`storefront-stock-${store.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `store_id=eq.${store.id}`,
        },
        (payload) => {
          const product = payload.new as { id?: string; stock?: number };
          if (!product.id) return;
          syncInventory([
            {
              productId: String(product.id),
              stock: Number(product.stock || 0),
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [store?.id, syncInventory]);

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

    const currentQuantity =
      cart.find((item) => item.id === cartId)?.quantity || 0;
    const quantityToAdd = Math.max(1, Math.floor(Number(requestedQuantity || 1)));
    const trackedQuantity = Math.max(
      0,
      Math.min(maxAllowed, currentQuantity + quantityToAdd) - currentQuantity
    );
    const trackedUnitPrice = getUnitPriceForQuantity(
      basePrice,
      currentQuantity + trackedQuantity,
      tiers,
      feePercent
    );

    if (trackedQuantity > 0) {
      trackMetaAddToCart(product, trackedQuantity, trackedUnitPrice);
      if (store?.id) {
        trackAnalyticsEvent({
          storeId: store.id,
          eventName: "add_to_cart",
          productId: String(product.id),
          itemName: product.name,
          quantity: trackedQuantity,
          value: trackedUnitPrice * trackedQuantity,
        });
      }
    }

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
          tiers,
          feePercent
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

    if (store?.id) {
      trackAnalyticsEvent({
        storeId: store.id,
        eventName: "add_to_cart",
        comboId: combo.id,
        itemName: combo.name,
        quantity: 1,
        value: Number(combo.price),
      });
    }

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
              item.product_price_tiers,
              feePercent
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
              item.product_price_tiers,
              feePercent
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
        syncInventory,
        inventoryNotice,
        clearInventoryNotice,
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
