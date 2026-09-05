# BOG'S Pedidos

App web móvil de pedidos para BOG'S (smash burgers y pizza estilo New York). Sitio estático: `index.html` + `img/`.
Los pedidos se envían por WhatsApp al 11 4994 8134. Sin backend.

Editar productos y precios: array `P` dentro de `index.html`. Extras: objeto `OPTS`. Envío y umbral de envío gratis: constantes `SHIP` y `FREE`.

## Pruebas móviles (Playwright)

Corren contra el sitio publicado en modo `?e2e=1` (no guardan pedidos ni abren WhatsApp), en iPhone 13 y iPhone SE con motor WebKit (Safari) y Pixel 5 con Chrome.

```bash
cd tests && npm install && npx playwright install webkit chromium && npx playwright test
```

Verifican que la app ocupe exactamente la altura visible (sin franja negra ni barra cortada), que se adapte cuando cambia la altura del viewport, que todas las pantallas mantengan sus barras dentro de la pantalla, y el flujo completo de pedido con toques reales.
