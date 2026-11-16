// Operations on the visit-count table: { "facebook.com": 5, "youtube.com": 2 }. Pure logic.

import { matchSite } from "./sites.js";

export const sumCounts = (counts) => Object.values(counts || {}).reduce((a, b) => a + b, 0);

/** [site, visit count] pairs sorted by count, descending. */
export const sortedEntries = (counts) => Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);

/**
 * Merges counts by the distracting-site list (m.facebook.com -> facebook.com) and drops sites not on the list.
 * `hosts` may be undefined (a day with no data).
 */
export function collapse(hosts, sites) {
  const out = {};
  for (const [host, n] of Object.entries(hosts || {})) {
    const site = matchSite(host, sites);
    if (site) out[site] = (out[site] || 0) + n;
  }
  return out;
}
