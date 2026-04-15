// DOCX ファイルの読み込み・変換・保存

async function convertDocxFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // テキストを含む可能性のあるXMLファイルを対象にする
  const textXmlPattern =
    /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (textXmlPattern.test(path)) {
      const xmlString = await zipEntry.async("string");
      const convertedXml = convertGandhariToUnicode(xmlString);
      zip.file(path, convertedXml);
    }
  }

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const outputName = file.name.replace(/\.docx$/i, "_converted.docx");
  saveAs(blob, outputName);

  return outputName;
}
