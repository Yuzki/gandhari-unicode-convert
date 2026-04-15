const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("child_process");
const { loadSources } = require("./helpers/load-source");

let pythonData; // { "e800": ["0x4a", "0x30c"], ... }

before(() => {
  loadSources("mapping.js", "converter.js");

  // Extract Python data list via subprocess
  const pythonScript = `
import json, re
with open('notebook/gandhari_conveter.py', encoding='utf-8') as f:
    content = f.read()
match = re.search(r'data\\s*=\\s*\\[(.*?)\\]', content, re.DOTALL)
data_str = 'data = [' + match.group(1) + ']'
ns = {}
exec(data_str, ns)
data = ns['data']
result = {}
for hex_code, unicode_str in data:
    cps = [hex(ord(c)) for c in unicode_str]
    result[hex_code] = cps
print(json.dumps(result))
`;

  const output = execSync(`uv run python -c "${pythonScript}"`, {
    encoding: "utf8",
    timeout: 30000,
  });
  pythonData = JSON.parse(output.trim());
});

describe("JS/Python cross-language consistency", () => {
  it("same number of entries", () => {
    const pyCount = Object.keys(pythonData).length;
    assert.equal(
      GANDHARI_MAP.size,
      pyCount,
      `JS has ${GANDHARI_MAP.size} entries, Python has ${pyCount}`
    );
  });

  it("same set of code point keys", () => {
    const jsKeys = [...GANDHARI_MAP.keys()]
      .map((k) => k.toString(16))
      .sort();
    const pyKeys = Object.keys(pythonData).sort();
    assert.deepEqual(jsKeys, pyKeys);
  });

  it("identical output for every mapped character", () => {
    const mismatches = [];

    for (const [pyHex, pyCPs] of Object.entries(pythonData)) {
      const jsKey = parseInt(pyHex, 16);
      const jsValue = GANDHARI_MAP.get(jsKey);

      if (jsValue === undefined) {
        mismatches.push(`0x${pyHex}: missing in JS`);
        continue;
      }

      // Decompose JS value to code point hex array
      const jsCPs = [...jsValue].map((c) => "0x" + c.codePointAt(0).toString(16));

      if (JSON.stringify(jsCPs) !== JSON.stringify(pyCPs)) {
        mismatches.push(
          `0x${pyHex}: JS=[${jsCPs}] Python=[${pyCPs}]`
        );
      }
    }

    assert.equal(
      mismatches.length,
      0,
      `Mismatches found:\n${mismatches.join("\n")}`
    );
  });

  it("unmapped character passes through in both implementations", () => {
    // 0xE801 is a known gap
    const jsResult = convertGandhariToUnicode("\uE801");
    assert.equal(jsResult, "\uE801", "JS should pass through 0xE801");
    assert.ok(
      !pythonData.hasOwnProperty("e801"),
      "Python should not have 0xE801 in data"
    );
  });
});
