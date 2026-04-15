const fs = require("fs");
const vm = require("vm");
const path = require("path");

const JS_DIR = path.resolve(__dirname, "../../js");

function loadSources(...files) {
  for (const file of files) {
    const code = fs.readFileSync(path.join(JS_DIR, file), "utf8");
    vm.runInThisContext(code, { filename: file });
  }
}

// JSZip / saveAs stubs for docx-processor.js
function installDocxStubs(mockJSZip, mockSaveAs) {
  globalThis.JSZip = mockJSZip || {};
  globalThis.saveAs = mockSaveAs || function () {};
}

function cleanupGlobals() {
  delete globalThis.GANDHARI_MAP;
  delete globalThis.convertGandhariToUnicode;
  delete globalThis.convertDocxFile;
  delete globalThis.JSZip;
  delete globalThis.saveAs;
}

module.exports = { loadSources, installDocxStubs, cleanupGlobals };
