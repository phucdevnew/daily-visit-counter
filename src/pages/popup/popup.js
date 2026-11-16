import { collapse, sortedEntries, sumCounts } from "../../core/counts.js";
import { todayKey } from "../../core/dates.js";
import { PAGES } from "../../core/routes.js";
import {
  getSchedule, getSites, getTracking, getVisits, hasConsent, isUiRelevant, onStorageChanged, setTracking,
} from "../../core/storage.js";
import { currentLocale, i18nReady, t, tRich } from "../../i18n/index.js";
import { $, siteRow } from "../../ui/dom.js";

const toggle = $("toggle");

async function render() {
  const [visits, tracking, sites, schedule, consented] = await Promise.all([
    getVisits(), getTracking(), getSites(), getSchedule(), hasConsent(),
  ]);
  const today = collapse(visits[todayKey()], sites);
  const entries = sortedEntries(today);
  const max = entries.length ? entries[0][1] : 1;

  $("date").textContent = new Date().toLocaleDateString(currentLocale(), {
    weekday: "long", day: "numeric", month: "long",
  });
  $("total").textContent = sumCounts(today);
  $("sitesChip").replaceChildren(tRich("popup.sites", { n: entries.length }));
  const topChip = $("topChip");
  topChip.hidden = !entries.length;
  if (entries.length) topChip.replaceChildren(tRich("popup.top", { site: entries[0][0] }));

  $("status").classList.toggle("on", tracking);
  $("statusText").textContent = t(tracking ? "popup.status_on" : "popup.status_off");
  toggle.classList.toggle("running", tracking);
  toggle.textContent = t(!consented ? "popup.consent_cta" : tracking ? "popup.stop" : "popup.start");

  const parts = [];
  if (schedule.startOn) parts.push(t("popup.auto_start", { t: schedule.start }));
  if (schedule.endOn) parts.push(t("popup.auto_end", { t: schedule.end }));
  $("auto").hidden = !parts.length;
  $("auto").textContent = t("popup.auto", { parts: parts.join(" · ") });

  $("empty").hidden = entries.length > 0;
  $("list").replaceChildren(...entries.map(([host, n]) => siteRow(host, n, max)));
}

const openPage = (page) => {
  chrome.tabs.create({ url: chrome.runtime.getURL(PAGES[page]) });
  window.close();
};

toggle.addEventListener("click", async () => {
  // Tracking cannot be enabled before privacy consent is given: open the consent screen.
  if (!(await hasConsent())) return openPage("consent");
  await setTracking(!(await getTracking()));
});

onStorageChanged((changes) => {
  if (isUiRelevant(changes)) render();
});

for (const page of ["stats", "settings"]) $(page).addEventListener("click", () => openPage(page));

await i18nReady;
render();
