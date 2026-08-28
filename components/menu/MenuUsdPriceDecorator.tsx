"use client";

import { useEffect } from "react";

type Props = {
  enabled: boolean;
  cupPerUsd: number | null;
};

function formatCup(value: number) {
  return new Intl.NumberFormat("es-CU", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function readCupAmount(element: HTMLElement) {
  const stored = element.dataset.menuCupAmount;
  if (stored) {
    const value = Number(stored);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const text = element.textContent?.trim() || "";
  const match = text.match(/^\$\s*([\d,.]+)$/);
  if (!match) return null;

  const value = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(value) || value < 0) return null;

  element.dataset.menuCupAmount = String(value);
  return value;
}

function decoratePrice(element: HTMLElement, cupPerUsd: number) {
  const cup = readCupAmount(element);
  if (cup === null) return;

  const usd = cup / cupPerUsd;
  const next = `${formatCup(cup)} CUP · ≈ ${formatUsd(usd)} USD`;
  if (element.textContent !== next) element.textContent = next;
  element.dataset.menuUsdDecorated = "true";
}

function findMenuPriceElements() {
  const elements = new Set<HTMLElement>();

  document.querySelectorAll<HTMLElement>("article strong").forEach((element) => {
    if (/^\$\s*[\d,.]+$/.test(element.textContent?.trim() || "") || element.dataset.menuCupAmount) {
      elements.add(element);
    }
  });

  document.querySelectorAll<HTMLElement>("h2").forEach((heading) => {
    const row = heading.parentElement?.parentElement;
    const strong = row?.querySelector<HTMLElement>(":scope > strong");
    if (strong && (/^\$\s*[\d,.]+$/.test(strong.textContent?.trim() || "") || strong.dataset.menuCupAmount)) {
      elements.add(strong);
    }
  });

  return elements;
}

export default function MenuUsdPriceDecorator({ enabled, cupPerUsd }: Props) {
  useEffect(() => {
    if (!enabled || !cupPerUsd || !Number.isFinite(cupPerUsd) || cupPerUsd <= 0) return;

    let queued = false;
    const apply = () => {
      queued = false;
      findMenuPriceElements().forEach((element) => decoratePrice(element, cupPerUsd));
    };

    const queueApply = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(apply);
    };

    queueApply();
    const observer = new MutationObserver(queueApply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [enabled, cupPerUsd]);

  return null;
}
