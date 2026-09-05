// Pruebas de layout móvil y flujo de pedido. Corren contra el sitio publicado en modo e2e
// (no escribe pedidos en Firestore ni abre WhatsApp).
const { test, expect } = require("@playwright/test");
const URL = "/?e2e=1";

async function metrics(page) {
  return page.evaluate(() => {
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
    return { vh: window.innerHeight, vw: window.innerWidth, app: r(document.getElementById("app")),
      nav: r(document.querySelector("nav")), glass: r(document.querySelector(".glass")), header: r(document.querySelector("header")),
      scrollW: document.documentElement.scrollWidth, bodyScrollH: document.body.scrollHeight, view: window.S && window.S.view };
  });
}
// La app debe ocupar exactamente la altura visible: sin franja negra abajo ni contenido cortado.
async function expectFlush(page, what) {
  const m = await metrics(page);
  expect(m.app.h, `${what}: alto de #app = viewport`).toBe(m.vh);
  expect(m.scrollW, `${what}: sin scroll horizontal`).toBeLessThanOrEqual(m.vw);
  if (m.nav) { expect(m.nav.bottom, `${what}: nav pegada al borde inferior`).toBe(m.vh); expect(m.nav.top, `${what}: nav dentro del viewport`).toBeGreaterThan(m.vh - 120); }
  if (m.glass) { expect(m.glass.bottom, `${what}: barra de acción pegada al borde (o a la nav)`).toBe(m.nav ? m.nav.top : m.vh); }
  expect(m.header.top, `${what}: header arriba`).toBe(0);
  return m;
}

test.describe("Layout móvil", () => {
  test("inicio: nav y header en pantalla, sin franja negra", async ({ page }) => {
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.goto(URL); await page.waitForSelector("nav");
    await page.waitForTimeout(1500); // firestore + fuentes
    const m = await expectFlush(page, "inicio");
    for (const t of ["Inicio", "Buscar", "Pedido", "Cuenta"]) await expect(page.locator("nav").getByText(t, { exact: true })).toBeInViewport();
    expect(m.nav.h).toBeGreaterThanOrEqual(60);
    expect(errors, "sin errores JS").toEqual([]);
  });

  test("la app se adapta cuando cambia la altura visible (barra de Safari)", async ({ page }) => {
    await page.goto(URL); await page.waitForSelector("nav");
    const vp = page.viewportSize();
    for (const h of [vp.height - 110, vp.height - 40, vp.height + 60, vp.height]) {
      await page.setViewportSize({ width: vp.width, height: h }); await page.waitForTimeout(250);
      await expectFlush(page, `alto ${h}`);
    }
  });

  test("todas las pantallas mantienen sus barras dentro del viewport", async ({ page }) => {
    await page.goto(URL); await page.waitForSelector("nav"); await page.waitForTimeout(800);
    await page.locator("h4", { hasText: "Cheese Bog's" }).first().tap();
    await expect(page.getByText("Precio base")).toBeVisible(); await expectFlush(page, "detalle");
    await page.locator("button", { hasText: /^Agregar\s*\$/ }).tap();
    await page.locator("button", { hasText: "Ver pedido" }).tap(); await expectFlush(page, "carrito");
    await page.locator("button", { hasText: "Continuar" }).last().tap(); await expectFlush(page, "entrega");
    await page.locator("button", { hasText: "Continuar al pago" }).tap(); await page.waitForTimeout(200); // frena por validación, sigue en entrega
    await page.locator("header button").first().tap(); await expectFlush(page, "carrito (volver)");
    for (const t of ["Buscar", "Cuenta", "Inicio"]) { await page.locator("nav").getByText(t, { exact: true }).tap(); await page.waitForTimeout(200); await expectFlush(page, t); }
  });
});

test.describe("Pedido programado", () => {
  test("elegir día y hora, y que el mensaje lo diga", async ({ page }) => {
    await page.goto(URL); await page.waitForSelector("nav"); await page.waitForTimeout(1200);
    await page.evaluate(() => { CFG.open = true; CFG.hours = { ...CFG.hours, auto: false }; CFG.preorder = { enabled: true, lead: 45, maxDays: 2 }; S.cart.push({ pid: "cheese", q: 1, opts: [] }); S.user = { name: "Prog", phone: "1144444444", addr: "Calle 1", city: "Burzaco", floor: "", instr: "" }; go("delivery"); });
    await expect(page.getByText("¿Para cuándo?")).toBeVisible();
    await page.locator("button", { hasText: "Programar" }).tap();
    await expect(page.getByText(/Programado para (hoy|mañana|\w+\.? \d{2}-\d{2}) \d{2}:\d{2}/)).toBeVisible();
    const sel = page.locator("select").last(); const n = await sel.locator("option").count(); expect(n).toBeGreaterThan(1);
    await sel.selectOption({ index: 1 });
    const when = await page.evaluate(() => whenTxt());
    await page.locator("button", { hasText: "Continuar al pago" }).tap();
    await expect(page.getByText(when)).toBeVisible(); // resumen en pago
    await page.locator("button", { hasText: "Efectivo" }).tap();
    await page.locator("button", { hasText: "Confirmar pedido" }).tap();
    await expect(page.locator("h2", { hasText: /Pedido B-/ })).toBeVisible();
    await expect(page.getByText(when)).toBeVisible();
  });
  test("fuera de horario deja programar en vez de rechazar", async ({ page }) => {
    await page.goto(URL); await page.waitForSelector("nav"); await page.waitForTimeout(1200);
    await page.evaluate(() => { CFG.open = true; const hm = d => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); CFG.hours = { auto: true, days: [0, 1, 2, 3, 4, 5, 6], from: hm(new Date(Date.now() + 3 * 3600e3)), to: hm(new Date(Date.now() + 5 * 3600e3)) }; // franja futura: ahora está cerrado CFG.preorder = { enabled: true, lead: 45, maxDays: 2 }; render(); });
    await expect(page.getByText("Podés programar tu pedido")).toBeVisible();
    await page.evaluate(() => { S.cart.push({ pid: "cheese", q: 1, opts: [] }); S.user = { name: "Prog", phone: "1144444444", addr: "Calle 1", city: "Burzaco", floor: "", instr: "" }; go("delivery"); });
    await expect(page.locator("button", { hasText: "Lo antes posible" })).toBeDisabled();
    expect(await page.evaluate(() => !!S.sched)).toBe(true); // se preselecciona el primer turno
  });
});

test.describe("Flujo de pedido con toques reales", () => {
  test("agregar, carrito, datos, pago y confirmación", async ({ page }) => {
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.goto(URL); await page.waitForSelector("nav"); await page.waitForTimeout(800);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    // producto + extra
    await page.locator("h4", { hasText: "Cheese Bog's" }).first().tap();
    await page.locator("button", { hasText: "Extra cheddar" }).tap();
    await expect(page.locator("button", { hasText: /^Agregar\s*\$12\.200/ })).toBeVisible();
    await page.locator("button", { hasText: /^Agregar\s*\$/ }).tap();
    await expect(page.getByText("agregado")).toBeVisible();
    // agregado rápido + carrito
    await page.locator('button[aria-label="Agregar Muzza Gigante"]').tap();
    await page.locator("button", { hasText: "Ver pedido · 2" }).tap();
    await expect(page.getByText("Resumen de costos")).toBeVisible();
    await expect(page.getByText("$19.200").first()).toBeVisible(); // subtotal
    await page.locator("button", { hasText: "Continuar" }).last().tap();
    // validación
    await page.locator("button", { hasText: "Continuar al pago" }).tap();
    await expect(page.getByText("Decinos tu nombre")).toBeVisible();
    await page.locator('input[oninput*="S.user.name"]').fill("Prueba E2E");
    await page.locator('input[oninput*="S.user.phone"]').fill("11 4444 4444");
    await page.locator('input[oninput*="S.user.addr"]').fill("Av. Espora 2450");
    await page.locator("select").selectOption("Glew");
    await expect(page.getByText("$2.800").first()).toBeVisible(); // envío Glew
    await page.locator("button", { hasText: "Retiro por sucursal" }).tap();
    await expect(page.getByText("Total final con envío: (gratis)")).toBeVisible();
    await page.locator("button", { hasText: "Continuar al pago" }).tap();
    // pago
    await page.locator("button", { hasText: "Transferencia" }).tap();
    await expect(page.getByText("Confirmar pedido · $17.280")).toBeVisible(); // 19.200 - 10%
    await page.locator("button", { hasText: "Efectivo" }).tap();
    await expect(page.getByText("Confirmar pedido · $19.200")).toBeVisible();
    await page.locator("button", { hasText: "Confirmar pedido" }).tap();
    await expect(page.locator("h2", { hasText: /Pedido B-[A-Z0-9]{6}/ })).toBeVisible();
    await expect(page.getByText("Seguimiento en vivo")).toBeVisible();
    await expect(page.getByText("Listo para retirar")).toBeVisible();
    await expectFlush(page, "confirmación");
    await page.locator("button", { hasText: "Volver al inicio" }).tap();
    await page.locator("nav").getByText("Cuenta", { exact: true }).tap();
    await expect(page.getByText(/Pedido B-/).first()).toBeVisible();
    expect(errors, "sin errores JS").toEqual([]);
  });
});
