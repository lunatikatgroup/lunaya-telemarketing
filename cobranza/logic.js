/* Lógica de Cobranza (cuentas, colores, importación, quién puede ver tarjetas).
   La usa la página y las pruebas. No habla con Firebase. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.Cobranza = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const BLOCKED = new Set(["cvv", "cvc", "cvv2", "cid", "securitycode", "numero", "pan", "tarjeta", "cardnumber", "card", "numerodetarjeta", "codigoseguridad"]);
  const ALIAS = {
    nombre: "nombre", name: "nombre", cliente: "nombre",
    apellido: "apellido", apellidos: "apellido", lastname: "apellido", last: "apellido",
    cuenta: "cuenta", account: "cuenta", accountnumber: "cuenta", numerodecuenta: "cuenta",
    tel: "tel", telefono: "tel", phone: "tel", celular: "tel", movil: "tel", mobile: "tel", cellphone: "tel",
    email: "email", correo: "email", correoelectronico: "email", mail: "email",
    direccion: "direccion", address: "direccion", domicilio: "direccion", calle: "direccion", street: "direccion", address1: "direccion",
    ciudad: "ciudad", city: "ciudad",
    estado: "estado", state: "estado",
    zip: "zip", zipcode: "zip", postalcode: "zip", codigopostal: "zip", cp: "zip",
    producto: "producto", product: "producto",
    pedido: "pedido", ordenid: "pedido",
    saldo: "saldo", balance: "saldo",
    mensual: "mensual", monthly: "mensual", pagomensual: "mensual", cuota: "mensual",
    vencido: "vencido", pastdue: "vencido", montovencido: "vencido",
    dias: "atraso", days: "atraso", dayspastdue: "atraso", atraso: "atraso",
    pagosatras: "pagosAtras", paymentsbehind: "pagosAtras", npagos: "pagosAtras",
    proxvence: "proxVence", proximovencimiento: "proxVence", nextdue: "proxVence", nextduedate: "proxVence",
    notas: "notasHy", notes: "notasHy", notashycite: "notasHy",
    skip: "skip",
    skipnota: "skipNota", skipnote: "skipNota",
    update: "updateOn", calificaupdate: "updateOn", calificaparaupdate: "updateOn",
    updatemonto: "updateMonto", montoupdate: "updateMonto",
    updatenotas: "updateNotas",
    updateaprobado: "updateAprobado", aprobado: "updateAprobado", aprobadoporcliente: "updateAprobado",
    updatefecha: "updateFecha",
    carolina: "carolina", avisadocarolina: "carolina",
    carolinanota: "carolinaNota",
    carolinafecha: "carolinaFecha",
    cobrador: "cobrador", asignada: "cobrador", collector: "cobrador",
    link: "payLink", paylink: "payLink", paymentlink: "payLink", linkdepago: "payLink",
    carrier: "carrier", paqueteria: "carrier", transporte: "carrier", ups: "carrier",
    tracking: "tracking", guia: "tracking", rastreo: "tracking",
    entrega: "entrega", fechaentrega: "entrega", estimateddelivery: "entrega",
    entregado: "entregado", delivered: "entregado",
    recibio: "recibio", recibo: "recibio", confirmo: "recibio",
    recibiofecha: "recibioFecha",
    autopay: "autopay", pagoprogramado: "autopay",
    autopayfecha: "autopayFecha",
    autopaymetodo: "autopayMetodo", metodopago: "autopayMetodo", metododepago: "autopayMetodo", metododepagoprogramado: "autopayMetodo",
    clientid: "clientId",
    tipo: "tipo", type: "tipo",
    resultado: "resultado", outcome: "resultado",
    mensaje: "mensaje", message: "mensaje",
    fecha: "fecha", date: "fecha",
    quien: "quien",
    promesafecha: "promesaFecha",
    promesamonto: "promesaMonto"
  };
  const TIPOS = { llamada: "llamada", call: "llamada", phone: "llamada", whatsapp: "whatsapp", wa: "whatsapp", sms: "sms", texto: "sms", text: "sms", correo: "correo", email: "correo", mail: "correo", nota: "nota", note: "nota" };
  const RESS = {
    contesto: "contesto", contesta: "contesto", answered: "contesto",
    no: "no", nocontesto: "no", nocontesta: "no", noanswer: "no",
    buzon: "buzon", voicemail: "buzon",
    promesa: "promesa", promesadepago: "promesa", promise: "promesa",
    pago: "pago", paid: "pago",
    equivocado: "equivocado", numeroequivocado: "equivocado", wrongnumber: "equivocado"
  };
  const NUMS = new Set(["saldo", "mensual", "vencido", "atraso", "pagosAtras", "updateMonto", "promesaMonto"]);
  const BOOLS = new Set(["skip", "updateOn", "updateAprobado", "carolina", "entregado", "recibio", "autopay"]);
  const DATES = new Set(["proxVence", "updateFecha", "carolinaFecha", "entrega", "recibioFecha", "autopayFecha", "fecha", "promesaFecha"]);

  function normKey(s) {
    return String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  }
  function bucketOf(days) {
    const d = +days || 0;
    if (d <= 0) return "aldia";
    if (d <= 30) return "g30";
    if (d <= 60) return "g60";
    return "g90";
  }
  function truthy(v) {
    if (v === true) return true;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "si" || s === "sí" || s === "yes" || s === "true" || s === "1" || s === "x" || s === "on";
  }
  function esSkip(c) { return !!(c && (c.skip === true || truthy(c.skip))); }
  function esUpdate(c) { return !!(c && (c.updateOn === true || truthy(c.updateOn))); }
  function updateAprobado(c) { return !!(c && (c.updateAprobado === true || truthy(c.updateAprobado))); }
  function toneOf(c) {
    c = c || {};
    if (esSkip(c)) return "rojo";
    if (esUpdate(c) && !updateAprobado(c)) return "azul";
    if (c.promesa && c.promesa.fecha && !c.promesa.ok) return "amarillo";
    if ((+c.sinContestar || 0) >= 3) return "naranja";
    if (c.etapa === "cerrado" || (+c.atraso || 0) <= 0) return "verde";
    return "normal";
  }
  function canPay() { return true; }
  function digitsCard(n) { return String(n ?? "").replace(/\D/g, ""); }
  function maskCard(n) {
    const d = digitsCard(n);
    if (d.length < 4) return "••••";
    return "•••• •••• •••• " + d.slice(-4);
  }
  function formatCard(n) { return digitsCard(n).replace(/(\d{4})(?=\d)/g, "$1 ").trim(); }
  function safeHttps(u) {
    const s = String(u ?? "").trim();
    if (!/^https:\/\/\S+$/i.test(s)) return "";
    if (/[\s<>"']/.test(s)) return "";
    return s;
  }
  function safeMail(e) {
    const s = String(e ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "";
    return s;
  }
  function money(n) {
    return "$" + (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function mensajeCliente(c, who) {
    c = c || {};
    const lines = [];
    lines.push("Hola " + (c.nombre || "") + ", le habla " + (who || "el equipo") + " de Royal Prestige, distribución de Katerine Luna (Hy Cite #29733, San Diego).");
    if (c.cuenta) lines.push("Cuenta: " + c.cuenta);
    if (c.producto) lines.push("Producto / orden: " + c.producto);
    lines.push("Saldo: " + money(c.saldo));
    if (+c.mensual) lines.push("Pago mensual: " + money(c.mensual));
    if (+c.vencido || +c.atraso) lines.push("Monto vencido: " + money(c.vencido) + " · " + (+c.atraso || 0) + " días · " + (+c.pagosAtras || 0) + " pagos atrás");
    if (c.proxVence) lines.push("Próximo vencimiento: " + c.proxVence);
    if (esUpdate(c) && !updateAprobado(c)) lines.push("Hy Cite puede ofrecerle pagar " + money(c.updateMonto) + " para poner la cuenta al día. Tiene que aprobarlo por llamada o por correo.");
    if (safeHttps(c.payLink)) lines.push("Link de pago: " + safeHttps(c.payLink));
    if (esSkip(c)) lines.push("Hy Cite tiene esta cuenta en skip. Hay que llamar a Hy Cite para que lo quiten.");
    return lines.join("\n");
  }
  function asNum(v) {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return isFinite(v) ? v : 0;
    const n = parseFloat(String(v).replace(/[$,\s]/g, ""));
    return isFinite(n) ? n : 0;
  }
  function asDate(v) {
    const s = String(v ?? "").trim();
    if (!s) return "";
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return "";
    let y = +m[3];
    if (y < 100) y += 2000;
    return y + "-" + String(+m[1]).padStart(2, "0") + "-" + String(+m[2]).padStart(2, "0");
  }
  function asWhen(v) {
    const s = String(v ?? "").trim();
    const fecha = asDate(s);
    if (/T\d{2}:\d{2}/.test(s) || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
      const ms = Date.parse(s.includes("T") ? s : s.replace(" ", "T"));
      if (!isNaN(ms)) return { fecha: fecha, at: ms };
    }
    return { fecha: fecha, at: null };
  }
  function metodo(v) {
    const n = normKey(v);
    if (!n) return "";
    if (n.includes("cheque") || n === "check") return "cheque";
    if (n.includes("sitio") || n.includes("web") || n === "online") return "sitio";
    if (n.includes("llama")) return "llamada";
    if (n.includes("tarjet")) return "tarjeta";
    if (n === "cheque" || n === "sitio" || n === "llamada" || n === "tarjeta" || n === "link" || n === "otro") return n;
    return "";
  }
  function clip(v, n) { return String(v ?? "").trim().slice(0, n); }
  function detectSep(text) {
    const line = String(text || "").split(/\r?\n/).find(function (l) { return l.trim(); }) || "";
    const commas = (line.match(/,/g) || []).length;
    const tabs = (line.match(/\t/g) || []).length;
    const semis = (line.match(/;/g) || []).length;
    if (tabs > commas && tabs >= semis) return "\t";
    if (semis > commas) return ";";
    return ",";
  }
  function splitCsv(text, sep) {
    const rows = [];
    let row = [], cur = "", q = false;
    const s = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) {
        if (c === '"') {
          if (s[i + 1] === '"') { cur += '"'; i++; }
          else q = false;
        } else cur += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cur.trim()); cur = ""; }
      else if (c === "\n") { row.push(cur.trim()); if (row.some(Boolean)) rows.push(row); row = []; cur = ""; }
      else if (c !== "\r") cur += c;
    }
    if (cur.length || row.length) { row.push(cur.trim()); if (row.some(Boolean)) rows.push(row); }
    return rows;
  }
  function parseJsonRows(text) {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.clientes)) return data.clientes;
    if (data && Array.isArray(data.cuentas)) return data.cuentas;
    if (data && Array.isArray(data.ordenes)) return data.ordenes;
    if (data && Array.isArray(data.actividad)) return data.actividad;
    if (data && typeof data === "object") return [data];
    return [];
  }
  function takeFields(obj, kind, warnings) {
    const src = {};
    const keys = [];
    Object.entries(obj || {}).forEach(function (pair) {
      const n = normKey(pair[0]);
      if (!n) return;
      if (BLOCKED.has(n)) { warnings.push("Se ignoró un dato de tarjeta (" + pair[0] + "). El número de cuenta va en «cuenta» y la tarjeta no se importa."); return; }
      let field = "";
      if (kind === "ordenes" && (n === "notas" || n === "notes")) field = "notas";
      else if (kind === "actividad" && (n === "notas" || n === "notes")) field = "mensaje";
      else field = ALIAS[n] || "";
      if (!field || src[field] != null && src[field] !== "") return;
      src[field] = pair[1];
      keys.push(field);
    });
    src._keys = keys;
    return src;
  }
  function rowClient(src, warnings) {
    if (src._keys.indexOf("nombre") === -1 && src._keys.indexOf("cuenta") === -1 && src._keys.indexOf("tel") === -1) return { error: "Falta nombre, cuenta o teléfono." };
    const o = {};
    const set = function (k, v) { if (src._keys.indexOf(k) !== -1) o[k] = v; };
    set("nombre", clip(nombreCompleto(src) || src.nombre, 120));
    set("apellido", clip(src.apellido, 80));
    set("tel", clip(src.tel, 40));
    set("email", safeMail(src.email) || (src._keys.indexOf("email") !== -1 ? "" : undefined));
    if (src._keys.indexOf("email") !== -1 && src.email && !safeMail(src.email)) warnings.push("Correo no válido, se dejó vacío: " + src.email);
    if (["direccion", "ciudad", "estado", "zip"].some(function (k) { return src._keys.indexOf(k) !== -1; })) {
      o.direccion = direccionCompleta(src);
      if (src._keys.indexOf("direccion") === -1) src._keys.push("direccion");
    }
    set("ciudad", clip(src.ciudad, 80));
    set("cuenta", clip(src.cuenta, 40));
    set("producto", clip(src.producto, 160));
    set("pedido", clip(src.pedido, 40));
    NUMS.forEach(function (k) { if (src._keys.indexOf(k) !== -1) o[k] = asNum(src[k]); });
    DATES.forEach(function (k) { if (src._keys.indexOf(k) !== -1 && k !== "fecha") o[k] = asDate(src[k]); });
    BOOLS.forEach(function (k) { if (src._keys.indexOf(k) !== -1) o[k] = truthy(src[k]); });
    set("notasHy", clip(src.notasHy, 4000));
    set("skipNota", clip(src.skipNota, 500));
    set("updateNotas", clip(src.updateNotas, 500));
    set("carolinaNota", clip(src.carolinaNota, 500));
    set("cobrador", clip(src.cobrador, 80));
    if (src._keys.indexOf("payLink") !== -1) {
      const link = safeHttps(src.payLink);
      if (src.payLink && !link) warnings.push("El link de pago tiene que empezar con https://");
      o.payLink = link;
    }
    o._keys = src._keys.slice();
    return { value: o };
  }
  function rowOrden(src, warnings) {
    if (!clip(src.nombre, 120) && !clip(src.clientId, 80) && !clip(src.cuenta, 40)) return { error: "Falta el cliente o el nombre." };
    const o = { _keys: src._keys.slice() };
    const set = function (k, v) { if (src._keys.indexOf(k) !== -1) o[k] = v; };
    set("nombre", clip(src.nombre, 120));
    set("tel", clip(src.tel, 30));
    set("email", safeMail(src.email));
    set("producto", clip(src.producto, 160));
    set("pedido", clip(src.pedido, 40));
    set("carrier", clip(src.carrier, 40));
    set("tracking", clip(src.tracking, 80));
    set("entrega", asDate(src.entrega));
    set("entregado", truthy(src.entregado));
    set("recibio", truthy(src.recibio));
    set("recibioFecha", asDate(src.recibioFecha));
    set("autopay", truthy(src.autopay));
    set("autopayFecha", asDate(src.autopayFecha));
    if (src._keys.indexOf("autopayMetodo") !== -1) {
      o.autopayMetodo = metodo(src.autopayMetodo);
      if (src.autopayMetodo && !o.autopayMetodo) warnings.push("Método de pago no reconocido: " + src.autopayMetodo);
    }
    if (src._keys.indexOf("notas") !== -1 || src._keys.indexOf("notasHy") !== -1) o.notas = clip(src.notas || src.notasHy, 2000);
    set("clientId", clip(src.clientId, 80));
    set("cuenta", clip(src.cuenta, 40));
    return { value: o };
  }
  function rowAct(src) {
    if (!clip(src.nombre, 80) && !clip(src.cuenta, 40) && !clip(src.tel, 30) && !clip(src.clientId, 80)) return { error: "Falta la cuenta, el teléfono o el nombre." };
    const tipo = TIPOS[normKey(src.tipo)] || "";
    if (!tipo) return { error: "Tipo no reconocido (llamada, WhatsApp, SMS, correo, nota)." };
    let resultado = "";
    if (src._keys.indexOf("resultado") !== -1 && String(src.resultado ?? "").trim()) {
      resultado = RESS[normKey(src.resultado)];
      if (resultado == null) return { error: "Resultado no reconocido." };
    }
    const when = asWhen(src.fecha);
    return { value: {
      clientId: clip(src.clientId, 80),
      nombre: clip(src.nombre, 80),
      cuenta: clip(src.cuenta, 40),
      tel: clip(src.tel, 30),
      tipo: tipo,
      resultado: resultado,
      mensaje: clip(src.mensaje, 2000),
      fecha: when.fecha,
      at: when.at,
      quien: clip(src.quien, 80),
      promesaFecha: asDate(src.promesaFecha),
      promesaMonto: asNum(src.promesaMonto)
    } };
  }
  function parseTable(text, kind) {
    const warnings = [];
    const errors = [];
    const raw = String(text || "").trim();
    if (!raw) return { rows: [], warnings: warnings, errors: ["Nada para importar."] };
    let objects;
    if (raw[0] === "[" || raw[0] === "{") {
      try { objects = parseJsonRows(raw); }
      catch (e) { return { rows: [], warnings: warnings, errors: ["El JSON no se pudo leer."] }; }
    } else {
      const table = splitCsv(raw, detectSep(raw));
      if (table.length < 2) return { rows: [], warnings: warnings, errors: ["Pon una fila de títulos y debajo una fila por cliente."] };
      const heads = table[0].map(normKey);
      const known = heads.some(function (h) { return ALIAS[h] || BLOCKED.has(h) || h === "notas" || h === "notes"; });
      if (!known) return { rows: [], warnings: warnings, errors: ["No reconocí los títulos. Usa nombre, cuenta, telefono, dias, saldo…"] };
      objects = table.slice(1).map(function (cols) {
        const o = {};
        heads.forEach(function (h, i) { o[table[0][i]] = cols[i] ?? ""; });
        return o;
      });
    }
    const rows = [];
    objects.forEach(function (obj, i) {
      if (!obj || typeof obj !== "object") { errors.push("Fila " + (i + 1) + ": no es un registro."); return; }
      const src = takeFields(obj, kind, warnings);
      const out = kind === "ordenes" ? rowOrden(src, warnings) : kind === "actividad" ? rowAct(src) : rowClient(src, warnings);
      if (out.error) errors.push("Fila " + (i + 1) + ": " + out.error);
      else rows.push(out.value);
    });
    return { rows: rows, warnings: [...new Set(warnings)], errors: errors };
  }

  /* A quién marca de entrada «Pueden ver tarjetas». No escribe nada: Katerine confirma. */
  function addDaysISO(d, n){
    const p = String(d||"").split("-").map(Number);
    if (p.length < 3 || !p[0]) return "";
    return new Date(Date.UTC(p[0], p[1]-1, p[2]+n, 12)).toISOString().slice(0,10);
  }
  /* Día X del mes (o una fecha fija) se revisa al día siguiente. */
  function revisionFecha(row, hoy){
    const fecha = String(row && row.fecha || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return addDaysISO(fecha, 1);
    const dia = +(row && row.dia) || 0;
    if (dia < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(String(hoy||""))) return "";
    const y = +hoy.slice(0,4), m = +hoy.slice(5,7);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const pay = y + "-" + String(m).padStart(2,"0") + "-" + String(Math.min(dia, last)).padStart(2,"0");
    return addDaysISO(pay, 1);
  }

  function direccionCompleta(src) {
    src = src || {};
    const parts = [];
    [src.direccion, src.ciudad, src.estado || src.state, src.zip || src.cp].forEach(function (p) {
      const s = clip(p, 200);
      if (!s) return;
      const have = parts.join(", ").toLowerCase();
      if (have.indexOf(s.toLowerCase()) !== -1) return;
      parts.push(s);
    });
    return parts.join(", ").slice(0, 300);
  }

  function limpioNombre(v) { return String(v || "").trim().replace(/\s+/g, " "); }
  /* Si uno de los dos nombres es el otro más el apellido, se queda el largo. Si no coinciden, se queda el primero. */
  function nombreMasLargo(a, b) {
    const x = limpioNombre(a), y = limpioNombre(b);
    if (!x) return y;
    if (!y) return x;
    const xl = x.toLowerCase(), yl = y.toLowerCase();
    if (xl === yl) return x.length >= y.length ? x : y;
    if (yl.indexOf(xl + " ") === 0 || yl.slice(-(xl.length + 1)) === " " + xl) return y;
    if (xl.indexOf(yl + " ") === 0 || xl.slice(-(yl.length + 1)) === " " + yl) return x;
    return x;
  }
  function conApellido(base, ape) {
    const b = limpioNombre(base), a = limpioNombre(ape);
    if (!a) return b;
    if (!b) return a;
    if (b.toLowerCase().indexOf(a.toLowerCase()) !== -1) return b;
    return b + " " + a;
  }
  /* Nombre y apellido de la cita o de la cuenta. Si solo hay nombre, se queda así. */
  function nombreCompleto(src) {
    src = src || {};
    const cands = [src.client, src.nomVenta, src.nombre, src.name].map(limpioNombre).filter(Boolean);
    cands.sort(function (a, b) { return b.length - a.length; });
    return conApellido(cands[0] || "", src.apellido || src.apellidos || src.lastName || "");
  }

  /* El correo (en minúsculas) está en cconfig/main.staff. La dueña y el bot se deciden aparte. */
  function enStaffCobranza(email, staff) {
    if (!staff || typeof staff !== "object" || !email) return false;
    return Object.prototype.hasOwnProperty.call(staff, String(email).toLowerCase());
  }

  function sugerirTarjetas(members) {
    const notes = [];
    const uids = [];
    function pick(palabra, label) {
      const all = Object.entries(members || {}).filter(function (pair) {
        const m = pair[1];
        if (!m) return false;
        const n = String(m.name || "").toLowerCase();
        const e = String(m.email || "").toLowerCase();
        return n.includes(palabra) || e.includes(palabra);
      });
      const ok = all.filter(function (pair) {
        const m = pair[1];
        return m.role !== "bot" && m.role !== "baja" && m.role !== "pendiente" && !m.bloqueado;
      });
      if (ok.length === 1) { uids.push(ok[0][0]); return; }
      if (all.length && !ok.length) { notes.push(label + " solo coincide con un usuario que no puede ver tarjetas (bot, de baja o suspendido). Elige a otra persona."); return; }
      if (!ok.length) notes.push("No encontré a " + label + " entre las personas de Lunaya. No queda marcada: elígela cuando su usuario exista.");
      else notes.push("Hay más de una persona que parece " + label + ". No la marco: elige tú quién puede ver las tarjetas.");
    }
    pick("arisbel", "Arisbel");
    pick("milady", "Milady");
    return { uids: uids, notes: notes };
  }

  return {
    bucketOf: bucketOf, esSkip: esSkip, esUpdate: esUpdate, updateAprobado: updateAprobado, toneOf: toneOf, canPay: canPay,
    digitsCard: digitsCard, maskCard: maskCard, formatCard: formatCard, safeHttps: safeHttps, safeMail: safeMail,
    mensajeCliente: mensajeCliente, parseTable: parseTable, sugerirTarjetas: sugerirTarjetas, enStaffCobranza: enStaffCobranza, revisionFecha: revisionFecha, nombreCompleto: nombreCompleto, nombreMasLargo: nombreMasLargo, asDate: asDate, money: money
  };
});
