// Records visits.

import { todayKey } from "../core/dates.js";
import { getTabSite, getTracking, getVisits, saveVisits, setTabSite } from "../core/storage.js";
import { notifyIfLimit } from "./notifications.js";

/**
 * `site` is the matching distracting domain, or "" if the current page is not on the list.
 * Always remembers the tab's current site (even while tracking is off) so that when it is turned on,
 * staying on the same site is not counted as a new visit.
 */
export async function record(tabId, site) {
  const last = await getTabSite(tabId);
  await setTabSite(tabId, site);
  if (!site || last === site) return;
  if (!(await getTracking())) return;

  const visits = await getVisits();
  const day = todayKey();
  visits[day] = visits[day] || {};
  visits[day][site] = (visits[day][site] || 0) + 1;
  await saveVisits(visits);
  await notifyIfLimit(site, visits[day]);
}
