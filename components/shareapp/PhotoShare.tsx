"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Copy, Download, ImagePlus } from "lucide-react";
import styles from "./workspace.module.css";
export default function PhotoShare({
  url,
  title,
  body,
  disabled,
}: {
  url: string;
  title: string;
  body: string;
  disabled: boolean;
}) {
  const [photo, setPhoto] = useState<{ file: File; objectUrl: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sharing, setSharing] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    const controller = new AbortController();
    const code = new URL(url).pathname.match(/^\/r\/([a-f0-9]{48})$/)?.[1];
    if (!code) {
      void Promise.resolve().then(() => {
        if (active) {
          setLoading(false);
          setError("No se pudo preparar la foto de este enlace.");
        }
      });
      return;
    }
    void fetch(`/r/${code}/image`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw Error(
            "No se pudo cargar la foto. Puedes compartir el enlace o intentarlo de nuevo.",
          );
        const blob = await response.blob();
        if (blob.type !== "image/jpeg")
          throw Error("La foto no está disponible.");
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setPhoto({
            file: new File([blob], "producto.jpg", { type: "image/jpeg" }),
            objectUrl,
          });
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, retry]);
  const text = body.includes(url) ? body : `${body}\n\n${url}`;
  const canShare = Boolean(
    photo &&
    typeof navigator !== "undefined" &&
    navigator.canShare?.({ files: [photo.file] }),
  );
  return (
    <div className={styles.photoShare}>
      <div className={styles.photoPreview}>
        {photo ? (
          <Image
            src={photo.objectUrl}
            alt={title}
            width={160}
            height={160}
            unoptimized
          />
        ) : (
          <ImagePlus size={30} />
        )}
        <div>
          <h3>Foto del producto</h3>
          <p>
            {loading
              ? "Preparando la foto…"
              : photo
                ? "Archivo de imagen; no es una tarjeta de enlace."
                : "La foto no está disponible."}
          </p>
        </div>
      </div>
      {error && (
        <p role="status" className={styles.fresh}>
          {error}{" "}
          <button
            className={styles.textButton}
            onClick={() => {
              setLoading(true);
              setError("");
              setPhoto(null);
              setRetry((r) => r + 1);
            }}
          >
            Reintentar
          </button>
        </p>
      )}
      {photo && (
        <>
          <div className={styles.row}>
            {canShare && (
              <button
                className={styles.primary}
                disabled={disabled || sharing}
                onClick={async () => {
                  // The file is prepared before this tap, preserving transient user activation on iOS.
                  setSharing(true);
                  setNotice("");
                  try {
                    await navigator.share({ files: [photo.file], text, title });
                    setNotice(
                      "Opciones de foto abiertas. Revisa el texto y el enlace antes de publicar.",
                    );
                  } catch (e) {
                    if ((e as Error).name !== "AbortError")
                      setNotice(
                        "No se pudo compartir la foto. Descárgala y copia el texto para publicarla manualmente.",
                      );
                  } finally {
                    setSharing(false);
                  }
                }}
              >
                <ImagePlus size={16} />
                Enviar foto adjunta
              </button>
            )}
            <a
              className={styles.secondary}
              href={disabled ? undefined : photo.objectUrl}
              aria-disabled={disabled}
              download="producto.jpg"
            >
              <Download size={16} />
              Descargar foto
            </a>
            <button
              className={styles.secondary}
              disabled={disabled}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                  setNotice(
                    "Texto y enlace copiados. Pégalos junto a la foto.",
                  );
                } catch {
                  setNotice(
                    "No se pudo copiar. Selecciona el texto y el enlace manualmente.",
                  );
                }
              }}
            >
              <Copy size={16} />
              Copiar texto
            </button>
          </div>
          <p className={styles.fresh}>
            La foto adjunta no lleva un enlace en su imagen. Copia el texto y
            pégalo como descripción; incluye tu enlace para registrar visitas y
            pedidos.
          </p>
        </>
      )}
      {notice && (
        <p role="status" className={styles.fresh}>
          {notice}
        </p>
      )}
    </div>
  );
}
