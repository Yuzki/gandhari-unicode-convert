const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("vm");
const { createApp, createI18n, loadLocale } = require("./helpers/dom-stub");

const en = loadLocale("en");
const ja = loadLocale("ja");

function file(name) {
  return { name };
}

function deferred() {
  const d = {};
  d.promise = new Promise((resolve, reject) => {
    d.resolve = resolve;
    d.reject = reject;
  });
  return d;
}

describe("dynamic message fallback", () => {
  it("matches the English dictionary for every key", () => {
    const { context } = createApp();
    const fallback = vm.runInContext("FALLBACK_MESSAGES", context);
    assert.ok(Object.keys(fallback).length > 0);
    for (const [key, [title, body]] of Object.entries(fallback)) {
      assert.equal(title, en[key + ".title"], key);
      assert.equal(body, en[key + ".body"], key);
    }
    const dynamicKeys = Object.keys(en).filter((k) => /^app\.(text|docx)Status\./.test(k));
    for (const key of dynamicKeys) assert.ok(key.replace(/\.(title|body)$/, "") in fallback, key);
  });

  it("renders readable English, never raw keys, when the dictionary is unavailable", () => {
    const { els } = createApp({ i18n: { lang: null, t: (key) => key } });
    assert.ok(els["text-status"].textContent.includes(en["app.textStatus.initial.title"]));
    assert.ok(els["docx-status"].textContent.includes(en["app.docxStatus.none.title"]));
    assert.doesNotMatch(els["text-status"].textContent + els["docx-status"].textContent, /app\./);
    assert.equal(els["converter-app"].hidden, false);
  });

  it("works when VedaI18n is absent", async () => {
    const { els } = createApp();
    els["input-text"].value = "abc";
    await els["convert-text-btn"].dispatch("click");
    assert.ok(els["text-status"].textContent.includes("3 characters were converted"));
  });
});

describe("text conversion states", () => {
  it("starts with copy disabled", () => {
    const { els } = createApp();
    assert.equal(els["copy-btn"].disabled, true);
  });

  it("reports empty input through the linked error summary and keeps the previous output", async () => {
    const { els, document } = createApp();
    els["input-text"].value = "abc";
    await els["convert-text-btn"].dispatch("click");
    els["input-text"].value = "";
    await els["convert-text-btn"].dispatch("click");

    assert.equal(els["text-errors"].hidden, false);
    assert.equal(document.activeElement, els["text-errors"]);
    assert.equal(els["input-text-error"].hidden, false);
    assert.equal(els["input-text"].getAttribute("aria-invalid"), "true");
    assert.match(els["input-text"].getAttribute("aria-describedby"), /input-text-error/);
    assert.equal(els["output-text"].value, "abc");
    assert.equal(els["copy-btn"].disabled, false);
    assert.ok(els["text-status"].textContent.includes("previous result is still shown"));

    els["input-text"].value = "x";
    await els["input-text"].dispatch("input");
    assert.equal(els["text-errors"].hidden, true);
    assert.equal(els["input-text"].getAttribute("aria-invalid"), null);
  });

  it("does not trim whitespace-only input", async () => {
    const { els } = createApp();
    els["input-text"].value = " \n";
    await els["convert-text-btn"].dispatch("click");
    assert.equal(els["text-errors"].hidden, true);
    assert.equal(els["output-text"].value, " \n");
    assert.equal(els["copy-btn"].disabled, false);
  });

  it("converts mapped characters exactly like convertGandhariToUnicode", async () => {
    const { els, context } = createApp();
    const input = "\u{10FFFF}ā́\u{1F600} Z";
    els["input-text"].value = input;
    await els["convert-text-btn"].dispatch("click");
    const expected = vm.runInContext("convertGandhariToUnicode", context)(input);
    assert.equal(els["output-text"].value, expected);
  });

  it("clears input, output, errors and disables copy", async () => {
    const { els } = createApp();
    els["input-text"].value = "abc";
    await els["convert-text-btn"].dispatch("click");
    await els["clear-btn"].dispatch("click");
    assert.equal(els["input-text"].value, "");
    assert.equal(els["output-text"].value, "");
    assert.equal(els["copy-btn"].disabled, true);
    assert.ok(els["text-status"].textContent.includes("cleared"));
  });
});

describe("clipboard states", () => {
  async function converted(navigator) {
    const app = createApp({ navigator });
    app.els["input-text"].value = "abc";
    await app.els["convert-text-btn"].dispatch("click");
    return app;
  }

  it("announces success only after writeText resolves", async () => {
    const written = [];
    const { els } = await converted({ clipboard: { writeText: async (text) => written.push(text) } });
    await els["copy-btn"].dispatch("click");
    assert.deepEqual(written, ["abc"]);
    assert.ok(els["text-status"].textContent.includes(en["app.textStatus.copied.title"]));
  });

  it("reports a rejected write and selects the output for manual copy", async () => {
    const { els, document } = await converted({
      clipboard: { writeText: () => Promise.reject(new Error("denied")) },
    });
    await els["copy-btn"].dispatch("click");
    assert.ok(els["text-status"].textContent.includes(en["app.textStatus.copyFailed.title"]));
    assert.ok(!els["text-status"].textContent.includes(en["app.textStatus.copied.title"]));
    assert.equal(document.activeElement, els["output-text"]);
    assert.equal(els["output-text"].selected, true);
  });

  it("reports a missing Clipboard API", async () => {
    const { els } = await converted({});
    await els["copy-btn"].dispatch("click");
    assert.ok(els["text-status"].textContent.includes(en["app.textStatus.copyUnavailable.title"]));
    assert.equal(els["output-text"].selected, true);
  });
});

describe("DOCX states", () => {
  async function pick(els, selected) {
    els["docx-input"].files = selected ? [selected] : [];
    await els["docx-input"].dispatch("change");
  }

  it("enables conversion only for .docx files (case-insensitive)", async () => {
    const { els } = createApp();
    assert.equal(els["convert-docx-btn"].disabled, true);

    await pick(els, file("notes.txt"));
    assert.equal(els["convert-docx-btn"].disabled, true);
    assert.equal(els["docx-input-error"].hidden, false);
    assert.equal(els["docx-input"].getAttribute("aria-invalid"), "true");
    assert.ok(els["docx-status"].textContent.includes("notes.txt"));

    await pick(els, file("THESIS.DOCX"));
    assert.equal(els["convert-docx-btn"].disabled, false);
    assert.equal(els["docx-input-error"].hidden, true);
    assert.equal(els["docx-input"].getAttribute("aria-invalid"), null);

    await pick(els, null);
    assert.equal(els["convert-docx-btn"].disabled, true);
    assert.ok(els["docx-status"].textContent.includes(en["app.docxStatus.none.title"]));
  });

  it("disables selection and duplicate submission while busy, then recovers", async () => {
    const pending = deferred();
    let calls = 0;
    const { els } = createApp({
      convertDocxFile: (f) => {
        calls += 1;
        return pending.promise.then(() => f.name.replace(/\.docx$/i, "_converted.docx"));
      },
    });
    await pick(els, file("long ファイル.docx"));

    const first = els["convert-docx-btn"].dispatch("click");
    assert.equal(els["convert-docx-btn"].disabled, true);
    assert.equal(els["docx-input"].disabled, true);
    assert.equal(els["convert-docx-btn"].getAttribute("aria-busy"), "true");
    assert.equal(els["docx-status"].getAttribute("aria-busy"), "true");
    await els["convert-docx-btn"].dispatch("click");
    assert.equal(calls, 1);

    pending.resolve();
    await first;
    assert.equal(els["convert-docx-btn"].disabled, false);
    assert.equal(els["docx-input"].disabled, false);
    assert.equal(els["convert-docx-btn"].getAttribute("aria-busy"), null);
    assert.ok(els["docx-status"].textContent.includes("long ファイル_converted.docx"));
  });

  it("does not steal focus when the user moves away before completion", async () => {
    const pending = deferred();
    const { els, document } = createApp({
      convertDocxFile: (f) => pending.promise.then(() => f.name),
    });
    await els["tab-docx"].dispatch("click");
    await pick(els, file("a.docx"));
    els["convert-docx-btn"].focus();
    const running = els["convert-docx-btn"].dispatch("click");

    els["tab-text"].focus();
    await els["tab-text"].dispatch("click");
    pending.resolve();
    await running;
    assert.equal(document.activeElement, els["tab-text"]);
  });

  it("restores focus to the button when it stays displaced on the DOCX panel", async () => {
    const pending = deferred();
    const { els, document } = createApp({
      convertDocxFile: (f) => pending.promise.then(() => f.name),
    });
    await els["tab-docx"].dispatch("click");
    await pick(els, file("a.docx"));
    els["convert-docx-btn"].focus();
    const running = els["convert-docx-btn"].dispatch("click");
    pending.resolve();
    await running;
    assert.equal(document.activeElement, els["convert-docx-btn"]);
  });

  it("keeps the file selected and allows a retry after a failure", async () => {
    let fail = true;
    const { els } = createApp({
      convertDocxFile: async (f) => {
        if (fail) throw new Error("<b>bad zip</b>");
        return f.name;
      },
    });
    await pick(els, file("a.docx"));
    await els["convert-docx-btn"].dispatch("click");
    assert.ok(els["docx-status"].textContent.includes(en["app.docxStatus.failure.title"]));
    assert.ok(!els["docx-status"].textContent.includes("bad zip"));
    assert.equal(els["convert-docx-btn"].disabled, false);
    assert.equal(els["docx-input"].files[0].name, "a.docx");

    fail = false;
    await els["convert-docx-btn"].dispatch("click");
    assert.ok(els["docx-status"].textContent.includes(en["app.docxStatus.success.title"]));
  });

  it("reports missing JSZip or FileSaver without starting a conversion", async () => {
    for (const missing of [{ JSZip: undefined }, { saveAs: undefined }]) {
      let calls = 0;
      const { els } = createApp({
        ...missing,
        convertDocxFile: async () => {
          calls += 1;
          return "x";
        },
      });
      await pick(els, file("a.docx"));
      await els["convert-docx-btn"].dispatch("click");
      assert.equal(calls, 0);
      assert.ok(els["docx-status"].textContent.includes(en["app.docxStatus.missingLibrary.title"]));
      assert.equal(els["convert-docx-btn"].disabled, false);
    }
  });
});

describe("language and mode changes", () => {
  it("re-renders a pending status in the new language and preserves state", async () => {
    const i18n = createI18n("en");
    const pending = deferred();
    const { els, document } = createApp({
      i18n,
      convertDocxFile: (f) => pending.promise.then(() => f.name),
    });

    els["input-text"].value = "abc";
    await els["convert-text-btn"].dispatch("click");
    await els["tab-docx"].dispatch("click");
    els["docx-input"].files = [file("a.docx")];
    await els["docx-input"].dispatch("change");
    const running = els["convert-docx-btn"].dispatch("click");
    assert.ok(els["docx-status"].textContent.includes(en["app.docxStatus.busy.title"]));

    i18n.lang = "ja";
    await document.dispatch("veda:languagechange", { detail: { lang: "ja" } });

    assert.ok(els["docx-status"].textContent.includes(ja["app.docxStatus.busy.title"]));
    assert.ok(els["docx-status"].textContent.includes("a.docx"));
    assert.ok(els["text-status"].textContent.includes(ja["app.textStatus.converted.title"]));
    assert.equal(els["input-text"].value, "abc");
    assert.equal(els["output-text"].value, "abc");
    assert.equal(els["tab-docx"].getAttribute("aria-selected"), "true");
    assert.equal(els["docx-input"].files[0].name, "a.docx");
    assert.equal(els["convert-docx-btn"].disabled, true);

    pending.resolve();
    await running;
    assert.equal(els["convert-docx-btn"].disabled, false);
  });
});

describe("mode tabs", () => {
  it("keeps one selected tab, roving tabindex and hidden panels", async () => {
    const { els, document } = createApp();
    function state() {
      return [
        els["tab-text"].getAttribute("aria-selected"),
        els["tab-docx"].getAttribute("aria-selected"),
        els["text-panel"].hidden,
        els["docx-panel"].hidden,
        els["tab-text"].getAttribute("tabindex"),
        els["tab-docx"].getAttribute("tabindex"),
      ];
    }
    assert.deepEqual(state(), ["true", "false", false, true, null, "-1"]);

    await els["tab-text"].dispatch("keydown", { key: "ArrowRight" });
    assert.deepEqual(state(), ["false", "true", true, false, "-1", "0"]);
    assert.equal(document.activeElement, els["tab-docx"]);

    await els["tab-docx"].dispatch("keydown", { key: "ArrowRight" });
    assert.equal(els["tab-text"].getAttribute("aria-selected"), "true");

    await els["tab-text"].dispatch("keydown", { key: "End" });
    assert.equal(els["tab-docx"].getAttribute("aria-selected"), "true");
    await els["tab-docx"].dispatch("keydown", { key: "Home" });
    assert.equal(els["tab-text"].getAttribute("aria-selected"), "true");
    await els["tab-text"].dispatch("keydown", { key: "ArrowLeft" });
    assert.equal(els["tab-docx"].getAttribute("aria-selected"), "true");
  });
});
