"use client";

import { motion } from "framer-motion";

type Props = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  /** Segundos antes de empezar (para encadenar después de otro elemento). */
  startDelay?: number;
  /** Segundos entre palabra y palabra. */
  stagger?: number;
};

/**
 * Revela un titular grande palabra por palabra (cada una entra
 * deslizándose desde abajo de su propia "ranura" recortada). Es el
 * mismo framer-motion que ya usa el resto de la landing — no agrega
 * ninguna librería nueva ni pesa nada extra en la red (es puro CSS
 * transform/opacity, no imágenes).
 */
export default function RevealText({ text, className, style, startDelay = 0, stagger = 0.045 }: Props) {
  const words = text.split(" ");

  return (
    <span className={className} style={style}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "115%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{
              duration: 0.6,
              ease: [0.2, 0.8, 0.2, 1],
              delay: startDelay + i * stagger,
            }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
