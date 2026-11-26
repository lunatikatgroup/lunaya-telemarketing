const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const { initializeTestEnvironment, assertFails, assertSucceeds } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, collectionGroup } = require("firebase/firestore");

let env, owner, bot, aris, milady, otra, stranger;

const OWNER = "lunatikatgroup@gmail.com";

function db(ctx) { return ctx.firestore(); }

function act(by, extra) {
  return Object.assign({
    by: by, at: Date.now(), tipo: "llamada", resultado: "no", mensaje: "no contestó", clientId: "ana", quien: by, byName: by
  }, extra);
}
function card(by, extra) {
  return Object.assign({
    clientId: "ana", cliente: "Ana", titular: "Ana Lopez", numero: "4111111111111111",
    exp: "12/28", zip: "92101", notas: "", updatedAt: Date.now(), by: by
  }, extra);
}
function orden(by, extra) {
  return Object.assign({
    clientId: "ana", nombre: "Ana", tel: "6195550101", email: "", producto: "Olla", pedido: "",
    carrier: "UPS", tracking: "1Z999", entrega: "2026-11-25", entregado: false, recibio: false,
    recibioAt: 0, recibioBy: "", autopay: false, autopayFecha: "", autopayMetodo: "", notas: "",
    createdAt: Date.now(), updatedAt: Date.now(), by: by
  }, extra);
}
function pago(by, extra) {
  return Object.assign({
    clientId: "ana", nombre: "Ana", fecha: "2026-11-25", at: Date.now(), monto: 40,
    metodo: "link", by: by, nota: "", quien: by
  }, extra);
}
function pedido(by, extra) {
  return Object.assign({
    clientId: "ana", nombre: "Ana", status: "pendiente", url: "", askedBy: by, askedAt: Date.now(),
    filledBy: "", filledAt: 0, nota: ""
  }, extra);
}

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: "lunaya-demo",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 }
  });
  owner = env.authenticatedContext("kat", { email: OWNER });
  bot = env.authenticatedContext("bot1", { email: "bot@example.com" });
  aris = env.authenticatedContext("aris", { email: "arisbel@example.com" });
  milady = env.authenticatedContext("milady", { email: "milady@example.com" });
  otra = env.authenticatedContext("otra", { email: "otra@example.com" });
  stranger = env.authenticatedContext("x", { email: "x@example.com" });
});

test.after(async () => { if (env) await env.cleanup(); });

test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = db(ctx);
    await setDoc(doc(d, "members/bot1"), { role: "bot", jefe: "kat" });
    await setDoc(doc(d, "members/aris"), { role: "tele", name: "Arisbel", email: "arisbel@example.com" });
    await setDoc(doc(d, "members/milady"), { role: "tele", name: "Milady", email: "milady@example.com" });
    await setDoc(doc(d, "members/otra"), { role: "tele", name: "Otra", email: "otra@example.com" });
    await setDoc(doc(d, "members/kat"), { role: "admin" });
    await setDoc(doc(d, "cconfig/main"), {
      staff: {
        "arisbel@example.com": { name: "Arisbel", roles: ["g30"] },
        "milady@example.com": { name: "Milady", roles: ["g60"] },
        "otra@example.com": { name: "Otra", roles: ["post"] }
      },
      tarjetas: ["aris", "milady", "bot1"]
    });
    await setDoc(doc(d, "ccli/ana"), { nombre: "Ana", atraso: 12, skip: false, saldo: 100, payLink: "" });
    await setDoc(doc(d, "ccli/skipme"), { nombre: "Skip", atraso: 20, skip: true, payLink: "" });
  });
});

test("quien está en el equipo puede leer la configuración de cobranza", async () => {
  await assertSucceeds(getDoc(doc(db(aris), "cconfig/main")));
  await assertSucceeds(getDoc(doc(db(milady), "cconfig/main")));
  await assertFails(getDoc(doc(db(env.unauthenticatedContext()), "cconfig/main")));
});

test("solo cobranza no lee telemarketing y solo la dueña quita el área", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = db(ctx);
    await setDoc(doc(d, "members/solo"), { role: "tele", sinTele: true, email: "solo@example.com" });
    await setDoc(doc(d, "members/andres"), { role: "admin", email: "andres@example.com" });
    await setDoc(doc(d, "appts/a1"), { teleId: "aris", socioId: "kat" });
    await setDoc(doc(d, "cconfig/main"), { staff: { "solo@example.com": { name: "Solo", roles: [] } } }, { merge: true });
  });
  const solo = env.authenticatedContext("solo", { email: "solo@example.com" });
  const andres = env.authenticatedContext("andres", { email: "andres@example.com" });
  await assertSucceeds(getDoc(doc(db(solo), "ccli/ana")));
  await assertSucceeds(getDoc(doc(db(solo), "cconfig/main")));
  await assertFails(getDoc(doc(db(solo), "appts/a1")));
  await assertSucceeds(getDoc(doc(db(aris), "appts/a1")));
  await assertFails(updateDoc(doc(db(bot), "members/aris"), { sinTele: true }));
  await assertFails(updateDoc(doc(db(andres), "members/aris"), { sinTele: true }));
  await assertSucceeds(updateDoc(doc(db(owner), "members/solo"), { sinTele: false }));
});

test("quien no está en el equipo no lee cuentas", async () => {
  await assertFails(getDoc(doc(db(stranger), "ccli/ana")));
  await assertFails(getDocs(collection(db(stranger), "ccli")));
});

test("el equipo y el bot leen y escriben cuentas, y solo la dueña borra", async () => {
  await assertSucceeds(getDoc(doc(db(aris), "ccli/ana")));
  await assertSucceeds(setDoc(doc(db(bot), "ccli/nueva"), { nombre: "Nueva", atraso: 4, skip: false, payLink: "", by: "bot@example.com" }));
  await assertSucceeds(updateDoc(doc(db(milady), "ccli/ana"), { atraso: 15 }));
  await assertFails(deleteDoc(doc(db(bot), "ccli/ana")));
  await assertFails(deleteDoc(doc(db(aris), "ccli/ana")));
  await assertSucceeds(deleteDoc(doc(db(owner), "ccli/ana")));
});

test("en skip igual se puede guardar el link y el pago", async () => {
  await assertSucceeds(updateDoc(doc(db(bot), "ccli/skipme"), { payLink: "https://pay.example/a" }));
  await assertSucceeds(addDoc(collection(db(milady), "cpagos"), pago("milady@example.com", { clientId: "skipme" })));
  await assertSucceeds(addDoc(collection(db(aris), "clinkreq"), pedido("arisbel@example.com", { clientId: "skipme" })));
  await assertSucceeds(addDoc(collection(db(bot), "ccli/skipme/act"), act("bot@example.com", { clientId: "skipme", resultado: "pago" })));
});

test("la cuenta no acepta datos de tarjeta", async () => {
  await assertFails(updateDoc(doc(db(bot), "ccli/ana"), { cvv: "123" }));
  await assertFails(updateDoc(doc(db(bot), "ccli/ana"), { numero: "4111111111111111" }));
});

test("las tarjetas las ve quien Katerine marcó, ella siempre, y el bot nunca", async () => {
  await assertSucceeds(setDoc(doc(db(aris), "ctarjetas/c1"), card("arisbel@example.com")));
  await assertSucceeds(getDoc(doc(db(milady), "ctarjetas/c1")));
  await assertSucceeds(getDoc(doc(db(owner), "ctarjetas/c1")));
  await assertFails(getDoc(doc(db(bot), "ctarjetas/c1")));
  await assertFails(getDocs(collection(db(bot), "ctarjetas")));
  await assertFails(getDoc(doc(db(otra), "ctarjetas/c1")));
  await assertFails(setDoc(doc(db(bot), "ctarjetas/c2"), card("bot@example.com")));
  await assertFails(setDoc(doc(db(aris), "ctarjetas/c3"), card("arisbel@example.com", { cvv: "123" })));
  await assertFails(setDoc(doc(db(aris), "ctarjetas/c4"), card("arisbel@example.com", { numero: "4111 1111 1111 1111" })));
  await assertFails(deleteDoc(doc(db(milady), "ctarjetas/c1")));
  await assertSucceeds(deleteDoc(doc(db(owner), "ctarjetas/c1")));
});

test("el bot no cambia la lista de tarjetas ni la configuración", async () => {
  await assertFails(updateDoc(doc(db(bot), "cconfig/main"), { tarjetas: ["bot1"] }));
  await assertFails(setDoc(doc(db(milady), "cconfig/main"), { tarjetas: ["milady"] }, { merge: true }));
  await assertSucceeds(setDoc(doc(db(owner), "cconfig/main"), { tarjetas: ["aris"] }, { merge: true }));
});

test("el vendedor lo cambia la dueña y el bot no", async () => {
  await assertSucceeds(updateDoc(doc(db(owner), "ccli/ana"), { vendedorId: "rebeca", vendedorNombre: "Rebeca", changedBy: OWNER, changedAt: Date.now() }));
  await assertFails(updateDoc(doc(db(bot), "ccli/ana"), { vendedorNombre: "Otra" }));
  await assertFails(updateDoc(doc(db(aris), "ccli/ana"), { vendedorId: "x", vendedorNombre: "X" }));
  await assertSucceeds(updateDoc(doc(db(bot), "ccli/ana"), { atraso: 9 }));
  await assertFails(setDoc(doc(db(bot), "ccli/botcli"), { nombre: "Bot", vendedorId: "rebeca", vendedorNombre: "Rebeca", by: "bot@example.com" }));
});

test("el bot anota pagos automáticos y agenda, y no los borra", async () => {
  const fila = { clientId: "ana", nombre: "Ana", cuenta: "9", dia: 15, fecha: "", monto: 80, metodo: "tarjeta", notas: "", by: "bot@example.com", updatedAt: Date.now() };
  const cita = { fecha: "2026-11-26", hora: "09:00", clientId: "ana", nombre: "Ana", tipo: "llamar", asignada: "arisbel@example.com", notas: "", estado: "pendiente", by: "bot@example.com", createdAt: Date.now(), hechoAt: 0 };
  const ref = await assertSucceeds(addDoc(collection(db(bot), "cautopago"), fila));
  await assertSucceeds(getDoc(doc(db(aris), ref.path)));
  await assertFails(deleteDoc(ref));
  await assertFails(getDoc(doc(db(stranger), ref.path)));
  const ag = await assertSucceeds(addDoc(collection(db(bot), "cagenda"), cita));
  await assertFails(deleteDoc(ag));
  await assertSucceeds(setDoc(doc(db(bot), "cautolink/main"), { url: "https://docs.google.com/spreadsheets/d/abc", by: "bot@example.com", updatedAt: Date.now() }));
});

test("el bot crea postventa y no la borra", async () => {
  const ref = await assertSucceeds(addDoc(collection(db(bot), "cpost"), orden("bot@example.com")));
  await assertFails(deleteDoc(ref));
  await assertSucceeds(addDoc(collection(db(bot), "ccli/ana/act"), act("bot@example.com")));
  await assertSucceeds(getDocs(collectionGroup(db(bot), "act")));
  await assertFails(getDocs(collectionGroup(db(stranger), "act")));
});
