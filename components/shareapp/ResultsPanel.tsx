"use client";
import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { gestorApi, type Result } from "@/lib/shareapp/client";
import Results from "./Results";
import styles from "./workspace.module.css";
export default function ResultsPanel({
  storeId,
  online,
}: {
  storeId: string;
  online: boolean;
}) {
  const [rows, setRows] = useState<Result[]>([]);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    void gestorApi<{ results: Result[] }>(`results?storeId=${storeId}`)
      .then((data) => {
        if (current) {
          setRows(data.results);
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
  }, [storeId, version]);
  return (
    <div className={styles.stack}>
      <div className={styles.row} style={{ justifyContent: "space-between" }}>
        <span className={styles.badge}>Últimos 30 días</span>
        <button
          className={styles.secondary}
          disabled={loading || !online}
          onClick={() => {
            setLoading(true);
            setVersion((v) => v + 1);
          }}
        >
          <RefreshCw size={15} />
          Actualizar resultados
        </button>
      </div>
      {error && (
        <p role="alert" className={`${styles.alert} ${styles.error}`}>
          {error}
        </p>
      )}
      {loading ? <div className={styles.skeleton} /> : <Results rows={rows} />}
      <section className={styles.card}>
        <div className={styles.row}>
          <BarChart3 size={20} color="#6252d8" />
          <h2>Lo que cuentan tus resultados</h2>
        </div>
        <p>
          <strong>Visitas:</strong> entradas a la tienda a través de tus
          enlaces. <strong>Productos vistos:</strong> fichas consultadas durante
          esas entradas.
        </p>
        <p>
          <strong>Pedidos creados:</strong> compras iniciadas que quedaron
          registradas. <strong>Pedidos pagados:</strong> pedidos cuyo pago
          confirmó la tienda. Las ventas muestran el total pagado y no calculan
          comisiones.
        </p>
        <p>
          Solo se muestran tus resultados para la tienda seleccionada. Las
          visualizaciones dentro de una red social no se contabilizan aquí.
        </p>
      </section>
    </div>
  );
}
