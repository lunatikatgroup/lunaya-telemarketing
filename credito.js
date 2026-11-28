/* Nivel de crédito Hy Cite: quién califica para bajar a nivel 3.
   No habla con Firebase. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.Credito = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function norm(s) { return String(s == null ? "" : s).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
  function text(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
  function tel(v) { const d = text(v).replace(/\D/g, ""); return d.length === 11 && d[0] === "1" ? d.slice(1) : (d.length >= 10 ? d.slice(-10) : ""); }
  function fecha(v) {
    const s = text(v);
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (!m) return "";
    return m[3] + "-" + String(+m[1]).padStart(2, "0") + "-" + String(+m[2]).padStart(2, "0");
  }
  function truthy(v) {
    const s = norm(v);
    return s === "si" || s === "yes" || s === "true" || s === "1" || s === "aldia" || s === "current";
  }
  /* Nivel 9 necesita 7 pagos. Niveles 4 a 8 necesitan 6. Además tiene que estar al día. */
  function califica(row) {
    const nivel = Math.round(+row.nivel) || 0;
    const pagos = Math.round(+row.pagos) || 0;
    const aldia = row.aldia === true || truthy(row.aldia) || (+row.saldo === 0 && row.aldia == null);
    if (nivel < 4 || nivel > 9) return { ok: false, motivo: "El nivel " + (nivel || "—") + " no baja a 3 (sirve del 4 al 9)." };
    const need = nivel === 9 ? 7 : 6;
    if (pagos < need) return { ok: false, motivo: "Nivel " + nivel + " necesita " + need + " pagos y tiene " + pagos + "." };
    if (!aldia) return { ok: false, motivo: "No está al día." };
    return { ok: true, motivo: "" };
  }
  function pick(obj, names) {
    const keys = Object.keys(obj || {});
    for (let i = 0; i < names.length; i++) {
      const want = norm(names[i]);
      const hit = keys.find(function (k) { return norm(k) === want; });
      if (hit != null && obj[hit] !== "" && obj[hit] != null) return obj[hit];
    }
    return "";
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
    const sep = lines[0].split("\t").length > lines[0].split(",").length ? "\t" : ",";
    const heads = lines[0].split(sep).map(function (h) { return h.trim(); });
    return lines.slice(1).map(function (line) {
      const cols = line.split(sep);
      const o = {};
      heads.forEach(function (h, i) { o[h] = (cols[i] || "").trim(); });
      return o;
    });
  }
  function filas(raw) {
    const warnings = [];
    const by = new Map();
    parseTabla(raw).forEach(function (src, i) {
      const cuenta = text(pick(src, ["cuenta", "customer no", "numero"])).replace(/\D/g, "");
      const nombre = text(pick(src, ["nombre", "name"])).slice(0, 120);
      if (!cuenta || !nombre) { warnings.push("Fila " + (i + 1) + ": falta nombre o cuenta."); return; }
      const aldiaRaw = pick(src, ["aldia", "al dia", "current"]);
      const row = {
        cuenta: cuenta,
        nombre: nombre,
        tel: tel(pick(src, ["telefono", "tel", "phone"])),
        correo: text(pick(src, ["correo", "email"])).slice(0, 120),
        direccion: text(pick(src, ["direccion", "address"])).slice(0, 300),
        nivel: Math.round(+pick(src, ["nivel", "level"])) || 0,
        pagos: Math.round(+pick(src, ["pagos", "payments"])) || 0,
        ultimoPago: fecha(pick(src, ["ultimo_pago", "ultimopago", "last payment"])),
        saldo: Math.round((+String(pick(src, ["saldo", "balance"])).replace(/[$,\s]/g, "") || 0) * 100) / 100,
        emprendedor: text(pick(src, ["emprendedor", "seller"])).slice(0, 80),
        aldia: aldiaRaw === "" ? null : truthy(aldiaRaw)
      };
      const c = califica(row);
      row.califica = c.ok;
      row.motivo = c.motivo;
      by.set(cuenta, row);
    });
    return { rows: [...by.values()], warnings: warnings };
  }
  return { califica: califica, filas: filas, parseTabla: parseTabla };
});
