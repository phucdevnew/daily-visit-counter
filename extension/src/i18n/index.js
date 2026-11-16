// Lightweight home-grown i18n: change language right in Settings, independent of the browser language.
// Works both in the service worker (no `document`) and in UI pages.
//
// ADDING A NEW LANGUAGE:
//   1. Create src/i18n/<code>.js (copy en.js, translate values, KEEP keys unchanged).
//   2. Import it into DICTIONARIES below.
//   3. Add an <option> in settings.html (General section). `npm run check` verifies all keys are present.
//
// In HTML: data-i18n (content), data-i18n-ph (placeholder), data-i18n-title, data-i18n-aria.
// In JS:  t("key", { param }) or tRich(...) when the string has <b>…</b>.

import { changed, getLangPref, newLang, onStorageChanged } from "../core/storage.js";
import en from "./en.js";
import vi from "./vi.js";

const DICTIONARIES = { vi, en };
const FALLBACK = "en";

let current = FALLBACK;

/** pref: "auto" or a language code. "auto" follows the browser language; if unsupported, falls back to English. */
function resolveLang(pref) {
  if (pref in DICTIONARIES) return pref;
  const nav = (typeof navigator !== "undefined" && navigator.language ? navigator.language : FALLBACK).toLowerCase();
  return Object.keys(DICTIONARIES).find((l) => nav.startsWith(l)) || FALLBACK;
}

const setCurrent = (pref) => { current = resolveLang(pref); };

export const currentLang = () => current;
export const currentLocale = () => (current === "vi" ? "vi-VN" : "en-US");

export function t(key, params) {
  let s = DICTIONARIES[current]?.[key] ?? DICTIONARIES[FALLBACK][key] ?? key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
  return s;
}

/** Like t() but returns a DocumentFragment, rendering <b>…</b> as bold text (safe, no innerHTML). */
export function tRich(key, params) {
  const frag = document.createDocumentFragment();
  for (const part of t(key, params).split(/(<b>.*?<\/b>)/)) {
    if (!part) continue;
    const m = part.match(/^<b>(.*)<\/b>$/);
    if (m) {
      const b = document.createElement("b");
      b.textContent = m[1];
      frag.append(b);
    } else frag.append(part);
  }
  return frag;
}

export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  document.documentElement.lang = current;
}

const hasDom = typeof document !== "undefined";
// Hide the page until the language is known, to avoid a flash of text in the wrong language.
if (hasDom) document.documentElement.style.visibility = "hidden";

/** Pages/service worker `await i18nReady` before building the UI or producing strings. */
export const i18nReady = getLangPref()
  .then(setCurrent)
  .catch(() => setCurrent("auto"))
  .then(() => {
    if (hasDom) {
      applyI18n();
      document.documentElement.style.visibility = "";
    }
  });

// Changing the language in one place updates everywhere. This listener is registered before the page's listeners
// (because the i18n module loads first), so when the page re-renders, t() already uses the new language.
onStorageChanged((changes) => {
  if (!changed.lang(changes)) return;
  setCurrent(newLang(changes) || "auto");
  if (hasDom) applyI18n();
});
