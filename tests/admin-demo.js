// Datos de demostración y base de datos simulada para probar el panel sin sesión ni Firestore.
// Se ejecuta DENTRO de la página (page.evaluate), por eso es una función autocontenida.
function injectAdminDemo() {
  const now = Date.now(), m = 60000;
  const TS = t => ({ toMillis: () => t, toDate: () => new Date(t) });
  // --- base simulada: registra cada escritura en window.__calls ---
  window.__calls = [];
  const rec = (op, path, data) => { window.__calls.push({ op, path, data }); return Promise.resolve(); };
  const docRef = path => ({ __p: path, update: d => rec("update", path, d), set: (d, o) => rec("set", path, d), delete: () => rec("delete", path), get: async () => ({ exists: false, data: () => ({}) }) });
  const col = c => ({ doc: id => docRef(c + "/" + id), add: d => rec("add", c, d), orderBy() { return this; }, limit() { return this; }, where() { return this; }, onSnapshot() { return () => {}; } });
  db = { collection: col, // asigna la variable de script del panel (let db), no window.db
    batch: () => { const ops = []; return { update: (r, d) => ops.push({ op: "update", path: r.__p, data: d }), set: (r, d) => ops.push({ op: "set", path: r.__p, data: d }), delete: r => ops.push({ op: "delete", path: r.__p }), commit: () => { ops.forEach(o => window.__calls.push(o)); return Promise.resolve(); } }; },
    runTransaction: async fn => fn({ get: async () => ({ exists: false, data: () => ({}) }), set: (r, d) => window.__calls.push({ op: "set", path: r.__p, data: d }) }) };
  window.alert = () => {}; window.confirm = () => true;
  // --- estado ---
  A.user = { email: "dueno@bogs.com.ar", emailVerified: true };
  A.cfg = { ...D.settings, features: { freeShipAll: false, coupons: false, club: true }, hours: { ...D.settings.hours, auto: true } };
  A.menu = D.menu.map((p, i) => ({ available: i !== 3, hidden: i === 6, ...p, ...(i === 0 ? { oldPrice: 12500, freeShip: true } : {}) }));
  A.coupons = [{ code: "BIENVENIDO", type: "percent", value: 10, minSubtotal: 15000, uses: 12, maxUses: 100, expires: "2026-12-31", active: true }];
  A.admins = ["cocina@bogs.com.ar"]; A.errors = [];
  const it = (pid, name, q, unit, opts = []) => ({ pid, name, q, unit, opts, total: q * unit });
  const O = (code, mins, status, name, phone, mode, pay, items, extra = {}) => { const subtotal = items.reduce((a, i) => a + i.total, 0), ship = mode === "delivery" ? 1800 : 0; return { id: code, code, status, createdAt: TS(now - mins * m), customer: { name, phone, addr: mode === "delivery" ? "Av. Espora 2450, 4° B" : "", city: "Burzaco", floor: "", instr: "" }, mode, pay, items, subtotal, ship, discount: 0, total: subtotal + ship, note: "", ...extra }; };
  A.orders = [
    O("B-K3F9QZ", 2, "nuevo", "Lucas Benítez", "11 4994 8134", "delivery", "mp", [it("doble", "Doble Cheese Bog's", 2, 13000), it("papas", "Papas Bog's", 1, 5000)], { note: "Sin cebolla en una" }),
    O("B-TAMPER", 4, "nuevo", "Hacker Uno", "11 0000 0000", "delivery", "cash", [it("doble", "Doble Cheese Bog's", 1, 1000)]), // precio alterado
    O("B-D4V8LM", 14, "cocina", "Martín Suárez", "11 6666 9876", "delivery", "transfer", [it("bacon", "Bacon Bog's", 1, 14500)], { coupon: "BIENVENIDO" }),
    O("B-Q1W2E3", 22, "cocina", "Sofía Paz", "11 7777 4321", "retiro", "cash", [it("combo2", "Combo Doble", 1, 18000)], { clubReward: true }),
    O("B-Z9X8C7", 31, "camino", "Julián Torres", "11 8888 1111", "delivery", "mp", [it("cheese", "Cheese Bog's", 2, 11000)]),
    O("B-A2S3D4", 38, "listo", "Valentina Gómez", "11 9999 2222", "retiro", "cash", [it("muzza", "Muzza Gigante", 2, 7000)]),
    { ...O("B-PROG01", 30, "nuevo", "Romina Vega", "11 1212 3434", "delivery", "mp", [it("combo2", "Combo Doble", 2, 18000)]), scheduledFor: TS(now + 3 * 3600e3) },
    { ...O("B-PROG02", 200, "nuevo", "Pablo Ibarra", "11 5656 7878", "retiro", "cash", [it("muzza", "Muzza Gigante", 4, 7000)]), scheduledFor: TS(now + 20 * m) },
    O("B-F5G6H7", 95, "entregado", "Nicolás Ruiz", "11 3333 5555", "delivery", "transfer", [it("olympus", "Olympus Triple", 1, 17000)]),
  ];
  A.sales = [...A.orders.filter(o => o.status === "entregado"), O("B-AYER01", 1500, "entregado", "Ana Díaz", "11 2222 3333", "retiro", "cash", [it("pepp", "Pepperoni Gigante", 3, 8000)])];
  A.loaded = true; A.tab = "pedidos"; render();
}
module.exports = { injectAdminDemo };
