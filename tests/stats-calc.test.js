import assert from "node:assert/strict";
import { test } from "node:test";
import { collapse } from "../src/core/counts.js";
import { keyOf } from "../src/core/dates.js";
import {
  aggregate, buildBuckets, compareWithPrevious, dayMeetsGoal, elapsedDays, goalMeter, goalState, rangeFor,
  shiftAnchor,
} from "../src/core/stats-calc.js";

// 2026-11-16 is a Monday.
const D = (y, m, d) => new Date(y, m - 1, d);
const keys = ([s, e]) => [keyOf(s), keyOf(e)];
const sites = ["facebook.com", "youtube.com"];

test("rangeFor: day, week (Monday→Sunday), month, year", () => {
  assert.deepEqual(keys(rangeFor(D(2026, 11, 18), "day")), ["2026-11-18", "2026-11-18"]);
  assert.deepEqual(keys(rangeFor(D(2026, 11, 18), "week")), ["2026-11-16", "2026-11-22"]);
  assert.deepEqual(keys(rangeFor(D(2026, 11, 22), "week")), ["2026-11-16", "2026-11-22"]); // Sunday still belongs to that week
  assert.deepEqual(keys(rangeFor(D(2026, 2, 10), "month")), ["2026-02-01", "2026-02-28"]);
  assert.deepEqual(keys(rangeFor(D(2026, 6, 1), "year")), ["2026-01-01", "2026-12-31"]);
});

test("shiftAnchor shifts exactly one period, including at month end", () => {
  assert.equal(keyOf(shiftAnchor(D(2026, 11, 16), "day", -1)), "2026-11-15");
  assert.equal(keyOf(shiftAnchor(D(2026, 11, 16), "week", 1)), "2026-11-23");
  assert.equal(keyOf(shiftAnchor(D(2026, 1, 31), "month", 1)), "2026-02-01"); // does not overflow into March
  assert.equal(keyOf(shiftAnchor(D(2026, 1, 31), "month", -1)), "2025-12-01");
  assert.equal(keyOf(shiftAnchor(D(2026, 11, 16), "year", -1)), "2025-01-01");
});

test("collapse merges subdomains and drops sites outside the list", () => {
  assert.deepEqual(collapse({ "facebook.com": 2, "m.facebook.com": 3, "google.com": 9 }, sites), { "facebook.com": 5 });
  assert.deepEqual(collapse(undefined, sites), {});
});

test("aggregate sums per site within the range and sorts descending", () => {
  const visits = {
    "2026-11-15": { "facebook.com": 1, "youtube.com": 5 },
    "2026-11-16": { "m.facebook.com": 2, "google.com": 7 },
    "2026-11-17": { "facebook.com": 100 }, // outside the range
  };
  const { entries, sum } = aggregate(visits, sites, "2026-11-15", "2026-11-16");
  assert.deepEqual(entries, [["youtube.com", 5], ["facebook.com", 3]]);
  assert.equal(sum, 8);
});

test("elapsedDays excludes future days and is at least 1", () => {
  assert.equal(elapsedDays(D(2026, 11, 16), D(2026, 11, 22), "2026-11-18"), 3);
  assert.equal(elapsedDays(D(2026, 11, 9), D(2026, 11, 15), "2026-11-18"), 7); // period already ended
  assert.equal(elapsedDays(D(2026, 11, 20), D(2026, 11, 20), "2026-11-18"), 1);
});

test("buildBuckets: year has 12 month buckets, week has 7 day buckets", () => {
  const visits = { "2026-11-10": { "facebook.com": 4 }, "2026-11-12": { "youtube.com": 1 }, "2026-03-01": { "facebook.com": 2 } };
  const year = buildBuckets(visits, sites, "year", D(2026, 1, 1), D(2026, 12, 31));
  assert.equal(year.length, 12);
  assert.equal(year[10].n, 5); // November
  assert.equal(year[2].n, 2); // March
  const week = buildBuckets(visits, sites, "week", D(2026, 11, 9), D(2026, 11, 15));
  assert.deepEqual(week.map((b) => b.n), [0, 4, 0, 1, 0, 0, 0]);
});

test("compareWithPrevious: less, more, equal, empty previous period", () => {
  const now = "2026-11-16";
  const day = D(2026, 11, 16);
  const cmp = (visits, sum) => compareWithPrevious(visits, sites, day, "day", day, sum, 1, now);
  assert.deepEqual(cmp({ "2026-11-15": { "facebook.com": 8 } }, 4), { direction: "less", sum: 4, prev: 8, pct: 50 });
  assert.equal(cmp({ "2026-11-15": { "facebook.com": 2 } }, 3).direction, "more");
  assert.equal(cmp({ "2026-11-15": { "facebook.com": 3 } }, 3).direction, "same");
  assert.equal(cmp({}, 3).direction, "new");
  assert.equal(cmp({}, 0).direction, "same");
});

test("compareWithPrevious: an in-progress period is compared only against the same number of elapsed days", () => {
  const anchor = D(2026, 11, 18); // Wednesday, 3 days of the week elapsed (16, 17, 18)
  const [, end] = rangeFor(anchor, "week");
  const visits = {
    "2026-11-09": { "facebook.com": 2 },
    "2026-11-10": { "facebook.com": 2 },
    "2026-11-14": { "facebook.com": 100 }, // end of last week: not counted
  };
  const r = compareWithPrevious(visits, sites, anchor, "week", end, 6, 3, "2026-11-18");
  assert.equal(r.prev, 4);
  assert.deepEqual([r.direction, r.pct], ["more", 50]);
});

test("dayMeetsGoal uses a non-strict comparison (equal to the limit still passes)", () => {
  const limits = { total: 5, perSite: 3 };
  assert.equal(dayMeetsGoal({ a: 3, b: 2 }, limits), true);
  assert.equal(dayMeetsGoal({ a: 4 }, limits), false);
  assert.equal(dayMeetsGoal({ a: 2, b: 2, c: 2 }, limits), false);
  assert.equal(dayMeetsGoal({ a: 999 }, { total: 0, perSite: 0 }), true);
});

test("goalState: streak of consecutive days within the limit", () => {
  const limits = { total: 5, perSite: 0 };
  const visits = {
    "2026-11-13": { "facebook.com": 6 }, // exceeded -> breaks the streak
    "2026-11-14": { "facebook.com": 2 },
    "2026-11-15": { "facebook.com": 3 },
    "2026-11-16": { "facebook.com": 1 },
  };
  const s = goalState(visits, sites, limits, "2026-11-16");
  assert.deepEqual([s.active, s.todayOk, s.streak], [true, true, 3]);

  const over = goalState({ ...visits, "2026-11-16": { "facebook.com": 9 } }, sites, limits, "2026-11-16");
  assert.deepEqual([over.todayOk, over.streak], [false, 0]);

  assert.deepEqual(goalState(visits, sites, { total: 0, perSite: 0 }, "2026-11-16"), { active: false });
});

test("goalState: the streak counts only from the first day with data", () => {
  const limits = { total: 5, perSite: 0 };
  const visits = { "2026-11-14": { "facebook.com": 1 }, "2026-11-16": { "facebook.com": 1 } };
  assert.equal(goalState(visits, sites, limits, "2026-11-16").streak, 3); // 14, 15 (empty), 16
  assert.equal(goalState({}, sites, limits, "2026-11-16").streak, 0); // no data yet
});

test("goalMeter prefers the total limit, otherwise takes the top site", () => {
  assert.deepEqual(goalMeter({ a: 2, b: 1 }, { total: 5, perSite: 3 }), { value: 3, max: 5, site: null });
  assert.deepEqual(goalMeter({ a: 2, b: 1 }, { total: 0, perSite: 3 }), { value: 2, max: 3, site: "a" });
  assert.deepEqual(goalMeter({}, { total: 0, perSite: 3 }), { value: 0, max: 3, site: null });
});
