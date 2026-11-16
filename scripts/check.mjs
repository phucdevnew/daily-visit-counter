// Project integrity check (run: npm run check). No extra packages needed.
//   1. Every file referenced by the manifest exists.
//   2. Every <script>/<link> in HTML points to a real file.
//   3. Every relative import in JS points to a real file, and the imported names are exported by that file.
//   4. The vi/en dictionaries have the same keys; every key used in code/HTML exists.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const extRoot = join(root, "extension"); // the Chrome extension itself (load THIS folder with "Load unpacked")
const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);

const read = (p) => readFileSync(p, "utf8");
const rel = (p) => relative(root, p);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const srcFiles = walk(join(extRoot, "src"));
const jsFiles = srcFiles.filter((f) => f.endsWith(".js"));
const htmlFiles = srcFiles.filter((f) => f.endsWith(".html"));

// ---- 0. reserved names ----
// Chrome refuses to load an extension folder that contains any file or directory whose name starts with "_"
// (except _locales and _metadata). Files like Jekyll's _config.yml must therefore live OUTSIDE extension/.
for (const file of walk(extRoot)) {
  for (const part of relative(extRoot, file).split(/[\\/]/)) {
    if (part.startsWith("_") && part !== "_locales" && part !== "_metadata") {
      fail(`${rel(file)}: names starting with "_" are reserved by Chrome ("${part}"); move it out of extension/`);
    }
  }
}

// ---- 1. manifest ----
const manifest = JSON.parse(read(join(extRoot, "manifest.json")));
const manifestPaths = [
  ...Object.values(manifest.icons ?? {}),
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.action?.default_icon ?? {}),
].filter(Boolean);
for (const p of manifestPaths) {
  if (!existsSync(join(extRoot, p))) fail(`extension/manifest.json: not found: "${p}"`);
}

// Design decision: do NOT request access to any website and do NOT inject code into web pages. This reduces the chance of
// manual review on Chrome Web Store submission and keeps the privacy promise accurate. To add it back (e.g. the overlay
// nudge), see docs/archive/overlay-nudge/RESTORE.md and then remove this check deliberately.
for (const key of ["host_permissions", "optional_host_permissions", "content_scripts"]) {
  if (manifest[key]?.length) fail(`manifest.json: has "${key}" — the project intentionally avoids website access/code injection`);
}
for (const p of ["scripting", "tabs", "history", "<all_urls>"]) {
  if (manifest.permissions?.includes(p)) fail(`manifest.json: has permission "${p}" — the project intentionally does not use it (see README, Permissions section)`);
}

// Every page in PAGES must exist.
const { PAGES } = await import(pathToFileURL(join(extRoot, "src/core/routes.js")));
for (const [name, p] of Object.entries(PAGES)) {
  if (!existsSync(join(extRoot, p))) fail(`routes.js: PAGES.${name} points to "${p}" which does not exist`);
}

// Names/descriptions of the form __MSG_xxx__ must exist in EVERY locale; description max 132 characters, name max 75 (Chrome Web Store limits).
const localesDir = join(extRoot, "_locales");
const localeNames = existsSync(localesDir) ? readdirSync(localesDir) : [];
if (manifest.default_locale && !localeNames.includes(manifest.default_locale)) {
  fail(`manifest.json: default_locale "${manifest.default_locale}" has no folder in _locales/`);
}
const referenced = [...new Set([...JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)].map((m) => m[1]))];
const messageKeys = {};
for (const lang of localeNames) {
  const file = join(localesDir, lang, "messages.json");
  if (!existsSync(file)) { fail(`_locales/${lang}: missing messages.json`); continue; }
  const messages = JSON.parse(read(file));
  messageKeys[lang] = new Set(Object.keys(messages));
  for (const key of referenced) if (!messages[key]) fail(`_locales/${lang}/messages.json: missing "${key}"`);
  if (messages.extDescription?.message.length > 132) fail(`_locales/${lang}: extDescription is ${messages.extDescription.message.length} characters long (max 132)`);
  if (messages.extName?.message.length > 75) fail(`_locales/${lang}: extName exceeds 75 characters`);
}
if (referenced.length && !manifest.default_locale) fail("manifest.json: uses __MSG_xxx__ but default_locale is missing");

// ---- 2. HTML ----
for (const file of htmlFiles) {
  const html = read(file).replace(/<!--[\s\S]*?-->/g, "");
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|data:|#)/.test(ref)) continue;
    const target = ref.startsWith("/") ? join(extRoot, ref) : resolve(dirname(file), ref);
    if (!existsSync(target)) fail(`${rel(file)}: not found: "${ref}"`);
  }
}

// ---- 3. import/export ----
function exportsOf(source) {
  const names = new Set();
  for (const m of source.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) names.add(name);
    }
  }
  return names;
}

for (const file of jsFiles) {
  const source = read(file);
  for (const m of source.matchAll(/import\s*(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*["']([^"']+)["']/g)) {
    const [, , named, spec] = m;
    if (!spec.startsWith(".")) continue;
    const target = resolve(dirname(file), spec);
    if (!existsSync(target)) {
      fail(`${rel(file)}: import not found: "${spec}"`);
      continue;
    }
    if (!named) continue;
    const available = exportsOf(read(target));
    for (const part of named.split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name && !available.has(name)) fail(`${rel(file)}: "${name}" is not exported by ${rel(target)}`);
    }
  }
}

// ---- 4. i18n ----
const dict = {};
for (const lang of ["vi", "en"]) {
  dict[lang] = (await import(pathToFileURL(join(extRoot, "src/i18n", `${lang}.js`)))).default;
}
const viKeys = new Set(Object.keys(dict.vi));
const enKeys = new Set(Object.keys(dict.en));
for (const k of viKeys) if (!enKeys.has(k)) fail(`i18n: key "${k}" exists in vi but is missing in en`);
for (const k of enKeys) if (!viKeys.has(k)) fail(`i18n: key "${k}" exists in en but is missing in vi`);

const used = new Set();
const prefixes = new Set();
const appSources = [];
for (const file of [...jsFiles, ...htmlFiles]) {
  if (file.includes(join("src", "i18n") + "/") && !file.endsWith("index.js")) continue; // skip the dictionaries themselves
  let text = read(file);
  if (file.endsWith(".html")) text = text.replace(/<!--[\s\S]*?-->/g, "");
  else text = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); // strip comments (e.g. t("key") inside a comment)
  appSources.push(text);
  for (const m of text.matchAll(/\bt(?:Rich)?\(\s*["']([\w.]+)["']/g)) used.add(m[1]);
  for (const m of text.matchAll(/\bt(?:Rich)?\(\s*`([\w.]+)\.\$\{/g)) prefixes.add(m[1]);
  for (const m of text.matchAll(/data-(?:i18n(?:-ph|-title|-aria)?|title-key)="([\w.]+)"/g)) used.add(m[1]);
  for (const m of text.matchAll(/\bkey:\s*["']([\w.]+)["']/g)) used.add(m[1]); // core/limits.js
}
for (const k of used) if (!viKeys.has(k)) fail(`i18n: key "${k}" is used but not in the dictionary`);
for (const p of prefixes) {
  if (![...viKeys].some((k) => k.startsWith(`${p}.`))) fail(`i18n: no key starts with "${p}."`);
}
const allText = appSources.join("\n");
for (const k of viKeys) {
  const dynamic = [...prefixes].some((p) => k.startsWith(`${p}.`));
  if (!used.has(k) && !dynamic && !allText.includes(`"${k}"`)) warnings.push(`i18n: key "${k}" appears unused`);
}

// ---- Result ----
for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log(`✓ OK — ${jsFiles.length} JS files, ${htmlFiles.length} HTML files, ${viKeys.size} translation keys (${used.size} static keys used).`);
