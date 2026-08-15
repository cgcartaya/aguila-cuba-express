import { notFound } from "next/navigation";

import { getReservationByCancelToken } from "@/lib/services/reservas-public";
import CancelReservationClient from "@/components/reservas/CancelReservationClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function CancelarReservaPage({ params }: PageProps) {
  const { token } = await params;
  const reservation = await getReservationByCancelToken(token);

  if (!reservation) {
    notFound();
  }

  return <CancelReservationClient token={token} reservation={reservation} />;
}
