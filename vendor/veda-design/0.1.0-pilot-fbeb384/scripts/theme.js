/*
 * VEDA AI theme switch (v0.1.0). Optional: tokens.css follows the OS setting
 * without it.
 *
 * Load in <head> without `defer` so a saved choice applies before first paint.
 * Markup: <select data-veda-theme-control> with options system | light | dark.
 * Its nearest [data-veda-requires-js] container is un-hidden.
 * The choice is stored when possible; if storage fails it still applies.
 *
 * API: window.VedaTheme.set("system" | "light" | "dark"), .get()
 * Event: document "veda:themechange" with detail { theme }.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "veda-theme";
  const THEMES = ["system", "light", "dark"];
  const root = document.documentElement;

  function read() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return THEMES.includes(saved) ? saved : "system";
    } catch {
      return "system";
    }
  }

  function write(theme) {
    try {
      if (theme === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable: keep the choice for this page view only.
    }
  }

  function apply(theme) {
    if (theme === "system") root.removeAttribute("data-veda-theme");
    else root.setAttribute("data-veda-theme", theme);
  }

  function get() {
    return root.getAttribute("data-veda-theme") || "system";
  }

  function set(theme) {
    if (!THEMES.includes(theme)) return;
    apply(theme);
    write(theme);
    for (const control of document.querySelectorAll("select[data-veda-theme-control]")) {
      control.value = theme;
    }
    document.dispatchEvent(new CustomEvent("veda:themechange", { detail: { theme } }));
  }

  // An explicit attribute in the markup wins over the saved choice.
  if (!root.hasAttribute("data-veda-theme")) apply(read());

  function bind() {
    for (const control of document.querySelectorAll("select[data-veda-theme-control]")) {
      control.value = get();
      control.closest("[data-veda-requires-js]")?.removeAttribute("hidden");
      control.addEventListener("change", () => set(control.value));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();

  window.VedaTheme = { set, get };
})();
