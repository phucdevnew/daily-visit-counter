// Shared DOM utilities for the UI pages.

import { iconUrl, resolveFavicon } from "./favicon.js";

export const $ = (id) => document.getElementById(id);

/** Show/hide an error line (an element with the hidden attribute) with content `msg`; hide it when msg is empty. */
export function showHint(id, msg) {
  $(id).textContent = msg || "";
  $(id).hidden = !msg;
}

function hueOf(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Site icon: a colored letter as background, with the favicon on top if it loads. */
export function siteIcon(host) {
  const el = document.createElement("div");
  el.className = "icon";
  const h = hueOf(host);
  // Exposed as a CSS variable (see .icon in base.css) so a page can restyle the tile, e.g. a neutral tile on Stats.
  el.style.setProperty("--tile", `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 40) % 360} 70% 45%))`);
  el.textContent = host[0] || "?";
  // The favicon is looked up asynchronously (see favicon.js); until then, and if the browser has none, the tile stays.
  resolveFavicon(host).then((pageUrl) => {
    if (!pageUrl) return;
    const img = document.createElement("img");
    img.alt = "";
    img.src = iconUrl(pageUrl);
    img.onerror = () => img.remove();
    el.append(img);
  });
  return el;
}

/** A row in the site list: icon, name, proportion bar (n/max) and visit count; `sub` is an optional small secondary line. */
export function siteRow(host, n, max, sub) {
  const li = document.createElement("li");
  li.className = "row";
  const info = document.createElement("div");
  info.className = "info";
  const name = document.createElement("div");
  name.className = "host";
  name.textContent = host;
  const track = document.createElement("div");
  track.className = "track";
  const fill = document.createElement("div");
  fill.className = "fill";
  fill.style.width = `${(n / max) * 100}%`;
  track.append(fill);
  info.append(name, track);
  const count = document.createElement("div");
  count.className = "count";
  count.textContent = n;
  if (sub) {
    const s = document.createElement("span");
    s.className = "sub";
    s.textContent = sub;
    count.append(s);
  }
  li.append(siteIcon(host), info, count);
  return li;
}

/**
 * Saves `text` as a file through the browser's download mechanism. Works from an extension page without
 * the "downloads" permission (it is a normal <a download> click on a Blob URL).
 */
export function downloadText(filename, text, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
