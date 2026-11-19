// The ONLY data-access layer: nowhere else may type storage key names directly.
//
// chrome.storage.local (persistent, stored on the device):
//   visits   { "YYYY-MM-DD": { "facebook.com": 5, ... } }   visit counts per day
//   sites    ["facebook.com", ...]                           list of distracting websites
//   tracking boolean                                         on/off switch (only effective once consent is given)
//   consent  { version, at }                                 user has consented to data processing (see consent.js)
//   schedule, limits                                         xem schedule.js, limits.js
//   lang     "auto" | "vi" | "en"                            UI language
//   scheduleLastRun  number (ms)                             last time the schedule was evaluated (to catch up on missed times)
//   schemaVersion    number                                  data schema version
// chrome.storage.session (lost when the browser closes): per-tab state, and quoteOverride { date, lang, index } = the quote the
// user picked by hand for today (see quote.js).

import { isConsentValid, newConsent } from "./consent.js";
import { normalizeLimits } from "./limits.js";
import { normalizeSchedule } from "./schedule.js";
import { DEFAULT_SITES } from "./sites.js";

export const SCHEMA_VERSION = 2;

const KEYS = {
  visits: "visits",
  sites: "sites",
  tracking: "tracking",
  consent: "consent",
  schedule: "schedule",
  limits: "limits",
  lang: "lang",
  scheduleLastRun: "scheduleLastRun",
  schemaVersion: "schemaVersion",
};

const local = chrome.storage.local;
const session = chrome.storage.session;

async function read(key) {
  return (await local.get(key))[key];
}

// ---- Persistent data ----
export const getVisits = async () => (await read(KEYS.visits)) || {};
export const saveVisits = (visits) => local.set({ [KEYS.visits]: visits });
export const clearVisits = () => local.remove(KEYS.visits);

/**
 * Whether tracking is ACTIVE: the switch is on AND the user has consented. Everywhere that decides whether to record data
 * must use this function, so without consent there is no path that leads to recording data.
 */
export async function getTracking() {
  const stored = await local.get([KEYS.tracking, KEYS.consent]);
  return Boolean(stored[KEYS.tracking]) && isConsentValid(stored[KEYS.consent]);
}
export const setTracking = (on) => local.set({ [KEYS.tracking]: Boolean(on) });

export const getConsent = async () => (await read(KEYS.consent)) || null;
export const hasConsent = async () => isConsentValid(await getConsent());
/** Records consent. Always leaves tracking OFF: the user must turn it on themselves after consenting. */
export const grantConsent = () => local.set({ [KEYS.consent]: newConsent(), [KEYS.tracking]: false });
/** Withdraws consent: stops tracking immediately. Stored data is kept until the user deletes it. */
export async function withdrawConsent() {
  await local.set({ [KEYS.tracking]: false });
  await local.remove(KEYS.consent);
}

export async function getSites() {
  const sites = await read(KEYS.sites);
  return Array.isArray(sites) ? sites : DEFAULT_SITES;
}
export const setSites = (sites) => local.set({ [KEYS.sites]: sites });

export const getSchedule = async () => normalizeSchedule(await read(KEYS.schedule));
export const setSchedule = (schedule) => local.set({ [KEYS.schedule]: schedule });

export const getLimits = async () => normalizeLimits(await read(KEYS.limits));
export const setLimits = (limits) => local.set({ [KEYS.limits]: limits });

/** Language chosen by the user: "auto" or a language code. */
export const getLangPref = async () => (await read(KEYS.lang)) || "auto";
export const setLangPref = (lang) => local.set({ [KEYS.lang]: lang });

export const getScheduleLastRun = () => read(KEYS.scheduleLastRun);
export const setScheduleLastRun = (ms) => local.set({ [KEYS.scheduleLastRun]: ms });

/**
 * Calls `handler(changes)` whenever persistent data changes. `changes` is the raw chrome.storage object;
 * use `changed.xxx(changes)` / `isUiRelevant(changes)` below to check instead of typing key names yourself.
 */
export function onStorageChanged(handler) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") handler(changes);
  });
}

/** Which changes are worth refreshing the UI for (ignores the per-minute `scheduleLastRun` write). */
export const isUiRelevant = (changes) => Object.keys(changes).some((k) => k !== KEYS.scheduleLastRun);

/** Per-data-type change checkers, so other code does not need to know key names. */
export const changed = {
  tracking: (c) => KEYS.tracking in c,
  consent: (c) => KEYS.consent in c,
  visits: (c) => KEYS.visits in c,
  sites: (c) => KEYS.sites in c,
  schedule: (c) => KEYS.schedule in c,
  limits: (c) => KEYS.limits in c,
  lang: (c) => KEYS.lang in c,
};

/** New value of `lang` in a change (undefined if removed). */
export const newLang = (changes) => changes[KEYS.lang]?.newValue;

/**
 * Upgrades data from older versions; runs on install/startup.
 * v2: schedule changed from a single `enabled` switch to `startOn`/`endOn` (normalized on read, so it is not written back
 * to avoid re-triggering the schedule), and the legacy `scheduledOn` key is removed.
 */
export async function migrate() {
  const version = (await read(KEYS.schemaVersion)) || 1;
  if (version >= SCHEMA_VERSION) return;
  await local.remove("scheduledOn");
  await local.set({ [KEYS.schemaVersion]: SCHEMA_VERSION });
}

// ---- Per-tab state (session) ----
// tab_<id>   : current distracting site of the tab ("" = tab is on a page outside the list)
// allow_<id> : site just allowed from the full-page reminder (single use)
const tabKey = (id) => `tab_${id}`;
const allowKey = (id) => `allow_${id}`;

export async function getTabSite(tabId) {
  return (await session.get(tabKey(tabId)))[tabKey(tabId)];
}
export const setTabSite = (tabId, site) => session.set({ [tabKey(tabId)]: site });
export const clearTabSite = (tabId) => session.remove(tabKey(tabId));

export async function getAllowedSite(tabId) {
  return (await session.get(allowKey(tabId)))[allowKey(tabId)];
}
export const setAllowedSite = (tabId, site) => session.set({ [allowKey(tabId)]: site });
export const clearAllowedSite = (tabId) => session.remove(allowKey(tabId));

/** Forgets all state of a tab (when the tab closes). */
export const forgetTab = (tabId) => session.remove([tabKey(tabId), allowKey(tabId)]);

// ---- The quote the user picked by hand (session storage: kept for the day, never written to disk) ----
const QUOTE_OVERRIDE_KEY = "quoteOverride";
export async function getQuoteOverride() {
  return (await session.get(QUOTE_OVERRIDE_KEY))[QUOTE_OVERRIDE_KEY] ?? null;
}
export const setQuoteOverride = (override) => session.set({ [QUOTE_OVERRIDE_KEY]: override });
