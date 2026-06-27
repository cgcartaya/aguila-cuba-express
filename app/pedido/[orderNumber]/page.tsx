/* =========================================================
   SERVER - PÁGINA PÚBLICA DE PEDIDO

   Este archivo queda como Server Component para poder usar
   generateMetadata y que WhatsApp muestre una tarjeta bonita
   con og-order.png.
========================================================= */

import type { Metadata } from "next";
import { PublicOrderClient } from "./PublicOrderClient";

type PageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { orderNumber } = await params;

  const title = `Pedido ${orderNumber} | Águila Cuba Express`;
  const description =
    "Consulta el estado de tu pedido en Águila Cuba Express.";

  return {
    title,
    description,

    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: "/og-order.png",
          width: 1200,
          height: 630,
          alt: "Águila Cuba Express - Seguimiento de Pedido",
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-order.png"],
    },
  };
}

export default async function PublicOrderPage({ params }: PageProps) {
  const { orderNumber } = await params;

  return <PublicOrderClient orderNumber={orderNumber} />;
}