"use client";

import { useState } from "react";
import {
  processOrderInventory,
  validateOrderStock,
} from "@/lib/services/inventory";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Package,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    state: "",
    zip_code: "",
    country: "USA",
    notes: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const getOriginalId = (cartId: string) => {
    return cartId.replace("product-", "").replace("combo-", "");
  };

  const handleSubmit = async () => {
    setError("");

    if (cart.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }

    if (!form.name || !form.email || !form.phone || !form.address || !form.city) {
      setError("Completa los campos obligatorios.");
      return;
    }

    try {
      setLoading(true);

      let customer = null;

      const { data: existingCustomer, error: existingCustomerError } =
        await supabase
          .from("customers")
          .select("*")
          .eq("email", form.email)
          .maybeSingle();

      if (existingCustomerError) throw existingCustomerError;

      if (existingCustomer) {
        customer = existingCustomer;

        const { error: updateCustomerError } = await supabase
          .from("customers")
          .update({
            name: form.name,
            phone: form.phone,
            city: form.city,
          })
          .eq("id", existingCustomer.id);

        if (updateCustomerError) throw updateCustomerError;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: form.name,
            email: form.email,
            phone: form.phone,
            city: form.city,
          })
          .select()
          .single();

        if (customerError) throw customerError;

        customer = newCustomer;
      }

      const orderItemsBase = cart.map((item) => {
        const originalId = getOriginalId(item.id);

        return {
          item_type: item.type,
          product_id: item.type === "product" ? originalId : null,
          combo_id: item.type === "combo" ? originalId : null,
          product_name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
          subtotal: Number(item.price) * item.quantity,
        };
      });

      await validateOrderStock(orderItemsBase);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customer.id,
          total,
          status: "pending",
          address: form.address,
          state: form.state,
          zip_code: form.zip_code,
          country: form.country,
          notes: form.notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = orderItemsBase.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await processOrderInventory(orderItems);

      clearCart();
      router.push(`/tienda/success?order=${order.id}`);
    } catch (err: any) {
      console.error("ERROR CHECKOUT:", err);
      setError(err?.message || "Ocurrió un error al crear la orden.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link
          href="/tienda/cart"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver al carrito
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                Información del cliente
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <input name="name" placeholder="Nombre completo *" value={form.name} onChange={handleChange} className="rounded-xl border px-4 py-3 outline-none focus:border-black" />
                <input name="email" type="email" placeholder="Email *" value={form.email} onChange={handleChange} className="rounded-xl border px-4 py-3 outline-none focus:border-black" />
                <input name="phone" placeholder="Teléfono *" value={form.phone} onChange={handleChange} className="rounded-xl border px-4 py-3 outline-none focus:border-black" />
                <input name="city" placeholder="Ciudad *" value={form.city} onChange={handleChange} className="rounded-xl border px-4 py-3 outline-none focus:border-black" />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                Dirección de entrega
              </h2>

              <div className="grid gap-4">
                <input name="address" placeholder="Dirección *" value={form.address} onChange={handleChange} className="rounded-xl border px-4 py-3 outline-none focus:border-black" />

                <div className="grid gap-4 md:grid-cols-3">
                  <input name="state" placeholder="Estado" value={form.state} onChange={handleChange} className="rounded-xl border px-4 py-3 outline-none focus:border-black" />
                  <input name="zip_code" placeholder="ZIP Code" value={form.zip_code} onChange={handleChange} className="rounded-xl border px-4 py-3 outline-none focus:border-black" />
                  <input name="country" placeholder="País" value={form.country} onChange={handleChange} className="rounded-xl border px-4 py-3 outline-none focus:border-black" />
                </div>

                <textarea name="notes" placeholder="Notas adicionales" value={form.notes} onChange={handleChange} rows={4} className="rounded-xl border px-4 py-3 outline-none focus:border-black" />
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Resumen de pedido
            </h2>

            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <span
                      className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${
                        item.type === "combo"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.type === "combo" ? <Package size={11} /> : <ShoppingBag size={11} />}
                      {item.type === "combo" ? "Combo" : "Producto"}
                    </span>

                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-gray-500">Cantidad: {item.quantity}</p>
                  </div>

                  <p className="font-semibold">
                    ${(Number(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="my-5 border-t" />

            <div className="mb-5 flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 font-bold text-white disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creando orden...
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  Continuar al pago con tarjeta
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-gray-500">
              Por ahora se crea la orden. El próximo paso será Stripe.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}