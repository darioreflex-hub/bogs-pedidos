/** Config compartida de la app (index.html) y el panel (admin.html). Antes vivía en cada <script> del CDN. */
module.exports = {
  content: ["../index.html", "../admin.html"],
  theme: { extend: {
    colors: {
      surface: "#141311", "surface-bright": "#3b3936", "surface-container-lowest": "#0f0e0c", "surface-container-low": "#1d1b19", "surface-container": "#211f1d", "surface-container-high": "#2b2a27", "surface-container-highest": "#363431",
      "on-surface": "#e7e2dd", "on-surface-variant": "#d4c4af", outline: "#9c8f7b", "outline-variant": "#504535",
      primary: "#ffcc72", "on-primary": "#422c00", "primary-container": "#e9ae3b", secondary: "#e6c26c", "on-secondary": "#3e2e00", tertiary: "#ffc6be",
      "error-container": "#93000a", "on-error-container": "#ffdad6", wa: "#25d366",
      // panel
      "surface-low": "#1d1b19", "surface-c": "#211f1d", "surface-high": "#2b2a27", "surface-hi": "#363431", muted: "#d4c4af", gold: "#e9ae3b", red: "#93000a", "on-red": "#ffdad6"
    },
    fontFamily: { anton: ["Anton", "Impact", "sans-serif"], grot: ["Space Grotesk", "system-ui", "sans-serif"] }
  } },
  corePlugins: { preflight: true }
};
