"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Eye,
  Info,
  ImagePlus,
  Link2,
  Mail,
  MousePointer2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { shareappApi, type Member, type Result } from "@/lib/shareapp/client";
import CampaignPanel from "./CampaignPanel";
import AccountCreator from "./AccountCreator";
import s from "./owner.module.css";
const tabs = [
  { id: "resumen", name: "Resumen", icon: BarChart3 },
  { id: "equipo", name: "Equipo", icon: Users },
  { id: "campanas", name: "Campañas", icon: ImagePlus },
  { id: "configuracion", name: "Configuración", icon: Settings2 },
] as const;
type Tab = (typeof tabs)[number]["id"];
const amount = (n: number) =>
  n.toLocaleString("es-US", { style: "currency", currency: "USD" });
const count = (n: number) => n.toLocaleString("es-US");
export default function OwnerPanel({
  storeId,
  storeName,
}: {
  storeId: string;
  storeName: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [rows, setRows] = useState<Result[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [days, setDays] = useState(7);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [activationLink, setActivationLink] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("resumen");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [creator, setCreator] = useState(false);
  const refresh = useCallback(async () => {
    const [data, stats] = await Promise.all([
      shareappApi<{
        members: Member[];
        settings: { enabled: boolean; attribution_days: number };
      }>(`members?storeId=${storeId}`),
      shareappApi<{ results: Result[] }>(
        `results?storeId=${storeId}&scope=store`,
      ),
    ]);
    setMembers(data.members);
    setRows(stats.results);
    setEnabled(data.settings.enabled);
    setSavedEnabled(data.settings.enabled);
    setDays(data.settings.attribution_days);
    setLoaded(true);
  }, [storeId]);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el equipo.");
    } finally {
      setLoading(false);
    }
  }, [refresh]);
  useEffect(() => {
    let current = true;
    void Promise.resolve()
      .then(refresh)
      .catch((e) => {
        if (current)
          setError(
            e instanceof Error ? e.message : "No se pudo cargar el equipo.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [refresh]);
  async function action(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await refresh();
      setNotice("Cambios guardados.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron guardar los cambios.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Enlace copiado. Compártelo solo con el gestor.");
    } catch {
      setError(
        "No se pudo copiar el enlace. Comprueba el permiso del portapapeles.",
      );
    }
  }
  const active = members.filter((m) => m.active).length;
  const pending = members.filter(
    (m) => m.active && (m.password_pending || !m.user_id),
  ).length;
  const totals = rows.reduce(
    (a, r) => ({
      visits: a.visits + Number(r.visits),
      views: a.views + Number(r.product_views),
      orders: a.orders + Number(r.orders),
      paid: a.paid + Number(r.paid_orders),
      sales: a.sales + Number(r.paid_total),
    }),
    { visits: 0, views: 0, orders: 0, paid: 0, sales: 0 },
  );
  const metrics = [
    {
      label: "Visitas recibidas",
      value: count(totals.visits),
      icon: MousePointer2,
      hint: "Entradas por enlaces de gestores",
    },
    {
      label: "Productos vistos",
      value: count(totals.views),
      icon: Eye,
      hint: "Fichas consultadas con referencia",
    },
    {
      label: "Pedidos creados",
      value: count(totals.orders),
      icon: ShoppingBag,
      hint: "Pedidos atribuidos al equipo",
    },
    {
      label: "Pedidos pagados",
      value: count(totals.paid),
      icon: CheckCircle2,
      hint: "Con pago confirmado",
    },
    {
      label: "Ventas pagadas",
      value: amount(totals.sales),
      icon: Wallet,
      hint: "Total en USD · No son comisiones",
    },
  ];
  const visible = members.filter(
    (m) =>
      `${m.display_name} ${m.email || ""}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) &&
      (filter === "todos" ||
        (filter === "activos"
          ? m.active
          : filter === "pendientes"
            ? m.active && (m.password_pending || !m.user_id)
            : !m.active)),
  );
  const maxVisits = Math.max(1, ...rows.map((r) => Number(r.visits)));
  const ready = loaded && !loading;
  return (
    <main className={s.root}>
      <div className={s.breadcrumb}>
        Marketing <ChevronRight size={14} />{" "}
        <strong>Gestores · ShareAPP</strong>
      </div>
      <header className={s.hero}>
        <div className={s.heroContent}>
          <span className={s.eyebrow}>
            <span className={s.brandIcon}>
              <Link2 size={18} />
            </span>{" "}
            SHAREAPP PARA TU NEGOCIO
          </span>
          <h1>
            Un equipo.
            <br />
            <span>Más oportunidades.</span>
          </h1>
          <p>
            Gestiona a quienes comparten tu tienda y conoce los resultados de
            sus enlaces.
          </p>
          <div className={s.heroMeta}>
            <span>{storeName}</span>
            <span
              className={loaded ? (savedEnabled ? s.live : s.paused) : s.paused}
            >
              <i />
              {!loaded
                ? "Consultando estado"
                : savedEnabled
                  ? "ShareAPP habilitada"
                  : "ShareAPP deshabilitada"}
            </span>
          </div>
        </div>
        <div className={s.heroAside}>
          <span className={s.teamIcon}>
            <Users size={27} />
          </span>
          <strong>
            {ready ? active : "—"}
            <small>gestores activos</small>
          </strong>
          <button
            className={s.primary}
            disabled={!ready || busy}
            onClick={() => {
              setCreator(true);
              setTab("equipo");
            }}
          >
            <Plus size={17} /> Nuevo gestor
          </button>
          <Link href="/gestores">
            Abrir portal del gestor <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <div className={s.toolbar}>
        <div className={s.tabs} role="tablist" aria-label="Panel de gestores">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              tabIndex={tab === t.id ? 0 : -1}
              onKeyDown={(e) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                  return;
                e.preventDefault();
                const index = tabs.findIndex((item) => item.id === tab);
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (e.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
                setTab(tabs[next].id);
                document.getElementById(`tab-${tabs[next].id}`)?.focus();
              }}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? s.selected : ""}
            >
              <t.icon size={17} />
              {t.name}
              {t.id === "equipo" && loaded && <span>{members.length}</span>}
            </button>
          ))}
        </div>
        <button
          className={s.refresh}
          onClick={() => void reload()}
          disabled={loading || busy}
        >
          <RefreshCw size={15} className={loading ? s.spin : ""} />
          {loading ? "Actualizando…" : "Actualizar datos"}
        </button>
      </div>
      {error && (
        <div className={s.error} role="alert">
          <Info size={18} />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className={s.success} role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}
      <section
        id="panel-resumen"
        role="tabpanel"
        aria-labelledby="tab-resumen"
        hidden={tab !== "resumen"}
        className={s.stack}
      >
        <div className={s.sectionHeading}>
          <div>
            <span className={s.kicker}>EL IMPACTO DE TU EQUIPO</span>
            <h2>Rendimiento general</h2>
          </div>
          <span className={s.period}>Últimos 30 días</span>
        </div>
        <div className={s.metrics} aria-busy={loading}>
          {metrics.map((m, i) => (
            <article
              key={m.label}
              className={`${s.metric} ${i === 4 ? s.salesMetric : ""}`}
            >
              <span className={s.metricIcon}>
                <m.icon size={19} />
              </span>
              <p>{m.label}</p>
              <strong>{ready ? m.value : "—"}</strong>
              <small>{m.hint}</small>
            </article>
          ))}
        </div>
        <section className={s.card}>
          <div className={s.cardHeading}>
            <div>
              <h2>Resultados por gestor</h2>
              <p>Compara las visitas y ventas atribuidas a cada persona.</p>
            </div>
            <span className={s.subtleBadge}>
              <Users size={14} />
              {loaded ? members.length : "—"} gestores
            </span>
          </div>
          {!ready ? (
            <div className={s.empty} role="status">
              {loading
                ? "Cargando resultados…"
                : "Actualiza los datos para consultar el rendimiento."}
            </div>
          ) : rows.length ? (
            <div className={s.tableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Gestor</th>
                    <th>Visitas</th>
                    <th>Productos vistos</th>
                    <th>Pedidos</th>
                    <th>Pagados</th>
                    <th>Ventas · USD</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows]
                    .sort(
                      (a, b) =>
                        Number(b.paid_total) - Number(a.paid_total) ||
                        Number(b.visits) - Number(a.visits),
                    )
                    .map((r) => (
                      <tr key={r.member_id}>
                        <td>
                          <span className={s.person}>
                            <span className={s.avatar}>
                              {r.display_name.slice(0, 1).toUpperCase()}
                            </span>
                            <strong>{r.display_name}</strong>
                          </span>
                        </td>
                        <td>
                          <span className={s.visitValue}>
                            {count(Number(r.visits))}
                          </span>
                          <span className={s.bar}>
                            <i
                              style={{
                                width: `${(Number(r.visits) / maxVisits) * 100}%`,
                              }}
                            />
                          </span>
                        </td>
                        <td>{count(Number(r.product_views))}</td>
                        <td>{count(Number(r.orders))}</td>
                        <td>{count(Number(r.paid_orders))}</td>
                        <td className={s.money}>
                          {amount(Number(r.paid_total))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={s.empty}>
              <BarChart3 size={30} />
              <h3>Los resultados empiezan con un enlace</h3>
              <p>
                Añade gestores y comparte productos para empezar a medir su
                rendimiento.
              </p>
              <button className={s.secondary} onClick={() => setTab("equipo")}>
                Gestionar equipo <ChevronRight size={15} />
              </button>
            </div>
          )}
          <div className={s.footnote}>
            <Info size={16} />
            <p>
              Las visitas pueden incluir repeticiones. Las ventas corresponden a
              pedidos con pago confirmado y excluyen cancelados. No representan
              comisiones.
            </p>
          </div>
        </section>
        <div className={s.insights}>
          <div>
            <span className={s.insightIcon}>
              <Users size={20} />
            </span>
            <div>
              <h3>{loaded ? pending : "—"} accesos pendientes</h3>
              <p>Gestores activos que aún deben completar su primer acceso.</p>
            </div>
            <button
              className={s.iconButton}
              aria-label="Ver gestores pendientes"
              onClick={() => {
                setFilter("pendientes");
                setTab("equipo");
              }}
            >
              <ArrowUpRight size={20} />
            </button>
          </div>
          <div>
            <span className={s.insightIcon}>
              <Link2 size={20} />
            </span>
            <div>
              <h3>El enlace conecta los resultados</h3>
              <p>
                Se atribuye el último enlace del gestor abierto dentro del plazo
                configurado.
              </p>
            </div>
            <button
              className={s.iconButton}
              aria-label="Ver configuración de atribución"
              onClick={() => setTab("configuracion")}
            >
              <ArrowUpRight size={20} />
            </button>
          </div>
        </div>
      </section>
      <section
        id="panel-equipo"
        role="tabpanel"
        aria-labelledby="tab-equipo"
        hidden={tab !== "equipo"}
        className={s.stack}
      >
        <div className={s.sectionHeading}>
          <div>
            <span className={s.kicker}>PERSONAS QUE IMPULSAN TU TIENDA</span>
            <h2>Tu equipo de gestores</h2>
          </div>
          <button
            className={s.primary}
            disabled={!ready || busy}
            onClick={() => setCreator((v) => !v)}
          >
            {creator ? <X size={16} /> : <Plus size={16} />}
            {creator ? "Cerrar formulario" : "Crear cuenta"}
          </button>
        </div>
        <div hidden={!creator}>
          <AccountCreator
            className={`${s.card} ${s.accountCreator}`}
            storeId={storeId}
            onCreated={refresh}
          />
        </div>
        <section className={s.card}>
          <div className={s.teamToolbar}>
            <label className={s.search}>
              <Search size={17} />
              <input
                aria-label="Buscar gestor"
                placeholder="Buscar por nombre o correo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Estado de gestores"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="activos">Activos</option>
              <option value="pendientes">Accesos pendientes</option>
              <option value="inactivos">Desactivados</option>
            </select>
          </div>
          {loading && !loaded ? (
            <div className={s.empty}>Cargando equipo…</div>
          ) : !visible.length ? (
            <div className={s.empty}>
              <Users size={28} />
              <h3>
                {members.length
                  ? "No hay coincidencias"
                  : "Tu equipo empieza aquí"}
              </h3>
              <p>
                {members.length
                  ? "Prueba otro nombre o cambia el filtro de estado."
                  : "Crea una cuenta o invita a alguien que ya use ShareAPP."}
              </p>
            </div>
          ) : (
            <div className={s.roster}>
              {visible.map((m) => (
                <article className={s.member} key={m.id}>
                  <div className={s.memberIdentity}>
                    <span className={s.avatar}>
                      {m.display_name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <h3>{m.display_name}</h3>
                      <p>{m.email || "Correo pendiente de vincular"}</p>
                      <div className={s.memberBadges}>
                        <span
                          className={
                            !m.active
                              ? s.inactive
                              : m.password_pending || !m.user_id
                                ? s.pending
                                : s.active
                          }
                        >
                          {!m.active
                            ? "Desactivado"
                            : m.password_pending || !m.user_id
                              ? "Acceso pendiente"
                              : "Activo"}
                        </span>
                        <span>
                          {m.password_pending
                            ? "Debe definir su contraseña"
                            : m.user_id
                              ? "Cuenta vinculada"
                              : "Invitación pendiente"}
                        </span>
                      </div>
                      {m.invite_code && m.invite_expires_at && (
                        <small>
                          Invitación válida hasta{" "}
                          {new Date(m.invite_expires_at).toLocaleDateString(
                            "es",
                          )}
                        </small>
                      )}
                    </div>
                  </div>
                  <div className={s.memberActions}>
                    {m.password_pending && (
                      <button
                        className={s.secondary}
                        disabled={busy || !m.active}
                        onClick={() =>
                          void action(async () => {
                            const result = await shareappApi<{
                              activationUrl: string;
                            }>("accounts", { storeId, memberId: m.id });
                            setActivationLink(result.activationUrl);
                          })
                        }
                      >
                        <Link2 size={15} /> Activación
                      </button>
                    )}
                    {m.invite_code && (
                      <button
                        className={s.secondary}
                        onClick={() =>
                          void copy(
                            `${window.location.origin}/gestores?invite=${m.invite_code}`,
                          )
                        }
                      >
                        <Copy size={15} /> Invitación
                      </button>
                    )}
                    <button
                      className={m.active ? s.pauseButton : s.secondary}
                      disabled={busy}
                      onClick={() =>
                        void action(() =>
                          shareappApi(
                            "members",
                            { storeId, memberId: m.id, active: !m.active },
                            "PATCH",
                          ),
                        )
                      }
                    >
                      {m.active ? <Pause size={15} /> : <Play size={15} />}{" "}
                      {m.active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {activationLink && (
          <div className={s.activation}>
            <Link2 size={21} />
            <div>
              <h3>Nuevo enlace de activación</h3>
              <p>
                El anterior deja de funcionar. Comparte este enlace solo con el
                gestor.
              </p>
              <input
                readOnly
                aria-label="Nuevo enlace de activación"
                value={activationLink}
              />
              <button
                className={s.secondary}
                onClick={() => void copy(activationLink)}
              >
                <Copy size={15} /> Copiar enlace
              </button>
            </div>
          </div>
        )}
        <details className={s.invite}>
          <summary>
            <span>
              <Mail size={19} />
              <strong>Invitar a un gestor existente</strong>
            </span>
            <Plus size={17} />
          </summary>
          <p>
            Para una persona que ya tiene cuenta. La invitación se vincula a su
            correo, caduca en 7 días y no cambia su contraseña.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                await shareappApi("members", {
                  storeId,
                  displayName: name,
                  email,
                });
                setName("");
                setEmail("");
              });
            }}
          >
            <label>
              Nombre del gestor
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Correo de su cuenta
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button
              className={s.primary}
              disabled={busy || !ready || !name.trim()}
            >
              <Mail size={16} /> Crear invitación
            </button>
          </form>
        </details>
      </section>
      <section
        id="panel-configuracion"
        role="tabpanel"
        aria-labelledby="tab-configuracion"
        hidden={tab !== "configuracion"}
        className={s.stack}
      >
        <div className={s.sectionHeading}>
          <div>
            <span className={s.kicker}>LAS REGLAS DE TU TIENDA</span>
            <h2>Configuración de ShareAPP</h2>
          </div>
        </div>
        <form
          className={`${s.card} ${s.settings}`}
          onSubmit={(e) => {
            e.preventDefault();
            void action(() =>
              shareappApi(
                "members",
                { storeId, enabled, attributionDays: days },
                "PATCH",
              ),
            );
          }}
        >
          <div className={s.settingRow}>
            <div>
              <h3>Habilitar ShareAPP</h3>
              <p>
                Permite que tu equipo comparta enlaces y genere nuevas
                atribuciones.
              </p>
            </div>
            <label className={s.switch}>
              <input
                aria-label="Habilitar ShareAPP en esta tienda"
                type="checkbox"
                checked={enabled}
                disabled={!ready || busy}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span />
            </label>
          </div>
          <div className={s.settingRow}>
            <div>
              <h3>Plazo de atribución</h3>
              <p>
                Tiempo durante el que una compra puede atribuirse al último
                enlace abierto.
              </p>
            </div>
            <label className={s.days}>
              <input
                aria-label="Plazo de atribución en días"
                type="number"
                min={1}
                max={30}
                required
                disabled={!ready || busy}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
              <span>días</span>
            </label>
          </div>
          <div className={s.settingNotice}>
            <ShieldCheck size={20} />
            <p>
              Desactivar ShareAPP detiene los enlaces y las nuevas atribuciones.
              Los resultados históricos se conservan.
            </p>
          </div>
          <button className={s.primary} disabled={!ready || busy}>
            <Check size={17} /> {busy ? "Guardando…" : "Guardar configuración"}
          </button>
        </form>
      </section>
      <section
        id="panel-campanas"
        role="tabpanel"
        aria-labelledby="tab-campanas"
        hidden={tab !== "campanas"}
      >
        {tab === "campanas" && <CampaignPanel storeId={storeId} admin />}
      </section>
      <footer className={s.footer}>
        <ShieldCheck size={14} /> Accesos y resultados exclusivos de {storeName}
        .
      </footer>
    </main>
  );
}
