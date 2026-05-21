// ════════════════════════════════════════════════════════════════
// BK MANAGER DASHBOARD — App.jsx
// Binance Killers — Tablero BI interno
// v2 — Visión completa multi-mes, PnL acumulado real
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── PALETA BK ─────────────────────────────────────────────────
const C = {
  bg:       "#080808",
  bgCard:   "#0f0f0f",
  bgCard2:  "#141414",
  border:   "#1a1a1a",
  border2:  "#222",
  text:     "#f0f0f0",
  muted:    "#666",
  dim:      "#333",
  red:      "#e8192c",
  redDim:   "rgba(232,25,44,0.12)",
  green:    "#22c55e",
  greenDim: "rgba(34,197,94,0.1)",
  amber:    "#f59e0b",
  blue:     "#3b82f6",
  blueDim:  "rgba(59,130,246,0.1)",
};

const meses  = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesesC = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function hoyISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
}
function mesActual() {
  const f = new Date().toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
  const [y, m] = f.split("-");
  return { mes: parseInt(m), anio: parseInt(y) };
}
function mSheet(mes, anio) {
  return `${mesesC[mes-1]}_${String(anio).substring(2)}`;
}
function sheetLabel(sheet) {
  if (!sheet) return "";
  const [m, a] = sheet.split("_");
  const idx = mesesC.indexOf(m);
  return idx >= 0 ? `${meses[idx].charAt(0).toUpperCase()+meses[idx].slice(1)} 20${a}` : sheet;
}
function ultimosMeses(n = 24) {
  const { mes, anio } = mesActual();
  const result = [];
  for (let i = 0; i < n; i++) {
    let m = mes - i; let a = anio;
    if (m <= 0) { m += 12; a -= 1; }
    result.push(mSheet(m, a));
  }
  return result;
}
function fechaCorta(f) {
  if (!f) return "—";
  const [, m, d] = f.split("-");
  return `${parseInt(d)} ${mesesC[parseInt(m)-1]}`;
}
function signo(n) {
  const v = Number(n || 0);
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;
}
function fmt$(n) { return `$${Number(n||0).toLocaleString()}`; }

// PnL de una señal: usa last_tp_hit si tiene, 0 si no tocó nada
function pnlEfectivo(s) {
  if (s.status === "closed_sl") return s.pnl_pct || 0;
  if (s.last_tp_hit > 0) return s.pnl_pct || 0;
  return 0;
}
function pnlX5Efectivo(s) {
  if (s.status === "closed_sl") return s.pnl_x5 || 0;
  if (s.last_tp_hit > 0) return s.pnl_x5 || 0;
  return 0;
}
function esGanadora(s) {
  return s.status === "closed_tp" || (s.last_tp_hit > 0 && s.status !== "closed_sl");
}
function esPerdedora(s) {
  return s.status === "closed_sl";
}

// ── COMPONENTES BASE ──────────────────────────────────────────

function KPI({ label, value, color = C.red, sub }) {
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: "16px 18px",
      borderTop: `2px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Badge({ text, type = "default" }) {
  const s = {
    tp:      { bg: C.greenDim, color: C.green },
    sl:      { bg: C.redDim,   color: C.red   },
    active:  { bg: C.blueDim,  color: C.blue  },
    pending: { bg: "#1a1a1a",  color: C.muted },
    default: { bg: "#1a1a1a",  color: C.muted },
    expired: { bg: C.redDim,   color: C.red   },
    vence:   { bg: "rgba(245,158,11,0.1)", color: C.amber },
    active_tp: { bg: "rgba(34,197,94,0.15)", color: C.green },
  }[type] || { bg: "#1a1a1a", color: C.muted };
  return (
    <span style={{
      display: "inline-block", padding: "3px 9px", borderRadius: 5,
      fontSize: 11, fontWeight: 700, background: s.bg, color: s.color,
    }}>{text}</span>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: C.muted,
      textTransform: "uppercase", letterSpacing: "0.1em",
      borderLeft: `3px solid ${C.red}`, paddingLeft: 10, marginBottom: 14,
    }}>{children}</div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}>
      <div style={{
        width: 28, height: 28, border: `2px solid ${C.border2}`,
        borderTopColor: C.red, borderRadius: "50%",
        animation: "spin 0.8s linear infinite", margin: "0 auto 10px",
      }} />
      <div style={{ fontSize: 12 }}>Cargando...</div>
    </div>
  );
}

function FiltroMes({ value, onChange, mesesDisponibles = [] }) {
  const lista = mesesDisponibles.length > 0 ? mesesDisponibles : ultimosMeses(6);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
      <button onClick={() => onChange("all")} style={{
        padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: `1px solid ${value === "all" ? C.red : C.border2}`,
        background: value === "all" ? C.redDim : "transparent",
        color: value === "all" ? C.red : C.muted, cursor: "pointer",
      }}>Todos</button>
      {lista.map(s => (
        <button key={s} onClick={() => onChange(s)} style={{
          padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          border: `1px solid ${value === s ? C.red : C.border2}`,
          background: value === s ? C.redDim : "transparent",
          color: value === s ? C.red : C.muted, cursor: "pointer",
        }}>{sheetLabel(s)}</button>
      ))}
    </div>
  );
}

const TT = {
  contentStyle: { background: C.bgCard2, border: `1px solid ${C.border2}`, borderRadius: 8, fontSize: 12 },
  labelStyle: { color: C.muted },
  itemStyle: { color: C.text },
};

// ════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) { setErr(error.message); setLoading(false); return; }
    onLogin(data.session);
  }

  return (
    <div style={{
      minHeight: "100dvh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 38, height: 38, background: C.red, borderRadius: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 900, color: "#fff",
            }}>B</div>
            <span style={{ fontSize: 21, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>
              Binance <span style={{ color: C.red }}>Killers</span>
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>Manager Dashboard</div>
        </div>
        <form onSubmit={submit} style={{
          background: C.bgCard, border: `1px solid ${C.border2}`, borderRadius: 16, padding: 28,
        }}>
          {[
            { label: "Email", type: "email", value: email, set: setEmail },
            { label: "Contraseña", type: "password", value: pass, set: setPass },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</label>
              <input
                type={f.type} value={f.value} onChange={e => f.set(e.target.value)} required
                style={{
                  width: "100%", padding: "12px 14px", background: C.bg,
                  border: `1px solid ${C.border2}`, borderRadius: 10,
                  color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          ))}
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 14 }}>{err}</div>}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: 13, background: loading ? C.dim : C.red,
            border: "none", borderRadius: 10, color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", marginTop: 8,
          }}>{loading ? "Entrando..." : "Ingresar"}</button>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB INICIO — Vista BI completa
// ════════════════════════════════════════════════════════════════
function TabInicio() {
  const [d, setD]       = useState(null);
  const [loading, setL] = useState(true);

  useEffect(() => {
    async function load() {
      // Traer TODAS las señales de todos los meses
      const [
        { data: todasSenales },
        { data: miembros },
        { data: todosPageos },
      ] = await Promise.all([
        supabase.from("signals").select("id,status,pnl_pct,pnl_x5,last_tp_hit,month_sheet,coin").order("id"),
        supabase.from("members").select("id,status,end_date"),
        supabase.from("payments").select("amount,payment_date"),
      ]);

      const senales = todasSenales || [];
      const pagos   = todosPageos  || [];

      // Agrupar por mes
      const porMes = {};
      senales.forEach(s => {
        if (!porMes[s.month_sheet]) {
          porMes[s.month_sheet] = { sheet: s.month_sheet, senales: [] };
        }
        porMes[s.month_sheet].senales.push(s);
      });

      // Calcular stats por mes
      const mesesData = Object.values(porMes).map(({ sheet, senales: ms }) => {
        const ganadoras = ms.filter(esGanadora);
        const perdedoras = ms.filter(esPerdedora);
        const total = ganadoras.length + perdedoras.length;
        const pnl   = ms.reduce((a, s) => a + pnlEfectivo(s), 0);
        const pnlX5 = ms.reduce((a, s) => a + pnlX5Efectivo(s), 0);
        const wr    = total > 0 ? (ganadoras.length / total) * 100 : 0;
        return {
          sheet, label: sheetLabel(sheet),
          ganadoras: ganadoras.length,
          perdedoras: perdedoras.length,
          activas: ms.filter(s => s.status === "active").length,
          total: ms.length,
          pnl: parseFloat(pnl.toFixed(1)),
          pnlX5: parseFloat(pnlX5.toFixed(1)),
          winrate: parseFloat(wr.toFixed(1)),
        };
      }).sort((a, b) => a.sheet.localeCompare(b.sheet));

      // KPIs globales
      const pnlTotal   = senales.reduce((a, s) => a + pnlEfectivo(s), 0);
      const pnlTotalX5 = senales.reduce((a, s) => a + pnlX5Efectivo(s), 0);
      const ganTotales  = senales.filter(esGanadora).length;
      const perTotales  = senales.filter(esPerdedora).length;
      const wrTotal     = (ganTotales + perTotales) > 0
        ? (ganTotales / (ganTotales + perTotales)) * 100 : 0;
      const activasTotales = senales.filter(s => s.status === "active").length;

      // Alertas vencimientos
      const hoy = hoyISO();
      const en7 = new Date(new Date(hoy+"T12:00:00").getTime()+7*86400000).toISOString().split("T")[0];
      const porVencer = (miembros||[]).filter(m =>
        m.status === "active" && m.end_date && m.end_date >= hoy && m.end_date <= en7
      ).length;

      setD({
        mesesData,
        pnlTotal: pnlTotal.toFixed(1),
        pnlTotalX5: pnlTotalX5.toFixed(1),
        wrTotal: wrTotal.toFixed(1),
        ganTotales,
        perTotales,
        activasTotales,
        miembrosActivos: (miembros||[]).filter(m => m.status === "active").length,
        porVencer,
        totalSenales: senales.length,
      });
      setL(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: "20px 16px 100px" }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>
          Centro de <span style={{ color: C.red }}>Mando</span>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
          Visión general — todos los períodos
        </div>
      </div>

      {/* Alerta vencimientos */}
      {d.porVencer > 0 && (
        <div style={{
          background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>
              {d.porVencer} membresía{d.porVencer>1?"s":""} vence{d.porVencer>1?"n":""} esta semana
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>Revisá la sección Miembros</div>
          </div>
        </div>
      )}

      {/* KPIs globales */}
      <SectionTitle>Acumulado histórico</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <KPI label="PnL total" value={`${signo(d.pnlTotal)}%`} color={parseFloat(d.pnlTotal) >= 0 ? C.green : C.red} />
        <KPI label="PnL total x5" value={`${signo(d.pnlTotalX5)}%`} color={parseFloat(d.pnlTotalX5) >= 0 ? C.green : C.red} />
        <KPI label="Winrate global" value={`${d.wrTotal}%`} color={C.amber} />
        <KPI label="Total señales" value={d.totalSenales} color={C.text} sub={`${d.ganTotales} gan · ${d.perTotales} per`} />
        <KPI label="Señales activas" value={d.activasTotales} color={C.blue} />
        <KPI label="Miembros VIP" value={d.miembrosActivos} color={C.green} />
      </div>

      {/* Gráfico PnL por mes */}
      {d.mesesData.length > 0 && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", marginBottom: 16 }}>
          <SectionTitle>PnL por mes (%)</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={d.mesesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false}
                tickFormatter={l => l.split(" ")[0]} />
              <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} formatter={(v, n) => [`${v > 0 ? "+" : ""}${v}%`, "PnL"]} />
              <Bar dataKey="pnl" radius={[4,4,0,0]}>
                {d.mesesData.map((e, i) => (
                  <Cell key={i} fill={e.pnl >= 0 ? C.green : C.red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla resumen por mes */}
      {d.mesesData.length > 0 && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", marginBottom: 16 }}>
          <SectionTitle>Resumen por mes</SectionTitle>
          {d.mesesData.map((m, i) => (
            <div key={m.sheet} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 0",
              borderBottom: i < d.mesesData.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{m.label}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {m.ganadoras}✅ · {m.perdedoras}❌ · {m.activas} activas · WR {m.winrate}%
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: m.pnl >= 0 ? C.green : C.red }}>
                  {signo(m.pnl)}%
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {signo(m.pnlX5)}% x5
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Winrate por mes */}
      {d.mesesData.length > 0 && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px" }}>
          <SectionTitle>Winrate por mes (%)</SectionTitle>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={d.mesesData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false}
                tickFormatter={l => l.split(" ")[0]} />
              <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...TT} formatter={v => [`${v}%`, "Winrate"]} />
              <Line type="monotone" dataKey="winrate" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB SEÑALES — Multi-mes con PnL acumulado real
// ════════════════════════════════════════════════════════════════
function TabSenales() {
  const [senales, setSenales]   = useState([]);
  const [todos, setTodos]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState("all");
  const [sheet, setSheet]       = useState("all");
  const [mesesDisp, setMesesDisp] = useState([]);

  // Cargar todos los meses disponibles una vez
  useEffect(() => {
    async function loadMeses() {
      const { data } = await supabase
        .from("signals")
        .select("month_sheet")
        .order("id", { ascending: false });
      if (data) {
        const unicos = [...new Set(data.map(s => s.month_sheet))].filter(Boolean);
        setMesesDisp(unicos);
      }
    }
    loadMeses();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase.from("signals").select("*").order("id", { ascending: false });
      if (sheet !== "all") q = q.eq("month_sheet", sheet);
      if (status !== "all") q = q.eq("status", status);
      const { data } = await q.limit(100);
      setSenales(data || []);
      setLoading(false);
    }
    load();
  }, [status, sheet]);

  // Stats del filtro actual
  const ganadorasFiltro  = senales.filter(esGanadora);
  const perdedorasFiltro = senales.filter(esPerdedora);
  const pnlFiltro        = senales.reduce((a, s) => a + pnlEfectivo(s), 0);
  const pnlX5Filtro      = senales.reduce((a, s) => a + pnlX5Efectivo(s), 0);
  const wrFiltro         = (ganadorasFiltro.length + perdedorasFiltro.length) > 0
    ? (ganadorasFiltro.length / (ganadorasFiltro.length + perdedorasFiltro.length)) * 100 : 0;

  function statusBadge(s) {
    if (s.status === "closed_tp") return <Badge text={`TP${s.last_tp_hit||""}`} type="tp" />;
    if (s.status === "closed_sl") return <Badge text="SL" type="sl" />;
    if (s.status === "active" && s.last_tp_hit > 0) return <Badge text={`activa TP${s.last_tp_hit}`} type="active_tp" />;
    if (s.status === "active")    return <Badge text="activa" type="active" />;
    return <Badge text="no activó" type="pending" />;
  }

  return (
    <div style={{ padding: "20px 16px 100px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", marginBottom: 20 }}>
        Señales
      </div>

      {/* Filtro mes */}
      <FiltroMes value={sheet} onChange={setSheet} mesesDisponibles={mesesDisp} />

      {/* Filtro status */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { id: "all",           label: "Todas" },
          { id: "active",        label: "Activas" },
          { id: "closed_tp",     label: "TP" },
          { id: "closed_sl",     label: "SL" },
          { id: "not_triggered", label: "No activó" },
        ].map(op => (
          <button key={op.id} onClick={() => setStatus(op.id)} style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: `1px solid ${status === op.id ? C.red : C.border2}`,
            background: status === op.id ? C.redDim : "transparent",
            color: status === op.id ? C.red : C.muted, cursor: "pointer",
          }}>{op.label}</button>
        ))}
      </div>

      {/* Resumen del filtro */}
      {!loading && senales.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 8, marginBottom: 16,
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "14px 16px",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>PnL</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: pnlFiltro >= 0 ? C.green : C.red }}>
              {signo(pnlFiltro)}%
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>PnL x5</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: pnlX5Filtro >= 0 ? C.green : C.red }}>
              {signo(pnlX5Filtro)}%
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>WR</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.amber }}>
              {wrFiltro.toFixed(0)}%
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Señales</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
              {senales.length}
            </div>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {senales.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 13 }}>
              No hay señales con estos filtros
            </div>
          )}
          {senales.map(s => (
            <div key={s.id} style={{
              background: C.bgCard,
              border: `1px solid ${s.status === "closed_sl" ? "rgba(232,25,44,0.2)" : s.last_tp_hit > 0 ? "rgba(34,197,94,0.15)" : C.border}`,
              borderRadius: 12, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>#{s.id}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{s.pair}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{sheetLabel(s.month_sheet)}</span>
                </div>
                {statusBadge(s)}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>Entrada</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    {s.entry_min}{s.entry_max ? `–${s.entry_max}` : ""}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>SL</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>{s.sl}</div>
                </div>
                {pnlEfectivo(s) !== 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>PnL</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: pnlEfectivo(s) >= 0 ? C.green : C.red }}>
                      {signo(pnlEfectivo(s))}% ({signo(pnlX5Efectivo(s))}% x5)
                    </div>
                  </div>
                )}
              </div>
              {s.analysis && (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                  {s.analysis}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB MIEMBROS
// ════════════════════════════════════════════════════════════════
function TabMiembros() {
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filtro, setFiltro]     = useState("active");

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase.from("members").select("*").order("name");
      if (filtro !== "all") q = q.eq("status", filtro);
      const { data } = await q;
      setMiembros(data || []);
      setLoading(false);
    }
    load();
  }, [filtro]);

  const hoy = hoyISO();
  const en7 = new Date(new Date(hoy+"T12:00:00").getTime()+7*86400000).toISOString().split("T")[0];

  function planColor(plan) {
    if (plan === "lifetime")  return C.amber;
    if (plan === "yearly")    return C.green;
    if (plan === "quarterly") return C.blue;
    return C.text;
  }

  return (
    <div style={{ padding: "20px 16px 100px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", marginBottom: 20 }}>
        Miembros <span style={{ color: C.red }}>VIP</span>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { id: "active",  label: "Activos" },
          { id: "expired", label: "Vencidos" },
          { id: "all",     label: "Todos" },
        ].map(op => (
          <button key={op.id} onClick={() => setFiltro(op.id)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: `1px solid ${filtro === op.id ? C.red : C.border2}`,
            background: filtro === op.id ? C.redDim : "transparent",
            color: filtro === op.id ? C.red : C.muted, cursor: "pointer",
          }}>{op.label}</button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 13, color: C.muted, alignSelf: "center" }}>
          {miembros.length} miembros
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {miembros.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 13 }}>
              No hay miembros
            </div>
          )}
          {miembros.map(m => {
            const porVencer = m.end_date && m.end_date >= hoy && m.end_date <= en7;
            return (
              <div key={m.id} style={{
                background: C.bgCard,
                border: `1px solid ${porVencer ? "rgba(245,158,11,0.3)" : C.border}`,
                borderRadius: 12, padding: "14px 16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{m.name}</div>
                    {m.telegram_id && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{m.telegram_id}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: planColor(m.plan) }}>{m.plan}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{fmt$(m.amount_paid)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    {m.end_date ? `Vence: ${fechaCorta(m.end_date)}` : "Lifetime ∞"}
                    {m.phone && <span style={{ marginLeft: 10 }}>📱 {m.phone}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {porVencer && <Badge text="vence pronto" type="vence" />}
                    {m.status !== "active" && <Badge text={m.status} type="expired" />}
                  </div>
                </div>
                {m.discount > 0 && (
                  <div style={{ fontSize: 11, color: C.amber }}>
                    {(m.discount * 100).toFixed(0)}% descuento aplicado
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB FINANZAS
// ════════════════════════════════════════════════════════════════
function TabFinanzas() {
  const [d, setD]       = useState(null);
  const [loading, setL] = useState(true);
  const { mes, anio }   = mesActual();

  useEffect(() => {
    async function load() {
      const hace6 = new Date();
      hace6.setMonth(hace6.getMonth() - 5);
      const desde = `${hace6.getFullYear()}-${String(hace6.getMonth()+1).padStart(2,"0")}-01`;

      const [{ data: pagos }, { data: pagosMes }, { data: miembros }] = await Promise.all([
        supabase.from("payments").select("amount,payment_date").gte("payment_date", desde).order("payment_date"),
        supabase.from("payments").select("amount,amount_base,discount,plan,members(name)")
          .gte("payment_date", `${anio}-${String(mes).padStart(2,"0")}-01`)
          .lte("payment_date", `${anio}-${String(mes).padStart(2,"0")}-31`)
          .order("payment_date", { ascending: false }),
        supabase.from("members").select("plan,amount_paid,status").eq("status", "active"),
      ]);

      const porMes = {};
      for (let i = 5; i >= 0; i--) {
        let m = mes - i; let a = anio;
        if (m <= 0) { m += 12; a -= 1; }
        const key = `${a}-${String(m).padStart(2,"0")}`;
        porMes[key] = { mes: `${mesesC[m-1]} ${String(a).substring(2)}`, total: 0 };
      }
      (pagos||[]).forEach(p => {
        const key = p.payment_date.substring(0,7);
        if (porMes[key]) porMes[key].total += p.amount || 0;
      });

      const chartData   = Object.values(porMes);
      const totalMes    = (pagosMes||[]).reduce((a, p) => a + (p.amount||0), 0);
      const porPlan     = { monthly: 0, quarterly: 0, yearly: 0, lifetime: 0 };
      (miembros||[]).forEach(m => { if (porPlan[m.plan] !== undefined) porPlan[m.plan]++; });

      setD({ chartData, pagosMes: pagosMes||[], totalMes, porPlan });
      setL(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  const planData = [
    { name: "Monthly",   value: d.porPlan.monthly,   fill: C.blue  },
    { name: "Quarterly", value: d.porPlan.quarterly,  fill: C.green },
    { name: "Yearly",    value: d.porPlan.yearly,     fill: C.amber },
    { name: "Lifetime",  value: d.porPlan.lifetime,   fill: C.red   },
  ].filter(x => x.value > 0);

  return (
    <div style={{ padding: "20px 16px 100px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", marginBottom: 20 }}>
        Finanzas
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <KPI label="Ingresos este mes" value={fmt$(d.totalMes)} color={C.green} />
        <KPI label="Pagos este mes" value={d.pagosMes.length} color={C.blue} />
      </div>

      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", marginBottom: 16 }}>
        <SectionTitle>Ingresos últimos 6 meses</SectionTitle>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={d.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
            <Tooltip {...TT} formatter={v => [`$${v.toLocaleString()}`, "Ingresos"]} />
            <Bar dataKey="total" fill={C.red} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {planData.length > 0 && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", marginBottom: 16 }}>
          <SectionTitle>Miembros activos por plan</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
            <ResponsiveContainer width="45%" height={100}>
              <PieChart>
                <Pie data={planData} dataKey="value" innerRadius={25} outerRadius={44} paddingAngle={3}>
                  {planData.map((e,i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip {...TT} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {planData.map((item,i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.fill }} />
                  <span style={{ fontSize: 12, color: C.muted }}>{item.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: item.fill, marginLeft: 4 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px" }}>
        <SectionTitle>Pagos recientes</SectionTitle>
        {d.pagosMes.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontSize: 13 }}>Sin pagos este mes</div>
        )}
        {d.pagosMes.map((p, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: i < d.pagosMes.length-1 ? `1px solid ${C.border}` : "none",
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.members?.name || "—"}</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {p.plan}
                {p.discount > 0 && <span style={{ color: C.amber, marginLeft: 6 }}>{(p.discount*100).toFixed(0)}% desc</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{fmt$(p.amount)}</div>
              {p.discount > 0 && p.amount_base && (
                <div style={{ fontSize: 11, color: C.muted, textDecoration: "line-through" }}>{fmt$(p.amount_base)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession]   = useState(null);
  const [tab, setTab]           = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (checking) return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 32, height: 32, border: `2px solid ${C.border2}`,
        borderTopColor: C.red, borderRadius: "50%", animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );

  if (!session) return <Login onLogin={s => setSession(s)} />;

  const tabs = [
    { label: "Inicio",   icon: "⚡", component: <TabInicio /> },
    { label: "Señales",  icon: "📡", component: <TabSenales /> },
    { label: "Miembros", icon: "👥", component: <TabMiembros /> },
    { label: "Finanzas", icon: "💰", component: <TabFinanzas /> },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`, padding: "14px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, background: C.red, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#fff",
          }}>B</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: "-0.01em" }}>
            BK <span style={{ color: C.red }}>Manager</span>
          </span>
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{
          background: "transparent", border: `1px solid ${C.border2}`,
          borderRadius: 8, color: C.muted, fontSize: 12, padding: "6px 12px", cursor: "pointer",
        }}>Salir</button>
      </div>

      <div style={{ minHeight: "calc(100dvh - 120px)" }}>
        {tabs[tab].component}
      </div>

      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "rgba(8,8,8,0.97)", backdropFilter: "blur(12px)",
        borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-around", padding: "8px 0 12px",
        zIndex: 100,
      }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "transparent", border: "none", cursor: "pointer", flex: 1, padding: "4px 0",
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: tab === i ? 700 : 400,
              color: tab === i ? C.red : C.muted, letterSpacing: "0.03em",
            }}>{t.label}</span>
            {tab === i && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.red }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
