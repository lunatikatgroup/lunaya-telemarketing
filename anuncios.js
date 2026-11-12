/* ===== Anuncios en Meta (Facebook, Instagram y Estados de WhatsApp) =====
   Cada persona conecta SU Facebook: usa su página, su cuenta de anuncios y su tarjeta.
   Todo se hace desde el navegador con la API de Marketing de Meta; Lunaya no guarda contraseñas ni tarjetas.
   Los anuncios se crean PAUSADOS: se revisan y luego se tocan "Activar". */
const META_VER = "v23.0";
const ADS_ZONAS = [["San Diego",32.7157,-117.1611],["Chula Vista",32.6401,-117.0842],["National City",32.6781,-117.0992],["El Cajon",32.7948,-116.9625],["Escondido",33.1192,-117.0864],["Vista",33.2000,-117.2425],["Oceanside",33.1959,-117.3795],["San Marcos",33.1434,-117.1661],["Santee",32.8384,-116.9739],["Spring Valley",32.7448,-116.9989]];
const AD = {ready:false, token:"", user:null, cuentas:[], paginas:[], cargando:false, log:[]};
const adsAppId = () => String(S.config?.metaAppId || "").trim();
function fbCargar(){ return new Promise((ok, no) => {
  if (window.FB && AD.ready) return ok();
  if (!adsAppId()) return no(new Error("Falta el ID de la app de Meta"));
  window.fbAsyncInit = () => { FB.init({appId: adsAppId(), cookie:false, xfbml:false, version: META_VER}); AD.ready = true; ok(); };
  if (!document.getElementById("fb-sdk")){ const s = document.createElement("script"); s.id = "fb-sdk"; s.async = true; s.src = "https://connect.facebook.net/es_LA/sdk.js"; s.onerror = () => no(new Error("No se pudo cargar Facebook")); document.body.appendChild(s); }
  else if (window.FB){ window.fbAsyncInit(); } }); }
function fbApi(path, method, params){ return fbListo().then(() => new Promise((ok, no) => {
  const p = {...(params||{}), access_token: AD.token};
  Object.keys(p).forEach(k => { if (p[k] && typeof p[k] === "object") p[k] = JSON.stringify(p[k]); });
  FB.api(path, method || "get", p, r => { if (!r || r.error) { const e = r?.error || {}; AD.log.push(`${path}: ${e.message||"error"}`); if (e.code===190){ AD.token = ""; try { sessionStorage.removeItem("ly-fb"); } catch {} } no(Object.assign(new Error(e.error_user_msg || e.message || "Error de Meta"), {meta:e})); } else ok(r); }); })); }
/* Safari solo deja abrir la ventanita de Facebook si se abre en el mismo toque: por eso el SDK se carga antes y FB.login se llama sin esperar */
function fbLoginSync(){ return new Promise((ok, no) => { const cfg = String(S.config?.metaConfigId || "").trim(); let done = false;
  const t = setTimeout(() => { if (!done) no(new Error("No se completó el inicio de sesión. Revisa si se abrió una pestaña de Facebook, o permite las ventanas emergentes en Safari y vuelve a tocar Conectar.")); }, 90000);
  try { FB.login(r => { done = true; clearTimeout(t); ok(r); }, cfg ? {config_id: cfg} : {scope:"ads_management,ads_read,pages_show_list,pages_read_engagement,business_management", return_scopes:true}); } catch(e){ clearTimeout(t); no(e); } }); }
async function fbConectar(){
  const r = (window.FB && AD.ready) ? await fbLoginSync() : await (async () => { await fbCargar(); return fbLoginSync(); })();
  if (!r || !r.authResponse) throw new Error("No se conectó Facebook");
  AD.token = r.authResponse.accessToken;
  const [me, ac, pg] = await Promise.all([fbApi("/me", "get", {fields:"name"}), fbApi("/me/adaccounts", "get", {fields:"name,account_id,currency,account_status", limit:50}), fbApi("/me/accounts", "get", {fields:"name,id", limit:50})]);
  AD.user = me; AD.cuentas = (ac.data||[]).filter(a => a.account_status === 1); AD.paginas = pg.data || [];
  try { sessionStorage.setItem("ly-fb", JSON.stringify({t:AD.token, u:AD.user, c:AD.cuentas, p:AD.paginas, at:Date.now(), exp:Date.now() + (r.authResponse.expiresIn||3600)*1000})); } catch {}
  return true; }
/* Recordar la conexión mientras la pestaña siga abierta (aunque la página se recargue); se borra al cerrar la pestaña */
(function(){ try { const x = JSON.parse(sessionStorage.getItem("ly-fb")||"null"); if (x && x.t && x.exp > Date.now() + 60e3){ AD.token = x.t; AD.user = x.u; AD.cuentas = x.c||[]; AD.paginas = x.p||[]; } } catch {} })();
async function fbListo(){ if (!window.FB || !AD.ready) await fbCargar(); }

/* Imagen del anuncio: la de la ruleta (con el QR) o una foto que suba la persona; se manda como JPG */
async function imgBase64(src){ const im = await loadImg(src); const c = document.createElement("canvas"); const W = Math.min(1080, im.naturalWidth||im.width), H = Math.round(W * (im.naturalHeight||im.height) / (im.naturalWidth||im.width));
  c.width = W; c.height = H; c.getContext("2d").drawImage(im, 0, 0, W, H); return c.toDataURL("image/jpeg", 0.88).split(",")[1]; }

function anunciosCard(){
  if (role()!=="admin" && !S.me?.anuncios) return "";
  const id = adsAppId(); if (id && !AD.ready) fbCargar().catch(e => console.log("fb", e)); const mis = Object.entries(S.anuncios||{}).filter(([,a]) => a.owner===S.uid).sort((a,b) => (b[1].at||0) - (a[1].at||0));
  return `<div class="card"><h2>📣 Anuncios en Meta<span class="note">Facebook · Instagram · Estados de WhatsApp</span></h2>
    ${!id ? (role()==="admin" ? `<p class="note" style="margin-top:-6px">Pega aquí el <b>ID de la app</b> que creaste en developers.facebook.com.</p><div class="row" style="flex-wrap:nowrap"><input class="i" id="ad-appid" inputmode="numeric" placeholder="ID de la app (solo números)"><button class="btn small" id="ad-appid-s">Guardar</button></div>` : `<div class="note">Todavía no está lista la conexión con Meta.</div>`)
    : role()==="admin" && !S.config?.metaConfigId && !AD.token ? `<p class="note" style="margin-top:-6px">ID de la app: <b>${esc(id)}</b>. Falta el <b>ID de configuración</b> del inicio de sesión (Meta → Inicio de sesión con Facebook → Configuraciones).</p><div class="row" style="flex-wrap:nowrap"><input class="i" id="ad-cfgid" inputmode="numeric" placeholder="ID de configuración (solo números)"><button class="btn small" id="ad-cfgid-s">Guardar</button></div><button class="btn small ghost" id="ad-con" style="margin-top:8px">Probar sin configuración</button>`
    : AD.token ? `<p class="note" style="margin-top:-6px">Conectada como <b>${esc(AD.user?.name||"")}</b>. Los anuncios salen de <b>tu</b> cuenta de anuncios y se cobran a <b>tu</b> tarjeta en Meta.</p><button class="btn" id="ad-new">➕ Nuevo anuncio</button>`
    : `<p class="note" style="margin-top:-6px">Conecta tu Facebook para crear anuncios con tu página y tu cuenta de anuncios. Lunaya no guarda tu contraseña ni tu tarjeta.</p><button class="btn" id="ad-con">Conectar mi Facebook</button>`}
    ${mis.length ? `<div class="list" style="margin-top:10px">${mis.slice(0,20).map(([k,a]) => `<div class="item" style="cursor:default;display:grid;gap:4px"><div class="row" style="justify-content:space-between"><b>${esc(a.nombre)}</b><span class="tag ${a.estado==="ACTIVE"?"tg-good":a.estado==="PAUSED"?"tg-warn":"tg-mute"}">${a.estado==="ACTIVE"?"Activo":a.estado==="PAUSED"?"En pausa":esc(a.estado||"")}</span></div>
        <div class="m">${esc(a.zona||"")} · ${money(a.diario||0)}/día · ${a.dias||"?"} días · ${esc(a.ubic||"")} · link de ${esc(S.juegos?.[a.code]?.ref || a.code || "")}</div>
        <div class="m">${a.ins ? `Gastado ${money(a.ins.spend)} · ${a.ins.impressions||0} vistas · ${a.ins.clicks||0} clics` : ""} · ${prospDe(a.code)} prospecto(s) en Lunaya</div>
        ${AD.token ? `<div class="row"><button class="btn small ghost" data-adins="${k}">🔄 Ver resultados</button>${a.estado==="PAUSED"?`<button class="btn small" data-adact="${k}|ACTIVE">▶️ Activar</button>`:a.estado==="ACTIVE"?`<button class="btn small ghost" data-adact="${k}|PAUSED">⏸️ Pausar</button>`:""}</div>` : ""}</div>`).join("")}</div>` : ""}
    ${AD.log.length && role()==="admin" ? `<details style="margin-top:8px"><summary class="note">Detalles técnicos</summary><div class="note">${AD.log.slice(-5).map(esc).join("<br>")}</div></details>` : ""}</div>`; }
const prospDe = code => Object.values(S.leads||{}).filter(l => (l.kind==="jugador"||l.kind==="hoja") && l.code && (l.code===code || raizDe(l.code)===code)).length;

function bindAnuncios(m){ const q = x => m.querySelector(x);
  if (q("#ad-appid-s")) q("#ad-appid-s").onclick = async () => { const v = q("#ad-appid").value.replace(/\D/g,""); if (v.length < 10){ toast("Ese ID no se ve bien: son solo números"); return; } try { await S.db.doc("config/main").set({metaAppId:v}, {merge:true}); toast("Guardado"); } catch(e){ writeErr(e); } };
  if (q("#ad-cfgid-s")) q("#ad-cfgid-s").onclick = async () => { const v = q("#ad-cfgid").value.replace(/\D/g,""); if (v.length < 8){ toast("Ese ID no se ve bien: son solo números"); return; } try { await S.db.doc("config/main").set({metaConfigId:v}, {merge:true}); toast("Guardado"); } catch(e){ writeErr(e); } };
  if (q("#ad-con")) q("#ad-con").onclick = async () => { const b = q("#ad-con"); b.disabled = true; b.textContent = "Conectando…";
    try { await fbConectar(); if (!AD.cuentas.length) toast("Tu Facebook no tiene cuentas de anuncios activas"); else if (!AD.paginas.length) toast("Tu Facebook no administra ninguna página"); render(); }
    catch(e){ console.log(e); toast(e.message || "No se pudo conectar"); b.disabled = false; b.textContent = "Conectar mi Facebook"; } };
  if (q("#ad-new")) q("#ad-new").onclick = openNuevoAnuncio;
  m.querySelectorAll("[data-adins]").forEach(b => b.onclick = () => adResultados(b.dataset.adins));
  m.querySelectorAll("[data-adact]").forEach(b => b.onclick = () => { const [k, st] = b.dataset.adact.split("|"); adEstado(k, st); }); }

function openNuevoAnuncio(){
  const links = Object.entries(S.juegos||{}).filter(([,j]) => j.kind!=="amiga" && (j.by===S.uid || j.socioId===S.uid));
  const hoy = today();
  openModal(`<h3>Nuevo anuncio</h3>
    <div class="grid2"><label class="f">Cuenta de anuncios<select class="i" id="na-ac">${AD.cuentas.map(a => `<option value="${a.id}">${esc(a.name)} (${esc(a.currency)})</option>`).join("")}</select></label>
      <label class="f">Página que publica<select class="i" id="na-pg">${AD.paginas.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label></div>
    <label class="f">¿A dónde lleva el anuncio? (link de la ruleta)<select class="i" id="na-link"><option value="_nuevo">➕ Crear un link nuevo solo para este anuncio</option>${links.map(([c,j]) => `<option value="${c}">${esc(j.ref)}${j.alias?" · sale como "+esc(j.alias):""}</option>`).join("")}</select></label>
    <label class="f" id="na-pw">¿Qué ruleta usa? (la misma de siempre, con sus regalos)<select class="i" id="na-p">${misProgramas().map(([pid,p]) => `<option value="${pid}">${esc(p.name||"Programa")}</option>`).join("") || `<option value="">— Primero crea un programa en Ruleta —</option>`}</select></label>
    <label class="f" id="na-alw" hidden>Nombre que sale en la ruleta (quién regala el giro)<input class="i" id="na-al" maxlength="40" autocomplete="off"><span class="note">El cliente ve: «<b id="na-alv"></b> te regaló un giro 🎁»</span></label>
    <div class="grid2"><label class="f">Zona<select class="i" id="na-z">${ADS_ZONAS.map(([n]) => `<option>${n}</option>`).join("")}</select></label><label class="f">Millas a la redonda<input class="i" type="number" id="na-r" value="20" min="1" max="50"></label>
      <label class="f">Edad desde<input class="i" type="number" id="na-e1" value="25" min="18" max="65"></label><label class="f">Edad hasta<input class="i" type="number" id="na-e2" value="65" min="18" max="65"></label>
      <label class="f">Presupuesto por día (USD)<input class="i" type="number" id="na-b" value="5" min="1" step="1"></label><label class="f">Días<input class="i" type="number" id="na-d" value="3" min="1" max="30"></label></div>
    <label class="f">Dónde sale<select class="i" id="na-u"><option value="fbig">Facebook e Instagram</option><option value="wa">Estados de WhatsApp + historias de Instagram</option><option value="todo">Todo (Facebook, Instagram y Estados de WhatsApp)</option></select></label>
    <label class="f">Texto del anuncio<textarea class="i" id="na-t" style="min-height:90px">🎁 ¡Gira la ruleta y gana un regalo para tu cocina! ¡Totalmente gratis! Solo para ${"San Diego"} 🌴</textarea></label>
    <label class="f">Título<input class="i" id="na-h" value="Gira y gana un regalo 🎁" maxlength="40"></label>
    <div class="f"><span>Imagen</span><div class="row"><label class="btn small ghost" style="cursor:pointer">📷 Subir mi foto o flyer<input type="file" id="na-f" accept="image/*" hidden></label><span class="note" id="na-fn">Si no subes nada, se usa la imagen de la ruleta con los regalos.</span></div></div>
    <p class="note">El anuncio se crea <b>en pausa</b>: lo revisas y luego tocas <b>Activar</b>. Meta lo revisa antes de mostrarlo. Se cobra a la tarjeta de tu cuenta de anuncios.</p>
    <div class="row"><button class="btn" id="na-ok">Crear anuncio</button><button class="btn ghost" data-close>Cancelar</button></div><div id="na-msg" class="note"></div>`, () => {
    const q = x => document.getElementById(x); let foto = null;
    q("na-link").onchange = () => { const v = q("na-link").value==="_nuevo" ? "" : "none"; q("na-pw").style.display = v;  };
    const pgNom = () => { const o = q("na-pg").selectedOptions[0]; return o ? o.textContent.split("/")[0].trim() : "Lunatikat Group"; };
    let alTocado = false; const alVer = () => { q("na-alv").textContent = q("na-al").value.trim() || pgNom(); };
    q("na-al").value = pgNom(); alVer();
    q("na-al").oninput = () => { alTocado = true; alVer(); };
    q("na-pg").onchange = () => { if (!alTocado) q("na-al").value = pgNom(); alVer(); };
    q("na-z").onchange = () => { const t = q("na-t"); t.value = t.value.replace(/Solo para [^🌴]*🌴/, `Solo para ${q("na-z").value} 🌴`); };
    q("na-f").onchange = () => { const f = q("na-f").files[0]; if (f){ foto = URL.createObjectURL(f); q("na-fn").textContent = "✅ " + f.name; } };
    q("na-ok").onclick = async () => { const b = q("na-ok"); b.disabled = true; const msg = t => q("na-msg").textContent = t;
      try { const r = await crearAnuncio({ac:q("na-ac").value, pg:q("na-pg").value, link:q("na-link").value, prog:q("na-p").value, alias:(q("na-al").value.trim()||q("na-pg").selectedOptions[0]?.textContent.split("/")[0].trim()||"Lunatikat Group").slice(0,40), zona:q("na-z").value, radio:+q("na-r").value||20, e1:+q("na-e1").value||25, e2:+q("na-e2").value||65, diario:Math.max(1,+q("na-b").value||5), dias:Math.max(1,+q("na-d").value||3), ubic:q("na-u").value, texto:q("na-t").value.trim(), titulo:q("na-h").value.trim(), foto}, msg);
        closeModal(); toast("Anuncio creado en pausa. Revísalo y toca Activar."); render(); }
      catch(e){ console.log(e); b.disabled = false; msg("❌ " + (e.message || "No se pudo crear") + (e.meta?.error_subcode ? ` (código ${e.meta.code}/${e.meta.error_subcode})` : "")); } };
  }); }

async function crearAnuncio(o, msg){
  /* 1) el link de la ruleta */
  let code = o.link;
  if (code === "_nuevo"){ const pr = misProgramas(); if (!pr.length) throw new Error("Primero crea un programa de ruleta");
    code = newCode() + newCode().slice(0,2); const pid = (o.prog && pr.some(([x]) => x===o.prog)) ? o.prog : pr[0][0]; const base = juegoBase(S.uid, pid); const nombre = "Anuncio " + o.zona + " " + fmt(Date.now(),{day:"numeric",month:"short"});
    const bt = S.db.batch(); bt.set(S.db.doc("juegos/"+code), {...base, until:0, ref:nombre, alias:(o.alias||"Lunatikat Group"), anuncio:true, kind:"cliente"});
    bt.set(S.db.doc("leads/"+code+"_ref"), {code, pid:base.pid, name:nombre, tel:"", kind:"ref", status:"ref", socioId:S.uid, up:base.up, tv:base.tv, by:S.uid, ref:nombre, at:Date.now()}); await bt.commit();
    S.juegos[code] = {...base, until:0, ref:nombre, alias:(o.alias||"Lunatikat Group"), anuncio:true, kind:"cliente"}; }
  const j = S.juegos[code]; const link = jgLink(code) + "&utm_source=meta&utm_campaign=" + code;
  /* 2) la imagen */
  msg("Subiendo la imagen…");
  let b64; if (o.foto) b64 = await imgBase64(o.foto); else { const blob = await promoImg(j, S.programs[j.pid]||{}, jgLink(code)); b64 = await imgBase64(URL.createObjectURL(blob)); }
  const img = await fbApi(`/${o.ac}/adimages`, "post", {bytes: b64}); const hash = Object.values(img.images||{})[0]?.hash; if (!hash) throw new Error("Meta no aceptó la imagen");
  msg("Preparando el anuncio…");
  const cre = await fbApi(`/${o.ac}/adcreatives`, "post", {name:`Lunatikat · ${o.zona} · creativo`, object_story_spec:{page_id:o.pg, link_data:{link, message:o.texto, name:o.titulo||"Gira y gana", image_hash:hash, call_to_action:{type:"LEARN_MORE", value:{link}}}}});
  /* 3) campaña, conjunto (zona, edad, presupuesto, ubicaciones) y anuncio, todo en pausa */
  msg("Creando la campaña…"); const nombre = `Lunatikat · ${o.zona} · ${fmt(Date.now(),{day:"numeric",month:"short"})}`;
  const camp = await fbApi(`/${o.ac}/campaigns`, "post", {name:nombre, objective:"OUTCOME_TRAFFIC", status:"PAUSED", special_ad_categories:[], is_adset_budget_sharing_enabled:false});
  const z = ADS_ZONAS.find(x => x[0]===o.zona) || ADS_ZONAS[0];
  const pl = o.ubic==="fbig" ? {publisher_platforms:["facebook","instagram"]}
    : o.ubic==="wa" ? {publisher_platforms:["instagram","whatsapp"], instagram_positions:["story"], whatsapp_positions:["status"]}
    : {publisher_platforms:["facebook","instagram","whatsapp"], instagram_positions:["stream","story","reels"], whatsapp_positions:["status"]};
  const ini = Date.now() + 10*60e3, fin = ini + o.dias*864e5;
  msg("Configurando la zona y el presupuesto…");
  let set, ad; try {
  set = await fbApi(`/${o.ac}/adsets`, "post", {name:nombre + " · conjunto", campaign_id:camp.id, status:"PAUSED", daily_budget:Math.round(o.diario*100), billing_event:"IMPRESSIONS", optimization_goal:"LINK_CLICKS", bid_strategy:"LOWEST_COST_WITHOUT_CAP", destination_type:"WEBSITE",
    start_time:new Date(ini).toISOString(), end_time:new Date(fin).toISOString(),
    targeting:{geo_locations:{custom_locations:[{latitude:z[1], longitude:z[2], radius:Math.min(50,Math.max(1,o.radio)), distance_unit:"mile"}], location_types:["home","recent"]}, age_min:Math.max(18,o.e1), age_max:Math.min(65,o.e2), locales:[23,7], ...pl}});
  msg("Creando el anuncio…");
  ad = await fbApi(`/${o.ac}/ads`, "post", {name:nombre, adset_id:set.id, creative:{creative_id:cre.id}, status:"PAUSED"});
  } catch(e){ try { await fbApi(`/${camp.id}`, "delete", {}); } catch {} throw e; } /* si falla, borra la campaña vacía */
  const doc = {owner:S.uid, at:Date.now(), nombre, ac:o.ac, campaign:camp.id, adset:set.id, ad:ad.id, code, zona:o.zona, diario:o.diario, dias:o.dias, ubic:{fbig:"Facebook e Instagram", wa:"Estados de WhatsApp", todo:"Facebook, Instagram y WhatsApp"}[o.ubic], estado:"PAUSED"};
  const ref = await S.db.collection("anuncios").add(doc); (S.anuncios ||= {})[ref.id] = doc; return doc; }

async function adEstado(k, st){ const a = S.anuncios?.[k]; if (!a) return;
  if (st==="ACTIVE" && !confirm(`¿Activar el anuncio? Meta va a cobrar hasta ${money(a.diario)} por día durante ${a.dias} días a tu tarjeta.`)) return;
  try { for (const id of [a.campaign, a.adset, a.ad]) await fbApi("/"+id, "post", {status:st}); await S.db.doc("anuncios/"+k).update({estado:st}); a.estado = st; toast(st==="ACTIVE" ? "Anuncio activado. Meta lo revisa y empieza a mostrarlo." : "Anuncio en pausa"); render(); }
  catch(e){ toast(e.message || "No se pudo cambiar"); } }
async function adResultados(k){ const a = S.anuncios?.[k]; if (!a) return;
  try { const r = await fbApi(`/${a.campaign}/insights`, "get", {fields:"spend,impressions,clicks,reach", date_preset:"maximum"}); const x = (r.data||[])[0] || {};
    const st = await fbApi("/"+a.ad, "get", {fields:"effective_status"}); const ins = {spend:+x.spend||0, impressions:+x.impressions||0, clicks:+x.clicks||0, reach:+x.reach||0};
    await S.db.doc("anuncios/"+k).update({ins, estado: st.effective_status==="ACTIVE" ? "ACTIVE" : st.effective_status==="PAUSED"||st.effective_status==="CAMPAIGN_PAUSED"||st.effective_status==="ADSET_PAUSED" ? "PAUSED" : st.effective_status});
    Object.assign(a, {ins}); toast("Resultados actualizados"); render(); }
  catch(e){ toast(e.message || "No se pudo leer"); } }

function subAnuncios(){ if (S.subAds || !S.uid) return; S.subAds = true;
  const q = role()==="admin" ? S.db.collection("anuncios") : S.db.collection("anuncios").where("owner","==",S.uid);
  S.unsub.push(q.onSnapshot(s => { S.anuncios = {}; s.docs.forEach(d => S.anuncios[d.id] = d.data()); if (S.view==="juego") render(); }, e => console.log("anuncios", e))); }
