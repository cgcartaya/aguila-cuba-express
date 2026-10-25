"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Eye,
  RefreshCw,
  ShoppingBag,
  Target,
  WalletCards,
} from "lucide-react";
import { gestorApi, type Result } from "@/lib/shareapp/client";
import styles from "./workspace.module.css";

export default function HomePanel({
  storeId,
  online,
  onNavigate,
}: {
  storeId: string;
  online: boolean;
  onNavigate: (section: "catalogo" | "campanas" | "publicaciones" | "resultados") => void;
}) {
  const [rows, setRows] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    void gestorApi<{ results: Result[] }>(`results?storeId=${storeId}`)
      .then((data) => {
        if (!current) return;
        setRows(data.results);
        setError("");
        setLoading(false);
      })
      .catch((e) => {
        if (!current) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [storeId, version]);

  const total = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          visits: acc.visits + Number(row.visits),
          views: acc.views + Number(row.product_views),
          orders: acc.orders + Number(row.orders),
          paid: acc.paid + Number(row.paid_orders),
          amount: acc.amount + Number(row.paid_total),
        }),
        { visits: 0, views: 0, orders: 0, paid: 0, amount: 0 },
      ),
    [rows],
  );
  const conversion = total.visits ? (total.orders / total.visits) * 100 : 0;

  if (loading) return <div className={styles.skeleton} />;

  return (
    <div className={styles.stack}>
      <div className={styles.row} style={{ justifyContent: "space-between" }}>
        <span className={styles.badge}>Resumen · últimos 30 días</span>
        <button
          className={styles.secondary}
          disabled={!online}
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>
      {error && <p className={`${styles.alert} ${styles.error}`}>{error}</p>}

      <section className={styles.homeMetrics}>
        <Metric icon={<Eye size={19} />} label="Visitas" value={total.visits} />
        <Metric icon={<ShoppingBag size={19} />} label="Pedidos" value={total.orders} />
        <Metric icon={<WalletCards size={19} />} label="Ventas pagadas" value={`$${total.amount.toFixed(2)}`} />
        <Metric icon={<Target size={19} />} label="Conversión" value={`${conversion.toFixed(1)}%`} />
      </section>

      <section className={styles.homeGrid}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>TU ACTIVIDAD</span>
          <h2>Así está funcionando tu contenido</h2>
          <div className={styles.homeStatsList}>
            <div><span>Productos vistos</span><strong>{total.views}</strong></div>
            <div><span>Pedidos pagados</span><strong>{total.paid}</strong></div>
            <div><span>Conversión visita → pedido</span><strong>{conversion.toFixed(1)}%</strong></div>
          </div>
          <button className={styles.textButton} onClick={() => onNavigate("resultados")}>
            Ver todos los resultados <ArrowRight size={14} style={{ display: "inline" }} />
          </button>
        </div>

        <div className={styles.card}>
          <span className={styles.eyebrow}>ACCESOS RÁPIDOS</span>
          <h2>¿Qué quieres compartir hoy?</h2>
          <div className={styles.quickActions}>
            <button onClick={() => onNavigate("catalogo")}><ShoppingBag size={18} /><span><strong>Catálogo</strong><small>Productos y combos</small></span><ArrowRight size={16} /></button>
            <button onClick={() => onNavigate("campanas")}><BarChart3 size={18} /><span><strong>Campañas</strong><small>Contenido preparado por la tienda</small></span><ArrowRight size={16} /></button>
            <button onClick={() => onNavigate("publicaciones")}><Target size={18} /><span><strong>Publicaciones</strong><small>Tus enlaces y contenido</small></span><ArrowRight size={16} /></button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className={styles.homeMetric}><span className={styles.homeMetricIcon}>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}
