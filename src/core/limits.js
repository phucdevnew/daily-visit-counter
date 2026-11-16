// Daily limits, warnings and the reminder screen. Pure logic.
// total / perSite: maximum visits per day (0 = unlimited).

import { sumCounts } from "./counts.js";

export const DEFAULT_LIMITS = {
  total: 0,
  perSite: 0,
  notify: true,
  nudge: false,
  nudgeSeconds: 5,
};

export const normalizeLimits = (raw) => ({ ...DEFAULT_LIMITS, ...(raw || {}) });

/** Whether any limit (total or a single site) has been reached today. `counts` = today's count table. */
export function anyLimitReached(counts, limits) {
  if (limits.total > 0 && sumCounts(counts) >= limits.total) return true;
  return limits.perSite > 0 && Object.values(counts).some((n) => n >= limits.perSite);
}

/**
 * Notification content right after recording a visit for `site`: { key, params } (i18n key) or null.
 * The site limit takes priority, then the total limit. "hit" = exactly at the limit, "over" = exceeded.
 */
export function limitAlert(site, counts, limits) {
  const n = counts[site];
  if (limits.perSite > 0 && n >= limits.perSite) {
    return n === limits.perSite
      ? { key: "notif.site_hit", params: { site, max: limits.perSite } }
      : { key: "notif.site_over", params: { site, n, max: limits.perSite } };
  }
  const total = sumCounts(counts);
  if (limits.total > 0 && total >= limits.total) {
    return total === limits.total
      ? { key: "notif.total_hit", params: { max: limits.total } }
      : { key: "notif.total_over", params: { n: total, max: limits.total } };
  }
  return null;
}

/** Warning shown on the reminder screen if a limit has been reached: { key, params } or null. */
export function nudgeWarning(site, counts, limits) {
  if (limits.perSite > 0 && (counts[site] || 0) >= limits.perSite) {
    return { key: "warn.site", params: { max: limits.perSite, site } };
  }
  if (limits.total > 0 && sumCounts(counts) >= limits.total) {
    return { key: "warn.total", params: { max: limits.total } };
  }
  return null;
}
