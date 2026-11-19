import { collapse, sortedEntries, sumCounts } from "../../core/counts.js";
import { todayKey } from "../../core/dates.js";
import { compareDays } from "../../core/stats-calc.js";
import { effectiveIndex, quoteParts, randomOtherIndex } from "../../core/quote.js";
import { PAGES } from "../../core/routes.js";
import {
  getQuoteOverride, getSchedule, getSites, getTracking, getVisits, hasConsent, isUiRelevant, onStorageChanged, setQuoteOverride,
  setTracking,
} from "../../core/storage.js";
import { currentLang, currentLocale, getQuotes, i18nReady, t, tRich } from "../../i18n/index.js";
import { $, siteRow } from "../../ui/dom.js";

const MAX_LISTED = 4; // the popup lists only the top sites; the Stats page has the full ranking
const toggle = $("toggle");

/** Index of the quote shown now: today's quote of the day, unless the user picked another one by hand today. */
async function currentQuoteIndex(count) {
  return effectiveIndex(count, todayKey(), currentLang(), await getQuoteOverride());
}

async function renderQuote() {
  const list = getQuotes();
  const index = await currentQuoteIndex(list.length);
  $("quote").hidden = index < 0;
  if (index < 0) return;
  const { text, author } = quoteParts(list[index]);
  $("quoteText").textContent = text;
  // Same layout for every entry: the author of a quote, "Ca dao" for a folk verse, otherwise the proverb label.
  $("quoteAuthor").textContent = author ?? t("popup.quote_proverb");
}

async function render() {
  const [visits, tracking, sites, schedule, consented] = await Promise.all([
    getVisits(), getTracking(), getSites(), getSchedule(), hasConsent(),
  ]);
  const today = collapse(visits[todayKey()], sites);
  const entries = sortedEntries(today);
  const max = entries.length ? entries[0][1] : 1;

  await renderQuote();

  $("date").textContent = new Date().toLocaleDateString(currentLocale(), {
    weekday: "long", day: "numeric", month: "long",
  });
  $("total").textContent = sumCounts(today);

  // Change against yesterday (hidden when neither day has any visit).
  const { today: todayTotal, yesterday, diff } = compareDays(visits, sites);
  const delta = $("delta");
  delta.hidden = todayTotal === 0 && yesterday === 0;
  delta.className = `delta ${diff > 0 ? "up" : diff < 0 ? "down" : ""}`.trim();
  // Compact label (icon + number); the full sentence is the tooltip.
  const path = diff > 0 ? '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>'
    : diff < 0 ? '<polyline points="3 7 9 13 13 9 21 17"/><polyline points="15 17 21 17 21 11"/>'
    : '<line x1="5" y1="12" x2="19" y2="12"/>';
  delta.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg><span>${diff === 0 ? "" : Math.abs(diff)}</span>`;
  delta.title = diff > 0 ? t("popup.delta_up", { n: diff })
    : diff < 0 ? t("popup.delta_down", { n: -diff })
    : t("popup.delta_same");
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
  $("list").replaceChildren(...entries.slice(0, MAX_LISTED).map(([host, n]) => siteRow(host, n, max)));
}

const openPage = (page) => {
  chrome.tabs.create({ url: chrome.runtime.getURL(PAGES[page]) });
  window.close();
};

// "Show another quote": pick a random different one and keep it for the rest of today.
$("quoteShuffle").addEventListener("click", async () => {
  const count = getQuotes().length;
  const current = await currentQuoteIndex(count);
  await setQuoteOverride({ date: todayKey(), lang: currentLang(), index: randomOtherIndex(count, current) });
  renderQuote();
});

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
$("settings").title = $("settings").ariaLabel = t("nav.settings").replace(/^\S+\s/, "");
render();
