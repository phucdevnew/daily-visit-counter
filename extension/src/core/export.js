// CSV export of visit data. Pure logic (no DOM, no chrome.*).
//
// Format: one row per day and site, "date,site,visits" with CRLF line endings (RFC 4180). Only sites on the
// tracked list are exported, merged by domain, i.e. exactly what the Stats page shows.

import { collapse } from "./counts.js";

export const CSV_HEADER = ["date", "site", "visits"];

// Spreadsheet apps treat a cell starting with one of these as a formula ("CSV injection").
const FORMULA_START = /^[=+\-@\t\r]/;

/** Escapes one CSV cell: neutralizes formula starts and quotes values containing commas, quotes or newlines. */
export function csvCell(value) {
  let s = String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/**
 * Builds the CSV text for the days in [startKey, endKey] (inclusive "YYYY-MM-DD" keys).
 * Rows are ordered by date, then by visits descending, then by site name. Days with no data have no rows.
 */
export function visitsToCsv(visits, sites, startKey, endKey) {
  const rows = [CSV_HEADER];
  for (const day of Object.keys(visits).sort()) {
    if (day < startKey || day > endKey) continue;
    const entries = Object.entries(collapse(visits[day], sites))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [site, n] of entries) rows.push([day, site, n]);
  }
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

/** File name for an export of [startKey, endKey]. */
export function exportFilename(startKey, endKey) {
  const range = startKey === endKey ? startKey : `${startKey}_to_${endKey}`;
  return `daily-visit-counter_${range}.csv`;
}
