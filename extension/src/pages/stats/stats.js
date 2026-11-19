// Statistics page: fetch data, call stats-calc.js to compute, then render to the screen and format text per language.

import { keyOf, parseKey, todayKey } from "../../core/dates.js";
import { exportFilename, visitsToCsv } from "../../core/export.js";
import { PAGES } from "../../core/routes.js";
import {
  aggregate, buildBuckets, compareWithPrevious, elapsedDays, goalMeter, goalState, rangeFor, shiftAnchor,
} from "../../core/stats-calc.js";
import {
  clearVisits, getLimits, getSites, getVisits, isUiRelevant, onStorageChanged,
} from "../../core/storage.js";
import { currentLocale, i18nReady, t } from "../../i18n/index.js";
import { $, downloadText, siteIcon } from "../../ui/dom.js";

const dateInput = $("date");
const tabs = $("tabs");
let period = "day";

// ---- Formatting ----
const fmtShort = (d) => d.toLocaleDateString(currentLocale(), { day: "numeric", month: "short" });

function titleFor(start, end) {
  const locale = currentLocale();
  if (period === "day") return start.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (period === "week") return `${fmtShort(start)} – ${fmtShort(end)}, ${end.getFullYear()}`;
  if (period === "month") return start.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return t("stats.year_title", { y: start.getFullYear() });
}

// ---- Trend chart ----
function bucketLabel(b) {
  if (b.kind === "month") return b.date.toLocaleDateString(currentLocale(), { month: "short" });
  if (period === "week") return t(`day.${b.date.getDay()}`);
  const day = b.date.getDate();
  return day === 1 || day % 5 === 0 ? String(day) : "";
}

function renderChart(buckets) {
  const locale = currentLocale();
  const max = Math.max(1, ...buckets.map((b) => b.n));
  const peak = Math.max(...buckets.map((b) => b.n));
  $("chart").replaceChildren(...buckets.map((b) => {
    const col = document.createElement("div");
    col.className = `col${b.n ? " has" : ""}${b.n && b.n === peak ? " peak" : ""}`;
    const tip = b.kind === "month" ? b.date.toLocaleDateString(locale, { month: "long" }) : fmtShort(b.date);
    col.title = t("chart.tip", { tip, n: b.n });
    const val = document.createElement("div");
    val.className = "val";
    val.textContent = b.n;
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${(b.n / max) * 100}%`;
    // The bar sits in its own plot area so its % height is relative to the space left after the value and label rows.
    const plot = document.createElement("div");
    plot.className = "plot";
    plot.append(bar);
    const lbl = document.createElement("div");
    lbl.className = "lbl";
    lbl.textContent = bucketLabel(b);
    col.append(val, plot, lbl);
    return col;
  }));
}

// ---- Comparison with the previous period ----
function renderDelta(cmp) {
  const label = t(`prev.${period}`);
  const el = $("sDelta");
  let cls = "";
  let text;
  if (cmp.direction === "same") text = t("delta.same", { label });
  else if (cmp.direction === "new") { text = t("delta.new", { n: cmp.sum, label }); cls = "bad"; }
  else {
    const less = cmp.direction === "less"; // fewer visits is better
    text = t("delta.pct", { arrow: less ? "▼" : "▲", pct: cmp.pct, label });
    cls = less ? "good" : "bad";
  }
  el.className = `delta ${cls}`.trim();
  el.textContent = text;
}

// ---- Goals and streaks ----
function renderGoal(visits, sites, limits) {
  const state = goalState(visits, sites, limits);
  const meterEl = $("gMeter");
  const sub = $("gSub");

  if (!state.active) {
    $("gIcon").textContent = "🎯";
    $("gTitle").textContent = t("goal.none_title");
    const link = document.createElement("a");
    link.href = `/${PAGES.settings}#limits`;
    link.textContent = t("goal.set_link");
    sub.replaceChildren(t("goal.none_sub"), link);
    meterEl.hidden = true;
    return;
  }

  const { todayOk, streak, today } = state;
  $("gIcon").textContent = !todayOk ? "⚠️" : streak ? "🔥" : "🌱";
  $("gTitle").textContent = !todayOk
    ? t("goal.over")
    : streak ? t("goal.streak", { n: streak }) : t("goal.new");
  sub.textContent = t(!todayOk ? "goal.broken" : "goal.keep");

  const { value, max, site } = goalMeter(today, limits);
  let text;
  if (limits.total > 0) text = t("goal.meter_total", { n: value, max });
  else text = site ? t("goal.meter_site", { site, n: value, max }) : t("goal.meter_none", { max });
  meterEl.hidden = false;
  $("gFill").style.width = `${Math.min(100, (value / max) * 100)}%`;
  $("gFill").classList.toggle("over", value > max);
  $("gText").textContent = text;
}

// ---- Ranking: a proportional share bar plus a compact list ----
// Each of the top sites gets its own clearly different color (--c1..--c7, defined in stats.css); the rest share a
// neutral gray. The same color marks the site's segment in the bar and its dot in the list.
const PALETTE_SIZE = 7;
const colorOf = (i) => (i < PALETTE_SIZE ? `var(--c${i + 1})` : "var(--c-rest)");

function renderRanking(entries, sum) {
  $("share").replaceChildren(...entries.map(([host, n], i) => {
    const segment = document.createElement("span");
    segment.style.flex = `${n} 1 0%`; // width proportional to the visit count
    segment.style.background = colorOf(i);
    segment.title = `${host}: ${n}`;
    return segment;
  }));
  $("list").replaceChildren(...entries.map(([host, n], i) => {
    const li = document.createElement("li");
    const dot = document.createElement("i");
    dot.className = "dot";
    dot.style.background = colorOf(i);
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = host;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = n;
    const pct = document.createElement("span");
    pct.className = "pct";
    pct.textContent = `${Math.round((n / sum) * 100)}%`;
    li.append(dot, siteIcon(host), name, count, pct);
    return li;
  }));
}

// ---- Rendering the page ----
async function render() {
  const [visits, sites, limits] = await Promise.all([getVisits(), getSites(), getLimits()]);
  const anchor = parseKey(dateInput.value);
  const [start, end] = rangeFor(anchor, period);
  const [startKey, endKey] = [keyOf(start), keyOf(end)];

  const { entries, sum } = aggregate(visits, sites, startKey, endKey);
  const elapsed = elapsedDays(start, end);

  $("rangeTitle").textContent = titleFor(start, end);
  $("rangeSub").textContent = period === "day" ? startKey : `${startKey} → ${endKey}`;
  $("sTotal").textContent = sum;
  $("sSites").textContent = entries.length;
  $("sAvg").textContent = (sum / elapsed).toFixed(1).replace(/\.0$/, "");
  $("sTop").textContent = entries.length ? entries[0][0] : "—";
  renderDelta(compareWithPrevious(visits, sites, anchor, period, end, sum, elapsed));
  renderGoal(visits, sites, limits);

  $("chartCard").hidden = period === "day";
  if (period !== "day") renderChart(buildBuckets(visits, sites, period, start, end));

  $("empty").hidden = entries.length > 0;
  $("export").disabled = entries.length === 0; // nothing to export for an empty period
  renderRanking(entries, sum);

  $("next").disabled = endKey >= todayKey();
}

function setDate(d) {
  const today = parseKey(todayKey());
  dateInput.value = keyOf(d > today ? today : d);
  render();
}

tabs.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-p]");
  if (!btn) return;
  period = btn.dataset.p;
  tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
  render();
});

$("prev").addEventListener("click", () => setDate(shiftAnchor(parseKey(dateInput.value), period, -1)));
$("next").addEventListener("click", () => setDate(shiftAnchor(parseKey(dateInput.value), period, 1)));
$("today").addEventListener("click", () => setDate(new Date()));
dateInput.addEventListener("change", () => dateInput.value && render());

onStorageChanged((changes) => {
  if (isUiRelevant(changes)) render();
});

// Export the visits of the period currently shown (same data and range as the page).
$("export").addEventListener("click", async () => {
  const [visits, sites] = await Promise.all([getVisits(), getSites()]);
  const [start, end] = rangeFor(parseKey(dateInput.value), period);
  const [startKey, endKey] = [keyOf(start), keyOf(end)];
  downloadText(exportFilename(startKey, endKey), visitsToCsv(visits, sites, startKey, endKey), "text/csv;charset=utf-8");
});

$("clear").addEventListener("click", async () => {
  if (confirm(t("stats.clear_confirm"))) await clearVisits();
});

dateInput.max = todayKey();
dateInput.value = todayKey();
await i18nReady;
render();
