"use client";

/* =========================================================
   ANIMATED BANNER IMAGE

   Animación flotante pronunciada para imágenes del banner.
========================================================= */

import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
};

export default function AnimatedBannerImage({
  src,
  alt,
  priority = false,
  className = "",
}: Props) {
  return (
    <div
      className={`
        ${className}
        animate-banner-float
      `}
    >
      <Image
        src={src}
        alt={alt}
        width={850}
        height={520}
        priority={priority}
        className="h-auto w-full object-contain"
      />

      <style jsx global>{`
        @keyframes bannerFloat {
          0% {
            transform: translateY(0px) rotate(0deg);
          }

          25% {
            transform: translateY(-12px) rotate(2deg);
          }

          50% {
            transform: translateY(-22px) rotate(0deg);
          }

          75% {
            transform: translateY(-12px) rotate(-2deg);
          }

          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }

        .animate-banner-float {
          animation: bannerFloat 4s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>
    </div>
  );
}