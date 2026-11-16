// List of "distracting" websites: only these sites are counted. Pure logic, no browser dependency.

export const DEFAULT_SITES = [
  "facebook.com", "youtube.com", "tiktok.com", "instagram.com",
  "x.com", "twitter.com", "reddit.com", "netflix.com", "twitch.tv",
];

/** Normalizes a user-entered string ("https://www.Facebook.com/abc" -> "facebook.com"); invalid -> null. */
export function cleanDomain(input) {
  let s = String(input).trim().toLowerCase();
  if (!s) return null;
  try {
    if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = `https://${s}`;
    s = new URL(s).hostname;
  } catch {
    return null;
  }
  s = s.replace(/^www\./, "");
  return s.includes(".") ? s : null;
}

/** Returns the listed domain matching the host (including subdomains), or null. */
export function matchSite(host, sites) {
  return sites.find((d) => host === d || host.endsWith(`.${d}`)) || null;
}

/** Hostname (without "www.") of an http(s) URL; other URLs (chrome://, file://...) or invalid -> null. */
export function hostOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
