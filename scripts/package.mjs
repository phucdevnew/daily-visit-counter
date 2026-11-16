// Packages the extension into a clean zip for upload to the Chrome Web Store (run: npm run package).
// Includes only manifest.json, _locales/, assets/ and src/ — no tests, scripts, docs or hidden files.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: "inherit" });

// Do not package while the project has errors.
run(process.execPath, [join(root, "scripts/check.mjs")]);

// The manifest name is a translation key (__MSG_extName__), so take the file name from package.json.
const { version } = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const { name } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const out = join(root, "dist", `${name}-${version}.zip`);

mkdirSync(join(root, "dist"), { recursive: true });
rmSync(out, { force: true });
run("zip", ["-r", "-X", out, "manifest.json", "_locales", "assets", "src", "-x", "*.DS_Store"]);
console.log(`\n✓ Created ${out}`);
