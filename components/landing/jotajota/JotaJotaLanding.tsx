"use client";

import { anton, caveat, jakarta } from "./fonts";
import JotaJotaNavbar from "./JotaJotaNavbar";
import JotaJotaHero from "./JotaJotaHero";
import JotaJotaQuickNav from "./JotaJotaQuickNav";
import JotaJotaFeaturedDishes, { type FeaturedDish } from "./JotaJotaFeaturedDishes";
import JotaJotaCTA from "./JotaJotaCTA";
import JotaJotaFooter from "./JotaJotaFooter";
import { MENU_URL, RESERVAS_URL } from "./constants";

export default function JotaJotaLanding({
  menuHref,
  featuredDishes = [],
  reservasHref,
}: {
  menuHref?: string;
  featuredDishes?: FeaturedDish[];
  reservasHref?: string;
}) {
  const resolvedMenuHref = menuHref ?? MENU_URL;
  const resolvedReservasHref = reservasHref ?? RESERVAS_URL;

  return (
    <main
      className={`${anton.variable} ${jakarta.variable} ${caveat.variable} min-h-screen bg-[#0B0A08]`}
      style={{ fontFamily: "var(--font-jj-body)" }}
    >
      <JotaJotaNavbar menuHref={menuHref} reservasHref={resolvedReservasHref} />
      <JotaJotaHero menuHref={resolvedMenuHref} reservasHref={resolvedReservasHref} />
      <JotaJotaQuickNav showTienda={false} />
      <JotaJotaFeaturedDishes dishes={featuredDishes} menuHref={menuHref} />
      <JotaJotaCTA reservasHref={resolvedReservasHref} />
      <JotaJotaFooter reservasHref={resolvedReservasHref} />
    </main>
  );
}
