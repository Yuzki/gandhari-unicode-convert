const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadLocale } = require("./helpers/dom-stub");

const ROOT = path.resolve(__dirname, "..");
const VENDOR = "vendor/veda-design/0.1.0-pilot-9d65cf4";
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const en = loadLocale("en");

const links = html.match(/<a\s[^>]*data-veda-report-link[^>]*>[\s\S]*?<\/a\s*>/g) || [];

function attr(tag, name) {
  const match = tag.match(new RegExp("\\s" + name + '="([^"]*)"'));
  return match && match[1].replace(/&amp;/g, "&");
}

// Run report.js against a stub document/location and return the final link href.
function runReport(location) {
  const link = {
    attrs: {
      href: attr(links[0], "href"),
      "data-veda-report-service": attr(links[0], "data-veda-report-service"),
    },
    getAttribute(name) {
      return name in this.attrs ? this.attrs[name] : null;
    },
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const document = {
    readyState: "complete",
    querySelectorAll: () => [link],
    addEventListener() {},
  };
  const context = { URL, document, location, window: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, VENDOR, "scripts/report.js"), "utf8"),
    context,
  );
  return new URL(link.attrs.href);
}

describe("footer report link", () => {
  it("has one link to the shared feedback form for this service", () => {
    assert.equal(links.length, 1);
    const url = new URL(attr(links[0], "href"));
    assert.equal(url.origin, "https://github.com");
    assert.equal(url.pathname, "/Yuzki/veda-ai-feedback/issues/new");
    assert.equal(url.searchParams.get("template"), "report.yml");
    assert.equal(url.searchParams.get("service"), "Gandhari Converter");
    assert.equal(attr(links[0], "data-veda-report-service"), "Gandhari Converter");
    assert.equal(attr(links[0], "rel"), "noopener");
    assert.equal(attr(links[0], "data-i18n"), "common.footer.report");
  });

  it("is the last footer link and is described by an existing note", () => {
    const list = html.match(/<ul class="veda-footer__links">([\s\S]*?)<\/ul>/)[1];
    const items = list.match(/<li>[\s\S]*?<\/li>/g);
    assert.ok(items[items.length - 1].includes("data-veda-report-link"));
    const id = attr(links[0], "aria-describedby");
    const note = html.match(new RegExp('<p\\s+id="' + id + '"[^>]*>([\\s\\S]*?)</p>'));
    assert.ok(note, "note exists");
    assert.match(note[0], /data-i18n="common\.footer\.reportNote"/);
    assert.equal(note[1].replace(/\s+/g, " ").trim(), en["common.footer.reportNote"]);
  });

  it("keeps static link text equal to the English dictionary", () => {
    const text = links[0].replace(/<[^>]*>/g, "").trim();
    assert.equal(text, en["common.footer.report"]);
  });

  it("report.js adds only origin and path as page and keeps service", () => {
    const url = runReport({
      protocol: "https:",
      origin: "https://example.org",
      pathname: "/x/",
      href: "https://example.org/x/?q=1#h",
    });
    assert.equal(url.searchParams.get("page"), "https://example.org/x/");
    assert.equal(url.searchParams.get("service"), "Gandhari Converter");
  });

  it("report.js sends no page on file URLs", () => {
    const url = runReport({
      protocol: "file:",
      origin: "null",
      pathname: "/tmp/index.html",
      href: "file:///tmp/index.html",
    });
    assert.equal(url.searchParams.get("page"), null);
    assert.equal(url.searchParams.get("service"), "Gandhari Converter");
  });
});

describe("vendored design assets", () => {
  it("exist for every vendored path referenced by index.html", () => {
    const paths = [...html.matchAll(/(?:href|src)="(vendor\/[^"]+)"/g)].map((m) => m[1]);
    assert.ok(paths.length >= 7);
    for (const p of paths) assert.ok(fs.existsSync(path.join(ROOT, p)), p);
    assert.ok(paths.some((p) => p.endsWith("scripts/report.js")));
  });

  it("match the SHA-256 values in SOURCE.md", () => {
    const source = fs.readFileSync(path.join(ROOT, VENDOR, "SOURCE.md"), "utf8");
    const rows = [...source.matchAll(/^([0-9a-f]{64})  (\S+)$/gm)];
    assert.equal(rows.length, 7);
    for (const [, hash, file] of rows) {
      const data = fs.readFileSync(path.join(ROOT, VENDOR, file));
      assert.equal(crypto.createHash("sha256").update(data).digest("hex"), hash, file);
    }
  });
});
