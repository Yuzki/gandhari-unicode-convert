// UI controller. Conversion logic lives in converter.js and docx-processor.js.

// English fallback for dynamic messages, used when the dictionaries are
// unavailable. Keys mirror locales/en.json; other text is static English markup.
const FALLBACK_MESSAGES = {
  "app.textStatus.initial": ["Ready", "Paste text and choose Convert."],
  "app.textStatus.converted": [
    "Converted",
    "{count} characters were converted. The result is shown below the input on narrow screens.",
  ],
  "app.textStatus.empty": ["Nothing converted", "The input is empty."],
  "app.textStatus.emptyKept": [
    "Nothing converted",
    "The input is empty. The previous result is still shown.",
  ],
  "app.textStatus.cleared": ["Cleared", "The input and the result were cleared."],
  "app.textStatus.copied": ["Copied", "The result was copied to the clipboard."],
  "app.textStatus.copyFailed": [
    "Copy failed",
    "The browser did not allow copying. The result is selected; copy it manually.",
  ],
  "app.textStatus.copyUnavailable": [
    "Copy not available",
    "This browser cannot copy automatically. The result is selected; copy it manually.",
  ],
  "app.docxStatus.none": ["No file selected", "Choose a .docx file to enable conversion."],
  "app.docxStatus.ready": ["Ready", "{name} is selected. Choose Convert and download."],
  "app.docxStatus.invalid": [
    "Unsupported file",
    "{name} is not a .docx file. Choose a file with the .docx extension.",
  ],
  "app.docxStatus.busy": ["Converting", "Converting {name}…"],
  "app.docxStatus.success": [
    "Download started",
    "{name} was sent to your browser’s download. Check that it was saved.",
  ],
  "app.docxStatus.failure": [
    "Conversion failed",
    "{name} could not be converted. The file may be damaged or not a valid DOCX. Check the file and try again; the file is still selected.",
  ],
  "app.docxStatus.missingLibrary": [
    "Conversion unavailable",
    "A required library did not load (it is fetched from a CDN). Check your connection, reload the page and try again.",
  ],
};

const STATUS_ICONS = { info: "i", success: "✓", error: "!" };

// Returns the localized string for key, or the English fallback.
function translate(part, key, params) {
  const i18n = globalThis.VedaI18n;
  if (i18n && i18n.lang) {
    const found = i18n.t(key + "." + part, params);
    if (found !== key + "." + part) return found;
  }
  const entry = FALLBACK_MESSAGES[key];
  if (!entry) return "";
  return entry[part === "title" ? 0 : 1].replace(/\{(\w+)\}/g, function (match, name) {
    return params && name in params ? String(params[name]) : match;
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const app = document.getElementById("converter-app");
  const tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  const inputText = document.getElementById("input-text");
  const outputText = document.getElementById("output-text");
  const convertTextBtn = document.getElementById("convert-text-btn");
  const clearBtn = document.getElementById("clear-btn");
  const copyBtn = document.getElementById("copy-btn");
  const textErrors = document.getElementById("text-errors");
  const textErrorLink = document.getElementById("text-error-link");
  const inputError = document.getElementById("input-text-error");
  const textStatus = document.getElementById("text-status");
  const docxInput = document.getElementById("docx-input");
  const docxInputError = document.getElementById("docx-input-error");
  const convertDocxBtn = document.getElementById("convert-docx-btn");
  const docxStatus = document.getElementById("docx-status");

  // Dynamic status is stored as { kind, key, params } and rendered on demand,
  // so it can be re-rendered when the language changes.
  let textState = null;
  let docxState = null;
  let docxBusy = false;

  function renderStatus(container, state) {
    container.textContent = "";
    if (!state) return;
    const box = document.createElement("div");
    box.className = "veda-status veda-status--" + (state.kind === "processing" ? "info" : state.kind);
    const icon = document.createElement("span");
    if (state.kind === "processing") {
      icon.className = "veda-spinner";
    } else {
      icon.className = "veda-status__icon";
      icon.textContent = STATUS_ICONS[state.kind];
    }
    icon.setAttribute("aria-hidden", "true");
    const body = document.createElement("div");
    body.className = "veda-status__body";
    const title = document.createElement("p");
    title.className = "veda-status__title";
    title.textContent = translate("title", state.key, state.params);
    const text = document.createElement("p");
    text.textContent = translate("body", state.key, state.params);
    body.appendChild(title);
    body.appendChild(text);
    box.appendChild(icon);
    box.appendChild(body);
    container.appendChild(box);
  }

  function setTextStatus(kind, key, params) {
    textState = { kind: kind, key: "app.textStatus." + key, params: params };
    renderStatus(textStatus, textState);
  }

  function setDocxStatus(kind, key, params) {
    docxState = { kind: kind, key: "app.docxStatus." + key, params: params };
    renderStatus(docxStatus, docxState);
  }

  document.addEventListener("veda:languagechange", function () {
    renderStatus(textStatus, textState);
    renderStatus(docxStatus, docxState);
  });

  // Mode tabs
  function selectTab(tab, moveFocus) {
    tabs.forEach(function (t) {
      const selected = t === tab;
      t.setAttribute("aria-selected", selected ? "true" : "false");
      t.setAttribute("tabindex", selected ? "0" : "-1");
      document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
    });
    if (moveFocus) tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      selectTab(tab, false);
    });
    tab.addEventListener("keydown", function (event) {
      let next = null;
      if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
      else if (event.key === "ArrowLeft") next = tabs[(index + tabs.length - 1) % tabs.length];
      else if (event.key === "Home") next = tabs[0];
      else if (event.key === "End") next = tabs[tabs.length - 1];
      if (!next) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });

  // Text conversion
  function showTextError() {
    textErrors.hidden = false;
    inputError.hidden = false;
    inputText.setAttribute("aria-invalid", "true");
    inputText.setAttribute("aria-describedby", "input-text-hint input-text-error");
    textErrors.focus();
  }

  function clearTextError() {
    textErrors.hidden = true;
    inputError.hidden = true;
    inputText.removeAttribute("aria-invalid");
    inputText.setAttribute("aria-describedby", "input-text-hint");
  }

  textErrorLink.addEventListener("click", function (event) {
    event.preventDefault();
    inputText.focus();
  });

  inputText.addEventListener("input", function () {
    if (inputText.value !== "") clearTextError();
  });

  convertTextBtn.addEventListener("click", function () {
    const input = inputText.value;
    if (input === "") {
      showTextError();
      setTextStatus("error", outputText.value ? "emptyKept" : "empty");
      return;
    }
    clearTextError();
    outputText.value = convertGandhariToUnicode(input);
    copyBtn.disabled = outputText.value === "";
    setTextStatus("success", "converted", { count: Array.from(input).length });
  });

  clearBtn.addEventListener("click", function () {
    inputText.value = "";
    outputText.value = "";
    copyBtn.disabled = true;
    clearTextError();
    setTextStatus("info", "cleared");
  });

  // Clipboard
  function selectOutputForManualCopy() {
    outputText.focus();
    outputText.select();
  }

  copyBtn.addEventListener("click", async function () {
    const text = outputText.value;
    if (!text) return;

    const clipboard = globalThis.navigator && globalThis.navigator.clipboard;
    if (!clipboard || typeof clipboard.writeText !== "function") {
      setTextStatus("error", "copyUnavailable");
      selectOutputForManualCopy();
      return;
    }
    try {
      await clipboard.writeText(text);
      setTextStatus("success", "copied");
    } catch (e) {
      setTextStatus("error", "copyFailed");
      selectOutputForManualCopy();
    }
  });

  // DOCX conversion
  function isDocxName(name) {
    return name.toLowerCase().endsWith(".docx");
  }

  function syncDocxControls() {
    const file = docxInput.files[0];
    convertDocxBtn.disabled = docxBusy || !(file && isDocxName(file.name));
    docxInput.disabled = docxBusy;
    if (docxBusy) {
      convertDocxBtn.setAttribute("aria-busy", "true");
      docxStatus.setAttribute("aria-busy", "true");
    } else {
      convertDocxBtn.removeAttribute("aria-busy");
      docxStatus.removeAttribute("aria-busy");
    }
  }

  function setDocxInputInvalid(invalid) {
    docxInputError.hidden = !invalid;
    if (invalid) {
      docxInput.setAttribute("aria-invalid", "true");
      docxInput.setAttribute("aria-describedby", "docx-input-hint docx-input-error");
    } else {
      docxInput.removeAttribute("aria-invalid");
      docxInput.setAttribute("aria-describedby", "docx-input-hint");
    }
  }

  docxInput.addEventListener("change", function () {
    const file = docxInput.files[0];
    if (!file) {
      setDocxInputInvalid(false);
      setDocxStatus("info", "none");
    } else if (isDocxName(file.name)) {
      setDocxInputInvalid(false);
      setDocxStatus("info", "ready", { name: file.name });
    } else {
      setDocxInputInvalid(true);
      setDocxStatus("error", "invalid", { name: file.name });
    }
    syncDocxControls();
  });

  convertDocxBtn.addEventListener("click", async function () {
    if (docxBusy) return;
    const file = docxInput.files[0];
    if (!file || !isDocxName(file.name)) {
      syncDocxControls();
      return;
    }
    if (
      typeof JSZip === "undefined" ||
      typeof saveAs === "undefined" ||
      typeof convertDocxFile !== "function"
    ) {
      setDocxStatus("error", "missingLibrary");
      return;
    }

    const hadFocus = document.activeElement === convertDocxBtn;
    docxBusy = true;
    syncDocxControls();
    setDocxStatus("processing", "busy", { name: file.name });

    try {
      const outputName = await convertDocxFile(file);
      setDocxStatus("success", "success", { name: outputName });
    } catch (e) {
      console.error(e);
      setDocxStatus("error", "failure", { name: file.name });
    } finally {
      docxBusy = false;
      syncDocxControls();
      if (hadFocus && !convertDocxBtn.disabled) convertDocxBtn.focus();
    }
  });

  // Initial state
  setTextStatus("info", "initial");
  setDocxStatus("info", "none");
  syncDocxControls();
  app.hidden = false;
});
