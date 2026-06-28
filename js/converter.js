// Gandhari Unicode -> 標準Unicode 変換関数

function createGandhariConverter(mapping) {
  return function convertText(text) {
    let result = "";

    for (const char of text) {
      const codePoint = char.codePointAt(0);
      result += mapping.get(codePoint) ?? char;
    }

    return result;
  };
}

const convertGandhariToUnicode = createGandhariConverter(GANDHARI_MAP);
