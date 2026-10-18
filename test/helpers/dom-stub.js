const fs = require("fs");
const vm = require("vm");
const path = require("path");

const JS_DIR = path.resolve(__dirname, "../../js");
const LOCALES_DIR = path.resolve(__dirname, "../../locales");

// Minimal element: attributes, children, listeners, focus and text content.
class Element {
  constructor(document, id) {
    this.document = document;
    this.id = id;
    this.attrs = {};
    this.children = [];
    this.listeners = {};
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.files = [];
    this.className = "";
    this._text = "";
  }

  get textContent() {
    return this._text + this.children.map((child) => child.textContent).join("");
  }

  set textContent(value) {
    this._text = String(value);
    this.children = [];
  }

  setAttribute(name, value) {
    this.attrs[name] = String(value);
  }

  getAttribute(name) {
    return name in this.attrs ? this.attrs[name] : null;
  }

  removeAttribute(name) {
    delete this.attrs[name];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(type, listener) {
    (this.listeners[type] = this.listeners[type] || []).push(listener);
  }

  // Runs listeners and resolves when async handlers settle.
  dispatch(type, event) {
    const payload = Object.assign({ type, preventDefault() {} }, event);
    return Promise.all((this.listeners[type] || []).map((fn) => fn.call(this, payload)));
  }

  focus() {
    this.document.activeElement = this;
  }

  select() {
    this.selected = true;
  }
}

const IDS = [
  "converter-app",
  "input-text",
  "output-text",
  "convert-text-btn",
  "clear-btn",
  "copy-btn",
  "text-errors",
  "text-error-link",
  "input-text-error",
  "text-status",
  "text-notice",
  "text-notice-message",
  "text-notice-link",
  "output-title",
  "docx-input",
  "docx-input-error",
  "convert-docx-btn",
  "docx-status",
  "tab-text",
  "tab-docx",
  "text-panel",
  "docx-panel",
];

function createDocument() {
  const document = {
    activeElement: null,
    elements: {},
    listeners: {},
    createElement: () => new Element(document, null),
    getElementById: (id) => document.elements[id] || null,
    querySelectorAll(selector) {
      if (selector === '[role="tab"]') return [document.elements["tab-text"], document.elements["tab-docx"]];
      throw new Error("Unsupported selector: " + selector);
    },
    addEventListener: Element.prototype.addEventListener,
    dispatch: Element.prototype.dispatch,
  };
  for (const id of IDS) document.elements[id] = new Element(document, id);
  const els = document.elements;

  for (const id of ["converter-app", "text-notice", "text-errors", "input-text-error", "docx-input-error", "docx-panel"]) {
    els[id].hidden = true;
  }
  els["copy-btn"].disabled = true;
  els["convert-docx-btn"].disabled = true;
  els["input-text"].setAttribute("aria-describedby", "input-text-hint");
  els["docx-input"].setAttribute("aria-describedby", "docx-input-hint");
  els["tab-text"].setAttribute("aria-controls", "text-panel");
  els["tab-text"].setAttribute("aria-selected", "true");
  els["tab-docx"].setAttribute("aria-controls", "docx-panel");
  els["tab-docx"].setAttribute("aria-selected", "false");
  els["tab-docx"].setAttribute("tabindex", "-1");
  return document;
}

function flatten(object, prefix = "") {
  const flat = {};
  for (const [key, value] of Object.entries(object)) {
    const name = prefix + key;
    if (typeof value === "object") Object.assign(flat, flatten(value, name + "."));
    else flat[name] = value;
  }
  return flat;
}

function loadLocale(lang) {
  const json = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, lang + ".json"), "utf8"));
  return flatten(json);
}

// Stand-in for window.VedaI18n backed by the real dictionaries.
function createI18n(lang) {
  const i18n = {
    lang,
    messages: { en: loadLocale("en"), ja: loadLocale("ja") },
    t(key, params = {}) {
      const text = i18n.messages[i18n.lang][key];
      if (text === undefined) return key;
      return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
    },
  };
  return i18n;
}

// Loads the real sources and app.js into a fresh context with a DOM stub.
function createApp(options = {}) {
  const document = createDocument();
  const sandbox = {
    document,
    console: { error() {}, warn() {}, log() {} },
    navigator: options.navigator || {},
    VedaI18n: options.i18n,
    JSZip: "JSZip" in options ? options.JSZip : {},
    saveAs: "saveAs" in options ? options.saveAs : () => {},
  };
  const context = vm.createContext(sandbox);
  for (const file of ["mapping.js", "converter.js"]) {
    vm.runInContext(fs.readFileSync(path.join(JS_DIR, file), "utf8"), context, { filename: file });
  }
  sandbox.convertDocxFile = options.convertDocxFile || (async (file) => file.name);
  vm.runInContext(fs.readFileSync(path.join(JS_DIR, "app.js"), "utf8"), context, { filename: "app.js" });
  document.dispatch("DOMContentLoaded");
  return { document, els: document.elements, context, sandbox };
}

module.exports = { createApp, createI18n, loadLocale, flatten };
