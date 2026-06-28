# Gandhari Unicode 変換ツール

Unicode の私用領域（PUA）を使った「Gandhari Unicode」フォントの文字を、結合文字を用いた標準 Unicode 文字列へ変換するブラウザ用ツールです。

公開ページ: <https://yuzki.github.io/gandhari-unicode-convert/>

## できること

- テキスト欄に貼り付けた Gandhari Unicode 文字を標準 Unicode へ変換
- `.docx` ファイル内の本文、ヘッダー、フッター、脚注、文末脚注の XML テキストを変換
- 変換後の `.docx` を `_converted.docx` 付きのファイル名でダウンロード

DOCX ファイルはブラウザ内で処理され、サーバーには送信されません。

## 使い方

### Web ページで使う

1. 公開ページを開きます。
2. `テキスト変換` または `DOCXファイル変換` のタブを選びます。
3. テキストを貼り付けるか、`.docx` ファイルを選択して変換します。
4. 変換後のテキストやファイルを、結合文字が表示できるフォントで確認・保存します。

### ローカルで開く

このリポジトリは静的サイトです。ローカルで確認する場合は、簡易 HTTP サーバーを起動してブラウザで開きます。

```sh
uv run python -m http.server 8000
```

起動後、`http://localhost:8000/` を開いてください。

## テスト

テストは Node.js の組み込み test runner を使います。

```sh
node --test
```

クロス言語整合性テストでは `uv run python` を使い、`notebook/gandhari_conveter.py` の変換データと JavaScript のマッピングが一致することを確認します。

## ファイル構成

- `index.html`: 変換ツールの画面
- `js/mapping.js`: Gandhari Unicode PUA から標準 Unicode への変換マップ
- `js/converter.js`: テキスト変換ロジック
- `js/docx-processor.js`: DOCX ファイル変換ロジック
- `js/app.js`: UI 制御
- `test/`: 変換、マッピング、DOCX 処理のテスト
- `notebook/gandhari_conveter.py`: 元データを含む Python ノートブック由来の変換コード

## 注意

変換後の文字列には結合文字が含まれます。表示や保存には、結合文字の表示に対応したフォントやエディタを使ってください。
