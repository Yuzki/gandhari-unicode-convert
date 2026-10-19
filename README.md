# Gandhari Unicode Converter

A browser tool that converts characters of the "Gandhari Unicode" font, which uses the Unicode Private Use Area (PUA), into standard Unicode strings that use combining characters.

Public page: <https://yuzki.github.io/gandhari-unicode-convert/>

## Features

- Convert text pasted into the page from Gandhari Unicode to standard Unicode
- Convert the XML text of the body, headers, footers, footnotes and endnotes of a `.docx` file
- Download the converted file with a `_converted.docx` name
- English and Japanese interface, light and dark color themes

## Usage

1. Open the public page.
2. Choose the **Text conversion** or **DOCX file conversion** tab.
3. Text: paste text, choose **Convert**, then use **Copy to clipboard**. Empty input is reported as an error; whitespace is never trimmed and the text is never normalized. If copying is blocked, the result is selected so you can copy it manually.
4. DOCX: choose a `.docx` file, then **Convert and download**. The file extension must be `.docx` (any letter case). While a file is converting, file selection and the convert button are disabled; if conversion fails, the file stays selected so you can retry.
5. Check and save the result with a font or editor that can display combining characters.

### Language and theme

The language is chosen in this order; an invalid or unsupported candidate is skipped:

1. a valid `?lang=en` or `?lang=ja` in the URL;
2. the shared cookie `veda-lang` (only on `veda-ai.org` and its subdomains, see below);
3. the saved choice in this browser's local storage (`veda-lang`);
4. your browser's language list (for example `ja-JP` gives Japanese, `en-US` gives English);
5. English.

The theme follows `?theme=system|light|dark`, then the shared cookie `veda-theme`, then local storage (`veda-theme`), then `system`, which follows the device setting. The static `lang="en"` in the HTML only describes the fallback text; it does not override browser detection.

Only an explicit choice is saved: the language or theme control, the API, or a valid URL value. Detection from a cookie, the browser or the defaults saves nothing. Choosing System is saved too, so it overrides an earlier Light or Dark. A choice updates only its own URL parameter and keeps other parameters, the hash and history state. Choices are stored in local storage when available; if storage is blocked they apply to the current page view only. If the dictionaries cannot be loaded, the converter still works with English text.

Sharing across VEDA AI services works only on `veda-ai.org` or a subdomain over HTTPS: the cookies are written with `Domain=veda-ai.org; Path=/; Max-Age=31536000; SameSite=Lax; Secure` (not HttpOnly). On HTTP, on localhost and on the current GitHub Pages address (`https://yuzki.github.io/gandhari-unicode-convert/`) no cookie is written or read, so the choice stays in this origin's local storage. A plain link from another site cannot carry the choice to such an address; to hand it over, add `?lang=` and/or `?theme=` to the link. Changes are not synchronized live between tabs or sites.

### Privacy and dependencies

Conversion runs in your browser. The text and the contents of DOCX files are not uploaded. This does not mean the page works offline or makes no external requests: [JSZip 3.10.1](https://cdnjs.com/libraries/jszip/3.10.1) and [FileSaver.js 2.0.5](https://cdnjs.com/libraries/FileSaver.js/2.0.5) are loaded from cdnjs. Text conversion does not need them, but DOCX conversion fails with a message if they cannot be loaded.

### Run locally

This is a static site. Serve it over HTTP (the dictionaries are fetched, so opening `index.html` as a file does not load them):

```sh
uv run python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Tests

Tests use the Node.js built-in test runner:

```sh
node --test
```

- Mapping, text and DOCX conversion tests
- Cross-language tests that use `uv run python` to check the JavaScript mapping against the data in `notebook/gandhari_conveter.py`
- `test/locales.test.js`: English/Japanese dictionary parity and `index.html` i18n keys
- `test/preferences.test.js`: script wiring and the shared language/theme contract (precedence, explicit-only saving, system, cookie attributes and domain/HTTPS boundaries, URL updates), running the shipped vendored scripts against a browser stub
- `test/ui-state.test.js`: interface states (empty input, clipboard failures, DOCX eligibility, busy and failure recovery, dictionary failure, language change, tab keyboard handling) against a small DOM stub in `test/helpers/dom-stub.js`

## Shared design

The interface uses a pinned snapshot of the VEDA AI shared design assets (unreleased 0.1.0, commit `af6d1dc9f565b9d9a561a6479fef11131c75e3e4`) in [`vendor/veda-design/0.1.0-pilot-af6d1dc/`](vendor/veda-design/0.1.0-pilot-af6d1dc/). The upstream repository is private. The copies are unmodified; provenance, SHA-256 values, terms status and update/rollback steps are in [`SOURCE.md`](vendor/veda-design/0.1.0-pilot-af6d1dc/SOURCE.md). Local adjustments are in `css/style.css`. The footer links to the parent site (<https://veda-ai.org>, key `common.project.related`) as a plain same-tab link. Adoption issue: <https://github.com/Yuzki/gandhari-unicode-convert/issues/6>.

The footer "Report a problem" link opens the shared `veda-ai-feedback` issue form with `service=Gandhari Converter`. The vendored `scripts/report.js` adds the current page (origin and path only, no query or hash); without JavaScript the link still carries `service`. Reports become public GitHub issues.

## Files

- `index.html`: the page
- `css/style.css`: local styles on top of the shared design
- `locales/`: English and Japanese interface text and language profiles
- `vendor/veda-design/`: pinned shared design assets
- `js/mapping.js`: map from Gandhari Unicode PUA to standard Unicode
- `js/converter.js`: text conversion
- `js/docx-processor.js`: DOCX conversion
- `js/app.js`: interface behavior
- `test/`: tests
- `notebook/gandhari_conveter.py`: original conversion data in Python

## Note

Converted text contains combining characters. Stacked marks may display poorly in fonts or editors that do not support them.
