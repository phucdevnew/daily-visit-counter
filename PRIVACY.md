# Privacy Policy — Daily Visit Counter

_Last updated: 2026-11-16_

> **Before publishing:** host this file at a public address (for example GitHub Pages), then enter that address in
> `PRIVACY_POLICY_URL` in `src/core/routes.js` and in the privacy policy field of the Chrome Web Store Developer Dashboard.
> Note: the email in the Contact section will be **public** along with the policy. Delete this note when publishing.

Daily Visit Counter is a Chrome extension that counts how often you visit websites that distract you, so you can
see your habits and limit them. **All data stays on your computer. The extension has no server and does not send
your data anywhere.**

## What the extension records
While tracking is turned on and you open a website from **your own tracked list** (for example `facebook.com`),
the extension stores:
- the **domain name** of that website, and
- the **number of visits per day** to it.

It also stores your settings: your list of tracked websites, your schedule, your limits, your language, and a record
that you agreed to this policy (with the date).

## What it does not record
- Full page addresses (URLs), page titles or page content.
- Anything you type into forms, passwords, cookies or login information.
- Addresses of websites that are **not** on your tracked list.

To know which website you opened, the extension must read the address of the page you navigate to. It uses this only
to decide whether the domain is on your list, and keeps only the domain name of sites on your list. For a short time
it also remembers, in memory, which tracked site each open tab is on (to avoid counting one visit twice); this is
cleared when you close the browser.

## Why
Only to show you statistics, apply the limits you set and remind you. The data is never used for advertising,
profiling or any other purpose, and is never sold or shared.

## Where it is stored and for how long
In Chrome's extension storage on your own device. It stays until you delete it (Settings → Privacy → Delete data)
or uninstall the extension. Website icons shown in the interface come from the browser's local favicon cache.

## Your choices
- Tracking is **off by default**, and nothing is recorded until you agree on the first-run screen **and** turn
  tracking on (or set a schedule).
- You can withdraw consent at any time (Settings → Privacy → Withdraw consent). Recording stops immediately.
- You can delete all saved data at any time.
- You can export your visit data as a CSV file at any time (Stats → Export CSV). The file is saved on your own computer; the
  extension does not send it anywhere.

## Permissions
| Permission | Why |
| --- | --- |
| `webNavigation` | Detect when you open a website, to count a visit |
| `storage` | Save your data and settings on your device |
| `alarms` | Check your auto start/stop schedule every minute |
| `notifications` | Tell you when you reach a limit you set |
| `favicon` | Show website icons from the browser's local cache |

The extension does **not** request access to the content of any website, and it does not read or modify any web page.

## Changes
If we change what data is collected or how it is used, the extension will ask for your consent again before
continuing.

## Contact
contact.huuphuc75@gmail.com
