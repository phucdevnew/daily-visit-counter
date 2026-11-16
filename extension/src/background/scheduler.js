// Automatically turns tracking on/off on a schedule.
// Every minute, check start/stop events that came due since the last check (so if Chrome was closed at that time,
// reopening still catches up), then apply the most recent event. If you manually toggle in between, that choice
// is kept until the next event.

import { eventsBetween, isWorkTime, scheduleActive } from "../core/schedule.js";
import { getSchedule, getScheduleLastRun, setScheduleLastRun, setTracking } from "../core/storage.js";

export const ALARM_NAME = "schedule";
const MAX_CATCHUP_MS = 48 * 3600 * 1000;

export async function evaluateSchedule() {
  const schedule = await getSchedule();
  if (!scheduleActive(schedule)) return;
  const lastRun = await getScheduleLastRun();
  const now = new Date();
  const from = lastRun ? new Date(Math.max(lastRun, now - MAX_CATCHUP_MS)) : now;
  await setScheduleLastRun(now.getTime());
  const events = eventsBetween(schedule, from, now);
  if (events.length) await setTracking(events[events.length - 1].type === "start");
}

/** Schedule just changed: start evaluating from now; if both ends are enabled and it is within working hours, turn on right away. */
export async function onScheduleChanged() {
  const schedule = await getSchedule();
  await setScheduleLastRun(Date.now());
  if (isWorkTime(schedule, new Date())) await setTracking(true);
}

export async function ensureAlarm() {
  if (!(await chrome.alarms.get(ALARM_NAME))) chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
}
