import assert from "node:assert/strict";
import { test } from "node:test";
import { CONSENT_VERSION, isConsentValid, newConsent } from "../src/core/consent.js";

test("newConsent records the current version and timestamp", () => {
  assert.deepEqual(newConsent(123), { version: CONSENT_VERSION, at: 123 });
});

test("isConsentValid: missing, malformed, or old version are all invalid", () => {
  assert.equal(isConsentValid(undefined), false);
  assert.equal(isConsentValid(null), false);
  assert.equal(isConsentValid({ version: CONSENT_VERSION - 1, at: 1 }), false);
  assert.equal(isConsentValid({ at: 1 }), false);
  assert.equal(isConsentValid(newConsent()), true);
  assert.equal(isConsentValid({ version: CONSENT_VERSION + 1, at: 1 }), true);
});
