# Chrome Web Store submission pack

Internal document (not packaged into the extension). Content to paste into the Developer Dashboard.
**Every statement here must match the real extension** — if features or permissions change, update this file to match.

## Before you submit

- [ ] Host [PRIVACY.md](../PRIVACY.md) at a public address, and enter it in `PRIVACY_POLICY_URL` (`extension/src/core/routes.js`) and in the *Privacy policy* field in the Dashboard.
- [ ] Run `npm run verify` then `npm run package` → upload `dist/daily-visit-counter-<version>.zip`.
- [ ] Test the zip in a clean Chrome profile: install, agree, turn on tracking, confirm visits are counted, and confirm counting still works after restarting Chrome.
- [ ] Screenshots and promo tile images (see the end of this file).
- [ ] Enter the support email in the Dashboard (use the same email as in the privacy policy).
- [ ] Do not change code while the submission is under review.

---

## 1. Store listing

**Name:** Daily Visit Counter

**Summary (≤132 characters)** — taken from `extension/extension/_locales/en/messages.json`:
> Count and limit how often you visit distracting websites. Private: all data stays on your device.

**Category:** Productivity

**Description:**

```
Daily Visit Counter shows you how often you open the websites that distract you — and helps you cut back.

HOW IT WORKS
• Choose the websites you want to watch (Facebook, YouTube, TikTok and more are preset).
• Turn tracking on when you start working, or set an automatic schedule (for example 09:00–18:00, Monday to Friday).
• Each time you open one of your watched sites, it counts as one visit. Browsing inside the same site is not counted again.

WHAT YOU GET
• Daily, weekly, monthly and yearly statistics, with a comparison to the previous period and a streak of days within your limits.
• Export the period you are viewing as a CSV file (date, site, visits) for your own records or a spreadsheet.
• Daily limits: set a maximum for all watched sites together and for each site. Get a notification — and a red badge on the icon — when you reach it.
• Optional "Hold on…" reminder: before you enter a watched site, a short pause screen shows which visit this will be today. You can go back to work or continue.
• A short daily proverb, folk verse or well-known quote at the top of the popup to keep you focused and motivated.
• English and Vietnamese interface.

PRIVACY FIRST
• Nothing is recorded until you agree on the first screen and turn tracking on.
• Only the domain name and the number of visits per day are stored, and only for the sites on your list.
• Everything stays in your browser on your own computer. No account, no server, no analytics, no ads.
• The extension does not read or change the content of any web page.
• You can withdraw consent or delete all data at any time in Settings → Privacy.

Note: the extension counts and reminds; it does not block websites.
```

---

## 2. Privacy practices (tab *Privacy*)

**Single purpose description:**
> Count how often the user visits websites they have chosen as distracting, show statistics, and help them limit those visits with daily limits and reminders.

**Permission justifications** (one field per permission):

| Permission | Justification |
| --- | --- |
| `webNavigation` | Detects when the user navigates to a website on their own watched list so a visit can be counted. Only the domain is used, and only for listed sites. |
| `storage` | Saves the visit counts, the watched-site list, settings and the user's consent on the user's own device. Nothing is sent anywhere. |
| `alarms` | Runs a once-a-minute check of the user's optional automatic start/stop schedule. |
| `notifications` | Tells the user when they reach a daily limit they set themselves. |
| `favicon` | Shows each watched website's icon in the lists, read from the browser's local favicon cache. |

Not used: host permissions, remote code (skip the *Host permission justification* and *Remote code* sections, or select "No").

**Data usage — categories collected:** tick only **Web history** (domains of listed sites the user opened, with visit counts).
Do not tick: PII, health, financial, authentication, personal communications, location, user activity, website content.

**Certifications** (confirmed in the Dashboard — re-check the actual wording on the page):
- Do not sell or transfer user data to third parties, outside of approved use cases.
- Do not use or transfer data for purposes unrelated to the single purpose.
- Do not use or transfer data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** _(fill in after hosting PRIVACY.md)_

---

## 3. Reviewer test instructions (*Test instructions*)

```
The extension does nothing until the user agrees and turns tracking on, so please follow these steps (about 3 minutes):

1. After installing, a privacy screen opens. Read it and click "Agree and continue". (It can be reopened from Settings → Privacy.)
2. Click the extension icon (a short daily proverb is shown at the top of the popup). Click the green "Start tracking" button. The status turns to "Tracking" and the icon shows "ON".
3. Open https://www.facebook.com in a tab (no login needed). Click the extension icon: today's total shows 1 and facebook.com appears in the list.
   Navigating inside the same site does not add a visit; opening it again from another site (or a new tab) does.
4. Click "Stats" in the popup to see day/week/month/year statistics. "Export CSV" downloads the period shown as a CSV file.
5. Optional – limits: Settings → Limits & reminders → set "Per-website limit" to 1. Open facebook.com again from a new tab:
   a notification appears and the icon badge becomes a red "!". (System notifications must be allowed for Chrome.)
6. Optional – reminder screen: in the same section turn on "Remind me before entering a distracting site" (wait time 3). With tracking on,
   open https://www.youtube.com from a new tab: a "Hold on…" page appears with "Back to work" / "Continue anyway" (after the countdown).
7. Settings → Privacy: "Delete data" clears all counts; "Withdraw consent" stops all recording immediately.

The extension requests no host permissions, does not read or modify any web page, makes no network requests, and has no remote code.
```

---

## 4. Listing images (to be captured by you)

- **Screenshots** (1280×800 or 640×400, up to 5; suggested order): 1) the popup while tracking, with the site list; 2) the Stats page (week/month with charts);
  3) the "Hold on…" screen; 4) Settings → Automatic schedule; 5) the privacy consent screen (shows data transparency).
  Use a sample account/data; do not expose personal information or other tabs.
- **Small promo tile:** 440×280 (required). Marquee 1400×560 (optional).
- Images must show real features accurately; do not add promotional text such as "No.1" or "Block all distractions".
