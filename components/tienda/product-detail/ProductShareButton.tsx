"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  Send,
  Share2,
  X,
} from "lucide-react";

type ProductShareButtonProps = {
  productName: string;
};

function openShareUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function ProductShareButton({
  productName,
}: ProductShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const getShareData = () => {
    const url = window.location.href;
    return {
      title: productName,
      text: `Mira este producto: ${productName}`,
      url,
    };
  };

  const copyLink = async () => {
    const { url } = getShareData();

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareWithDevice = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share(getShareData());
      setIsOpen(false);
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        console.error("No se pudo compartir el producto:", error);
      }
    }
  };

  const shareTo = (network: "whatsapp" | "facebook" | "x" | "telegram" | "email") => {
    const { text, url } = getShareData();
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(`${text}\n${url}`);
    const links = {
      whatsapp: `https://wa.me/?text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}`,
      email: `mailto:?subject=${encodeURIComponent(productName)}&body=${encodedText}`,
    };

    if (network === "email") {
      window.location.href = links.email;
      return;
    }

    openShareUrl(links[network]);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#061b3a] bg-white px-5 py-3.5 text-sm font-black text-[#061b3a] transition hover:bg-slate-50"
      >
        <Share2 size={19} />
        Compartir producto
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-end justify-center bg-black/55 p-3 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-product-title"
            className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-600">
                  Compartir
                </p>
                <h2 id="share-product-title" className="mt-1 text-xl font-black text-[#061b3a]">
                  {productName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <ShareOption label="WhatsApp" tone="bg-emerald-50 text-emerald-700" onClick={() => shareTo("whatsapp")}>
                <MessageCircle size={23} />
              </ShareOption>
              <ShareOption label="Facebook" tone="bg-blue-50 text-blue-700" onClick={() => shareTo("facebook")}>
                <span className="text-2xl font-black">f</span>
              </ShareOption>
              <ShareOption label="X" tone="bg-slate-100 text-slate-900" onClick={() => shareTo("x")}>
                <span className="text-xl font-black">𝕏</span>
              </ShareOption>
              <ShareOption label="Telegram" tone="bg-sky-50 text-sky-600" onClick={() => shareTo("telegram")}>
                <Send size={22} />
              </ShareOption>
              <ShareOption label="Correo" tone="bg-amber-50 text-amber-700" onClick={() => shareTo("email")}>
                <Mail size={22} />
              </ShareOption>
              <ShareOption label={copied ? "Copiado" : "Copiar"} tone="bg-violet-50 text-violet-700" onClick={copyLink}>
                {copied ? <Check size={22} /> : <Copy size={22} />}
              </ShareOption>
            </div>

            <button
              type="button"
              onClick={shareWithDevice}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-4 py-3.5 text-sm font-black text-white hover:bg-[#0b2d61]"
            >
              <Share2 size={18} />
              Más opciones para compartir
            </button>
          </section>
        </div>
      )}
    </>
  );
}

function ShareOption({
  children,
  label,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-xs font-black transition hover:-translate-y-0.5 ${tone}`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
