"use client";

import { useState } from "react";
import UpcomingPickupRoutes from "@/components/pickups/UpcomingPickupRoutes";
import YoyoNavbar from "@/components/landing/yoyo/YoyoNavbar";
import YoyoHero from "@/components/landing/yoyo/YoyoHero";
import { FinalSections, PickupSection, QuoteSection, ServicesSection, TrackingSection } from "@/components/landing/yoyo/YoyoBrandSections";
import YoyoFooter from "@/components/landing/yoyo/YoyoFooter";

export default function YoyoLanding() {
  const [trackingCode, setTrackingCode] = useState("");
  return <main className="min-h-screen bg-[#f6f8fc] text-slate-950"><YoyoNavbar/><YoyoHero/><UpcomingPickupRoutes storeSlug="yoyo-envios"/><ServicesSection/><QuoteSection/><TrackingSection trackingCode={trackingCode} setTrackingCode={setTrackingCode}/><PickupSection/><FinalSections/><YoyoFooter/></main>;
}
