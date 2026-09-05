# BOG'S Pedidos

App web móvil de pedidos para BOG'S (smash burgers y pizza estilo New York). Sitio estático: `index.html` + `img/`.
Los pedidos se envían por WhatsApp al 11 4994 8134. Sin backend.

Editar productos y precios: array `P` dentro de `index.html`. Extras: objeto `OPTS`. Envío y umbral de envío gratis: constantes `SHIP` y `FREE`.

## Pruebas

Tres suites, todas contra el sitio publicado salvo las reglas:

```bash
cd tests && npm install && npx playwright install webkit chromium
npx playwright test          # app móvil (iPhone 13, iPhone SE en WebKit; Pixel 5 en Chrome) + panel (Chrome escritorio)
npm run test:rules           # reglas de Firestore en el emulador local (requiere Java)
```

- `mobile.spec.js`: la app ocupa la altura visible sin franjas, se adapta al cambio de viewport, todas las pantallas mantienen sus barras, y el flujo completo de pedido con toques reales. Usa `?e2e=1` (no guarda pedidos ni abre WhatsApp).
- `admin.spec.js`: el panel con datos de demostración y una base simulada que registra cada escritura (`admin-demo.js`): tablero, cambio de estado, comanda, aviso por WhatsApp, ventas y CSV, menú y editor de ficha, promos y cupones, local, admins y Salud.
- `rules.test.js`: 21 casos de lo que cada tipo de usuario puede y no puede leer o escribir.

## Estilos

Tailwind se compila a `tw.css` (sin CDN). Tras cambiar clases en `index.html` o `admin.html`:

```bash
cd build && npm install && npm run css
```
