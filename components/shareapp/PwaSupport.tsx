"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Download, Share2 } from "lucide-react";
import styles from "./workspace.module.css";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
function subscribeInstalled(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}
function installed() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}
export function useOnline() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("online", callback);
      window.addEventListener("offline", callback);
      return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
export function PwaRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker
        .register("/gestores/sw.js", { scope: "/gestores" })
        .catch(() => {});
  }, []);
  return null;
}
export default function InstallCard() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const isInstalled = useSyncExternalStore(
    subscribeInstalled,
    installed,
    () => false,
  );
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  if (isInstalled)
    return (
      <div className={styles.install}>
        <span className={styles.row}>
          <CheckCircle2 size={18} />
          ShareAPP ya está instalada en este dispositivo.
        </span>
      </div>
    );
  return (
    <details className={styles.install}>
      <summary>
        <Download size={17} />
        Instalar ShareAPP en mi dispositivo
      </summary>
      {prompt && (
        <button
          type="button"
          className={styles.primary}
          style={{ marginTop: 14 }}
          onClick={async () => {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          }}
        >
          Instalar aplicación
        </button>
      )}
      <ol>
        <li>
          <strong>iPhone o iPad:</strong> abre esta página en Safari.
        </li>
        <li>
          Toca <Share2 size={12} style={{ display: "inline" }} /> Compartir y
          selecciona <strong>Añadir a pantalla de inicio</strong>.
        </li>
        <li>
          Si aparece <strong>Abrir como app web</strong>, déjalo activado y toca
          Añadir.
        </li>
      </ol>
      <p>
        En Android o computadora, utiliza la opción Instalar aplicación del
        navegador si está disponible. Necesitas conexión para consultar
        productos y resultados.
      </p>
    </details>
  );
}
