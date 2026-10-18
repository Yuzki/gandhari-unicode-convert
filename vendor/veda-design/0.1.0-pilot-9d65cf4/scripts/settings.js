/*
 * Display settings popover behavior: Esc, outside click and tabbing out close
 * the open details[data-veda-settings]; Esc returns focus to its summary.
 * The open state is never stored. Without this script the details still
 * opens and closes natively via its summary.
 */
(() => {
  "use strict";

  const OPEN = "details[data-veda-settings][open]";

  function closeOutside(target) {
    for (const details of document.querySelectorAll(OPEN)) {
      if (!details.contains(target)) details.open = false;
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const details = document.querySelector(OPEN);
    if (!details) return;
    event.preventDefault();
    details.open = false;
    details.querySelector("summary")?.focus();
  });
  document.addEventListener("pointerdown", (event) => closeOutside(event.target));
  document.addEventListener("focusin", (event) => closeOutside(event.target));
})();
