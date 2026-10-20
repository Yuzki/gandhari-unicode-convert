const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { loadLocale } = require("./helpers/dom-stub");

const ROOT = path.resolve(__dirname, "..");
const en = loadLocale("en");
const ja = loadLocale("ja");

function placeholders(text) {
  return (text.match(/\{\w+\}/g) || []).sort();
}

describe("locale dictionaries", () => {
  it("have the same keys in English and Japanese", () => {
    assert.deepEqual(Object.keys(ja).sort(), Object.keys(en).sort());
  });

  it("have no empty messages", () => {
    for (const [key, text] of Object.entries(en)) assert.ok(text.trim(), "en " + key);
    for (const [key, text] of Object.entries(ja)) assert.ok(text.trim(), "ja " + key);
  });

  it("use the same placeholders in both languages", () => {
    for (const key of Object.keys(en)) {
      assert.deepEqual(placeholders(ja[key]), placeholders(en[key]), key);
    }
  });

  it("declare English and Japanese as supported in profiles.json", () => {
    const profiles = JSON.parse(fs.readFileSync(path.join(ROOT, "locales/profiles.json"), "utf8"));
    assert.equal(profiles.default, "en");
    for (const lang of ["en", "ja"]) {
      assert.equal(profiles.languages[lang].status, "supported");
      assert.equal(profiles.languages[lang].messages, lang + ".json");
    }
  });
});

describe("index.html i18n markup", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  it("only references keys that exist in both dictionaries", () => {
    const keys = [];
    for (const match of html.matchAll(/data-i18n="([^"]+)"/g)) keys.push(match[1]);
    for (const match of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
      for (const pair of match[1].split(";")) keys.push(pair.split(":")[1].trim());
    }
    assert.ok(keys.length > 20);
    for (const key of keys) {
      assert.ok(key in en, "missing in en: " + key);
      assert.ok(key in ja, "missing in ja: " + key);
    }
  });

  it("keeps static English text equal to the English dictionary", () => {
    const title = html.match(/<title data-i18n="([^"]+)">([^<]*)<\/title>/);
    assert.equal(title[2], en[title[1]]);
    let checked = 0;
    for (const match of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]+)</g)) {
      assert.equal(match[2].replace(/\s+/g, " ").trim(), en[match[1]], match[1]);
      checked += 1;
    }
    assert.ok(checked > 15);
    for (const match of html.matchAll(/ ([a-z-]+)="([^"]*)"\s+data-i18n-attr="([a-z-]+):([^"]+)"/g)) {
      assert.equal(match[2], en[match[4]], match[4]);
    }
    assert.match(html, /placeholder="Paste text…"/);
  });

  it("has no unused app dictionary keys (dynamic status keys live in app.js)", () => {
    for (const key of Object.keys(en)) {
      if (!key.startsWith("app.") || /^app\.(text|docx)Status\./.test(key)) continue;
      assert.ok(html.includes('"' + key + '"') || html.includes(":" + key + '"'), "unused: " + key);
    }
  });

  it("points aria-describedby and aria-labelledby at elements that exist", () => {
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    let refs = 0;
    for (const match of html.matchAll(/aria-(?:describedby|labelledby)="([^"]+)"/g)) {
      for (const id of match[1].split(/\s+/)) {
        assert.ok(ids.has(id), "dangling reference: " + id);
        refs += 1;
      }
    }
    assert.ok(refs >= 4);
  });

  it("is an English page that resolves local assets without root-relative URLs", () => {
    assert.match(html, /<html lang="en">/);
    assert.doesNotMatch(html, /(?:href|src)="\/(?!\/)/);
    const attr = html.match(/data-veda-locales="([^"]+)"/)[1];
    const scriptDir = path.join(ROOT, "vendor/veda-design/0.1.0-pilot-d08f1bf/scripts");
    assert.equal(path.resolve(scriptDir, attr), path.join(ROOT, "locales"));
  });
});
