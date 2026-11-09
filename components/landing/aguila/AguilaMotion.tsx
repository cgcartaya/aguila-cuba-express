"use client";

import { useEffect, useRef, type ReactNode } from "react";
import s from "./elegant.module.css";

/** Progressive enhancement: content stays visible without JavaScript or observer support. */
export default function AguilaMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const targets = Array.from(
      element.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    let observer: IntersectionObserver | undefined;
    function configure() {
      observer?.disconnect();
      targets.forEach((target) => target.removeAttribute("data-motion"));
      if (preference.matches) return;
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.setAttribute("data-motion", "visible");
            observer?.unobserve(entry.target);
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -20px 0px" },
      );
      targets.forEach((target, index) => {
        // Never hide content already on screen during hydration.
        if (target.getBoundingClientRect().top < window.innerHeight) return;
        target.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
        target.setAttribute("data-motion", "pending");
        observer!.observe(target);
      });
    }
    configure();
    preference.addEventListener("change", configure);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", configure);
      targets.forEach((target) => target.removeAttribute("data-motion"));
    };
  }, []);
  return (
    <div ref={root} className={s.root} id="inicio">
      {children}
    </div>
  );
}
