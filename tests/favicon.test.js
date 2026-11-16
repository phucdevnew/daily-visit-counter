import assert from "node:assert/strict";
import { test } from "node:test";
import { candidatesFor, pickIcon } from "../extension/src/ui/favicon.js";

const NO_ICON = "default-icon-hash";
// Fake icon cache: pageUrl -> fingerprint of its icon; anything unknown gets the default icon, like Chrome does.
const cache = (known) => async (pageUrl) => known[pageUrl] ?? NO_ICON;

test("candidatesFor tries the www form first, then the bare domain", () => {
  assert.deepEqual(candidatesFor("facebook.com"), ["https://www.facebook.com/", "https://facebook.com/"]);
});

test("pickIcon returns the first candidate that has a real icon", async () => {
  const pick = (known) => pickIcon(candidatesFor("facebook.com"), cache(known));
  assert.equal(await pick({ "https://www.facebook.com/": "fb" }), "https://www.facebook.com/");
  assert.equal(await pick({ "https://facebook.com/": "fb" }), "https://facebook.com/"); // only the bare form was visited
  assert.equal(await pick({ "https://www.facebook.com/": "a", "https://facebook.com/": "b" }), "https://www.facebook.com/");
});

test("pickIcon returns null when the browser has no icon for any candidate", async () => {
  assert.equal(await pickIcon(candidatesFor("never-visited.com"), cache({})), null);
});

test("pickIcon falls back to the first candidate when icons cannot be compared at all", async () => {
  const broken = async () => { throw new Error("fetch not allowed"); };
  assert.equal(await pickIcon(candidatesFor("facebook.com"), broken), "https://www.facebook.com/");
});

test("pickIcon skips a candidate that fails to load and tries the next", async () => {
  const flaky = async (pageUrl) => {
    if (pageUrl === "https://www.x.com/") throw new Error("boom");
    return pageUrl === "https://x.com/" ? "x-icon" : NO_ICON;
  };
  assert.equal(await pickIcon(candidatesFor("x.com"), flaky), "https://x.com/");
});
