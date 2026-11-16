// Service worker: wires browser events to the individual modules. Contains no business logic.
// Every listener must be registered at the top level of this file (synchronously) so Chrome wakes the worker at the right time.

import { PAGES } from "../core/routes.js";
import { hostOf, matchSite } from "../core/sites.js";
import {
  changed, clearTabSite, forgetTab, getSites, hasConsent, migrate, onStorageChanged, setAllowedSite, setTabSite,
} from "../core/storage.js";
import { updateBadge } from "./badge.js";
import { record } from "./counter.js";
import { maybeNudge } from "./nudge.js";
import { enqueue } from "./queue.js";
import { ALARM_NAME, ensureAlarm, evaluateSchedule, onScheduleChanged } from "./scheduler.js";

const IGNORED_TRANSITIONS = new Set(["reload", "auto_subframe", "manual_subframe"]);

/** One navigation of the main frame: remind (if enabled) then record the visit. */
async function handleNavigation(tabId, host, url) {
  if (!host) return clearTabSite(tabId); // left the web (chrome://...) -> coming back counts as new
  const site = matchSite(host, await getSites()) || "";
  const nudge = site ? await maybeNudge(tabId, site, url) : false;
  // "allowed": this visit was already counted when the reminder appeared; only remember the tab's current site, do not count again.
  if (nudge === "allowed") return setTabSite(tabId, site);
  return record(tabId, site);
}

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0 || IGNORED_TRANSITIONS.has(details.transitionType)) return;
  const host = hostOf(details.url);
  enqueue(() => handleNavigation(details.tabId, host, details.url));
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !sender.tab) return;
  const tabId = sender.tab.id;
  if (msg?.type === "allow") {
    // From the full-page screen: allow the next navigation to this site.
    setAllowedSite(tabId, msg.site).then(() => sendResponse(true));
    return true; // respond asynchronously
  }
});

chrome.tabs.onRemoved.addListener((tabId) => enqueue(() => forgetTab(tabId)));

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  evaluateSchedule();
  updateBadge(); // counts reset to 0 after midnight, so the badge needs refreshing
});

onStorageChanged((changes) => {
  if (changed.tracking(changes) || changed.visits(changes) || changed.limits(changes) || changed.sites(changes)) {
    updateBadge();
  }
  if (changed.schedule(changes)) onScheduleChanged();
});

function init() {
  migrate().then(() => {
    updateBadge();
    ensureAlarm();
    evaluateSchedule();
  });
}
chrome.runtime.onStartup.addListener(init);
chrome.runtime.onInstalled.addListener((details) => {
  init();
  // Fresh install: open the privacy consent screen (the extension records no data until the user consents).
  if (details?.reason === "install") {
    hasConsent().then((ok) => {
      if (!ok) chrome.tabs.create({ url: chrome.runtime.getURL(PAGES.consent) });
    });
  }
});
init();
