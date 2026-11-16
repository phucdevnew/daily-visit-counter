// Reminder screen: when tracking and about to start A NEW VISIT to a distracting site, switch the tab to a full-page screen
// (PAGES.nudge) before the user reaches that page. The visit is counted IMMEDIATELY when the reminder appears (even if the user
// then chooses to go back), to reflect the true intent to visit.
//
// Deliberately NOT drawing an overlay on the web page itself: that needs website access permission, and the release requests none.
// The overlay code is kept in docs/archive/overlay-nudge/ for re-adding later.

import { PAGES } from "../core/routes.js";
import { clearAllowedSite, getAllowedSite, getLimits, getTabSite, getTracking } from "../core/storage.js";

/**
 * Returns "shown" (switched to the reminder screen, visit must be counted), "allowed" (just clicked Continue on the reminder screen,
 * visit already counted earlier) or false (no reminder).
 */
export async function maybeNudge(tabId, site, url) {
  if ((await getAllowedSite(tabId)) === site) {
    await clearAllowedSite(tabId);
    return "allowed";
  }
  const [tracking, limits, tabSite] = await Promise.all([getTracking(), getLimits(), getTabSite(tabId)]);
  if (!tracking || !limits.nudge || tabSite === site) return false;

  const page = new URL(chrome.runtime.getURL(PAGES.nudge));
  page.searchParams.set("url", url);
  page.searchParams.set("site", site);
  await chrome.tabs.update(tabId, { url: page.toString() });
  return "shown";
}
