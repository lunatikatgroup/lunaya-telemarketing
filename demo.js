/* ===== Modo demostración =====
   La directora ve la app como la ve un distribuidor, un emprendedor o una telemarketer, para enseñarla en un entrenamiento.
   Usa datos inventados (no muestra clientes reales de nadie) y no guarda nada. Para salir se recarga la app. */
const DEMO_ROLES = {dist:"Distribuidor", emp:"Emprendedor", tele:"Telemarketer"};
let demoToastAt = 0;
function demoNoSave(){ if (Date.now() - demoToastAt > 3000){ demoToastAt = Date.now(); toast("Modo demostración: no se guarda nada"); } }
function demoDb(){
  const doc = path => ({id: String(path).split("/").pop(), path,
    get: async () => ({exists:false, id:"", data:() => null}),
    set: async () => demoNoSave(), update: async o => { if (o && Object.keys(o).every(k => k.startsWith("seen"))) return; demoNoSave(); }, delete: async () => demoNoSave(),
    onSnapshot: () => () => {}});
  const col = name => { const q = {where: () => q, orderBy: () => q, limit: () => q, doc: id => doc(name+"/"+(id || ("demo"+Math.random().toString(36).slice(2,8)))),
    add: async () => { demoNoSave(); return {id:"demo"}; }, get: async () => ({docs:[], empty:true, size:0}), onSnapshot: () => () => {}}; return q; };
  return {doc, collection: col, batch: () => ({set(){}, update(){}, delete(){}, commit: async () => demoNoSave()})};
}
function demoData(kind){
  const now = Date.now(), d = n => now + n*864e5, H = (n, h) => laToMs(addDays(today(), n), h);
  const owner = ownerUid() || S.uid;
  const M = {
    [owner]: {name: S.me?.name || "Katerine Luna", role:"admin", email:"", joinedAt:d(-400)},
    demo_dist: {name:"Daniel Ríos", role:"socio", tipo:DIST, upline:"", joinedAt:d(-200), genero:"h", planEmp:{acomp:10, solo:20, asig:13}, metas:{mes:25000, anio:300000}},
    demo_emp: {name:"Mariela Torres", role:"socio", tipo:"Emprendedor", upline:"demo_dist", joinedAt:d(-90), genero:"m", ruta:{solo:6000, acomp:2500, desde:d(-60)}, metas:{mes:8000, anio:96000}},
    demo_emp2: {name:"Jorge Pineda", role:"socio", tipo:"Emprendedor", upline:"demo_dist", joinedAt:d(-40), genero:"h"},
    demo_emp3: {name:"Sofía Vargas", role:"socio", tipo:"Emprendedor", upline:owner, joinedAt:d(-70), genero:"m"},
    demo_lider: {name:"Carla Méndez", role:"tele", lider:true, upline:"", joinedAt:d(-300), genero:"m"},
    demo_tele: {name:"Valeria Soto", role:"tele", upline:"", joinedAt:d(-120), genero:"m"},
    demo_tele2: {name:"Andrea Ruiz", role:"tele", upline:"", joinedAt:d(-60), genero:"m", sueldo:0, pct:3}
  };
  const me = {dist:"demo_dist", emp:"demo_emp", tele:"demo_tele"}[kind];
  const clientes = ["Ana Martínez","Luis Gómez","Patricia Herrera","Carmen Delgado","Roberto Salas","Gabriela Núñez","Fernando Castro","Lucía Ramírez","Teresa Ortiz","Miguel Ángel Rojas","Diana Flores","Jesús Medina"];
  const ciudades = ["Chula Vista","National City","El Cajón","Escondido","San Diego","Oceanside"];
  const apub = {}, priv = {}; let k = 0;
  const add = (socioId, teleId, dia, hora, extra={}) => { const id = "dm"+(++k); const c = clientes[(k-1) % clientes.length];
    apub[id] = {when:H(dia, hora), socioId, teleId, source:"Referencias", origen: M[teleId]?.role==="tele" ? "tm" : "propia", status:"agendada", sale:false, amount:0, createdAt: H(Math.min(dia,0)-2, "10:30"), ...extra};
    priv[id] = {client:c, phone:"(619) 555-0"+String(100+k), city:ciudades[k % ciudades.length], address:(100+k*7)+" Main St", notes: k%3===0 ? "Le interesa el extractor de jugos. Estará con su esposo." : "",
      socioId, teleId, dir:false, up: M[socioId]?.upline || "", tv:false, createdAt:now,
      chat: k%4===1 ? [{at:now-36e5, by:teleId, text:"Confirmada, la espera a las " + hora.replace(/^0/,"")}] : [], seen:{}, resNote: extra.status==="hecha" ? (extra.sale ? "Le encantó la olla de presión" : "Lo va a pensar, volver a llamar") : ""};
    return id; };
  /* Citas de ejemplo: de la semana pasada (con resultados) y de los próximos días */
  add("demo_dist","demo_tele",-6,"18:00",{status:"hecha", sale:true, amount:4800, saleStatus:"aprobada", acomp:false, refsDemo:6});
  add("demo_emp","demo_tele",-5,"17:00",{status:"hecha", sale:true, amount:3600, saleStatus:"aprobada", acomp:true, entrenador:"demo_dist", refsDemo:4});
  add("demo_emp","demo_emp",-4,"19:00",{status:"hecha", sale:true, amount:2900, saleStatus:"aprobada", acomp:false, origen:"propia", refsDemo:5});
  add("demo_emp2","demo_tele2",-4,"18:30",{status:"hecha", sale:false, refsDemo:3});
  add("demo_dist","demo_lider",-3,"16:00",{status:"no_se_hizo"});
  add("demo_emp","demo_tele2",-2,"18:00",{status:"hecha", sale:true, amount:3200, saleStatus:"pendiente", acomp:false, refsDemo:4});
  add("demo_emp3","demo_tele",-2,"17:30",{status:"hecha", sale:false, segWhen:H(3,"18:00"), refsDemo:2});
  add("demo_emp","demo_tele",-1,"18:00");
  add("demo_dist","demo_tele",0,"18:00");
  add("demo_emp","demo_lider",0,"19:30");
  add("demo_emp2","demo_tele",1,"17:00");
  add("demo_dist","demo_tele2",1,"18:30");
  add("demo_emp","demo_tele",2,"18:00");
  add("demo_emp3","demo_lider",2,"19:00");
  /* Llamadas y referidos de las telemarketers */
  const logs = {}; ["demo_tele","demo_tele2","demo_lider"].forEach((t, ti) => { for (let i=-6;i<=0;i++){ const date = addDays(today(), i); if (new Date(date+"T12:00").getDay()===0) continue;
    const calls = []; const n = 35 + ((i+7)*7 + ti*11) % 30; const R = ["no_contesto","no_contesto","buzon","volver","no_interesa","no_contesto","cita"];
    for (let j=0;j<n;j++){ const soc = ["demo_dist","demo_emp","demo_emp2","demo_emp3"][j%4]; calls.push({at:laToMs(date,"10:00")+j*6e5, teleId:t, socioId:soc, source:"Referencias", result:R[(j+ti)%R.length]}); }
    logs[date+"_"+t] = {date, teleId:t, calls, refs:[{at:laToMs(date,"12:00"), socioId:["demo_dist","demo_emp"][i&1], teleId:t, n:8+((i+7)%5), source:"Referencias"}]}; } });
  /* Ruleta de ejemplo */
  const pid = Object.entries(S.programs||{}).find(([,p]) => p.activo!==false)?.[0];
  const juegos = {}, leads = {};
  if (pid){ juegos.DEMO0001 = {pid, ref:"Patricia Herrera", socioId:me==="demo_tele"?"demo_dist":me, up:"", tv:false, by:me, n:7, visitas:4, ganados:1, avisados:0, until:d(5), createdAt:d(-3), kind:"cliente", meta:S.programs[pid].meta};
    leads["DEMO0001_ref"] = {code:"DEMO0001", name:"Patricia Herrera", tel:"6195550188", kind:"ref", socioId:juegos.DEMO0001.socioId, by:me};
    ["Rosa Linares","Claudia Méndez","Irma Paredes","Verónica Silva","Elena Cruz","Marisol Díaz","Norma Reyes"].forEach((n, i) => { const id = "DEMO0001_61955502"+(10+i); const ap = i < 4 ? "dm"+(i+1) : "";
      leads[id] = {code:"DEMO0001", pid, name:n, tel:"61955502"+(10+i), prize:(S.programs[pid].prizes||[])[i % (S.programs[pid].prizes||[1]).length]?.n || "Regalo", at:d(-3+i*0.3), socioId:juegos.DEMO0001.socioId, by:me, ref:"Patricia Herrera", status: ap ? "cita" : "nuevo", kind:"jugador", acepta:true, ...(ap?{apptId:ap}:{})}; });
  }
  return {M, me, apub, priv, logs, juegos, leads};
}
function startDemo(kind){
  const D = demoData(kind);
  S.unsub.forEach(u => { try { u(); } catch {} }); S.unsub = [];
  S.realUid = S.uid; S.demo = kind; S.db = demoDb(); S.isOwner = false; S.canWrite = true;
  S.members = D.M; S.uid = D.me; S.me = D.M[D.me]; S.apub = D.apub; S.privs = {demo: D.priv}; S.logs = D.logs; S.juegos = D.juegos; S.leads = D.leads; S.jl = {}; S.ll = {};
  S.invites = {}; S.drives = {[D.me]: {url:"https://drive.google.com/"}}; S.seenIds = null; S.leadsReady = false;
  S.world = kind==="tele" ? "demo_dist" : ""; S.view = "hoy"; S.f.period = "semana";
  Object.values(D.priv).forEach(q => { q.tv = S.members[pagadorDe(q.socioId)]?.role==="admin"; });
  mergeAppts(); try { history.replaceState(null, "", "#hoy"); } catch {} render(); window.scrollTo(0,0);
}
function demoBar(){ if (!S.demo) return "";
  return `<div class="banner" style="background:var(--deep);color:var(--bg);display:grid;gap:8px"><div>👀 <b>Estás viendo la app como ${DEMO_ROLES[S.demo]}.</b> Los datos son de ejemplo y nada se guarda.</div>
    <div class="row">${Object.entries(DEMO_ROLES).map(([k,l]) => `<button class="chip ${S.demo===k?"on":""}" data-demo="${k}" style="${S.demo===k?"":"background:transparent;color:var(--bg);border-color:var(--muted)"}">${l}</button>`).join("")}<button class="btn small" data-demo-exit>Salir</button></div></div>`; }
function demoCard(){ return `<div class="card"><h2>👀 Ver la app como…</h2><p class="note" style="margin-top:-6px">Para tus entrenamientos: la app se ve exactamente como la ve cada uno, con datos de ejemplo. No se ve información real de nadie y no se guarda nada.</p>
  <div class="row">${Object.entries(DEMO_ROLES).map(([k,l]) => `<button class="btn ${k==="dist"?"":"ghost"}" data-demo="${k}">${l}</button>`).join("")}</div></div>`; }
function bindDemo(){ document.querySelectorAll("[data-demo]").forEach(b => b.onclick = () => startDemo(b.dataset.demo));
  document.querySelectorAll("[data-demo-exit]").forEach(b => b.onclick = () => { try { history.replaceState(null, "", "#equipo"); } catch {} location.reload(); }); }
