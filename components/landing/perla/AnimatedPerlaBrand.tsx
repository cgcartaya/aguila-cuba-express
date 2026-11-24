"use client";

import Link from "next/link";
import { useId } from "react";
import styles from "./animated-perla-brand.module.css";

/**
 * Logo exclusivo de la landing de Perla.
 * SVG vectorial transparente: sin vídeos, sin GIF y sin imágenes con fondo.
 * El icono, los circuitos, la perla y el nombre se revelan una sola vez.
 */
export default function AnimatedPerlaBrand({
  animate = false,
}: {
  animate?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <Link
      href="/"
      aria-label="Perla Marketplace — Inicio"
      className={`${styles.brand} ${animate ? styles.animated : styles.static}`}
    >
      <span className={styles.symbol} aria-hidden="true">
        <svg viewBox="0 0 160 150" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`${id}-shell-fill`} x1="24" y1="12" x2="141" y2="137" gradientUnits="userSpaceOnUse">
              <stop stopColor="#093565" />
              <stop offset=".49" stopColor="#035875" />
              <stop offset="1" stopColor="#13C8BF" />
            </linearGradient>
            <linearGradient id={`${id}-shell-stroke`} x1="15" y1="42" x2="144" y2="140" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4BDEFF"/>
              <stop offset=".55" stopColor="#2DFAE3"/>
              <stop offset="1" stopColor="#CBFFF4"/>
            </linearGradient>
            <radialGradient id={`${id}-pearl-fill`} cx="0" cy="0" r="1" gradientTransform="translate(61 81) rotate(49) scale(68)">
              <stop stopColor="#FFF"/>
              <stop offset=".33" stopColor="#D8F6FF"/>
              <stop offset=".72" stopColor="#99C9E5"/>
              <stop offset="1" stopColor="#47C8C3"/>
            </radialGradient>
          </defs>

          <g className={styles.shell}>
            <path
              d="M80 17C67 4 50 13 48 27C33 20 19 31 22 45C6 48 6 67 19 77C11 93 28 113 49 111L80 124L111 111C132 113 149 93 141 77C154 67 154 48 138 45C141 31 127 20 112 27C110 13 93 4 80 17Z"
              fill={`url(#${id}-shell-fill)`} stroke={`url(#${id}-shell-stroke)`} strokeWidth="3.3" strokeLinejoin="round"
            />
            <path d="M80 17V118M48 27L76 118M22 45L71 119M112 27L84 118M138 45L89 119" stroke="#4EDAE6" strokeWidth="1.8" opacity=".38"/>
            <path d="M18 109C39 119 54 120 80 120C106 120 121 119 142 109C139 134 116 145 80 145C44 145 21 134 18 109Z"
              fill="#057D89" stroke={`url(#${id}-shell-stroke)`} strokeWidth="3" />
            <path d="M18 109C42 125 118 125 142 109" stroke="#B3FFF1" strokeWidth="3" strokeLinecap="round" />
          </g>

          <g className={styles.circuits} stroke="#51FDE7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path className={styles.trace} d="M80 85V28" />
            <path className={styles.trace} d="M65 90V62L46 42" />
            <path className={styles.trace} d="M95 90V62L114 42" />
            <path className={styles.trace} d="M53 87L34 70V56" />
            <path className={styles.trace} d="M107 87L126 70V56" />
            {[ [80,28],[46,42],[114,42],[34,56],[126,56] ].map(([cx,cy])=>
              <circle key={`${cx}-${cy}`} className={styles.node} cx={cx} cy={cy} r="4.2" fill="#071F3D" stroke="#64FFEC" strokeWidth="2.6" />
            )}
          </g>

          <g className={styles.pearl}>
            <circle cx="80" cy="106" r="30" fill={`url(#${id}-pearl-fill)`} stroke="#E5FFF9" strokeWidth="2.1"/>
            <ellipse cx="69" cy="93" rx="12" ry="7" fill="#FFF" opacity=".47" transform="rotate(-34 69 93)"/>
            <circle cx="69" cy="87" r="3.3" fill="white" opacity=".85"/>
          </g>
          <path className={styles.shine} d="M103 76L106 87L117 90L106 93L103 104L100 93L89 90L100 87Z" fill="#D4FFF8"/>
        </svg>
      </span>
      <span className={styles.wordmark} aria-hidden="true">
        <span className={styles.perla}>Perla</span>
        <span className={styles.marketplace}>Marketplace</span>
        <span className={styles.lightSweep} />
      </span>
    </Link>
  );
}
