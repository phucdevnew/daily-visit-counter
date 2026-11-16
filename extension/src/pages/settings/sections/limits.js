// "Limits & reminders" section: daily maximum, notifications, and the reminder screen before entering a site.

import { getLimits, setLimits } from "../../../core/storage.js";
import { $ } from "../../../ui/dom.js";

const clampInt = (id, min, max, fallback) => {
  const v = Math.floor(Number($(id).value));
  return Number.isFinite(v) && $(id).value !== "" ? Math.min(max, Math.max(min, v)) : fallback;
};

async function renderLimits() {
  const l = await getLimits();
  $("limTotal").value = l.total;
  $("limSite").value = l.perSite;
  $("limNotify").checked = l.notify;
  $("limNudge").checked = l.nudge;
  $("limSeconds").value = l.nudgeSeconds;
  syncUi();
}

function syncUi() {
  const on = $("limNudge").checked;
  $("limSeconds").disabled = !on;
  $("rowSeconds").classList.toggle("off", !on);
}

async function save() {
  const prev = await getLimits();
  const limits = {
    total: clampInt("limTotal", 0, 9999, prev.total),
    perSite: clampInt("limSite", 0, 9999, prev.perSite),
    notify: $("limNotify").checked,
    nudge: $("limNudge").checked,
    nudgeSeconds: clampInt("limSeconds", 0, 60, prev.nudgeSeconds),
  };
  // Show the normalized value again (e.g. negative number -> 0).
  $("limTotal").value = limits.total;
  $("limSite").value = limits.perSite;
  $("limSeconds").value = limits.nudgeSeconds;
  syncUi();
  await setLimits(limits);
}

export function initLimits() {
  for (const id of ["limTotal", "limSite", "limNotify", "limNudge", "limSeconds"]) $(id).addEventListener("change", save);
  renderLimits();
}
