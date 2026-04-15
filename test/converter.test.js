const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { loadSources } = require("./helpers/load-source");

before(() => {
  loadSources("mapping.js", "converter.js");
});

describe("convertGandhariToUnicode", () => {
  it("returns empty string for empty input", () => {
    assert.equal(convertGandhariToUnicode(""), "");
  });

  it("returns plain ASCII unchanged", () => {
    assert.equal(convertGandhariToUnicode("Hello World"), "Hello World");
  });

  it("converts a single PUA character", () => {
    assert.equal(convertGandhariToUnicode("\uE800"), "J\u030C");
  });

  it("passes through unmapped PUA character", () => {
    assert.equal(convertGandhariToUnicode("\uE801"), "\uE801");
  });

  it("passes through characters at PUA range boundaries", () => {
    assert.equal(convertGandhariToUnicode("\uE7FF"), "\uE7FF");
    assert.equal(convertGandhariToUnicode("\uE8CA"), "\uE8CA");
  });

  it("converts PUA mixed with normal text", () => {
    assert.equal(
      convertGandhariToUnicode("The \uE800 is here"),
      "The J\u030C is here"
    );
  });

  it("converts consecutive PUA characters", () => {
    assert.equal(
      convertGandhariToUnicode("\uE800\uE802\uE804"),
      "J\u030CJ\u0301J\u0304"
    );
  });

  it('converts question-mark mappings', () => {
    assert.equal(
      convertGandhariToUnicode("\uE83A\uE872\uE8C1"),
      "???"
    );
  });

  it("handles multi-codepoint mapping values", () => {
    // 0xE816 -> S + U+0301 + U+0304 (3 code points)
    const result = convertGandhariToUnicode("\uE816");
    assert.equal(result, "S\u0301\u0304");
    assert.equal([...result].length, 3);
  });

  it("preserves newlines and whitespace", () => {
    assert.equal(
      convertGandhariToUnicode("\uE800\n\t\uE802"),
      "J\u030C\n\tJ\u0301"
    );
  });

  it("handles emoji (outside BMP) correctly", () => {
    assert.equal(convertGandhariToUnicode("Hello \u{1F600}"), "Hello \u{1F600}");
  });

  it("converts PUA characters within XML tags", () => {
    assert.equal(
      convertGandhariToUnicode("<w:t>\uE800 text</w:t>"),
      "<w:t>J\u030C text</w:t>"
    );
  });

  it("converts all 173 mapped characters", () => {
    const keys = [...GANDHARI_MAP.keys()];
    const input = keys.map((k) => String.fromCodePoint(k)).join("");
    const expected = keys.map((k) => GANDHARI_MAP.get(k)).join("");
    assert.equal(convertGandhariToUnicode(input), expected);
  });

  it("handles a long string without error", () => {
    const unit = "abc\uE800\uE816xyz";
    const input = unit.repeat(10000);
    const result = convertGandhariToUnicode(input);
    const expectedUnit = "abcJ\u030CS\u0301\u0304xyz";
    assert.equal(result.length, expectedUnit.length * 10000);
  });
});
