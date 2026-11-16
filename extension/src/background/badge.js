// Badge on the extension icon: red "!" if a limit has been reached today, green "ON" if tracking, otherwise empty.

import { anyLimitReached } from "../core/limits.js";
import { collapse } from "../core/counts.js";
import { todayKey } from "../core/dates.js";
import { getLimits, getSites, getTracking, getVisits } from "../core/storage.js";

export async function updateBadge() {
  const [tracking, visits, limits, sites] = await Promise.all([getTracking(), getVisits(), getLimits(), getSites()]);
  const today = collapse(visits[todayKey()], sites);
  if (anyLimitReached(today, limits)) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#e5484d" });
  } else {
    await chrome.action.setBadgeText({ text: tracking ? "ON" : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
  }
}
