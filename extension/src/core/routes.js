// Paths of the extension's pages (relative to the extension root). Use with chrome.runtime.getURL().

export const PAGES = {
  stats: "src/pages/stats/stats.html",
  settings: "src/pages/settings/settings.html",
  nudge: "src/pages/nudge/nudge.html",
  consent: "src/pages/consent/consent.html",
};

// Public URL of the privacy policy (content lives in PRIVACY.md). Fill in after publishing, e.g. a GitHub Pages site.
// If left empty, the consent screen shows no link.
export const PRIVACY_POLICY_URL = "https://phucdevnew.github.io/daily-visit-counter/privacy/";
