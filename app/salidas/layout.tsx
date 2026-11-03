import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Próximas salidas",
  description: "Consulta las próximas salidas y fechas de envío hacia Cuba.",
};

export default function SalidasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
