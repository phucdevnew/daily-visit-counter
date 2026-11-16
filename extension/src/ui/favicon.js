// Finds a site's favicon through Chrome's local favicon cache (the `_favicon` extension API; needs the "favicon" permission).
//
// Chrome looks the icon up by the exact page address that was visited, and it answers with a generic default icon
// (not an error) when it has none. A stored domain such as "facebook.com" may have been visited as
// "https://www.facebook.com/", so we try a few address forms and keep the first one that returns a REAL icon:
// an icon whose bytes differ from the default icon Chrome returns for an address that cannot exist.

// An address that can never have been visited: Chrome's answer for it is the default icon.
const NO_ICON_PROBE = "https://favicon-probe.invalid/";

/** Page addresses to try for a stored domain (the app stores domains without "www."). */
export const candidatesFor = (host) => [`https://www.${host}/`, `https://${host}/`];

/** URL that serves the icon for `pageUrl` from Chrome's favicon cache. */
export function iconUrl(pageUrl, size = 32) {
  const u = new URL(chrome.runtime.getURL("/_favicon/"));
  u.searchParams.set("pageUrl", pageUrl);
  u.searchParams.set("size", String(size));
  return u.toString();
}

/**
 * Picks the first candidate page address that has a real icon.
 * `getFingerprint(pageUrl)` returns a string identifying the icon image. Result:
 *  - the winning page address, or
 *  - `null` when none has a real icon (the caller shows a letter tile), or
 *  - `candidates[0]` when icons cannot be compared at all (old behavior: just use the first address).
 */
export async function pickIcon(candidates, getFingerprint) {
  let noIcon;
  try {
    noIcon = await getFingerprint(NO_ICON_PROBE);
  } catch {
    return candidates[0] ?? null;
  }
  for (const pageUrl of candidates) {
    try {
      if ((await getFingerprint(pageUrl)) !== noIcon) return pageUrl;
    } catch {
      // this candidate could not be read; try the next one
    }
  }
  return null;
}

async function fingerprintOf(pageUrl) {
  const response = await fetch(iconUrl(pageUrl));
  if (!response.ok) throw new Error(`favicon request failed: ${response.status}`);
  const digest = await crypto.subtle.digest("SHA-256", await response.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const cache = new Map();

/** Resolves to the page address whose icon should be shown for `host` (or null). Cached for the life of the page. */
export function resolveFavicon(host) {
  if (!cache.has(host)) cache.set(host, pickIcon(candidatesFor(host), fingerprintOf));
  return cache.get(host);
}
