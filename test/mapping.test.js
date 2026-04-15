const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { loadSources } = require("./helpers/load-source");

before(() => {
  loadSources("mapping.js");
});

describe("GANDHARI_MAP", () => {
  it("is a Map with 173 entries", () => {
    assert.ok(GANDHARI_MAP instanceof Map);
    assert.equal(GANDHARI_MAP.size, 173);
  });

  it("all keys are in PUA range 0xE800-0xE8C9", () => {
    for (const key of GANDHARI_MAP.keys()) {
      assert.ok(
        key >= 0xe800 && key <= 0xe8c9,
        `key 0x${key.toString(16)} is outside PUA range`
      );
    }
  });

  it("all values are non-empty strings", () => {
    for (const [key, value] of GANDHARI_MAP) {
      assert.equal(typeof value, "string", `key 0x${key.toString(16)}`);
      assert.ok(value.length > 0, `key 0x${key.toString(16)} has empty value`);
    }
  });

  it("expected gaps are not in the map", () => {
    const gaps = [
      0xe801, 0xe80a, 0xe80b, 0xe80c, 0xe80d, 0xe80e, 0xe80f, 0xe81a,
      0xe81b, 0xe81c, 0xe81d, 0xe81e, 0xe81f, 0xe832, 0xe833, 0xe83d,
      0xe83e, 0xe83f, 0xe840, 0xe841, 0xe85e, 0xe85f, 0xe875, 0xe87d,
      0xe8be, 0xe8c0, 0xe8c2, 0xe8c3, 0xe8c4,
    ];
    for (const gap of gaps) {
      assert.ok(
        !GANDHARI_MAP.has(gap),
        `gap 0x${gap.toString(16)} should not be in map`
      );
    }
  });

  it('three entries map to "?"', () => {
    const questionMarks = [0xe83a, 0xe872, 0xe8c1];
    for (const key of questionMarks) {
      assert.equal(
        GANDHARI_MAP.get(key),
        "?",
        `0x${key.toString(16)} should map to "?"`
      );
    }
  });

  it("spot-check specific mappings", () => {
    const checks = [
      [0xe800, "J\u030C"],
      [0xe806, "L\u0325"],
      [0xe816, "S\u0301\u0304"],
      [0xe818, "S\u0323\u0304"],
      [0xe824, "T\u0323\u0301"],
      [0xe873, "\u00c3\u0301"],
      [0xe8c9, "l\u0325\u0304"],
    ];
    for (const [key, expected] of checks) {
      assert.equal(
        GANDHARI_MAP.get(key),
        expected,
        `0x${key.toString(16)} mapping mismatch`
      );
    }
  });

  it("all values start with a base character (not a combining mark)", () => {
    for (const [key, value] of GANDHARI_MAP) {
      const firstCP = value.codePointAt(0);
      // Combining Diacritical Marks: 0x0300-0x036F
      // Combining Diacritical Marks Extended: 0x1AB0-0x1AFF
      // Combining Diacritical Marks Supplement: 0x1DC0-0x1DFF
      // Combining Half Marks: 0xFE20-0xFE2F
      const isCombining =
        (firstCP >= 0x0300 && firstCP <= 0x036f) ||
        (firstCP >= 0x1ab0 && firstCP <= 0x1aff) ||
        (firstCP >= 0x1dc0 && firstCP <= 0x1dff) ||
        (firstCP >= 0xfe20 && firstCP <= 0xfe2f);
      assert.ok(
        !isCombining,
        `0x${key.toString(16)}: value starts with combining mark U+${firstCP.toString(16).toUpperCase().padStart(4, "0")}`
      );
    }
  });
});
