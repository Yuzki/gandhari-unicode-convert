// DOCX ファイルの読み込み・変換・保存

const DOCX_TEXT_XML_PATH_PATTERN =
  /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

function isDocxTextXmlPath(path) {
  return DOCX_TEXT_XML_PATH_PATTERN.test(path);
}

function getConvertedDocxName(fileName) {
  return fileName.replace(/\.docx$/i, "_converted.docx");
}

async function convertDocxZipEntries(zip, convertText) {
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (isDocxTextXmlPath(path)) {
      const xmlString = await zipEntry.async("string");
      zip.file(path, convertText(xmlString));
    }
  }
}

async function convertDocxFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  await convertDocxZipEntries(zip, convertGandhariToUnicode);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const outputName = getConvertedDocxName(file.name);
  saveAs(blob, outputName);

  return outputName;
}
