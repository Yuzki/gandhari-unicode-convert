// Gandhari Unicode → 標準Unicode 変換関数

function convertGandhariToUnicode(text) {
  let result = "";
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (GANDHARI_MAP.has(codePoint)) {
      result += GANDHARI_MAP.get(codePoint);
    } else {
      result += char;
    }
  }
  return result;
}
