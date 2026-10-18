"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { shareappApi, gestorApi } from "@/lib/shareapp/client";
import type { CampaignReport } from "@/lib/shareapp/campaign-types";
import { networkNames } from "@/lib/shareapp/workspace-types";
import s from "./campaigns.module.css";
const money = (n: number) =>
  Number(n).toLocaleString("es-US", { style: "currency", currency: "USD" });
export default function CampaignResults({
  storeId,
  admin,
  campaignId,
  onCampaign,
}: {
  storeId: string;
  admin: boolean;
  campaignId: string | null;
  onCampaign: (id: string | null) => void;
}) {
  const [report, setReport] = useState<CampaignReport | null>(null),
    [page, setPage] = useState(0),
    [version, setVersion] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => {
    let current = true;
    const api = admin ? shareappApi : gestorApi;
    void api<CampaignReport>(
      `campaign-results?storeId=${storeId}${admin ? "&scope=store" : ""}${campaignId ? `&campaignId=${campaignId}` : ""}&page=${page}`,
    )
      .then((data) => {
        if (current) {
          setReport(data);
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
  }, [storeId, admin, campaignId, page, version]);
  const choose = (id: string | null) => {
    setLoading(true);
    setPage(0);
    if (id === campaignId) setVersion((v) => v + 1);
    onCampaign(id);
  };
  return (
    <section className={s.stack} aria-label="Resultados de campañas">
      <div className={s.heading}>
        <div>
          <h2>
            {campaignId
              ? report?.campaigns[0]?.title || "Resultados de campaña"
              : "Resultados de campañas"}
          </h2>
          <p>
            Últimos 30 días · Visitas del enlace, no visualizaciones en redes
            sociales.
          </p>
        </div>
        <button
          className={s.secondary}
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setVersion((v) => v + 1);
          }}
        >
          <RefreshCw size={15} /> Actualizar informe
        </button>
      </div>
      {campaignId && (
        <button
          className={s.secondary}
          style={{ alignSelf: "start" }}
          onClick={() => choose(null)}
        >
          <ArrowLeft size={15} /> Todas las campañas
        </button>
      )}
      {copied && (
        <p role="status" className={s.notice}>
          Enlace personal copiado.
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className={s.empty}>
          Cargando estadísticas…
        </p>
      ) : (
        report && (
          <>
            <div className={s.card}>
              <h3>Comparación de campañas</h3>
              <div className={s.scroll}>
                <table>
                  <thead>
                    <tr>
                      <th>Campaña</th>
                      <th>Publicaciones</th>
                      <th>Visitas del enlace</th>
                      <th>Pedidos</th>
                      <th>Pagados</th>
                      <th>Ventas · USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.campaigns.map((c) => (
                      <tr key={c.campaign_id}>
                        <td>
                          <button
                            className={s.textButton}
                            onClick={() => choose(c.campaign_id)}
                          >
                            {c.title}
                          </button>
                          <small>{c.active ? "Habilitada" : "Pausada"}</small>
                        </td>
                        <td>{c.publications}</td>
                        <td>{c.visits}</td>
                        <td>{c.orders}</td>
                        <td>{c.paid_orders}</td>
                        <td>{money(c.paid_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!report.campaigns.length && (
                <p className={s.empty}>
                  Todavía no hay resultados de campañas.
                </p>
              )}
            </div>
            {admin && (
              <div className={s.card}>
                <h3>
                  Comparación por gestor{" "}
                  {campaignId
                    ? "· campaña seleccionada"
                    : "· todas las campañas"}
                </h3>
                <div className={s.scroll}>
                  <table>
                    <thead>
                      <tr>
                        <th>Gestor</th>
                        <th>Publicaciones</th>
                        <th>Visitas del enlace</th>
                        <th>Productos vistos</th>
                        <th>Pedidos pagados</th>
                        <th>Ventas · USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.members.map((m) => (
                        <tr key={m.member_id}>
                          <td>{m.display_name}</td>
                          <td>{m.publications}</td>
                          <td>{m.visits}</td>
                          <td>{m.product_views}</td>
                          <td>{m.paid_orders}</td>
                          <td>{money(m.paid_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className={s.card}>
              <h3>Detalle por publicación</h3>
              <div className={s.scroll}>
                <table>
                  <thead>
                    <tr>
                      <th>Publicación</th>
                      {admin && <th>Gestor</th>}
                      <th>Red de referencia</th>
                      <th>Visitas del enlace</th>
                      <th>Pedidos pagados</th>
                      <th>Ventas · USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.publications.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.title}
                          {p.url && (
                            <button
                              className={s.textButton}
                              style={{
                                display: "block",
                                fontSize: 10,
                                marginTop: 6,
                              }}
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(p.url);
                                  setCopied(p.id);
                                } catch {
                                  setError("No se pudo copiar el enlace.");
                                }
                              }}
                            >
                              Copiar enlace personal
                            </button>
                          )}
                          <small>
                            {p.campaign_title} ·{" "}
                            {p.active ? "Enlace activo" : "Enlace pausado"}
                          </small>
                        </td>
                        {admin && <td>{p.display_name}</td>}
                        <td>{networkNames[p.network] || "Otra red"}</td>
                        <td>{p.visits}</td>
                        <td>{p.paid_orders}</td>
                        <td>{money(p.paid_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!report.publications.length && (
                <p className={s.empty}>Aún no hay publicaciones vinculadas.</p>
              )}
            </div>
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
                disabled={!report.hasMore}
                onClick={() => {
                  setLoading(true);
                  setPage((p) => p + 1);
                }}
              >
                Siguiente
              </button>
            </div>
            <p className={s.help}>
              Las visitas pueden repetirse. Las ventas incluyen solo pedidos con
              pago confirmado, excluyen cancelados y no representan comisiones.
              Publicar una imagen sin conservar el enlace personal no permite
              atribuir visitas ni compras.
            </p>
          </>
        )
      )}
    </section>
  );
}
