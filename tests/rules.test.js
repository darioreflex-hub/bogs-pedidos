// Pruebas de las reglas de seguridad de Firestore contra el emulador local.
// Ejecutar: npm run test:rules   (levanta el emulador, corre esto y lo apaga)
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { serverTimestamp, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, increment } = require("firebase/firestore");
const fs = require("fs"), path = require("path");

const OWNER = "darioreflex@gmail.com";
const validOrder = () => ({ code: "B-TEST01", status: "nuevo", items: [{ pid: "cheese", name: "Cheese Bog's", q: 1, unit: 11000, opts: [], total: 11000 }], subtotal: 11000, ship: 1800, discount: 0, total: 12800, mode: "delivery", pay: "cash", note: "", customer: { name: "Test", phone: "1155555555", addr: "Calle 1", city: "Burzaco", floor: "", instr: "" }, createdAt: serverTimestamp() });

let env, passed = 0, failed = 0;
async function t(name, fn) { try { await fn(); passed++; console.log("  ✓ " + name); } catch (e) { failed++; console.log("  ✘ " + name + "\n      " + (e.message || e).toString().split("\n")[0]); } }

(async () => {
  env = await initializeTestEnvironment({ projectId: "bogs-pedidos", firestore: { rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8"), host: "127.0.0.1", port: 8085 } });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, "menu/cheese"), { n: "Cheese Bog's", p: 11000, order: 1 });
    await setDoc(doc(db, "settings/store"), { open: true });
    await setDoc(doc(db, "orders/existing"), { ...validOrder(), createdAt: new Date() });
    await setDoc(doc(db, "coupons/HOLA10"), { type: "percent", value: 10, uses: 3, active: true });
    await setDoc(doc(db, "club/1155555555"), { count: 2 });
    await setDoc(doc(db, "admins/cocina@bogs.com.ar"), { addedBy: OWNER });
    await setDoc(doc(db, "admins/uid-matias"), { addedBy: OWNER });
    await setDoc(doc(db, "errors/e1"), { app: "cliente", msg: "x" });
  });
  const anon = env.unauthenticatedContext().firestore();
  const owner = env.authenticatedContext("u1", { email: OWNER, email_verified: true }).firestore();
  const ownerUnverified = env.authenticatedContext("u2", { email: OWNER, email_verified: false }).firestore();
  const staff = env.authenticatedContext("u3", { email: "cocina@bogs.com.ar", email_verified: true }).firestore();
  const stranger = env.authenticatedContext("u4", { email: "otro@gmail.com", email_verified: true }).firestore();
  const synthetic = env.authenticatedContext("uid-matias", { email: "matias@bogs-pedidos.app", email_verified: false }).firestore();
  const syntheticNoAdmin = env.authenticatedContext("uid-otro", { email: "otro@bogs-pedidos.app", email_verified: false }).firestore();

  console.log("Público (sin sesión)");
  await t("lee el menú y la configuración", async () => { await assertSucceeds(getDocs(collection(anon, "menu"))); await assertSucceeds(getDoc(doc(anon, "settings/store"))); });
  await t("no puede escribir el menú ni la configuración", async () => { await assertFails(setDoc(doc(anon, "menu/hack"), { p: 1 })); await assertFails(updateDoc(doc(anon, "settings/store"), { open: false })); });
  await t("crea un pedido válido", () => assertSucceeds(addDoc(collection(anon, "orders"), validOrder())));
  await t("no crea un pedido con estado distinto de nuevo", () => assertFails(addDoc(collection(anon, "orders"), { ...validOrder(), status: "entregado" })));
  await t("no crea un pedido con total inválido", () => assertFails(addDoc(collection(anon, "orders"), { ...validOrder(), total: -5 })));
  await t("no crea un pedido sin fecha del servidor", () => assertFails(addDoc(collection(anon, "orders"), { ...validOrder(), createdAt: new Date() })));
  await t("no crea un pedido sin nombre de cliente", () => assertFails(addDoc(collection(anon, "orders"), { ...validOrder(), customer: { ...validOrder().customer, name: "" } })));
  await t("no crea un pedido con 41 ítems", () => assertFails(addDoc(collection(anon, "orders"), { ...validOrder(), items: Array(41).fill(validOrder().items[0]) })));
  await t("lee un pedido si conoce el id", () => assertSucceeds(getDoc(doc(anon, "orders/existing"))));
  await t("no puede listar pedidos", () => assertFails(getDocs(collection(anon, "orders"))));
  await t("no puede modificar ni borrar un pedido", async () => { await assertFails(updateDoc(doc(anon, "orders/existing"), { status: "entregado" })); await assertFails(deleteDoc(doc(anon, "orders/existing"))); });
  await t("consulta un cupón por código pero no la lista", async () => { await assertSucceeds(getDoc(doc(anon, "coupons/HOLA10"))); await assertFails(getDocs(collection(anon, "coupons"))); });
  await t("suma 1 uso al cupón y nada más", async () => { await assertSucceeds(updateDoc(doc(anon, "coupons/HOLA10"), { uses: 4 })); await assertFails(updateDoc(doc(anon, "coupons/HOLA10"), { uses: 10 })); await assertFails(updateDoc(doc(anon, "coupons/HOLA10"), { uses: 5, value: 90 })); await assertFails(updateDoc(doc(anon, "coupons/HOLA10"), { active: false })); });
  await t("consulta su club por teléfono pero no lo modifica ni lista", async () => { await assertSucceeds(getDoc(doc(anon, "club/1155555555"))); await assertFails(setDoc(doc(anon, "club/1155555555"), { count: 99 })); await assertFails(getDocs(collection(anon, "club"))); });
  await t("registra un error pero no puede leerlos", async () => { await assertSucceeds(addDoc(collection(anon, "errors"), { app: "cliente", msg: "boom", src: "x", ua: "y", at: serverTimestamp() })); await assertFails(getDocs(collection(anon, "errors"))); });
  await t("no ve la lista de administradores", () => assertFails(getDocs(collection(anon, "admins"))));

  console.log("Sesión sin verificar y usuarios ajenos");
  await t("dueño con email sin verificar NO es admin", async () => { await assertFails(getDocs(collection(ownerUnverified, "orders"))); await assertFails(updateDoc(doc(ownerUnverified, "menu/cheese"), { p: 1 })); });
  await t("usuario verificado que no está en admins no es admin", async () => { await assertFails(getDocs(collection(stranger, "orders"))); await assertFails(setDoc(doc(stranger, "admins/otro@gmail.com"), {})); });

  console.log("Administradores");
  await t("dueño verificado lista y actualiza pedidos", async () => { await assertSucceeds(getDocs(collection(owner, "orders"))); await assertSucceeds(updateDoc(doc(owner, "orders/existing"), { status: "cocina" })); });
  await t("dueño edita menú, configuración, cupones, club, admins y errores", async () => { await assertSucceeds(updateDoc(doc(owner, "menu/cheese"), { p: 12000 })); await assertSucceeds(setDoc(doc(owner, "settings/store"), { open: false }, { merge: true })); await assertSucceeds(setDoc(doc(owner, "coupons/NUEVO"), { type: "fixed", value: 500, uses: 0, active: true })); await assertSucceeds(setDoc(doc(owner, "club/1199999999"), { count: 1 })); await assertSucceeds(setDoc(doc(owner, "admins/nuevo@bogs.com.ar"), {})); await assertSucceeds(getDocs(collection(owner, "errors"))); await assertSucceeds(deleteDoc(doc(owner, "errors/e1"))); });
  await t("usuario sin correo con su ID en admins es admin", async () => { await assertSucceeds(getDocs(collection(synthetic, "orders"))); await assertSucceeds(updateDoc(doc(synthetic, "menu/cheese"), { p: 13000 })); });
  await t("usuario sin correo sin su ID en admins NO es admin", async () => { await assertFails(getDocs(collection(syntheticNoAdmin, "orders"))); await assertFails(setDoc(doc(syntheticNoAdmin, "admins/uid-otro"), {})); });
  await t("email agregado en admins (verificado) también es admin", async () => { await assertSucceeds(getDocs(collection(staff, "orders"))); await assertSucceeds(updateDoc(doc(staff, "menu/cheese"), { available: false })); });

  await env.cleanup();
  console.log(`\n${passed} correctas, ${failed} fallidas`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
