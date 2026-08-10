"use client";

/* =========================================================
   ANIMATED FLAG

   Bandera animada mediante CSS puro.

   Animación:
   - Movimiento suave.
   - Muy ligera.
   - No afecta el rendimiento.
========================================================= */

import Image from "next/image";

type Props = {
  className?: string;
};

export default function AnimatedFlag({
  className = "",
}: Props) {
  return (
    <>
      <div className={`flag-wave ${className}`}>
        <Image
          src="/bandera-cuba.png"
          alt="Bandera de Cuba"
          width={500}
          height={320}
          priority
          className="h-auto w-full object-contain"
        />
      </div>

      <style jsx>{`
        .flag-wave {
          transform-origin: left center;
          animation: waveFlag 4s ease-in-out infinite;
        }

        @keyframes waveFlag {
          0% {
            transform: rotate(0deg) translateY(0px);
          }

          25% {
            transform: rotate(1.2deg) translateY(-2px);
          }

          50% {
            transform: rotate(0deg) translateY(0px);
          }

          75% {
            transform: rotate(-1.2deg) translateY(2px);
          }

          100% {
            transform: rotate(0deg) translateY(0px);
          }
        }
      `}</style>
    </>
  );
}