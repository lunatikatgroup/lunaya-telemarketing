/* ===== Ruleta y caja sorpresa (programa de referidos) =====
   programs/{pid}  : regalos con foto y probabilidad, meta de referidos. Público (lo ve quien abre el link).
   juegos/{code}   : el link de un cliente (o de una campaña). Público solo el nombre que se muestra y el contador.
   leads/{code_tel}: cada amiga que participa. Privado: lo ven el socio, quien creó el link y su territorio. */

const JG_ST = {nuevo:"Nuevo", llamado:"Ya se llamó", cita:"Tiene cita", no_interesa:"No le interesa"};
const JG_COLORS = ["#c1272d", "#14213d", "#d4a72c", "#1f6f8b", "#8e2c6b", "#2f7d4f", "#e07a2e", "#3b4bb3"];
const jgLink = code => APP_URL + "?j=" + code;
const telFmt = t => { const d = String(t||"").replace(/\D/g,"").slice(-10); return d.length===10 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : t || ""; };
const firstName = n => String(n||"").trim().split(/\s+/)[0] || "";
function telOk(t){ const d = String(t||"").replace(/\D/g,""); const x = d.length===11 && d[0]==="1" ? d.slice(1) : d;
  if (!/^[2-9][0-9]{9}$/.test(x)) return ""; if (/^(\d)\1{9}$/.test(x) || x==="1234567890") return ""; return x; }
function pickPrize(prizes){ const ok = prizes.map((p,i) => ({i, w: Math.max(0, +p.w||0)})); let tot = ok.reduce((t,x)=>t+x.w,0);
  const pool = tot > 0 ? ok.filter(x=>x.w>0) : ok.map(x=>({...x, w:1})); tot = pool.reduce((t,x)=>t+x.w,0);
  let r = Math.random()*tot; for (const x of pool){ if ((r -= x.w) < 0) return x.i; } return pool[pool.length-1].i; }
const defMsg = tipo => `¡Hola, amiga! 🥰 ¿Cómo estás?\n\nTe quiero invitar a participar en ${tipo==="caja"?"una caja sorpresa":"una ruleta"} de Royal Prestige 🎁 donde puedes ganar productos gratis para tu cocina 😍\n\nY si participas, también me ayudas a mí a ganarme un regalito 🤭💕\n\n👇 ¡Participa aquí!\n{link}\n\n¡Muchas gracias, amiga! ❤️`;
const defCamp = (tipo) => `¡Hola {nombre}! 👋 Te escribe {yo}, de parte de {socio} de Royal Prestige.\n\nTenemos ${tipo==="caja"?"una caja sorpresa":"una ruleta"} de regalos para ti 🎁 ${tipo==="caja"?"Ábrela":"Gira"} y gana un producto para tu cocina, sin costo y sin obligación de compra:\n{link}`;
const fillMsg = (m, o) => String(m||"").replace(/\{link\}/g, o.link||"").replace(/\{nombre\}/g, o.nombre||"").replace(/\{yo\}/g, o.yo||"").replace(/\{socio\}/g, o.socio||"");

/* QR como SVG */
function qrSvg(text, px=180){ try { const q = qrcode(0, "M"); q.addData(text); q.make(); const n = q.getModuleCount(); let d = "";
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) if (q.isDark(r,c)) d += `M${c+2},${r+2}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n+4} ${n+4}" width="${px}" height="${px}" shape-rendering="crispEdges" style="background:#fff;border-radius:10px"><path d="${d}" fill="#14213d"/></svg>`; } catch { return ""; } }

/* Ruleta en SVG: cada regalo con su foto */
function wheelSvg(prizes, id="jg-wheel"){
  const n = prizes.length, R = 150, a = 360/n; const pt = (ang, r) => { const t = (ang-90)*Math.PI/180; return [R+r*Math.cos(t), R+r*Math.sin(t)]; };
  let s = "";
  prizes.forEach((p,i) => { const a0 = i*a, a1 = (i+1)*a, [x0,y0] = pt(a0,R), [x1,y1] = pt(a1,R), mid = a0+a/2; const col = JG_COLORS[i % JG_COLORS.length];
    s += n===1 ? `<circle cx="${R}" cy="${R}" r="${R}" fill="${col}"/>` : `<path d="M${R},${R} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${a>180?1:0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" fill="${col}" stroke="#f7e7b4" stroke-width="2"/>`;
    const sz = Math.min(64, Math.max(34, 2*Math.PI*R*0.62/n*0.62)); const lbl = esc(String(p.n||"").slice(0,16));
    s += `<g transform="rotate(${mid} ${R} ${R})">${p.img?`<clipPath id="${id}c${i}"><circle cx="${R}" cy="${R-R*0.6}" r="${sz/2}"/></clipPath><circle cx="${R}" cy="${R-R*0.6}" r="${sz/2+3}" fill="#fff"/><image href="${p.img}" x="${R-sz/2}" y="${R-R*0.6-sz/2}" width="${sz}" height="${sz}" clip-path="url(#${id}c${i})" preserveAspectRatio="xMidYMid slice"/>`:""}
      <text x="${R}" y="${R-R*(p.img?0.3:0.55)}" text-anchor="middle" font-size="${n>6?10:12}" font-weight="800" fill="#fff" style="paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:2px">${lbl}</text></g>`; });
  for (let i=0;i<24;i++){ const [x,y] = pt(i*15, R+9); s += `<circle cx="${x}" cy="${y}" r="3.2" fill="${i%2?"#fff8dc":"#ffd84d"}" class="jg-bulb${i%2}"/>`; }
  return `<div class="jg-wrap"><svg viewBox="-14 -14 ${2*R+28} ${2*R+28}" class="jg-svg"><circle cx="${R}" cy="${R}" r="${R+14}" fill="url(#jg-gold)"/><defs><radialGradient id="jg-gold"><stop offset="80%" stop-color="#f3d36b"/><stop offset="100%" stop-color="#b8861b"/></radialGradient></defs>
    <g id="${id}" style="transform-origin:${R}px ${R}px">${s}</g><circle cx="${R}" cy="${R}" r="30" fill="#14213d" stroke="#f3d36b" stroke-width="5"/><text x="${R}" y="${R+9}" text-anchor="middle" font-size="26">🎁</text></svg>
    <div class="jg-ptr"></div></div>`;
}

/* Sonido de la ruleta (sin archivos) */
let jgAudio = null;
function jgTick(f=900, d=0.03, v=0.08){ try { jgAudio = jgAudio || new (window.AudioContext||window.webkitAudioContext)(); const o = jgAudio.createOscillator(), g = jgAudio.createGain(); o.frequency.value = f; o.type = "triangle"; g.gain.value = v; o.connect(g); g.connect(jgAudio.destination); const t = jgAudio.currentTime; g.gain.exponentialRampToValueAtTime(0.0001, t+d); o.start(t); o.stop(t+d+0.02); } catch {} }
function jgFanfare(){ [523,659,784,1047].forEach((f,i) => setTimeout(() => jgTick(f, 0.25, 0.12), i*130)); }
function confetti(){ const c = document.createElement("canvas"); c.className = "jg-conf"; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c); const x = c.getContext("2d");
  const P = Array.from({length:160}, () => ({x:Math.random()*c.width, y:-20-Math.random()*c.height*0.5, vx:(Math.random()-.5)*3, vy:2+Math.random()*4, r:4+Math.random()*5, a:Math.random()*6, col:JG_COLORS[Math.floor(Math.random()*JG_COLORS.length)]}));
  const t0 = performance.now(); (function f(t){ x.clearRect(0,0,c.width,c.height); P.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.a+=0.1; x.save(); x.translate(p.x,p.y); x.rotate(p.a); x.fillStyle=p.col; x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2); x.restore(); }); if (t-t0 < 3800) requestAnimationFrame(f); else c.remove(); })(t0); }

/* ================= PÁGINA PÚBLICA (la amiga abre el link) ================= */
const JG_CSS = `
body.jg{background:radial-gradient(ellipse at top,#22325e 0%,#14213d 55%,#0b1328 100%);color:#fff;min-height:100%;font-family:var(--body)}
.jg-pg{max-width:480px;margin:0 auto;padding:22px 18px 40px;display:grid;gap:14px;text-align:center}
.jg-top{font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#f3d36b;font-weight:800}
.jg-h{font-family:var(--serif);font-weight:700;font-size:34px;line-height:1.05;margin:0;color:#fff}
.jg-h b{color:#f3d36b}
.jg-p{margin:0;color:#dfe5f5;font-size:16px}
.jg-wrap{position:relative;width:min(88vw,380px);margin:4px auto 0}
.jg-svg{width:100%;height:auto;display:block;filter:drop-shadow(0 10px 24px rgba(0,0,0,.45))}
.jg-ptr{position:absolute;left:50%;top:-6px;transform:translateX(-50%);width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:34px solid #ffd84d;filter:drop-shadow(0 3px 3px rgba(0,0,0,.4))}
.jg-bulb0{animation:jgb 1s infinite}.jg-bulb1{animation:jgb 1s .5s infinite}
@keyframes jgb{50%{opacity:.35}}
.jg-btn{border:0;border-radius:16px;padding:18px 20px;font-size:20px;font-weight:800;cursor:pointer;background:linear-gradient(#ffd84d,#e0a91f);color:#14213d;box-shadow:0 6px 0 #a87a10,0 10px 24px rgba(0,0,0,.35);width:100%;letter-spacing:.02em}
.jg-btn:active{transform:translateY(3px);box-shadow:0 3px 0 #a87a10}
.jg-btn:disabled{opacity:.6}
.jg-btn.alt{background:#25d366;color:#fff;box-shadow:0 6px 0 #178a42}
.jg-btn.sec{background:rgba(255,255,255,.12);color:#fff;box-shadow:none;font-size:16px;padding:14px}
.jg-card{background:#fffdf8;color:#1f1e1d;border-radius:20px;padding:20px 18px;display:grid;gap:12px;text-align:left}
.jg-card h3{margin:0;font-family:var(--serif);font-size:24px;text-align:center}
.jg-card input[type=text],.jg-card input[type=tel]{width:100%;border:2px solid #d4a72c;border-radius:14px;padding:14px 16px;font-size:18px;background:#fff;color:#1f1e1d}
.jg-card label.ck{display:flex;gap:10px;font-size:13.5px;color:#555;align-items:flex-start}
.jg-card label.ck input{width:22px;height:22px;flex:none;margin-top:1px}
.jg-err{color:#b4442f;font-weight:700;font-size:14px;min-height:18px}
.jg-prize{display:grid;justify-items:center;gap:8px}
.jg-prize img{width:150px;height:150px;border-radius:50%;object-fit:cover;border:6px solid #f3d36b;background:#fff;animation:jgpop .6s cubic-bezier(.2,1.6,.4,1)}
@keyframes jgpop{from{transform:scale(.2)}to{transform:scale(1)}}
.jg-prize .pn{font-family:var(--serif);font-weight:700;font-size:26px;color:#a8761b;text-align:center}
.jg-chips{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.jg-chip{background:rgba(255,255,255,.12);border-radius:999px;padding:6px 12px;font-size:13.5px;font-weight:700}
.jg-small{font-size:12.5px;color:#aab3cc}
.jg-boxes{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:8px 0}
.jg-box{font-size:64px;background:rgba(255,255,255,.08);border:2px solid rgba(243,211,107,.5);border-radius:18px;padding:16px 0;cursor:pointer}
.jg-box.shake{animation:jgsh .15s 8}
@keyframes jgsh{25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}}
.jg-conf{position:fixed;inset:0;pointer-events:none;z-index:50}
.jg-bar{height:14px;background:rgba(255,255,255,.15);border-radius:99px;overflow:hidden}.jg-bar i{display:block;height:100%;background:linear-gradient(90deg,#ffd84d,#e0a91f)}
`;
async function startJuego(code, avance){
  S.publicGame = true;
  document.body.className = "jg"; const st = document.createElement("style"); st.textContent = JG_CSS; document.head.appendChild(st);
  document.body.innerHTML = `<div class="jg-pg" id="jg"><div class="jg-p">Cargando…</div></div>`;
  const box = document.getElementById("jg"); code = String(code).toUpperCase().replace(/[^A-Z0-9]/g,"");
  let J, P; try { const js = await S.db.doc("juegos/"+code).get(); if (!js.exists) throw 0; J = js.data(); const ps = await S.db.doc("programs/"+J.pid).get(); if (!ps.exists) throw 0; P = ps.data(); }
  catch { box.innerHTML = `<div class="jg-h">Este link ya no está disponible</div><p class="jg-p">Pídele a quien te lo mandó un link nuevo.</p>`; return; }
  const key = "ly-jg-" + code; let saved = {}; try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  const save = () => { try { localStorage.setItem(key, JSON.stringify(saved)); } catch {} };
  const prizes = P.prizes || []; const tipo = P.tipo || "ruleta"; const ref = firstName(J.ref) ? J.ref : "Tu amiga";
  const vence = J.until ? new Intl.DateTimeFormat("es-US",{weekday:"long", day:"numeric", month:"long"}).format(new Date(J.until)) : "";
  const meta = P.meta || {refs:14, cada:4};
  if (avance){ return showAvance(); }
  if (J.until && J.until < Date.now() && !saved.done){ box.innerHTML = `<div class="jg-top">Juega y gana</div><div class="jg-h">Esta promoción ya terminó</div><p class="jg-p">Pídele a ${esc(ref)} que te mande un link nuevo.</p>`; return; }
  if (saved.done) return showDone();
  if (saved.prize !== undefined) return showForm(saved.prize);
  showIntro();

  function showIntro(){
    const n = J.n || 0;
    box.innerHTML = `<div class="jg-top">✨ Juega y gana ✨</div>
      <h1 class="jg-h"><b>${esc(ref)}</b> te regaló ${tipo==="caja"?"una caja sorpresa":"un giro"} 🎁</h1>
      <p class="jg-p">${tipo==="caja"?"Escoge una caja y descubre tu regalo":"Gira la ruleta y gana un regalo"} para tu cocina. Sin costo y sin obligación de compra.</p>
      ${tipo==="caja" ? `<div class="jg-boxes">${[0,1,2].map(i=>`<button class="jg-box" data-box="${i}" aria-label="Caja ${i+1}">🎁</button>`).join("")}</div>
        <div class="jg-chips">${prizes.map(p=>`<span class="jg-chip">${esc(p.n)}</span>`).join("")}</div>` : wheelSvg(prizes)}
      <div class="jg-chips">${vence?`<span class="jg-chip">⏳ Válido hasta el ${esc(vence)}</span>`:""}${n>=2?`<span class="jg-chip">🔥 ${n} amigas de ${esc(ref)} ya participaron</span>`:""}</div>
      ${tipo==="caja" ? "" : `<button class="jg-btn" id="jg-spin">¡GIRAR!</button>`}
      <p class="jg-small">Un regalo por persona. Solo mayores de 18 años. Sujeto a disponibilidad en tu zona.</p>`;
    if (tipo==="caja") box.querySelectorAll("[data-box]").forEach(b => b.onclick = () => openBox(b));
    else document.getElementById("jg-spin").onclick = spin;
  }
  function won(i){ saved.prize = i; save(); setTimeout(() => { confetti(); jgFanfare(); showForm(i, true); }, 450); }
  function spin(){
    const btn = document.getElementById("jg-spin"); btn.disabled = true; btn.textContent = "Girando…";
    const i = pickPrize(prizes), n = prizes.length, a = 360/n; const target = 360*6 + (360 - (i*a + a/2)) + (Math.random()-.5)*a*0.6;
    const g = document.getElementById("jg-wheel"); const T = 5200, t0 = performance.now(); let lastSeg = 0;
    jgTick(600, 0.01, 0.001);
    (function f(t){ const k = Math.min(1, (t-t0)/T), e = 1 - Math.pow(1-k, 4), ang = target*e; g.style.transform = `rotate(${ang}deg)`;
      const seg = Math.floor(ang / a); if (seg !== lastSeg){ lastSeg = seg; jgTick(); }
      if (k < 1) requestAnimationFrame(f); else won(i); })(t0);
  }
  function openBox(b){ if (box.dataset.busy) return; box.dataset.busy = "1"; b.classList.add("shake"); jgTick(300,0.4,0.05); const i = pickPrize(prizes);
    setTimeout(() => { b.textContent = "✨"; won(i); }, 1300); }
  function prizeHtml(i){ const p = prizes[i] || {n:"Un regalo"}; return `<div class="jg-prize">${p.img?`<img src="${p.img}" alt="">`:`<div style="font-size:90px">🎁</div>`}<div class="pn">${esc(p.n)}</div></div>`; }
  function showForm(i, fresh){
    box.innerHTML = `<div class="jg-top">${fresh?"🎉 ¡Felicidades! 🎉":"Tu regalo te está esperando"}</div><h1 class="jg-h">¡Ganaste!</h1>${prizeHtml(i)}
      <div class="jg-card"><h3>Reserva tu regalo</h3><p style="margin:0;color:#555">Déjanos tus datos para coordinar la entrega.</p>
        <input type="text" id="jg-name" placeholder="Tu nombre y apellido" autocomplete="name">
        <input type="tel" id="jg-tel" placeholder="Tu celular (10 dígitos)" inputmode="tel" autocomplete="tel">
        <label class="ck"><input type="checkbox" id="jg-ok"><span>Confirmo que soy mayor de 18 años y autorizo que me contacten por llamada, mensaje de texto o WhatsApp para coordinar la entrega de mi regalo.</span></label>
        <div class="jg-err" id="jg-err"></div>
        <button class="jg-btn" id="jg-send">Reservar mi regalo</button></div>
      <p class="jg-small">Sin costo. Sin obligación de compra. Un regalo por persona.</p>`;
    const tel = document.getElementById("jg-tel");
    tel.oninput = () => { const d = tel.value.replace(/\D/g,"").replace(/^1(?=\d{10})/,"").slice(0,10); tel.value = d.length>6 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : d.length>3 ? `(${d.slice(0,3)}) ${d.slice(3)}` : d; };
    document.getElementById("jg-send").onclick = async () => {
      const err = document.getElementById("jg-err"); const name = document.getElementById("jg-name").value.trim().replace(/\s+/g," "); const t = telOk(tel.value);
      if (name.length < 3 || !/[a-záéíóúñ]{2}/i.test(name)) { err.textContent = "Escribe tu nombre."; return; }
      if (!t){ err.textContent = "Escribe tu número completo de 10 dígitos, con código de área."; return; }
      if (!document.getElementById("jg-ok").checked){ err.textContent = "Marca la casilla para poder contactarte."; return; }
      err.textContent = ""; const b = document.getElementById("jg-send"); b.disabled = true; b.textContent = "Guardando…";
      const lid = code + "_" + t;
      try {
        const bt = S.db.batch();
        bt.set(S.db.doc("leads/"+lid), {code, pid:J.pid, name:name.slice(0,60), tel:t, prize:String(prizes[i]?.n||"").slice(0,80), at:Date.now(), socioId:J.socioId, up:J.up||"", tv:!!J.tv, by:J.by, ref:J.ref||"", status:"nuevo", kind:"jugador", acepta:true});
        bt.update(S.db.doc("juegos/"+code), {n:(J.n||0)+1, last:lid});
        await bt.commit();
        saved.done = true; saved.name = name; saved.tel = t; save(); showDone();
      } catch(e){ console.log(e);
        /* el contador cambió mientras jugaba: se reintenta con el número nuevo */
        try { const js = await S.db.doc("juegos/"+code).get(); const n2 = js.data()?.n || 0; if (n2 !== (J.n||0)){ J.n = n2; b.disabled = false; b.textContent = "Reservar mi regalo"; return document.getElementById("jg-send").click(); } } catch {}
        b.disabled = false; b.textContent = "Reservar mi regalo";
        err.textContent = "Ese número ya participó en esta promoción. Si crees que es un error, avísale a " + ref + "."; }
    };
  }
  function showDone(){
    const i = saved.prize ?? 0; const mine = saved.child;
    box.innerHTML = `<div class="jg-top">✅ Regalo reservado</div><h1 class="jg-h">¡Listo${saved.name?", "+esc(firstName(saved.name)):""}!</h1>${prizeHtml(i)}
      <p class="jg-p">Tu regalo quedó reservado. Muy pronto te contactamos para coordinar la entrega.</p>
      <div class="jg-card" style="text-align:center"><h3>🎁 ¿Quieres ganar más regalos?</h3>
        <p style="margin:0;color:#555">Invita a tus amigas a jugar. Cada ${meta.cada||4} amigas que participen, ganas otro regalo (hasta ${Math.floor((meta.refs||14)/(meta.cada||4))}).</p>
        <button class="jg-btn alt" id="jg-inv">Invitar a mis amigas por WhatsApp</button>
        ${mine?`<a class="jg-btn sec" style="text-decoration:none;display:block" href="${jgLink(mine)}&a=1">Ver cuántas amigas llevo</a>`:""}</div>
      <p class="jg-small">Regalo sujeto a disponibilidad en tu zona y a la coordinación con un representante autorizado.</p>`;
    document.getElementById("jg-inv").onclick = async () => {
      const b = document.getElementById("jg-inv"); b.disabled = true;
      try { if (!saved.child){ const c = newCode() + newCode().slice(0,2); await S.db.doc("juegos/"+c).set({pid:J.pid, ref:firstName(saved.name)+" "+(String(saved.name||"").split(/\s+/)[1]||""), socioId:J.socioId, up:J.up||"", tv:!!J.tv, by:J.by, n:0, until:Date.now()+14*864e5, padre:code, refLead:code+"_"+saved.tel, createdAt:Date.now(), kind:"amiga", meta}); saved.child = c; save(); }
        const msg = fillMsg(P.msg || defMsg(tipo), {link:jgLink(saved.child)});
        if (navigator.share) { try { await navigator.share({text:msg}); } catch {} } else location.href = "https://wa.me/?text="+encodeURIComponent(msg);
        showDone();
      } catch(e){ console.log(e); b.disabled = false; location.href = "https://wa.me/?text="+encodeURIComponent(fillMsg(P.msg || defMsg(tipo), {link:jgLink(code)})); }
    };
  }
  function showAvance(){
    const n = J.n||0, cada = meta.cada||4, tot = meta.refs||14, ganados = Math.min(Math.floor(n/cada), Math.floor(tot/cada)), falta = n >= tot ? 0 : cada - (n % cada);
    box.innerHTML = `<div class="jg-top">Tu avance</div><h1 class="jg-h">${esc(firstName(J.ref)||"Hola")}, llevas <b>${n}</b> amiga${n===1?"":"s"}</h1>
      <div class="jg-bar"><i style="width:${Math.min(100, n*100/tot)}%"></i></div><p class="jg-p">Meta: ${tot} amigas · un regalo cada ${cada}</p>
      <div class="jg-chips"><span class="jg-chip">🎁 Regalos ganados: ${ganados}</span>${falta?`<span class="jg-chip">Te faltan ${falta} para el siguiente</span>`:`<span class="jg-chip">🏆 ¡Llegaste a la meta!</span>`}</div>
      <button class="jg-btn alt" id="jg-sh">Invitar a más amigas</button>`;
    document.getElementById("jg-sh").onclick = async () => { const msg = fillMsg(P.msg || defMsg(tipo), {link:jgLink(code)}); if (navigator.share) { try { await navigator.share({text:msg}); } catch {} } else location.href = "https://wa.me/?text="+encodeURIComponent(msg); };
  }
}

/* ================= DENTRO DE LUNAYA ================= */
function subJuegos(){
  S.programs = {}; S.juegos = {}; S.leads = {}; S.jl = {}; S.ll = {}; S.leadsReady = false;
  const r = S.me?.role; const q = [["by", S.uid], ["socioId", S.uid]]; if (S.isOwner || r==="admin" || isDist()) q.push(["up", S.uid]); if (r==="tele" && !S.me?.upline) q.push(["tv", true]);
  S.unsub.push(S.db.collection("programs").onSnapshot(s => { S.programs = {}; s.docs.forEach(d => S.programs[d.id] = d.data()); if (S.view==="juego") render(); }, e => console.log("programs", e)));
  q.forEach(([f,v]) => {
    S.unsub.push(S.db.collection("juegos").where(f, "==", v).onSnapshot(s => { const m = {}; s.docs.forEach(d => m[d.id] = d.data()); S.jl[f] = m; S.juegos = Object.assign({}, ...Object.values(S.jl)); if (S.view==="juego") render(); }, e => console.log("juegos", f, e)));
    S.unsub.push(S.db.collection("leads").where(f, "==", v).onSnapshot(s => { const m = {}; s.docs.forEach(d => m[d.id] = d.data()); S.ll[f] = m; const prev = S.leads; S.leads = Object.assign({}, ...Object.values(S.ll));
      if (S.leadsReady){ Object.entries(S.leads).forEach(([id,l]) => { if (!prev[id] && l.kind==="jugador") avisar("🎁 Nuevo prospecto de la ruleta", `${l.name} · ganó ${l.prize}${l.ref?" · amiga de "+l.ref:""}`); }); }
      setTimeout(() => S.leadsReady = true, 4000); render(); }, e => console.log("leads", f, e)));
  });
}
const nuevosLeads = () => Object.values(S.leads||{}).filter(l => l.kind==="jugador" && l.status==="nuevo").length;
/* Programas que puede usar: los suyos, los de su director o distribuidor y, para las telemarketers del programa, los de Dirección */
function misProgramas(){ const yo = pagadorDe(S.uid);
  return Object.entries(S.programs||{}).filter(([,p]) => p.activo!==false && (p.owner===S.uid || p.owner===yo || pagadorDe(p.owner)===yo || (role()==="tele" && !S.me?.upline && S.members[p.owner]?.role==="admin")))
    .sort((a,b) => (b[1].owner===S.uid) - (a[1].owner===S.uid) || (b[1].createdAt||0)-(a[1].createdAt||0)); }
const progName = pid => S.programs?.[pid]?.name || "Programa";

function viewJuego(r){
  const f = S.f.lead || "nuevo"; const leads = Object.entries(S.leads||{}).filter(([,l]) => l.kind==="jugador" && (f==="todos" || l.status===f)).sort((a,b)=>(b[1].at||0)-(a[1].at||0));
  const progs = misProgramas(); const mine = Object.entries(S.programs||{}).filter(([,p]) => p.owner===S.uid);
  const links = Object.entries(S.juegos||{}).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
  return `<div class="card"><div class="row"><button class="btn" id="jg-ins">🎁 Inscribir cliente</button><button class="btn dark" id="jg-camp">📣 Campaña por mensaje</button><button class="btn ghost" id="jg-newp">➕ Nuevo programa</button></div>
      ${progs.length?"":`<p class="note" style="margin-bottom:0">Primero crea un programa: los regalos con su foto, la probabilidad de cada uno y la meta de referidos.</p>`}</div>
    <div class="card"><h2>Prospectos que llegaron<span class="note">${nuevosLeads()} nuevo(s)</span></h2>
      <div class="chips" style="margin-bottom:10px">${[["nuevo","Nuevos"],["llamado","Ya se llamó"],["cita","Con cita"],["no_interesa","No le interesa"],["todos","Todos"]].map(([k,l])=>`<button class="chip ${f===k?"on":""}" data-lf="${k}">${l}</button>`).join("")}</div>
      ${leads.length?`<div class="list">${leads.slice(0,80).map(([id,l])=>`<button class="item" data-lead="${id}"><div><div class="t">${esc(l.name)}</div><div class="m">${telFmt(l.tel)} · 🎁 ${esc(l.prize)}</div><div class="m">Amiga de ${esc(l.ref||"—")} · ${fmt(l.at,{day:"numeric",month:"short"})}${l.socioId!==S.uid?" · para "+esc(memberName(l.socioId)):""}</div></div><span class="tag ${l.status==="nuevo"?"tg-warn":l.status==="cita"?"tg-good":"tg-mute"}">${JG_ST[l.status]||l.status}</span></button>`).join("")}</div>`:`<div class="empty">${f==="nuevo"?"No hay prospectos nuevos. Cuando alguien juegue con uno de tus links, aparece aquí solo.":"No hay prospectos aquí."}</div>`}</div>
    <div class="card"><h2>Links activos<span class="note">${links.length}</span></h2>
      ${links.length?`<div class="list">${links.slice(0,40).map(([c,j])=>{ const m = j.meta || S.programs?.[j.pid]?.meta || {refs:14,cada:4}; const venc = j.until && j.until < Date.now();
        return `<div class="item" style="cursor:default"><div style="min-width:0"><div class="t">${j.kind==="campana"?"📣 ":j.kind==="amiga"?"👭 ":""}${esc(j.ref||"")}</div><div class="m">${esc(progName(j.pid))} · ${j.n||0} de ${m.refs} amigas${venc?" · vencido":j.until?" · hasta "+fmt(j.until,{day:"numeric",month:"short"}):""}${j.socioId!==S.uid?" · "+esc(memberName(j.socioId)):""}</div><div class="bar"><i style="width:${Math.min(100,(j.n||0)*100/(m.refs||14))}%"></i></div></div><button class="btn small" data-share="${c}">Mandar</button></div>`; }).join("")}</div>`:`<div class="empty">Todavía no hay links. Toca “Inscribir cliente”.</div>`}</div>
    <div class="card"><h2>Mis programas</h2>${mine.length?`<div class="list">${mine.map(([id,p])=>`<button class="item" data-prog="${id}"><div><div class="t">${p.tipo==="caja"?"🎁":"🎡"} ${esc(p.name)}</div><div class="m">${(p.prizes||[]).map(x=>esc(x.n)).join(" · ")}</div><div class="m">Meta: ${p.meta?.refs||14} referidos, un regalo cada ${p.meta?.cada||4}${p.activo===false?" · pausado":""}</div></div><span class="note">Editar</span></button>`).join("")}</div>`:`<div class="empty">No has creado programas.${progs.length?" Puedes usar los de tu equipo.":""}</div>`}</div>`;
}
function bindJuego(){
  const m = document.getElementById("main"); if (!m) return; const on = (sel, fn) => m.querySelectorAll(sel).forEach(fn);
  const q = id => document.getElementById(id);
  if (q("jg-newp")) q("jg-newp").onclick = () => openPrograma();
  if (q("jg-ins")) q("jg-ins").onclick = () => openInscribir();
  if (q("jg-camp")) q("jg-camp").onclick = () => openCampana();
  on("[data-lf]", b => b.onclick = () => { S.f.lead = b.dataset.lf; render(); });
  on("[data-lead]", b => b.onclick = () => openLead(b.dataset.lead));
  on("[data-share]", b => b.onclick = () => openShare(b.dataset.share));
  on("[data-prog]", b => b.onclick = () => openPrograma(b.dataset.prog));
}

/* Foto del regalo: cuadrada y liviana para que quepa en la base de datos gratis */
async function fotoChica(file, sz=300){ const url = URL.createObjectURL(file); try { const img = await loadImg(url); const c = document.createElement("canvas"); c.width = c.height = sz; const x = c.getContext("2d"); const s = Math.min(img.width, img.height);
  x.fillStyle = "#fff"; x.fillRect(0,0,sz,sz); x.drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, sz, sz); return c.toDataURL("image/jpeg", 0.72); } finally { URL.revokeObjectURL(url); } }

function openPrograma(pid){
  const P = pid ? JSON.parse(JSON.stringify(S.programs[pid])) : {name:"", tipo:"ruleta", prizes:[{n:"",w:25,img:""},{n:"",w:25,img:""},{n:"",w:25,img:""},{n:"",w:25,img:""}], meta:{refs:14, cada:4}, dias:7, msg:""};
  const rowsHtml = () => P.prizes.map((p,i)=>`<div class="row" style="flex-wrap:nowrap;gap:8px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:8px">
      <label style="cursor:pointer;flex:none">${p.img?`<img src="${p.img}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;display:block">`:`<span style="width:56px;height:56px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-size:12px;text-align:center;font-weight:700;color:var(--muted)">📷<br>Foto</span>`}<input type="file" accept="image/*" data-pimg="${i}" hidden></label>
      <input class="i" data-pn="${i}" value="${esc(p.n)}" placeholder="Regalo ${i+1}" style="flex:1;min-width:0">
      <label class="note" style="display:flex;align-items:center;gap:3px;flex:none"><input class="i" type="number" min="0" max="100" data-pw="${i}" value="${p.w}" style="width:64px;padding:8px 6px">%</label>
      <button class="btn small ghost" data-pdel="${i}" aria-label="Quitar" style="flex:none">✕</button></div>`).join("");
  const tot = () => P.prizes.reduce((t,p)=>t+(+p.w||0),0);
  openModal(`<h3>${pid?"Editar programa":"Nuevo programa"}</h3>
    <label class="f">Nombre del programa<input class="i" id="pg-name" value="${esc(P.name)}" placeholder="Ej.: Ruleta 4 en 14"></label>
    <div class="opts"><button class="opt ${P.tipo!=="caja"?"on":""}" data-ptipo="ruleta">🎡 Ruleta</button><button class="opt ${P.tipo==="caja"?"on":""}" data-ptipo="caja">🎁 Caja sorpresa</button></div>
    <div><div class="eyebrow" style="margin-bottom:6px">Regalos · toca el círculo para poner la foto</div><div id="pg-rows" style="display:grid;gap:8px">${rowsHtml()}</div>
      <div class="row" style="margin-top:8px;justify-content:space-between"><button class="btn small ghost" id="pg-add">+ Agregar regalo</button><span class="note" id="pg-tot"></span></div>
      <p class="note" style="margin:4px 0 0">Pon 0% al regalo que quieres que se vea pero que nunca salga.</p></div>
    <div class="grid2"><label class="f">Meta de referidos<input class="i" type="number" min="1" id="pg-refs" value="${P.meta.refs}"></label><label class="f">Un regalo cada<input class="i" type="number" min="1" id="pg-cada" value="${P.meta.cada}"></label><label class="f">Días que dura cada link<input class="i" type="number" min="1" max="60" id="pg-dias" value="${P.dias||7}"></label></div>
    <label class="f">Mensaje que el cliente manda a sus amigas ({link} es donde va el link)<textarea class="i" id="pg-msg" style="min-height:160px">${esc(P.msg || defMsg(P.tipo))}</textarea></label>
    ${pid?`<label class="note" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pg-act" ${P.activo!==false?"checked":""}> Programa activo (se puede usar para inscribir clientes)</label>`:""}
    <div class="row"><button class="btn" id="pg-save">Guardar programa</button><button class="btn ghost" data-close>Cancelar</button></div>`, bind);
  function bind(){
    const q = id => document.getElementById(id);
    const paint = () => { q("pg-rows").innerHTML = rowsHtml(); const t = tot(); q("pg-tot").innerHTML = `Total: <b>${t}%</b>${t!==100?" (se ajusta solo)":""}`; binds(); };
    function binds(){
      document.querySelectorAll("[data-pn]").forEach(x => x.oninput = () => { P.prizes[+x.dataset.pn].n = x.value; });
      document.querySelectorAll("[data-pw]").forEach(x => x.oninput = () => { P.prizes[+x.dataset.pw].w = Math.max(0, +x.value||0); const t = tot(); q("pg-tot").innerHTML = `Total: <b>${t}%</b>${t!==100?" (se ajusta solo)":""}`; });
      document.querySelectorAll("[data-pdel]").forEach(x => x.onclick = () => { if (P.prizes.length <= 2){ toast("Deja al menos 2 regalos"); return; } P.prizes.splice(+x.dataset.pdel, 1); paint(); });
      document.querySelectorAll("[data-pimg]").forEach(x => x.onchange = async () => { const f = x.files[0]; if (!f) return; try { P.prizes[+x.dataset.pimg].img = await fotoChica(f); paint(); } catch { toast("No se pudo leer esa foto"); } });
    }
    paint();
    q("pg-add").onclick = () => { if (P.prizes.length >= 8){ toast("Máximo 8 regalos"); return; } P.prizes.push({n:"", w:0, img:""}); paint(); };
    document.querySelectorAll("[data-ptipo]").forEach(b => b.onclick = () => { const old = P.tipo; P.tipo = b.dataset.ptipo; document.querySelectorAll("[data-ptipo]").forEach(x => x.classList.toggle("on", x===b)); if (q("pg-msg").value === defMsg(old)) q("pg-msg").value = defMsg(P.tipo); });
    q("pg-save").onclick = async () => {
      P.name = q("pg-name").value.trim(); const prizes = P.prizes.map(p => ({n:p.n.trim().slice(0,40), w:Math.max(0,+p.w||0), img:p.img||""})).filter(p => p.n);
      if (!P.name){ toast("Ponle un nombre al programa"); return; } if (prizes.length < 2){ toast("Pon al menos 2 regalos con nombre"); return; }
      if (!prizes.some(p => p.w > 0)) prizes.forEach(p => p.w = 1);
      const msg = q("pg-msg").value.trim(); if (!msg.includes("{link}")){ toast("El mensaje necesita {link} para poner el link"); return; }
      const doc = {name:P.name.slice(0,60), tipo:P.tipo, prizes, meta:{refs:Math.max(1,+q("pg-refs").value||14), cada:Math.max(1,+q("pg-cada").value||4)}, dias:Math.min(60,Math.max(1,+q("pg-dias").value||7)), msg, owner:pid ? P.owner : S.uid, activo: pid ? q("pg-act").checked : true, createdAt:P.createdAt||Date.now(), updatedAt:Date.now()};
      if (JSON.stringify(doc).length > 900000){ toast("Las fotos pesan mucho. Quita alguna e intenta de nuevo."); return; }
      q("pg-save").disabled = true;
      try { if (pid) await S.db.doc("programs/"+pid).set(doc); else await S.db.collection("programs").add(doc); closeModal(); toast("Programa guardado"); } catch(e){ q("pg-save").disabled = false; writeErr(e); }
    };
  }
}

/* Para quién se crea el link: la telemarketer escoge el socio; el socio, él mismo */
function socioOpts(sel){ const r = role(); const l = r==="tele" ? sociosPara(S.me ? {...S.me, id:S.uid} : null) : r==="admin" ? [{id:S.uid, name:S.me?.name||"Yo"}, ...socios().filter(s=>s.id!==S.uid && S.members[s.id]?.upline===S.uid)] : [{id:S.uid, name:S.me?.name||"Yo"}];
  return l.map(s => `<option value="${s.id}" ${s.id===sel?"selected":""}>${s.id===S.uid?"Yo ("+esc(s.name)+")":esc(s.name)}</option>`).join(""); }
function juegoBase(sid, pid){ const sm = S.members[sid] || {}; const p = S.programs[pid] || {};
  return {pid, socioId:sid, up: sm.upline || "", tv: S.members[pagadorDe(sid)]?.role==="admin", by:S.uid, n:0, until: Date.now() + (p.dias||7)*864e5, createdAt:Date.now(), meta:p.meta||{refs:14,cada:4}}; }
function progSel(id){ const l = misProgramas(); return `<label class="f">Programa<select class="i" id="${id}">${l.map(([pid,p])=>`<option value="${pid}">${p.tipo==="caja"?"🎁":"🎡"} ${esc(p.name)}${p.owner!==S.uid?" · de "+esc(firstName(memberName(p.owner))):""}</option>`).join("")}</select></label>`; }

function openInscribir(){
  if (!misProgramas().length){ toast("Primero crea un programa"); openPrograma(); return; }
  openModal(`<h3>Inscribir cliente</h3><p class="note" style="margin:0">El cliente le manda el link a sus amigas. Ellas giran, ganan y te llegan como prospectos.</p>
    ${progSel("in-p")}
    <label class="f">Para el socio<select class="i" id="in-s">${socioOpts(S.world && role()==="tele" ? S.world : S.uid)}</select></label>
    <div class="grid2"><label class="f">Nombre del cliente<input class="i" id="in-n" placeholder="Ej.: Amada Segura" autocomplete="off"></label><label class="f">Su teléfono<input class="i" id="in-t" inputmode="tel" autocomplete="off"></label></div>
    <div id="in-h"></div>
    <div class="row"><button class="btn" id="in-ok">Crear link</button><button class="btn ghost" data-close>Cancelar</button></div>`, () => {
    const q = id => document.getElementById(id);
    q("in-t").onchange = async () => { const h = await getHistAny(q("in-s").value, q("in-t").value); q("in-h").innerHTML = histHtml(h); if (h && h.name && !q("in-n").value.trim()) q("in-n").value = h.name; };
    q("in-ok").onclick = async () => { const name = q("in-n").value.trim(), t = telOk(q("in-t").value), pid = q("in-p").value, sid = q("in-s").value;
      if (!name){ toast("Escribe el nombre del cliente"); return; } if (q("in-t").value.trim() && !t){ toast("El teléfono debe tener 10 dígitos"); return; }
      q("in-ok").disabled = true; const code = newCode() + newCode().slice(0,2); const base = juegoBase(sid, pid);
      try { const bt = S.db.batch(); bt.set(S.db.doc("juegos/"+code), {...base, ref:name.slice(0,60), kind:"cliente"});
        bt.set(S.db.doc("leads/"+code+"_ref"), {code, pid, name:name.slice(0,60), tel:t||"", kind:"ref", status:"ref", socioId:sid, up:base.up, tv:base.tv, by:S.uid, ref:name.slice(0,60), at:Date.now()}); await bt.commit();
        S.juegos[code] = {...base, ref:name, kind:"cliente"}; S.leads[code+"_ref"] = {name, tel:t, kind:"ref"}; closeModal(); openShare(code); } catch(e){ q("in-ok").disabled = false; writeErr(e); } };
  });
}

/* Mandar el link: al cliente por WhatsApp o texto, imagen con QR, copiar */
function openShare(code){
  const j = S.juegos[code]; if (!j) return; const p = S.programs[j.pid] || {}; const link = jgLink(code); const cli = S.leads[code+"_ref"] || {};
  const msg = j.kind==="campana" ? "" : fillMsg(p.msg || defMsg(p.tipo), {link});
  const tel = telOk(cli.tel);
  openModal(`<h3>${j.kind==="campana"?"Campaña":"Link de "+esc(j.ref)}</h3>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${qrSvg(link, 132)}<div style="flex:1;min-width:180px" class="note">Este link es solo de <b>${esc(j.ref)}</b>: cada amiga que juegue cuenta para su meta${j.until?` · vence el ${fmt(j.until,{day:"numeric",month:"long"})}`:""}.<div style="word-break:break-all;margin-top:6px">${esc(link)}</div></div></div>
    ${msg?`<label class="f">Mensaje para que ${esc(firstName(j.ref))} se lo reenvíe a sus amigas<textarea class="i" id="sh-m" style="min-height:150px">${esc(msg)}</textarea></label>`:""}
    <div class="opts">
      ${msg?`<a class="btn" id="sh-wa" target="_blank" rel="noopener">WhatsApp${tel?" a "+esc(firstName(j.ref)):""}</a><a class="btn dark" id="sh-sms">Mensaje de texto</a>`:""}
      <button class="btn ghost" id="sh-img">🖼️ Imagen con QR</button><button class="btn ghost" id="sh-copy">Copiar ${msg?"mensaje":"link"}</button></div>
    <div id="sh-out"></div><div class="row"><button class="btn ghost" data-close>Cerrar</button></div>`, () => {
    const q = id => document.getElementById(id); const txt = () => q("sh-m") ? q("sh-m").value : link;
    const upd = () => { if (q("sh-wa")) q("sh-wa").href = `https://wa.me/${tel?"1"+tel:""}?text=${encodeURIComponent(txt())}`; if (q("sh-sms")) q("sh-sms").href = `sms:${tel?"+1"+tel:""}&body=${encodeURIComponent(txt())}`; };
    upd(); if (q("sh-m")) q("sh-m").oninput = upd;
    q("sh-copy").onclick = async () => { try { await navigator.clipboard.writeText(txt()); toast("Copiado"); } catch { toast("No se pudo copiar"); } };
    q("sh-img").onclick = async () => { q("sh-img").disabled = true; try { const blob = await promoImg(j, p, link); const file = new File([blob], "ruleta.png", {type:"image/png"});
      if (navigator.canShare && navigator.canShare({files:[file]})) { try { await navigator.share({files:[file], text: txt()}); } catch {} }
      else { const u = URL.createObjectURL(blob); q("sh-out").innerHTML = `<p class="note">Mantén presionada la imagen para guardarla o compartirla.</p><img src="${u}" style="width:100%;border-radius:12px">`; } }
      catch(e){ console.log(e); toast("No se pudo crear la imagen"); } q("sh-img").disabled = false; };
  });
}

/* Imagen para compartir: ruleta con las fotos de los productos + QR */
async function promoImg(j, p, link){
  const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  const g = x.createRadialGradient(W/2, 300, 100, W/2, 700, 1100); g.addColorStop(0, "#2a3d72"); g.addColorStop(1, "#0b1328"); x.fillStyle = g; x.fillRect(0,0,W,H);
  for (let i=0;i<70;i++){ x.fillStyle = `rgba(243,211,107,${Math.random()*.5})`; x.beginPath(); x.arc(Math.random()*W, Math.random()*H, Math.random()*4+1, 0, 7); x.fill(); }
  x.textAlign = "center"; x.fillStyle = "#f3d36b"; x.font = "800 34px Manrope, sans-serif"; x.fillText("✨  JUEGA Y GANA  ✨", W/2, 90);
  x.fillStyle = "#fff"; x.font = "800 92px Manrope, sans-serif"; x.fillText(p.tipo==="caja" ? "¡ABRE Y GANA!" : "¡GIRA Y GANA!", W/2, 190);
  x.font = "600 40px Manrope, sans-serif"; x.fillStyle = "#dfe5f5"; x.fillText(`${firstName(j.ref)||"Tu amiga"} te regaló ${p.tipo==="caja"?"una caja sorpresa":"un giro"} 🎁`, W/2, 250);
  const prizes = p.prizes||[], n = prizes.length||1, cx = W/2, cy = 640, R = 330, a = 2*Math.PI/n;
  x.beginPath(); x.arc(cx, cy, R+26, 0, 7); x.fillStyle = "#e6b93a"; x.fill();
  const imgs = await Promise.all(prizes.map(pr => pr.img ? loadImg(pr.img).catch(()=>null) : null));
  prizes.forEach((pr,i) => { const a0 = -Math.PI/2 + i*a; x.beginPath(); x.moveTo(cx,cy); x.arc(cx,cy,R,a0,a0+a); x.closePath(); x.fillStyle = JG_COLORS[i%JG_COLORS.length]; x.fill(); x.strokeStyle = "#f7e7b4"; x.lineWidth = 4; x.stroke();
    const mid = a0 + a/2, ir = R*0.6, ix = cx + ir*Math.cos(mid), iy = cy + ir*Math.sin(mid), s = Math.min(150, 2*Math.PI*ir/n*0.62);
    if (imgs[i]){ x.save(); x.beginPath(); x.arc(ix, iy, s/2+6, 0, 7); x.fillStyle = "#fff"; x.fill(); x.beginPath(); x.arc(ix, iy, s/2, 0, 7); x.clip(); x.drawImage(imgs[i], ix-s/2, iy-s/2, s, s); x.restore(); }
    x.save(); x.translate(cx + R*0.28*Math.cos(mid), cy + R*0.28*Math.sin(mid)); x.rotate(mid + Math.PI/2); x.fillStyle = "#fff"; x.font = `800 ${n>6?22:26}px Manrope, sans-serif`; x.fillText(String(pr.n).slice(0,14), 0, 0); x.restore(); });
  for (let i=0;i<28;i++){ const t = i*2*Math.PI/28; x.beginPath(); x.arc(cx+(R+13)*Math.cos(t), cy+(R+13)*Math.sin(t), 7, 0, 7); x.fillStyle = i%2 ? "#fff8dc" : "#ffd84d"; x.fill(); }
  x.beginPath(); x.arc(cx, cy, 62, 0, 7); x.fillStyle = "#14213d"; x.fill(); x.lineWidth = 10; x.strokeStyle = "#f3d36b"; x.stroke(); x.font = "60px serif"; x.fillText("🎁", cx, cy+22);
  x.beginPath(); x.moveTo(cx-30, cy-R-46); x.lineTo(cx+30, cy-R-46); x.lineTo(cx, cy-R+14); x.closePath(); x.fillStyle = "#ffd84d"; x.fill();
  /* QR */
  const q = qrcode(0, "M"); q.addData(link); q.make(); const nm = q.getModuleCount(), qs = 230, cell = qs/nm, qx = W/2 - qs/2 - 230, qy = 1030;
  x.fillStyle = "#fff"; x.beginPath(); x.roundRect ? x.roundRect(qx-18, qy-18, qs+36, qs+36, 22) : x.rect(qx-18, qy-18, qs+36, qs+36); x.fill(); x.fillStyle = "#14213d";
  for (let r=0;r<nm;r++) for (let k=0;k<nm;k++) if (q.isDark(r,k)) x.fillRect(qx+k*cell, qy+r*cell, Math.ceil(cell), Math.ceil(cell));
  x.textAlign = "left"; x.fillStyle = "#fff"; x.font = "800 50px Manrope, sans-serif"; x.fillText("Escanea o toca", qx+qs+60, qy+70); x.fillText("el link 👆", qx+qs+60, qy+130);
  x.fillStyle = "#aab3cc"; x.font = "500 26px Manrope, sans-serif"; x.fillText("Sin costo · sin obligación de compra", qx+qs+60, qy+190); x.fillText("Solo mayores de 18 años", qx+qs+60, qy+228);
  return await new Promise(res => c.toBlob(res, "image/png"));
}

function openLead(id){
  const l = S.leads[id]; if (!l) return; const t = telOk(l.tel) || l.tel;
  openModal(`<h3>${esc(l.name)}</h3><div class="note" style="margin-top:-6px">🎁 Ganó: <b>${esc(l.prize)}</b> · Amiga de ${esc(l.ref||"—")} · ${esc(progName(l.pid))} · ${fmtWhen(l.at)}${l.socioId!==S.uid?` · para ${esc(memberName(l.socioId))}`:""}</div>
    <div class="row"><a class="btn" href="tel:+1${t}">📞 Llamar</a><a class="btn dark" target="_blank" rel="noopener" href="https://wa.me/1${t}?text=${encodeURIComponent(`¡Hola ${firstName(l.name)}! 🎉 Te escribo de Royal Prestige por el regalo que ganaste en la ${S.programs[l.pid]?.tipo==="caja"?"caja sorpresa":"ruleta"}: ${l.prize}. ¿Cuándo te queda bien para coordinar la entrega?`)}">WhatsApp</a><a class="btn ghost" href="sms:+1${t}">Mensaje</a></div>
    <div class="note">${telFmt(t)}</div><div id="ld-h"></div>
    <label class="f">Estado<select class="i" id="ld-st">${Object.entries(JG_ST).map(([k,v])=>`<option value="${k}" ${l.status===k?"selected":""}>${v}</option>`).join("")}</select></label>
    <label class="f">Notas<textarea class="i" id="ld-n" placeholder="Qué te dijo, cuándo volver a llamar…">${esc(l.notes||"")}</textarea></label>
    <div class="row"><button class="btn" id="ld-cita">📅 Agendar cita</button><button class="btn ghost" id="ld-save">Guardar</button><button class="btn ghost" data-close>Cerrar</button></div>`, () => {
    const q = x => document.getElementById(x);
    getHistAny(l.socioId, t).then(h => { const e = q("ld-h"); if (e) e.innerHTML = histHtml(h); });
    const upd = async (o) => { try { await S.db.doc("leads/"+id).update({...o, statusAt:Date.now()}); return true; } catch(e){ writeErr(e); return false; } };
    q("ld-save").onclick = async () => { if (await upd({status:q("ld-st").value, notes:q("ld-n").value.trim().slice(0,1000)})){ closeModal(); toast("Guardado"); } };
    q("ld-cita").onclick = () => { const own = l.socioId===S.uid; if (!own){ if (!S.members[l.socioId]){ toast("Ese socio ya no está en el equipo"); return; } S.world = l.socioId; }
      const pre = {name:l.name, phone:telFmt(t), notes:`Ganó ${l.prize} en la ${S.programs[l.pid]?.tipo==="caja"?"caja sorpresa":"ruleta"} · amiga de ${l.ref||""}${l.notes?" · "+l.notes:""}`, onSaved: aid => S.db.doc("leads/"+id).update({status:"cita", apptId:aid, statusAt:Date.now()}).catch(()=>{})};
      closeModal(); openCitaForm(own ? "" : "Ruleta", own, pre); };
  });
}

/* Campaña: la telemarketer o el socio le manda el link a una lista de personas, uno por uno, por WhatsApp o texto */
function openCampana(code){
  if (!code && !misProgramas().length){ toast("Primero crea un programa"); openPrograma(); return; }
  if (!code){
    openModal(`<h3>📣 Campaña por mensaje</h3><p class="note" style="margin:0">Crea un link de ${esc(role()==="tele"?"un socio":"tu ruleta")} y mándaselo a una lista de personas, una por una, con su nombre.</p>
      ${progSel("cp-p")}<label class="f">De parte de<select class="i" id="cp-s">${socioOpts(S.world && role()==="tele" ? S.world : S.uid)}</select></label>
      <label class="f">Contactos: uno por línea, nombre y teléfono<textarea class="i" id="cp-l" style="min-height:140px" placeholder="María López, 619 555 1234&#10;Rosa Pérez, (858) 555-9876"></textarea></label>
      <button class="btn small ghost" id="cp-from" type="button">Agregar prospectos nuevos de la ruleta</button>
      <label class="f">Mensaje ({nombre}, {yo}, {socio} y {link} se llenan solos)<textarea class="i" id="cp-m" style="min-height:130px">${esc(defCamp(S.programs[misProgramas()[0]?.[0]]?.tipo))}</textarea></label>
      <div class="row"><button class="btn" id="cp-ok">Crear campaña</button><button class="btn ghost" data-close>Cancelar</button></div>`, () => {
      const q = id => document.getElementById(id);
      q("cp-from").onclick = () => { const sid = q("cp-s").value; const l = Object.values(S.leads).filter(x => x.kind==="jugador" && x.status==="nuevo" && x.socioId===sid); if (!l.length){ toast("No hay prospectos nuevos de ese socio"); return; } q("cp-l").value = (q("cp-l").value.trim() ? q("cp-l").value.trim()+"\n" : "") + l.map(x => `${x.name}, ${telFmt(x.tel)}`).join("\n"); };
      q("cp-ok").onclick = async () => { const pid = q("cp-p").value, sid = q("cp-s").value; const lista = [];
        q("cp-l").value.split(/\n+/).map(s=>s.trim()).filter(Boolean).forEach(line => { const t = telOk(line.replace(/[^\d+]/g," ").trim().split(/\s+/).join("")) || telOk((line.match(/[\d\s().+-]{10,}/)||[""])[0]); const nm = line.replace(/[\d().+-]/g,"").replace(/[,;]+/g," ").trim(); if (t && !lista.some(x=>x.t===t)) lista.push({n:nm.slice(0,60), t, s:0}); });
        if (!lista.length){ toast("No encontré teléfonos de 10 dígitos en la lista"); return; }
        q("cp-ok").disabled = true; const code = newCode() + newCode().slice(0,2); const base = juegoBase(sid, pid); const sname = memberName(sid);
        try { const bt = S.db.batch(); bt.set(S.db.doc("juegos/"+code), {...base, ref:sname.slice(0,60), kind:"campana"});
          bt.set(S.db.doc("leads/"+code+"_ref"), {code, pid, name:"Campaña "+fmt(Date.now(),{day:"numeric",month:"short"}), tel:"", kind:"ref", status:"ref", socioId:sid, up:base.up, tv:base.tv, by:S.uid, ref:sname.slice(0,60), at:Date.now(), lista, msg:q("cp-m").value.slice(0,1500)}); await bt.commit();
          S.juegos[code] = {...base, ref:sname, kind:"campana"}; S.leads[code+"_ref"] = {kind:"ref", lista, msg:q("cp-m").value}; closeModal(); openCampana(code); } catch(e){ q("cp-ok").disabled = false; writeErr(e); } };
    }); return; }
  const j = S.juegos[code], L = S.leads[code+"_ref"] || {}; const lista = L.lista || []; const link = jgLink(code);
  const yo = firstName(S.me?.name), socio = memberName(j.socioId);
  const msgFor = c => fillMsg(L.msg || defCamp(S.programs[j.pid]?.tipo), {nombre:firstName(c.n), yo, socio, link});
  openModal(`<h3>📣 Campaña · ${lista.filter(c=>c.s).length} de ${lista.length} enviados</h3><p class="note" style="margin:0">Toca WhatsApp o Texto en cada persona. Cada mensaje sale con su nombre.</p>
    <div class="list">${lista.map((c,i)=>`<div class="item" style="cursor:default;${c.s?"opacity:.55":""}"><div><div class="t">${c.s?"✅ ":""}${esc(c.n||"Sin nombre")}</div><div class="m">${telFmt(c.t)}</div></div><div class="row" style="flex-wrap:nowrap"><a class="btn small" target="_blank" rel="noopener" data-cs="${i}" href="https://wa.me/1${c.t}?text=${encodeURIComponent(msgFor(c))}">WhatsApp</a><a class="btn small dark" data-cs="${i}" href="sms:+1${c.t}&body=${encodeURIComponent(msgFor(c))}">Texto</a></div></div>`).join("")}</div>
    <div class="row"><button class="btn ghost" id="cp-img">🖼️ Imagen con QR</button><button class="btn ghost" data-close>Cerrar</button></div>`, () => {
    document.querySelectorAll("[data-cs]").forEach(a => a.addEventListener("click", () => { const i = +a.dataset.cs; if (lista[i].s) return; lista[i].s = Date.now();
      S.db.doc("leads/"+code+"_ref").update({lista}).catch(e => console.log(e)); setTimeout(() => openCampana(code), 800); }));
    document.getElementById("cp-img").onclick = () => openShare(code);
  });
}
