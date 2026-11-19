import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dayNumber, effectiveIndex, pickDaily, pickDailyIndex, quoteParts, randomOtherIndex,
} from "../extension/src/core/quote.js";
import quotesEn from "../extension/src/i18n/quotes/en.js";
import quotesVi from "../extension/src/i18n/quotes/vi.js";

// "YYYY-MM-DD" key for a whole-day number (the inverse of dayNumber).
const keyFor = (day) => new Date(day * 86400000).toISOString().slice(0, 10);
const range = (from, count) => Array.from({ length: count }, (_, i) => from + i);
const numbers = (n) => Array.from({ length: n }, (_, i) => i); // list [0..n-1] so a pick equals its index

test("dayNumber counts calendar days since 1970-01-01", () => {
  assert.equal(dayNumber("1970-01-01"), 0);
  assert.equal(dayNumber("1970-01-02"), 1);
  assert.equal(dayNumber("2026-11-17") - dayNumber("2026-11-16"), 1);
  assert.equal(dayNumber("2026-03-29") - dayNumber("2026-03-28"), 1); // a daylight-saving date in many regions
  assert.equal(keyFor(dayNumber("2026-11-17")), "2026-11-17");
});

test("the quote is the same all day and depends only on the date and the list", () => {
  const list = numbers(30);
  assert.equal(pickDaily(list, "2026-11-17"), pickDaily(list, "2026-11-17"));
  assert.equal(pickDaily(list, "2026-11-17"), pickDaily([...list], "2026-11-17"));
});

test("every quote is shown exactly once per cycle, before any repeats", () => {
  for (const n of [3, 7, 30, 95]) {
    const list = numbers(n);
    for (const cycle of [0, 1, 5, 40, 213]) {
      const picks = range(cycle * n, n).map((day) => pickDaily(list, keyFor(day)));
      assert.equal(new Set(picks).size, n, `n=${n} cycle=${cycle} should use every quote once`);
    }
  }
});

test("a quote never appears on two consecutive days, including across cycle boundaries", () => {
  for (let n = 3; n <= 40; n++) {
    const list = numbers(n);
    let previous = pickDaily(list, keyFor(20000));
    for (let day = 20001; day < 20000 + n * 12; day++) {
      const current = pickDaily(list, keyFor(day));
      assert.notEqual(current, previous, `n=${n}, day ${day} repeats the previous day`);
      previous = current;
    }
  }
});

test("the order is random-looking, not the list order, and differs between cycles", () => {
  const list = numbers(30);
  const orderOf = (cycle) => range(cycle * 30, 30).map((day) => pickDaily(list, keyFor(day)));
  const identity = numbers(30);
  for (const cycle of [100, 101, 102, 103]) assert.notDeepEqual(orderOf(cycle), identity);
  assert.notDeepEqual(orderOf(100), orderOf(101));
  assert.notDeepEqual(orderOf(101), orderOf(102));
  // Not simply "step by a constant" either: the gaps between consecutive picks vary.
  const gaps = new Set(orderOf(100).slice(1).map((v, i) => v - orderOf(100)[i]));
  assert.ok(gaps.size > 5);
});

test("small lists: empty, a single item, and two items alternate", () => {
  assert.equal(pickDaily([], "2026-11-17"), null);
  assert.equal(pickDaily(["only"], "2026-11-17"), "only");
  const two = ["a", "b"];
  const picks = range(20000, 6).map((day) => pickDaily(two, keyFor(day)));
  assert.equal(new Set(picks).size, 2);
  picks.slice(1).forEach((p, i) => assert.notEqual(p, picks[i]));
});

test("the real quote lists are large enough and usable with the picker", () => {
  for (const [name, list] of [["en", quotesEn], ["vi", quotesVi]]) {
    assert.ok(list.length >= 90, `${name} should have at least 90 quotes`);
    // A cycle is `list.length` days starting at a multiple of the length (a window across two cycles may repeat).
    const start = Math.ceil(20000 / list.length) * list.length;
    const picks = range(start, list.length).map((day) => pickDaily(list, keyFor(day)));
    assert.equal(new Set(picks).size, list.length, `${name}: one full cycle shows every quote once`);
  }
});

test("quoteParts handles plain strings and { text, author } entries", () => {
  assert.deepEqual(quoteParts("Slow and steady wins the race."), { text: "Slow and steady wins the race.", author: null });
  assert.deepEqual(quoteParts({ text: "Be quick, but don't hurry.", author: "John Wooden" }), { text: "Be quick, but don't hurry.", author: "John Wooden" });
  assert.deepEqual(quoteParts({ text: "No author field" }), { text: "No author field", author: null });
});

test("the real lists mix anonymous sayings with attributed quotes, all well formed", () => {
  for (const [name, list] of [["en", quotesEn], ["vi", quotesVi]]) {
    const parts = list.map(quoteParts);
    assert.ok(parts.some((p) => p.author), `${name} has attributed quotes`);
    assert.ok(parts.some((p) => !p.author), `${name} has anonymous sayings`);
    for (const p of parts) {
      assert.ok(p.text.length > 0 && p.text.length <= 100, `${name}: "${p.text}" length`);
      if (p.author) assert.ok(p.author.length <= 40, `${name}: author of "${p.text}"`);
    }
    assert.equal(new Set(parts.map((p) => p.text)).size, parts.length, `${name}: no duplicate texts`);
  }
});

test("the Vietnamese list marks folk verses with the author \"Ca dao\", and no real person is called that", () => {
  const folk = quotesVi.map(quoteParts).filter((p) => p.author === "Ca dao");
  assert.ok(folk.length >= 5);
  assert.equal(quotesEn.map(quoteParts).filter((p) => p.author === "Ca dao").length, 0);
});

test("pickDailyIndex agrees with pickDaily and handles empty and single-item lists", () => {
  const list = numbers(40);
  for (const day of range(20000, 120)) assert.equal(pickDaily(list, keyFor(day)), pickDailyIndex(40, keyFor(day)));
  assert.equal(pickDailyIndex(0, "2026-11-17"), -1);
  assert.equal(pickDailyIndex(1, "2026-11-17"), 0);
});

test("effectiveIndex uses the manual choice only for the same day and language and while it is in range", () => {
  const day = "2026-11-17";
  const daily = pickDailyIndex(50, day);
  const other = (daily + 7) % 50;
  assert.equal(effectiveIndex(50, day, "en", null), daily);
  assert.equal(effectiveIndex(50, day, "en", { date: day, lang: "en", index: other }), other);
  assert.equal(effectiveIndex(50, "2026-11-18", "en", { date: day, lang: "en", index: other }), pickDailyIndex(50, "2026-11-18")); // next day
  assert.equal(effectiveIndex(50, day, "vi", { date: day, lang: "en", index: other }), daily); // other language
  assert.equal(effectiveIndex(50, day, "en", { date: day, lang: "en", index: 50 }), daily); // out of range
  assert.equal(effectiveIndex(50, day, "en", { date: day, lang: "en", index: -1 }), daily);
  assert.equal(effectiveIndex(50, day, "en", { date: day, lang: "en", index: 3.5 }), daily);
  assert.equal(effectiveIndex(0, day, "en", { date: day, lang: "en", index: 0 }), -1);
});

test("randomOtherIndex never returns the current index and covers every other index", () => {
  for (const count of [2, 3, 10, 95]) {
    for (const current of [0, 1, count - 1]) {
      const seen = new Set();
      for (let i = 0; i < count - 1; i++) {
        const picked = randomOtherIndex(count, current, () => (i + 0.5) / (count - 1)); // the middle of each of the count-1 slots of [0, 1)
        assert.ok(picked >= 0 && picked < count);
        assert.notEqual(picked, current);
        seen.add(picked);
      }
      assert.equal(seen.size, count - 1, `count=${count} current=${current} should reach every other index`);
    }
  }
  assert.equal(randomOtherIndex(1, 0), 0); // nothing else to show
  assert.equal(randomOtherIndex(0, 0), 0);
  const real = randomOtherIndex(95, 40); // default Math.random
  assert.ok(real >= 0 && real < 95 && real !== 40);
});
