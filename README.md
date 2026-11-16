# Daily Visit Counter

Chrome extension (Manifest V3) that counts how often you visit distracting websites (Facebook, YouTube…), only
while tracking is turned on, and helps you limit those visits.

- **Intentional counting:** only the sites on your list are counted, and only while tracking is on (it can switch on/off automatically on a work schedule).
- **Statistics** by day / week / month / year, comparison with the previous period, and a streak of days within your goal.
- **CSV export** of the period you are viewing (Stats → Export CSV): `date,site,visits`, one row per day and site. It is a plain
  download from the extension page, so no extra permission is needed.
- **Limits & reminders:** a notification when you reach a limit, and a "Hold on…" reminder screen before you enter a site.
- Two languages: Vietnamese and English (change in Settings → General).
- **Private:** all data stays in your browser (`chrome.storage`). There is no server and no network calls.
  The extension **records nothing** until the user agrees on the first-run screen (see [PRIVACY.md](PRIVACY.md)).

## Development

Requires Node ≥ 20.11 (only to run checks/tests; the extension has no build step).

```bash
npm run verify    # check + test (run before every commit)
npm run check     # validate manifest, paths, imports/exports, translation dictionaries
npm test          # unit tests + service worker tests using a mocked chrome.*
npm run package   # build dist/daily-visit-counter-<version>.zip for upload to the Chrome Web Store
```

To try it in Chrome: open `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → select the project folder.
After editing code, click **reload** on the extension's card (the service worker only picks up new code after a reload).

## Structure

```
manifest.json
_locales/                extension name + description (en, vi) for Chrome / Web Store
assets/icons/            extension icons
src/
  core/                  PURE LOGIC + data layer (no DOM access)
    storage.js           the ONLY data-access layer (key names, migrations, tab state)
    sites.js  schedule.js  limits.js  counts.js  dates.js  consent.js
    stats-calc.js        calculations for the Stats page (periods, comparison, streaks)
    export.js            CSV export (escaping, formula-injection guard, file name)
    routes.js            page paths
  background/            service worker, one responsibility per file
    index.js             only wires browser events to the modules
    counter.js  badge.js  notifications.js  nudge.js  scheduler.js  queue.js
  i18n/                  index.js (engine) + vi.js, en.js (dictionaries)
  ui/                    base.css (shared styles), dom.js (DOM helpers)
  pages/                 popup/  stats/  settings/ (+ sections/)  nudge/  consent/
tests/                   node:test; tests/helpers/chrome-mock.js mocks chrome.*
scripts/                 check.mjs, package.mjs
docs/                    store-submission.md (copy-paste content for the Dashboard), archive/ (removed code)
```

Principle: **`core/` does not depend on the browser** (except `storage.js`), so it can be tested with plain Node; pages and
the service worker only fetch data, call `core/`, then render/write.

## Data model (`chrome.storage.local`)

| Key | Contents |
| --- | --- |
| `visits` | `{ "YYYY-MM-DD": { "facebook.com": 5 } }` — visits per day (local time) |
| `sites` | list of distracting domains |
| `tracking` | on/off switch |
| `schedule` | `{ startOn, endOn, start, end, days }` |
| `limits` | `{ total, perSite, notify, nudge, nudgeSeconds }` |
| `consent` | `{ version, at }` — the user has agreed to data processing; if absent, **nothing is recorded** |
| `lang` | `"auto"` \| `"vi"` \| `"en"` |
| `scheduleLastRun`, `schemaVersion` | internal |

When you change the data structure, bump `SCHEMA_VERSION` and write an upgrade step in `migrate()` in `src/core/storage.js`.

## Common tasks

- **Add a language:** create `src/i18n/<code>.js` (copy `en.js`), add it to `DICTIONARIES` in `src/i18n/index.js` and add an `<option>` in
  `settings.html`. `npm run check` reports missing keys.
- **Add a settings section:** add `<section class="panel" data-section data-icon data-title-key>` to `settings.html`, write
  `src/pages/settings/sections/<name>.js` and call it from `settings.js`. The menu updates automatically.
- **Add a text string:** add the key to both `vi.js` and `en.js`; use `data-i18n="key"` in HTML or `t("key")` in JS.

## Extension permissions

| Permission | Used for |
| --- | --- |
| `webNavigation` | detecting new visits |
| `storage` | storing data and settings on the device |
| `alarms` | checking the auto on/off schedule every minute |
| `notifications` | notifying when a limit is reached |
| `favicon` | showing website icons in the lists |

## Privacy & consent

- `getTracking()` trong `src/core/storage.js` returns `true` only when the switch is on **and** consent has been given, so every place that decides
  whether to write data (counting, badge, reminder screen) follows it automatically; without consent there is no path that writes data.
- If you change how data is collected or used, bump `CONSENT_VERSION` in `src/core/consent.js` to ask all users again.
- **Deliberately does not request website access** (no `host_permissions`, no `scripting`, no content scripts): the extension does not read
  or modify the content of any page, and this reduces the chance of manual review at submission. `npm run check` fails if anyone adds them back.
  The removed overlay code is kept in `docs/archive/overlay-nudge/` (with `RESTORE.md`) so it can be re-added later.

## Before publishing to the Chrome Web Store

1. Host [PRIVACY.md](PRIVACY.md) at a public address (the contact email is already in the file), then enter that address in
   `PRIVACY_POLICY_URL` (`src/core/routes.js`) and in the privacy policy field in the Developer Dashboard.
2. Run `npm run verify`, then `npm run package`.
3. In the Dashboard: follow [docs/store-submission.md](docs/store-submission.md) (description, permission justifications, data disclosures, reviewer instructions).
