const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const VENDOR = path.join(ROOT, "vendor/veda-design/0.1.0-pilot-af6d1dc/scripts");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const profiles = JSON.parse(fs.readFileSync(path.join(ROOT, "locales/profiles.json"), "utf8"));

const read = (name) => fs.readFileSync(path.join(VENDOR, name), "utf8");

// Browser stub that runs the shipped settings.js / theme.js / i18n.js.
// `cookies` holds name=value pairs the (stub) browser would send; writes are logged.
function setup({
  url = "https://example.test/gandhari-unicode-convert/",
  cookie = "",
  local = {},
  languages = ["en-US"],
  theme = null,
  storageDenied = false,
  state = { keep: 1 },
} = {}) {
  const location = new URL(url);
  const store = { ...local };
  const cookieWrites = [];
  const events = [];
  const root = {
    attrs: theme ? { "data-veda-theme": theme } : {},
    lang: "en",
    getAttribute(n) {
      return n in this.attrs ? this.attrs[n] : null;
    },
    setAttribute(n, v) {
      this.attrs[n] = v;
    },
    removeAttribute(n) {
      delete this.attrs[n];
    },
  };
  const document = {
    readyState: "complete",
    documentElement: root,
    currentScript: null,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener() {},
    dispatchEvent: (e) => events.push(e),
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      cookieWrites.push(value);
    },
  };
  const localStorage = {
    getItem(k) {
      if (storageDenied) throw new Error("denied");
      return k in store ? store[k] : null;
    },
    setItem(k, v) {
      if (storageDenied) throw new Error("denied");
      store[k] = String(v);
    },
  };
  const history = {
    state,
    replaced: [],
    replaceState(s, t, u) {
      this.replaced.push({ s, u: String(u) });
      location.href = String(u);
    },
  };
  // Mutable location so replaceState is reflected in later reads.
  const loc = {
    get href() {
      return location.href;
    },
    set href(v) {
      location.href = v;
    },
    get hostname() {
      return location.hostname;
    },
    get protocol() {
      return location.protocol;
    },
  };
  const window = {};
  const context = {
    URL,
    URLSearchParams,
    CustomEvent: class {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    console: { warn() {}, error() {} },
    Intl,
    document,
    localStorage,
    location: loc,
    history,
    navigator: { languages, language: languages[0] },
    window,
    fetch: async (u) => {
      const file = path.basename(new URL(u).pathname);
      const text = fs.readFileSync(path.join(ROOT, "locales", file), "utf8");
      return { ok: true, json: async () => JSON.parse(text) };
    },
  };
  window.document = document;
  vm.createContext(context);
  const run = (name) => vm.runInContext(read(name), context, { filename: name });
  return { context, window, root, store, cookieWrites, history, events, run, document };
}

const COOKIE_URL = "https://gandhari.veda-ai.org/";

function boot(options) {
  const env = setup(options);
  env.run("settings.js");
  env.run("theme.js");
  return env;
}

describe("index.html script wiring", () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
  const find = (name) => scripts.filter((s) => s.includes(`/scripts/${name}`));

  it("loads each shared script once from the same snapshot", () => {
    for (const name of ["settings.js", "theme.js", "i18n.js", "report.js"]) {
      assert.equal(find(name).length, 1, name);
    }
    const dirs = new Set(html.match(/vendor\/veda-design\/[^/"]+/g));
    assert.deepEqual([...dirs], ["vendor/veda-design/0.1.0-pilot-af6d1dc"]);
  });

  it("runs settings.js synchronously before theme.js; i18n.js stays deferred", () => {
    assert.ok(html.indexOf("scripts/settings.js") < html.indexOf("scripts/theme.js"));
    assert.doesNotMatch(find("settings.js")[0], /\b(defer|async)\b/);
    assert.doesNotMatch(find("theme.js")[0], /\b(defer|async)\b/);
    assert.match(html.match(/<script[^>]*i18n\.js[\s\S]*?<\/script>/)[0], /\bdefer\b/);
  });

  it("does not hardcode a theme in the markup", () => {
    assert.doesNotMatch(html, /<html[^>]*data-veda-theme/);
  });
});

describe("language resolution (shipped i18n.js)", () => {
  async function language(options) {
    const env = setup(options);
    env.run("settings.js");
    env.run("theme.js");
    env.context.document.readyState = "complete";
    env.run("i18n.js");
    const lang = await env.window.VedaI18n.ready;
    return { env, lang };
  }

  it("detects Japanese from the browser despite static English markup", async () => {
    const { env, lang } = await language({ languages: ["ja-JP", "en"] });
    assert.equal(lang, "ja");
    assert.equal(env.root.lang, "ja");
  });

  it("maps en-US to en and unsupported languages to the profile default", async () => {
    assert.equal((await language({ languages: ["en-US"] })).lang, "en");
    assert.equal((await language({ languages: ["fr-FR", "de"] })).lang, profiles.default);
  });

  it("lets a shared cookie beat conflicting localStorage and browser", async () => {
    const { lang } = await language({
      url: COOKIE_URL,
      cookie: "veda-lang=en",
      local: { "veda-lang": "ja" },
      languages: ["ja-JP"],
    });
    assert.equal(lang, "en");
  });

  it("lets a valid URL beat cookies; invalid URL values fall through", async () => {
    const win = await language({ url: COOKIE_URL + "?lang=en", cookie: "veda-lang=ja" });
    assert.equal(win.lang, "en");
    const bad = await language({ url: COOKIE_URL + "?lang=!!", cookie: "veda-lang=ja" });
    assert.equal(bad.lang, "ja");
    const unsupported = await language({ url: COOKIE_URL + "?lang=fr", cookie: "veda-lang=ja" });
    assert.equal(unsupported.lang, "ja");
  });

  it("uses existing localStorage without a cookie and saves nothing automatically", async () => {
    const { env, lang } = await language({ local: { "veda-lang": "ja" }, languages: ["en"] });
    assert.equal(lang, "ja");
    assert.deepEqual(env.cookieWrites, []);
    assert.equal(env.store["veda-lang"], "ja");
    const fresh = await language({ url: COOKIE_URL, languages: ["ja-JP"] });
    assert.equal(fresh.lang, "ja");
    assert.deepEqual(fresh.env.cookieWrites, []);
    assert.deepEqual(fresh.env.store, {});
    assert.deepEqual(fresh.env.history.replaced, []);
  });

  it("persists an explicit setLanguage choice and updates only ?lang", async () => {
    const { env } = await language({
      url: COOKIE_URL + "?x=1&theme=dark#frag",
      languages: ["ja"],
    });
    await env.window.VedaI18n.setLanguage("en");
    assert.equal(env.store["veda-lang"], "en");
    assert.ok(env.cookieWrites.some((c) => c.startsWith("veda-lang=en;")));
    const last = env.history.replaced.at(-1);
    assert.equal(last.u, COOKIE_URL + "?x=1&theme=dark&lang=en#frag");
    assert.deepEqual(last.s, { keep: 1 });
  });

  it("keeps working when storage is denied", async () => {
    const { lang } = await language({ storageDenied: true, languages: ["ja"] });
    assert.equal(lang, "ja");
  });
});

describe("theme resolution (shipped theme.js)", () => {
  it("defaults to system without attribute and saves nothing", () => {
    const env = boot({ url: COOKIE_URL });
    assert.equal(env.window.VedaTheme.get(), "system");
    assert.equal(env.root.getAttribute("data-veda-theme"), null);
    assert.deepEqual(env.cookieWrites, []);
    assert.deepEqual(env.store, {});
  });

  it("lets a shared cookie beat stale localStorage", () => {
    const env = boot({ url: COOKIE_URL, cookie: "veda-theme=dark", local: { "veda-theme": "light" } });
    assert.equal(env.window.VedaTheme.get(), "dark");
    assert.deepEqual(env.cookieWrites, []);
    assert.equal(env.store["veda-theme"], "light");
  });

  it("falls back to existing localStorage, then system", () => {
    assert.equal(boot({ local: { "veda-theme": "dark" } }).window.VedaTheme.get(), "dark");
    assert.equal(boot({ local: { "veda-theme": "bogus" } }).window.VedaTheme.get(), "system");
  });

  it("lets a valid URL value win and save, and ignores an invalid one", () => {
    const env = boot({ url: COOKIE_URL + "?theme=dark", cookie: "veda-theme=light" });
    assert.equal(env.window.VedaTheme.get(), "dark");
    assert.equal(env.store["veda-theme"], "dark");
    assert.equal(env.cookieWrites.length, 1);
    const bad = boot({ url: COOKIE_URL + "?theme=neon", cookie: "veda-theme=light" });
    assert.equal(bad.window.VedaTheme.get(), "light");
  });

  it("invalid theme and language URL values fall through independently", () => {
    const env = boot({ url: COOKIE_URL + "?theme=neon&lang=ja", cookie: "veda-theme=dark; veda-lang=en" });
    assert.equal(env.window.VedaTheme.get(), "dark");
    assert.equal(env.window.VedaSettings.resolveLanguage({ profiles }).value, "ja");
  });

  it("saves an explicit system choice and removes the attribute", () => {
    const env = boot({ url: COOKIE_URL, cookie: "veda-theme=dark" });
    env.window.VedaTheme.set("system");
    assert.equal(env.root.getAttribute("data-veda-theme"), null);
    assert.equal(env.store["veda-theme"], "system");
    assert.match(env.cookieWrites[0], /^veda-theme=system;/);
    assert.equal(env.events.at(-1).detail.theme, "system");
  });

  it("updates only ?theme, preserving other parameters, hash and state", () => {
    const env = boot({ url: COOKIE_URL + "?lang=ja&x=1#top" });
    env.window.VedaTheme.set("dark");
    const last = env.history.replaced.at(-1);
    assert.equal(last.u, COOKIE_URL + "?lang=ja&x=1&theme=dark#top");
    assert.deepEqual(last.s, { keep: 1 });
  });

  it("keeps working when storage is denied", () => {
    const env = boot({ storageDenied: true });
    env.window.VedaTheme.set("dark");
    assert.equal(env.window.VedaTheme.get(), "dark");
  });
});

describe("shared cookie boundaries", () => {
  it("writes the documented cookie attributes on HTTPS veda-ai.org subdomains", () => {
    for (const host of ["https://veda-ai.org/", COOKIE_URL]) {
      const env = boot({ url: host });
      env.window.VedaTheme.set("dark");
      assert.equal(
        env.cookieWrites[0],
        "veda-theme=dark; Domain=veda-ai.org; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
      );
      assert.doesNotMatch(env.cookieWrites[0], /HttpOnly/i);
    }
  });

  it("creates no shared cookie over HTTP or outside the domain", () => {
    for (const url of [
      "http://gandhari.veda-ai.org/",
      "https://yuzki.github.io/gandhari-unicode-convert/",
      "http://localhost:8000/",
      "https://evilveda-ai.org/",
      "https://veda-ai.org.example.test/",
    ]) {
      const env = boot({ url });
      env.window.VedaTheme.set("dark");
      assert.deepEqual(env.cookieWrites, [], url);
      assert.equal(env.store["veda-theme"], "dark", url);
    }
  });

  it("ignores cookies outside the shared domain", () => {
    const env = boot({ url: "https://yuzki.github.io/gandhari-unicode-convert/", cookie: "veda-theme=dark" });
    assert.equal(env.window.VedaTheme.get(), "system");
  });
});
