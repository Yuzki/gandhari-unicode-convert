/*
 * Footer "report a problem" link: appends the current page (origin + path,
 * never the query or hash) to the link's GitHub issue-form URL.
 * Without this script the link still opens the form with `service` filled in.
 * Independent of scripts/i18n.js; links are selected by [data-veda-report-link].
 */
(() => {
  "use strict";

  // Exact option labels of the form's `service` dropdown (veda-ai-feedback report.yml).
  // GitHub pre-fills a dropdown only on an exact match, so anything else becomes "Other".
  const SERVICES = Object.freeze([
    "EWAia Abbreviation Search",
    "Veda Bib",
    "Veda Image",
    "Text Image Viewer",
    "VEDA AI Reader",
    "Text Search",
    "Gandhari Converter",
    "Project site",
    "Other",
  ]);

  function decorate(link) {
    let url;
    try {
      url = new URL(link.getAttribute("href"), location.href);
    } catch {
      return;
    }
    const service = link.getAttribute("data-veda-report-service") || url.searchParams.get("service");
    if (service !== null) url.searchParams.set("service", SERVICES.includes(service) ? service : "Other");
    if (/^https?:$/.test(location.protocol)) url.searchParams.set("page", location.origin + location.pathname);
    link.setAttribute("href", url.href);
  }

  function apply(root = document) {
    for (const link of root.querySelectorAll("[data-veda-report-link]")) decorate(link);
  }

  window.VedaReport = { apply, SERVICES };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => apply());
  else apply();
})();
