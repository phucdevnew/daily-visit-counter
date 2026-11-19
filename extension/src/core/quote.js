// Daily quote selection. Pure logic.
//
// The quote of the day depends only on the calendar date, so it is the same all day (every time the popup is opened) and
// changes at local midnight (the user can swap it for another one by hand; see effectiveIndex). Order is random but fair:
//  - Days are grouped into cycles of N days (N = number of quotes). Each cycle uses its own random order of the list,
//    so every quote is shown exactly once per cycle, before any quote repeats.
//  - The order is derived from the cycle number with a seeded generator, so it needs no storage and is identical on every
//    run and in every browser.
//  - A quote never appears on two consecutive days, including across the boundary between two cycles.

/** Whole days since 1970-01-01 for a "YYYY-MM-DD" key (calendar based, so unaffected by daylight-saving changes). */
export function dayNumber(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Small seeded pseudo-random generator (mulberry32): returns a function giving numbers in [0, 1). */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The random order (a shuffled array of indexes 0..n-1) used by one cycle. Same cycle, same order. */
function cycleOrder(n, cycle) {
  const order = Array.from({ length: n }, (_, i) => i);
  const random = seededRandom(Math.imul(cycle + 1, 0x9e3779b1));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Splits a list entry into its parts: a plain string has no author; an object is { text, author }. */
export function quoteParts(entry) {
  return typeof entry === "string" ? { text: entry, author: null } : { text: entry.text, author: entry.author ?? null };
}

/**
 * Index (0..count-1) of the quote of the day for `dateKey`, or -1 when there are no quotes.
 * See the module comment for the guarantees (same all day, random order per cycle, never repeated on consecutive days).
 */
export function pickDailyIndex(count, dateKey) {
  if (count === 0) return -1;
  if (count === 1) return 0;
  const day = dayNumber(dateKey);
  if (count === 2) return day % 2; // two quotes can only alternate

  const cycle = Math.floor(day / count);
  const order = cycleOrder(count, cycle);
  // Do not start a cycle with the quote that ended the previous one. Swapping the first two positions never touches the
  // last position, so the previous cycle's last quote is the same whether or not that cycle was itself adjusted.
  if (cycle > 0 && order[0] === cycleOrder(count, cycle - 1)[count - 1]) [order[0], order[1]] = [order[1], order[0]];
  return order[day % count];
}

/** The entry for `dateKey` from `list` (a string or { text, author }), or null when the list is empty. */
export function pickDaily(list, dateKey) {
  const index = pickDailyIndex(list.length, dateKey);
  return index < 0 ? null : list[index];
}

/**
 * Index of the quote to show now: the user's manual choice for today if there is a valid one, otherwise the quote of the
 * day. `override` is { date, lang, index } (or null). It only counts for the same day and the same language (the lists
 * of different languages differ), and only if its index is still inside the list.
 */
export function effectiveIndex(count, dateKey, lang, override) {
  const usable = override && override.date === dateKey && override.lang === lang
    && Number.isInteger(override.index) && override.index >= 0 && override.index < count;
  return usable ? override.index : pickDailyIndex(count, dateKey);
}

/** A random index in 0..count-1 that differs from `current` (used by the "show another quote" button). */
export function randomOtherIndex(count, current, random = Math.random) {
  if (count < 2) return current;
  const r = Math.floor(random() * (count - 1)); // 0..count-2
  return r >= current ? r + 1 : r;
}
