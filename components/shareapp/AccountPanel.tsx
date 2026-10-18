"use client";
import { useState } from "react";
import { KeyRound, LogOut, ShieldCheck, Store } from "lucide-react";
import { type Identity } from "@/lib/shareapp/client";
import { type Membership } from "@/lib/shareapp/workspace-types";
import PasswordForm from "./PasswordForm";
import InstallCard, { AppUpdateCard } from "./PwaSupport";
import styles from "./workspace.module.css";
export default function AccountPanel({
  identity,
  memberships,
  storeId,
  onStore,
  onLogout,
  online,
  hasUnsavedDraft,
}: {
  identity: Identity;
  memberships: Membership[];
  storeId: string;
  onStore: (id: string) => void;
  onLogout: () => void;
  online: boolean;
  hasUnsavedDraft: boolean;
}) {
  const [change, setChange] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <div className={styles.stack}>
      {notice && (
        <p role="status" className={styles.alert}>
          {notice}
        </p>
      )}
      <div className={styles.accountGrid}>
        <section className={styles.card}>
          <div className={styles.identity}>
            <span className={styles.avatar}>
              {(identity.fullName || identity.email).slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h2>{identity.fullName || "Gestor de ventas"}</h2>
              <p>{identity.email}</p>
            </div>
          </div>
          <div className={styles.row}>
            <ShieldCheck size={17} color="#6252d8" />
            <span className={styles.fresh}>
              Sesión de ShareAPP independiente del administrador.
            </span>
          </div>
          <div className={styles.row} style={{ marginTop: 22 }}>
            <button
              className={styles.secondary}
              disabled={!online}
              onClick={() => setChange((v) => !v)}
            >
              <KeyRound size={16} />
              {change ? "Cancelar cambio" : "Cambiar contraseña"}
            </button>
            <button className={styles.danger} onClick={onLogout}>
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </section>
        <section className={styles.card}>
          <h2>Mis tiendas autorizadas</h2>
          <p>
            El acceso y la disponibilidad de cada tienda los controla su
            administrador.
          </p>
          {memberships.length ? (
            memberships.map((m) => (
              <div key={m.id} className={styles.membership}>
                <Store size={18} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{m.stores.name}</strong>
                  <small>{m.display_name}</small>
                </div>
                <button
                  className={styles.secondary}
                  disabled={m.store_id === storeId}
                  onClick={() => onStore(m.store_id)}
                >
                  {m.store_id === storeId ? "Actual" : "Abrir"}
                </button>
              </div>
            ))
          ) : (
            <p>Aún no tienes tiendas habilitadas.</p>
          )}
        </section>
      </div>
      {change && (
        <div className={styles.recoveryWrapper}>
          <PasswordForm
            email={identity.email}
            onComplete={() => {
              setChange(false);
              setNotice(
                "Contraseña actualizada. Usa la nueva también al entrar desde otros dispositivos.",
              );
            }}
          />
        </div>
      )}
      <AppUpdateCard hasUnsavedChanges={hasUnsavedDraft || change} />
      <InstallCard />
      <section className={styles.card}>
        <h2>Tu cuenta viaja contigo</h2>
        <p>
          Utiliza el mismo correo y contraseña en iPhone, Android o computadora.
          Las publicaciones guardadas y los resultados están asociados a tu
          cuenta y a cada tienda.
        </p>
      </section>
    </div>
  );
}
