// User consent to data processing. Pure logic.
//
// The extension records the names of websites the user opens ("web browsing history" data under Chrome Web Store policy),
// so NOTHING may be recorded until the user explicitly clicks consent on the in-extension screen.
// When data handling changes, bump CONSENT_VERSION to ask again.

export const CONSENT_VERSION = 1;

export const newConsent = (now = Date.now()) => ({ version: CONSENT_VERSION, at: now });

/** Whether the stored consent is still valid for the current version. */
export const isConsentValid = (consent) => Boolean(consent) && Number(consent.version) >= CONSENT_VERSION;
