const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { loadSources, installDocxStubs } = require("./helpers/load-source");

// ── A. Regex pattern tests ──────────────────────────────────────────────────

describe("DOCX XML path regex", () => {
  const pattern =
    /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

  const shouldMatch = [
    "word/document.xml",
    "word/header1.xml",
    "word/header2.xml",
    "word/header.xml",
    "word/header10.xml",
    "word/footer1.xml",
    "word/footer.xml",
    "word/footnotes.xml",
    "word/endnotes.xml",
  ];

  const shouldNotMatch = [
    "word/styles.xml",
    "word/settings.xml",
    "word/theme/theme1.xml",
    "[Content_Types].xml",
    "word/document.xml.rels",
    "word/_rels/document.xml.rels",
    "word/media/image1.png",
    "Word/document.xml",
    "word/headerABC.xml",
    "word/comments.xml",
    "word/numbering.xml",
  ];

  for (const path of shouldMatch) {
    it(`matches "${path}"`, () => {
      assert.ok(pattern.test(path));
    });
  }

  for (const path of shouldNotMatch) {
    it(`does not match "${path}"`, () => {
      assert.ok(!pattern.test(path));
    });
  }
});

// ── B. Output filename tests ────────────────────────────────────────────────

describe("output filename logic", () => {
  const rename = (name) => name.replace(/\.docx$/i, "_converted.docx");

  const cases = [
    ["document.docx", "document_converted.docx"],
    ["My File.docx", "My File_converted.docx"],
    ["UPPERCASE.DOCX", "UPPERCASE_converted.docx"],
    ["mixed.Docx", "mixed_converted.docx"],
    ["multi.docx.docx", "multi.docx_converted.docx"],
    ["\u65E5\u672C\u8A9E\u30D5\u30A1\u30A4\u30EB.docx", "\u65E5\u672C\u8A9E\u30D5\u30A1\u30A4\u30EB_converted.docx"],
  ];

  for (const [input, expected] of cases) {
    it(`"${input}" -> "${expected}"`, () => {
      assert.equal(rename(input), expected);
    });
  }
});

// ── C. convertDocxFile() mock integration tests ─────────────────────────────

describe("convertDocxFile", () => {
  // Track what the mock zip wrote
  let writtenFiles;
  let savedBlob;
  let savedName;

  function createMockZip(entries) {
    writtenFiles = {};

    const files = {};
    for (const [path, content] of Object.entries(entries)) {
      files[path] = {
        async: async (type) => {
          assert.equal(type, "string");
          return content;
        },
      };
    }

    const mockZip = {
      files,
      file(path, content) {
        writtenFiles[path] = content;
      },
      async generateAsync(opts) {
        assert.equal(opts.type, "blob");
        return new Blob(["mock"], { type: opts.mimeType });
      },
    };

    return mockZip;
  }

  before(() => {
    loadSources("mapping.js", "converter.js");
  });

  function setupDocxStubs(entries) {
    const mockZip = createMockZip(entries);

    const MockJSZip = {
      loadAsync: async () => mockZip,
    };

    savedBlob = null;
    savedName = null;
    const mockSaveAs = (blob, name) => {
      savedBlob = blob;
      savedName = name;
    };

    installDocxStubs(MockJSZip, mockSaveAs);
    loadSources("docx-processor.js");

    return mockZip;
  }

  function createMockFile(name) {
    return {
      name,
      async arrayBuffer() {
        return new ArrayBuffer(0);
      },
    };
  }

  it("converts PUA characters in word/document.xml", async () => {
    setupDocxStubs({
      "word/document.xml": "<w:t>\uE800 hello</w:t>",
      "word/styles.xml": "<styles/>",
    });

    await convertDocxFile(createMockFile("test.docx"));

    assert.equal(writtenFiles["word/document.xml"], "<w:t>J\u030C hello</w:t>");
    assert.ok(!("word/styles.xml" in writtenFiles));
  });

  it("processes header, footer, footnotes, and endnotes", async () => {
    setupDocxStubs({
      "word/document.xml": "doc \uE800",
      "word/header1.xml": "hdr \uE802",
      "word/footer1.xml": "ftr \uE804",
      "word/footnotes.xml": "fn \uE806",
      "word/endnotes.xml": "en \uE808",
    });

    await convertDocxFile(createMockFile("test.docx"));

    assert.equal(writtenFiles["word/document.xml"], "doc J\u030C");
    assert.equal(writtenFiles["word/header1.xml"], "hdr J\u0301");
    assert.equal(writtenFiles["word/footer1.xml"], "ftr J\u0304");
    assert.equal(writtenFiles["word/footnotes.xml"], "fn L\u0325");
    assert.equal(writtenFiles["word/endnotes.xml"], "en M\u0304");
  });

  it("skips non-text XML files", async () => {
    setupDocxStubs({
      "word/document.xml": "ok",
      "word/styles.xml": "\uE800 should not convert",
      "word/settings.xml": "\uE800 should not convert",
      "[Content_Types].xml": "\uE800 should not convert",
    });

    await convertDocxFile(createMockFile("test.docx"));

    assert.ok("word/document.xml" in writtenFiles);
    assert.ok(!("word/styles.xml" in writtenFiles));
    assert.ok(!("word/settings.xml" in writtenFiles));
    assert.ok(!("[Content_Types].xml" in writtenFiles));
  });

  it("returns correct output filename", async () => {
    setupDocxStubs({ "word/document.xml": "text" });

    const result = await convertDocxFile(createMockFile("test.docx"));
    assert.equal(result, "test_converted.docx");
  });

  it("calls saveAs with correct filename", async () => {
    setupDocxStubs({ "word/document.xml": "text" });

    await convertDocxFile(createMockFile("myfile.docx"));

    assert.ok(savedBlob instanceof Blob);
    assert.equal(savedName, "myfile_converted.docx");
  });

  it("handles DOCX with no PUA characters", async () => {
    setupDocxStubs({
      "word/document.xml": "<w:t>normal text</w:t>",
    });

    await convertDocxFile(createMockFile("clean.docx"));

    assert.equal(writtenFiles["word/document.xml"], "<w:t>normal text</w:t>");
  });
});
