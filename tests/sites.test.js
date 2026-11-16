import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanDomain, hostOf, matchSite } from "../extension/src/core/sites.js";

test("cleanDomain normalizes URLs and user-entered domains", () => {
  assert.equal(cleanDomain("https://www.Facebook.com/abc?x=1"), "facebook.com");
  assert.equal(cleanDomain("  YouTube.com  "), "youtube.com");
  assert.equal(cleanDomain("m.facebook.com"), "m.facebook.com");
});

test("cleanDomain rejects invalid input", () => {
  assert.equal(cleanDomain(""), null);
  assert.equal(cleanDomain("   "), null);
  assert.equal(cleanDomain("localhost"), null); // no dot
  assert.equal(cleanDomain("a b.com"), null);
});

test("matchSite matches the root domain and subdomains, not names that merely share a suffix", () => {
  const sites = ["facebook.com", "x.com"];
  assert.equal(matchSite("facebook.com", sites), "facebook.com");
  assert.equal(matchSite("m.facebook.com", sites), "facebook.com");
  assert.equal(matchSite("notfacebook.com", sites), null);
  assert.equal(matchSite("box.com", sites), null); // "box.com" ends with "x.com" but is not a subdomain
  assert.equal(matchSite("google.com", sites), null);
});

test("hostOf accepts only http(s) and strips www.", () => {
  assert.equal(hostOf("https://www.facebook.com/home"), "facebook.com");
  assert.equal(hostOf("http://sub.example.org:8080/x"), "sub.example.org");
  assert.equal(hostOf("chrome://extensions"), null);
  assert.equal(hostOf("file:///tmp/a.html"), null);
  assert.equal(hostOf("not a url"), null);
});
