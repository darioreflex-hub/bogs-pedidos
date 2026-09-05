// Pruebas del panel de administración. Cargan el panel publicado, inyectan datos de demostración
// y una base simulada que registra cada escritura (ver admin-demo.js). No tocan Firestore real.
const { test, expect } = require("@playwright/test");
const { injectAdminDemo } = require("./admin-demo");
const URL = "/admin?e2e=1";

async function openPanel(page) {
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(URL); await page.waitForSelector("#root"); await page.waitForTimeout(1200);
  await page.evaluate(injectAdminDemo); await page.waitForTimeout(200);
  return errors;
}
const calls = page => page.evaluate(() => window.__calls);
const tab = async (page, name) => { await page.evaluate(n => { A.tab = n; render(); }, name); await page.waitForTimeout(150); };

test.describe("Acceso", () => {
  test("sin sesión muestra el login; con email sin verificar pide verificarlo", async ({ page }) => {
    await page.goto(URL); await page.waitForSelector("#root"); await page.waitForTimeout(1000);
    await expect(page.getByText("Panel del local")).toBeVisible();
    await expect(page.getByPlaceholder("Contraseña")).toBeVisible();
    await page.evaluate(() => { A.user = { email: "x@x.com", emailVerified: false, sendEmailVerification: async () => {}, reload: async () => {} }; render(); });
    await expect(page.getByText("Verificá tu email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ya lo verifiqué" })).toBeVisible();
  });
});

test.describe("Pedidos", () => {
  test("tablero por columnas, alerta de precio alterado y contadores", async ({ page }) => {
    const errors = await openPanel(page);
    await expect(page.locator("h2", { hasText: "Pedidos" })).toBeVisible();
    await expect(page.getByText("Programados · 1")).toBeVisible(); // B-PROG01, para dentro de 3 h
    await expect(page.getByText("Nuevos · 3")).toBeVisible(); // 2 normales + B-PROG02 (vence en 20 min, ya está en preparación)
    await expect(page.locator(".card", { hasText: "B-PROG02" }).getByText(/Programado · hoy/)).toBeVisible();
    await expect(page.getByText("En cocina · 2")).toBeVisible();
    await expect(page.getByText("En camino / Listo · 2")).toBeVisible();
    await expect(page.getByText("Revisar antes de cobrar")).toHaveCount(1); // solo el pedido con precio alterado
    await expect(page.getByText("Cupón BIENVENIDO")).toBeVisible();
    await expect(page.locator("nav .bg-gold", { hasText: "3" })).toBeVisible(); // badge: nuevos listos para preparar (excluye programados lejanos)
    await page.getByRole("button", { name: /historial/i }).click();
    await expect(page.getByText("B-F5G6H7")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("avanzar y cancelar estado escriben en el pedido correcto", async ({ page }) => {
    await openPanel(page);
    const card = page.locator(".card", { hasText: "B-K3F9QZ" });
    await card.getByRole("button", { name: "A la plancha" }).click();
    let c = await calls(page);
    expect(c).toContainEqual(expect.objectContaining({ op: "update", path: "orders/B-K3F9QZ", data: expect.objectContaining({ status: "cocina" }) }));
    const card2 = page.locator(".card", { hasText: "B-Z9X8C7" });
    await card2.getByRole("button", { name: "Entregado" }).click();
    c = await calls(page);
    expect(c).toContainEqual(expect.objectContaining({ path: "orders/B-Z9X8C7", data: expect.objectContaining({ status: "entregado" }) }));
    // club activo: al entregar se acredita el punto por teléfono
    expect(c).toContainEqual(expect.objectContaining({ op: "set", path: "club/1188881111", data: expect.objectContaining({ count: 1 }) }));
  });

  test("comanda imprimible y aviso al cliente por WhatsApp", async ({ page }) => {
    await openPanel(page);
    await page.evaluate(() => { window.__html = ""; window.open = () => ({ document: { write: s => (window.__html += s), close() {} } }); });
    await page.locator(".card", { hasText: "B-K3F9QZ" }).getByTitle("Imprimir comanda").click();
    let html;
    await page.locator(".card", { hasText: "B-PROG02" }).getByTitle("Imprimir comanda").click();
    expect(await page.evaluate(() => window.__html)).toMatch(/PROGRAMADO PARA HOY \d{2}:\d{2}/);
    await page.evaluate(() => { window.__html = ""; });
    await page.locator(".card", { hasText: "B-K3F9QZ" }).getByTitle("Imprimir comanda").click();
    expect(html = await page.evaluate(() => window.__html)).toBeTruthy();
    expect(html).toContain("B-K3F9QZ"); expect(html).toContain("DELIVERY"); expect(html).toContain("Sin cebolla"); expect(html).toContain("$31.000");
    const aviso = page.locator(".card", { hasText: "B-Z9X8C7" }).getByRole("link", { name: /Avisar/ });
    await expect(aviso).toHaveAttribute("href", /wa\.me\/5491188881111\?text=.*B-Z9X8C7/);
  });
});

test.describe("Ventas", () => {
  test("indicadores y exportación CSV", async ({ page }) => {
    await openPanel(page); await tab(page, "ventas");
    await expect(page.getByText("Facturado")).toBeVisible();
    await expect(page.getByText("$42.800")).toBeVisible(); // 18.800 + 24.000 entregados
    await expect(page.getByText("Más vendidos")).toBeVisible();
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    expect((await dl).suggestedFilename()).toMatch(/^ventas-bogs-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

test.describe("Menú", () => {
  test("cambiar estado del producto", async ({ page }) => {
    await openPanel(page); await tab(page, "menu");
    await expect(page.getByText("14 productos")).toBeVisible();
    const row = page.locator(".card", { hasText: "Cheese Bog's" }).first();
    await row.locator("select").first().selectOption("oculto");
    expect(await calls(page)).toContainEqual(expect.objectContaining({ op: "update", path: "menu/cheese", data: { available: true, hidden: true } }));
  });

  test("editor de ficha guarda precio, eslogan y extras", async ({ page }) => {
    await openPanel(page); await tab(page, "menu");
    await page.locator(".card", { hasText: "Doble Cheese Bog's" }).first().getByRole("button", { name: "Editar ficha" }).click();
    const ed = page.locator("#edit-doble"); await expect(ed).toBeVisible();
    await ed.locator('input[oninput*="A.draft.p="]').fill("14000");
    await ed.locator('input[oninput*="A.draft.slogan"]').fill("Probando eslogan");
    await ed.getByRole("button", { name: "Extra" }).click();
    const rows = ed.locator('input[oninput*="A.draft.extras"][placeholder="Nombre"]');
    await rows.last().fill("Huevo frito");
    await ed.locator('input[oninput*="A.draft.extras"][placeholder="$"]').last().fill("1500");
    await ed.getByRole("button", { name: "Guardar ficha" }).click();
    const c = await calls(page);
    const save = c.find(x => x.op === "update" && x.path === "menu/doble");
    expect(save).toBeTruthy();
    expect(save.data.p).toBe(14000);
    expect(save.data.slogan).toBe("Probando eslogan");
    expect(save.data.extras).toContainEqual({ n: "Huevo frito", d: "", p: 1500, ic: "layers" });
    expect(save.data.specs[0]).toEqual({ ic: "lunch_dining", t: "240g Carne", s: "Doble smash" });
    expect(save.data.extras.length).toBe(5); // 4 por defecto + 1 nuevo
  });
});

test.describe("Promos, Local, Admins, Salud", () => {
  test("interruptores y cupones", async ({ page }) => {
    await openPanel(page); await tab(page, "promos");
    await page.locator('button[onclick="togF(\'coupons\')"]').click();
    expect(await calls(page)).toContainEqual(expect.objectContaining({ op: "set", path: "settings/store", data: { features: expect.objectContaining({ coupons: true }) } }));
    await page.locator("#cCode").fill("prueba10"); await page.locator("#cType").selectOption("percent"); await page.locator("#cVal").fill("10"); await page.locator("#cMin").fill("12000");
    await page.getByRole("button", { name: "Crear cupón" }).click();
    expect(await calls(page)).toContainEqual(expect.objectContaining({ op: "set", path: "coupons/PRUEBA10", data: expect.objectContaining({ type: "percent", value: 10, minSubtotal: 12000, active: true }) }));
    await expect(page.getByText("BIENVENIDO")).toBeVisible();
  });

  test("demora rápida, zonas y guardado del local", async ({ page }) => {
    await openPanel(page);
    await page.locator('select[title="Demora estimada"]').selectOption("60–75 min");
    expect(await calls(page)).toContainEqual(expect.objectContaining({ path: "settings/store", data: { eta: "60–75 min" } }));
    await tab(page, "local");
    await expect(page.getByText("Zonas de entrega")).toBeVisible();
    await page.getByRole("button", { name: "Zona" }).click();
    const inputs = page.locator('input[onchange*="A.cfg.zones"]');
    await inputs.nth(-2).fill("Temperley"); await inputs.nth(-2).dispatchEvent("change");
    await inputs.last().fill("3000"); await inputs.last().dispatchEvent("change");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    const c = await calls(page); const save = c.filter(x => x.path === "settings/store").pop();
    expect(save.data.zones).toContainEqual({ name: "Temperley", cost: 3000 });
    expect(save.data.hours.auto).toBe(true);
  });

  test("alta de administrador y pestaña Salud", async ({ page }) => {
    await openPanel(page); await tab(page, "admins");
    await page.locator("#newAdmin").fill("Nuevo@Bogs.com.ar"); await page.getByRole("button", { name: "Agregar" }).click();
    expect(await calls(page)).toContainEqual(expect.objectContaining({ op: "set", path: "admins/nuevo@bogs.com.ar" }));
    await tab(page, "salud");
    await expect(page.getByText("Sin errores reportados")).toBeVisible();
    await page.evaluate(() => { const T = { toMillis: () => Date.now() - 60000, toDate: () => new Date() }; A.errors = [{ id: "1", app: "cliente", msg: "TypeError: x is undefined", src: "index:10", ua: "Mozilla (iPhone; CPU iPhone OS 26_6)", ver: "123", view: "cart", at: T }, { id: "2", app: "cliente", msg: "TypeError: x is undefined", src: "index:10", ua: "Mozilla (Linux; Android 15)", ver: "123", view: "home", at: T }]; render(); });
    await expect(page.getByText("TypeError: x is undefined")).toHaveCount(1); // agrupado
    await expect(page.getByText(/2 veces/)).toBeVisible();
    await page.getByRole("button", { name: "Limpiar" }).click();
    expect((await calls(page)).filter(x => x.op === "delete" && x.path.startsWith("errors/")).length).toBe(2);
  });
});
