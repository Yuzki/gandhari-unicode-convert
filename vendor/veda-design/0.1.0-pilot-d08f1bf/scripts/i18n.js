/*
 * VEDA AI minimal i18n (v0.1.0). Optional: components never depend on it.
 *
 * Markup contract
 *   data-i18n="key"                    replaces textContent (always as text)
 *   data-i18n-attr="attr:key;attr:key" sets attributes (aria-label, placeholder, title...)
 *   <select data-veda-language>        language switcher; its nearest
 *                                      [data-veda-requires-js] container is un-hidden,
 *                                      and so is the enclosing [data-veda-settings]
 * Load settings.js (head, no defer) first. Language priority: ?lang= >
 * shared cookie > saved choice > browser languages > profiles.default (see
 * settings.js); <html lang> only describes the static text, it is not a choice.
 * Without settings.js (legacy use): ?lang= > saved > <html lang> > default.
 * Unsupported languages follow their `fallback` chain in locales/profiles.json.
 * A message missing in the active language falls back along the same chain and
 * the element gets `lang` of the language actually shown.
 * Quoted source text is never touched: only elements with data-i18n* change.
 *
 * API: window.VedaI18n.ready (Promise), .lang, .t(key, params), .setLanguage(lang)
 * Event: document "veda:languagechange" with detail { lang }.
 */
(() => {
  "use strict";

  const script = document.currentScript;
  const base = new URL(script?.dataset.vedaLocales || "../locales/", script?.src || location.href);
  const STORAGE_KEY = "veda-lang";
  const PARAM = "lang";

  const shared = window.VedaSettings;
  const state = { lang: null, profiles: null, messages: {} };

  function readStored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function store(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage may be disabled; the choice still applies to this page view.
    }
  }

  async function loadJson(name) {
    const response = await fetch(new URL(name, base));
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    return response.json();
  }

  function isSupported(lang) {
    const languages = state.profiles?.languages;
    return Object.prototype.hasOwnProperty.call(languages ?? {}, lang) && languages[lang].status === "supported";
  }

  // Exact tag, then primary subtag ("en-GB" -> "en"), then the fallback chain.
  function resolveLanguage(requested) {
    if (!requested) return null;
    if (shared) return shared.matchLanguage(state.profiles, requested);
    const tag = requested.toLowerCase();
    const candidates = [tag, tag.split("-")[0]];
    for (const candidate of candidates) {
      if (isSupported(candidate)) return candidate;
      const profile = state.profiles.languages[candidate];
      const next = profile?.fallback?.find(isSupported);
      if (next) return next;
    }
    return null;
  }

  function chain(lang) {
    const fallback = state.profiles.languages[lang]?.fallback ?? [];
    return [lang, ...fallback.filter((l) => l !== lang)];
  }

  function lookup(messages, key) {
    return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), messages);
  }

  // Returns { text, lang } or null.
  function message(key, params = {}) {
    for (const lang of chain(state.lang)) {
      let value = lookup(state.messages[lang], key);
      if (value == null) continue;
      if (typeof value === "object") {
        const count = Number(params.count ?? 0);
        value = value[new Intl.PluralRules(lang).select(count)] ?? value.other;
      }
      if (typeof value !== "string") continue;
      const numbers = new Intl.NumberFormat(lang);
      const text = value.replace(/\{(\w+)\}/g, (match, name) => {
        if (!(name in params)) return match;
        const param = params[name];
        return typeof param === "number" ? numbers.format(param) : String(param);
      });
      return { text, lang };
    }
    return null;
  }

  function t(key, params) {
    const found = state.lang ? message(key, params) : null;
    if (!found) {
      console.warn(`[veda-i18n] missing message: ${key}`);
      return key;
    }
    return found.text;
  }

  function markLanguage(element, lang) {
    if (lang === state.lang) element.removeAttribute("lang");
    else element.setAttribute("lang", lang);
  }

  function apply(root = document) {
    for (const element of root.querySelectorAll("[data-i18n]")) {
      const found = message(element.dataset.i18n);
      if (!found) {
        console.warn(`[veda-i18n] missing message: ${element.dataset.i18n}`);
        continue;
      }
      element.textContent = found.text;
      markLanguage(element, found.lang);
    }
    for (const element of root.querySelectorAll("[data-i18n-attr]")) {
      for (const pair of element.dataset.i18nAttr.split(";")) {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (!attr || !key) continue;
        const found = message(key);
        if (found) element.setAttribute(attr, found.text);
        else console.warn(`[veda-i18n] missing message: ${key}`);
      }
    }
  }

  function updateUrl(lang) {
    const url = new URL(location.href);
    if (url.searchParams.get(PARAM) === lang) return;
    url.searchParams.set(PARAM, lang);
    history.replaceState(history.state, "", url);
  }

  async function setLanguage(requested, { persist = true } = {}) {
    const lang = resolveLanguage(requested) || state.profiles.default;
    await Promise.all(
      chain(lang)
        .filter((l) => isSupported(l) && !state.messages[l])
        .map(async (l) => {
          state.messages[l] = await loadJson(state.profiles.languages[l].messages);
        }),
    );
    state.lang = lang;
    document.documentElement.lang = lang;
    apply();
    for (const control of document.querySelectorAll("select[data-veda-language]")) {
      control.value = lang;
    }
    if (persist) {
      if (shared) {
        shared.saveLanguage(lang);
        shared.updateUrl(PARAM, lang);
      } else {
        store(lang);
        updateUrl(lang);
      }
    }
    document.dispatchEvent(new CustomEvent("veda:languagechange", { detail: { lang } }));
    return lang;
  }

  function bindControls() {
    for (const control of document.querySelectorAll("select[data-veda-language]")) {
      control.closest("[data-veda-requires-js]")?.removeAttribute("hidden");
      control.closest("[data-veda-settings]")?.removeAttribute("hidden");
      control.addEventListener("change", () => {
        setLanguage(control.value).catch(report);
      });
    }
  }

  function report(error) {
    // Static markup stays usable in the page's original language.
    console.error("[veda-i18n]", error);
  }

  async function init() {
    state.profiles = await loadJson("profiles.json");
    let requested;
    let fromUrl;
    if (shared) {
      const resolved = shared.resolveLanguage({ profiles: state.profiles });
      requested = resolved.value;
      fromUrl = resolved.source === "url";
    } else {
      const params = new URL(location.href).searchParams;
      requested = params.get(PARAM) || readStored() || document.documentElement.lang || state.profiles.default;
      fromUrl = params.has(PARAM);
    }
    const lang = await setLanguage(requested, { persist: fromUrl });
    bindControls();
    return lang;
  }

  const ready = new Promise((resolve) => {
    const start = () => init().then(resolve, (error) => {
      report(error);
      resolve(null);
    });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  });

  window.VedaI18n = {
    ready,
    t,
    apply,
    setLanguage,
    get lang() {
      return state.lang;
    },
  };
})();
