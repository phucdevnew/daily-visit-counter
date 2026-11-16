// Nudge screen: while tracking and about to start A NEW VISIT to a distracting site, show a blurred overlay on the page itself.
// The visit is counted AS SOON AS the nudge is shown (even if the user then goes back), to reflect the real intent to visit.
// If permission to inject into that page has not been granted, use the full-page screen (PAGES.nudge) instead.

import { showNudgeOverlay } from "../content/overlay.js";
import { todayKey } from "../core/dates.js";
import { nudgeWarning } from "../core/limits.js";
import { PAGES } from "../core/routes.js";
import { overlayOrigins } from "../core/sites.js";
import {
  clearAllowedSite, getAllowedSite, getLimits, getTabSite, getTracking, getVisits,
} from "../core/storage.js";
import { i18nReady, t } from "../i18n/index.js";

/**
 * Returns "shown" (nudge displayed, the visit must be counted), "allowed" (user just clicked Proceed anyway on the full-page screen,
 * visit already counted earlier) or false (no nudge).
 */
export async function maybeNudge(tabId, site, url) {
  if ((await getAllowedSite(tabId)) === site) {
    await clearAllowedSite(tabId);
    return "allowed";
  }
  const [tracking, limits, tabSite] = await Promise.all([getTracking(), getLimits(), getTabSite(tabId)]);
  if (!tracking || !limits.nudge || tabSite === site) return false;

  // The overlay is used only for default sites (the manifest declares optional permissions only for them) and once permission is granted.
  const origins = overlayOrigins([site]);
  if (origins.length && (await chrome.permissions.contains({ origins }))) {
    await i18nReady;
    const today = (await getVisits())[todayKey()] || {};
    const w = nudgeWarning(site, today, limits);
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: showNudgeOverlay,
        args: [{
          site,
          n: today[site] || 0,
          warn: w ? t(w.key, w.params) : "",
          seconds: limits.nudgeSeconds,
          text: {
            h1: t("nudge.h1"),
            count: t("nudge.count_overlay", { n: (today[site] || 0) + 1 }),
            back: t("nudge.back"),
            go: t("nudge.go"),
            goWait: t("nudge.go_wait", { n: "{n}" }), // "{n}" replaced by the overlay with the remaining seconds
          },
        }],
        injectImmediately: true,
      });
      return "shown";
    } catch (err) {
      console.warn("Could not inject the overlay, using the full-page screen:", err);
    }
  }

  const page = new URL(chrome.runtime.getURL(PAGES.nudge));
  page.searchParams.set("url", url);
  page.searchParams.set("site", site);
  await chrome.tabs.update(tabId, { url: page.toString() });
  return "shown";
}
