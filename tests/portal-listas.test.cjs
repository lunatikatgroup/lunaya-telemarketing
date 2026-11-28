const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../portal-listas.js");

test("el cumpleaños guarda mes y día, sin año, y el mes del reporte", () => {
  const aoa = [
    ["", "", "", "Print Date:", "", 46354],
    ["", "CUSTOMER NAME", "CUSTOMER NO", "HOME PHONE", "WORK PHONE", "CUSTOMER BALANCE", "BIRTH DAY"],
    ["", "Ana Ejemplo", "10000001", "619-555-0101", "", 120.5, "November 6"],
    ["", "Luis Ejemplo", "10000002", "", "619-555-0199", 0, "November 28"]
  ];
  const out = P.parse("cumple", aoa);
  assert.equal(out.warnings.length, 0);
  assert.equal(out.mes, "2026-11");
  assert.equal(out.rows.length, 2);
  assert.equal(out.rows[0].cuenta, "10000001");
  assert.equal(out.rows[0].tel, "6195550101");
  assert.equal(out.rows[0].cumple, "11-06");
  assert.equal(out.rows[0].saldo, 120.5);
  assert.equal(out.rows[1].tel, "6195550199");
  assert.equal(P.cumpleTxt("11-06"), "6 de noviembre");
  assert.equal(P.docId("cumple", out.mes, out.rows[0].cuenta), "cumple_2026-11_10000001");
});

test("el reporte de filtros junta las filas del mismo cliente", () => {
  const aoa = [
    ["Customer Marketing", "", "", "", "", "", "", "From:", 46327],
    ["", "Free filters", "", "", "", "", "", "", ""],
    ["", "Customer#", "Name", "Phone", "Description", "Action Date", "Promotion Code", "Promo Month", "Customer Status"],
    ["", "20000001", "Ana Ejemplo", "619-555-0101", "EMAIL", 46333.5, "X", 1, "Active"],
    ["", "", "", "", "POST CARD", "SCHED - 11/28/2026", "Y", 1, "Active"],
    ["", "20000002", "Luis Ejemplo", "", "WEB", "", "Z", 1, "Active"]
  ];
  const out = P.parse("filtros", aoa);
  assert.equal(out.mes, "2026-11");
  assert.equal(out.rows.length, 2);
  assert.equal(out.rows[0].cuenta, "20000001");
  assert.equal(out.rows[0].tel, "6195550101");
  assert.equal(out.rows[0].promo, "Free filters");
  assert.equal(out.rows[0].detalle, "EMAIL, POST CARD");
  assert.equal(out.rows[0].accion, "2026-11-28");
  assert.equal(out.rows[1].detalle, "WEB");
});

test("el mantenimiento se archiva en el mes en que cumple 6 meses", () => {
  const rows = P.parseTabla("cuenta,nombre,telefono,direccion,producto,fecha\n30000001,Ana Ejemplo,619-555-0101,123 Main St,Fresca Flow,2026-05-15\n");
  const out = P.parseMantRows(rows);
  assert.equal(out.rows.length, 1);
  assert.equal(out.rows[0].vence, "2026-11-15");
  assert.equal(out.rows[0].direccion, "123 Main St");
  assert.equal(out.rows[0].producto, "Fresca Flow");
  assert.equal(P.docId("mant", out.rows[0].vence.slice(0, 7), out.rows[0].cuenta), "mant_2026-11_30000001");
});

test("una fecha de Excel se vuelve día de calendario", () => {
  assert.equal(P.serialToISO(46327), "2026-11-01");
});
