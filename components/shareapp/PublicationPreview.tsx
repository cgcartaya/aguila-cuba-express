"use client";
import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import styles from "./workspace.module.css";
export default function PublicationPreview({
  imageUrl,
  title,
  body,
  kind,
  active = true,
}: {
  imageUrl?: string | null;
  title: string;
  body: string;
  kind: string;
  active?: boolean;
}) {
  const [failedSource, setFailedSource] = useState("");
  const hasPhoto = Boolean(active && imageUrl && imageUrl !== failedSource);
  return (
    <div
      className={styles.publicationPreview}
      aria-label="Vista previa de la publicación"
    >
      <div className={styles.previewImage}>
        {hasPhoto ? (
          <Image
            src={imageUrl!}
            alt={`Foto de ${title}`}
            width={180}
            height={180}
            unoptimized
            onError={() => setFailedSource(imageUrl!)}
          />
        ) : (
          <ImageOff size={30} aria-hidden="true" />
        )}
      </div>
      <div className={styles.previewContent}>
        <span className={styles.eyebrow}>
          {!active
            ? "ENLACE PAUSADO"
            : kind === "store"
              ? "TU TIENDA"
              : hasPhoto
                ? "FOTO DEL CATÁLOGO"
                : "FOTO NO DISPONIBLE"}
        </span>
        <h3>{title}</h3>
        <p>
          {body.slice(0, 180)}
          {body.length > 180 ? "…" : ""}
        </p>
        {!hasPhoto && kind !== "store" && (
          <p role="status">
            {active
              ? "No se pudo mostrar la foto. Revisa la imagen del producto en el catálogo antes de compartir."
              : "Reactiva el enlace para preparar la foto y compartir."}
          </p>
        )}
      </div>
    </div>
  );
}
