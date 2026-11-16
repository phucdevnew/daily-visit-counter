import assert from "node:assert/strict";
import { test } from "node:test";
import { csvCell, exportFilename, visitsToCsv } from "../extension/src/core/export.js";

const sites = ["facebook.com", "youtube.com"];
const lines = (csv) => csv.split("\r\n");

test("empty data produces only the header, with a trailing CRLF", () => {
  assert.equal(visitsToCsv({}, sites, "2026-11-01", "2026-11-30"), "date,site,visits\r\n");
});

test("rows are ordered by date, then visits descending, then site name", () => {
  const visits = {
    "2026-11-16": { "facebook.com": 1, "youtube.com": 4 },
    "2026-11-15": { "youtube.com": 2, "facebook.com": 2 }, // tie -> alphabetical
  };
  assert.deepEqual(lines(visitsToCsv(visits, sites, "2026-11-01", "2026-11-30")), [
    "date,site,visits",
    "2026-11-15,facebook.com,2",
    "2026-11-15,youtube.com,2",
    "2026-11-16,youtube.com,4",
    "2026-11-16,facebook.com,1",
    "",
  ]);
});

test("only days inside the range (inclusive) are exported", () => {
  const visits = {
    "2026-11-14": { "facebook.com": 9 },
    "2026-11-15": { "facebook.com": 1 },
    "2026-11-16": { "facebook.com": 2 },
    "2026-11-17": { "facebook.com": 9 },
  };
  assert.deepEqual(lines(visitsToCsv(visits, sites, "2026-11-15", "2026-11-16")).slice(1, -1), [
    "2026-11-15,facebook.com,1",
    "2026-11-16,facebook.com,2",
  ]);
});

test("subdomains are merged and sites outside the tracked list are dropped", () => {
  const visits = { "2026-11-16": { "facebook.com": 2, "m.facebook.com": 3, "google.com": 7 } };
  assert.deepEqual(lines(visitsToCsv(visits, sites, "2026-11-16", "2026-11-16")).slice(1, -1), [
    "2026-11-16,facebook.com,5",
  ]);
});

test("csvCell quotes commas, quotes and newlines", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell(12), "12");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
});

test("csvCell neutralizes spreadsheet formula starts", () => {
  assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("-1"), "'-1");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell("a=b"), "a=b"); // only a leading character matters
});

test("exportFilename for a single day and for a range", () => {
  assert.equal(exportFilename("2026-11-16", "2026-11-16"), "daily-visit-counter_2026-11-16.csv");
  assert.equal(exportFilename("2026-11-16", "2026-11-22"), "daily-visit-counter_2026-11-16_to_2026-11-22.csv");
});
