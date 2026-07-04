"use client";

import Image from "next/image";
import Link from "next/link";
import type { Banner } from "@/components/admin/settings/types";

type Props = {
  banner: Banner;
  priority?: boolean;
};

export default function GeneratedBannerSlide({ banner, priority = false }: Props) {
  const backgroundColor = banner.background_color || "#061b3a";
  const textColor = banner.text_color || "#ffffff";
  const accentColor = banner.accent_color || "#ef4444";

  return (
    <Link
      href={banner.button_link || "/tienda"}
      className="relative block h-[220px] overflow-hidden rounded-3xl shadow-md sm:h-[280px] md:h-[360px] lg:h-[420px]"
      style={{ backgroundColor }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(255,255,255,0.22),transparent_35%)]" />

      <div className="relative z-10 flex h-full items-center justify-between gap-4 p-5 sm:p-8 md:p-10">
        <div className="max-w-[58%]">
          {banner.badge_text && (
            <div
              className="mb-3 inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow"
              style={{ backgroundColor: accentColor }}
            >
              {banner.badge_text}
            </div>
          )}

          <h2
            className="text-3xl font-black leading-tight sm:text-5xl md:text-6xl"
            style={{ color: textColor }}
          >
            {banner.title}
          </h2>

          {banner.subtitle && (
            <p
              className="mt-3 line-clamp-3 text-sm font-semibold sm:text-lg md:text-xl"
              style={{ color: textColor }}
            >
              {banner.subtitle}
            </p>
          )}

          <div
            className="mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg sm:text-base"
            style={{ backgroundColor: accentColor }}
          >
            {banner.button_text || "Ver productos"}
          </div>
        </div>

        {(banner.product_image_url || banner.image_url) && (
          <div className="relative h-[78%] w-[42%]">
            <Image
              src={banner.product_image_url || banner.image_url || "/placeholder-product.png"}
              alt={banner.title || "Banner"}
              fill
              priority={priority}
              sizes="(max-width: 640px) 42vw, (max-width: 1024px) 38vw, 480px"
              className="object-contain drop-shadow-2xl"
            />
          </div>
        )}
      </div>
    </Link>
  );
}