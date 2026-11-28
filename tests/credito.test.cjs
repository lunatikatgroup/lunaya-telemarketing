const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../credito.js");

test("nivel 9 califica con 7 pagos y al día", () => {
  assert.equal(C.califica({ nivel: 9, pagos: 7, saldo: 0 }).ok, true);
  assert.equal(C.califica({ nivel: 9, pagos: 6, saldo: 0 }).ok, false);
  assert.equal(C.califica({ nivel: 8, pagos: 6, saldo: 0 }).ok, true);
  assert.equal(C.califica({ nivel: 4, pagos: 6, saldo: 0 }).ok, true);
  assert.equal(C.califica({ nivel: 3, pagos: 6, saldo: 0 }).ok, false);
  assert.equal(C.califica({ nivel: 8, pagos: 6, saldo: 40, aldia: false }).ok, false);
});

test("el CSV marca quién no califica y no duplica la cuenta", () => {
  const csv = "nombre,cuenta,telefono,correo,direccion,nivel,pagos,ultimo_pago,saldo,emprendedor\nAna Ejemplo,1001,619-555-0101,ana@example.com,123 Main,9,7,2026-11-01,0,Rebeca\nAna Otra,1001,619-555-0101,,,8,6,2026-10-01,0,Rebeca\nLuis Ejemplo,1002,619-555-0199,luis@example.com,456 Oak,9,5,2026-11-02,10,Rebeca\n";
  const out = C.filas(csv);
  assert.equal(out.rows.length, 2);
  assert.equal(out.rows.find(r => r.cuenta === "1001").nombre, "Ana Otra");
  assert.equal(out.rows.find(r => r.cuenta === "1001").califica, true);
  const no = out.rows.find(r => r.cuenta === "1002");
  assert.equal(no.califica, false);
  assert.equal(no.motivo.includes("7 pagos"), true);
});
