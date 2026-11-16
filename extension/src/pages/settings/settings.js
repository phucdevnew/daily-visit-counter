// Settings page: only initializes navigation and each section. Each section's logic lives in sections/<name>.js.

import { i18nReady } from "../../i18n/index.js";
import { initGeneral } from "./sections/general.js";
import { initLimits } from "./sections/limits.js";
import { initPrivacy } from "./sections/privacy.js";
import { initSchedule } from "./sections/schedule.js";
import { initSites } from "./sections/sites.js";
import { initNav } from "./nav.js";

await i18nReady;
initNav();
initSites();
initSchedule();
initLimits();
initGeneral();
initPrivacy();
