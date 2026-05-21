// BK MANAGER DASHBOARD v3 — BI Visual Completo
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const C = {
  bg:"#060608", card:"rgba(12,12,16,0.85)", card2:"rgba(16,16,20,0.9)",
  border:"#1c1c22", border2:"#26262f", text:"#f0f0f5", muted:"#55556a", dim:"#2a2a35",
  red:"#e8192c", redD:"rgba(232,25,44,0.12)", redG:"rgba(232,25,44,0.3)",
  green:"#22c55e", greenD:"rgba(34,197,94,0.12)",
  amber:"#f59e0b", amberD:"rgba(245,158,11,0.12)",
  blue:"#3b82f6", blueD:"rgba(59,130,246,0.12)",
  purple:"#a855f7", purpleD:"rgba(168,85,247,0.12)",
};
const PLAN_C = {monthly:C.blue, quarterly:C.green, yearly:C.amber, lifetime:C.red};
const meses  = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesesC = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function hoyISO(){ return new Date().toLocaleDateString("en-CA",{timeZone:"America/La_Paz"}); }
function mesActual(){ const [y,m]=new Date().toLocaleDateString("en-CA",{timeZone:"America/La_Paz"}).split("-"); return {mes:parseInt(m),anio:parseInt(y)}; }
function mSheet(m,a){ return `${mesesC[m-1]}_${String(a).substring(2)}`; }
function sheetLabel(s){ if(!s)return""; const[m,a]=s.split("_"); const i=mesesC.indexOf(m); return i>=0?`${meses[i][0].toUpperCase()+meses[i].slice(1)} 20${a}`:s; }
function ultimosMeses(n=24){ const{mes,anio}=mesActual(); const r=[]; for(let i=0;i<n;i++){let m=mes-i,a=anio; if(m<=0){m+=12;a--;} r.push(mSheet(m,a));} return r; }
function fechaCorta(f){ if(!f)return"—"; const[,m,d]=f.split("-"); return `${parseInt(d)} ${mesesC[parseInt(m)-1]}`; }
function signo(n){ const v=Number(n||0); return `${v>=0?"+":""}${v.toFixed(1)}`; }
function fmt$(n){ return `$${Number(n||0).toLocaleString()}`; }
function pnlX5(s){ return s.status==="closed_sl"||s.last_tp_hit>0?(s.pnl_x5||0):0; }
function esGan(s){ return s.status==="closed_tp"||(s.last_tp_hit>0&&s.status!=="closed_sl"); }
function esPer(s){ return s.status==="closed_sl"; }

// ── CSS GLOBAL ────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;} body{font-family:'DM Sans',sans-serif!important;background:#060608!important;margin:0;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(232,25,44,.4)}50%{box-shadow:0 0 0 8px rgba(232,25,44,0)}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(232,25,44,.35)}50%{box-shadow:0 0 24px rgba(232,25,44,.7)}}
@keyframes bgMove{0%,100%{transform:translate(0,0) rotate(0)}33%{transform:translate(4%,-3%) rotate(1.5deg)}66%{transform:translate(-3%,4%) rotate(-1.5deg)}}
@keyframes float0{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-30px)}}
@keyframes float1{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,25px)}}
@keyframes float2{0%,100%{transform:translate(0,0)}33%{transform:translate(15px,-15px)}66%{transform:translate(-15px,15px)}}
@keyframes breathe{0%,100%{opacity:.2}50%{opacity:.65}}
.tap{transition:transform .12s,opacity .12s;cursor:pointer;} .tap:active{transform:scale(.96);opacity:.85;}
`;

// ── FONDO ─────────────────────────────────────────────────────
function Fondo() {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      <div style={{position:"absolute",top:"-50%",left:"-50%",width:"200%",height:"200%",
        background:`radial-gradient(circle at 20% 30%,rgba(232,25,44,.06),transparent 50%),
                    radial-gradient(circle at 80% 70%,rgba(59,130,246,.04),transparent 50%),
                    radial-gradient(circle at 50% 90%,rgba(168,85,247,.03),transparent 50%)`,
        animation:"bgMove 30s ease-in-out infinite"}}/>
      {[...Array(10)].map((_,i)=>(
        <div key={i} style={{position:"absolute",
          width:2+Math.random()*2,height:2+Math.random()*2,
          background:i%3===0?C.red:i%3===1?C.blue:C.purple,
          borderRadius:"50%",opacity:.06+Math.random()*.15,
          left:`${10+Math.random()*80}%`,top:`${10+Math.random()*80}%`,
          animation:`float${i%3} ${20+Math.random()*12}s ease-in-out infinite`,
          animationDelay:`${Math.random()*6}s`}}/>
      ))}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,
        background:`linear-gradient(90deg,transparent,rgba(232,25,44,.3),transparent)`,
        animation:"breathe 5s ease-in-out infinite"}}/>
    </div>
  );
}

// ── NÚMERO ANIMADO ────────────────────────────────────────────
function AnimNum({value, prefix="", suffix="", decimals=0}) {
  const [cur,setCur] = useState(0);
  const raf = useRef();
  useEffect(()=>{
    const target = parseFloat(value)||0;
    const dur = 900, start = Date.now();
    const tick = ()=>{
      const p = Math.min((Date.now()-start)/dur,1);
      const ease = 1-Math.pow(1-p,3);
      setCur(parseFloat((target*ease).toFixed(decimals)));
      if(p<1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf.current);
  },[value]);
  return <>{prefix}{decimals>0?cur.toFixed(decimals):cur.toLocaleString()}{suffix}</>;
}

// ── KPI CARD ─────────────────────────────────────────────────
function KPI({label,value,sub,color=C.red,icon,alerta,delay=0,anim=false,animVal,prefix="",suffix=""}) {
  return (
    <div className="tap" style={{
      background:"linear-gradient(135deg,rgba(12,12,16,.95),rgba(16,16,22,.8))",
      backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",
      border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 14px",
      position:"relative",overflow:"hidden",
      animation:`fadeUp .45s ease-out ${delay}s both`,
    }}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:color,boxShadow:`0 0 12px ${color}60`}}/>
      {alerta&&<div style={{position:"absolute",top:10,right:10,width:7,height:7,background:C.red,borderRadius:"50%",animation:"pulse 1.5s infinite"}}/>}
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:7}}>
        {icon&&<span style={{fontSize:13}}>{icon}</span>}
        <span style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".07em",fontWeight:700}}>{label}</span>
      </div>
      <div style={{fontSize:"clamp(18px,5vw,26px)",fontWeight:900,color,letterSpacing:"-.025em",lineHeight:1}}>
        {anim ? <AnimNum value={animVal||value} prefix={prefix} suffix={suffix} decimals={1}/> : value}
      </div>
      {sub&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>{sub}</div>}
    </div>
  );
}

// ── CARD ──────────────────────────────────────────────────────
function Card({title,children,delay=0,right}) {
  return (
    <div style={{
      background:"rgba(12,12,16,.8)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",
      border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 16px 14px",marginBottom:14,
      animation:`fadeUp .5s ease-out ${delay}s both`,
    }}>
      {(title||right)&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          {title&&<span style={{fontSize:10,fontWeight:700,color:C.red,textTransform:"uppercase",letterSpacing:".1em"}}>{title}</span>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

// ── BADGE ─────────────────────────────────────────────────────
function Badge({text,type="default"}) {
  const s={
    tp:{bg:C.greenD,c:C.green},sl:{bg:C.redD,c:C.red},
    active:{bg:C.blueD,c:C.blue},atp:{bg:C.greenD,c:C.green},
    vence:{bg:C.amberD,c:C.amber},exp:{bg:C.redD,c:C.red},
    ok:{bg:C.greenD,c:C.green},default:{bg:C.dim,c:C.muted},
  }[type]||{bg:C.dim,c:C.muted};
  return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:5,fontSize:11,fontWeight:700,background:s.bg,color:s.c}}>{text}</span>;
}

// ── SPINNER ───────────────────────────────────────────────────
function Spin() {
  return (
    <div style={{textAlign:"center",padding:"56px 0",color:C.muted}}>
      <div style={{width:32,height:32,border:`2px solid ${C.border2}`,borderTopColor:C.red,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
      <div style={{fontSize:12,letterSpacing:".05em"}}>Cargando...</div>
    </div>
  );
}

const TT = {
  contentStyle:{background:"#0c0c10",border:`1px solid ${C.border2}`,borderRadius:10,fontSize:12,padding:"8px 12px"},
  labelStyle:{color:C.muted,marginBottom:4},itemStyle:{color:C.text},
  cursor:{fill:"rgba(255,255,255,.04)"},
};

// ════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════
function Login({onLogin}) {
  const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const [loading,setL]=useState(false); const [err,setErr]=useState("");
  async function submit(e) {
    e.preventDefault(); setL(true); setErr("");
    const {data,error}=await supabase.auth.signInWithPassword({email,password:pass});
    if(error){setErr(error.message);setL(false);return;}
    onLogin(data.session);
  }
  return (
    <><style>{CSS}</style>
    <div style={{minHeight:"100dvh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,position:"relative"}}>
      <Fondo/>
      <div style={{width:"100%",maxWidth:380,position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:44,height:44,background:C.red,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#fff",animation:"glow 3s ease-in-out infinite"}}>B</div>
            <span style={{fontSize:22,fontWeight:900,color:C.text,letterSpacing:"-.025em"}}>Binance <span style={{color:C.red}}>Killers</span></span>
          </div>
          <div style={{fontSize:13,color:C.muted}}>Manager Dashboard</div>
        </div>
        <form onSubmit={submit} style={{background:"rgba(12,12,16,.92)",backdropFilter:"blur(24px)",border:`1px solid ${C.border2}`,borderRadius:20,padding:28}}>
          {[{l:"Email",t:"email",v:email,s:setEmail},{l:"Contraseña",t:"password",v:pass,s:setPass}].map(f=>(
            <div key={f.l} style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:".07em"}}>{f.l}</label>
              <input type={f.t} value={f.v} onChange={e=>f.s(e.target.value)} required style={{width:"100%",padding:"12px 14px",background:"rgba(0,0,0,.4)",border:`1px solid ${C.border2}`,borderRadius:11,color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
          {err&&<div style={{color:C.red,fontSize:13,marginBottom:14}}>{err}</div>}
          <button type="submit" disabled={loading} style={{width:"100%",padding:13,background:loading?C.dim:C.red,border:"none",borderRadius:11,color:"#fff",fontSize:14,fontWeight:800,cursor:loading?"default":"pointer",marginTop:8,boxShadow:loading?"none":`0 4px 24px ${C.redG}`}}>
            {loading?"Entrando...":"Ingresar"}
          </button>
        </form>
      </div>
    </div></>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB INICIO — Dashboard BI multi-período
// ════════════════════════════════════════════════════════════════
function TabInicio() {
  const [d,setD]=useState(null); const [loading,setL]=useState(true);
  useEffect(()=>{
    async function load() {
      const [{data:senales},{data:miembros},{data:pagos}] = await Promise.all([
        supabase.from("signals").select("status,pnl_pct,pnl_x5,last_tp_hit,month_sheet").order("id"),
        supabase.from("members").select("status,end_date,plan,amount_paid"),
        supabase.from("payments").select("amount,payment_date").order("payment_date"),
      ]);
      const todas=senales||[];
      const pnlAcum=todas.reduce((a,s)=>a+pnlX5(s),0);
      const gan=todas.filter(esGan).length, per=todas.filter(esPer).length;
      const wr=(gan+per)>0?(gan/(gan+per))*100:0;
      const activas=todas.filter(s=>s.status==="active").length;

      // Datos por mes para gráficos
      const mesMap={};
      todas.forEach(s=>{
        if(!s.month_sheet)return;
        if(!mesMap[s.month_sheet])mesMap[s.month_sheet]={pnl:0,gan:0,per:0,tot:0};
        mesMap[s.month_sheet].pnl+=pnlX5(s);
        if(esGan(s))mesMap[s.month_sheet].gan++;
        if(esPer(s))mesMap[s.month_sheet].per++;
        mesMap[s.month_sheet].tot++;
      });
      const mesesChart=Object.entries(mesMap).sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([k,v])=>({label:sheetLabel(k).split(" ")[0],pnl:parseFloat(v.pnl.toFixed(1)),gan:v.gan,per:v.per,wr:parseFloat((v.gan+v.per>0?(v.gan/(v.gan+v.per))*100:0).toFixed(1))}));

      // Ingresos por mes
      const ingMap={};
      (pagos||[]).forEach(p=>{
        if(!p.payment_date)return;
        const k=p.payment_date.substring(0,7);
        ingMap[k]=(ingMap[k]||0)+(p.amount||0);
      });
      const ingChart=Object.entries(ingMap).sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([k,v])=>({label:`${mesesC[parseInt(k.split("-")[1])-1]} ${k.split("-")[0].substring(2)}`,ingresos:parseFloat(v.toFixed(0))}));

      const hoy=hoyISO();
      const en7=new Date(new Date(hoy+"T12:00:00").getTime()+7*86400000).toISOString().split("T")[0];
      const pv=(miembros||[]).filter(m=>m.status==="active"&&m.end_date&&m.end_date>=hoy&&m.end_date<=en7).length;
      const mAct=(miembros||[]).filter(m=>m.status==="active").length;
      const ingTotal=(pagos||[]).reduce((a,p)=>a+(p.amount||0),0);

      setD({pnlAcum,wr,gan,per,activas,mAct,pv,mesesChart,ingChart,ingTotal,totalSen:todas.length});
      setL(false);
    }
    load();
  },[]);
  if(loading)return <Spin/>;

  return (
    <div style={{padding:"20px 16px 100px"}}>
      <div style={{marginBottom:20,animation:"fadeUp .4s ease-out"}}>
        <div style={{fontSize:24,fontWeight:900,color:C.text,letterSpacing:"-.025em"}}>Centro de <span style={{color:C.red}}>Mando</span></div>
        <div style={{fontSize:12,color:C.muted,marginTop:2}}>Rendimiento acumulado histórico</div>
      </div>

      {d.pv>0&&(
        <div style={{background:C.amberD,border:"1px solid rgba(245,158,11,.25)",borderRadius:12,padding:"11px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center",animation:"fadeUp .4s ease-out"}}>
          <span>⚠️</span><div style={{fontSize:13,fontWeight:700,color:C.amber}}>{d.pv} membresía{d.pv>1?"s":""} vence{d.pv>1?"n":""} esta semana</div>
        </div>
      )}

      {/* KPIs principales */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <KPI label="PnL acum x5" value={`${signo(d.pnlAcum)}%`} color={d.pnlAcum>=0?C.green:C.red} icon="📈" delay={.05}
          sub={`${d.gan} gan · ${d.per} per`}/>
        <KPI label="Winrate" value={`${d.wr.toFixed(1)}%`} color={C.amber} icon="🎯" delay={.1}/>
        <KPI label="Señales activas" value={d.activas} color={C.blue} icon="📡" delay={.15} sub={`${d.totalSen} total`}/>
        <KPI label="Miembros VIP" value={d.mAct} color={C.green} icon="👥" delay={.2} sub={fmt$(d.ingTotal)+" total"}/>
      </div>

      {/* Gráfico PnL x5 por mes */}
      {d.mesesChart.length>0&&(
        <Card title="PnL x5 por mes" delay={.25}>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={d.mesesChart} margin={{top:4,right:4,left:-24,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="label" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT} formatter={v=>[`${v>0?"+":""}${v}%`,"PnL x5"]}/>
              <Bar dataKey="pnl" radius={[5,5,0,0]} maxBarSize={40}>
                {d.mesesChart.map((e,i)=><Cell key={i} fill={e.pnl>=0?C.green:C.red} fillOpacity={.9}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Área ingresos + winrate en fila */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {d.ingChart.length>0&&(
          <Card title="Ingresos" delay={.35}>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={d.ingChart} margin={{top:0,right:0,left:-30,bottom:0}}>
                <defs><linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.purple} stopOpacity={.4}/><stop offset="95%" stopColor={C.purple} stopOpacity={0}/></linearGradient></defs>
                <Tooltip {...TT} formatter={v=>[fmt$(v),"$"]}/>
                <Area type="monotone" dataKey="ingresos" stroke={C.purple} strokeWidth={2} fill="url(#gIng)"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}
        {d.mesesChart.length>0&&(
          <Card title="Winrate" delay={.4}>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={d.mesesChart} margin={{top:0,right:0,left:-30,bottom:0}}>
                <Tooltip {...TT} formatter={v=>[`${v}%`,"WR"]}/>
                <Line type="monotone" dataKey="wr" stroke={C.amber} strokeWidth={2.5} dot={{fill:C.amber,r:3}} activeDot={{r:5}}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Tabla resumen por mes */}
      {d.mesesChart.length>0&&(
        <Card title="Resumen por mes" delay={.45}>
          {d.mesesChart.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<d.mesesChart.length-1?`1px solid ${C.border}`:"none"}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{sheetLabel(d.mesesChart[i]&&Object.keys({}).length>=0?ultimosMeses(12).find(s=>sheetLabel(s).split(" ")[0]===m.label)||m.label:m.label)}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{m.gan}✅ {m.per}❌ · WR {m.wr}%</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:17,fontWeight:800,color:m.pnl>=0?C.green:C.red}}>{m.pnl>=0?"+":""}{m.pnl}%</div>
                <div style={{fontSize:10,color:C.muted}}>x5</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB SEÑALES — Dashboard visual con charts
// ════════════════════════════════════════════════════════════════
function TabSenales() {
  const [senales,setSen]=useState([]); const [loading,setL]=useState(true);
  const [status,setSt]=useState("all"); const [sheet,setSh]=useState("all");
  const [mesesDisp,setMD]=useState([]);

  useEffect(()=>{
    supabase.from("signals").select("month_sheet").order("id",{ascending:false}).then(({data})=>{
      if(data)setMD([...new Set(data.map(s=>s.month_sheet))].filter(Boolean));
    });
  },[]);

  useEffect(()=>{
    setL(true);
    let q=supabase.from("signals").select("*").order("id",{ascending:false});
    if(sheet!=="all")q=q.eq("month_sheet",sheet);
    if(status!=="all")q=q.eq("status",status);
    q.limit(100).then(({data})=>{setSen(data||[]);setL(false);});
  },[status,sheet]);

  const gan=senales.filter(esGan), per=senales.filter(esPer);
  const pnlTot=senales.reduce((a,s)=>a+pnlX5(s),0);
  const wr=(gan.length+per.length)>0?(gan.length/(gan.length+per.length))*100:0;

  // Datos para charts
  const pieData=[
    {name:"Ganadoras",value:gan.length,fill:C.green},
    {name:"Perdedoras",value:per.length,fill:C.red},
    {name:"Activas sin TP",value:senales.filter(s=>s.status==="active"&&s.last_tp_hit===0).length,fill:C.blue},
  ].filter(d=>d.value>0);

  // Top 8 señales por PnL para barras
  const topSen=[...senales].filter(s=>pnlX5(s)!==0).sort((a,b)=>Math.abs(pnlX5(b))-Math.abs(pnlX5(a))).slice(0,8)
    .map(s=>({label:s.coin,pnl:pnlX5(s),fill:pnlX5(s)>=0?C.green:C.red}));

  function sBadge(s){
    if(s.status==="closed_tp")return <Badge text={`TP${s.last_tp_hit}`} type="tp"/>;
    if(s.status==="closed_sl")return <Badge text="SL" type="sl"/>;
    if(s.last_tp_hit>0)return <Badge text={`TP${s.last_tp_hit}`} type="atp"/>;
    return <Badge text="activa" type="active"/>;
  }

  return (
    <div style={{padding:"20px 16px 100px"}}>
      <div style={{fontSize:24,fontWeight:900,color:C.text,letterSpacing:"-.025em",marginBottom:18,animation:"fadeUp .4s"}}>Señales</div>

      {/* Filtro mes */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {[{id:"all",l:"Todos"},...mesesDisp.map(s=>({id:s,l:sheetLabel(s)}))].map(op=>(
          <button key={op.id} onClick={()=>setSh(op.id)} style={{padding:"5px 11px",borderRadius:8,fontSize:11,fontWeight:700,border:`1px solid ${sheet===op.id?C.red:C.border2}`,background:sheet===op.id?C.redD:"transparent",color:sheet===op.id?C.red:C.muted,cursor:"pointer"}}>{op.l}</button>
        ))}
      </div>

      {/* Filtro status */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {[{id:"all",l:"Todas"},{id:"active",l:"Activas"},{id:"closed_tp",l:"TP"},{id:"closed_sl",l:"SL"},{id:"not_triggered",l:"No activó"}].map(op=>(
          <button key={op.id} onClick={()=>setSt(op.id)} style={{padding:"5px 11px",borderRadius:8,fontSize:11,fontWeight:700,border:`1px solid ${status===op.id?C.red:C.border2}`,background:status===op.id?C.redD:"transparent",color:status===op.id?C.red:C.muted,cursor:"pointer"}}>{op.l}</button>
        ))}
      </div>

      {!loading&&senales.length>0&&(<>
        {/* KPIs visuales */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
          {[{l:"PnL x5",v:`${signo(pnlTot)}%`,c:pnlTot>=0?C.green:C.red},{l:"WR",v:`${wr.toFixed(0)}%`,c:C.amber},{l:"✅",v:gan.length,c:C.green},{l:"❌",v:per.length,c:C.red}].map((k,i)=>(
            <div key={i} style={{background:"rgba(12,12,16,.9)",backdropFilter:"blur(10px)",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 8px",textAlign:"center",borderTop:`2px solid ${k.c}`}}>
              <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>{k.l}</div>
              <div style={{fontSize:15,fontWeight:800,color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Donut + barras en fila */}
        {pieData.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <Card title="Distribución" delay={.1}>
              <ResponsiveContainer width="100%" height={110}>
                <PieChart><Pie data={pieData} dataKey="value" innerRadius={28} outerRadius={48} paddingAngle={3}>
                  {pieData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                </Pie><Tooltip {...TT}/></PieChart>
              </ResponsiveContainer>
            </Card>
            {topSen.length>0&&(
              <Card title="Top PnL x5" delay={.15}>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={topSen} layout="vertical" margin={{top:0,right:4,left:-10,bottom:0}}>
                    <XAxis type="number" tick={{fontSize:9,fill:C.muted}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="label" tick={{fontSize:9,fill:C.muted}} axisLine={false} tickLine={false} width={28}/>
                    <Tooltip {...TT} formatter={v=>[`${v>0?"+":""}${v.toFixed(1)}%`,"PnL x5"]}/>
                    <Bar dataKey="pnl" radius={[0,4,4,0]} maxBarSize={10}>
                      {topSen.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        )}
      </>)}

      {/* Lista detalle */}
      {loading?<Spin/>:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {senales.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.muted,fontSize:13}}>Sin señales</div>}
          {senales.map(s=>(
            <div key={s.id} className="tap" style={{
              background:"linear-gradient(135deg,rgba(12,12,16,.95),rgba(16,16,22,.8))",
              backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
              border:`1px solid ${s.status==="closed_sl"?"rgba(232,25,44,.22)":s.last_tp_hit>0?"rgba(34,197,94,.2)":C.border}`,
              borderRadius:12,padding:"13px 15px",
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:C.muted}}>#{s.id}</span>
                  <span style={{fontSize:16,fontWeight:800,color:C.text}}>{s.pair}</span>
                  <span style={{fontSize:10,color:C.muted}}>{sheetLabel(s.month_sheet)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {pnlX5(s)!==0&&<span style={{fontSize:13,fontWeight:800,color:pnlX5(s)>=0?C.green:C.red}}>{signo(pnlX5(s))}% x5</span>}
                  {sBadge(s)}
                </div>
              </div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                <div><div style={{fontSize:10,color:C.muted}}>Entrada</div><div style={{fontSize:12,fontWeight:600,color:C.text}}>{s.entry_min}{s.entry_max?`–${s.entry_max}`:""}</div></div>
                <div><div style={{fontSize:10,color:C.muted}}>SL</div><div style={{fontSize:12,fontWeight:600,color:C.red}}>{s.sl}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB MIEMBROS — Dashboard visual
// ════════════════════════════════════════════════════════════════
function TabMiembros() {
  const [miembros,setM]=useState([]); const [loading,setL]=useState(true);
  const [filtro,setF]=useState("active");

  useEffect(()=>{
    setL(true);
    let q=supabase.from("members").select("*").order("name");
    if(filtro!=="all")q=q.eq("status",filtro);
    q.then(({data})=>{setM(data||[]);setL(false);});
  },[filtro]);

  const hoy=hoyISO();
  const en7=new Date(new Date(hoy+"T12:00:00").getTime()+7*86400000).toISOString().split("T")[0];
  const activos=miembros.filter(m=>m.status==="active");
  const ingreso=activos.reduce((a,m)=>a+(m.amount_paid||0),0);
  const vencenProx=activos.filter(m=>m.end_date&&m.end_date>=hoy&&m.end_date<=en7).length;

  // Donut planes
  const planPie=Object.entries({monthly:0,quarterly:0,yearly:0,lifetime:0}).map(([k])=>({
    name:k,value:activos.filter(m=>m.plan===k).length,fill:PLAN_C[k]
  })).filter(d=>d.value>0);

  // Barras ingresos por plan
  const planBar=Object.entries({monthly:0,quarterly:0,yearly:0,lifetime:0}).map(([k])=>({
    plan:k.substring(0,3),ingresos:activos.filter(m=>m.plan===k).reduce((a,m)=>a+(m.amount_paid||0),0),fill:PLAN_C[k]
  })).filter(d=>d.ingresos>0);

  return (
    <div style={{padding:"20px 16px 100px"}}>
      <div style={{fontSize:24,fontWeight:900,color:C.text,letterSpacing:"-.025em",marginBottom:18,animation:"fadeUp .4s"}}>Miembros <span style={{color:C.red}}>VIP</span></div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <KPI label="Activos" value={activos.length} color={C.green} icon="✅" delay={.05}/>
        <KPI label="Ingresos" value={fmt$(ingreso)} color={C.purple} icon="💰" delay={.1}/>
        <KPI label="Vencen esta semana" value={vencenProx} color={vencenProx>0?C.amber:C.muted} icon="⏰" alerta={vencenProx>0} delay={.15}/>
        <KPI label="Vencidos" value={miembros.filter(m=>m.status==="expired").length} color={C.red} icon="❌" delay={.2}/>
      </div>

      {/* Donut + barras */}
      {planPie.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <Card title="Por plan" delay={.25}>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={planPie} dataKey="value" innerRadius={32} outerRadius={52} paddingAngle={3}>
                  {planPie.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                </Pie>
                <Tooltip {...TT} formatter={(v,n)=>[v,n]}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:8}}>
              {planPie.map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:d.fill}}/>
                  <span style={{fontSize:11,color:C.muted,flex:1}}>{d.name}</span>
                  <span style={{fontSize:12,fontWeight:800,color:d.fill}}>{d.value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Ingresos/plan" delay={.3}>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={planBar} margin={{top:4,right:0,left:-28,bottom:0}}>
                <XAxis dataKey="plan" tick={{fontSize:9,fill:C.muted}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:C.muted}} axisLine={false} tickLine={false}/>
                <Tooltip {...TT} formatter={v=>[fmt$(v),"$"]}/>
                <Bar dataKey="ingresos" radius={[5,5,0,0]} maxBarSize={30}>
                  {planBar.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div style={{display:"flex",gap:6,marginBottom:14,alignItems:"center"}}>
        {[{id:"active",l:"Activos"},{id:"expired",l:"Vencidos"},{id:"all",l:"Todos"}].map(op=>(
          <button key={op.id} onClick={()=>setF(op.id)} style={{padding:"5px 13px",borderRadius:8,fontSize:12,fontWeight:700,border:`1px solid ${filtro===op.id?C.red:C.border2}`,background:filtro===op.id?C.redD:"transparent",color:filtro===op.id?C.red:C.muted,cursor:"pointer"}}>{op.l}</button>
        ))}
        <div style={{marginLeft:"auto",fontSize:12,color:C.muted}}>{miembros.length} total</div>
      </div>

      {/* Lista */}
      {loading?<Spin/>:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {miembros.map(m=>{
            const pv=m.end_date&&m.end_date>=hoy&&m.end_date<=en7;
            return (
              <div key={m.id} className="tap" style={{
                background:"linear-gradient(135deg,rgba(12,12,16,.95),rgba(16,16,22,.8))",
                backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
                border:`1px solid ${pv?"rgba(245,158,11,.3)":C.border}`,borderRadius:12,padding:"13px 15px",
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:C.text}}>{m.name}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{m.telegram_id||""}{m.phone?` · 📱 ${m.phone}`:""}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:700,color:PLAN_C[m.plan]||C.text}}>{m.plan}</div>
                    <div style={{fontSize:14,fontWeight:800,color:C.green}}>{fmt$(m.amount_paid)}</div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:11,color:C.muted}}>{m.end_date?`Vence: ${fechaCorta(m.end_date)}`:"Lifetime ∞"}</div>
                  <div style={{display:"flex",gap:5}}>
                    {pv&&<Badge text="pronto" type="vence"/>}
                    {m.discount>0&&<Badge text={`-${(m.discount*100).toFixed(0)}%`} type="vence"/>}
                    {m.status!=="active"&&<Badge text={m.status} type="exp"/>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB FINANZAS — Dashboard BI completo con datos reales
// ════════════════════════════════════════════════════════════════
function TabFinanzas() {
  const [d,setD]=useState(null); const [loading,setL]=useState(true);

  useEffect(()=>{
    async function load() {
      // SIN filtro de fecha — trae todo
      const [{data:pagos},{data:miembros}] = await Promise.all([
        supabase.from("payments").select("id,amount,amount_base,discount,plan,payment_date,members(name,phone)").order("payment_date",{ascending:false}),
        supabase.from("members").select("plan,amount_paid,status,end_date"),
      ]);

      console.log("Pagos traidos:", pagos?.length, pagos?.slice(0,2));

      const todos=pagos||[];
      const ingTotal=todos.reduce((a,p)=>a+(p.amount||0),0);
      const baseTotal=todos.reduce((a,p)=>a+(p.amount_base||p.amount||0),0);
      const descTotal=parseFloat((baseTotal-ingTotal).toFixed(2));
      const conDesc=todos.filter(p=>(p.discount||0)>0).length;

      // Agrupar por mes — usando todos los pagos disponibles
      const mesMap={};
      todos.forEach(p=>{
        if(!p.payment_date)return;
        const k=p.payment_date.substring(0,7);
        if(!mesMap[k])mesMap[k]={label:`${mesesC[parseInt(k.split("-")[1])-1]} ${k.split("-")[0].substring(2)}`,total:0,count:0};
        mesMap[k].total+=(p.amount||0);
        mesMap[k].count++;
      });
      const ingChart=Object.entries(mesMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([,v])=>v);

      // Por plan
      const planMap={monthly:0,quarterly:0,yearly:0,lifetime:0};
      todos.forEach(p=>{if(planMap[p.plan]!==undefined)planMap[p.plan]+=(p.amount||0);});
      const planBar=Object.entries(planMap).map(([k,v])=>({plan:k.substring(0,3),ingresos:parseFloat(v.toFixed(0)),fill:PLAN_C[k]})).filter(d=>d.ingresos>0);

      // Donut planes miembros activos
      const planPie=Object.entries({monthly:0,quarterly:0,yearly:0,lifetime:0}).map(([k])=>({
        name:k,value:(miembros||[]).filter(m=>m.status==="active"&&m.plan===k).length,fill:PLAN_C[k]
      })).filter(d=>d.value>0);

      // Últimos 10 pagos
      const recientes=todos.slice(0,10);

      setD({ingTotal,baseTotal,descTotal,conDesc,ingChart,planBar,planPie,recientes,totalPagos:todos.length});
      setL(false);
    }
    load();
  },[]);

  if(loading)return <Spin/>;

  return (
    <div style={{padding:"20px 16px 100px"}}>
      <div style={{fontSize:24,fontWeight:900,color:C.text,letterSpacing:"-.025em",marginBottom:18,animation:"fadeUp .4s"}}>Finanzas</div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <KPI label="Ingresos totales" value={fmt$(d.ingTotal)} color={C.green} icon="💵" delay={.05}/>
        <KPI label="Monto base" value={fmt$(d.baseTotal)} color={C.text} icon="📋" delay={.1}/>
        <KPI label="Descuentos" value={`-${fmt$(d.descTotal)}`} color={C.amber} icon="🏷" sub={`${d.conDesc} ventas`} delay={.15}/>
        <KPI label="Total pagos" value={d.totalPagos} color={C.blue} icon="📊" delay={.2}/>
      </div>

      {/* Área ingresos por mes */}
      {d.ingChart.length>0&&(
        <Card title="Ingresos por mes" delay={.25}>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={d.ingChart} margin={{top:4,right:4,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="gFin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.red} stopOpacity={.4}/>
                  <stop offset="95%" stopColor={C.red} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="label" tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:C.muted}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT} formatter={v=>[fmt$(v),"Ingresos"]}/>
              <Area type="monotone" dataKey="total" stroke={C.red} strokeWidth={2.5} fill="url(#gFin)" name="Ingresos"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Barras por plan + donut en fila */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {d.planBar.length>0&&(
          <Card title="$ por plan" delay={.35}>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={d.planBar} margin={{top:4,right:0,left:-28,bottom:0}}>
                <XAxis dataKey="plan" tick={{fontSize:9,fill:C.muted}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:C.muted}} axisLine={false} tickLine={false}/>
                <Tooltip {...TT} formatter={v=>[fmt$(v),"$"]}/>
                <Bar dataKey="ingresos" radius={[5,5,0,0]} maxBarSize={30}>
                  {d.planBar.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
        {d.planPie.length>0&&(
          <Card title="Miembros activos" delay={.4}>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart><Pie data={d.planPie} dataKey="value" innerRadius={28} outerRadius={46} paddingAngle={3}>
                {d.planPie.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Pie><Tooltip {...TT}/></PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",flexWrap:"wrap",gap:"4px 12px",marginTop:6}}>
              {d.planPie.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:p.fill}}/>
                  <span style={{fontSize:10,color:C.muted}}>{p.name.substring(0,3)} {p.value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Últimos pagos */}
      <Card title="Últimos pagos" delay={.45}>
        {d.recientes.length===0&&<div style={{textAlign:"center",padding:"16px 0",color:C.muted,fontSize:13}}>Sin pagos</div>}
        {d.recientes.map((p,i)=>(
          <div key={p.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:i<d.recientes.length-1?`1px solid ${C.border}`:"none"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>{p.members?.name||"—"}</div>
              <div style={{fontSize:11,color:C.muted,display:"flex",gap:8}}>
                <span style={{color:PLAN_C[p.plan]||C.muted}}>{p.plan}</span>
                {(p.discount||0)>0&&<span style={{color:C.amber}}>-{((p.discount||0)*100).toFixed(0)}%</span>}
                <span>{fechaCorta(p.payment_date)}</span>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:14,fontWeight:800,color:C.green}}>{fmt$(p.amount)}</div>
              {(p.discount||0)>0&&p.amount_base&&<div style={{fontSize:10,color:C.muted,textDecoration:"line-through"}}>{fmt$(p.amount_base)}</div>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [session,setS]=useState(null); const [tab,setTab]=useState(0); const [checking,setC]=useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setS(data.session);setC(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setS(s));
    return ()=>subscription.unsubscribe();
  },[]);

  if(checking)return(
    <div style={{minHeight:"100dvh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:32,height:32,border:`2px solid ${C.border2}`,borderTopColor:C.red,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
    </div>
  );
  if(!session)return <Login onLogin={s=>setS(s)}/>;

  const tabs=[
    {label:"Inicio",  icon:"⚡", comp:<TabInicio/>},
    {label:"Señales", icon:"📡", comp:<TabSenales/>},
    {label:"Miembros",icon:"👥", comp:<TabMiembros/>},
    {label:"Finanzas",icon:"💰", comp:<TabFinanzas/>},
  ];

  return (
    <><style>{CSS}</style>
    <div style={{minHeight:"100dvh",background:C.bg,maxWidth:520,margin:"0 auto",position:"relative"}}>
      <Fondo/>
      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(6,6,8,.93)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",borderBottom:`1px solid ${C.border}`,padding:"13px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:29,height:29,background:C.red,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff",boxShadow:`0 0 12px ${C.redG}`}}>B</div>
          <span style={{fontSize:15,fontWeight:900,color:C.text,letterSpacing:"-.01em"}}>BK <span style={{color:C.red}}>Manager</span></span>
        </div>
        <button onClick={()=>supabase.auth.signOut()} style={{background:"transparent",border:`1px solid ${C.border2}`,borderRadius:8,color:C.muted,fontSize:12,padding:"5px 11px",cursor:"pointer"}}>Salir</button>
      </div>
      {/* Contenido */}
      <div style={{position:"relative",zIndex:1,minHeight:"calc(100dvh - 120px)"}}>
        {tabs[tab].comp}
      </div>
      {/* Tab bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:"rgba(6,6,8,.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,display:"flex",padding:"7px 0 11px",zIndex:100}}>
        {tabs.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"transparent",border:"none",cursor:"pointer",flex:1,padding:"4px 0",transition:"opacity .15s"}}>
            <span style={{fontSize:21}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:tab===i?800:400,color:tab===i?C.red:C.muted,letterSpacing:".03em"}}>{t.label}</span>
            {tab===i&&<div style={{width:4,height:4,borderRadius:"50%",background:C.red,boxShadow:`0 0 7px ${C.red}`}}/>}
          </button>
        ))}
      </div>
    </div></>
  );
}
