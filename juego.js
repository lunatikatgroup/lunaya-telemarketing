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
/* Probar un juego en la misma pantalla, sin guardar nada */
function probarJuego(prog, tipo, anuncio){ if (!prog) return; try { sessionStorage.setItem("ly-back-y", String(window.scrollY||0)); history.pushState({demo:1}, "", location.href); } catch {} window.__demoAd = !!anuncio; window.__demo = {...JSON.parse(JSON.stringify(prog)), ...(tipo ? {tipo} : {})}; window.__demo = conJuego(window.__demo, {tipo: tipo || prog.tipo}); closeModal && closeModal(); window.scrollTo(0,0); startJuego("PRUEBA"); }
/* ===== Tipos de juego: el distribuidor escoge el que quiera ===== */
const TIPOS_JG = {
  ruleta:{e:"🎡", n:"Ruleta", una:"una ruleta", cta:"Gira", corto:"¡Gira y gana!", pill:"te regaló un giro 🎁", sub:"Gira la ruleta y gana un regalo para tu cocina.", btn:"¡GIRAR!", d:"La clásica: gira y gana."},
  caja:{e:"🎁", n:"Caja sorpresa", una:"una caja sorpresa", cta:"Ábrela", corto:"¡Abre y gana!", pill:"te regaló una caja sorpresa 🎁", sub:"Escoge una caja y descubre tu regalo para tu cocina.", btn:"", d:"Escoge 1 de 3 cajas."},
  rasca:{e:"🪙", n:"Rasca y gana", una:"un rasca y gana", cta:"Raspa", corto:"¡Raspa y gana!", pill:"te regaló un rasca y gana 🎁", sub:"Raspa la tarjeta con tu dedo y descubre tu regalo.", btn:"", d:"Raspa con el dedo y descubre el premio."},
  quiz:{e:"📝", n:"Test cocina sana", una:"un test de cocina saludable", cta:"Haz el test", corto:"¡Haz el test y gana!", pill:"te invitó al test de cocina sana 🥗", sub:"Responde 5 preguntas rápidas, descubre qué tan sana es tu cocina y gana un regalo.", btn:"EMPEZAR EL TEST", d:"5 preguntas + resultado + rasca y gana. Trae clientes más interesados."},
  puzzle:{e:"🧩", n:"Rompecabezas", una:"un rompecabezas de regalos", cta:"Arma el rompecabezas", corto:"¡Ármalo y gana!", pill:"te retó a un rompecabezas 🧩", sub:"Arma la foto del regalo antes de que se acabe el tiempo y es tuyo.", btn:"¡EMPEZAR!", d:"Arma la foto del regalo contra reloj: lo que arma es lo que se gana."},
  tiro:{e:"🎯", n:"Tiro al regalo", una:"un tiro al regalo", cta:"Dispara", corto:"¡Dispara y gana!", pill:"te retó al tiro al regalo 🎯", sub:"Un pajarito se lleva tu regalo: lánzale una estrella desde la canasta y si le das, el regalo es tuyo.", btn:"", d:"Un pajarito vuela con el regalo colgado y la persona le dispara estrellas: si le da, el regalo cae en su canasta. Puede intentar las veces que quiera."},
  pinata:{e:"🪅", n:"La piñata", una:"una piñata de regalos", cta:"Rompe la piñata", corto:"¡Rómpela y gana!", pill:"te invitó a romper la piñata 🪅", sub:"Dale 3 palazos a la piñata cuando pase por el centro, rómpela y descubre tu regalo.", btn:"", d:"La piñata se mueve de lado a lado; con 3 golpes se rompe, caen dulces y sale el regalo."},
  precio:{e:"💲", n:"Adivina el precio", una:"un juego de adivina el precio", cta:"Adivina", corto:"¡Adivina y gana!", pill:"te retó a adivinar un precio 🎁", sub:"Adivina cuánto cuesta y gana un regalo para tu cocina.", btn:"", d:"Adivina el precio de un producto + rasca y gana."}
};
const TI = t => TIPOS_JG[t] || TIPOS_JG.ruleta;
/* Cada link puede llevar su propio juego (el que escogiste al mandarlo); si es distinto al del programa, se usan los textos de ese juego */
const conJuego = (p, j) => !p ? {} : (j && j.tipo && TIPOS_JG[j.tipo] && j.tipo !== (p.tipo||"ruleta")) ? {...p, tipo:j.tipo, textos:{}, msg:""} : p;
const juegosDe = p => Object.entries(TIPOS_JG).filter(([k]) => (k!=="precio" || (p?.precio?.v > 0)) && (k!=="ruleta" || (p?.prizes||[]).length >= 2));
function juegoSel(id, pidSel){ return `<label class="f">¿Qué juego le mandas?<select class="i" id="${id}"></select><span class="note" id="${id}-d"></span></label><button class="btn small ghost" type="button" id="${id}-try" style="justify-self:start">▶️ Probar este juego</button>`; }
function bindJuegoSel(id, pidSel){ const s = document.getElementById(id), ps = document.getElementById(pidSel); if (!s || !ps) return;
  const fill = () => { const p = S.programs?.[ps.value] || {}; const cur = s.value; s.innerHTML = juegosDe(p).map(([k,t]) => `<option value="${k}">${t.e} ${t.n}${k===(p.tipo||"ruleta")?" (el del programa)":""}</option>`).join(""); s.value = juegosDe(p).some(([k]) => k===cur) ? cur : (p.tipo||"ruleta"); desc(); };
  const desc = () => { const d = document.getElementById(id+"-d"); if (d) d.textContent = TI(s.value).d + " Mismos regalos y mismo 4 en 14 del programa."; };
  fill(); ps.addEventListener("change", fill); s.addEventListener("change", desc);
  const tb = document.getElementById(id+"-try"); if (tb) tb.onclick = () => probarJuego(S.programs?.[ps.value], s.value); }
/* Test "¿Qué tan sana es tu cocina?": cada respuesta suma puntos (más puntos = más por mejorar) */
const QUIZ = [
  {q:"¿De qué material son la mayoría de tus ollas y sartenes?", o:[["Acero inoxidable de buena calidad",0],["Teflón o antiadherente",2],["Aluminio",2],["De todo un poco",1]]},
  {q:"¿Tus sartenes antiadherentes están rayados o pelados?", o:[["No tengo antiadherentes",0],["No, están en buen estado",1],["Sí, un poco",2],["Sí, bastante",3]]},
  {q:"¿Cuánto aceite usas normalmente para cocinar?", o:[["Casi nada",0],["Una o dos cucharadas",1],["Bastante",2],["Frío casi todo",3]]},
  {q:"¿Cómo cocinas las verduras?", o:[["Al vapor o en su propio jugo",0],["Salteadas",1],["Hervidas en mucha agua",2],["Casi no comemos verduras",3]]},
  {q:"¿Guardas o calientas la comida en recipientes de plástico?", o:[["No, uso vidrio o acero",0],["A veces",1],["Casi siempre",2]]}
];
const quizNivel = pts => pts <= 3 ? {k:"verde", e:"🟢", t:"¡Tu cocina está muy sana!", c:"Vas muy bien. Te podemos enseñar recetas para sacarle aún más sabor y nutrientes a tus alimentos."}
  : pts <= 8 ? {k:"amarillo", e:"🟡", t:"Tu cocina está en nivel amarillo", c:"Hay algunos hábitos que puedes mejorar: el recubrimiento rayado de los sartenes y el exceso de aceite pueden afectar lo que comes. Una asesora te puede dar ideas sencillas."}
  : {k:"rojo", e:"🔴", t:"Tu cocina necesita atención", c:"Varios de tus utensilios y hábitos podrían estar quitándole nutrientes a tu comida o agregándole cosas que no quieres. Vale la pena una asesoría gratuita en tu casa."};
const precioOpc = v => { const r = x => Math.max(5, Math.round(x/10)*10); const o = [v, r(v*0.55), r(v*1.6)]; return [...new Set(o)].sort(() => Math.random()-.5); };
const defMsg = tipo => `¡Hola, amiga! 🥰 ¿Cómo estás?\n\nTe quiero invitar a participar en ${TI(tipo).una} de Royal Prestige 🎁 donde puedes ganar productos gratis para tu cocina 😍\n\nY si participas, también me ayudas a mí a ganarme un regalito 🤭💕\n\n👇 ¡Participa aquí!\n{link}\n\n¡Muchas gracias, amiga! ❤️`;
const defCamp = (tipo) => `¡Hola {nombre}! 👋 Te escribe {yo}, de parte de {socio} de Royal Prestige.\n\nTenemos ${TI(tipo).una} de regalos para ti 🎁 ${TI(tipo).cta} y gana un regalo para tu cocina. ¡Es totalmente gratis! 🎉\n{link}`;
const fillMsg = (m, o) => String(m||"").replace(/\{link\}/g, o.link||"").replace(/\{nombre\}/g, o.nombre||"").replace(/\{yo\}/g, o.yo||"").replace(/\{socio\}/g, o.socio||"");

/* QR como SVG */
function qrSvg(text, px=180){ try { const q = qrcode(0, "M"); q.addData(text); q.make(); const n = q.getModuleCount(); let d = "";
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) if (q.isDark(r,c)) d += `M${c+2},${r+2}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n+4} ${n+4}" width="${px}" height="${px}" shape-rendering="crispEdges" style="background:#fff;border-radius:10px"><path d="${d}" fill="#14213d"/></svg>`; } catch { return ""; } }

/* Ruleta en SVG: tonos crema y dorado, cada regalo con su foto en grande */
/* Estilos de diseño que cada quien escoge para su ruleta */
const TEMAS = {
  oro:  {n:"Dorado clásico", bg:["#fffdf8","#faf2e1","#efdfbd"], g:["#f8e3a0","#c9971f","#f3d27a","#b8861b"], sl:["#fffaf0","#f3dfa6","#f9ecc8"], ink:"#14213d", acc:"#a8761b", glow:"255,232,170"},
  rosa: {n:"Rosa elegante",  bg:["#fffafa","#fbeef0","#f1d3d8"], g:["#f7d9d3","#c47d74","#efc0b6","#a65f57"], sl:["#fffafa","#f6d5d8","#fbe6e8"], ink:"#4a2330", acc:"#a65f57", glow:"250,210,215"},
  azul: {n:"Azul y plata",   bg:["#fbfdff","#eef4fb","#d3e0ef"], g:["#f1f4f8","#8d9db4","#dfe6ef","#6f7f98"], sl:["#ffffff","#dbe6f3","#ecf2f9"], ink:"#14213d", acc:"#3b5b8f", glow:"215,228,245"},
  verde:{n:"Verde y oro",    bg:["#fbfdf8","#eef5ea","#d6e5cc"], g:["#f8e3a0","#c9971f","#f3d27a","#b8861b"], sl:["#ffffff","#d7e8cd","#eaf3e4"], ink:"#1f3a2b", acc:"#a8761b", glow:"240,230,180"}
};
let JGT = TEMAS.oro;
/* Fondo con foto: la cocina de Royal o una foto que suba cada quien */
const fondoSrc = p => p.fondo==="colores" ? "" : (/^data:image\/jpeg;base64,/.test(p.fondo||"") ? p.fondo : "fondo-cocina.jpg?v=2");
const setTema = t => { JGT = TEMAS[t] || TEMAS.oro; return JGT; };
const TXT_DEF = tipo => ({top:"Juega y gana", pill:TI(tipo).pill, sub:TI(tipo).sub, btn:TI(tipo).btn});
const txtDe = p => ({...TXT_DEF(p.tipo), ...Object.fromEntries(Object.entries(p.textos||{}).filter(([,v]) => String(v||"").trim()))});
const JG_SL = n => n%2 ? JGT.sl : JGT.sl.slice(0,2);
function wheelSvg(prizes, id="jg-wheel"){
  const n = prizes.length, R = 150, a = 360/n; const pt = (ang, r) => { const t = (ang-90)*Math.PI/180; return [R+r*Math.cos(t), R+r*Math.sin(t)]; }; const SL = JG_SL(n);
  let s = "";
  prizes.forEach((p,i) => { const a0 = i*a, a1 = (i+1)*a, [x0,y0] = pt(a0,R), [x1,y1] = pt(a1,R), mid = a0+a/2; const col = SL[i % SL.length];
    s += n===1 ? `<circle cx="${R}" cy="${R}" r="${R}" fill="${col}"/>` : `<path d="M${R},${R} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${a>180?1:0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" fill="${col}" stroke="${JGT.g[1]}" stroke-width="2.5"/>`;
    const cy = R - R*0.57, sz = Math.min(108, Math.max(42, 2*Math.PI*R*0.57/n*0.8)); const lbl = esc(String(p.n||"").slice(0,16));
    s += `<g transform="rotate(${mid} ${R} ${R})">${p.img?`<clipPath id="${id}c${i}"><circle cx="${R}" cy="${cy}" r="${sz/2}"/></clipPath><circle cx="${R}" cy="${cy}" r="${sz/2+3.5}" fill="#fff" stroke="${JGT.g[1]}" stroke-width="2"/><image href="${p.img}" x="${R-sz/2}" y="${cy-sz/2}" width="${sz}" height="${sz}" clip-path="url(#${id}c${i})" preserveAspectRatio="xMidYMid slice"/>`:`<text x="${R}" y="${cy+12}" text-anchor="middle" font-size="34">${p.emo||"🎁"}</text>`}
      <rect x="${R - Math.min(sz*0.95, lbl.length*6.6+16)/2}" y="${cy-sz/2-5}" width="${Math.min(sz*0.95, lbl.length*6.6+16)}" height="17" rx="8.5" fill="${JGT.ink}"/><text x="${R}" y="${cy-sz/2+7}" text-anchor="middle" font-size="${n>6?9:10.5}" font-weight="800" fill="#fff">${lbl}</text></g>`; });
  for (let i=0;i<24;i++){ const [x,y] = pt(i*15, R+9); s += `<circle cx="${x}" cy="${y}" r="5.5" fill="#ffe9a8" opacity=".55" filter="url(#jg-glow)" class="jg-bulb${i%2}"/><circle cx="${x}" cy="${y}" r="2.8" fill="#fffdf2"/>`; }
  return `<div class="jg-wrap"><svg viewBox="-14 -14 ${2*R+28} ${2*R+28}" class="jg-svg"><defs><linearGradient id="jg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${JGT.g[0]}"/><stop offset=".5" stop-color="${JGT.g[1]}"/><stop offset="1" stop-color="${JGT.g[2]}"/></linearGradient><filter id="jg-glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2.2"/></filter></defs><circle cx="${R}" cy="${R}" r="${R+14}" fill="url(#jg-gold)"/>
    <g id="${id}" style="transform-origin:${R}px ${R}px">${s}</g><circle cx="${R}" cy="${R}" r="27" fill="${JGT.ink}" stroke="url(#jg-gold)" stroke-width="5"/><text x="${R}" y="${R+9}" text-anchor="middle" font-size="24">🎁</text></svg>
    <div class="jg-ptr"></div></div>`;
}

/* Adornos: corona, corazón, caja de regalo y listones dorados */
const GOLD_DEF = id => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${JGT.g[0]}"/><stop offset=".45" stop-color="${JGT.g[1]}"/><stop offset=".7" stop-color="${JGT.g[2]}"/><stop offset="1" stop-color="${JGT.g[3]}"/></linearGradient></defs>`;
const SVG_CROWN = `<svg viewBox="0 0 40 26" width="34" height="22">${GOLD_DEF("gc")}<path d="M3 22 L1 6 L11 13 L20 2 L29 13 L39 6 L37 22 Z" fill="url(#gc)"/><rect x="3" y="22" width="34" height="3" rx="1.5" fill="url(#gc)"/></svg>`;
const SVG_HEART = `<svg viewBox="0 0 60 50" class="jg-heart">${GOLD_DEF("gh")}<path d="M30 46 C8 30 2 20 6 11 C10 2 24 2 30 14 C36 2 50 2 54 11 C58 20 52 30 30 46 Z" fill="none" stroke="url(#gh)" stroke-width="3" stroke-linecap="round"/></svg>`;
const SVG_GIFT = (w=120) => `<svg viewBox="0 0 120 120" width="${w}" height="${w}">${GOLD_DEF("gg"+w)}<rect x="14" y="52" width="92" height="62" rx="4" fill="#fffdf7" stroke="#ead9ad"/><rect x="8" y="38" width="104" height="20" rx="4" fill="#fff" stroke="#ead9ad"/><rect x="52" y="38" width="16" height="76" fill="url(#gg${w})"/><rect x="8" y="44" width="104" height="8" fill="url(#gg${w})" opacity=".0"/>
  <path d="M60 38 C40 10 14 16 26 32 C32 40 50 40 60 38 Z M60 38 C80 10 106 16 94 32 C88 40 70 40 60 38 Z" fill="url(#gg${w})"/><path d="M60 38 L44 62 M60 38 L76 62" stroke="url(#gg${w})" stroke-width="7" stroke-linecap="round"/><circle cx="60" cy="38" r="7" fill="#c9971f"/></svg>`;
const SVG_RIBBON = side => `<svg viewBox="0 0 120 900" preserveAspectRatio="none" class="jg-rib ${side}">${GOLD_DEF("gr"+side)}<path d="${side==="l" ? "M-40 120 C 90 200, -30 330, 70 420 S 10 640, 90 760 S 40 880, -20 920" : "M160 60 C 30 160, 150 300, 50 400 S 120 620, 30 740 S 90 860, 150 920"}" fill="none" stroke="url(#gr${side})" stroke-width="16" stroke-linecap="round" opacity=".85"/></svg>`;
const SVG_CAL = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm-2 7h14v10H5zm2 2v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2z" fill="#14213d"/></svg>`;
const SVG_PPL = `<svg viewBox="0 0 24 24" width="24" height="22"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 13c-3.3 0-7 1.6-7 4v3h14v-3c0-2.4-3.7-4-7-4zm8 0c-.5 0-1 0-1.5.1 1.5.9 2.5 2.2 2.5 3.9v3h5v-3c0-2.2-3.4-4-6-4z" fill="#14213d"/></svg>`;
function nameHtml(full){ const w = String(full||"").trim().split(/\s+/); if (w.length < 2) return `<div class="jg-name"><span class="n2w"><span class="n2">${esc(w[0]||"Tu amiga")}</span>${SVG_HEART}</span></div>`;
  return `<div class="jg-name"><span class="n1">${esc(w.slice(0,-1).join(" "))}</span><span class="n2w"><span class="n2">${esc(w[w.length-1])}</span>${SVG_HEART}</span></div>`; }

/* Desbloquear el sonido en el iPhone: Safari solo deja sonar después de un toque (touchend/click, no basta "pointerdown"),
   y el sonido de la app se calla con el interruptor de silencio. Se pide modo "reproducción" (como un video) para que suene igual. */
let jgUnlocked = false, jgSilent = null;
function silentWav(){ const n = 4410, b = new ArrayBuffer(44 + n*2), v = new DataView(b); const w = (o, t) => [...t].forEach((c,i) => v.setUint8(o+i, c.charCodeAt(0)));
  w(0,"RIFF"); v.setUint32(4, 36+n*2, true); w(8,"WAVE"); w(12,"fmt "); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,44100,true); v.setUint32(28,88200,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,"data"); v.setUint32(40,n*2,true);
  return URL.createObjectURL(new Blob([b], {type:"audio/wav"})); }
function jgUnlock(){ try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
  try { if (!jgSilent){ jgSilent = new Audio(silentWav()); jgSilent.loop = true; jgSilent.setAttribute("playsinline", ""); jgSilent.volume = 0.01; } const pr = jgSilent.play(); if (pr && pr.catch) pr.catch(() => {}); } catch {}
  try { jgAudio = jgAudio || new (window.AudioContext||window.webkitAudioContext)(); if (jgAudio.state !== "running") jgAudio.resume(); const bf = jgAudio.createBuffer(1, 1, 22050), src = jgAudio.createBufferSource(); src.buffer = bf; src.connect(jgAudio.destination); src.start(0); } catch {}
  jgUnlocked = true; }
/* Música alegre (hecha por la app, sin archivos ni licencias) */
let jgMus = null;
const jgMuted = () => { try { return localStorage.getItem("ly-jg-mute")==="1"; } catch { return false; } };
function jgNote(ctx, out, midi, t, d, type, v){ const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = 440*Math.pow(2,(midi-69)/12); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t+0.015); g.gain.exponentialRampToValueAtTime(0.0001, t+d); o.connect(g); g.connect(out); o.start(t); o.stop(t+d+0.05); }
function musicStart(){ if (jgMus || jgMuted()) return; if (!jgUnlocked) jgUnlock(); try { jgAudio = jgAudio || new (window.AudioContext||window.webkitAudioContext)(); const ctx = jgAudio; if (ctx.state==="suspended") ctx.resume();
  const out = ctx.createGain(); out.gain.value = 0.05; out.connect(ctx.destination); const step = 60/132/2;
  const mel = [76,0,79,81,79,0,76,74, 72,0,74,76,79,0,76,0, 77,0,81,84,81,0,79,77, 76,79,77,74,72,0,0,0];
  const bas = [48,55,52,55, 45,52,48,52, 41,48,45,48, 43,50,47,50]; const ch = [[64,67],[60,64],[57,60],[59,62]];
  let i = 0, next = ctx.currentTime + 0.05;
  jgMus = {out, timer: setInterval(() => { while (next < ctx.currentTime + 0.25){ const m = mel[i % mel.length]; if (m) jgNote(ctx, out, m, next, step*0.95, "square", 0.35);
    if (i % 2 === 0) jgNote(ctx, out, bas[(i/2) % bas.length], next, step*1.8, "triangle", 0.9);
    if (i % 8 === 4) ch[Math.floor(i/8) % ch.length].forEach(c => jgNote(ctx, out, c, next, step*0.5, "triangle", 0.25));
    next += step; i++; } }, 60)}; } catch {} }
function musicStop(){ if (!jgMus) return; clearInterval(jgMus.timer); try { jgMus.out.gain.setTargetAtTime(0, jgAudio.currentTime, 0.2); } catch {} jgMus = null; }

/* Sonido de la ruleta (sin archivos) */
let jgAudio = null;
function jgCtx(){ if (!jgUnlocked) jgUnlock(); jgAudio = jgAudio || new (window.AudioContext||window.webkitAudioContext)(); if (jgAudio.state==="suspended") jgAudio.resume(); return jgAudio; }
function jgTick(f=1400, d=0.035, v=0.22){ try { const c = jgCtx(), t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain(); o.type = "square"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f*0.55, t+d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t+d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+d+0.02);
  const b = c.createBuffer(1, c.sampleRate*0.02, c.sampleRate), dt = b.getChannelData(0); for (let i=0;i<dt.length;i++) dt[i] = (Math.random()*2-1) * (1 - i/dt.length);
  const n = c.createBufferSource(), ng = c.createGain(); n.buffer = b; ng.gain.value = v*0.6; n.connect(ng); ng.connect(c.destination); n.start(t); } catch {} }
/* Música de triunfo: redoble, trompetas y acorde final */
function jgFanfare(){ try { const c = jgCtx(), t0 = c.currentTime + 0.05; const out = c.createGain(); out.gain.value = 0.16; out.connect(c.destination);
  const tone = (m, t, d, type="sawtooth", v=0.5) => { const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = type; o.frequency.value = 440*Math.pow(2,(m-69)/12); f.type = "lowpass"; f.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t+0.03); g.gain.setValueAtTime(v, t+d*0.7); g.gain.exponentialRampToValueAtTime(0.0001, t+d); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t+d+0.05); };
  const hit = (t, v=0.6, d=0.12) => { const b = c.createBuffer(1, c.sampleRate*d, c.sampleRate), x = b.getChannelData(0); for (let i=0;i<x.length;i++) x[i] = (Math.random()*2-1)*Math.pow(1-i/x.length, 2); const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = v; s.connect(g); g.connect(out); s.start(t); };
  for (let i=0;i<10;i++) hit(t0 + i*0.05, 0.25 + i*0.04, 0.06);
  const T = t0 + 0.55; [[67,0,.18],[67,.18,.12],[67,.30,.12],[72,.42,.5],[67,.95,.18],[72,1.13,.18],[76,1.31,1.4]].forEach(([m,a,d]) => { tone(m, T+a, d); tone(m-12, T+a, d, "triangle", 0.35); });
  [60,64,67,72].forEach(m => tone(m, T+1.31, 1.5, "triangle", 0.3)); hit(T+1.31, 0.9, 0.6);
} catch {} }
function confetti(){ const c = document.createElement("canvas"); c.className = "jg-conf"; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c); const x = c.getContext("2d");
  const P = Array.from({length:160}, () => ({x:Math.random()*c.width, y:-20-Math.random()*c.height*0.5, vx:(Math.random()-.5)*3, vy:2+Math.random()*4, r:4+Math.random()*5, a:Math.random()*6, col:JG_COLORS[Math.floor(Math.random()*JG_COLORS.length)]}));
  const t0 = performance.now(); (function f(t){ x.clearRect(0,0,c.width,c.height); P.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.a+=0.1; x.save(); x.translate(p.x,p.y); x.rotate(p.a); x.fillStyle=p.col; x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2); x.restore(); }); if (t-t0 < 3800) requestAnimationFrame(f); else c.remove(); })(t0); }

/* ================= PÁGINA PÚBLICA (la amiga abre el link) ================= */
const JG_CSS = `
body.jg{background:radial-gradient(ellipse at top,#fffdf7 0%,#faf3e3 55%,#f1e3c4 100%);background-attachment:fixed;color:#14213d;min-height:100%;font-family:var(--body)}
.jg-pg{max-width:480px;margin:0 auto;padding:20px 18px 40px;display:grid;gap:14px;text-align:center}
.jg-top{font-size:12.5px;letter-spacing:.26em;text-transform:uppercase;color:#b8861b;font-weight:800}
.jg-name{font-family:var(--serif);font-weight:700;font-size:clamp(40px,12vw,58px);line-height:1;margin:2px 0 0;color:#a8761b;text-transform:none;letter-spacing:0;text-wrap:balance}
.jg-h{font-family:var(--serif);font-weight:700;font-size:28px;line-height:1.1;margin:0;color:#14213d;text-transform:none;letter-spacing:0}
.jg-h b{color:#a8761b}
.jg-p{margin:0;color:#5b5547;font-size:16px}
.jg-wrap{position:relative;width:min(92vw,400px);margin:4px auto 0}
.jg-svg{width:100%;height:auto;display:block;filter:drop-shadow(0 14px 28px rgba(120,90,20,.28))}
.jg-ptr{position:absolute;left:50%;top:-8px;transform:translateX(-50%);width:0;height:0;border-left:17px solid transparent;border-right:17px solid transparent;border-top:36px solid var(--ink);filter:drop-shadow(0 3px 3px rgba(0,0,0,.3))}
.jg-bulb0{animation:jgb 1s infinite}.jg-bulb1{animation:jgb 1s .5s infinite}
@keyframes jgb{50%{opacity:.35}}
.jg-btn{border:0;border-radius:16px;padding:18px 20px;font-size:20px;font-weight:800;cursor:pointer;background:linear-gradient(#f6d77a,#d4a72c);color:#14213d;box-shadow:0 6px 0 #a87a10,0 12px 24px rgba(120,90,20,.3);width:100%;letter-spacing:.03em}
.jg-btn:active{transform:translateY(3px);box-shadow:0 3px 0 #a87a10}
.jg-btn:disabled{opacity:.6}
.jg-btn.alt{background:#25d366;color:#fff;box-shadow:0 6px 0 #178a42}
.jg-btn.sec{background:#fff;color:#14213d;box-shadow:none;border:1.5px solid #e4d2a4;font-size:16px;padding:14px}
.jg-card{background:#fff;color:#1f1e1d;border-radius:22px;padding:20px 18px;display:grid;gap:12px;text-align:left;border:1.5px solid #ead9ad;box-shadow:0 12px 30px rgba(120,90,20,.12)}
.jg-card h3{margin:0;font-family:var(--serif);font-size:24px;text-align:center;color:#14213d}
.jg-card input[type=text],.jg-card input[type=tel]{width:100%;border:2px solid #d4a72c;border-radius:14px;padding:14px 16px;font-size:18px;background:#fffdf8;color:#1f1e1d}
.jg-card label.ck{display:flex;gap:10px;font-size:13.5px;color:#555;align-items:flex-start}
.jg-card label.ck input{width:22px;height:22px;flex:none;margin-top:1px}
.jg-err{color:#b4442f;font-weight:700;font-size:14px;min-height:18px}
.jg-prize{display:grid;justify-items:center;gap:8px}
.jg-prize img{width:190px;height:190px;border-radius:50%;object-fit:cover;border:7px solid #e2bb4f;background:#fff;box-shadow:0 12px 30px rgba(120,90,20,.25);animation:jgpop .6s cubic-bezier(.2,1.6,.4,1)}
@keyframes jgpop{from{transform:scale(.2)}to{transform:scale(1)}}
.jg-prize .pn{font-family:var(--serif);font-weight:700;font-size:30px;color:var(--acc);text-align:center}
.jg-chips{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.jg-chip{background:#fff;border:1.5px solid #ead9ad;color:#14213d;border-radius:999px;padding:6px 12px;font-size:13.5px;font-weight:700}
.jg-small{font-size:12.5px;color:#8a826f}
.jg-gifts{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:10px}
.jg-gift{display:grid;justify-items:center;gap:6px;font-size:13px;font-weight:800;color:#14213d}
.jg-gift img,.jg-gift span.ph{width:92px;height:92px;border-radius:50%;object-fit:cover;border:4px solid #e2bb4f;background:#fff;display:grid;place-items:center;font-size:40px}
.jg-show{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 10px;margin:0 -18px;padding-left:18px;padding-right:18px;scrollbar-width:none}.jg-show::-webkit-scrollbar{display:none}
.jg-show .it{flex:0 0 46%;scroll-snap-align:center;background:#fff;border-radius:18px;border:2px solid var(--g2);box-shadow:0 8px 20px rgba(120,90,20,.15);overflow:hidden;display:grid}
.jg-show img{width:100%;aspect-ratio:1;object-fit:cover;display:block}.jg-show .ph{aspect-ratio:1;display:grid;place-items:center;font-size:60px;background:#fffaf0}
.jg-show b{padding:8px 6px;font-size:15px;color:var(--ink)}
.jg-showt{font-family:var(--serif);font-weight:700;font-size:20px;color:var(--ink);margin:4px 0 -4px}
.jg-scr{position:relative;width:100%;max-width:320px;margin:6px auto;aspect-ratio:3/2;border-radius:18px;overflow:hidden;border:3px solid #e2bb4f;box-shadow:0 8px 22px rgba(120,90,20,.2);background:#fff}
.jg-scr .under{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:8px}
.jg-scr .under img{width:44%;aspect-ratio:1;object-fit:cover;border-radius:50%}
.jg-scr .under .pn{font-weight:800;font-size:18px;margin-top:4px;color:var(--ink,#14213d)}
.jg-scr canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
.jg-q{display:grid;gap:10px;margin:8px 0}
.jg-q button{font:inherit;font-size:16px;font-weight:700;text-align:left;padding:14px 16px;border-radius:14px;border:2px solid #e2bb4f;background:#fff;color:var(--ink,#14213d);cursor:pointer}
.jg-q button:active{background:#fff6dc}
.jg-qbar{height:8px;border-radius:9px;background:rgba(0,0,0,.08);overflow:hidden;margin:4px 0 10px}.jg-qbar i{display:block;height:100%;background:linear-gradient(90deg,#e2bb4f,#a8761b)}
.jg-res{background:#fff;border-radius:16px;padding:14px;border:2px solid #e2bb4f;margin:8px 0;text-align:center}
.jg-res .big{font-size:42px}
.jg-timer{font-weight:800;color:#b3261e;text-align:center;margin:6px 0}
.jg-boxes{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:4px 0}
.jg-box{font-size:64px;background:#fff;border:2px solid #e2bb4f;border-radius:18px;padding:16px 0;cursor:pointer;box-shadow:0 8px 20px rgba(120,90,20,.15)}
.jg-box.shake{animation:jgsh .15s 8}
@keyframes jgsh{25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}}
.jg-conf{position:fixed;inset:0;pointer-events:none;z-index:50}
.jg-bar{height:14px;background:#efe3c4;border-radius:99px;overflow:hidden}.jg-bar i{display:block;height:100%;background:linear-gradient(90deg,#f6d77a,#d4a72c)}
body.jg{background:radial-gradient(circle at 12% 18%,rgba(var(--glow),.9) 0 3%,transparent 9%),radial-gradient(circle at 88% 12%,rgba(var(--glow),.9) 0 2.5%,transparent 8%),radial-gradient(circle at 80% 55%,rgba(var(--glow),.6) 0 3%,transparent 10%),radial-gradient(circle at 15% 75%,rgba(var(--glow),.7) 0 2%,transparent 8%),radial-gradient(ellipse at top,var(--b1) 0%,var(--b2) 55%,var(--b3) 100%);background-attachment:fixed;color:var(--ink)}
.jg-rib{position:fixed;top:0;height:100vh;width:70px;pointer-events:none;z-index:0;opacity:.9}.jg-rib.l{left:-8px}.jg-rib.r{right:-8px}
.jg-pg{position:relative;z-index:1}
.jg-crownrow{display:flex;align-items:center;justify-content:center;gap:12px}.jg-crownrow i{display:block;height:1.5px;width:64px;background:linear-gradient(90deg,transparent,var(--g2))}.jg-crownrow i:last-child{transform:scaleX(-1)}
.jg-top{color:var(--ink);letter-spacing:.3em;font-size:13px}
.jg-name{position:relative;display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;column-gap:12px;line-height:.95;margin-top:2px}
.jg-name .n1{font-family:var(--serif);font-weight:600;font-size:clamp(40px,12vw,56px);color:var(--ink)}
.jg-name .n2{font-family:"Great Vibes",cursive;font-weight:400;font-size:clamp(54px,16vw,78px);color:var(--acc);background:linear-gradient(135deg,var(--g2),var(--g4) 55%,var(--g3));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;padding:0 6px}
.jg-name .n2w{position:relative;display:inline-block}.jg-heart{position:absolute;right:-26px;top:-12px;width:40px;height:34px}
.jg-pill{justify-self:center;background:linear-gradient(var(--g1),var(--g3));color:var(--ink);border-radius:999px;padding:8px 22px;font-family:var(--serif);font-weight:700;font-size:22px;box-shadow:0 6px 16px rgba(160,120,30,.25);border:1.5px solid #fff3cf}
.jg-p b{color:#14213d}
.jg-chip{display:flex;align-items:center;gap:10px;border-radius:16px;padding:10px 16px;font-size:14.5px;text-align:left;box-shadow:0 4px 12px rgba(120,90,20,.08)}
.jg-chips.col{flex-direction:column;align-items:stretch;max-width:340px;margin:0 auto;width:100%}
.jg-btn.go{background:var(--ink);color:#fff;border:2.5px solid var(--g2);box-shadow:0 0 0 3px rgba(217,173,60,.25),0 10px 24px rgba(20,33,61,.35);border-radius:999px;font-size:24px;display:flex;justify-content:center;align-items:center;gap:14px}
.jg-btn.go:active{transform:translateY(2px)}
.jg-giftdec{position:absolute;left:-14px;top:-6px;z-index:-1;opacity:.9}
.jg-bgimg{position:fixed;inset:0;z-index:0;background-color:#f5eae0;background-position:center bottom;background-size:cover;background-repeat:no-repeat}
body.foto .jg-giftdec{display:none}
body.foto .jg-p{text-shadow:0 1px 8px rgba(255,255,255,.9)}
.jg-mute{position:fixed;top:12px;right:12px;z-index:40;border:1.5px solid #ead9ad;background:#fff;border-radius:999px;width:44px;height:44px;font-size:20px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.08)}
`;
async function startJuego(code, avance){
  S.publicGame = true;
  document.body.className = "jg"; const st = document.createElement("style"); st.textContent = JG_CSS; document.head.appendChild(st);
  document.body.innerHTML = `<div class="jg-pg" id="jg"><div class="jg-p">Cargando…</div></div>`;
  document.body.insertAdjacentHTML("afterbegin", SVG_RIBBON("l") + SVG_RIBBON("r"));
  const mb = document.createElement("button"); mb.className = "jg-mute"; mb.setAttribute("aria-label", "Música"); const paintMb = () => mb.textContent = jgMuted() ? "🔇" : "🎵"; paintMb();
  mb.onclick = e => { e.stopPropagation(); try { localStorage.setItem("ly-jg-mute", jgMuted() ? "0" : "1"); } catch {} paintMb(); if (jgMuted()) musicStop(); else musicStart(); }; document.body.appendChild(mb);
  const box = document.getElementById("jg"); code = String(code).toUpperCase().replace(/[^A-Z0-9]/g,"");
  let J, P; const padreQ = String(new URLSearchParams(location.search).get("p")||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  const leer = async c => { for (let k = 0; k < 3; k++){ try { const js = await S.db.doc("juegos/"+c).get(); if (!js.exists) return {no:true}; const jd = js.data(); const ps = await S.db.doc("programs/"+jd.pid).get(); if (!ps.exists) return {no:true}; return {J:jd, P:ps.data()}; } catch(e){ console.log("juego", e); await new Promise(r => setTimeout(r, 1200*(k+1))); } } return {red:true}; };
  const demo = code === "PRUEBA" && window.__demo; let rr = demo ? {J:{pid:"prueba", ref:"Tu cliente", n:0, until:0, tipo:window.__demo.tipo, anuncio:!!window.__demoAd}, P:window.__demo} : await leer(code);
  if (demo){ const bar = document.createElement("div"); bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99;background:#14213d;color:#fff;padding:10px 14px;display:flex;gap:10px;align-items:center;justify-content:space-between;font:600 14px Manrope,sans-serif";
    if (window.__demoAd) bar.style.cssText = "position:fixed;right:8px;bottom:8px;z-index:99;opacity:.3;display:flex;gap:6px;font:600 12px Manrope,sans-serif";
    bar.innerHTML = window.__demoAd ? `<span style="display:flex;gap:6px"><button style="font:inherit;padding:6px 10px;border-radius:10px;border:0;background:#14213d;color:#fff" id="dm-re">↻</button><button style="font:inherit;padding:6px 10px;border-radius:10px;border:0;background:#14213d;color:#fff" id="dm-x">←</button></span>` : `<span>👀 Modo prueba: no se guarda nada</span><span style="display:flex;gap:8px"><button style="font:inherit;padding:8px 12px;border-radius:10px;border:0;background:#e2bb4f;color:#14213d" id="dm-re">Otra vez</button><button style="font:inherit;padding:8px 12px;border-radius:10px;border:0;background:#fff;color:#14213d" id="dm-x">← Volver</button></span>`;
    document.body.append(bar); document.getElementById("dm-x").onclick = () => { musicStop(); if (history.state && history.state.demo) history.back(); else location.reload(); }; document.getElementById("dm-re").onclick = () => { musicStop(); startJuego("PRUEBA"); }; } if (rr.no && padreQ && padreQ !== code){ const r2 = await leer(padreQ); if (r2.J){ rr = r2; code = padreQ; } }
  if (rr.red){ box.innerHTML = `<div class="jg-h">No se pudo cargar</div><p class="jg-p">Revisa tu conexión a internet y vuelve a intentar.</p><button class="jg-btn" onclick="location.reload()">Reintentar</button>`; return; }
  if (!rr.J){ box.innerHTML = `<div class="jg-h">Este link ya no está disponible</div><p class="jg-p">Pídele a quien te lo mandó un link nuevo.</p>`; return; }
  J = rr.J; P = conJuego(rr.P, J); if (J.sorteo) P = {...P, musica:false};
  const key = "ly-jg-" + code; let saved = {}; try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  if (demo) saved = {}; const save = () => { if (demo) return; try { localStorage.setItem(key, JSON.stringify(saved)); } catch {} };
  const prizes = P.prizes || []; const tipo = P.tipo || "ruleta";
  /* "Otra oportunidad": el primer intento no gana (casilla de girar otra vez, caja vacía, tarjeta "sigue participando", el pajarito esquiva) para que quiera seguir jugando */
  const otraVez = P.otraVez !== false; const usarOtra = () => otraVez && !saved.otra;
  const OTRA = {n:"¡Otra vez!", w:0, img:"", emo:"🔄", otra:true}; const rueda = otraVez && prizes.length >= 2 ? [...prizes.slice(0,1), OTRA, ...prizes.slice(1)] : prizes; const T = setTema(P.tema), TX = txtDe(P);
  const bs = document.body.style; [["--b1",T.bg[0]],["--b2",T.bg[1]],["--b3",T.bg[2]],["--g1",T.g[0]],["--g2",T.g[1]],["--g3",T.g[2]],["--g4",T.g[3]],["--ink",T.ink],["--acc",T.acc],["--glow",T.glow]].forEach(([k,v]) => bs.setProperty(k, v));
  document.querySelectorAll(".jg-rib").forEach(r => r.outerHTML = SVG_RIBBON(r.classList.contains("l") ? "l" : "r"));
  const fsrc = fondoSrc(P); if (fsrc){ document.body.classList.add("foto"); document.querySelectorAll(".jg-rib").forEach(r => r.remove()); const bg = document.createElement("div"); bg.className = "jg-bgimg"; bg.style.backgroundImage = `linear-gradient(rgba(250,245,238,.75), rgba(250,245,238,.35) 40%, rgba(250,245,238,0) 60%), url("${fsrc}")`; document.body.prepend(bg); } const shownName = J.alias || J.ref; const ref = firstName(shownName) ? shownName : "Tu amiga";
  const vence = J.until ? new Intl.DateTimeFormat("es-US",{weekday:"long", day:"numeric", month:"long"}).format(new Date(J.until)) : "";
  const meta = P.meta || {refs:14, cada:4};
  { const go = () => { jgUnlock(); if (P.musica !== false && !saved.done) musicStart(); ["touchend","click","keydown"].forEach(ev => document.removeEventListener(ev, go, true)); };
    ["touchend","click","keydown"].forEach(ev => document.addEventListener(ev, go, true)); }
  if (P.musica === false) mb.remove();
  if (avance){ return showAvance(); }
  if (J.sorteo) return showSorteo();
  if (J.until && J.until < Date.now() && !saved.done){ box.innerHTML = `<div class="jg-top">Juega y gana</div><div class="jg-h">Esta promoción ya terminó</div><p class="jg-p">Pídele a ${esc(ref)} que te mande un link nuevo.</p>`; return; }
  if (saved.done) return showDone();
  if (saved.prize !== undefined) return showForm(saved.prize);
  showIntro();

  function showIntro(){
    const n = J.n || 0;
    box.innerHTML = `<div class="jg-giftdec">${SVG_GIFT(86)}</div><div class="jg-crownrow"><i></i>${SVG_CROWN}<i></i></div>${J.anuncio ? nameHtml(TI(tipo).corto) : `<div class="jg-top">${esc(TX.top)}</div>
      ${nameHtml(ref)}<div class="jg-pill">${esc(TX.pill)}</div>`}
      <p class="jg-p"><b>${esc(TX.sub)}</b><br>¡Totalmente gratis! 🎉</p>
      ${tipo==="rasca" ? scratchHtml() : tipo==="tiro" ? tiroHtml() : tipo==="pinata" ? pinataHtml() : tipo==="quiz" || tipo==="precio" || tipo==="puzzle" ? `<div class="jg-gifts">${prizes.map(p=>`<div class="jg-gift">${p.img?`<img src="${p.img}" alt="">`:`<span class="ph">🎁</span>`}${esc(p.n)}</div>`).join("")}</div>` + (tipo==="precio" ? precioHtml() : "") : tipo==="caja" ? `<div class="jg-boxes">${[0,1,2].map(i=>`<button class="jg-box" data-box="${i}" aria-label="Caja ${i+1}">🎁</button>`).join("")}</div>
        ${prizes.some(p=>p.img) ? "" : `<div class="jg-gifts">${prizes.map(p=>`<div class="jg-gift">${p.img?`<img src="${p.img}" alt="">`:`<span class="ph">🎁</span>`}${esc(p.n)}</div>`).join("")}</div>`}` : wheelSvg(rueda)}
      <div class="jg-chips col">${vence?`<span class="jg-chip">${SVG_CAL}<span>Válido hasta el ${esc(vence)}</span></span>`:""}${n>=2&&!J.anuncio?`<span class="jg-chip">${SVG_PPL}<span>${n} amigas de ${esc(ref)} ya participaron</span></span>`:""}</div>
      ${tipo==="caja" || tipo==="rasca" || tipo==="precio" || tipo==="tiro" || tipo==="pinata" ? "" : `<button class="jg-btn go" id="jg-spin">${esc(TX.btn||"¡GIRAR!")} <span style="font-size:22px">›</span></button>`}
      <p class="jg-small">Un regalo por persona. Solo mayores de 18 años. Sujeto a disponibilidad en tu zona.</p>`;
    const sh = document.getElementById("jg-show"); if (sh && sh.scrollWidth > sh.clientWidth + 10){ let dir = 1; const iv = setInterval(() => { if (!document.body.contains(sh)) return clearInterval(iv); const max = sh.scrollWidth - sh.clientWidth; if (sh.scrollLeft >= max - 4) dir = -1; else if (sh.scrollLeft <= 4) dir = 1; sh.scrollBy({left: dir * sh.clientWidth * 0.5, behavior:"smooth"}); }, 2200); sh.addEventListener("touchstart", () => clearInterval(iv), {once:true}); }
    if (tipo==="caja") box.querySelectorAll("[data-box]").forEach(b => b.onclick = () => openBox(b));
    else if (tipo==="rasca") bindScratch();
    else if (tipo==="quiz") document.getElementById("jg-spin").onclick = () => showQuiz(0, 0);
    else if (tipo==="tiro") bindTiro();
    else if (tipo==="pinata") bindPinata();
    else if (tipo==="puzzle") document.getElementById("jg-spin").onclick = () => showPuzzle();
    else if (tipo==="precio") box.querySelectorAll("[data-pr]").forEach(b => b.onclick = () => adivino(+b.dataset.pr));
    else document.getElementById("jg-spin").onclick = spin;
  }
  function won(i){ saved.prize = i; save(); setTimeout(() => { confetti(); jgFanfare(); showForm(i, true); if (jgMus) setTimeout(() => { try { jgMus.out.gain.setTargetAtTime(0.05, jgAudio.currentTime, 0.4); } catch {} }, 3500); }, 450); }
  function spin(){
    const btn = document.getElementById("jg-spin"); btn.disabled = true; btn.textContent = "Girando…";
    const otra = usarOtra() && rueda !== prizes; const i = pickPrize(prizes), ri = otra ? 1 : rueda.indexOf(prizes[i]), n = rueda.length, a = 360/n; const want = ((360 - (ri*a + a/2)) + (Math.random()-.5)*a*0.6 + 720) % 360;
    const g = document.getElementById("jg-wheel"); const rot0 = +g.dataset.rot || 0, target = rot0 + 360*6 + ((want - rot0 % 360) + 360) % 360; const T = 5200, t0 = performance.now(); let lastSeg = Math.floor(rot0 / Math.min(a, 30));
    jgCtx(); if (jgMus) try { jgMus.out.gain.setTargetAtTime(0.012, jgAudio.currentTime, 0.1); } catch {}
    (function f(t){ const k = Math.min(1, (t-t0)/T), e = 1 - Math.pow(1-k, 4), ang = rot0 + (target-rot0)*e; g.style.transform = `rotate(${ang}deg)`;
      const seg = Math.floor(ang / Math.min(a, 30)); if (seg !== lastSeg){ lastSeg = seg; jgTick(); }
      if (k < 1) requestAnimationFrame(f); else if (otra){ saved.otra = true; save(); g.dataset.rot = target; otraMsg("🔄 ¡Casi! Te ganaste <b>otro giro</b>", () => { btn.disabled = false; btn.innerHTML = "¡GIRAR OTRA VEZ! ›"; }); } else won(i); })(t0);
  }
  function openBox(b){ if (box.dataset.busy || b.disabled) return; box.dataset.busy = "1"; b.classList.add("shake"); jgTick(300,0.4,0.05); const i = pickPrize(prizes);
    if (usarOtra()){ setTimeout(() => { b.classList.remove("shake"); b.textContent = "💨"; b.disabled = true; b.style.opacity = ".5"; saved.otra = true; save(); otraMsg("💨 ¡Esta caja estaba vacía! <b>Escoge otra</b>", () => { delete box.dataset.busy; }); }, 1300); return; }
    setTimeout(() => { b.textContent = "✨"; won(i); }, 1300); }
  /* Aviso de "otra oportunidad" encima del juego */
  function otraMsg(html, after){ const d = document.createElement("div"); d.style.cssText = "position:fixed;left:50%;top:40%;transform:translate(-50%,-50%) scale(.8);z-index:60;background:#fff;border:3px solid #e2bb4f;border-radius:20px;padding:18px 22px;text-align:center;font:700 20px Manrope,sans-serif;color:#14213d;box-shadow:0 14px 40px rgba(0,0,0,.25);transition:transform .25s;max-width:86vw";
    d.innerHTML = html + `<div style="font-size:14px;font-weight:600;color:#666;margin-top:6px">¡Sigue participando!</div>`; document.body.append(d); jgTick(520,.3,.06); setTimeout(() => jgTick(700,.3,.06), 140); requestAnimationFrame(() => d.style.transform = "translate(-50%,-50%) scale(1)");
    setTimeout(() => { d.remove(); after && after(); }, 1900); }
  /* ===== Rasca y gana ===== */
  function rascaOtra(){ return tipo==="rasca" && usarOtra(); }
  function scratchHtml(){ if (saved.pend === undefined){ saved.pend = pickPrize(prizes); save(); } const p = prizes[saved.pend] || {n:"Un regalo"};
    return `<div class="jg-scr" id="jg-scr"><div class="under">${rascaOtra() ? `<div><div style="font-size:54px">🍀</div><div class="pn">¡Sigue participando!</div><div style="font-size:13px;color:#555">Tienes otra tarjeta</div></div>` : `<div>${p.img?`<img src="${p.img}" alt="">`:`<div style="font-size:64px">🎁</div>`}<div class="pn">${esc(p.n)}</div></div>`}</div><canvas id="jg-cv" width="600" height="400" aria-label="Raspa aquí"></canvas></div><p class="jg-small" style="margin-top:0">👆 Pasa tu dedo sobre la tarjeta para raspar</p>`; }
  function bindScratch(){ const cv = document.getElementById("jg-cv"); if (!cv) return; const x = cv.getContext("2d"); const W = cv.width, H = cv.height;
    const g = x.createLinearGradient(0,0,W,H); g.addColorStop(0,"#d9b45a"); g.addColorStop(.5,"#f5e1a0"); g.addColorStop(1,"#b8861b"); x.fillStyle = g; x.fillRect(0,0,W,H);
    x.fillStyle = "rgba(255,255,255,.35)"; for (let k=0;k<70;k++){ x.beginPath(); x.arc(Math.random()*W, Math.random()*H, 1+Math.random()*3, 0, 7); x.fill(); }
    x.fillStyle = "#5a3d0c"; x.font = "800 46px Manrope, sans-serif"; x.textAlign = "center"; x.fillText("RASPA AQUÍ", W/2, H/2 - 6); x.font = "600 26px Manrope, sans-serif"; x.fillText("y descubre tu regalo 🎁", W/2, H/2 + 36);
    x.globalCompositeOperation = "destination-out"; let down = false, n = 0, fin = false, last = null;
    const pt = e => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * W / r.width, (t.clientY - r.top) * H / r.height]; };
    const draw = e => { if (!down || fin) return; e.preventDefault(); const [a,b] = pt(e); x.lineWidth = 70; x.lineCap = "round"; x.beginPath(); if (last) x.moveTo(last[0], last[1]); else x.moveTo(a, b); x.lineTo(a+0.1, b); x.stroke(); last = [a,b];
      if (++n % 8 === 0){ jgTick(500 + Math.random()*300, 0.15, 0.03); const d = x.getImageData(0,0,W,H).data; let c = 0, tt = 0; for (let k = 3; k < d.length; k += 64){ tt++; if (d[k] < 40) c++; } if (c/tt > 0.5) acabar(); } };
    const acabar = () => { if (fin) return; fin = true; cv.style.transition = "opacity .5s"; cv.style.opacity = "0"; const i = saved.pend;
      if (rascaOtra()){ saved.otra = true; save(); setTimeout(() => otraMsg("🍀 ¡Esta no tenía premio! <b>Raspa otra tarjeta</b>", () => { const w = document.getElementById("jg-scr"); if (w){ w.outerHTML = scratchHtml(); bindScratch(); } }), 600); return; }
      setTimeout(() => won(i), 500); };
    cv.addEventListener("pointerdown", e => { down = true; last = null; jgCtx(); draw(e); }); cv.addEventListener("pointermove", draw); ["pointerup","pointerleave","pointercancel"].forEach(ev => cv.addEventListener(ev, () => { down = false; last = null; }));
    cv.addEventListener("touchmove", e => e.preventDefault(), {passive:false}); }
  /* Después del test o del precio: se raspa el regalo */
  function showScratch(titulo, extra){ box.innerHTML = `<div class="jg-top">${titulo}</div>${extra||""}<h1 class="jg-h" style="font-size:30px">¡Ganaste un regalo!</h1>${scratchHtml()}`; bindScratch(); }
  /* ===== Test cocina sana ===== */
  function showQuiz(k, pts){ const Q = QUIZ[k]; if (!Q){ const nv = quizNivel(pts); saved.quiz = `Test: ${nv.k} (${pts} pts)`; save();
      return showScratch("Tu resultado", `<div class="jg-res"><div class="big">${nv.e}</div><h3 style="margin:4px 0">${esc(nv.t)}</h3><p style="margin:0;color:#555">${esc(nv.c)}</p></div><p class="jg-p">Por completar el test, ${esc(ref)} te regala…</p>`); }
    box.innerHTML = `<div class="jg-top">Test de cocina sana · ${k+1} de ${QUIZ.length}</div><div class="jg-qbar"><i style="width:${k*100/QUIZ.length}%"></i></div><h2 class="jg-h" style="font-size:24px;line-height:1.25">${esc(Q.q)}</h2><div class="jg-q">${Q.o.map(([t,v],i)=>`<button data-qa="${v}">${esc(t)}</button>`).join("")}</div>`;
    box.querySelectorAll("[data-qa]").forEach(b => b.onclick = () => { jgTick(700, .2, .04); showQuiz(k+1, pts + (+b.dataset.qa||0)); }); }
  /* ===== Adivina el precio ===== */
  function precioHtml(){ const pr = P.precio || {}; if (!saved.opc){ saved.opc = precioOpc(+pr.v||100); save(); }
    return `<div class="jg-res"><div style="font-weight:800;font-size:18px">${esc(pr.n||"Producto Royal Prestige")}</div>${pr.img?`<img src="${pr.img}" alt="" style="width:60%;max-width:200px;aspect-ratio:1;object-fit:cover;border-radius:14px;margin:8px auto;display:block">`:`<div style="font-size:64px">🍳</div>`}<p style="margin:0;color:#555">¿Cuánto crees que cuesta?</p></div><div class="jg-q">${saved.opc.map(v=>`<button data-pr="${v}" style="text-align:center;font-size:22px">$${v.toLocaleString("en-US")}</button>`).join("")}</div>`; }
  function adivino(v){ const real = +(P.precio?.v)||0, ok = v === real; saved.quiz = `Precio: ${ok?"adivinó":"dijo $"+v}`; save(); if (ok){ confetti(); jgFanfare(); }
    showScratch(ok ? "🎯 ¡Adivinaste!" : "¡Casi!", `<div class="jg-res"><p style="margin:0">${ok?"¡Ese es el precio!":"El precio real es"} <b style="font-size:22px">$${real.toLocaleString("en-US")}</b></p><p style="margin:4px 0 0;color:#555">${ok?"Eres toda una experta 😉":"Pero igual te ganaste un regalo 😉"}</p></div>`); }
  /* ===== Tiro al regalo: un pajarito vuela por el cielo llevando el regalo colgado; si la estrella le pega, el regalo cae a la canasta ===== */
  function tiroHtml(){ if (saved.pend === undefined){ saved.pend = pickPrize(prizes); save(); } const p = prizes[saved.pend] || {n:"Regalo"};
    return `<style>@keyframes trnube{from{transform:translateX(-120px)}to{transform:translateX(480px)}}@keyframes tral{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.8)}}</style>
      <div id="tr" style="position:relative;width:min(100%,360px,48vh);aspect-ratio:3/4;margin:6px auto;border-radius:18px;overflow:hidden;background:url(&quot;fondo-ave.jpg?v=1&quot;) center/100% 100% no-repeat,#f7efe0;border:3px solid #e2bb4f;touch-action:manipulation;cursor:pointer;user-select:none">
      ${[[30,18,0],[95,14,-6],[160,16,-12]].map(([t,sz,d])=>`<div style="position:absolute;top:${t}px;left:0;font-size:${sz}px;opacity:.85;animation:trnube ${14+Math.abs(d)}s linear ${d}s infinite">✨</div>`).join("")}
      <div id="tr-g" style="position:absolute;top:0;left:0;width:80px;height:142px;will-change:transform">
        <img id="tr-b" src="ave.png?v=1" alt="" style="position:absolute;left:-52px;top:0;width:104px;height:auto;transform-origin:94px 47px;filter:drop-shadow(0 4px 6px rgba(120,80,0,.35))">
        <div id="tr-cu" style="position:absolute;left:39px;top:46px;width:2px;height:40px;background:linear-gradient(#e2bb4f,#b8861b)"></div>
        <div id="tr-r" style="position:absolute;left:12px;top:84px;width:56px;height:56px;border-radius:12px;background:#fff;border:3px solid #e2bb4f;display:grid;place-items:center;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,.15)">${p.img?`<img src="${p.img}" alt="" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:32px">🎁</span>`}</div></div>
      <div id="tr-shot" style="position:absolute;left:50%;bottom:30%;font-size:28px;transform:translateX(-50%);opacity:0">⭐</div>
      <div id="tr-msg" style="position:absolute;left:0;right:0;top:48%;text-align:center;font:800 26px Manrope,sans-serif;color:#b3261e;opacity:0;transition:opacity .2s;text-shadow:0 2px 0 #fff"></div>
            </div>
      <button class="jg-btn go" id="tr-go">¡DISPARAR! ⭐</button><p class="jg-small" style="margin-top:0" id="tr-int">El pajarito lleva tu ${esc(p.n)}: lánzale una estrella y si le das, cae en la canasta.</p>`; }
  function bindTiro(){ const cont = document.getElementById("tr"), g = document.getElementById("tr-g"), bird = document.getElementById("tr-b"); if (!cont) return; const i = saved.pend;
    let x = 46, y = 14, dir = 1, last = performance.now(), t0 = last, vel = Math.max(300, cont.clientWidth * 1.05), busy = false, fin = false, intentos = 0, apunta = false;
    (function mv(t){ if (!document.body.contains(g) || fin) return; const dt = Math.min(.05, (t-last)/1000); last = t; const max = cont.clientWidth - g.offsetWidth - 46;
      if (apunta){ const tx = cont.clientWidth/2 - g.offsetWidth/2; x += (tx - x) * Math.min(1, dt*14); } else { x += dir*vel*dt; if (x >= max){ x = max; dir = -1; } else if (x <= 46){ x = 46; dir = 1; } }
      y = 14 + Math.sin((t-t0)/260)*12; g.style.transform = `translate(${x}px,${y}px)`; bird.style.transform = `scaleX(${dir>0?1:-1}) rotate(${Math.sin((t-t0)/90)*4}deg)`; requestAnimationFrame(mv); })(last);
    const msg = (tx, c) => { const m = document.getElementById("tr-msg"); m.textContent = tx; m.style.color = c; m.style.opacity = 1; setTimeout(() => { if (m) m.style.opacity = 0; }, 750); };
    const tirar = () => { if (busy || fin) return; busy = true; intentos++; if (intentos >= 2) apunta = true; jgCtx(); jgTick(900,.25,.05); const sh = document.getElementById("tr-shot"), H = cont.clientHeight;
      const top = y + 112, F = 500; /* centro del regalo */
      sh.getAnimations().forEach(a => a.cancel()); sh.animate([{bottom:(H*0.30)+"px", opacity:1, transform:"translateX(-50%) rotate(0)"}, {bottom:(H-top-14)+"px", opacity:1, transform:"translateX(-50%) rotate(360deg)"}], {duration:F, easing:"linear", fill:"forwards"});
      setTimeout(() => { const gc = x + g.offsetWidth/2, cx = cont.clientWidth/2; sh.getAnimations().forEach(an => an.cancel()); sh.style.opacity = 0;
        if (apunta) { const tx = cx - g.offsetWidth/2; x = tx; } const gc2 = x + g.offsetWidth/2;
        if (!apunta && Math.abs(gc - cx) <= 32 && usarOtra()){ saved.otra = true; save(); msg("¡Lo esquivó! 🕊️💨", "#b3261e"); g.animate([{transform:`translate(${x}px,${y}px)`},{transform:`translate(${x}px,${y-40}px)`},{transform:`translate(${x}px,${y}px)`}], {duration:450});
          document.getElementById("tr-int").textContent = "¡Casi! El pajarito lo esquivó. Inténtalo otra vez."; setTimeout(() => busy = false, 450); return; }
        if (apunta || Math.abs(gc2 - cx) <= 32){ fin = true; msg("¡LE DISTE! 🎉", "#1f7a3a"); jgFanfare && jgFanfare(); const r = document.getElementById("tr-r"), cu = document.getElementById("tr-cu");
          const rr = r.getBoundingClientRect(), cr = cont.getBoundingClientRect(); const box2 = r.cloneNode(true); box2.style.cssText += `;position:absolute;left:${rr.left-cr.left}px;top:${rr.top-cr.top}px;margin:0;z-index:5`; cont.append(box2); r.style.visibility = "hidden"; cu.style.visibility = "hidden";
          g.animate([{transform:`translate(${x}px,${y}px)`},{transform:`translate(${x + dir*160}px,${y-160}px)`}], {duration:900, easing:"ease-in", fill:"forwards"});
          box2.animate([{transform:"translate(0,0) rotate(0)"},{transform:`translate(${cont.clientWidth/2-28-(rr.left-cr.left)}px,${H*0.70-(rr.top-cr.top)}px) rotate(540deg) scale(.8)`}], {duration:900, easing:"cubic-bezier(.5,0,.9,.6)", fill:"forwards"});
          saved.quiz = `Tiro: le dio ${intentos===1?"al primer intento":"en el intento "+intentos}`; save(); setTimeout(() => won(i), 1100); }
        else { msg(["¡Uy, casi!","¡Fallaste!","¡Otra vez!"][intentos%3], "#b3261e"); vel = Math.max(210, vel*0.93);
          document.getElementById("tr-int").textContent = `Intento ${intentos}. ¡Sigue intentando, tú puedes!`; setTimeout(() => busy = false, 350); } }, F); };
    document.getElementById("tr-go").onclick = tirar; cont.onclick = tirar; }
  /* ===== La piñata: se balancea colgada de una cuerda; hay que pegarle 3 veces cuando pasa por el centro ===== */
  function pinataHtml(){ if (saved.pend === undefined){ saved.pend = pickPrize(prizes); save(); }
    return `<style>@keyframes pnfall{from{transform:translate(0,0) rotate(0)}to{transform:translate(var(--dx),420px) rotate(var(--r))}}</style>
      <div id="pn" style="position:relative;width:100%;max-width:360px;height:min(60vh,440px);margin:6px auto;border-radius:18px;overflow:hidden;background:radial-gradient(circle at 50% 0,#fff6d8,#ffd9b0 45%,#f7b5c4);border:3px solid #e2bb4f;touch-action:manipulation;cursor:pointer;user-select:none">
      <div style="position:absolute;top:0;left:0;right:0;height:26px;background:repeating-linear-gradient(90deg,#e94f64 0 22px,#ffcf33 22px 44px,#33b5e5 44px 66px,#7ac74f 66px 88px);clip-path:polygon(0 0,100% 0,100% 40%,95% 100%,90% 40%,85% 100%,80% 40%,75% 100%,70% 40%,65% 100%,60% 40%,55% 100%,50% 40%,45% 100%,40% 40%,35% 100%,30% 40%,25% 100%,20% 40%,15% 100%,10% 40%,5% 100%,0 40%)"></div>
      <div id="pn-arm" style="position:absolute;left:50%;top:0;width:0;height:0;transform-origin:0 0">
        <div style="position:absolute;left:-1px;top:0;width:2px;height:110px;background:#6b4b1f"></div>
        <div id="pn-p" style="position:absolute;left:-55px;top:100px;width:110px;text-align:center;font-size:96px;line-height:1">🪅</div></div>
      <div id="pn-msg" style="position:absolute;left:0;right:0;top:56%;text-align:center;font:900 30px Manrope,sans-serif;color:#b3261e;opacity:0;transition:opacity .15s;text-shadow:0 2px 0 #fff"></div>
      <div id="pn-hits" style="position:absolute;right:10px;bottom:10px;font:800 15px Manrope,sans-serif;color:#14213d;background:#fff;border-radius:99px;padding:6px 10px">Golpes: 0 / 3</div>
      <div id="pn-palo" style="position:absolute;left:50%;bottom:-6px;width:14px;height:260px;margin-left:-7px;border-radius:8px;background:linear-gradient(90deg,#c48a3a,#e6b066,#a8742c);transform-origin:50% 100%;transform:rotate(32deg);box-shadow:0 2px 6px rgba(0,0,0,.25)"></div>
      <div id="pn-pow" style="position:absolute;left:50%;top:0;font-size:46px;transform:translate(-50%,-50%) scale(0);pointer-events:none;transition:transform .12s">💥</div></div>
      <button class="jg-btn go" id="pn-go">¡DALE! 🪅</button><p class="jg-small" style="margin-top:0" id="pn-int">Toca cuando la piñata pase por el centro. Con 3 golpes se rompe.</p>`; }
  function bindPinata(){ const cont = document.getElementById("pn"), arm = document.getElementById("pn-arm"), pin = document.getElementById("pn-p"), palo = document.getElementById("pn-palo"); if (!cont) return; const i = saved.pend;
    let ang = 0, t0 = performance.now(), w = 2.6, A = 42, golpes = 0, busy = false, fin = false, fase = 0, last = t0;
    (function mv(t){ if (!document.body.contains(arm) || fin) return; fase += (t-last)/1000 * w; last = t; ang = A*Math.sin(fase); arm.style.transform = `rotate(${ang}deg)`; requestAnimationFrame(mv); })(t0);
    const msg = (tx, c) => { const m = document.getElementById("pn-msg"); m.textContent = tx; m.style.color = c; m.style.opacity = 1; setTimeout(() => { if (m) m.style.opacity = 0; }, 600); };
    const dulces = (n, desde) => { const r = cont.getBoundingClientRect(); for (let k = 0; k < n; k++){ const d = document.createElement("div"); d.textContent = ["🍬","🍭","🍫","🎊","⭐","🍬"][k%6];
        d.style.cssText = `position:absolute;left:${desde.x}px;top:${desde.y}px;font-size:${20+Math.random()*14}px;--dx:${(Math.random()-.5)*260}px;--r:${(Math.random()-.5)*720}deg;animation:pnfall ${0.9+Math.random()*0.7}s cubic-bezier(.3,-.4,.8,.6) forwards;pointer-events:none`; cont.append(d); setTimeout(() => d.remove(), 1800); } };
    const pos = () => { const r = pin.getBoundingClientRect(), c = cont.getBoundingClientRect(); return {x:r.left-c.left+r.width/2, y:r.top-c.top+r.height/2}; };
    /* el palo mide lo justo para llegar a la piñata cuando pasa por el centro */
    const ajustarPalo = () => { const p = pos(); palo.style.height = Math.max(160, cont.clientHeight - p.y + 6) + "px"; }; setTimeout(ajustarPalo, 60);
    const pow = document.getElementById("pn-pow");
    const pegar = () => { if (busy || fin) return; busy = true; jgCtx(); const p0 = pos(), cx = cont.clientWidth/2, pega = Math.abs(p0.x - cx) <= 52; /* se decide en el momento del toque */
      palo.animate([{transform:"rotate(32deg)"},{transform:"rotate(0deg)", offset:.45},{transform:"rotate(0deg)", offset:.6},{transform:"rotate(32deg)"}], {duration:320, easing:"ease-out"});
      setTimeout(() => { const p = pega ? pos() : p0;
        if (pega){ pow.style.top = p.y + "px"; pow.style.left = cx + "px"; pow.style.transform = "translate(-50%,-50%) scale(1)"; setTimeout(() => pow.style.transform = "translate(-50%,-50%) scale(0)", 220); golpes++; jgTick(160,.5,.08); document.getElementById("pn-hits").textContent = `Golpes: ${golpes} / 3`; pin.animate([{transform:"rotate(0) scale(1)"},{transform:"rotate(-18deg) scale(1.12)"},{transform:"rotate(12deg) scale(.95)"},{transform:"rotate(0) scale(1)"}], {duration:350});
          if (golpes >= 3){ fin = true; msg("¡SE ROMPIÓ! 🎉", "#1f7a3a"); pin.animate([{transform:"scale(1)", opacity:1},{transform:"scale(1.6)", opacity:0}], {duration:450, fill:"forwards"}); dulces(26, p); confetti(); jgFanfare && jgFanfare();
            setTimeout(() => won(i), 1300); return; }
          msg(["¡PUM! 💥","¡ZAS! 💥"][golpes-1] || "¡PUM!", "#d14b00"); dulces(5, p); w *= 1.15; setTimeout(() => busy = false, 280); }
        else { msg("¡Al aire! 😅", "#b3261e"); document.getElementById("pn-int").textContent = "¡Casi! Espera a que pase por el centro."; setTimeout(() => busy = false, 380); } }, 130); };
    document.getElementById("pn-go").onclick = pegar; cont.onclick = pegar; }
  /* ===== Rompecabezas: la foto del regalo en 9 piezas; toca dos piezas para cambiarlas de lugar ===== */
  const PZ_SEG = () => Math.min(180, Math.max(20, +P.seg || 60));
  async function puzzleImg(i){ const p = prizes[i] || {n:"Regalo"}; const c = document.createElement("canvas"); c.width = c.height = 600; const x = c.getContext("2d");
    if (p.img){ try { const im = await loadImg(p.img); const s0 = Math.min(im.width, im.height); x.drawImage(im, (im.width-s0)/2, (im.height-s0)/2, s0, s0, 0, 0, 600, 600);
      x.fillStyle = "rgba(0,0,0,.45)"; x.fillRect(0, 500, 600, 100); x.fillStyle = "#fff"; x.font = "800 40px Manrope, sans-serif"; x.textAlign = "center"; x.fillText(String(p.n).slice(0,24), 300, 565); return c.toDataURL("image/jpeg", .85); } catch {} }
    const g = x.createLinearGradient(0,0,600,600); g.addColorStop(0, JGT.g[0]); g.addColorStop(1, JGT.g[1]); x.fillStyle = g; x.fillRect(0,0,600,600);
    x.textAlign = "center"; x.font = "260px serif"; x.fillText("🎁", 300, 340); x.fillStyle = JGT.ink; x.font = "800 46px Manrope, sans-serif"; x.fillText(String(p.n).slice(0,22), 300, 470); x.font = "600 30px Manrope, sans-serif"; x.fillText("Royal Prestige", 300, 530); return c.toDataURL("image/jpeg", .85); }
  async function showPuzzle(){ if (saved.pend === undefined){ saved.pend = pickPrize(prizes); save(); } const i = saved.pend; const src = await puzzleImg(i);
    let ord; do { ord = [0,1,2,3,4,5,6,7,8].sort(() => Math.random()-.5); } while (ord.every((v,k) => v===k));
    let sel = -1, fin = false; const t0 = Date.now(), T = PZ_SEG()*1000;
    box.innerHTML = `<div class="jg-top">🧩 Arma tu regalo</div><div class="jg-timer" id="pz-t"></div><div class="jg-qbar"><i id="pz-bar" style="width:100%"></i></div>
      <div id="pz" style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;width:100%;max-width:330px;aspect-ratio:1;margin:6px auto;background:#e2bb4f;border:3px solid #e2bb4f;border-radius:14px;overflow:hidden"></div>
      <p class="jg-small" style="margin-top:0">Toca una pieza y luego otra para cambiarlas de lugar.</p><div style="text-align:center"><img src="${src}" alt="Así debe quedar" style="width:90px;border-radius:10px;border:2px solid #e2bb4f"><div class="jg-small" style="margin:0">Así debe quedar</div></div>`;
    const pz = document.getElementById("pz");
    const paint = () => { pz.innerHTML = ord.map((v,k) => `<button data-pz="${k}" aria-label="Pieza" style="border:0;padding:0;cursor:pointer;background:url(${src}) ${(v%3)*50}% ${Math.floor(v/3)*50}%/300% 300%;${sel===k?"outline:4px solid #b3261e;outline-offset:-4px;filter:brightness(1.15)":""}"></button>`).join("");
      pz.querySelectorAll("[data-pz]").forEach(b => b.onclick = () => { if (fin) return; const k = +b.dataset.pz; if (sel < 0){ sel = k; jgTick(800,.15,.03); } else { if (sel !== k){ [ord[sel], ord[k]] = [ord[k], ord[sel]]; jgTick(500,.2,.04); } sel = -1; } paint();
        if (ord.every((v,j) => v===j)){ fin = true; const sg = Math.round((Date.now()-t0)/1000); saved.quiz = `Rompecabezas: ${sg} s`; save(); pz.style.gap = "0"; setTimeout(() => won(i), 700); } }); };
    paint();
    const tick = () => { if (fin || !document.getElementById("pz-t")) return; const r = T - (Date.now()-t0); if (r <= 0){ fin = true;
        box.innerHTML = `<div class="jg-top">⏰ Se acabó el tiempo</div><h1 class="jg-h" style="font-size:30px">¡Casi lo logras!</h1><p class="jg-p">Te faltó poquito. Inténtalo otra vez: tu regalo te sigue esperando.</p><button class="jg-btn go" id="pz-re">Intentar otra vez</button>`; document.getElementById("pz-re").onclick = showPuzzle; return; }
      document.getElementById("pz-t").textContent = `⏱ ${Math.ceil(r/1000)} segundos`; document.getElementById("pz-bar").style.width = (r*100/T) + "%"; setTimeout(tick, 250); };
    tick(); }
  /* Cuenta regresiva para reservar (si el programa la tiene) */
  const relojMs = () => (+P.reloj||0) * 3600e3;
  function relojHtml(){ if (!relojMs()) return ""; if (!saved.at){ saved.at = Date.now(); save(); } return `<div class="jg-timer" id="jg-timer"></div>`; }
  function relojTick(){ const el = document.getElementById("jg-timer"); if (!el || !relojMs()) return; const f = saved.at + relojMs(), r = f - Date.now();
    if (r <= 0){ box.innerHTML = `<div class="jg-top">⏰ Se acabó el tiempo</div><div class="jg-h">Tu regalo ya no está reservado</div><p class="jg-p">Pídele a ${esc(ref)} que te mande un link nuevo.</p>`; return; }
    const h = Math.floor(r/3600e3), m = Math.floor(r%3600e3/60e3), s2 = Math.floor(r%60e3/1e3); el.textContent = `⏰ Reserva tu regalo en ${h}:${String(m).padStart(2,"0")}:${String(s2).padStart(2,"0")}`; setTimeout(relojTick, 1000); }
  function prizeHtml(i){ const p = prizes[i] || {n:"Un regalo"}; return `<div class="jg-prize">${p.img?`<img src="${p.img}" alt="">`:`<div style="font-size:90px">🎁</div>`}<div class="pn">${esc(p.n)}</div></div>`; }
  function showForm(i, fresh){
    box.innerHTML = `<div class="jg-top">${fresh?"🎉 ¡Felicidades! 🎉":"Tu regalo te está esperando"}</div><h1 class="jg-h">¡Ganaste!</h1>${prizeHtml(i)}${relojHtml()}
      <div class="jg-card"><h3>¡Felicitaciones! 🎉</h3><p style="margin:0;color:#555">Déjanos tu nombre y tu celular: uno de nuestros representantes te va a llamar para coordinar la entrega de tu regalo.</p>
        <input type="text" id="jg-name" placeholder="Tu nombre y apellido" autocomplete="name">
        <input type="tel" id="jg-tel" placeholder="Tu celular (10 dígitos)" inputmode="tel" autocomplete="tel">
        <label class="ck"><input type="checkbox" id="jg-ok"><span>Confirmo que soy mayor de 18 años y autorizo que me llamen o me escriban por mensaje o WhatsApp para coordinar la entrega de mi regalo.</span></label>
        <div class="jg-err" id="jg-err"></div>
        <button class="jg-btn" id="jg-send">Reservar mi regalo</button></div>
      <p class="jg-small">Totalmente gratis. Un regalo por persona.</p>`;
    relojTick(); const tel = document.getElementById("jg-tel");
    tel.oninput = () => { const d = tel.value.replace(/\D/g,"").replace(/^1(?=\d{10})/,"").slice(0,10); tel.value = d.length>6 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : d.length>3 ? `(${d.slice(0,3)}) ${d.slice(3)}` : d; };
    document.getElementById("jg-send").onclick = async () => {
      const err = document.getElementById("jg-err"); const name = document.getElementById("jg-name").value.trim().replace(/\s+/g," "); const t = telOk(tel.value);
      if (name.length < 3 || !/[a-záéíóúñ]{2}/i.test(name)) { err.textContent = "Escribe tu nombre."; return; }
      if (!t){ err.textContent = "Escribe tu número completo de 10 dígitos, con código de área."; return; }
      if (!document.getElementById("jg-ok").checked){ err.textContent = "Marca la casilla para poder contactarte."; return; }
      err.textContent = ""; const b = document.getElementById("jg-send"); b.disabled = true; b.textContent = "Guardando…";
      const lid = code + "_" + t;
      if (demo){ saved.done = true; saved.name = name; showDone(); return; }
      try {
        const ld = {code, pid:J.pid, name:name.slice(0,60), tel:t, prize:String(prizes[i]?.n||"").slice(0,80), at:Date.now(), socioId:J.socioId, up:J.up||"", tv:!!J.tv, by:J.by, ref:J.ref||"", status:"nuevo", kind:"jugador", acepta:true};
        const go = async conQ => { const bt = S.db.batch(); bt.set(S.db.doc("leads/"+lid), conQ && saved.quiz ? {...ld, quiz:String(saved.quiz).slice(0,120)} : ld); bt.update(S.db.doc("juegos/"+code), {n:(J.n||0)+1, last:lid}); await bt.commit(); };
        try { await go(true); } catch(e1){ if (!saved.quiz) throw e1; await go(false); }
        saved.done = true; saved.name = name; saved.tel = t; save(); showDone();
      } catch(e){ console.log(e);
        /* el contador cambió mientras jugaba: se reintenta con el número nuevo */
        try { const js = await S.db.doc("juegos/"+code).get(); const n2 = js.data()?.n || 0; if (n2 !== (J.n||0)){ J.n = n2; b.disabled = false; b.textContent = "Reservar mi regalo"; return document.getElementById("jg-send").click(); } } catch {}
        b.disabled = false; b.textContent = "Reservar mi regalo";
        err.textContent = "Ese número ya participó en esta promoción. Si crees que es un error, avísale a " + ref + "."; }
    };
  }
  /* ===== Sorteo: sin juego, solo foto + formulario + reglas oficiales ===== */
  function showSorteo(){ const so = J.sorteo || {}; const fecha = so.fecha ? new Intl.DateTimeFormat("es-US",{weekday:"long", day:"numeric", month:"long", year:"numeric"}).format(new Date(so.fecha + "T12:00:00")) : "";
    const patro = so.patro || "Kalud"; const gan = +so.ganadores || 1; const premio = so.premio || "un producto de cocina";
    if (so.modo === "regalo") return showRegalo(so, patro, premio);
    const reglas = `<details class="jg-card" style="text-align:left;font-size:13px;color:#555"><summary style="font-weight:800;cursor:pointer;color:#333">Reglas oficiales del sorteo</summary>
      <p><b>No se requiere compra para participar ni para ganar.</b> Comprar no aumenta tus probabilidades.</p>
      <p><b>Quién puede participar:</b> personas mayores de 18 años que vivan en el condado de San Diego, California. Una participación por persona y por número de teléfono.</p>
      <p><b>Cómo participar:</b> llena el formulario de esta página antes del ${esc(fecha)} a las 11:59 p.m. (hora de San Diego).</p>
      <p><b>Premio${gan>1?"s":""}:</b> ${gan} ganador${gan>1?"es":""}. Cada ganador recibe: ${esc(premio)}${so.valor?` (valor aproximado ${esc(so.valor)})`:""}. El premio no se puede cambiar por dinero.</p>
      <p><b>Cómo se escoge al ganador:</b> al azar entre todas las participaciones válidas, el ${esc(fecha)}. Las probabilidades de ganar dependen del número de participaciones recibidas.</p>
      <p><b>Aviso al ganador:</b> por llamada, mensaje de texto o WhatsApp al número registrado, dentro de los 3 días siguientes al sorteo. Si no responde en 7 días, se escoge otro ganador.</p>
      <p><b>Organiza:</b> ${esc(patro)}. Esta promoción no está patrocinada, avalada ni administrada por Meta, Facebook, Instagram ni WhatsApp, ni está asociada a ellos.</p>
      <p><b>Tus datos:</b> los usamos para avisarte si ganas y para contactarte con información sobre productos y promociones de cocina, según la autorización que das abajo. No los vendemos.</p></details>`;
    if (saved.done){ box.innerHTML = `<div class="jg-top">🎉 ¡Listo! 🎉</div><h1 class="jg-h">¡Ya estás participando${saved.name?", "+esc(firstName(saved.name)):""}!</h1>
      <p class="jg-p">El sorteo es el <b>${esc(fecha)}</b>. Si sales ganador${gan>1?"(a)":"(a)"}, te llamamos al número que dejaste. ¡Mucha suerte! 🍀</p>${reglas}`; return; }
    if (J.until && J.until < Date.now()){ box.innerHTML = `<div class="jg-top">Sorteo</div><div class="jg-h">Este sorteo ya cerró</div><p class="jg-p">¡Gracias por tu interés! Muy pronto tendremos más promociones.</p>`; return; }
    box.innerHTML = `${so.img ? `<img src="${so.img}" alt="" style="width:100%;max-width:520px;border-radius:22px;display:block;margin:0 auto 12px;box-shadow:0 10px 30px rgba(0,0,0,.18)">` : ""}
      <h1 class="jg-h" style="margin-top:4px">¡Participa y gana!</h1>
      <p class="jg-p"><b>${esc(premio)}</b><br>¡Totalmente gratis! 🎉${fecha?`<br><span style="font-size:14px">Sorteo: ${esc(fecha)}</span>`:""}</p>
      <div class="jg-card"><h3>Déjanos tus datos para participar</h3>
        <input type="text" id="jg-name" placeholder="Tu nombre y apellido" autocomplete="name">
        <input type="tel" id="jg-tel" placeholder="Tu celular (10 dígitos)" inputmode="tel" autocomplete="tel">
        <label class="ck"><input type="checkbox" id="jg-ok"><span>Confirmo que soy mayor de 18 años, que vivo en el condado de San Diego y que acepto las reglas oficiales. Autorizo que me llamen o me escriban por mensaje o WhatsApp para avisarme si gano y para darme información sobre productos de cocina.</span></label>
        <div class="jg-err" id="jg-err"></div>
        <button class="jg-btn" id="jg-send">¡Quiero participar!</button></div>
      <p class="jg-small">No se requiere compra. Una participación por persona.</p>${reglas}`;
    const tel = document.getElementById("jg-tel");
    tel.oninput = () => { const d = tel.value.replace(/\D/g,"").replace(/^1(?=\d{10})/,"").slice(0,10); tel.value = d.length>6 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : d.length>3 ? `(${d.slice(0,3)}) ${d.slice(3)}` : d; };
    document.getElementById("jg-send").onclick = async () => {
      const err = document.getElementById("jg-err"); const name = document.getElementById("jg-name").value.trim().replace(/\s+/g," "); const t = telOk(tel.value);
      if (name.length < 3 || !/[a-záéíóúñ]{2}/i.test(name)) { err.textContent = "Escribe tu nombre."; return; }
      if (!t){ err.textContent = "Escribe tu número completo de 10 dígitos, con código de área."; return; }
      if (!document.getElementById("jg-ok").checked){ err.textContent = "Marca la casilla para poder participar."; return; }
      err.textContent = ""; const b = document.getElementById("jg-send"); b.disabled = true; b.textContent = "Guardando…";
      if (demo){ saved.done = true; saved.name = name; return showSorteo(); }
      const lid = code + "_" + t;
      try { const ld = {code, pid:J.pid, name:name.slice(0,60), tel:t, prize:("Sorteo: " + premio).slice(0,80), at:Date.now(), socioId:J.socioId, up:J.up||"", tv:!!J.tv, by:J.by, ref:J.ref||"", status:"nuevo", kind:"jugador", acepta:true};
        const bt = S.db.batch(); bt.set(S.db.doc("leads/"+lid), ld); bt.update(S.db.doc("juegos/"+code), {n:(J.n||0)+1, last:lid}); await bt.commit();
        saved.done = true; saved.name = name; saved.tel = t; save(); showSorteo(); }
      catch(e){ console.log(e);
        try { const js = await S.db.doc("juegos/"+code).get(); const n2 = js.data()?.n || 0; if (n2 !== (J.n||0)){ J.n = n2; b.disabled = false; b.textContent = "¡Quiero participar!"; return document.getElementById("jg-send").click(); } } catch {}
        b.disabled = false; b.textContent = "¡Quiero participar!"; err.textContent = "Ese número ya está participando en este sorteo."; } };
  }
  /* Regalo para todas: deja sus datos y recibe un regalo (sin fecha ni ganadores) */
  function showRegalo(so, patro, premio){
    const terms = `<details class="jg-card" style="text-align:left;font-size:13px;color:#555"><summary style="font-weight:800;cursor:pointer;color:#333">Reglas de la promoción</summary>
      <p><b>No se requiere compra para participar ni para ganar.</b> Comprar no aumenta tus probabilidades.</p>
      <p><b>Quién puede participar:</b> mayores de 18 años que vivan en el condado de San Diego, California. Una participación por persona y por número de teléfono.</p>
      <p><b>Cómo se escoge al ganador:</b> cada lunes se escoge al azar ${(+so.ganadores||1) > 1 ? (+so.ganadores)+" ganadores" : "1 ganador(a)"} entre las personas que participaron la semana anterior (de lunes a domingo). Las probabilidades dependen de cuántas personas participen esa semana.</p>
      <p><b>Premio:</b> ${esc(premio)}. No se puede cambiar por dinero.</p>
      <p><b>Aviso al ganador:</b> por llamada, mensaje o WhatsApp al número registrado. Si no responde en 7 días, se escoge a otra persona.</p>
      <p><b>Organiza:</b> ${esc(patro)}. Esta promoción no está patrocinada, avalada ni administrada por Meta, Facebook, Instagram ni WhatsApp, ni está asociada a ellos.</p>
      <p><b>Tus datos:</b> los usamos para avisarte si ganas y para contactarte con información sobre productos de cocina. No los vendemos.</p></details>`;
    if (saved.done){ box.innerHTML = `<div style="font-size:64px;text-align:center">✅</div><h1 class="jg-h">¡Información enviada!</h1>
      <p class="jg-p">¡Te deseamos mucha suerte! 🍀</p>${terms}`; return; }
    const imgH = so.img ? `<img src="${so.img}" alt="" style="width:100%;max-width:520px;border-radius:22px;display:block;margin:0 auto 12px;box-shadow:0 10px 30px rgba(0,0,0,.18)">` : "";
    if (!showRegalo.paso){ box.innerHTML = `${imgH}<h1 class="jg-h" style="margin-top:4px">¡Participa y gana!</h1>
      <p class="jg-p"><b>${esc(premio)}</b><br>¡Totalmente gratis! 🎉</p><button class="jg-btn go" id="jg-part">¡PARTICIPAR! <span style="font-size:22px">›</span></button>
      <p class="jg-small">Totalmente gratis. No se requiere compra.</p>${terms}`;
      document.getElementById("jg-part").onclick = () => { showRegalo.paso = 1; showRegalo(so, patro, premio); window.scrollTo(0,0); }; return; }
    box.innerHTML = `<div class="jg-card">
        <input type="text" id="jg-name" placeholder="Nombre y apellido" autocomplete="name">
        <input type="tel" id="jg-tel" placeholder="Celular (10 dígitos)" inputmode="tel" autocomplete="tel">
        <label class="ck"><input type="checkbox" id="jg-ok"><span>Soy mayor de edad. Si salgo ganador(a), autorizo que un representante me llame para entregarme mi regalo.</span></label>
        <div class="jg-err" id="jg-err"></div>
        <button class="jg-btn" id="jg-send">¡Participar!</button></div>
      <p class="jg-small">Totalmente gratis. No se requiere compra.</p>${terms}`;
    const tel = document.getElementById("jg-tel");
    tel.oninput = () => { const d = tel.value.replace(/\D/g,"").replace(/^1(?=\d{10})/,"").slice(0,10); tel.value = d.length>6 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : d.length>3 ? `(${d.slice(0,3)}) ${d.slice(3)}` : d; };
    document.getElementById("jg-send").onclick = async () => {
      const err = document.getElementById("jg-err"); const name = document.getElementById("jg-name").value.trim().replace(/\s+/g," "); const t = telOk(tel.value);
      if (name.length < 3 || !/[a-záéíóúñ]{2}/i.test(name)) { err.textContent = "Escribe tu nombre."; return; }
      if (!t){ err.textContent = "Escribe tu número completo de 10 dígitos, con código de área."; return; }
      if (!document.getElementById("jg-ok").checked){ err.textContent = "Marca la casilla para participar."; return; }
      err.textContent = ""; const b = document.getElementById("jg-send"); b.disabled = true; b.textContent = "Guardando…";
      if (demo){ saved.done = true; saved.name = name; return showRegalo(so, patro, premio); }
      const lid = code + "_" + t;
      try { const ld = {code, pid:J.pid, name:name.slice(0,60), tel:t, prize:String(premio).slice(0,80), at:Date.now(), socioId:J.socioId, up:J.up||"", tv:!!J.tv, by:J.by, ref:J.ref||"", status:"nuevo", kind:"jugador", acepta:true};
        const bt = S.db.batch(); bt.set(S.db.doc("leads/"+lid), ld); bt.update(S.db.doc("juegos/"+code), {n:(J.n||0)+1, last:lid}); await bt.commit();
        saved.done = true; saved.name = name; saved.tel = t; save(); showRegalo(so, patro, premio); }
      catch(e){ console.log(e);
        try { const js = await S.db.doc("juegos/"+code).get(); const n2 = js.data()?.n || 0; if (n2 !== (J.n||0)){ J.n = n2; b.disabled = false; b.textContent = "¡Participar!"; return document.getElementById("jg-send").click(); } } catch {}
        b.disabled = false; b.textContent = "¡Participar!"; err.textContent = "Ese número ya está registrado en esta promoción."; } };
  }
  function showDone(){
    setTimeout(musicStop, 2500);
    const i = saved.prize ?? 0; const mine = saved.child;
    box.innerHTML = `<div class="jg-top">🎉 ¡Felicitaciones! 🎉</div><h1 class="jg-h">¡Ganaste${saved.name?", "+esc(firstName(saved.name)):""}!</h1>${prizeHtml(i)}
      <p class="jg-p">Uno de nuestros representantes te va a llamar para coordinar la entrega de tu regalo. ¡Es totalmente gratis!</p>
      <div class="jg-card" style="text-align:center"><h3>🎁 ¿Quieres ganar más regalos?</h3>
        <p style="margin:0;color:#555">Invita a tus amigas a jugar. Cada ${meta.cada||4} amigas que ${meta.cuenta==="amigas"?"participen":"reciban nuestra visita"}, ganas otro regalo (hasta ${Math.floor((meta.refs||14)/(meta.cada||4))}).</p>
        <button class="jg-btn alt" id="jg-inv">Invitar a mis amigas por WhatsApp</button>
        ${mine?`<a class="jg-btn sec" style="text-decoration:none;display:block" href="${jgLink(mine)}&a=1">Ver cuántas amigas llevo</a>`:""}</div>
      `;
    /* El link de ella se crea y se comprueba enseguida (no al tocar el botón), y se prepara la imagen con el QR:
       así, al tocar "Invitar", se comparte al instante el link correcto con la foto (el iPhone no deja compartir si se espera mucho). */
    const linkDe = c => jgLink(c) + (c !== code ? "&p=" + code : "");
    const preparar = async () => { try {
        if (saved.child){ const ok = await S.db.doc("juegos/"+saved.child).get().then(d => d.exists, () => true); if (!ok){ saved.child = null; save(); } }
        if (!saved.child && saved.tel){ const c = newCode() + newCode().slice(0,2);
          await S.db.doc("juegos/"+c).set({pid:J.pid, ref:firstName(saved.name)+" "+(String(saved.name||"").split(/\s+/)[1]||""), socioId:J.socioId, up:J.up||"", tv:!!J.tv, by:J.by, n:0, until:(J.until===0 ? 0 : Date.now()+14*864e5), padre:code, refLead:code+"_"+saved.tel, createdAt:Date.now(), kind:"amiga", meta, ...(J.tipo ? {tipo:J.tipo} : {})});
          const ok = await S.db.doc("juegos/"+c).get().then(d => d.exists, () => false); if (ok){ saved.child = c; save(); } }
      } catch(e){ console.log("hija", e); }
      const c = saved.child || code; const jj = saved.child ? {ref:firstName(saved.name)+" "+(String(saved.name||"").split(/\s+/)[1]||"")} : J;
      try { const blob = await promoImg(jj, P, linkDe(c)); S.jgFile = {c, file: new File([blob], "regalo.png", {type:"image/png"})}; } catch(e){ console.log("img", e); }
      return c; };
    const listo = demo ? Promise.resolve(code) : preparar();
    document.getElementById("jg-inv").onclick = async () => {
      const b = document.getElementById("jg-inv"); const c = saved.child || code; const msg = fillMsg(P.msg || defMsg(tipo), {link:linkDe(c)});
      const f = S.jgFile && S.jgFile.c === c ? S.jgFile.file : null;
      try {
        if (navigator.share){ const d = f && navigator.canShare && navigator.canShare({files:[f]}) ? {files:[f], text:msg} : {text:msg}; await navigator.share(d); }
        else location.href = "https://wa.me/?text="+encodeURIComponent(msg);
      } catch(e){ if (e && e.name === "AbortError") return; try { await navigator.share({text:msg}); } catch { location.href = "https://wa.me/?text="+encodeURIComponent(msg); } }
    };
    listo.then(c => { if (c !== code && !mine) showDone(); });
  }
  function showAvance(){
    const vis = meta.cuenta !== "amigas"; const n = vis ? (J.visitas||0) : (J.n||0), cada = meta.cada||4, tot = meta.refs||14, ganados = Math.min(Math.floor(n/cada), Math.floor(tot/cada)), falta = n >= tot ? 0 : cada - (n % cada);
    const u = vis ? (n===1 ? "visita" : "visitas") : (n===1 ? "amiga" : "amigas");
    box.innerHTML = `<div class="jg-top">Tu avance</div>${nameHtml(J.alias || J.ref)}<h1 class="jg-h">llevas <b>${n}</b> ${u}${vis?" de tus amigas":""}</h1>
      ${vis?`<p class="jg-p">${J.n||0} amiga${(J.n||0)===1?"":"s"} ya jugaron con tu link. Cada visita que les hacemos cuenta para tu regalo.</p>`:""}
      <div class="jg-bar"><i style="width:${Math.min(100, n*100/tot)}%"></i></div><p class="jg-p">Meta: ${tot} ${vis?"visitas":"amigas"} · un regalo cada ${cada}</p>
      ${(J.regalos||[]).some(x => String(x||"").trim()) ? `<div class="jg-chips col">${(J.regalos||[]).slice(0, Math.floor(tot/cada)).map((r,i) => String(r||"").trim() ? `<span class="jg-chip">${i<ganados?"✅":"🎁"} ${esc(r)} · a las ${(i+1)*cada} ${vis?"visitas":"amigas"}</span>` : "").join("")}</div>` : ""}
      <div class="jg-chips"><span class="jg-chip">🎁 Regalos ganados: ${ganados}</span>${falta?`<span class="jg-chip">Te faltan ${falta} para el siguiente</span>`:`<span class="jg-chip">🏆 ¡Llegaste a la meta!</span>`}</div>
      <button class="jg-btn alt" id="jg-sh">Invitar a más amigas</button>`;
    document.getElementById("jg-sh").onclick = async () => { const msg = fillMsg(P.msg || defMsg(tipo), {link:jgLink(code)}); if (navigator.share) { try { await navigator.share({text:msg}); } catch {} } else location.href = "https://wa.me/?text="+encodeURIComponent(msg); };
  }
}

/* ================= DENTRO DE LUNAYA ================= */
function subJuegos(){ if (window.subAnuncios) setTimeout(subAnuncios, 0);
  S.programs = {}; S.juegos = {}; S.leads = {}; S.jl = {}; S.ll = {}; S.leadsReady = false;
  const r = S.me?.role; const q = [["by", S.uid], ["socioId", S.uid]]; if (S.isOwner || r==="admin" || isDist()) q.push(["up", S.uid]); if (r==="tele" && !S.me?.upline) q.push(["tv", true]);
  S.unsub.push(S.db.collection("programs").onSnapshot(s => { S.programs = {}; s.docs.forEach(d => S.programs[d.id] = d.data()); if (S.view==="juego") render(); }, e => console.log("programs", e)));
  q.forEach(([f,v]) => jgSub(f, v).forEach(u => S.unsub.push(u)));
  setTimeout(() => S.leadsReady = true, 5000);
}
/* Suscribe links y prospectos de un filtro; devuelve cómo cancelarlo (para quitar el acceso de una telemarketer a un distribuidor) */
function jgSub(f, v){ const k = f+"|"+v;
  const u1 = S.db.collection("juegos").where(f, "==", v).onSnapshot(s => { const m = {}; s.docs.forEach(d => m[d.id] = d.data()); S.jl[k] = m; S.juegos = Object.assign({}, ...Object.values(S.jl)); if (S.view==="juego") render(); }, e => console.log("juegos", k, e));
  const u2 = S.db.collection("leads").where(f, "==", v).onSnapshot(s => { const m = {}; s.docs.forEach(d => m[d.id] = d.data()); S.ll[k] = m; const prev = S.leads; S.leads = Object.assign({}, ...Object.values(S.ll));
      if (S.leadsReady){ Object.entries(S.leads).forEach(([id,l]) => { if (!prev[id] && l.kind==="jugador") avisar(S.juegos?.[l.code]?.anuncio ? "📣 Nuevo prospecto del anuncio" : "🎁 Nuevo prospecto de la ruleta", `${l.name} · ${ganoTxt(l)}${l.ref && !S.juegos?.[l.code]?.anuncio?" · amiga de "+l.ref:""}${otrasVeces(id).length?" · 🔁 ya estaba en otro programa":""}`); }); }
      render(); }, e => console.log("leads", k, e));
  return [u1, u2, () => { delete S.jl[k]; delete S.ll[k]; S.juegos = Object.assign({}, ...Object.values(S.jl)); S.leads = Object.assign({}, ...Object.values(S.ll)); }];
}
/* Avance de un cliente: amigas que jugaron y visitas hechas (citas de esas amigas marcadas "Demostración hecha") */
/* Referidos de un cliente: los que jugaron la ruleta y los de la hoja (uno por teléfono; si jugó, cuenta como jugó) */
const esProsp = l => l.kind==="jugador" || l.kind==="hoja";
function refsDe(code){ const by = {}; Object.entries(S.leads||{}).forEach(([id,l]) => { if (!esProsp(l) || l.code!==code) return; const k = l.tel || id; const cur = by[k];
    if (!cur || (cur[1].kind==="hoja" && l.kind==="jugador")) by[k] = [id, {...l, apptId: l.apptId || cur?.[1]?.apptId, enviado: l.enviado || cur?.[1]?.enviado}]; else if (!cur[1].apptId && l.apptId) cur[1].apptId = l.apptId; });
  return Object.values(by); }
/* Prospectos para llamar: si un contacto de la hoja después jugó, se muestra una sola vez */
function prospectos(){ const jug = new Set(Object.values(S.leads||{}).filter(l => l.kind==="jugador").map(l => l.code+"|"+l.tel));
  return Object.entries(S.leads||{}).filter(([,l]) => l.kind==="jugador" || (l.kind==="hoja" && !jug.has(l.code+"|"+l.tel))); }
function avanceDe(code){ const j = S.juegos?.[code] || {}; const m = {refs:14, cada:4, ...(S.programs?.[j.pid]?.meta || j.meta || {})};
  const ls = refsDe(code); const jugaron = ls.filter(([,l]) => l.kind==="jugador").length;
  const amigas = Math.max(j.n||0, jugaron), visitas = ls.filter(([,l]) => l.apptId && S.appts?.[l.apptId]?.status==="hecha").length;
  const base = m.cuenta==="amigas" ? amigas : visitas, max = Math.floor(m.refs/m.cada); const ganados = Math.min(Math.floor(base/m.cada), max);
  return {m, amigas, visitas, base, ganados, max, falta: ganados>=max ? 0 : m.cada - (base % m.cada), unidad: m.cuenta==="amigas" ? "amigas que jugaron" : "visitas"}; }
function msgAvance(code){ const j = S.juegos[code], a = avanceDe(code), nm = firstName(j.ref);
  const linea = a.m.cuenta==="amigas" ? `${a.amigas} amiga${a.amigas===1?"":"s"} ya jugaron con tu link` : `ya visitamos a ${a.visitas} de tus referidos`;
  return a.ganados > (j.avisados||0)
    ? `¡Hola ${nm}! 🎉 Te tengo una gran noticia: ${linea}, ¡y ya te ganaste tu ${regaloDe(j,a.ganados-1) ? regaloDe(j,a.ganados-1) : "regalo"+(a.ganados>1?" número "+a.ganados:"")}! 🎁 Te escribo para coordinar la entrega.\n\n${a.falta ? `Te faltan ${a.falta} más para ${regaloDe(j,a.ganados) ? "tu "+regaloDe(j,a.ganados) : "el siguiente regalo"}. ` : ""}Mira tu avance aquí: ${jgLink(code)}&a=1\n\n¡Gracias por recomendarnos! ❤️`
    : `¡Hola ${nm}! 😊 Te cuento cómo va tu programa de regalos: ${linea}. Te faltan ${a.falta} para tu ${regaloDe(j,a.ganados) || (a.ganados ? "siguiente regalo" : "regalo")} 🎁\n\nMira tu avance aquí: ${jgLink(code)}&a=1\n\n¡Gracias por recomendarnos! ❤️`; }
function msgReferido(code, nombre){ const j = S.juegos[code] || {}; const p = conJuego(S.programs[j.pid] || {}, j); const r = firstName(j.ref);
  return `¡Hola${nombre?" "+firstName(nombre):""}! 👋 Te escribo de parte de ${r}, que nos recomendó contigo 😊 Somos de Royal Prestige.\n\n${r} está participando por regalos para su cocina y tú también puedes ganarte uno, ¡totalmente gratis! 🎁\n\n${TI(p.tipo).cta==="Ábrela"?"Abre tu caja sorpresa":TI(p.tipo).cta==="Gira"?"Gira la ruleta":TI(p.tipo).cta} aquí 👉 ${jgLink(code)}`; }
/* Guarda el avance en el link (lo ve el cliente en su página) y avisa cuando alguien se gana un regalo */
function syncAvance(){ Object.entries(S.juegos||{}).forEach(([code,j]) => { if (j.kind==="campana" || !(j.by===S.uid || j.socioId===S.uid)) return; const a = avanceDe(code);
  if (a.visitas !== (j.visitas||0) || a.ganados !== (j.ganados||0)){ if (a.ganados > (j.ganados||0)) avisar("🎁 Un cliente se ganó su regalo", `${j.ref} ya tiene ${a.base} ${a.unidad}. Avísale desde Ruleta.`);
    j.visitas = a.visitas; j.ganados = a.ganados; S.db.doc("juegos/"+code).update({visitas:a.visitas, ganados:a.ganados}).catch(e => console.log("avance", e)); } }); }
/* El mismo teléfono en otros links o programas tuyos: se avisa, pero igual queda inscrito */
function otrasVeces(id){ const l = S.leads[id]; if (!l || !l.tel) return [];
  return Object.entries(S.leads).filter(([k,x]) => k!==id && esProsp(x) && x.tel===l.tel && !(x.code===l.code)).map(([,x]) => x).sort((a,b) => (a.at||0) - (b.at||0)); }
function repetidoHtml(id){ const o = otrasVeces(id); if (!o.length) return "";
  return `<div class="banner warn">🔁 <b>Este número ya estaba</b>${o.slice(0,5).map(x => `<div class="note" style="color:inherit;margin-top:3px">• ${fmt(x.at||Date.now(),{day:"numeric",month:"short",year:"numeric"})} · ${esc(progName(x.pid))} de ${esc(x.ref||"")} · ${x.kind==="hoja"?"de la hoja":"jugó"}${x.prize?" ("+esc(x.prize)+")":""} · ${esc(JG_ST[x.status]||x.status||"")}${x.socioId!==S.uid?" · "+esc(memberName(x.socioId)):""}</div>`).join("")}<div class="note" style="color:inherit;margin-top:4px">Igual quedó inscrito aquí.</div></div>`; }
const nuevosLeads = () => prospectos().filter(([,l]) => l.status==="nuevo").length;
/* Programas que puede usar: los suyos, los de su director o distribuidor y los de Dirección (son para todo el mundo, ya listos con sus fotos) */
function misProgramas(){ const yo = pagadorDe(S.uid);
  return Object.entries(S.programs||{}).filter(([,p]) => p.activo!==false && (p.owner===S.uid || p.owner===yo || pagadorDe(p.owner)===yo || esDir(p.owner)))
    .sort((a,b) => (b[1].owner===S.uid) - (a[1].owner===S.uid) || esDir(b[1].owner) - esDir(a[1].owner) || (b[1].createdAt||0)-(a[1].createdAt||0)); }
const esDir = uid => S.members?.[uid]?.role==="admin";
const progName = pid => S.programs?.[pid]?.name || "Programa";

/* Prospectos agrupados por el cliente dueño del link (las amigas de sus amigas también cuentan para ese cliente) */
const leadItem = ([id,l]) => `<button class="item" data-lead="${id}"><div><div class="t">${esc(l.name)}</div><div class="m">${telFmt(l.tel)} · ${l.kind==="hoja" ? "📋 De la hoja" : "🎁 "+esc(l.prize)}${l.quiz?" · "+esc(l.quiz):""}</div>${otrasVeces(id).length?`<div class="m" style="color:var(--warn);font-weight:700">🔁 Ya estaba en ${otrasVeces(id).length} programa(s)</div>`:""}<div class="m">Amiga de ${esc(l.ref||"—")} · ${fmt(l.at,{day:"numeric",month:"short"})}${l.socioId!==S.uid?" · para "+esc(memberName(l.socioId)):""}</div></div><span class="tag ${l.status==="nuevo"?"tg-warn":l.status==="cita"?"tg-good":"tg-mute"}">${JG_ST[l.status]||l.status}</span></button>`;
function raizDe(code){ let c = code, k = 0; while (S.juegos?.[c]?.padre && S.juegos[S.juegos[c].padre] && k++ < 10) c = S.juegos[c].padre; return c; }
function gruposLeads(leads){ const g = {};
  leads.forEach(([id,l]) => { const r = raizDe(l.code); const j = S.juegos?.[r] || {}; const x = g[r] ||= {code:r, ref: j.ref || l.ref || "Sin cliente", prog: progName(j.pid || l.pid), socio: j.socioId || l.socioId, items:[], nuevos:0, last:0};
    x.items.push([id,l]); if (l.status==="nuevo") x.nuevos++; x.last = Math.max(x.last, l.at||0); });
  Object.values(g).forEach(x => x.items.sort((a,b) => (a[1].status==="nuevo"?0:1) - (b[1].status==="nuevo"?0:1) || (b[1].at||0) - (a[1].at||0)));
  return Object.values(g).sort((a,b) => (b.nuevos?1:0) - (a.nuevos?1:0) || b.last - a.last); }
function viewJuego(r){
  const f = S.f.lead || "nuevo"; const fs = S.f.lsoc || ""; const socs = [...new Set(prospectos().map(([,l]) => l.socioId))];
  const leads = prospectos().filter(([,l]) => (f==="todos" || l.status===f) && (!fs || l.socioId===fs)).sort((a,b)=>(b[1].at||0)-(a[1].at||0));
  const progs = misProgramas(); const mine = Object.entries(S.programs||{}).filter(([,p]) => p.owner===S.uid);
  const links = Object.entries(S.juegos||{}).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
  const porAvisar = links.filter(([c,j]) => j.kind!=="campana" && avanceDe(c).ganados > (j.avisados||0));
  return `${porAvisar.map(([c,j]) => `<div class="banner good" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>🎁 <b>${esc(j.ref)}</b> se ganó su regalo${avanceDe(c).ganados>1?" #"+avanceDe(c).ganados:""} (${avanceDe(c).base} ${avanceDe(c).unidad}). ¡Avísale!</span><button class="btn small" data-avance="${c}">Avisarle</button></div>`).join("")}
    <div class="card"><div class="row"><button class="btn" id="jg-ins">🎁 Inscribir cliente</button><button class="btn dark" id="jg-camp">📣 Campaña por mensaje</button><button class="btn ghost" id="jg-newp">➕ Nuevo programa</button></div>
      ${progs.length?"":`<p class="note" style="margin-bottom:0">Primero crea un programa: los regalos con su foto, la probabilidad de cada uno y la meta de referidos.</p>`}</div>
    ${window.anunciosCard ? anunciosCard() : ""}
    <div class="card"><h2>Prospectos que llegaron<span class="note">${nuevosLeads()} nuevo(s)</span></h2>
      ${socs.length > 1 ? `<select class="i" id="jg-lsoc" style="margin-bottom:8px"><option value="">Todos los socios</option>${socs.map(id => `<option value="${id}" ${fs===id?"selected":""}>${esc(memberName(id))}</option>`).join("")}</select>` : ""}
      <div class="row" style="margin-bottom:10px"><button class="btn small ghost" id="jg-csv">⬇️ Descargar para el Drive</button>${fs && S.drives?.[fs]?.url ? `<a class="btn small ghost" href="${esc(S.drives[fs].url)}" target="_blank" rel="noopener">📂 Drive de ${esc(firstName(memberName(fs)))}</a>` : ""}</div>
      <div class="chips" style="margin-bottom:10px">${[["nuevo","Nuevos"],["llamado","Ya se llamó"],["cita","Con cita"],["no_interesa","No le interesa"],["todos","Todos"]].map(([k,l])=>`<button class="chip ${f===k?"on":""}" data-lf="${k}">${l}</button>`).join("")}</div>
      <div class="chips" style="margin-bottom:10px">${[["cliente","👥 Por cliente"],["junto","📋 Todos juntos"]].map(([k,l])=>`<button class="chip ${(S.f.lgrp||"cliente")===k?"on":""}" data-lgrp="${k}">${l}</button>`).join("")}</div>
      ${!leads.length ? `<div class="empty">${f==="nuevo"?"No hay prospectos nuevos. Cuando alguien juegue con uno de tus links, aparece aquí solo.":"No hay prospectos aquí."}</div>`
        : (S.f.lgrp||"cliente")==="junto" ? `<div class="list">${leads.slice(0,80).map(leadItem).join("")}</div>`
        : gruposLeads(leads).map(g => `<details class="lgrp" ${g.nuevos?"open":""} style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:8px"><summary style="cursor:pointer;list-style:none"><div class="row" style="justify-content:space-between;gap:8px"><div><b style="font-size:16px">${esc(g.ref)}</b> <span class="note">${esc(g.prog)}${g.socio!==S.uid?" · "+esc(memberName(g.socio)):""}</span></div><div class="row" style="gap:4px">${g.nuevos?`<span class="tag tg-warn">${g.nuevos} nuevo(s)</span>`:""}<span class="tag tg-mute">${g.items.length}</span></div></div></summary>
          <div class="list" style="margin-top:8px">${g.items.map(leadItem).join("")}</div>${g.code && S.juegos[g.code] ? `<button class="btn small ghost" data-avance="${g.code}" style="margin-top:8px">Ver avance de ${esc(firstName(g.ref))}</button>` : ""}</details>`).join("")}</div>
    <div class="card"><h2>Links activos<span class="note">${links.length}</span></h2>
      ${links.length?`<div class="list">${links.slice(0,40).map(([c,j])=>{ const m = j.meta || S.programs?.[j.pid]?.meta || {refs:14,cada:4}; const venc = j.until && j.until < Date.now();
        const av = avanceDe(c); return `<div class="item" style="cursor:default"><div style="min-width:0;flex:1"><div class="t">${j.kind==="campana"?"📣 ":j.kind==="amiga"?"👭 ":""}${esc(j.ref||"")}${av.ganados?` <span class="tag tg-good">🎁 ${av.ganados} ganado${av.ganados>1?"s":""}</span>`:""}</div><div class="m">${esc(progName(j.pid))} · ${av.amigas} amiga${av.amigas===1?"":"s"} · ${av.visitas} visita${av.visitas===1?"":"s"}${j.kind!=="campana"?` · faltan ${av.falta} para ${regaloDe(j,av.ganados) ? "🎁 "+esc(regaloDe(j,av.ganados)) : `el ${av.ganados?"siguiente ":""}regalo`}`:""}${venc?" · vencido":j.until?" · hasta "+fmt(j.until,{day:"numeric",month:"short"}):""}${j.socioId!==S.uid?" · "+esc(memberName(j.socioId)):""}</div><div class="bar"><i style="width:${Math.min(100, av.base*100/(av.m.refs||14))}%"></i></div></div><div class="row" style="flex-wrap:nowrap;flex:none">${j.kind!=="campana"?`<button class="btn small ghost" data-avance="${c}">Avance</button><button class="btn small ghost" data-editlink="${c}" title="Editar">✏️</button>`:""}<button class="btn small" data-share="${c}">Mandar</button>${j.by===S.uid || j.socioId===S.uid ? `<button class="btn small ghost" data-jdel="${c}" aria-label="Borrar link">🗑️</button>` : ""}</div></div>`; }).join("")}</div>`:`<div class="empty">Todavía no hay links. Toca “Inscribir cliente”.</div>`}</div>
    ${misProgramas().length ? `<div class="card"><h2>👀 Prueba los juegos</h2><p class="note" style="margin-top:-6px">Juégalos tú misma para ver cómo los ve el cliente. No se guarda nada.</p><div style="margin:-2px 0 8px"><button class="btn small" id="try-ad">🎬 Ver como anuncio (para grabar video)</button><span class="note"> Sale «¡Gira y gana!» sin nombre, como en Meta.</span></div><div class="opts">${juegosDe(S.programs?.[misProgramas()[0][0]]).map(([k,t])=>`<button class="opt" data-try="${k}">${t.e} ${t.n}</button>`).join("")}</div></div>` : ""}
    <div class="card"><h2>Mis programas</h2>${mine.length?`<div class="list">${mine.map(([id,p])=>`<button class="item" data-prog="${id}"><div><div class="t">${TI(p.tipo).e} ${esc(p.name)}</div><div class="m">${(p.prizes||[]).map(x=>esc(x.n)).join(" · ")}</div><div class="m">Meta: ${p.meta?.refs||14} referidos, un regalo cada ${p.meta?.cada||4}${p.activo===false?" · pausado":""}</div></div><span class="note">Editar</span></button>`).join("")}</div>`:`<div class="empty">No has creado programas.${progs.length?" Puedes usar los de tu equipo.":""}</div>`}</div>
    ${(() => { const cp = Object.entries(S.programs||{}).filter(([,p]) => p.owner!==S.uid && p.activo!==false && S.members[p.owner]?.role==="admin"); return cp.length ? `<div class="card"><h2>Diseña tu propia ruleta</h2><p class="note" style="margin-top:-6px">La ruleta de Lunaya ya está lista para usar: solo toca "Inscribir cliente". Si quieres una a tu gusto, cópiala y cámbiale lo que quieras: colores, textos, regalos, fotos y mensaje. La copia es solo tuya.</p><div class="list">${cp.map(([id,p])=>`<div class="item" style="cursor:default"><div><div class="t">${TI(p.tipo).e} ${esc(p.name)}</div><div class="m">${(p.prizes||[]).map(x=>esc(x.n)).join(" · ")}</div></div><button class="btn small" data-pcopy="${id}">Copiar y diseñar</button></div>`).join("")}</div></div>` : ""; })()}`;
}
function bindJuego(){
  try { const by = sessionStorage.getItem("ly-back-y"); if (by !== null){ sessionStorage.removeItem("ly-back-y"); setTimeout(() => window.scrollTo(0, +by||0), 60); } } catch {}
  document.querySelectorAll("[data-try]").forEach(b => b.onclick = () => probarJuego(S.programs?.[misProgramas()[0]?.[0]], b.dataset.try));
  if (document.getElementById("try-ad")) document.getElementById("try-ad").onclick = () => { const pr = misProgramas(); if (!pr.length) return;
    if (pr.length === 1) { probarJuego(pr[0][1], pr[0][1].tipo, true); return; }
    openModal(`<h3>¿Qué juego quieres grabar?</h3><div class="opts">${pr.map(([pid,p]) => `<button class="opt" data-tad="${pid}">${TI(p.tipo).e} ${esc(p.name||"Programa")}${p.owner!==S.uid?" · de "+esc(firstName(memberName(p.owner))):""}</button>`).join("")}</div><div class="row"><button class="btn ghost" data-close>Cancelar</button></div>`, () => {
      document.querySelectorAll("[data-tad]").forEach(x => x.onclick = () => { const p = S.programs[x.dataset.tad]; probarJuego(p, p.tipo, true); }); }); };
  const m = document.getElementById("main"); if (!m) return; const on = (sel, fn) => m.querySelectorAll(sel).forEach(fn);
  const q = id => document.getElementById(id);
  if (q("jg-newp")) q("jg-newp").onclick = () => openPrograma();
  if (q("jg-ins")) q("jg-ins").onclick = () => openInscribir();
  if (q("jg-camp")) q("jg-camp").onclick = () => openCampana();
  on("[data-lf]", b => b.onclick = () => { S.f.lead = b.dataset.lf; render(); });
  if (q("jg-lsoc")) q("jg-lsoc").onchange = e => { S.f.lsoc = e.target.value; render(); };
  if (q("jg-csv")) q("jg-csv").onclick = () => { const fs = S.f.lsoc || ""; const l = prospectos().filter(([,x]) => !fs || x.socioId===fs).sort((a,b) => (a[1].at||0) - (b[1].at||0));
    if (!l.length){ toast("No hay prospectos para descargar"); return; }
    csvDownload(`prospectos-${fs ? firstName(memberName(fs)).toLowerCase() : "todos"}-${today()}.csv`, [["Fecha","Programa","Cliente que refirió","Nombre","Teléfono","Regalo","De dónde","Socio","Estado","Notas"],
      ...l.map(([,x]) => [fmt(x.at||Date.now(),{year:"numeric",month:"2-digit",day:"2-digit"}), `${progName(x.pid)} de ${x.ref||""}`, x.ref||"", x.name||"", telFmt(x.tel), x.prize||"", x.kind==="hoja"?"Hoja de referidos":"Jugó la ruleta", memberName(x.socioId), JG_ST[x.status]||x.status||"", x.notes||""])]);
    toast("Descargado. Ábrelo y pégalo en la hoja del Drive"); };
  on("[data-lead]", b => b.onclick = () => openLead(b.dataset.lead));
  on("[data-share]", b => b.onclick = () => openShare(b.dataset.share));
  on("[data-avance]", b => b.onclick = () => openAvance(b.dataset.avance));
  if (window.bindAnuncios) bindAnuncios(m);
  on("[data-lgrp]", b => b.onclick = () => { S.f.lgrp = b.dataset.lgrp; render(); });
  on("[data-editlink]", b => b.onclick = () => openEditLink(b.dataset.editlink));
  on("[data-jdel]", b => b.onclick = async function(){ const code = this.dataset.jdel, j = S.juegos[code] || {};
    if (!this.dataset.sure){ this.dataset.sure = "1"; this.textContent = "¿Borrar?"; this.classList.add("danger"); setTimeout(() => { if (this.isConnected){ delete this.dataset.sure; this.textContent = "🗑️"; this.classList.remove("danger"); } }, 4000); return; }
    try { const ids = Object.keys(S.leads).filter(k => S.leads[k].code===code || k===code+"_ref"); for (const k of ids){ await S.db.doc("leads/"+k).delete().catch(() => {}); delete S.leads[k]; }
      await S.db.doc("juegos/"+code).delete(); delete S.juegos[code]; toast(`Link de ${firstName(j.ref)} borrado`); render(); } catch(e){ writeErr(e); } });
  syncAvance();
  on("[data-prog]", b => b.onclick = () => openPrograma(b.dataset.prog));
  on("[data-pcopy]", b => b.onclick = () => openPrograma(null, b.dataset.pcopy));
}

/* Foto del regalo: cuadrada y liviana para que quepa en la base de datos gratis */
async function fotoChica(file, sz=300){ const url = URL.createObjectURL(file); try { const img = await loadImg(url); const c = document.createElement("canvas"); c.width = c.height = sz; const x = c.getContext("2d"); const s = Math.min(img.width, img.height);
  x.fillStyle = "#fff"; x.fillRect(0,0,sz,sz); x.drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, sz, sz); return c.toDataURL("image/jpeg", 0.72); } finally { URL.revokeObjectURL(url); } }

function openPrograma(pid, copia){
  const P = pid ? JSON.parse(JSON.stringify(S.programs[pid])) : copia ? {...JSON.parse(JSON.stringify(S.programs[copia])), name:(S.programs[copia].name||"")+" (mío)", createdAt:0, owner:""} : {name:"", tema:"oro", textos:{}, tipo:"ruleta", prizes:[{n:"",w:25,img:""},{n:"",w:25,img:""},{n:"",w:25,img:""},{n:"",w:25,img:""}], meta:{refs:14, cada:4}, dias:7, msg:""};
  const rowsHtml = () => P.prizes.map((p,i)=>`<div class="row" style="flex-wrap:nowrap;gap:8px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:8px">
      <label style="cursor:pointer;flex:none">${p.img?`<img src="${p.img}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;display:block">`:`<span style="width:56px;height:56px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-size:12px;text-align:center;font-weight:700;color:var(--muted)">📷<br>Foto</span>`}<input type="file" accept="image/*" data-pimg="${i}" hidden></label>
      <input class="i" data-pn="${i}" value="${esc(p.n)}" placeholder="Regalo ${i+1}" style="flex:1;min-width:0">
      <label class="note" style="display:flex;align-items:center;gap:3px;flex:none"><input class="i" type="number" min="0" max="100" data-pw="${i}" value="${p.w}" style="width:64px;padding:8px 6px">%</label>
      <button class="btn small ghost" data-pdel="${i}" aria-label="Quitar" style="flex:none">✕</button></div>`).join("");
  const tot = () => P.prizes.reduce((t,p)=>t+(+p.w||0),0); const minReg = () => P.tipo==="puzzle" ? 1 : 2;
  openModal(`<h3>${pid?"Editar programa":"Nuevo programa"}</h3>
    <label class="f">Nombre del programa<input class="i" id="pg-name" value="${esc(P.name)}" placeholder="Ej.: Ruleta 4 en 14"></label>
    <div><div class="eyebrow" style="margin-bottom:6px">Tipo de juego</div><div class="opts">${Object.entries(TIPOS_JG).map(([k,t])=>`<button class="opt ${(P.tipo||"ruleta")===k?"on":""}" data-ptipo="${k}">${t.e} ${t.n}</button>`).join("")}</div><p class="note" id="pg-td" style="margin:4px 0 0">${esc(TI(P.tipo).d)}</p></div>
    <div id="pg-precio" ${P.tipo==="precio"?"":"hidden"} style="border:1px solid var(--line);border-radius:12px;padding:10px"><div class="eyebrow" style="margin-bottom:6px">💲 Producto para adivinar</div><div class="grid2"><label class="f">Nombre del producto<input class="i" id="pg-pn" value="${esc(P.precio?.n||"")}" placeholder="Ej.: Extractor de jugos" maxlength="60"></label><label class="f">Precio real (USD)<input class="i" type="number" min="5" id="pg-pv" value="${P.precio?.v||""}" placeholder="Ej.: 899"></label></div><label class="note" style="cursor:pointer;display:flex;gap:8px;align-items:center"><span id="pg-pimg">${P.precio?.img?`<img src="${P.precio.img}" style="width:48px;height:48px;border-radius:10px;object-fit:cover">`:"📷"}</span> Foto del producto (opcional)<input type="file" accept="image/*" id="pg-pfile" hidden></label><p class="note" style="margin:4px 0 0">Se muestran 3 precios: el real y dos falsos. Acierte o no, igual raspa y gana su regalo.</p></div>
    <div id="pg-pz" ${P.tipo==="puzzle"?"":"hidden"} style="border:1px solid var(--line);border-radius:12px;padding:10px"><label class="f">🧩 Segundos para armar el rompecabezas<input class="i" type="number" min="20" max="180" id="pg-seg" value="${P.seg||60}"></label><p class="note" style="margin:4px 0 0">El rompecabezas es la foto del regalo que le toca (por eso conviene ponerle foto a cada regalo). Si se le acaba el tiempo, lo puede volver a intentar.</p></div>
    <div id="pg-quiz" ${P.tipo==="quiz"?"":"hidden"} style="border:1px solid var(--line);border-radius:12px;padding:10px"><div class="eyebrow" style="margin-bottom:6px">📝 Preguntas del test</div><ol class="note" style="margin:0;padding-left:18px">${QUIZ.map(x=>`<li>${esc(x.q)}</li>`).join("")}</ol><p class="note" style="margin:6px 0 0">Al final le sale su nivel (🟢 verde, 🟡 amarillo o 🔴 rojo) con un consejo, raspa su regalo y el resultado te llega en el prospecto.</p></div>
    <div><div class="eyebrow" style="margin-bottom:6px">Regalos · toca el círculo para poner la foto</div><div id="pg-rows" style="display:grid;gap:8px">${rowsHtml()}</div>
      <div class="row" style="margin-top:8px;justify-content:space-between"><button class="btn small ghost" id="pg-add">+ Agregar regalo</button><span class="note" id="pg-tot"></span></div>
      <p class="note" style="margin:4px 0 0">Pon 0% al regalo que quieres que se vea pero que nunca salga.</p></div>
    <label class="f">Cada regalo se gana por<select class="i" id="pg-cuenta"><option value="visitas" ${P.meta.cuenta!=="amigas"?"selected":""}>Visitas hechas a sus referidos (demostración)</option><option value="amigas" ${P.meta.cuenta==="amigas"?"selected":""}>Amigas que juegan</option></select></label>
    <div class="grid2"><label class="f">Meta de referidos<input class="i" type="number" min="1" id="pg-refs" value="${P.meta.refs}"></label><label class="f">Un regalo cada<input class="i" type="number" min="1" id="pg-cada" value="${P.meta.cada}"></label><label class="f">Días que dura cada link<input class="i" type="number" min="0" max="60" id="pg-dias" value="${P.dias===0?0:(P.dias||7)}"><span class="note">0 = sin vencimiento (ilimitado)</span></label></div>
    <label class="f">Mensaje que el cliente manda a sus amigas ({link} es donde va el link)<textarea class="i" id="pg-msg" style="min-height:160px">${esc(P.msg || defMsg(P.tipo))}</textarea></label>
    <div><div class="eyebrow" style="margin-bottom:6px">Diseño</div>
      <div class="opts">${Object.entries(TEMAS).map(([k,t])=>`<button class="opt ${(P.tema||"oro")===k?"on":""}" data-tema="${k}" style="display:flex;gap:8px;align-items:center"><span style="width:28px;height:28px;border-radius:50%;flex:none;background:linear-gradient(135deg,${t.g[0]},${t.g[1]} 50%,${t.bg[2]});border:2px solid ${t.ink}"></span>${t.n}</button>`).join("")}</div></div>
    <div><div class="eyebrow" style="margin-bottom:6px">Fondo</div><div class="opts" id="pg-fondos"></div><input type="file" accept="image/*" id="pg-ffile" hidden></div>
    <div class="grid2">${[["top","Texto de arriba"],["pill","Debajo del nombre"],["sub","Frase de invitación"],["btn","Botón"]].map(([k,l])=>`<label class="f">${l}<input class="i" data-tx="${k}" value="${esc((P.textos||{})[k]||TXT_DEF(P.tipo)[k]||"")}" maxlength="60"></label>`).join("")}</div>
    <div class="row"><button class="btn small" id="pg-try" type="button">▶️ Probar el juego</button><button class="btn small ghost" id="pg-prev" type="button">🖼️ Ver la imagen con QR</button></div><div id="pg-pv"></div>
    <label class="f">⏰ Cuenta regresiva para reservar el regalo<select class="i" id="pg-reloj">${[[0,"Sin cuenta regresiva"],[24,"24 horas"],[48,"48 horas"],[72,"72 horas"]].map(([v,l])=>`<option value="${v}" ${(+P.reloj||0)===v?"selected":""}>${l}</option>`).join("")}</select><span class="note">Al ganar, le sale un reloj: si no deja sus datos a tiempo, pierde el regalo. Hace que respondan más rápido.</span></label>
    <label class="note" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pg-otra" ${P.otraVez!==false?"checked":""}> 🔄 Otra oportunidad: el primer intento no gana (ruleta: casilla "¡Otra vez!"; caja: sale vacía; rasca: "sigue participando"; tiro: el pajarito esquiva) y en el segundo sí gana</label>
    <label class="note" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pg-mus" ${P.musica!==false?"checked":""}> Música alegre en el juego (la persona la puede apagar)</label>
    ${pid?`<label class="note" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pg-act" ${P.activo!==false?"checked":""}> Programa activo (se puede usar para inscribir clientes)</label>`:""}
    <div class="row"><button class="btn" id="pg-save">Guardar programa</button><button class="btn ghost" data-close>Cancelar</button></div>`, bind);
  function bind(){
    const q = id => document.getElementById(id);
    const paint = () => { q("pg-rows").innerHTML = rowsHtml(); const t = tot(); q("pg-tot").innerHTML = `Total: <b>${t}%</b>${t!==100?" (se ajusta solo)":""}`; binds(); };
    function binds(){
      document.querySelectorAll("[data-pn]").forEach(x => x.oninput = () => { P.prizes[+x.dataset.pn].n = x.value; });
      document.querySelectorAll("[data-pw]").forEach(x => x.oninput = () => { P.prizes[+x.dataset.pw].w = Math.max(0, +x.value||0); const t = tot(); q("pg-tot").innerHTML = `Total: <b>${t}%</b>${t!==100?" (se ajusta solo)":""}`; });
      document.querySelectorAll("[data-pdel]").forEach(x => x.onclick = () => { if (P.prizes.length <= minReg()){ toast(minReg()===1 ? "Deja al menos 1 regalo" : "Deja al menos 2 regalos (en el rompecabezas puede ser 1)"); return; } P.prizes.splice(+x.dataset.pdel, 1); paint(); });
      document.querySelectorAll("[data-pimg]").forEach(x => x.onchange = async () => { const f = x.files[0]; if (!f) return; try { P.prizes[+x.dataset.pimg].img = await fotoChica(f); paint(); } catch { toast("No se pudo leer esa foto"); } });
    }
    paint();
    document.querySelectorAll("[data-tema]").forEach(b => b.onclick = () => { P.tema = b.dataset.tema; document.querySelectorAll("[data-tema]").forEach(x => x.classList.toggle("on", x===b)); });
    const paintF = () => { const f = P.fondo || ""; q("pg-fondos").innerHTML = [["colores","Solo colores"],["cocina","Cocina Royal"],["foto","📷 Subir mi foto"]].map(([k,l]) => `<button class="opt ${(k==="foto" ? /^data:/.test(f) : k==="cocina" ? (!f || f==="cocina") : f===k) ? "on" : ""}" data-fondo="${k}" type="button" style="display:flex;gap:8px;align-items:center">${k==="cocina"?`<img src="fondo-cocina.jpg?v=2" style="width:34px;height:34px;border-radius:8px;object-fit:cover">`:k==="foto"&&/^data:/.test(f)?`<img src="${f}" style="width:34px;height:34px;border-radius:8px;object-fit:cover">`:""}${l}</button>`).join("");
      document.querySelectorAll("[data-fondo]").forEach(b => b.onclick = () => { const k = b.dataset.fondo; if (k==="foto") q("pg-ffile").click(); else { P.fondo = k; paintF(); } }); };
    paintF();
    q("pg-ffile").onchange = async () => { const f = q("pg-ffile").files[0]; if (!f) return; try { const url = URL.createObjectURL(f); const img = await loadImg(url); URL.revokeObjectURL(url); const k = Math.min(1, 900/Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); P.fondo = c.toDataURL("image/jpeg", 0.7); paintF(); } catch { toast("No se pudo leer esa foto"); } };
    const readTx = () => { const t = {}; document.querySelectorAll("[data-tx]").forEach(i => { const v = i.value.trim(); if (v && v !== (TXT_DEF(P.tipo)[i.dataset.tx]||"")) t[i.dataset.tx] = v.slice(0,60); }); return t; };
    q("pg-prev").onclick = async () => { q("pg-prev").disabled = true; try { const bl = await promoImg({ref:"Amada Segura"}, {...P, textos:readTx(), prizes:P.prizes.filter(x=>x.n)}, APP_URL+"?j=EJEMPLO1"); q("pg-pv").innerHTML = `<img src="${URL.createObjectURL(bl)}" style="width:100%;border-radius:12px;margin-top:6px">`; } catch(e){ console.log(e); toast("No se pudo crear la vista previa"); } q("pg-prev").disabled = false; };
    q("pg-try").onclick = () => { const pr = P.prizes.map(p => ({n:(p.n||"").trim(), w:Math.max(0,+p.w||0), img:p.img||""})).filter(p => p.n); if (pr.length < minReg()){ toast("Pon al menos "+minReg()+" regalo"+(minReg()>1?"s":"")+" con nombre para probar"); return; }
      const precio = P.tipo==="precio" ? {n:q("pg-pn").value.trim() || "Producto", v:Math.round(+q("pg-pv").value||0) || 100, img:P.precio?.img||""} : null;
      probarJuego({...P, prizes:pr, textos:readTx(), otraVez:q("pg-otra").checked, musica:q("pg-mus").checked, reloj:+q("pg-reloj").value||0, seg:+(q("pg-seg")?.value)||60, ...(precio?{precio}:{})}); };
    q("pg-add").onclick = () => { if (P.prizes.length >= 8){ toast("Máximo 8 regalos"); return; } P.prizes.push({n:"", w:0, img:""}); paint(); };
    q("pg-pfile").onchange = async () => { const f = q("pg-pfile").files[0]; if (!f) return; try { P.precio = {...(P.precio||{}), img: await fotoChica(f)}; q("pg-pimg").innerHTML = `<img src="${P.precio.img}" style="width:48px;height:48px;border-radius:10px;object-fit:cover">`; } catch { toast("No se pudo leer esa foto"); } };
    document.querySelectorAll("[data-ptipo]").forEach(b => b.onclick = () => { const old = P.tipo; P.tipo = b.dataset.ptipo; document.querySelectorAll("[data-ptipo]").forEach(x => x.classList.toggle("on", x===b)); q("pg-td").textContent = TI(P.tipo).d; q("pg-precio").hidden = P.tipo!=="precio"; q("pg-quiz").hidden = P.tipo!=="quiz"; q("pg-pz").hidden = P.tipo!=="puzzle"; if (q("pg-msg").value === defMsg(old)) q("pg-msg").value = defMsg(P.tipo);
      document.querySelectorAll("[data-tx]").forEach(i => { const k = i.dataset.tx; if (!i.value.trim() || i.value.trim() === (TXT_DEF(old)[k]||"")) i.value = TXT_DEF(P.tipo)[k] || ""; }); });
    q("pg-save").onclick = async () => {
      P.name = q("pg-name").value.trim(); const prizes = P.prizes.map(p => ({n:p.n.trim().slice(0,40), w:Math.max(0,+p.w||0), img:p.img||""})).filter(p => p.n);
      if (!P.name){ toast("Ponle un nombre al programa"); return; } if (prizes.length < minReg()){ toast(minReg()===1 ? "Pon al menos 1 regalo con nombre" : "Pon al menos 2 regalos con nombre (en el rompecabezas puede ser 1)"); return; }
      if (!prizes.some(p => p.w > 0)) prizes.forEach(p => p.w = 1);
      const msg = q("pg-msg").value.trim(); if (!msg.includes("{link}")){ toast("El mensaje necesita {link} para poner el link"); return; }
      const precio = P.tipo==="precio" ? {n:q("pg-pn").value.trim().slice(0,60), v:Math.round(+q("pg-pv").value||0), img:P.precio?.img||""} : null;
      if (precio && (!precio.n || precio.v < 5)){ toast("Pon el nombre y el precio real del producto"); return; }
      const doc = {name:P.name.slice(0,60), tipo:P.tipo, prizes, meta:{refs:Math.max(1,+q("pg-refs").value||14), cada:Math.max(1,+q("pg-cada").value||4), cuenta:q("pg-cuenta").value}, dias:(q("pg-dias").value.trim()==="0" ? 0 : Math.min(60,Math.max(1,+q("pg-dias").value||7))), msg, owner:pid ? P.owner : S.uid, activo: pid ? q("pg-act").checked : true, musica: q("pg-mus").checked, tema: P.tema || "oro", textos: readTx(), fondo: P.fondo || "", reloj: +q("pg-reloj").value || 0, otraVez: q("pg-otra").checked, ...(P.tipo==="puzzle" ? {seg: Math.min(180, Math.max(20, +q("pg-seg").value || 60))} : {}), ...(precio ? {precio} : {}), createdAt:P.createdAt||Date.now(), updatedAt:Date.now()};
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
  return {pid, socioId:sid, up: sm.upline || "", tv: S.members[pagadorDe(sid)]?.role==="admin", by:S.uid, n:0, until: p.dias===0 ? 0 : Date.now() + (p.dias||7)*864e5, createdAt:Date.now(), meta:p.meta||{refs:14,cada:4}}; }
function progSel(id){ const l = misProgramas(); return `<label class="f">Programa<select class="i" id="${id}">${l.map(([pid,p])=>`<option value="${pid}">${TI(p.tipo).e} ${esc(p.name)}${p.owner!==S.uid?(esDir(p.owner)?" · Lunaya (listo para usar)":" · de "+esc(firstName(memberName(p.owner)))):""}</option>`).join("")}</select></label>`; }

/* Regalos por los que participa cada cliente: uno por cada nivel (ej.: a las 4, 8 y 12 visitas) */
const nivelesDe = meta => { const m = {refs:14, cada:4, ...(meta||{})}; return Math.max(1, Math.floor(m.refs/m.cada)); };
const regaloDe = (j, i) => String((j?.regalos||[])[i]||"").trim();
const regalosVacios = j => !(j?.regalos||[]).some(x => String(x||"").trim());
function regalosHtml(pre, meta, vals, pid){ const m = {refs:14, cada:4, ...(meta||{})}; const n = nivelesDe(m); const P = S.programs?.[pid] || {};
  return `<div class="f"><span>¿Por qué regalo participa? <span class="note">(opcional)</span></span><datalist id="${pre}-dl">${(P.prizes||[]).map(x => `<option value="${esc(x.n)}">`).join("")}</datalist>
    <div class="grid2">${[...Array(n)].map((_,i) => `<label class="f" style="font-weight:600">Regalo ${n>1?i+1:""} · a las ${(i+1)*m.cada} ${m.cuenta==="amigas"?"amigas":"visitas"}<input class="i" data-rg="${pre}" list="${pre}-dl" value="${esc((vals||[])[i]||"")}" placeholder="Ej.: Tazón" autocomplete="off"></label>`).join("")}</div></div>`; }
const leerRegalos = pre => [...document.querySelectorAll(`[data-rg="${pre}"]`)].map(x => x.value.trim().slice(0,60));
function openInscribir(){
  if (!misProgramas().length){ toast("Primero crea un programa"); openPrograma(); return; }
  openModal(`<h3>Inscribir cliente</h3><p class="note" style="margin:0">El cliente le manda el link a sus amigas. Ellas giran, ganan y te llegan como prospectos.</p>
    ${progSel("in-p")}${juegoSel("in-j")}
    <label class="f">Para el socio<select class="i" id="in-s">${socioOpts(S.world && role()==="tele" ? S.world : S.uid)}</select></label>
    <div class="grid2"><label class="f">Nombre del cliente<input class="i" id="in-n" placeholder="Ej.: Amada Segura" autocomplete="off"></label><label class="f">Su teléfono<input class="i" id="in-t" inputmode="tel" autocomplete="off"></label></div>
    <div id="in-h"></div>
    <div id="in-rgw"></div>
    <div class="row"><button class="btn" id="in-ok">Crear link</button><button class="btn ghost" data-close>Cancelar</button></div>`, () => {
    const q = id => document.getElementById(id);
    bindJuegoSel("in-j", "in-p");
    const rg = () => { const pid = q("in-p").value; const vals = leerRegalos("in"); q("in-rgw").innerHTML = regalosHtml("in", S.programs?.[pid]?.meta, vals, pid); }; rg(); q("in-p").addEventListener("change", rg);
    q("in-t").onchange = async () => { const h = await getHistAny(q("in-s").value, q("in-t").value); q("in-h").innerHTML = histHtml(h); if (h && h.name && !q("in-n").value.trim()) q("in-n").value = h.name; };
    q("in-ok").onclick = async () => { const name = q("in-n").value.trim(), t = telOk(q("in-t").value), pid = q("in-p").value, sid = q("in-s").value;
      if (!name){ toast("Escribe el nombre del cliente"); return; } if (q("in-t").value.trim() && !t){ toast("El teléfono debe tener 10 dígitos"); return; }
      q("in-ok").disabled = true; const code = newCode() + newCode().slice(0,2); const base = juegoBase(sid, pid);
      try { const bt = S.db.batch(); const regalos = leerRegalos("in"); const tj = q("in-j").value; bt.set(S.db.doc("juegos/"+code), {...base, ref:name.slice(0,60), kind:"cliente", tipo:tj, ...(regalos.some(Boolean)?{regalos}:{})});
        bt.set(S.db.doc("leads/"+code+"_ref"), {code, pid, name:name.slice(0,60), tel:t||"", kind:"ref", status:"ref", socioId:sid, up:base.up, tv:base.tv, by:S.uid, ref:name.slice(0,60), at:Date.now()}); await bt.commit();
        S.juegos[code] = {...base, ref:name, kind:"cliente", regalos, tipo:tj}; S.leads[code+"_ref"] = {name, tel:t, kind:"ref"}; closeModal(); openShare(code); } catch(e){ q("in-ok").disabled = false; writeErr(e); } };
  });
}

/* Desde una cita: se crea (o se reusa) el link de la ruleta del cliente con su nombre y teléfono, y se abre listo para mandarlo */
const juegoDeCita = apptId => (Object.entries(S.juegos||{}).find(([,j]) => j.cita===apptId) || [])[0];
async function ruletaDeCita(apptId, opt){ const a = S.appts?.[apptId]; if (!a) return; const ya = juegoDeCita(apptId); if (ya){ openShare(ya); return; }
  const pr = misProgramas(); if (!pr.length){ toast("Primero crea un programa"); openPrograma(); return; }
  if (!opt){ openModal(`<h3>Mandarle un juego a ${esc(a.client||"el cliente")}</h3>${progSel("rc-p")}${juegoSel("rc-j")}<div class="row"><button class="btn" id="rc-ok">Crear link</button><button class="btn ghost" data-close>Cancelar</button></div>`, () => {
      bindJuegoSel("rc-j", "rc-p"); document.getElementById("rc-ok").onclick = () => ruletaDeCita(apptId, {pid:document.getElementById("rc-p").value, tipo:document.getElementById("rc-j").value}); }); return; }
  const pid = opt.pid || pr[0][0], sid = a.socioId, name = String(a.client||"Cliente").trim().slice(0,60), t = telOk(a.phone) || "";
  const code = newCode() + newCode().slice(0,2); const base = juegoBase(sid, pid);
  try { const bt = S.db.batch(); bt.set(S.db.doc("juegos/"+code), {...base, ref:name, kind:"cliente", cita:apptId, tipo:opt.tipo||""});
    bt.set(S.db.doc("leads/"+code+"_ref"), {code, pid, name, tel:t, kind:"ref", status:"ref", socioId:sid, up:base.up, tv:base.tv, by:S.uid, ref:name, at:Date.now()}); await bt.commit();
    S.juegos[code] = {...base, ref:name, kind:"cliente", cita:apptId, tipo:opt.tipo||""}; S.leads[code+"_ref"] = {name, tel:t, kind:"ref"}; closeModal(); openShare(code); } catch(e){ writeErr(e); } }
window.ruletaDeCita = ruletaDeCita; window.juegoDeCita = juegoDeCita;
/* Editar los datos de un link: nombre real, nombre que sale en la ruleta y la imagen, teléfono, dirección, notas y vigencia */
function openEditLink(code){ const j = S.juegos[code]; if (!j) return; const R = S.leads[code+"_ref"] || {}; const hasta = j.until ? new Date(j.until).toISOString().slice(0,10) : "";
  openModal(`<h3>Editar link de ${esc(j.ref||"")}</h3>
    <div class="grid2"><label class="f">Nombre del cliente (el real, lo ven ustedes)<input class="i" id="el-n" value="${esc(j.ref||"")}" autocomplete="off"></label>
      <label class="f">Teléfono<input class="i" id="el-t" value="${esc(telFmt(R.tel||""))}" inputmode="tel" autocomplete="off"></label>
      <label class="f">Dirección<input class="i" id="el-d" value="${esc(R.dir||"")}" autocomplete="off"></label>
      <label class="f">Ciudad<input class="i" id="el-c" value="${esc(R.ciudad||"")}" autocomplete="off"></label></div>
    <label class="f">Nombre que sale en la ruleta y en la imagen<input class="i" id="el-a" value="${esc(j.alias||"")}" placeholder="${esc(j.ref||"")}" autocomplete="off"><span class="note">Vacío = sale el nombre del cliente. Si no quiere que salga, escribe otro o marca la casilla.</span></label>
    <label class="note" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="el-o" ${j.alias==="Tu amiga"?"checked":""}> No mostrar su nombre (sale "Tu amiga")</label>
    ${j.kind!=="campana" ? regalosHtml("el", j.meta || S.programs?.[j.pid]?.meta, j.regalos, j.pid) : ""}
    <label class="f">Notas<textarea class="i" id="el-no">${esc(R.notas||"")}</textarea></label>
    ${j.kind!=="amiga" ? `<label class="f">Válido hasta<input class="i" type="date" id="el-u" value="${hasta}" max="${new Date(Date.now()+60*864e5).toISOString().slice(0,10)}" ${j.until?"":"disabled"}></label>
    <label class="note" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="el-ui" ${j.until?"":"checked"}> Sin vencimiento (ilimitado)</label>` : ""}
    <div class="row"><button class="btn" id="el-s">Guardar</button><button class="btn ghost" data-close>Cancelar</button></div>`, () => {
    const q = x => document.getElementById(x);
    if (q("el-ui")) q("el-ui").onchange = () => { q("el-u").disabled = q("el-ui").checked; if (!q("el-ui").checked && !q("el-u").value) q("el-u").value = new Date(Date.now()+30*864e5).toISOString().slice(0,10); };
    q("el-o").onchange = () => { if (q("el-o").checked) q("el-a").value = "Tu amiga"; else if (q("el-a").value==="Tu amiga") q("el-a").value = ""; };
    q("el-s").onclick = async () => { const nm = q("el-n").value.trim().slice(0,60), tv = q("el-t").value.trim(), t = telOk(tv);
      if (nm.length < 2){ toast("Escribe el nombre"); return; } if (tv && !t){ toast("El teléfono debe tener 10 dígitos"); return; }
      const al = q("el-o").checked ? "Tu amiga" : q("el-a").value.trim().slice(0,60); const o = {ref:nm, alias:al}; if (j.kind!=="campana") o.regalos = leerRegalos("el");
      if (q("el-ui") && q("el-ui").checked){ if (j.until) o.until = 0; }
      else if (q("el-u") && q("el-u").value){ const u = new Date(q("el-u").value+"T23:59:00").getTime(); if (u !== j.until) o.until = u; }
      q("el-s").disabled = true;
      try { await S.db.doc("juegos/"+code).update(o); Object.assign(j, o);
        const lr = {name:nm, ref:nm, tel:t||"", dir:q("el-d").value.trim().slice(0,120), ciudad:q("el-c").value.trim().slice(0,60), notas:q("el-no").value.trim().slice(0,500)};
        const ex = !!S.leads[code+"_ref"];
        await (ex ? S.db.doc("leads/"+code+"_ref").update(lr) : S.db.doc("leads/"+code+"_ref").set({code, pid:j.pid, kind:"ref", status:"ref", socioId:j.socioId, up:j.up||"", tv:!!j.tv, by:j.by, at:Date.now(), ...lr}))
          .then(() => { S.leads[code+"_ref"] = {...(S.leads[code+"_ref"]||{kind:"ref"}), ...lr}; }).catch(e => { console.log("ref", e); toast("El nombre se guardó; el teléfono y la dirección no (pega las reglas nuevas)"); });
        toast("Guardado"); closeModal(); render(); } catch(e){ q("el-s").disabled = false; writeErr(e); } };
  }); }
/* Avance del cliente: cuántas amigas, cuántas visitas, regalos ganados y mensaje listo para mandarle */
function openAvance(code){ const j = S.juegos[code]; if (!j) return; const a = avanceDe(code); const cli = S.leads[code+"_ref"] || {}; const tel = telOk(cli.tel);
  const ls = refsDe(code).map(([id,l]) => ({...l, _id:id})).sort((x,y)=>(y.at||0)-(x.at||0)); const R = S.leads[code+"_ref"] || {};
  openModal(`<h3>Avance de ${esc(j.ref)}</h3>
    <button class="btn small ghost" id="av-ed" style="justify-self:start">✏️ Editar datos del link</button>
    <div class="tiles"><div class="tile"><b>${ls.length}</b><span>Referidos</span><small>${a.amigas} jugaron la ruleta</small></div><div class="tile"><b>${a.visitas}</b><span>Visitas hechas</span></div><div class="tile acc"><b>${a.ganados}</b><span>Regalos ganados</span><small>de ${a.max} · uno cada ${a.m.cada} ${a.m.cuenta==="amigas"?"amigas":"visitas"}</small></div></div>
    ${regalosVacios(j) ? `<button class="btn small ghost" id="av-rg" style="justify-self:start">🎁 Poner por qué regalo participa</button>` : `<div class="list">${[...Array(a.max)].map((_,i) => regaloDe(j,i) ? `<div class="item ${i<a.ganados?"":""}" style="cursor:default;padding:8px 12px"><span>${i<a.ganados?"✅":"🎁"} <b>${esc(regaloDe(j,i))}</b> <span class="note">a las ${(i+1)*a.m.cada} ${a.m.cuenta==="amigas"?"amigas":"visitas"}</span></span><span class="note">${i<a.ganados?"ganado":i===a.ganados?`le faltan ${a.falta}`:""}</span></div>` : "").join("")}</div>`}
    ${a.falta?`<p class="note" style="margin:0">Le faltan <b>${a.falta}</b> ${a.m.cuenta==="amigas"?"amigas":"visitas"} para el ${a.ganados?"siguiente ":""}regalo.</p>`:`<div class="banner good">🏆 Llegó a la meta.</div>`}
    <div class="eyebrow">Referidos de ${esc(firstName(j.ref))}</div>
    ${ls.length?`<div class="list">${ls.map(l => { const ap = l.apptId && S.appts?.[l.apptId]; const t = telOk(l.tel); return `<div class="item" style="cursor:default"><div style="min-width:0"><div class="t">${esc(l.name||"Sin nombre")} <span class="note">${l.kind==="jugador"?"🎡 jugó":"📋 hoja"}</span></div><div class="m">${telFmt(l.tel)} · ${ap ? (ap.status==="hecha" ? "✅ Visita hecha" : ap.status==="agendada" ? "📅 Cita "+fmtWhen(ap.when) : APPT_ST[ap.status]||ap.status) : (JG_ST[l.status]||l.status)}${l.enviado?" · mensaje enviado":""}</div></div>${t && l.kind==="hoja" && !ap ? `<a class="btn small ${l.enviado?"ghost":""}" target="_blank" rel="noopener" data-envia="${l._id}" href="https://wa.me/1${t}?text=${encodeURIComponent(msgReferido(code, l.name))}">${l.enviado?"Reenviar":"Mandar ruleta"}</a>` : ""}</div>`; }).join("")}</div>`:`<div class="empty">Todavía no hay referidos. Agrégalos de la hoja aquí abajo.</div>`}
    <details ${ls.length?"":"open"}><summary class="btn small ghost" style="display:inline-flex">📋 Agregar contactos de la hoja</summary>
      <label class="f" style="margin-top:8px">Uno por línea: nombre y teléfono<textarea class="i" id="av-hoja" style="min-height:120px" placeholder="Rosa Linares 619 555 1234&#10;Claudia (858) 555-9876"></textarea></label>
      <div class="row" style="margin-top:6px"><button class="btn small" id="av-add">Agregar a ${esc(firstName(j.ref))}</button><label class="btn small ghost" style="cursor:pointer">📷 ${R.foto?"Cambiar foto de la hoja":"Subir foto de la hoja"}<input type="file" accept="image/*" id="av-foto" hidden></label></div>
      ${R.foto?`<a href="${R.foto}" target="_blank" rel="noopener"><img src="${R.foto}" alt="Hoja de referidos" style="width:100%;border-radius:10px;margin-top:8px;border:1px solid var(--line)"></a><p class="note" style="margin:4px 0 0">La telemarketer puede pasar los contactos de la foto a la lista de arriba.</p>`:""}</details>
    <p class="note" style="margin:0">Cuenta como visita cuando la cita de esa amiga se agenda desde Ruleta y se marca “Demostración hecha”.</p>
    <label class="f">Mensaje para ${esc(firstName(j.ref))}<textarea class="i" id="av-m" style="min-height:150px">${esc(msgAvance(code))}</textarea></label>
    <div class="row"><a class="btn" id="av-wa" target="_blank" rel="noopener">WhatsApp${tel?" a "+esc(firstName(j.ref)):""}</a><a class="btn dark" id="av-sms">Mensaje de texto</a><button class="btn ghost" data-close>Cerrar</button></div>
    ${j.by===S.uid || j.socioId===S.uid ? `<button class="btn small ghost" id="av-del" style="justify-self:start">🗑️ Borrar este link y sus prospectos</button>` : ""}`, () => {
    const q = x => document.getElementById(x);
    q("av-ed").onclick = () => openEditLink(code); if (q("av-rg")) q("av-rg").onclick = () => openEditLink(code);
    const upd = () => { const t = q("av-m").value; q("av-wa").href = `https://wa.me/${tel?"1"+tel:""}?text=${encodeURIComponent(t)}`; q("av-sms").href = `sms:${tel?"+1"+tel:""}&body=${encodeURIComponent(t)}`; }; upd(); q("av-m").oninput = upd;
    const marcar = () => { if (a.ganados > (j.avisados||0)){ j.avisados = a.ganados; S.db.doc("juegos/"+code).update({avisados:a.ganados}).catch(e => console.log(e)); setTimeout(render, 300); } };
    q("av-wa").addEventListener("click", marcar); q("av-sms").addEventListener("click", marcar);
    document.querySelectorAll("[data-envia]").forEach(x => x.addEventListener("click", () => { S.db.doc("leads/"+x.dataset.envia).update({enviado:Date.now()}).catch(e => console.log(e)); setTimeout(() => openAvance(code), 800); }));
    if (q("av-del")) q("av-del").onclick = async function(){ if (!this.dataset.sure){ this.dataset.sure = "1"; this.textContent = "Toca otra vez: se borra el link de "+firstName(j.ref)+" y sus "+ls.length+" referido(s)"; this.classList.add("danger"); return; }
      try { const ids = Object.keys(S.leads).filter(k => S.leads[k].code===code || k===code+"_ref"); for (const k of ids){ await S.db.doc("leads/"+k).delete().catch(() => {}); delete S.leads[k]; }
        await S.db.doc("juegos/"+code).delete(); delete S.juegos[code]; closeModal(); toast("Link borrado"); render(); } catch(e){ writeErr(e); } };
    q("av-add").onclick = async () => { const nuevos = []; const ya = new Set(refsDe(code).map(([,l]) => l.tel));
      q("av-hoja").value.split(/\n+/).map(x => x.trim()).filter(Boolean).forEach(line => { const t = telOk((line.match(/[\d\s().+-]{10,}/)||[""])[0]) || telOk(line.replace(/[^\d]/g,"")); const nm = line.replace(/[\d().+-]/g,"").replace(/[,;:]+/g," ").replace(/\s+/g," ").trim();
        if (t && !ya.has(t) && !nuevos.some(x => x.tel===t)) nuevos.push({tel:t, name:nm.slice(0,60)}); });
      if (!nuevos.length){ toast("No encontré teléfonos nuevos de 10 dígitos"); return; } q("av-add").disabled = true;
      try { const bt = S.db.batch(); nuevos.forEach(x => bt.set(S.db.doc(`leads/${code}_h_${x.tel}`), {code, pid:j.pid, name:x.name, tel:x.tel, kind:"hoja", status:"nuevo", socioId:j.socioId, up:j.up||"", tv:!!j.tv, by:j.by, ref:j.ref||"", at:Date.now(), addedBy:S.uid})); await bt.commit();
        nuevos.forEach(x => S.leads[`${code}_h_${x.tel}`] = {code, pid:j.pid, name:x.name, tel:x.tel, kind:"hoja", status:"nuevo", socioId:j.socioId, ref:j.ref, at:Date.now()}); const rep = nuevos.filter(x => Object.values(S.leads).some(y => esProsp(y) && y.tel===x.tel && y.code!==code)).length;
        toast(`${nuevos.length} referido(s) agregados a ${firstName(j.ref)}${rep?` · ${rep} ya estaba(n) en otro programa`:""}`); openAvance(code); } catch(e){ q("av-add").disabled = false; writeErr(e); } };
    q("av-foto").onchange = async () => { const f = q("av-foto").files[0]; if (!f) return; try { const url = URL.createObjectURL(f); const img = await loadImg(url); URL.revokeObjectURL(url); const k = Math.min(1, 1300/Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const foto = c.toDataURL("image/jpeg", 0.6); await S.db.doc("leads/"+code+"_ref").update({foto}); S.leads[code+"_ref"] = {...R, foto}; toast("Foto de la hoja guardada"); openAvance(code); } catch(e){ writeErr(e); } };
  });
}

/* Mandar el link: al cliente por WhatsApp o texto, imagen con QR, copiar */
function openShare(code){
  const j = S.juegos[code]; if (!j) return; const p = conJuego(S.programs[j.pid] || {}, j); const link = jgLink(code); const cli = S.leads[code+"_ref"] || {};
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

/* Imagen para compartir: estilo crema y dorado, nombre en grande (apellido en letra cursiva), ruleta con fotos y QR */
function fitText(x, txt, max, w, weight, fam){ let f = max; do { x.font = `${weight} ${f}px ${fam}`; f -= 2; } while (x.measureText(txt).width > w && f > 20); return f+2; }
function goldGrad(x, x0, y0, x1, y1){ const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, JGT.g[0]); g.addColorStop(.45, JGT.g[1]); g.addColorStop(.7, JGT.g[2]); g.addColorStop(1, JGT.g[3]); return g; }
function rr(x, X, Y, w, h, r){ x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, r); else x.rect(X, Y, w, h); }
function drawGift(x, X, Y, w){ const k = w/120; x.save(); x.translate(X, Y); x.scale(k, k); x.shadowColor = "rgba(120,90,20,.3)"; x.shadowBlur = 24; x.shadowOffsetY = 10;
  x.fillStyle = "#fffdf7"; x.fillRect(14, 52, 92, 62); x.shadowColor = "transparent"; x.fillStyle = "#ffffff"; x.fillRect(8, 38, 104, 20); x.strokeStyle = "#ead9ad"; x.lineWidth = 1; x.strokeRect(14,52,92,62); x.strokeRect(8,38,104,20);
  const g = goldGrad(x, 0, 0, 120, 120); x.fillStyle = g; x.fillRect(52, 38, 16, 76);
  x.beginPath(); x.moveTo(60,38); x.bezierCurveTo(40,10,14,16,26,32); x.bezierCurveTo(32,40,50,40,60,38); x.moveTo(60,38); x.bezierCurveTo(80,10,106,16,94,32); x.bezierCurveTo(88,40,70,40,60,38); x.fill();
  x.strokeStyle = g; x.lineWidth = 7; x.lineCap = "round"; x.beginPath(); x.moveTo(60,38); x.lineTo(44,62); x.moveTo(60,38); x.lineTo(76,62); x.stroke(); x.fillStyle = "#c9971f"; x.beginPath(); x.arc(60,38,7,0,7); x.fill(); x.restore(); }
function drawHeart(x, X, Y, w){ const k = w/60; x.save(); x.translate(X, Y); x.scale(k, k); x.beginPath(); x.moveTo(30,46); x.bezierCurveTo(8,30,2,20,6,11); x.bezierCurveTo(10,2,24,2,30,14); x.bezierCurveTo(36,2,50,2,54,11); x.bezierCurveTo(58,20,52,30,30,46); x.strokeStyle = goldGrad(x,0,0,60,50); x.lineWidth = 3.2; x.stroke(); x.restore(); }
function drawCrown(x, cx, Y, w){ const k = w/40; x.save(); x.translate(cx - w/2, Y); x.scale(k, k); x.fillStyle = goldGrad(x,0,0,40,26); x.beginPath(); x.moveTo(3,22); x.lineTo(1,6); x.lineTo(11,13); x.lineTo(20,2); x.lineTo(29,13); x.lineTo(39,6); x.lineTo(37,22); x.closePath(); x.fill(); rr(x,3,22,34,3,1.5); x.fill(); x.restore(); }
async function promoImg(j, p, link){
  setTema(p.tema); const TX = txtDe(p);
  try { await Promise.all([document.fonts.load('80px "Great Vibes"'), document.fonts.load('700 80px "Source Serif 4"'), document.fonts.load('800 30px Manrope')]); } catch {}
  const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  const SERIF = '"Source Serif 4", Georgia, serif', SANS = "Manrope, system-ui, sans-serif", SCRIPT = '"Great Vibes", cursive';
  const g = x.createRadialGradient(W/2, 0, 80, W/2, H*0.6, 1200); g.addColorStop(0, JGT.bg[0]); g.addColorStop(.6, JGT.bg[1]); g.addColorStop(1, JGT.bg[2]); x.fillStyle = g; x.fillRect(0,0,W,H);
  const fsrc = fondoSrc(p); let fimg = null; if (fsrc) { try { fimg = await loadImg(fsrc); } catch {} }
  if (fimg){ const sc = Math.max(W/fimg.width, H/fimg.height), dw = fimg.width*sc, dh = fimg.height*sc; x.drawImage(fimg, (W-dw)/2, H-dh, dw, dh);
    const vg = x.createLinearGradient(0,0,0,H*.55); vg.addColorStop(0, "rgba(250,245,238,.8)"); vg.addColorStop(1, "rgba(250,245,238,0)"); x.fillStyle = vg; x.fillRect(0,0,W,H*.55); }
  /* luces desenfocadas */
  if (!fimg) for (let i=0;i<26;i++){ const bx = Math.random()*W, by = Math.random()*H, br = 20+Math.random()*60; const rg = x.createRadialGradient(bx,by,0,bx,by,br); rg.addColorStop(0, `rgba(${JGT.glow},.55)`); rg.addColorStop(1, `rgba(${JGT.glow},0)`); x.fillStyle = rg; x.fillRect(bx-br,by-br,2*br,2*br); }
  /* listones dorados */
  if (!fimg){ x.save(); x.lineCap = "round"; x.globalAlpha = .9; x.lineWidth = 22; x.strokeStyle = goldGrad(x,0,0,W,H);
  x.beginPath(); x.moveTo(-60, 820); x.bezierCurveTo(120, 760, 60, 1000, 200, 1050); x.bezierCurveTo(300, 1090, 210, 1250, 330, 1380); x.stroke();
  x.beginPath(); x.moveTo(W+60, 640); x.bezierCurveTo(900, 720, 1060, 860, 940, 960); x.bezierCurveTo(840, 1040, 1000, 1150, 1120, 1120); x.stroke(); x.restore(); }
  /* encabezado */
  x.textAlign = "center"; drawCrown(x, W/2, 46, 54);
  x.strokeStyle = goldGrad(x, W/2-260, 0, W/2-60, 0); x.lineWidth = 2; x.beginPath(); x.moveTo(W/2-260, 72); x.lineTo(W/2-50, 72); x.moveTo(W/2+50, 72); x.lineTo(W/2+260, 72); x.stroke();
  x.fillStyle = JGT.ink; x.font = `800 30px ${SANS}`; x.fillText(TX.top.toUpperCase().split("").join(" ").replace(/   /g,"   "), W/2, 128);
  const words = String(j.alias||j.ref||"Tu amiga").trim().split(/\s+/); const n1 = words.length > 1 ? words.slice(0,-1).join(" ") : "", n2 = words[words.length-1];
  let f1 = 104, f2 = 136; const measure = () => { x.font = `600 ${f1}px ${SERIF}`; const w1 = n1 ? x.measureText(n1).width + 26 : 0; x.font = `${f2}px ${SCRIPT}`; return [w1, x.measureText(n2).width]; };
  let [w1, w2] = measure(); while (w1 + w2 > W - 200 && f1 > 50){ f1 -= 4; f2 -= 5; [w1, w2] = measure(); }
  const nx = W/2 - (w1 + w2)/2, ny = 262; x.textAlign = "left";
  if (n1){ x.fillStyle = JGT.ink; x.font = `600 ${f1}px ${SERIF}`; x.fillText(n1, nx, ny); }
  x.fillStyle = goldGrad(x, nx+w1, ny-f2, nx+w1+w2, ny); x.font = `${f2}px ${SCRIPT}`; x.fillText(n2, nx + w1, ny + 8); drawHeart(x, nx + w1 + w2 - 18, ny - f2*0.85, 70);
  x.textAlign = "center"; const pill = TX.pill; fitText(x, pill, 46, W-260, 700, SERIF); const pw = x.measureText(pill).width + 90;
  x.save(); x.shadowColor = "rgba(20,33,61,.3)"; x.shadowBlur = 18; x.shadowOffsetY = 6; rr(x, W/2-pw/2, 300, pw, 76, 38); const pg = x.createLinearGradient(0,300,0,376); pg.addColorStop(0, JGT.ink); pg.addColorStop(1, JGT.ink); x.fillStyle = pg; x.fill(); x.restore();
  x.fillStyle = "#fff"; x.fillText(pill, W/2, 354);
  /* ruleta */
  const prizes = p.prizes||[], n = prizes.length||1, cx = W/2, cy = fimg ? 665 : 760, R = fimg ? 240 : 300, a = 2*Math.PI/n; const SL = JG_SL(n);
  const imgs = await Promise.all(prizes.map(pr => pr.img ? loadImg(pr.img).catch(()=>null) : null));
  if ((p.tipo||"ruleta") === "ruleta"){
  x.save(); x.shadowColor = "rgba(120,90,20,.4)"; x.shadowBlur = 44; x.shadowOffsetY = 18; x.beginPath(); x.arc(cx, cy, R+32, 0, 7); x.fillStyle = goldGrad(x, cx-R, cy-R, cx+R, cy+R); x.fill(); x.restore();
  prizes.forEach((pr,i) => { const a0 = -Math.PI/2 + i*a; x.beginPath(); x.moveTo(cx,cy); x.arc(cx,cy,R,a0,a0+a); x.closePath(); x.fillStyle = SL[i%SL.length]; x.fill(); x.strokeStyle = JGT.g[1]; x.lineWidth = 5; x.stroke(); });
  prizes.forEach((pr,i) => { const mid = -Math.PI/2 + i*a + a/2, ir = R*0.56, ix = cx + ir*Math.cos(mid), iy = cy + ir*Math.sin(mid), s = Math.min(230, 2*Math.PI*ir/n*0.78);
    x.save(); x.shadowColor = "rgba(0,0,0,.18)"; x.shadowBlur = 14; x.beginPath(); x.arc(ix, iy, s/2+8, 0, 7); x.fillStyle = "#fff"; x.fill(); x.restore();
    x.beginPath(); x.arc(ix, iy, s/2+8, 0, 7); x.strokeStyle = JGT.g[1]; x.lineWidth = 4; x.stroke();
    if (imgs[i]){ x.save(); x.beginPath(); x.arc(ix, iy, s/2, 0, 7); x.clip(); x.drawImage(imgs[i], ix-s/2, iy-s/2, s, s); x.restore(); } else { x.font = `${s*0.5}px serif`; x.fillText("🎁", ix, iy+s*0.18); }
    const lbl = String(pr.n).slice(0,18); x.font = `800 ${n>6?22:28}px ${SANS}`; const tw = x.measureText(lbl).width + 32, ty = Math.sin(mid) < -0.2 ? iy - s/2 - 22 : iy + s/2 + 34;
    x.fillStyle = JGT.ink; rr(x, ix-tw/2, ty-30, tw, 46, 23); x.fill(); x.fillStyle = "#fff"; x.fillText(lbl, ix, ty+3); });
  for (let i=0;i<32;i++){ const t = i*2*Math.PI/32, bx = cx+(R+16)*Math.cos(t), by = cy+(R+16)*Math.sin(t); const rg = x.createRadialGradient(bx,by,0,bx,by,18); rg.addColorStop(0,"rgba(255,250,225,1)"); rg.addColorStop(.35,`rgba(${JGT.glow},.95)`); rg.addColorStop(1,`rgba(${JGT.glow},0)`); x.fillStyle = rg; x.fillRect(bx-18,by-18,36,36); }
  x.beginPath(); x.arc(cx, cy, 58, 0, 7); x.fillStyle = JGT.ink; x.fill(); x.lineWidth = 10; x.strokeStyle = goldGrad(x, cx-60, cy-60, cx+60, cy+60); x.stroke(); drawGift(x, cx-40, cy-44, 80);
  x.beginPath(); x.moveTo(cx-34, cy-R-56); x.lineTo(cx+34, cy-R-56); x.lineTo(cx, cy-R+14); x.closePath(); x.fillStyle = JGT.ink; x.fill(); x.strokeStyle = JGT.g[1]; x.lineWidth = 3; x.stroke();
  } else {
    /* Los demás juegos: círculo dorado con el dibujo del juego en el centro y los regalos alrededor */
    x.save(); x.shadowColor = "rgba(120,90,20,.4)"; x.shadowBlur = 44; x.shadowOffsetY = 18; x.beginPath(); x.arc(cx, cy, R+32, 0, 7); x.fillStyle = goldGrad(x, cx-R, cy-R, cx+R, cy+R); x.fill(); x.restore();
    const fg = x.createRadialGradient(cx, cy-R*0.3, 20, cx, cy, R); fg.addColorStop(0, "#ffffff"); fg.addColorStop(1, JGT.sl[1]); x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fillStyle = fg; x.fill();
    x.textAlign = "center"; x.font = `${Math.round(R*0.62)}px serif`; x.fillText(TI(p.tipo).e, cx, cy + R*0.04);
    const ttl = TI(p.tipo).n; x.font = `800 40px ${SANS}`; const tw0 = x.measureText(ttl).width + 50; x.fillStyle = JGT.ink; rr(x, cx-tw0/2, cy + R*0.18, tw0, 64, 32); x.fill(); x.fillStyle = "#fff"; x.fillText(ttl, cx, cy + R*0.18 + 45);
    const show = prizes.slice(0, 8), m = show.length, sz = m > 5 ? 120 : 150;
    const ANG = m === 1 ? [35] : [-145,-35,145,35,180,0,-108,-72]; show.forEach((pr, k) => { const ang = ANG[k] * Math.PI/180;
      const ix = cx + (R+20)*Math.cos(ang), iy = cy + (R+20)*Math.sin(ang);
      x.save(); x.shadowColor = "rgba(0,0,0,.2)"; x.shadowBlur = 14; x.beginPath(); x.arc(ix, iy, sz/2+8, 0, 7); x.fillStyle = "#fff"; x.fill(); x.restore();
      x.beginPath(); x.arc(ix, iy, sz/2+8, 0, 7); x.strokeStyle = JGT.g[1]; x.lineWidth = 5; x.stroke();
      if (imgs[k]){ x.save(); x.beginPath(); x.arc(ix, iy, sz/2, 0, 7); x.clip(); x.drawImage(imgs[k], ix-sz/2, iy-sz/2, sz, sz); x.restore(); } else { x.font = `${sz*0.5}px serif`; x.fillText("🎁", ix, iy+sz*0.18); }
      const lbl = String(pr.n).slice(0,18); x.font = `800 24px ${SANS}`; const lw = x.measureText(lbl).width + 28; const ly = iy + sz/2 + 30; x.fillStyle = JGT.ink; rr(x, ix-lw/2, ly-28, lw, 40, 20); x.fill(); x.fillStyle = "#fff"; x.fillText(lbl, ix, ly); });
  }
  if (!fimg) drawGift(x, 34, 970, 190);
  /* tarjeta con QR */
  const cardX = fimg ? 145 : 250, cardY = fimg ? 1120 : 1110, cardW = 790, cardH = 200;
  x.save(); x.shadowColor = "rgba(120,90,20,.25)"; x.shadowBlur = 30; x.shadowOffsetY = 10; rr(x, cardX, cardY, cardW, cardH, 100); x.fillStyle = "rgba(255,253,247,.96)"; x.fill(); x.restore(); rr(x, cardX, cardY, cardW, cardH, 100); x.strokeStyle = JGT.g[1]; x.lineWidth = 3; x.stroke();
  const q = qrcode(0, "M"); q.addData(link); q.make(); const nm = q.getModuleCount(), qs = 160, cell = qs/nm, qx = cardX + 60, qy = cardY + 20;
  rr(x, qx-10, qy-10, qs+20, qs+20, 16); x.fillStyle = "#fff"; x.fill(); x.strokeStyle = JGT.g[1]; x.lineWidth = 3; x.stroke(); x.fillStyle = JGT.ink;
  for (let r=0;r<nm;r++) for (let k=0;k<nm;k++) if (q.isDark(r,k)) x.fillRect(qx+k*cell, qy+r*cell, Math.ceil(cell), Math.ceil(cell));
  x.textAlign = "left"; const tx = qx+qs+40; x.fillStyle = JGT.ink; x.font = `700 50px ${SERIF}`; x.fillText(TI(p.tipo).corto, tx, cardY+68);
  x.font = `italic 700 30px ${SERIF}`; x.fillText("Escanea el código o toca el link", tx, cardY+110);
  x.fillStyle = "#5b5547"; x.font = `600 23px ${SANS}`; x.fillText("¡Totalmente gratis!", tx, cardY+148); x.fillText("Solo mayores de 18 años", tx, cardY+178);
  return await new Promise(res => c.toBlob(res, "image/png"));
}

function openLead(id){
  const l = S.leads[id]; if (!l) return; const t = telOk(l.tel) || l.tel;
  openModal(`<h3>${esc(l.name)}</h3><div class="note" style="margin-top:-6px">${l.kind==="hoja" ? "📋 Contacto de la hoja (todavía no juega la ruleta)" : (esSorteoLead(l) ? `📣 Del anuncio · <b>${esc(ganoTxt(l))}</b>. Ofrécele la demostración; no le digas que ganó.` : `🎁 Ganó: <b>${esc(l.prize)}</b>${l.quiz?` · ${esc(l.quiz)}`:""}`)} · ${S.juegos?.[l.code]?.anuncio?"Viene de":"Amiga de"} ${esc(l.ref||"—")} · ${esc(progName(l.pid))} · ${fmtWhen(l.at)}${l.socioId!==S.uid?` · para ${esc(memberName(l.socioId))}`:""}</div>
    <div class="row"><a class="btn" href="tel:+1${t}">📞 Llamar</a><a class="btn dark" target="_blank" rel="noopener" href="https://wa.me/1${t}?text=${encodeURIComponent(`¡Hola ${firstName(l.name)}! 🎉 Te escribo de Royal Prestige por el regalo que ganaste en ${TI(S.programs[l.pid]?.tipo).una}: ${l.prize}. ¿Cuándo te queda bien para coordinar la entrega?`)}">WhatsApp</a><a class="btn ghost" href="sms:+1${t}">Mensaje</a></div>
    ${l.kind==="hoja" && S.juegos[l.code] ? `<a class="btn small ghost" target="_blank" rel="noopener" href="https://wa.me/1${t}?text=${encodeURIComponent(msgReferido(l.code, l.name))}">🎡 Mandarle la ruleta de ${esc(firstName(l.ref))}</a>` : ""}
    <div class="note">${telFmt(t)}</div>${repetidoHtml(id)}<div id="ld-h"></div>
    <label class="f">Estado<select class="i" id="ld-st">${Object.entries(JG_ST).map(([k,v])=>`<option value="${k}" ${l.status===k?"selected":""}>${v}</option>`).join("")}</select></label>
    <label class="f">Notas<textarea class="i" id="ld-n" placeholder="Qué te dijo, cuándo volver a llamar…">${esc(l.notes||"")}</textarea></label>
    <div class="row"><button class="btn" id="ld-cita">📅 Agendar cita</button><button class="btn ghost" id="ld-save">Guardar</button><button class="btn ghost" data-close>Cerrar</button></div>
    ${l.by===S.uid || l.socioId===S.uid || role()==="admin" ? `<button class="btn small ghost" id="ld-del" style="justify-self:start">🗑️ Borrar prospecto</button>` : ""}`, () => {
    const q = x => document.getElementById(x);
    getHistAny(l.socioId, t).then(h => { const e = q("ld-h"); if (e) e.innerHTML = histHtml(h); });
    const upd = async (o) => { try { await S.db.doc("leads/"+id).update({...o, statusAt:Date.now()}); return true; } catch(e){ writeErr(e); return false; } };
    if (q("ld-del")) q("ld-del").onclick = function(){ if (!this.dataset.sure){ this.dataset.sure = "1"; this.textContent = "Toca otra vez para borrarlo"; this.classList.add("danger"); return; }
      S.db.doc("leads/"+id).delete().then(() => { delete S.leads[id]; closeModal(); toast("Prospecto borrado"); render(); }, writeErr); };
    q("ld-save").onclick = async () => { if (await upd({status:q("ld-st").value, notes:q("ld-n").value.trim().slice(0,1000)})){ closeModal(); toast("Guardado"); } };
    q("ld-cita").onclick = () => { const own = l.socioId===S.uid; if (!own){ if (!S.members[l.socioId]){ toast("Ese socio ya no está en el equipo"); return; } S.world = l.socioId; }
      const pre = {name:l.name, phone:telFmt(t), refBy:l.ref||"", code:l.code, notes:`${l.kind==="hoja" ? "Referido" : (esSorteoLead(l) ? "Anuncio Meta: "+ganoTxt(l) : "Ganó "+l.prize+" en "+TI(S.programs[l.pid]?.tipo).una)+(l.quiz?" · "+l.quiz:"")} · amiga de ${l.ref||""}${l.notes?" · "+l.notes:""}`, onSaved: aid => S.db.doc("leads/"+id).update({status:"cita", apptId:aid, statusAt:Date.now()}).catch(()=>{})};
      closeModal(); openCitaForm(own ? "" : "Ruleta", own, pre); };
  });
}

/* Campaña: la telemarketer o el socio le manda el link a una lista de personas, uno por uno, por WhatsApp o texto */
function openCampana(code){
  if (!code && !misProgramas().length){ toast("Primero crea un programa"); openPrograma(); return; }
  if (!code){
    openModal(`<h3>📣 Campaña por mensaje</h3><p class="note" style="margin:0">Crea un link de ${esc(role()==="tele"?"un socio":"tu ruleta")} y mándaselo a una lista de personas, una por una, con su nombre.</p>
      ${progSel("cp-p")}${juegoSel("cp-j")}<label class="f">De parte de<select class="i" id="cp-s">${socioOpts(S.world && role()==="tele" ? S.world : S.uid)}</select></label>
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
        try { const bt = S.db.batch(); const tj = q("cp-j").value; bt.set(S.db.doc("juegos/"+code), {...base, ref:sname.slice(0,60), kind:"campana", tipo:tj});
          bt.set(S.db.doc("leads/"+code+"_ref"), {code, pid, name:"Campaña "+fmt(Date.now(),{day:"numeric",month:"short"}), tel:"", kind:"ref", status:"ref", socioId:sid, up:base.up, tv:base.tv, by:S.uid, ref:sname.slice(0,60), at:Date.now(), lista, msg:q("cp-m").value.slice(0,1500)}); await bt.commit();
          S.juegos[code] = {...base, ref:sname, kind:"campana", tipo:tj}; S.leads[code+"_ref"] = {kind:"ref", lista, msg:q("cp-m").value}; closeModal(); openCampana(code); } catch(e){ q("cp-ok").disabled = false; writeErr(e); } };
    }); return; }
  const j = S.juegos[code], L = S.leads[code+"_ref"] || {}; const lista = L.lista || []; const link = jgLink(code);
  const yo = firstName(S.me?.name), socio = memberName(j.socioId);
  const msgFor = c => fillMsg(L.msg || defCamp(j.tipo || S.programs[j.pid]?.tipo), {nombre:firstName(c.n), yo, socio, link});
  openModal(`<h3>📣 Campaña · ${lista.filter(c=>c.s).length} de ${lista.length} enviados</h3><p class="note" style="margin:0">Toca WhatsApp o Texto en cada persona. Cada mensaje sale con su nombre.</p>
    <div class="list">${lista.map((c,i)=>`<div class="item" style="cursor:default;${c.s?"opacity:.55":""}"><div><div class="t">${c.s?"✅ ":""}${esc(c.n||"Sin nombre")}</div><div class="m">${telFmt(c.t)}</div></div><div class="row" style="flex-wrap:nowrap"><a class="btn small" target="_blank" rel="noopener" data-cs="${i}" href="https://wa.me/1${c.t}?text=${encodeURIComponent(msgFor(c))}">WhatsApp</a><a class="btn small dark" data-cs="${i}" href="sms:+1${c.t}&body=${encodeURIComponent(msgFor(c))}">Texto</a></div></div>`).join("")}</div>
    <div class="row"><button class="btn ghost" id="cp-img">🖼️ Imagen con QR</button><button class="btn ghost" data-close>Cerrar</button></div>`, () => {
    document.querySelectorAll("[data-cs]").forEach(a => a.addEventListener("click", () => { const i = +a.dataset.cs; if (lista[i].s) return; lista[i].s = Date.now();
      S.db.doc("leads/"+code+"_ref").update({lista}).catch(e => console.log(e)); setTimeout(() => openCampana(code), 800); }));
    document.getElementById("cp-img").onclick = () => openShare(code);
  });
}

window.addEventListener("popstate", () => { if (document.getElementById("jg") && window.__demo){ try { musicStop(); } catch {} location.reload(); } });

/* Prospecto de un anuncio con sorteo: no ganó todavía, solo participó */
const esSorteoLead = l => !!(S.juegos?.[l.code]?.sorteo || String(l.prize||"").startsWith("Sorteo:"));
const ganoTxt = l => esSorteoLead(l) ? "participó en el sorteo de " + String(l.prize||"").replace(/^Sorteo:\s*/,"") + " (todavía NO ha ganado)" : "ganó " + l.prize;
