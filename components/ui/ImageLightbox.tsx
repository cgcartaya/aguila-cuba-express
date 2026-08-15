"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
};

/**
 * Visor de foto simple: solo la imagen más grande sobre fondo oscuro,
 * nada más. Pensado para internet lento (Cuba) — no trae ninguna
 * librería nueva, el tamaño de imagen se limita a max-w-lg (no carga
 * una versión "full hero"), y calidad moderada (70) para que pese
 * poco sin verse pixelada. Se cierra tocando afuera, la X, o Escape.
 */
export default function ImageLightbox({ src, alt, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X size={20} />
      </button>

      <div
        className="relative h-[70vh] w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 512px"
          quality={70}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
