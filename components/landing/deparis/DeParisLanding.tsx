"use client";

import { Bodoni_Moda, Manrope, Parisienne } from "next/font/google";

import DeParisNavbar from "./DeParisNavbar";
import DeParisHero from "./DeParisHero";
import DeParisDualWorlds from "./DeParisDualWorlds";
import DeParisMenuHighlights from "./DeParisMenuHighlights";
import DeParisFeaturedDishes, { type FeaturedDish } from "./DeParisFeaturedDishes";
import DeParisFeatures from "./DeParisFeatures";
import DeParisCTA from "./DeParisCTA";
import DeParisFooter from "./DeParisFooter";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-dp-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-dp-body",
  display: "swap",
});

const parisienne = Parisienne({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dp-script",
  display: "swap",
});

export default function DeParisLanding({
  menuHref,
  featuredDishes = [],
}: {
  menuHref?: string;
  featuredDishes?: FeaturedDish[];
}) {
  return (
    <main
      className={`${bodoni.variable} ${manrope.variable} ${parisienne.variable} min-h-screen bg-[#FFF4D6]`}
      style={{ fontFamily: "var(--font-dp-body)" }}
    >
      <DeParisNavbar menuHref={menuHref} />
      <DeParisHero />
      <DeParisDualWorlds />
      <DeParisFeaturedDishes dishes={featuredDishes} menuHref={menuHref} />
      <DeParisMenuHighlights menuHref={menuHref} />
      <DeParisFeatures />
      <DeParisCTA />
      <DeParisFooter />
    </main>
  );
}
