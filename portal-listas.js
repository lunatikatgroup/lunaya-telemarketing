/* Listas del portal de Hy Cite (cumpleaños y filtros CARP).
   Recibe la hoja ya leída (filas y columnas). No guarda datos de clientes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PortalListas = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MESES = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
  };
  const NOMBRE_MES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  function norm(v) {
    return String(v == null ? "" : v).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  }
  function text(v) {
    if (v == null || v === "") return "";
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return String(v).replace(/\s+/g, " ").trim();
  }
  function serialToISO(n) {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 20000 || n > 80000) return "";
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  function parseFecha(v) {
    if (typeof v === "number") return serialToISO(v);
    const s = text(v);
    let m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return m[3] + "-" + String(+m[1]).padStart(2, "0") + "-" + String(+m[2]).padStart(2, "0");
    m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[0] : "";
  }
  function parseCumple(v) {
    const s = text(v);
    const m = s.match(/^([a-zA-Záéíóúñ]+)\s+(\d{1,2})$/);
    if (!m) return "";
    const mo = MESES[norm(m[1])];
    const d = +m[2];
    if (!mo || d < 1 || d > 31) return "";
    return String(mo).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  function cumpleTxt(mmdd) {
    const p = String(mmdd || "").split("-");
    if (p.length !== 2) return "";
    return (+p[1]) + " de " + (NOMBRE_MES[+p[0]] || p[0]);
  }
  function telDigits(v) {
    const d = text(v).replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") return d.slice(1);
    return d.length >= 10 ? d.slice(-10) : "";
  }
  function col(row, names) {
    for (let i = 0; i < row.length; i++) {
      const t = norm(row[i]);
      if (!t) continue;
      if (names.some(function (n) { return t === n || t.indexOf(n) >= 0; })) return i;
    }
    return -1;
  }
  function findRow(aoa, pred) {
    for (let r = 0; r < aoa.length; r++) if (pred(aoa[r] || [], r)) return r;
    return -1;
  }
  function docId(lista, mes, cuenta) {
    return lista + "_" + mes + "_" + String(cuenta || "").replace(/\D/g, "");
  }

  function parseCumples(aoa) {
    const warnings = [];
    const h = findRow(aoa, function (row) { return col(row, ["customer name", "nombre"]) >= 0 && col(row, ["birth", "cumple"]) >= 0; });
    if (h < 0) return { mes: "", rows: [], warnings: ["No reconocí el reporte de cumpleaños. Usa el Excel de Customer Birthdays."] };
    const head = aoa[h];
    const iN = col(head, ["customer name", "nombre"]);
    const iC = col(head, ["customer no", "customer #", "cuenta"]);
    const iH = col(head, ["home phone", "telefono", "tel"]);
    const iW = col(head, ["work phone"]);
    const iB = col(head, ["balance", "saldo"]);
    const iD = col(head, ["birth", "cumple"]);
    let serial = 0;
    aoa.slice(0, h).forEach(function (row) {
      (row || []).forEach(function (c) { if (typeof c === "number" && c > 40000 && c < 60000) serial = c; });
    });
    const anio = serialToISO(serial).slice(0, 4) || String(new Date().getFullYear());
    const rows = [];
    for (let r = h + 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const nombre = text(row[iN]);
      const cuenta = text(row[iC]).replace(/\D/g, "");
      if (!nombre && !cuenta) continue;
      if (!cuenta) { warnings.push("Fila sin número de cliente: " + nombre); continue; }
      const cumple = parseCumple(row[iD]);
      rows.push({
        cuenta: cuenta, nombre: nombre.slice(0, 120),
        tel: telDigits(row[iH]) || telDigits(row[iW]),
        tel2: telDigits(row[iW]) && telDigits(row[iW]) !== telDigits(row[iH]) ? telDigits(row[iW]) : "",
        saldo: typeof row[iB] === "number" ? Math.round(row[iB] * 100) / 100 : 0,
        cumple: cumple, promo: "", detalle: "", estado: "", accion: ""
      });
    }
    const mm = (rows.find(function (x) { return x.cumple; }) || {}).cumple || "";
    const mes = mm ? anio + "-" + mm.slice(0, 2) : (serialToISO(serial).slice(0, 7) || "");
    if (!rows.length) warnings.push("El archivo no trae clientes.");
    return { mes: mes, rows: rows, warnings: warnings };
  }

  function parseFiltros(aoa) {
    const warnings = [];
    const h = findRow(aoa, function (row) {
      return col(row, ["customer#", "customer #", "customer no"]) >= 0 && col(row, ["description", "descripcion"]) >= 0;
    });
    if (h < 0) return { mes: "", rows: [], warnings: ["No reconocí el reporte de filtros. Usa el Excel de CARP Activity."] };
    const head = aoa[h];
    const iC = col(head, ["customer#", "customer #", "customer no"]);
    const iN = col(head, ["name", "nombre"]);
    const iP = col(head, ["phone", "telefono"]);
    const iD = col(head, ["description", "descripcion"]);
    const iA = col(head, ["action date", "fecha"]);
    const iM = col(head, ["promo month"]);
    const iS = col(head, ["customer status", "status"]);
    let serial = 0;
    let promo = "";
    aoa.slice(0, h).forEach(function (row) {
      (row || []).forEach(function (c, i) {
        if (typeof c === "number" && c > 40000 && c < 60000 && serial === 0) serial = c;
        const t = text(c);
        if (t && t.length > 8 && !/customer marketing|from:|to/i.test(t) && i <= 3) promo = t.slice(0, 120);
      });
    });
    const byCuenta = new Map();
    let cur = null;
    for (let r = h + 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const cuenta = text(row[iC]).replace(/\D/g, "");
      const nombre = text(row[iN]);
      const desc = text(row[iD]);
      const titulo = text(row[iC] || row[0] || row[1]);
      if (!cuenta && !nombre && !desc && titulo.length > 8 && !/^\d/.test(titulo)) { promo = titulo.slice(0, 120); cur = null; continue; }
      if (cuenta && cuenta.length >= 5) {
        cur = byCuenta.get(cuenta) || {
          cuenta: cuenta, nombre: nombre.slice(0, 120), tel: telDigits(row[iP]), tel2: "",
          saldo: 0, cumple: "", promo: promo, detalle: "", estado: text(row[iS]).slice(0, 40), accion: ""
        };
        byCuenta.set(cuenta, cur);
      }
      if (!cur) continue;
      if (nombre && !cur.nombre) cur.nombre = nombre.slice(0, 120);
      const tel = telDigits(row[iP]);
      if (tel && !cur.tel) cur.tel = tel;
      if (desc) {
        const bits = cur.detalle ? cur.detalle.split(", ") : [];
        if (bits.indexOf(desc) < 0 && bits.length < 8) cur.detalle = bits.concat(desc).join(", ").slice(0, 200);
      }
      const fecha = parseFecha(row[iA]);
      if (fecha && fecha > cur.accion) cur.accion = fecha;
      const st = text(row[iS]);
      if (st) cur.estado = st.slice(0, 40);
      if (typeof row[iM] === "number" && !cur.promoMes) cur.promoMes = String(row[iM]);
    }
    const rows = [...byCuenta.values()];
    const mes = serialToISO(serial).slice(0, 7) || (rows.find(function (x) { return x.accion; }) || {}).accion.slice(0, 7) || "";
    if (!rows.length) warnings.push("El archivo no trae clientes.");
    return { mes: mes, rows: rows, warnings: warnings };
  }

  function detect(aoa) {
    const flat = (aoa || []).slice(0, 20).map(function (row) { return (row || []).map(norm).join(" "); }).join(" ");
    if (flat.indexOf("birth") >= 0 || flat.indexOf("cumple") >= 0) return "cumple";
    if (flat.indexOf("customer marketing") >= 0 || flat.indexOf("description") >= 0 || flat.indexOf("carp") >= 0) return "filtros";
    return "";
  }
  function addMonthsISO(iso, n) {
    const p = String(iso || "").split("-").map(Number);
    if (p.length < 3 || !p[0]) return "";
    const y = p[0], m = p[1] - 1 + n, d = p[2];
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const out = new Date(Date.UTC(y, m, Math.min(d, last)));
    return out.toISOString().slice(0, 10);
  }
  function pick(obj, names) {
    const keys = Object.keys(obj || {});
    for (let i = 0; i < names.length; i++) {
      const want = norm(names[i]).replace(/[^a-z0-9]/g, "");
      const hit = keys.find(function (k) { return norm(k).replace(/[^a-z0-9]/g, "") === want; });
      if (hit != null && obj[hit] !== "" && obj[hit] != null) return obj[hit];
    }
    return "";
  }
  function parseMantRows(rows) {
    const warnings = [];
    const by = new Map();
    (rows || []).forEach(function (src, i) {
      const cuenta = text(pick(src, ["cuenta", "customer no", "customer#", "numero", "customer number"])).replace(/\D/g, "");
      const nombre = text(pick(src, ["nombre", "name", "customer name"])).slice(0, 120);
      const fecha = parseFecha(pick(src, ["fecha", "fecha compra", "order date", "purchase date", "fecha orden"]));
      if (!cuenta || !fecha) { warnings.push("Fila " + (i + 1) + ": falta el número de cliente o la fecha de compra."); return; }
      const vence = addMonthsISO(fecha, 6);
      const prev = by.get(cuenta) || {
        cuenta: cuenta, nombre: nombre, tel: "", tel2: "", direccion: "", producto: "",
        saldo: 0, cumple: "", promo: "", detalle: "", estado: "", accion: fecha, vence: vence
      };
      if (nombre) prev.nombre = nombre;
      const tel = telDigits(pick(src, ["tel", "telefono", "home phone", "phone"]));
      const tel2 = telDigits(pick(src, ["tel2", "trabajo", "work phone", "telefono trabajo"]));
      if (tel) prev.tel = tel;
      if (tel2 && tel2 !== prev.tel) prev.tel2 = tel2;
      const dir = text(pick(src, ["direccion", "address", "domicilio"])).slice(0, 300);
      if (dir) prev.direccion = dir;
      const prod = text(pick(src, ["producto", "productos", "product", "producto comprado"])).slice(0, 200);
      if (prod && prev.producto.indexOf(prod) < 0) prev.producto = (prev.producto ? prev.producto + ", " : "") + prod;
      if (vence && (!prev.vence || vence < prev.vence)) { prev.vence = vence; prev.accion = fecha; }
      by.set(cuenta, prev);
    });
    const rowsOut = [...by.values()].map(function (r) { r.producto = r.producto.slice(0, 200); return r; });
    return { rows: rowsOut, warnings: warnings };
  }
  function parseTabla(text) {
    const raw = String(text || "").trim();
    if (!raw) return [];
    if (raw[0] === "[" || raw[0] === "{") {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [data];
    }
    const lines = raw.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) return [];
    const sep = (lines[0].split("\t").length > lines[0].split(",").length) ? "\t" : ",";
    const heads = lines[0].split(sep).map(function (h) { return h.trim(); });
    return lines.slice(1).map(function (line) {
      const cols = line.split(sep);
      const o = {};
      heads.forEach(function (h, i) { o[h] = (cols[i] || "").trim(); });
      return o;
    });
  }

  function parse(kind, aoa) {
    const k = kind || detect(aoa);
    if (k === "filtros") return parseFiltros(aoa || []);
    if (k === "mant") return { mes: "", rows: [], warnings: ["El mantenimiento se importa con CSV o JSON, no con el Excel de cumpleaños."] };
    return parseCumples(aoa || []);
  }

  return { parse: parse, detect: detect, parseMantRows: parseMantRows, parseTabla: parseTabla, addMonthsISO: addMonthsISO, docId: docId, serialToISO: serialToISO, parseCumple: parseCumple, cumpleTxt: cumpleTxt, telDigits: telDigits };
});
