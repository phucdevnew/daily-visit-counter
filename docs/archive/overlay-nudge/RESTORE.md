# "Hold on…" overlay (removed from the release build)

The first Chrome Web Store submission does **not** use the overlay, to avoid requesting website access (which reduces the chance of manual review).
This folder keeps the code so it can be re-added later. It is not packaged into the extension (`npm run package` only includes `manifest.json`, `assets/` and `src/`).

## Contents
- `overlay.js` — the `showNudgeOverlay` function (injected into the page with `chrome.scripting.executeScript`; it must be self-contained, with no imports).
- `background-nudge.js` — a version of `src/background/nudge.js` with the overlay branch (uses the permission, and falls back to the full-page screen on error).
- `overlay.test.js.txt` — a test that guards the function's self-containment (the `.txt` extension keeps `node --test` from running it while archived).

## How to restore
1. Copy `overlay.js` → `src/content/overlay.js`, `background-nudge.js` → `src/background/nudge.js`, and `overlay.test.js.txt` → `tests/overlay.test.js` (restore the `.js` extension).
2. `manifest.json`: add `"scripting"` to `permissions`, and add `optional_host_permissions` containing the patterns for `DEFAULT_SITES`
   (`*://<domain>/*` and `*://*.<domain>/*` for each domain).
3. `src/core/sites.js`: re-add `originsFor`, `overlayDomainFor` and `overlayOrigins`
   (the overlay only runs on the default sites, because the permissions are declared only for them).
4. Settings page → Limits section: request the permission with `chrome.permissions.request({ origins: overlayOrigins(sites) })`
   directly within the user's gesture (before any `await`); add a line that is shown when the request is denied.
5. `src/background/index.js`: add handling for the `"nudge-back"` message (close the tab or switch to a new tab).
6. i18n: re-add the keys `nudge.count_overlay`, `lim.perm_denied` and `lim.note`, and update `lim.nudge_desc`.
7. `scripts/check.mjs`: remove the check that blocks `scripting`/`host_permissions`; update PRIVACY.md and the README.
