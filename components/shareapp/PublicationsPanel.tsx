"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  FileText,
  Pause,
  ImagePlus,
  Play,
  Save,
  Send,
  Share2,
  X,
} from "lucide-react";
import { gestorApi } from "@/lib/shareapp/client";
import {
  networkNames,
  type Draft,
  type Publication,
} from "@/lib/shareapp/workspace-types";
import styles from "./workspace.module.css";
import PhotoShare from "./PhotoShare";
import {
  publicationShareData,
  publicationShareText as shareText,
} from "@/lib/shareapp/sharing";
async function share(title: string, body: string, url: string) {
  if (navigator.share) {
    try {
      await navigator.share(publicationShareData(title, body, url));
      return "Opciones de enlace abiertas. Espera a que la red cargue la vista previa antes de publicar.";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "";
      throw e;
    }
  }
  await navigator.clipboard.writeText(shareText(body, url));
  return "Texto y enlace copiados. Pégalos y espera la vista previa.";
}
export default function PublicationsPanel({
  storeId,
  draft,
  onDraft,
  onCatalog,
  online,
}: {
  storeId: string;
  draft: Draft | null;
  onDraft: (draft: Draft | null) => void;
  onCatalog: () => void;
  online: boolean;
}) {
  const [rows, setRows] = useState<Publication[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let current = true;
    void gestorApi<{ publications: Publication[]; hasMore: boolean }>(
      `links?storeId=${storeId}&page=${page}`,
    )
      .then((data) => {
        if (current) {
          setRows(data.publications);
          setMore(data.hasMore);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (current) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [storeId, page, version]);
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.stack}>
      {error && (
        <p role="alert" className={`${styles.alert} ${styles.error}`}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.alert}>
          {notice}
        </p>
      )}
      {draft && (
        <PublicationEditor
          key={draft.key}
          storeId={storeId}
          draft={draft}
          online={online}
          onClose={() => onDraft(null)}
          onChange={(patch) => onDraft({ ...draft, ...patch })}
          onSaved={(row) => {
            onDraft({
              ...draft,
              id: row.id,
              url: row.url,
              active: row.active,
              title: row.title,
              body: row.body,
              network: row.network,
              saved: { title: row.title, body: row.body, network: row.network },
            });
            setNotice(
              "Publicación guardada. Comparte el enlace para mostrar la tarjeta del producto.",
            );
            setPage(0);
            setVersion((v) => v + 1);
          }}
        />
      )}
      <div className={styles.row} style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            Tus publicaciones guardadas
          </h2>
          <p className={styles.fresh}>
            Textos y enlaces disponibles también desde tus otros dispositivos.
          </p>
        </div>
        <button className={styles.secondary} onClick={onCatalog}>
          <FileText size={16} />
          Crear desde el catálogo
        </button>
      </div>
      {loading ? (
        <div className={styles.skeleton} />
      ) : rows.length ? (
        rows.map((row) => (
          <article className={styles.card} key={row.id}>
            <div className={styles.publicationHeader}>
              <div>
                <h3>{row.title}</h3>
                <p>
                  {networkNames[row.network] || "Otra red"} ·{" "}
                  {new Date(row.created_at).toLocaleDateString("es", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span
                className={`${styles.badge} ${!row.active ? styles.badgeMuted : ""}`}
              >
                {row.active ? "Enlace activo" : "Enlace pausado"}
              </span>
            </div>
            <p className={styles.publicationBody}>
              {row.body || "Añade un texto a esta publicación desde Editar."}
            </p>
            <span className={styles.link}>{row.url}</span>
            <div className={styles.row}>
              <button
                className={styles.secondary}
                disabled={busy || !online || !row.active}
                onClick={() =>
                  void action(async () =>
                    setNotice(
                      await share(row.title, row.body || row.title, row.url),
                    ),
                  )
                }
              >
                <Share2 size={15} />
                Compartir publicación
              </button>
              <button
                className={styles.secondary}
                disabled={busy || !online || !row.active}
                onClick={() =>
                  void action(async () => {
                    await navigator.clipboard.writeText(
                      shareText(row.body || row.title, row.url),
                    );
                    setNotice("Texto y enlace copiados.");
                  })
                }
              >
                <Copy size={15} />
                Copiar
              </button>
              <button
                className={styles.secondary}
                disabled={busy || !online}
                onClick={() => {
                  onDraft({
                    key: crypto.randomUUID(),
                    id: row.id,
                    kind: row.kind,
                    itemId: row.item_id,
                    title: row.title,
                    body: row.body || row.title,
                    network: row.network,
                    url: row.url,
                    active: row.active,
                    saved: {
                      title: row.title,
                      body: row.body || row.title,
                      network: row.network,
                    },
                  });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <ImagePlus size={15} />
                Ver foto y editar
              </button>
              <button
                className={row.active ? styles.danger : styles.secondary}
                disabled={busy || !online}
                onClick={() =>
                  void action(async () => {
                    await gestorApi(
                      "links",
                      { storeId, id: row.id, active: !row.active },
                      "PATCH",
                    );
                    if (draft?.id === row.id) onDraft(null);
                    setVersion((v) => v + 1);
                    setNotice(
                      row.active
                        ? "Enlace pausado. Las estadísticas históricas se conservan."
                        : "Enlace reactivado.",
                    );
                  })
                }
              >
                {row.active ? <Pause size={15} /> : <Play size={15} />}{" "}
                {row.active ? "Pausar enlace" : "Reactivar"}
              </button>
            </div>
          </article>
        ))
      ) : (
        <div className={styles.empty}>
          <FileText size={35} />
          <h2>Tu primera publicación empieza aquí</h2>
          <p>
            Elige un producto en el catálogo, adapta el texto y guarda tu enlace
            de gestor.
          </p>
          <button className={styles.primary} onClick={onCatalog}>
            <ArrowLeft size={15} />
            Explorar catálogo
          </button>
        </div>
      )}
      {(more || page > 0) && (
        <div className={styles.pagination}>
          <button
            className={styles.secondary}
            disabled={!page || loading}
            onClick={() => {
              setPage((p) => p - 1);
              setLoading(true);
            }}
          >
            Anterior
          </button>
          <span>Página {page + 1}</span>
          <button
            className={styles.secondary}
            disabled={!more || loading}
            onClick={() => {
              setPage((p) => p + 1);
              setLoading(true);
            }}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
function PublicationEditor({
  storeId,
  draft,
  online,
  onClose,
  onChange,
  onSaved,
}: {
  storeId: string;
  draft: Draft;
  online: boolean;
  onClose: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onSaved: (row: Publication) => void;
}) {
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [network, setNetwork] = useState(draft.network);
  const [url, setUrl] = useState(draft.url || "");
  const [id, setId] = useState(draft.id);
  const [saved, setSaved] = useState(
    draft.saved ||
      (draft.id
        ? { title: draft.title, body: draft.body, network: draft.network }
        : null),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty =
    !saved ||
    title !== saved.title ||
    body !== saved.body ||
    network !== saved.network;
  async function social(action: () => Promise<string>) {
    setError("");
    try {
      setNotice(await action());
    } catch {
      setError(
        "No se pudo compartir. Puedes copiar el texto y el enlace manualmente.",
      );
    }
  }
  return (
    <section className={styles.card} aria-label="Editor de publicación">
      <div
        className={styles.row}
        style={{ justifyContent: "space-between", marginBottom: 20 }}
      >
        <div>
          <span className={styles.eyebrow}>TU CONTENIDO</span>
          <h2 style={{ marginTop: 5 }}>
            {id ? "Editar publicación" : "Nueva publicación"}
          </h2>
        </div>
        <button
          className={styles.secondary}
          aria-label="Cerrar editor"
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </div>
      <form
        className={styles.form}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const row = await gestorApi<Publication>(
              "links",
              {
                storeId,
                id,
                kind: draft.kind,
                itemId: draft.itemId,
                title,
                body,
                network,
              },
              id ? "PATCH" : "POST",
            );
            setId(row.id);
            setUrl(row.url);
            setSaved({ title, body, network });
            onSaved(row);
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo guardar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className={styles.formGrid}>
          <label className={styles.field}>
            Título
            <input
              className={styles.input}
              required
              maxLength={160}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                onChange({ title: e.target.value });
              }}
            />
          </label>
          <label className={styles.field}>
            Red de referencia
            <select
              className={styles.input}
              disabled={Boolean(id)}
              value={network}
              onChange={(e) => {
                setNetwork(e.target.value);
                onChange({ network: e.target.value });
              }}
            >
              {Object.entries(networkNames).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={styles.field}>
          Texto de la publicación
          <textarea
            className={styles.input}
            required
            maxLength={5000}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              onChange({ body: e.target.value });
            }}
          />
          <span className={styles.fresh}>{body.length}/5000 caracteres</span>
        </label>
        <div className={styles.row}>
          <button
            className={styles.primary}
            disabled={busy || !online || !title.trim() || !body.trim()}
          >
            <Save size={16} />
            {busy
              ? "Guardando…"
              : dirty
                ? "Guardar publicación"
                : "Guardar cambios"}
          </button>
          {saved && !dirty && (
            <span className={styles.fresh}>
              <Check size={13} style={{ display: "inline" }} /> Guardada en tu
              cuenta
            </span>
          )}
        </div>
      </form>
      {error && (
        <p
          role="alert"
          className={`${styles.alert} ${styles.error}`}
          style={{ marginTop: 15 }}
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.alert} style={{ marginTop: 15 }}>
          {notice}
        </p>
      )}
      {url && (
        <div style={{ marginTop: 20 }}>
          <span className={styles.link}>{url}</span>
          <p className={styles.fresh}>
            {dirty
              ? "Guarda los cambios antes de compartir."
              : draft.active === false
                ? "Este enlace está pausado. Reactívalo en la lista para compartirlo."
                : "Conserva este enlace en tu publicación para registrar las visitas y pedidos."}
          </p>
          <div className={styles.row}>
            <button
              className={styles.primary}
              disabled={dirty || !online || draft.active === false}
              onClick={() => void social(() => share(title, body, url))}
            >
              <Share2 size={16} />
              Compartir publicación
            </button>
            <button
              className={styles.secondary}
              disabled={dirty || !online || draft.active === false}
              onClick={() =>
                void social(async () => {
                  await navigator.clipboard.writeText(shareText(body, url));
                  return "Texto y enlace copiados.";
                })
              }
            >
              <Copy size={16} />
              Copiar
            </button>
            <a
              className={styles.secondary}
              aria-disabled={dirty || !online || draft.active === false}
              href={
                dirty || !online || draft.active === false
                  ? undefined
                  : `https://wa.me/?text=${encodeURIComponent(shareText(body, url))}`
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <Send size={16} />
              WhatsApp
            </a>
          </div>
          <p className={styles.fresh}>
            Esta opción comparte un enlace. Espera la tarjeta con foto antes de
            publicar; su presentación depende de la red social.
          </p>
          {draft.kind !== "store" && (
            <details className={styles.mediaAlternative}>
              <summary>
                Enviar la foto como archivo (sin tarjeta de enlace)
              </summary>
              <PhotoShare
                key={url}
                url={url}
                title={title}
                body={body}
                disabled={dirty || !online || draft.active === false}
              />
            </details>
          )}
          <p className={styles.fresh}>
            Guardar o abrir el selector no confirma que la publicación se haya
            enviado a una red social.
          </p>
        </div>
      )}
    </section>
  );
}
