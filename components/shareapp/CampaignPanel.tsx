"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Copy,
  ImagePlus,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Save,
  Send,
  Share2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { shareappApi, gestorApi } from "@/lib/shareapp/client";
import {
  publicationNetworkUrl,
  publicationShareText,
  type ShareNetwork,
} from "@/lib/shareapp/sharing";
import type { Campaign } from "@/lib/shareapp/campaign-types";
import type { Draft } from "@/lib/shareapp/workspace-types";
import CampaignResults from "./CampaignResults";
import s from "./campaigns.module.css";
export default function CampaignPanel({
  storeId,
  admin = false,
  online = true,
  onPrepare,
}: {
  storeId: string;
  admin?: boolean;
  online?: boolean;
  onPrepare?: (draft: Draft) => void;
}) {
  const [rows, setRows] = useState<Campaign[]>([]),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [version, setVersion] = useState(0),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [creating, setCreating] = useState(false),
    [view, setView] = useState("contenido"),
    [campaignId, setCampaignId] = useState<string | null>(null);
  async function quickShare(campaign: Campaign, network: ShareNetwork | "copy") {
    const target =
      network === "copy" ? null : window.open("about:blank", "_blank");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const row = await gestorApi<{
        url: string;
        title: string;
        body: string;
      }>("links", {
        storeId,
        campaignId: campaign.id,
        kind: campaign.kind,
        itemId: campaign.item_id,
        title: campaign.title,
        body: campaign.body || campaign.title,
        network: network === "copy" ? "other" : network,
      });
      const text = publicationShareText(row.body || row.title, row.url);
      if (network === "copy") {
        await navigator.clipboard.writeText(text);
        setNotice("Publicación creada. Texto y enlace personal copiados.");
      } else {
        const destination = publicationNetworkUrl(
          network,
          row.body || row.title,
          row.url,
        );
        if (target) {
          target.opener = null;
          target.location.href = destination;
        } else {
          window.location.href = destination;
        }
        setNotice("Publicación creada con tu enlace personal.");
      }
    } catch (e) {
      target?.close();
      setError(
        e instanceof Error ? e.message : "No se pudo preparar la publicación.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let current = true;
    const api = admin ? shareappApi : gestorApi;
    void api<{ campaigns: Campaign[]; hasMore: boolean }>(
      `campaigns?storeId=${storeId}${admin ? "&scope=store" : ""}&page=${page}`,
    )
      .then((d) => {
        if (current) {
          setRows(d.campaigns);
          setMore(d.hasMore);
          setLoading(false);
          setError("");
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
  }, [storeId, admin, page, version]);
  return (
    <div className={s.root}>
      <div className={s.heading}>
        <div>
          <span className={s.kicker}>
            {admin ? "CONTENIDO PARA TU EQUIPO" : "CONTENIDO DE TU TIENDA"}
          </span>
          <h2>{admin ? "Campañas con póster" : "Elige una campaña"}</h2>
          <p>
            {admin
              ? "Prepara el contenido y mide qué gestores atraen más visitas y ventas."
              : "Comparte al instante con tu enlace personal o personaliza el texto antes de publicar."}
          </p>
        </div>
        {admin && (
          <button
            className={s.primary}
            disabled={busy}
            onClick={() => {
              setCreating((v) => !v);
              setView("contenido");
            }}
          >
            {creating ? <X size={16} /> : <Plus size={16} />}
            {creating ? "Cerrar formulario" : "Nueva campaña"}
          </button>
        )}
      </div>
      <div className={s.row}>
        <button
          className={view === "contenido" ? s.primary : s.secondary}
          onClick={() => setView("contenido")}
        >
          <ImagePlus size={16} /> {admin ? "Contenido" : "Campañas disponibles"}
        </button>
        <button
          className={view === "resultados" ? s.primary : s.secondary}
          onClick={() => setView("resultados")}
        >
          <BarChart3 size={16} />{" "}
          {admin ? "Resultados de campañas" : "Mis resultados de campañas"}
        </button>
      </div>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
      <div hidden={view !== "contenido"} className={s.stack}>
        {admin && creating && (
          <CampaignCreator
            storeId={storeId}
            onCreated={() => {
              setPage(0);
              setVersion((v) => v + 1);
              setCreating(false);
              setNotice(
                "Campaña preparada. Los gestores ya pueden crear sus publicaciones.",
              );
            }}
          />
        )}
        {loading ? (
          <p className={s.empty} role="status">
            Cargando campañas…
          </p>
        ) : !rows.length ? (
          <div className={s.empty}>
            <ImagePlus size={32} />
            <h3>
              {admin
                ? "Tu próxima campaña empieza con una imagen"
                : "Aún no hay campañas disponibles"}
            </h3>
            <p>
              {admin
                ? "Sube un póster, escribe un texto sugerido y elige a dónde lleva el enlace."
                : "Aquí aparecerán los pósteres que prepare tu tienda."}
            </p>
          </div>
        ) : (
          <div className={s.grid}>
            {rows.map((c) => (
              <article className={s.posterCard} key={c.id}>
                <div className={s.poster}>
                  <Image
                    src={c.image_url}
                    alt={`Póster: ${c.title}`}
                    width={600}
                    height={600}
                    unoptimized
                  />
                </div>
                <div className={s.posterContent}>
                  <span className={c.active ? s.badge : s.muted}>
                    {c.active ? "Campaña habilitada" : "Campaña pausada"}
                  </span>
                  <h3>{c.title}</h3>
                  <p>
                    {c.body ||
                      "Añade tu propio texto al preparar la publicación."}
                  </p>
                  <small>
                    Destino:{" "}
                    {c.kind === "store"
                      ? "Tienda"
                      : c.kind === "product"
                        ? "Producto"
                        : "Combo"}
                  </small>
                  {admin ? (
                    <div className={s.row}>
                      <button
                        className={s.secondary}
                        onClick={() => {
                          setCampaignId(c.id);
                          setView("resultados");
                        }}
                      >
                        <BarChart3 size={15} /> Ver resultados
                      </button>
                      <button
                        className={s.secondary}
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          setError("");
                          try {
                            await shareappApi(
                              "campaigns",
                              { storeId, id: c.id, active: !c.active },
                              "PATCH",
                            );
                            setVersion((v) => v + 1);
                            setNotice(
                              c.active
                                ? "Campaña pausada. Se conservan sus resultados."
                                : "Campaña habilitada.",
                            );
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "No se pudo guardar.",
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {c.active ? <Pause size={15} /> : <Play size={15} />}
                        {c.active ? "Pausar" : "Habilitar"}
                      </button>
                    </div>
                  ) : (
                    <div className={s.stack}>
                      <div className={s.row}>
                        <button
                          className={s.primary}
                          disabled={!online || busy}
                          onClick={() => void quickShare(c, "whatsapp")}
                        >
                          <MessageCircle size={16} /> WhatsApp
                        </button>
                        <button
                          className={s.secondary}
                          disabled={!online || busy}
                          onClick={() => void quickShare(c, "facebook")}
                        >
                          <Share2 size={16} /> Facebook
                        </button>
                        <button
                          className={s.secondary}
                          disabled={!online || busy}
                          onClick={() => void quickShare(c, "telegram")}
                        >
                          <Send size={16} /> Telegram
                        </button>
                        <button
                          className={s.secondary}
                          disabled={!online || busy}
                          onClick={() => void quickShare(c, "copy")}
                        >
                          <Copy size={16} /> Copiar
                        </button>
                        <button
                          className={s.secondary}
                          disabled={!online || busy}
                          onClick={() =>
                            onPrepare?.({
                              key: crypto.randomUUID(),
                              campaignId: c.id,
                              kind: c.kind,
                              itemId: c.item_id,
                              imageUrl: c.image_url,
                              title: c.title,
                              body: c.body,
                              network: "instagram",
                            })
                          }
                        >
                          <ImagePlus size={16} /> Instagram / foto
                        </button>
                      </div>
                      <button
                        className={s.secondary}
                        disabled={!online || busy}
                        onClick={() =>
                          onPrepare?.({
                            key: crypto.randomUUID(),
                            campaignId: c.id,
                            kind: c.kind,
                            itemId: c.item_id,
                            imageUrl: c.image_url,
                            title: c.title,
                            body: c.body,
                            network: "whatsapp",
                          })
                        }
                      >
                        <Share2 size={16} /> Personalizar antes de compartir
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        <div className={s.pagination}>
          <button
            className={s.secondary}
            disabled={!page}
            onClick={() => {
              setLoading(true);
              setPage((p) => p - 1);
            }}
          >
            Anterior
          </button>
          <span>Página {page + 1}</span>
          <button
            className={s.secondary}
            disabled={!more}
            onClick={() => {
              setLoading(true);
              setPage((p) => p + 1);
            }}
          >
            Siguiente
          </button>
        </div>
      </div>
      {view === "resultados" && (
        <CampaignResults
          key={campaignId || "all"}
          storeId={storeId}
          admin={admin}
          campaignId={campaignId}
          onCampaign={setCampaignId}
        />
      )}
    </div>
  );
}
function CampaignCreator({
  storeId,
  onCreated,
}: {
  storeId: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [kind, setKind] = useState("store"),
    [itemId, setItemId] = useState(""),
    [q, setQ] = useState(""),
    [items, setItems] = useState<{ id: string; name: string }[]>([]),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (kind === "store") return;
    let current = true;
    const timer = setTimeout(() => {
      void shareappApi<{ items: { id: string; name: string }[] }>(
        `campaigns?scope=store&storeId=${storeId}&target=${kind}&q=${encodeURIComponent(q)}`,
      )
        .then((d) => {
          if (current) setItems(d.items);
        })
        .catch((e) => {
          if (current) setError(e.message);
        });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [storeId, kind, q]);
  return (
    <form
      className={`${s.card} ${s.form}`}
      aria-label="Crear campaña"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return;
        setBusy(true);
        setError("");
        try {
          if (file.size > 3 * 1024 * 1024)
            throw new Error("Elige una imagen de hasta 3 MB.");
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("Inicia sesión para continuar.");
          const form = new FormData();
          form.append("poster", file);
          const response = await fetch(
            `/api/shareapp/campaigns/poster?storeId=${storeId}`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${data.session.access_token}` },
              body: form,
            },
          );
          const uploaded = await response.json();
          if (!response.ok)
            throw new Error(uploaded.error || "No se pudo subir el póster.");
          await shareappApi("campaigns", {
            storeId,
            title,
            body,
            kind,
            itemId: kind === "store" ? null : itemId,
            posterPath: uploaded.posterPath,
          });
          onCreated();
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "No se pudo crear la campaña.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Nueva campaña</h3>
      <p>
        El póster será público. Cada gestor tendrá un enlace propio para medir
        sus resultados.
      </p>
      <label>
        Póster de campaña
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <small>
          JPG, PNG o WebP · Hasta 3 MB. El archivo se valida y optimiza al
          guardar.
        </small>
      </label>
      <label>
        Título de campaña
        <input
          required
          maxLength={160}
          value={title}
          disabled={busy}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Texto sugerido
        <textarea
          rows={4}
          maxLength={5000}
          value={body}
          disabled={busy}
          onChange={(e) => setBody(e.target.value)}
        />
        <small>Los gestores pueden adaptarlo antes de compartir.</small>
      </label>
      <label>
        Destino del enlace
        <select
          value={kind}
          disabled={busy}
          onChange={(e) => {
            setKind(e.target.value);
            setItemId("");
            setItems([]);
            setQ("");
          }}
        >
          <option value="store">Toda la tienda</option>
          <option value="product">Un producto</option>
          <option value="combo">Un combo</option>
        </select>
      </label>
      {kind !== "store" && (
        <>
          <label>
            Buscar destino
            <input
              value={q}
              placeholder="Escribe el nombre para buscar"
              disabled={busy}
              onChange={(e) => {
                setQ(e.target.value);
                setItemId("");
              }}
            />
          </label>
          <label>
            {kind === "product" ? "Producto de destino" : "Combo de destino"}
            <select
              required
              value={itemId}
              disabled={busy}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">Selecciona un destino</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <small>
              Se muestran hasta 50 coincidencias. Escribe para afinar la
              búsqueda.
            </small>
          </label>
        </>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <button className={s.primary} disabled={busy}>
        <Save size={17} />
        {busy ? "Subiendo y preparando…" : "Guardar campaña"}
      </button>
    </form>
  );
}
