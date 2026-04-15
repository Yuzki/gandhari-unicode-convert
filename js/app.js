// UI制御

document.addEventListener("DOMContentLoaded", function () {
  // 要素の取得
  const tabs = document.querySelectorAll(".tab");
  const textPanel = document.getElementById("text-panel");
  const docxPanel = document.getElementById("docx-panel");
  const inputText = document.getElementById("input-text");
  const outputText = document.getElementById("output-text");
  const convertTextBtn = document.getElementById("convert-text-btn");
  const clearBtn = document.getElementById("clear-btn");
  const copyBtn = document.getElementById("copy-btn");
  const docxInput = document.getElementById("docx-input");
  const convertDocxBtn = document.getElementById("convert-docx-btn");
  const docxStatus = document.getElementById("docx-status");

  // タブ切り替え
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("active");
      });
      tab.classList.add("active");

      var target = tab.getAttribute("data-tab");
      if (target === "text") {
        textPanel.classList.add("active");
        docxPanel.classList.remove("active");
      } else {
        textPanel.classList.remove("active");
        docxPanel.classList.add("active");
      }
    });
  });

  // テキスト変換
  convertTextBtn.addEventListener("click", function () {
    var input = inputText.value;
    if (!input) return;
    outputText.value = convertGandhariToUnicode(input);
    copyBtn.disabled = false;
  });

  // クリア
  clearBtn.addEventListener("click", function () {
    inputText.value = "";
    outputText.value = "";
    copyBtn.disabled = true;
  });

  // クリップボードにコピー
  copyBtn.addEventListener("click", function () {
    var text = outputText.value;
    if (!text) return;

    navigator.clipboard.writeText(text).then(function () {
      var original = copyBtn.textContent;
      copyBtn.textContent = "コピーしました";
      setTimeout(function () {
        copyBtn.textContent = original;
      }, 1500);
    });
  });

  // DOCXファイル選択
  docxInput.addEventListener("change", function () {
    var file = docxInput.files[0];
    if (file && file.name.toLowerCase().endsWith(".docx")) {
      convertDocxBtn.disabled = false;
      showStatus("", "");
    } else if (file) {
      convertDocxBtn.disabled = true;
      showStatus("DOCXファイルを選択してください。", "error");
    }
  });

  // DOCX変換
  convertDocxBtn.addEventListener("click", async function () {
    var file = docxInput.files[0];
    if (!file) return;

    convertDocxBtn.disabled = true;
    showStatus("変換中...", "processing");

    try {
      var outputName = await convertDocxFile(file);
      showStatus(
        outputName + " をダウンロードしました。",
        "success"
      );
    } catch (e) {
      showStatus("変換中にエラーが発生しました: " + e.message, "error");
    } finally {
      convertDocxBtn.disabled = false;
    }
  });

  function showStatus(message, type) {
    docxStatus.textContent = message;
    docxStatus.className = "status";
    if (message && type) {
      docxStatus.classList.add("show", type);
    }
  }
});
