// Calculations for the Stats page: date ranges, aggregation, previous-period comparison, goals and day streaks.
// Pure logic (no DOM, no chrome.*) so it is testable; text formatting lives in the page.
//
// `visits` has the form { "YYYY-MM-DD": { "facebook.com": 5, ... } }; `period` is "day" | "week" | "month" | "year".

import { collapse, sortedEntries, sumCounts } from "./counts.js";
import { DAY_MS, addDays, keyOf, monthPrefix, parseKey, todayKey } from "./dates.js";

/** Range [start, end] (Dates, both inclusive) of the period containing `anchor`. Weeks start on Monday. */
export function rangeFor(anchor, period) {
  const d = new Date(anchor);
  if (period === "day") return [d, d];
  if (period === "week") {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    return [start, addDays(start, 6)];
  }
  if (period === "month") {
    return [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 0)];
  }
  return [new Date(d.getFullYear(), 0, 1), new Date(d.getFullYear(), 11, 31)];
}

/** Shifts `anchor` to the previous period (dir = -1) or next period (dir = 1). */
export function shiftAnchor(anchor, period, dir) {
  const d = new Date(anchor);
  if (period === "day") d.setDate(d.getDate() + dir);
  else if (period === "week") d.setDate(d.getDate() + 7 * dir);
  else if (period === "month") d.setMonth(d.getMonth() + dir, 1);
  else d.setFullYear(d.getFullYear() + dir, 0, 1);
  return d;
}

/** Aggregates by site over the date-key range [startKey, endKey]: { entries: [[site, n]...] (descending), sum }. */
export function aggregate(visits, sites, startKey, endKey) {
  const totals = {};
  for (const [day, hosts] of Object.entries(visits)) {
    if (day < startKey || day > endKey) continue;
    for (const [site, n] of Object.entries(collapse(hosts, sites))) totals[site] = (totals[site] || 0) + n;
  }
  return { entries: sortedEntries(totals), sum: sumCounts(totals) };
}

export const sumRange = (visits, sites, startKey, endKey) => aggregate(visits, sites, startKey, endKey).sum;

/** Number of days elapsed in the period [start, end] up to `nowKey` (future excluded), at least 1. */
export function elapsedDays(start, end, nowKey = todayKey()) {
  const last = keyOf(end) > nowKey ? parseKey(nowKey) : end;
  return Math.max(1, Math.round((last - start) / DAY_MS) + 1);
}

/**
 * Columns of the trend chart: "year" period -> 12 month columns, otherwise -> one column per day.
 * Returns [{ kind: "month" | "day", date: Date, n }]; labels are formatted by the page according to language.
 */
export function buildBuckets(visits, sites, period, start, end) {
  if (period === "year") {
    return Array.from({ length: 12 }, (_, m) => {
      const prefix = monthPrefix(start.getFullYear(), m);
      let n = 0;
      for (const [day, hosts] of Object.entries(visits)) {
        if (day.startsWith(prefix)) n += sumCounts(collapse(hosts, sites));
      }
      return { kind: "month", date: new Date(start.getFullYear(), m, 1), n };
    });
  }
  const days = Math.round((end - start) / DAY_MS) + 1;
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(start, i);
    return { kind: "day", date, n: sumCounts(collapse(visits[keyOf(date)], sites)) };
  });
}

/**
 * Compares the current period's total `sum` with the previous period. An ongoing period is compared only against the same number of elapsed days
 * of the previous period. Returns { direction: "same" | "new" | "less" | "more", sum, prev, pct }.
 * ("new": the previous period had no visits but this one does; fewer visits is better.)
 */
export function compareWithPrevious(visits, sites, anchor, period, end, sum, elapsed, nowKey = todayKey()) {
  const [prevStart, prevEnd] = rangeFor(shiftAnchor(anchor, period, -1), period);
  let pe = prevEnd;
  if (keyOf(end) >= nowKey) {
    const cap = addDays(prevStart, elapsed - 1);
    if (cap < pe) pe = cap;
  }
  const prev = sumRange(visits, sites, keyOf(prevStart), keyOf(pe));
  if (sum === prev) return { direction: "same", sum, prev, pct: 0 };
  if (!prev) return { direction: "new", sum, prev, pct: 0 };
  const pct = Math.round((Math.abs(sum - prev) / prev) * 100);
  return { direction: sum < prev ? "less" : "more", sum, prev, pct };
}

/** Whether a day is within all configured limits. */
export function dayMeetsGoal(counts, limits) {
  if (limits.total > 0 && sumCounts(counts) > limits.total) return false;
  if (limits.perSite > 0 && Object.values(counts).some((n) => n > limits.perSite)) return false;
  return true;
}

/**
 * Today's goal status: { active, todayOk, streak, today }.
 * Streak = number of consecutive days (including today) within limits, counted only from the first day that has data.
 */
export function goalState(visits, sites, limits, nowKey = todayKey()) {
  if (!(limits.total > 0 || limits.perSite > 0)) return { active: false };
  const today = collapse(visits[nowKey], sites);
  const todayOk = dayMeetsGoal(today, limits);
  const keys = Object.keys(visits).sort();

  let streak = 0;
  if (todayOk && keys.length) {
    streak = 1;
    const first = parseKey(keys[0]);
    for (let d = addDays(parseKey(nowKey), -1); d >= first; d = addDays(d, -1)) {
      if (!dayMeetsGoal(collapse(visits[keyOf(d)], sites), limits)) break;
      streak += 1;
    }
  }
  return { active: true, todayOk, streak, today };
}

/** Today's progress bar: based on the total if a total limit exists, otherwise on the top site. */
export function goalMeter(today, limits) {
  if (limits.total > 0) return { value: sumCounts(today), max: limits.total, site: null };
  const top = sortedEntries(today)[0];
  return { value: top ? top[1] : 0, max: limits.perSite, site: top ? top[0] : null };
}

/**
 * Today's total against yesterday's (both only count the tracked sites): { today, yesterday, diff }.
 * `diff` > 0 means more distracting visits than yesterday, < 0 fewer. Used by the popup.
 */
export function compareDays(visits, sites, dateKey = todayKey()) {
  const total = (key) => sumCounts(collapse(visits[key], sites));
  const today = total(dateKey);
  const yesterday = total(keyOf(addDays(parseKey(dateKey), -1)));
  return { today, yesterday, diff: today - yesterday };
}
