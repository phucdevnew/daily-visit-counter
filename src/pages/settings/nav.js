// Navigation between settings sections.
// The left menu is generated from the <section class="panel" data-section data-icon data-title-key> elements in the HTML,
// so adding a new section only requires adding a section element (no change to this file).

import { t } from "../../i18n/index.js";
import { $ } from "../../ui/dom.js";

const panels = [...document.querySelectorAll(".panel[data-section]")];
const sidenav = $("sidenav");

function buildMenu() {
  for (const p of panels) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "navitem";
    btn.dataset.s = p.dataset.section;
    const icon = document.createElement("span");
    icon.className = "ni";
    icon.textContent = p.dataset.icon || "•";
    // Labels are translated by key; i18n's applyI18n() updates them when the language changes.
    const label = document.createElement("span");
    label.dataset.i18n = p.dataset.titleKey;
    label.textContent = t(p.dataset.titleKey);
    btn.append(icon, label);
    sidenav.append(btn);
  }
}

/** Open a section; the open section is remembered in the #hash so a reload or a direct link lands on it. */
export function showSection(id) {
  if (!panels.some((p) => p.dataset.section === id)) id = panels[0].dataset.section;
  for (const p of panels) p.hidden = p.dataset.section !== id;
  sidenav.querySelectorAll(".navitem").forEach((b) => b.classList.toggle("active", b.dataset.s === id));
  history.replaceState(null, "", `#${id}`);
}

export function initNav() {
  buildMenu();
  sidenav.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".navitem");
    if (btn) showSection(btn.dataset.s);
  });
  window.addEventListener("hashchange", () => showSection(location.hash.slice(1)));
  showSection(location.hash.slice(1));
}
