// Full-page reminder screen shown before entering a tracked site (when "reminder" is enabled in Settings).
// The visit was already recorded by the background script before this page opened.

import { matchSite } from "../../core/sites.js";
import { todayKey } from "../../core/dates.js";
import { nudgeWarning } from "../../core/limits.js";
import { getLimits, getVisits } from "../../core/storage.js";
import { i18nReady, t, tRich } from "../../i18n/index.js";
import { $, siteIcon } from "../../ui/dom.js";

const params = new URLSearchParams(location.search);
const site = params.get("site") || "";
let target = params.get("url") || "";

// Only allow going back to an http(s) address that belongs to the blocked site.
function isValidTarget(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return Boolean(site) && matchSite(u.hostname.replace(/^www\./, ""), [site]) === site;
  } catch {
    return false;
  }
}

async function init() {
  if (!isValidTarget(target)) target = "";
  $("site").textContent = site || t("nudge.this_site");
  if (site) $("icon").replaceWith(siteIcon(site));

  const [visits, limits] = await Promise.all([getVisits(), getLimits()]);
  const today = visits[todayKey()] || {};
  $("count").replaceChildren(tRich("nudge.count_page", { n: today[site] || 0 }));

  const warning = nudgeWarning(site, today, limits);
  if (warning) {
    $("warn").textContent = t(warning.key, warning.params);
    $("warn").hidden = false;
  }

  // Countdown before "Continue anyway" is allowed.
  const go = $("go");
  let left = target ? Math.max(0, limits.nudgeSeconds) : 0;
  const tick = () => {
    if (!target) { go.hidden = true; return; }
    go.textContent = left > 0 ? t("nudge.go_wait", { n: left }) : t("nudge.go");
    go.disabled = left > 0;
    if (left > 0) { left -= 1; setTimeout(tick, 1000); }
  };
  tick();
}

$("back").addEventListener("click", async () => {
  // Close the tab; if it is the window's only tab, navigate to a new tab instead so the window is not closed.
  const tab = await chrome.tabs.getCurrent();
  const siblings = await chrome.tabs.query({ windowId: tab.windowId });
  if (siblings.length > 1) chrome.tabs.remove(tab.id);
  else chrome.tabs.update(tab.id, { url: "chrome://newtab" });
});

$("go").addEventListener("click", async () => {
  if (!target) return;
  await chrome.runtime.sendMessage({ type: "allow", site });
  location.replace(target);
});

await i18nReady;
init();
