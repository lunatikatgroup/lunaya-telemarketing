const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../cobranza/logic.js");

test("el grupo sale de los días de atraso", () => {
  assert.equal(C.bucketOf(0), "aldia");
  assert.equal(C.bucketOf(-3), "aldia");
  assert.equal(C.bucketOf(1), "g30");
  assert.equal(C.bucketOf(30), "g30");
  assert.equal(C.bucketOf(31), "g60");
  assert.equal(C.bucketOf(60), "g60");
  assert.equal(C.bucketOf(61), "g90");
});

test("el color respeta el orden: skip, update, promesa, sin contestar, al día", () => {
  assert.equal(C.toneOf({ skip: true, updateOn: true, atraso: 0 }), "rojo");
  assert.equal(C.toneOf({ updateOn: true, updateAprobado: false, sinContestar: 5, atraso: 40 }), "azul");
  assert.equal(C.toneOf({ updateOn: true, updateAprobado: true, promesa: { fecha: "2026-12-01", ok: false }, atraso: 10 }), "amarillo");
  assert.equal(C.toneOf({ sinContestar: 3, atraso: 12 }), "naranja");
  assert.equal(C.toneOf({ sinContestar: 2, atraso: 12 }), "normal");
  assert.equal(C.toneOf({ atraso: 0 }), "verde");
  assert.equal(C.toneOf({ etapa: "cerrado", atraso: 80 }), "verde");
  assert.equal(C.toneOf({ skip: "sí", atraso: 0 }), "rojo");
});

test("en skip el mensaje sigue llevando el link y pide llamar a Hy Cite", () => {
  const c = { nombre: "Ana", cuenta: "9", saldo: 10, payLink: "https://pay.example/a", skip: true };
  assert.equal(C.canPay(c), true);
  const msg = C.mensajeCliente(c, "Arisbel");
  assert.equal(msg.includes("https://pay.example/a"), true);
  assert.equal(msg.includes("llamar a Hy Cite"), true);
  assert.equal(msg.includes("Hy Cite #29733"), true);
  assert.equal(C.mensajeCliente({ payLink: "javascript:alert(1)" }).includes("javascript:"), false);
});

test("la tarjeta se muestra con los últimos 4", () => {
  assert.equal(C.maskCard("4111111111111111"), "•••• •••• •••• 1111");
  assert.equal(C.maskCard("4111 1111 1111 4242"), "•••• •••• •••• 4242");
  assert.equal(C.digitsCard("4111 1111 1111 4242"), "4111111111114242");
  assert.equal(C.maskCard("12"), "••••");
});

test("el CSV y el JSON arman la cuenta y tiran la tarjeta", () => {
  const csv = C.parseTable('nombre,cuenta,telefono,dias,saldo,skip,link\n"López, Ana",A-1,619-555-0101,40,"$320.50",si,https://pay.example/x\n', "clientes");
  assert.equal(csv.errors.length, 0);
  assert.equal(csv.rows.length, 1);
  assert.equal(csv.rows[0].nombre, "López, Ana");
  assert.equal(csv.rows[0].atraso, 40);
  assert.equal(csv.rows[0].saldo, 320.5);
  assert.equal(csv.rows[0].skip, true);
  assert.equal(csv.rows[0].payLink, "https://pay.example/x");

  const json = C.parseTable(JSON.stringify([{ nombre: "Bo", cuenta: "2", numero: "4111111111111111", cvv: "123", dias: 5 }]), "clientes");
  assert.equal(json.rows[0].cuenta, "2");
  assert.equal(json.rows[0].atraso, 5);
  assert.equal(json.rows[0].numero, undefined);
  assert.equal(json.rows[0].cvv, undefined);
  assert.equal(json.warnings.length > 0, true);
});

test("la actividad reconoce el resultado", () => {
  const out = C.parseTable(JSON.stringify([{ cuenta: "2", tipo: "WhatsApp", resultado: "No contestó", mensaje: "dejé texto", fecha: "2026-11-25" }]), "actividad");
  assert.equal(out.errors.length, 0);
  assert.equal(out.rows[0].tipo, "whatsapp");
  assert.equal(out.rows[0].resultado, "no");
  assert.equal(out.rows[0].fecha, "2026-11-25");
  assert.equal(out.rows[0].at, null);
});

test("la importación guarda teléfono, dirección completa y correo", () => {
  const csv = C.parseTable("nombre,telefono,correo,direccion,ciudad,estado,zip\nAna,619-555-0101,ana@example.com,123 Main St,San Diego,CA,92101\n", "clientes");
  assert.equal(csv.errors.length, 0);
  assert.equal(csv.rows[0].tel, "619-555-0101");
  assert.equal(csv.rows[0].email, "ana@example.com");
  assert.equal(csv.rows[0].direccion, "123 Main St, San Diego, CA, 92101");
  assert.equal(csv.rows[0]._keys.includes("direccion"), true);
});

test("el nombre de la cita junta el apellido cuando existe", () => {
  assert.equal(C.nombreCompleto({ client: "Rosario", apellido: "García" }), "Rosario García");
  assert.equal(C.nombreCompleto({ client: "Janet" }), "Janet");
  assert.equal(C.nombreCompleto({ client: "Noe", nomVenta: "Noe Ramírez" }), "Noe Ramírez");
  assert.equal(C.nombreMasLargo("Rosa", "Rosario García"), "Rosa");
  assert.equal(C.nombreMasLargo("Noe", "Noe Ramírez"), "Noe Ramírez");
});

test("la revisión del pago automático es al día siguiente", () => {
  assert.equal(C.revisionFecha({ dia: 15 }, "2026-11-25"), "2026-11-16");
  assert.equal(C.revisionFecha({ fecha: "2026-11-30" }, "2026-11-25"), "2026-12-01");
  assert.equal(C.revisionFecha({ dia: 31 }, "2026-11-02"), "2026-12-01");
  assert.equal(C.revisionFecha({}, "2026-11-25"), "");
});

test("la pestaña de Cobranza sale si el correo está en el equipo", () => {
  const staff = { "arisbel@example.com": { name: "Arisbel" }, "milady@example.com": { name: "Milady" } };
  assert.equal(C.enStaffCobranza("arisbel@example.com", staff), true);
  assert.equal(C.enStaffCobranza("Arisbel@Example.com", staff), true);
  assert.equal(C.enStaffCobranza("otra@example.com", staff), false);
  assert.equal(C.enStaffCobranza("milady@example.com", null), false);
  assert.equal(C.enStaffCobranza("", staff), false);
});

test("Arisbel y Milady se marcan si hay una sola de cada una", () => {
  const both = C.sugerirTarjetas({
    a1: { name: "Arisbel Ruiz", email: "a@example.com", role: "tele" },
    m1: { name: "Otra", email: "milady@example.com", role: "tele" },
    k: { name: "Katerine", role: "admin" }
  });
  assert.deepEqual(both.uids.sort(), ["a1", "m1"]);
  assert.equal(both.notes.length, 0);

  const none = C.sugerirTarjetas({ k: { name: "Katerine", role: "admin" } });
  assert.deepEqual(none.uids, []);
  assert.equal(none.notes.length, 2);
  assert.equal(none.notes.some(n => n.includes("Arisbel")), true);
  assert.equal(none.notes.some(n => n.includes("Milady")), true);

  const bot = C.sugerirTarjetas({
    b: { name: "Arisbel Bot", role: "bot" },
    m1: { name: "Milady", role: "tele" }
  });
  assert.deepEqual(bot.uids, ["m1"]);
  assert.equal(bot.notes.some(n => n.includes("Arisbel") && n.includes("bot")), true);

  const dos = C.sugerirTarjetas({
    a1: { name: "Arisbel Uno", role: "tele" },
    a2: { name: "Arisbel Dos", role: "tele" },
    m1: { name: "Milady", role: "tele" }
  });
  assert.deepEqual(dos.uids, ["m1"]);
  assert.equal(dos.notes.some(n => n.includes("más de una")), true);
});
