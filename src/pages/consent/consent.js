// Privacy consent screen. The extension records no data until the user clicks "Agree" here.

import { PRIVACY_POLICY_URL } from "../../core/routes.js";
import { getConsent, grantConsent, hasConsent } from "../../core/storage.js";
import { currentLocale, i18nReady, t, tRich } from "../../i18n/index.js";
import { $ } from "../../ui/dom.js";

function showDone(message) {
  $("ask").hidden = true;
  $("done").hidden = false;
  $("doneTitle").textContent = message.title;
  $("doneBody").textContent = message.body;
}

async function render() {
  $("collectBody").replaceChildren(tRich("consent.collect_body"));
  if (PRIVACY_POLICY_URL) {
    $("policyLink").href = PRIVACY_POLICY_URL;
    $("policyLink").hidden = false;
  }
  // Already agreed (e.g. clicked "Review" in Settings): still show the full terms to read, but replace the consent buttons
  // with a note of the consent date and a close button. Everything is decided BEFORE the page is shown, so there is no flicker.
  if (await hasConsent()) {
    const { at } = await getConsent();
    $("alreadyNote").textContent = t("consent.already", { date: new Date(at).toLocaleDateString(currentLocale()) });
    $("alreadyNote").hidden = false;
    $("askActions").hidden = true;
    $("reviewActions").hidden = false;
  }
  $("ask").hidden = false;
}

$("agree").addEventListener("click", async () => {
  await grantConsent();
  showDone({ title: t("consent.done_title"), body: t("consent.done_body") });
});

$("decline").addEventListener("click", () => {
  $("declinedNote").hidden = false; // nothing is recorded; the user can come back from the popup
});

async function closeThisTab() {
  const tab = await chrome.tabs.getCurrent();
  if (tab) chrome.tabs.remove(tab.id);
}
$("close").addEventListener("click", closeThisTab);
$("closeReview").addEventListener("click", closeThisTab);

await i18nReady;
render();
