// "Auto schedule" section: separate times to auto-start and auto-stop tracking.

import { getSchedule, setSchedule } from "../../../core/storage.js";
import { t } from "../../../i18n/index.js";
import { $, showHint } from "../../../ui/dom.js";

async function renderSchedule() {
  const s = await getSchedule();
  $("schStartOn").checked = s.startOn;
  $("schEndOn").checked = s.endOn;
  $("schStart").value = s.start;
  $("schEnd").value = s.end;
  $("schDays").querySelectorAll("button").forEach((b) => b.classList.toggle("on", s.days.includes(Number(b.dataset.d))));
  syncUi();
}

// Dim the time field when its toggle is off; dim the day field when both are off.
function syncUi() {
  const startOn = $("schStartOn").checked;
  const endOn = $("schEndOn").checked;
  $("schStart").disabled = !startOn;
  $("schEnd").disabled = !endOn;
  $("rowStart").classList.toggle("off", !startOn);
  $("rowEnd").classList.toggle("off", !endOn);
  $("rowDays").classList.toggle("off", !startOn && !endOn);
}

async function save() {
  const startOn = $("schStartOn").checked;
  const endOn = $("schEndOn").checked;
  const start = $("schStart").value;
  const end = $("schEnd").value;
  const days = [...$("schDays").querySelectorAll("button.on")].map((b) => Number(b.dataset.d));
  syncUi();

  let err = "";
  if ((startOn && !start) || (endOn && !end)) err = t("sch.err_time");
  else if ((startOn || endOn) && !days.length) err = t("sch.err_days");
  showHint("schHint", err);
  if (err) return;

  const prev = await getSchedule();
  await setSchedule({ startOn, endOn, start: start || prev.start, end: end || prev.end, days });
}

export function initSchedule() {
  for (const id of ["schStartOn", "schEndOn", "schStart", "schEnd"]) $(id).addEventListener("change", save);
  $("schDays").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-d]");
    if (!btn) return;
    btn.classList.toggle("on");
    save();
  });
  // The schedule form is loaded only once when the page opens so it does not overwrite what the user is typing.
  renderSchedule();
}
