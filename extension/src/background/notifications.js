// System notification when a site or the total reaches/exceeds its daily limit.

import { i18nReady, t } from "../i18n/index.js";
import { limitAlert } from "../core/limits.js";
import { getLimits } from "../core/storage.js";

/** `counts` = today's count table (including the visit just recorded for `site`). */
export async function notifyIfLimit(site, counts) {
  await i18nReady;
  const limits = await getLimits();
  if (!limits.notify) return;
  const alert = limitAlert(site, counts, limits);
  if (!alert) return;
  chrome.notifications.create({
    type: "basic",
    iconUrl: "assets/icons/icon128.png",
    title: "Daily Visit Counter",
    message: t(alert.key, alert.params),
  });
}
