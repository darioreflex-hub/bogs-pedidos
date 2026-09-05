// Login real contra Firebase Auth y Firestore de producción. Solo corre si se pasan credenciales:
//   BOGS_USER=matias BOGS_PASS='...' npx playwright test login.spec.js
// No escribe nada: solo verifica que la cuenta entra y que el panel carga datos reales.
const { test, expect } = require("@playwright/test");
const USER = process.env.BOGS_USER, PASS = process.env.BOGS_PASS;

test.describe("Login real", () => {
  test.skip(!USER || !PASS, "Definí BOGS_USER y BOGS_PASS para correr esta prueba");
  test("entra con usuario sin correo y ve pedidos, menú y configuración reales", async ({ page }) => {
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.goto("/admin"); await page.getByPlaceholder("Usuario o email").fill(USER); await page.getByPlaceholder("Contraseña").fill(PASS);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator("h2", { hasText: "Pedidos" })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Todavía no sos administrador")).toHaveCount(0);
    await expect(page.getByText("Verificá tu email")).toHaveCount(0);
    await page.evaluate(() => { A.tab = "menu"; render(); });
    await expect(page.getByText(/\d+ productos ·/)).toBeVisible();
    await expect(page.locator(".card", { hasText: "Doble Cheese Bog's" }).first()).toBeVisible();
    await page.evaluate(() => { A.tab = "local"; render(); });
    await expect(page.getByText("Zonas de entrega")).toBeVisible();
    await page.evaluate(() => { A.tab = "pedidos"; A.filter = "historial"; render(); });
    await expect(page.getByText(/Cancelado/).first()).toBeVisible(); // los pedidos de prueba cancelados
    expect(errors).toEqual([]);
    await page.evaluate(() => auth.signOut());
    await expect(page.getByText("Panel del local")).toBeVisible();
  });
});
