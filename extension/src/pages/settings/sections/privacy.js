// "Privacy" section: view consent status, withdraw consent, delete stored data.

import { PAGES } from "../../../core/routes.js";
import {
  clearVisits, getConsent, hasConsent, isUiRelevant, onStorageChanged, withdrawConsent,
} from "../../../core/storage.js";
import { currentLocale, t } from "../../../i18n/index.js";
import { $ } from "../../../ui/dom.js";

async function render() {
  const consented = await hasConsent();
  $("privStatus").textContent = consented
    ? t("priv.status_yes", { date: new Date((await getConsent()).at).toLocaleDateString(currentLocale()) })
    : t("priv.status_no");
  $("privReview").textContent = t(consented ? "priv.review" : "priv.review_agree");
  $("privWithdraw").hidden = !consented;
}

export function initPrivacy() {
  $("privReview").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL(PAGES.consent) });
  });
  $("privWithdraw").addEventListener("click", async () => {
    if (confirm(t("priv.withdraw_confirm"))) await withdrawConsent();
  });
  $("privDelete").addEventListener("click", async () => {
    if (confirm(t("stats.clear_confirm"))) await clearVisits();
  });
  onStorageChanged((changes) => {
    if (isUiRelevant(changes)) render();
  });
  render();
}
