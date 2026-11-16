import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SCHEDULE, eventsBetween, isWorkTime, normalizeSchedule, scheduleActive,
} from "../src/core/schedule.js";

// 2026-11-16 is a Monday.
const both = { ...DEFAULT_SCHEDULE, startOn: true, endOn: true };
const at = (iso) => new Date(iso);
const summarize = (events) => events.map((e) => `${e.type}@${e.t.getDate()}/${e.t.getHours()}:${String(e.t.getMinutes()).padStart(2, "0")}`);

test("eventsBetween returns due events within the range (from, to]", () => {
  assert.deepEqual(summarize(eventsBetween(both, at("2026-11-16T08:59"), at("2026-11-16T09:01"))), ["start@16/9:00"]);
  // exactly `from` is excluded (open on the left); exactly `to` is included.
  assert.deepEqual(eventsBetween(both, at("2026-11-16T09:00"), at("2026-11-16T09:30")), []);
  assert.equal(eventsBetween(both, at("2026-11-16T08:00"), at("2026-11-16T09:00")).length, 1);
});

test("eventsBetween catches up on events missed while the browser was closed", () => {
  const events = eventsBetween(both, at("2026-11-16T17:00"), at("2026-11-17T10:00"));
  assert.deepEqual(summarize(events), ["end@16/18:00", "start@17/9:00"]);
});

test("eventsBetween skips unselected days and switched-off toggles", () => {
  assert.deepEqual(eventsBetween(both, at("2026-11-21T00:00"), at("2026-11-21T23:59")), []); // Saturday
  const onlyEnd = { ...DEFAULT_SCHEDULE, endOn: true };
  assert.deepEqual(eventsBetween(onlyEnd, at("2026-11-16T08:00"), at("2026-11-16T19:00")).map((e) => e.type), ["end"]);
});

test("isWorkTime requires both ends enabled and supports overnight shifts", () => {
  assert.equal(isWorkTime(both, at("2026-11-16T10:00")), true);
  assert.equal(isWorkTime(both, at("2026-11-16T18:00")), false); // exactly at the stop time it is over
  assert.equal(isWorkTime({ ...both, endOn: false }, at("2026-11-16T10:00")), false);
  const night = { ...both, start: "22:00", end: "06:00" };
  assert.equal(isWorkTime(night, at("2026-11-16T23:00")), true);
  assert.equal(isWorkTime(night, at("2026-11-16T05:00")), true);
  assert.equal(isWorkTime(night, at("2026-11-16T12:00")), false);
});

test("normalizeSchedule fills in defaults and migrates the old format", () => {
  assert.deepEqual(normalizeSchedule(undefined), DEFAULT_SCHEDULE);
  const legacy = normalizeSchedule({ enabled: true, start: "08:00", end: "17:00", days: [1] });
  assert.deepEqual(legacy, { startOn: true, endOn: true, start: "08:00", end: "17:00", days: [1] });
  assert.equal("enabled" in legacy, false);
  assert.equal(normalizeSchedule({ startOn: true }).endOn, false);
});

test("scheduleActive true when at least one end is enabled", () => {
  assert.equal(scheduleActive(DEFAULT_SCHEDULE), false);
  assert.equal(scheduleActive({ ...DEFAULT_SCHEDULE, endOn: true }), true);
});
