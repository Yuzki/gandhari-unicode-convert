/*
 * VEDA AI display settings (v0.1.0): shared language / color-theme preferences
 * and the settings popover behavior.
 *
 * Load in <head> without `defer`, before theme.js and i18n.js. It has no
 * dependencies and never opens or closes anything when the API is used.
 *
 * Start-up order (an invalid candidate falls through to the next one):
 *   language: ?lang= > explicit initial value > cookie veda-lang
 *             > localStorage veda-lang > navigator.languages > profiles.default
 *   theme:    ?theme= > explicit initial value > cookie veda-theme
 *             > localStorage veda-theme > system
 * Cookies are read and written only when location.hostname is veda-ai.org or a
 * subdomain, and only an explicit choice (UI, API, valid URL value) is saved.
 * Automatic detection never writes a cookie.
 *
 * API: window.VedaSettings.resolveTheme({ explicitTheme }),
 *      .resolveLanguage({ profiles, explicitLanguage, browserLanguages }),
 *      .matchLanguage(profiles, tag), .saveTheme(value), .saveLanguage(value),
 *      .updateUrl(name, value), .isSharedHost(hostname)
 * Resolution returns { value, source } with source one of
 * url | explicit | shared | local | browser | default.
 *
 * Popover: Esc, outside click and tabbing out close the open
 * details[data-veda-settings]; Esc returns focus to its summary. Opening one
 * entry closes the others, so only one panel is ever visible.
 * The open state is never stored. Without this script the details still
 * opens and closes natively via its summary.
 */
(() => {
  "use strict";

  const THEMES = ["system", "light", "dark"];
  const KEYS = { lang: "veda-lang", theme: "veda-theme" };
  const MAX_AGE = 31536000;
  const TAG = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,4}$/;
  const OPEN = "details[data-veda-settings][open]";

  const own = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);

  function isSharedHost(hostname) {
    return typeof hostname === "string" && (hostname === "veda-ai.org" || hostname.endsWith(".veda-ai.org"));
  }

  function canShare() {
    try {
      return isSharedHost(location.hostname);
    } catch {
      return false;
    }
  }

  const validTheme = (value) => (typeof value === "string" && THEMES.includes(value) ? value : null);
  const validTag = (value) => (typeof value === "string" && TAG.test(value) ? value : null);
  const validators = { lang: validTag, theme: validTheme };

  function fromUrl(name) {
    try {
      return validators[name](new URL(location.href).searchParams.get(name));
    } catch {
      return null;
    }
  }

  function fromCookie(name) {
    if (!canShare()) return null;
    try {
      for (const part of String(document.cookie).split(";")) {
        const index = part.indexOf("=");
        if (index < 0 || part.slice(0, index).trim() !== KEYS[name]) continue;
        let value = null;
        try {
          value = validators[name](decodeURIComponent(part.slice(index + 1).trim()));
        } catch {
          // Malformed escape: treat as absent.
        }
        if (value) return value;
      }
    } catch {
      // Cookies unavailable.
    }
    return null;
  }

  function fromLocal(name) {
    try {
      return validators[name](localStorage.getItem(KEYS[name]));
    } catch {
      return null;
    }
  }

  // Exact tag, then primary subtag ("en-GB" -> "en"), then the fallback chain.
  function matchLanguage(profiles, requested) {
    const languages = profiles?.languages;
    if (!validTag(requested) || !languages) return null;
    const supported = (tag) => own(languages, tag) && languages[tag].status === "supported";
    const tag = requested.toLowerCase();
    for (const candidate of [tag, tag.split("-")[0]]) {
      if (supported(candidate)) return candidate;
      const chain = own(languages, candidate) ? languages[candidate].fallback : null;
      const next = Array.isArray(chain) ? chain.find(supported) : null;
      if (next) return next;
    }
    return null;
  }

  function browserList() {
    try {
      const list = navigator.languages;
      if (list && list.length) return Array.from(list);
      return navigator.language ? [navigator.language] : [];
    } catch {
      return [];
    }
  }

  function resolveTheme({ explicitTheme } = {}) {
    const steps = [
      ["url", fromUrl("theme")],
      ["explicit", validTheme(explicitTheme)],
      ["shared", fromCookie("theme")],
      ["local", fromLocal("theme")],
    ];
    for (const [source, value] of steps) if (value) return { value, source };
    return { value: "system", source: "default" };
  }

  function resolveLanguage({ profiles, explicitLanguage, browserLanguages } = {}) {
    const steps = [
      ["url", fromUrl("lang")],
      ["explicit", explicitLanguage],
      ["shared", fromCookie("lang")],
      ["local", fromLocal("lang")],
      ...(browserLanguages ?? browserList()).map((tag) => ["browser", tag]),
    ];
    for (const [source, tag] of steps) {
      const value = matchLanguage(profiles, tag);
      if (value) return { value, source };
    }
    return { value: profiles?.default ?? null, source: "default" };
  }

  function save(name, value) {
    const valid = validators[name](value);
    if (!valid) return;
    try {
      localStorage.setItem(KEYS[name], valid);
    } catch {
      // Storage unavailable: the choice still applies to this page view.
    }
    // No Secure-less fallback: on plain HTTP the choice stays origin-local.
    if (!canShare()) return;
    try {
      if (location.protocol !== "https:") return;
      document.cookie =
        `${KEYS[name]}=${encodeURIComponent(valid)}; Domain=veda-ai.org; Path=/; ` +
        `Max-Age=${MAX_AGE}; SameSite=Lax; Secure`;
    } catch {
      // Cookies blocked or rejected: ignore.
    }
  }

  function updateUrl(name, value) {
    if (!own(validators, name) || !validators[name](value)) return;
    try {
      const url = new URL(location.href);
      if (url.searchParams.get(name) === value) return;
      url.searchParams.set(name, value);
      history.replaceState(history.state, "", url);
    } catch {
      // History unavailable: the choice is already applied and saved.
    }
  }

  const api = {
    isSharedHost,
    matchLanguage,
    resolveTheme,
    resolveLanguage,
    saveTheme: (value) => save("theme", value),
    saveLanguage: (value) => save("lang", value),
    updateUrl,
  };
  (typeof window !== "undefined" ? window : globalThis).VedaSettings = api;

  function closeOutside(target) {
    for (const details of document.querySelectorAll(OPEN)) {
      if (!details.contains(target)) details.open = false;
    }
  }

  // toggle does not bubble: capture it to close the other entries on open.
  document.addEventListener(
    "toggle",
    (event) => {
      const details = event.target;
      if (details?.open && details.matches?.(OPEN)) {
        for (const other of document.querySelectorAll(OPEN)) if (other !== details) other.open = false;
      }
    },
    true,
  );
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const details = document.querySelector(OPEN);
    if (!details) return;
    event.preventDefault();
    details.open = false;
    details.querySelector("summary")?.focus();
  });
  document.addEventListener("pointerdown", (event) => closeOutside(event.target));
  document.addEventListener("focusin", (event) => closeOutside(event.target));
})();
