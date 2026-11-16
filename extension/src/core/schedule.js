// Schedule that automatically turns tracking on/off. The START time and STOP time are two independent events:
// each has its own switch (auto-start only, auto-stop only, or both). Pure logic.

export const DEFAULT_SCHEDULE = {
  startOn: false,
  endOn: false,
  start: "09:00",
  end: "18:00",
  days: [1, 2, 3, 4, 5], // 0 = Sunday ... 6 = Saturday
};

/** "HH:MM" -> minutes since 00:00. */
export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Normalizes stored data (including the old format with only `enabled`) and fills in missing defaults. */
export function normalizeSchedule(raw) {
  const s = { ...DEFAULT_SCHEDULE, ...(raw || {}) };
  if (raw && "enabled" in raw && !("startOn" in raw)) s.startOn = s.endOn = Boolean(raw.enabled);
  return { startOn: s.startOn, endOn: s.endOn, start: s.start, end: s.end, days: s.days };
}

export const scheduleActive = (s) => s.startOn || s.endOn;

/** Start/stop events that occurred in the interval (from, to], in chronological order. */
export function eventsBetween(s, from, to) {
  const events = [];
  const day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (; day <= to; day.setDate(day.getDate() + 1)) {
    if (!s.days.includes(day.getDay())) continue;
    for (const [type, on, hhmm] of [["start", s.startOn, s.start], ["end", s.endOn, s.end]]) {
      if (!on) continue;
      const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, toMinutes(hhmm));
      if (t > from && t <= to) events.push({ type, t });
    }
  }
  return events.sort((a, b) => a.t - b.t);
}

/** When both ends are enabled: whether `now` falls within working hours (supports shifts crossing midnight). */
export function isWorkTime(s, now) {
  if (!s.startOn || !s.endOn || !s.days.includes(now.getDay())) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  const a = toMinutes(s.start);
  const b = toMinutes(s.end);
  return a < b ? m >= a && m < b : m >= a || m < b;
}
