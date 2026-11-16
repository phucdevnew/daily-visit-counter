// "Tracked websites" section: add/remove the websites that are counted.

import { cleanDomain } from "../../../core/sites.js";
import { changed, getSites, onStorageChanged, setSites } from "../../../core/storage.js";
import { t } from "../../../i18n/index.js";
import { $, showHint, siteIcon } from "../../../ui/dom.js";

function renderSites(sites) {
  $("siteChips").replaceChildren(...sites.map((domain) => {
    const chip = document.createElement("span");
    chip.className = "sitechip";
    const label = document.createElement("span");
    label.textContent = domain;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.title = t("sites.remove", { d: domain });
    remove.textContent = "×";
    remove.addEventListener("click", () => setSites(sites.filter((d) => d !== domain)));
    chip.append(siteIcon(domain), label, remove);
    return chip;
  }));
}

export function initSites() {
  $("siteForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const domain = cleanDomain($("siteInput").value);
    if (!domain) return showHint("siteHint", t("sites.invalid"));
    const sites = await getSites();
    if (sites.includes(domain)) return showHint("siteHint", t("sites.dup", { d: domain }));
    showHint("siteHint", "");
    $("siteInput").value = "";
    await setSites([...sites, domain]);
  });

  // Update when the list changes (or the language changes, since the delete button's tooltip has text).
  onStorageChanged((changes) => {
    if (changed.sites(changes) || changed.lang(changes)) getSites().then(renderSites);
  });
  getSites().then(renderSites);
}
