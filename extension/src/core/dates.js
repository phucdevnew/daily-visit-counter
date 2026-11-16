// Date utilities. Every date key has the form "YYYY-MM-DD" in the machine's LOCAL time.

export const DAY_MS = 86400000;

const pad = (n) => String(n).padStart(2, "0");

export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = (now = new Date()) => keyOf(now);

/** Date `d` plus `n` days (00:00 local time). */
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Key prefix of a month, e.g. monthPrefix(2026, 10) -> "2026-11-" (month: 0-11). */
export const monthPrefix = (year, month) => `${year}-${pad(month + 1)}-`;
