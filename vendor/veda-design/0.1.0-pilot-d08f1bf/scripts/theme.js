/*
 * VEDA AI theme switch (v0.1.0). Optional: tokens.css follows the OS setting
 * without it.
 *
 * Load in <head> without `defer`, after settings.js, so the resolved choice
 * applies before first paint. Start-up order and sharing: see settings.js.
 * Without settings.js (legacy use) it falls back to origin-local behavior:
 * a valid data-veda-theme attribute > localStorage > system.
 * Markup: <select data-veda-theme-control> with options system | light | dark.
 * Its nearest [data-veda-requires-js] container is un-hidden, and so is the
 * enclosing [data-veda-settings] (display settings <details>) if any.
 * An explicit choice (including "system") is stored when possible; if storage
 * fails it still applies. Start-up never fires an event.
 *
 * API: window.VedaTheme.set("system" | "light" | "dark"), .get()
 * Event: document "veda:themechange" with detail { theme }.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "veda-theme";
  const THEMES = ["system", "light", "dark"];
  const root = document.documentElement;

  const shared = window.VedaSettings;

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
      localStorage.setItem(STORAGE_KEY, theme);
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
    if (shared) {
      shared.saveTheme(theme);
      shared.updateUrl("theme", theme);
    } else write(theme);
    for (const control of document.querySelectorAll("select[data-veda-theme-control]")) {
      control.value = theme;
    }
    document.dispatchEvent(new CustomEvent("veda:themechange", { detail: { theme } }));
  }

  const attribute = root.getAttribute("data-veda-theme");
  if (shared) {
    const { value, source } = shared.resolveTheme({ explicitTheme: attribute });
    apply(value);
    if (source === "url") shared.saveTheme(value);
  } else if (attribute !== "light" && attribute !== "dark") {
    // A valid explicit attribute wins; an invalid one is dropped.
    apply(read());
  }

  function bind() {
    for (const control of document.querySelectorAll("select[data-veda-theme-control]")) {
      control.value = get();
      control.closest("[data-veda-requires-js]")?.removeAttribute("hidden");
      control.closest("[data-veda-settings]")?.removeAttribute("hidden");
      control.addEventListener("change", () => set(control.value));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();

  window.VedaTheme = { set, get };
})();
