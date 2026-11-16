// Tests the service worker against a fake chrome.*: counting flow, limits, badge, nudge screen.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { installChromeMock } from "./helpers/chrome-mock.js";

const chrome = installChromeMock();
await import("../extension/src/background/index.js");
const { enqueue } = await import("../extension/src/background/queue.js");
const { todayKey } = await import("../extension/src/core/dates.js");

const settle = () => new Promise((r) => setTimeout(r, 10)); // let background tasks (badge...) finish
const flush = async () => { await enqueue(async () => {}); await settle(); };
const navigate = async (tabId, url, transitionType = "link") => {
  chrome.webNavigation.onCommitted.fire({ tabId, frameId: 0, url, transitionType });
  await flush();
};
const today = () => chrome._local.visits?.[todayKey()] ?? {};
const agree = () => { chrome._local.consent = { version: 1, at: 1 }; };
const startTracking = () => { agree(); chrome._local.tracking = true; };

await settle(); // wait for init() at module load

beforeEach(() => chrome._reset());

test("does not count when tracking is off", async () => {
  await navigate(1, "https://www.facebook.com/");
  assert.deepEqual(today(), {});
});

test("does not record data WITHOUT consent even if the tracking switch is on", async () => {
  chrome._local.tracking = true; // no consent
  await navigate(1, "https://facebook.com/");
  assert.deepEqual(today(), {});
  assert.equal("visits" in chrome._local, false);
});

test("consent for an old version is no longer valid", async () => {
  chrome._local.tracking = true;
  chrome._local.consent = { version: 0, at: 1 };
  await navigate(1, "https://facebook.com/");
  assert.deepEqual(today(), {});
});

test("withdrawing consent stops recording immediately", async () => {
  startTracking();
  await navigate(1, "https://facebook.com/");
  delete chrome._local.consent;
  await navigate(1, "https://youtube.com/");
  assert.deepEqual(today(), { "facebook.com": 1 });
});

test("a fresh install opens the consent screen; an update does not", async () => {
  chrome.runtime.onInstalled.fire({ reason: "install" });
  await settle();
  assert.equal(chrome._calls.tabsCreate.length, 1);
  assert.match(chrome._calls.tabsCreate[0].url, /consent\.html$/);

  chrome._calls.tabsCreate.length = 0;
  chrome.runtime.onInstalled.fire({ reason: "update" });
  await settle();
  assert.equal(chrome._calls.tabsCreate.length, 0);

  agree(); // already consented, so reinstalling does not ask again
  chrome.runtime.onInstalled.fire({ reason: "install" });
  await settle();
  assert.equal(chrome._calls.tabsCreate.length, 0);
});

test("with tracking on, counts one visit per site entry", async () => {
  startTracking();
  await navigate(1, "https://www.facebook.com/");
  assert.equal(today()["facebook.com"], 1);
});

test("staying on the same site, reloading, or an iframe does not count a new visit", async () => {
  startTracking();
  await navigate(1, "https://facebook.com/");
  await navigate(1, "https://facebook.com/groups"); // navigation within the same site
  await navigate(1, "https://facebook.com/", "reload");
  chrome.webNavigation.onCommitted.fire({ tabId: 1, frameId: 7, url: "https://youtube.com/", transitionType: "link" });
  await flush();
  assert.deepEqual(today(), { "facebook.com": 1 });
});

test("leaving and coming back is a new visit; subdomains merge into the root site", async () => {
  startTracking();
  await navigate(1, "https://facebook.com/");
  await navigate(1, "https://google.com/");
  await navigate(1, "https://m.facebook.com/");
  assert.equal(today()["facebook.com"], 2);
  assert.equal("google.com" in today(), false); // sites outside the list are not counted
});

test("leaving the web (chrome://) and returning to the same site still counts a new visit", async () => {
  startTracking();
  await navigate(1, "https://facebook.com/");
  await navigate(1, "chrome://newtab/");
  await navigate(1, "https://facebook.com/");
  assert.equal(today()["facebook.com"], 2);
});

test("two tabs count independently; closing a tab forgets its state", async () => {
  startTracking();
  await navigate(1, "https://facebook.com/");
  await navigate(2, "https://facebook.com/");
  assert.equal(today()["facebook.com"], 2);
  chrome.tabs.onRemoved.fire(1);
  await flush();
  assert.equal("tab_1" in chrome._session, false);
  await navigate(1, "https://facebook.com/"); // tab id reused -> counts as new
  assert.equal(today()["facebook.com"], 3);
});

test("turning tracking on while already on a site does not add a visit", async () => {
  await navigate(1, "https://facebook.com/"); // tracking off: only remember
  startTracking();
  await navigate(1, "https://facebook.com/feed");
  assert.deepEqual(today(), {});
});

test("reaching the limit notifies and the badge changes to '!'", async () => {
  startTracking();
  chrome._local.limits = { perSite: 1, notify: true };
  await navigate(1, "https://facebook.com/");
  assert.equal(chrome._calls.notifications.length, 1);
  assert.match(chrome._calls.notifications[0].message, /facebook\.com/);
  assert.equal(chrome._calls.badge.at(-1), "!");
});

test("with notifications off, none are sent but the badge still alerts", async () => {
  startTracking();
  chrome._local.limits = { perSite: 1, notify: false };
  await navigate(1, "https://facebook.com/");
  assert.equal(chrome._calls.notifications.length, 0);
  assert.equal(chrome._calls.badge.at(-1), "!");
});

test("badge shows ON while tracking and the limit is not reached", async () => {
  startTracking();
  chrome.storage.onChanged.fire({ tracking: { newValue: true } }, "local");
  await settle();
  assert.equal(chrome._calls.badge.at(-1), "ON");
});

test("badge does not show ON without consent even if the switch is on", async () => {
  chrome._local.tracking = true; // no consent
  chrome.storage.onChanged.fire({ tracking: { newValue: true } }, "local");
  await settle();
  assert.equal(chrome._calls.badge.at(-1), "");
});

test("nudge on: switches the tab to the full-page screen and still counts the visit", async () => {
  startTracking();
  chrome._local.limits = { nudge: true };
  await navigate(1, "https://facebook.com/feed");
  assert.equal(chrome._calls.tabsUpdate.length, 1);
  const url = new URL(chrome._calls.tabsUpdate[0].url);
  assert.match(url.pathname, /nudge\.html$/);
  assert.equal(url.searchParams.get("site"), "facebook.com");
  assert.equal(url.searchParams.get("url"), "https://facebook.com/feed");
  assert.equal(today()["facebook.com"], 1); // counted when the nudge was shown
});

test("nudge: 'Proceed anyway' does not double count and does not nudge again", async () => {
  startTracking();
  chrome._local.limits = { nudge: true };
  await navigate(1, "https://facebook.com/feed");
  await navigate(1, chrome._calls.tabsUpdate[0].url); // tab switched to the extension page
  chrome.runtime.onMessage.fire({ type: "allow", site: "facebook.com" }, { id: "test-ext", tab: { id: 1, windowId: 1 } }, () => {});
  await settle();
  await navigate(1, "https://facebook.com/feed"); // user clicked "Proceed anyway"
  assert.equal(today()["facebook.com"], 1); // not counted a second time
  assert.equal(chrome._calls.tabsUpdate.length, 1); // and no repeat nudge
});

test("nudge does not repeat while staying on the same site", async () => {
  startTracking();
  chrome._local.limits = { nudge: true };
  await navigate(1, "https://facebook.com/");
  await navigate(1, "https://facebook.com/groups");
  assert.equal(chrome._calls.tabsUpdate.length, 1);
});

test("does not redirect when nudge is off or tracking is off", async () => {
  startTracking();
  await navigate(1, "https://facebook.com/"); // nudge is off by default
  assert.equal(chrome._calls.tabsUpdate.length, 0);

  chrome._reset();
  agree();
  chrome._local.limits = { nudge: true }; // but tracking is off
  await navigate(2, "https://facebook.com/");
  assert.equal(chrome._calls.tabsUpdate.length, 0);
  assert.deepEqual(today(), {});
});

test("nudge also applies to user-added sites", async () => {
  startTracking();
  chrome._local.sites = ["news.example.org"];
  chrome._local.limits = { nudge: true };
  await navigate(1, "https://news.example.org/post");
  assert.equal(chrome._calls.tabsUpdate.length, 1);
  assert.equal(today()["news.example.org"], 1);
});

test("'allow' message from an unknown sender or without a tab is ignored", async () => {
  chrome.runtime.onMessage.fire({ type: "allow", site: "facebook.com" }, { id: "stranger", tab: { id: 9, windowId: 1 } }, () => {});
  chrome.runtime.onMessage.fire({ type: "allow", site: "facebook.com" }, { id: "test-ext" }, () => {});
  await settle();
  assert.equal("allow_9" in chrome._session, false);
});
