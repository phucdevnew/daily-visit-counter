import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LIMITS, anyLimitReached, limitAlert, normalizeLimits, nudgeWarning } from "../src/core/limits.js";

const limits = { ...DEFAULT_LIMITS, total: 5, perSite: 3 };

test("limitAlert prefers the site limit, distinguishing reached from exceeded", () => {
  assert.deepEqual(limitAlert("a.com", { "a.com": 3 }, limits), { key: "notif.site_hit", params: { site: "a.com", max: 3 } });
  assert.deepEqual(limitAlert("a.com", { "a.com": 4 }, limits), { key: "notif.site_over", params: { site: "a.com", n: 4, max: 3 } });
});

test("limitAlert uses the total limit when the site limit is not reached", () => {
  assert.deepEqual(limitAlert("a.com", { "a.com": 2, "b.com": 2, "c.com": 1 }, limits), { key: "notif.total_hit", params: { max: 5 } });
  assert.deepEqual(limitAlert("a.com", { "a.com": 2, "b.com": 2, "c.com": 2 }, limits), { key: "notif.total_over", params: { n: 6, max: 5 } });
});

test("limitAlert returns null when not reached or no limit is set", () => {
  assert.equal(limitAlert("a.com", { "a.com": 1 }, limits), null);
  assert.equal(limitAlert("a.com", { "a.com": 99 }, DEFAULT_LIMITS), null);
});

test("anyLimitReached", () => {
  assert.equal(anyLimitReached({ "a.com": 2 }, limits), false);
  assert.equal(anyLimitReached({ "a.com": 3 }, limits), true);
  assert.equal(anyLimitReached({ "a.com": 2, "b.com": 3 }, { ...DEFAULT_LIMITS, total: 5 }), true);
  assert.equal(anyLimitReached({ "a.com": 999 }, DEFAULT_LIMITS), false);
});

test("nudgeWarning", () => {
  assert.deepEqual(nudgeWarning("a.com", { "a.com": 3 }, limits), { key: "warn.site", params: { max: 3, site: "a.com" } });
  assert.deepEqual(nudgeWarning("a.com", { "a.com": 2, "b.com": 3 }, limits), { key: "warn.total", params: { max: 5 } });
  assert.equal(nudgeWarning("a.com", {}, limits), null);
});

test("normalizeLimits fills in defaults", () => {
  assert.deepEqual(normalizeLimits(undefined), DEFAULT_LIMITS);
  assert.equal(normalizeLimits({ total: 7 }).perSite, 0);
});
