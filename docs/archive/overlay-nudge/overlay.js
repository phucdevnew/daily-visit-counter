// Blurred "Hold on…" overlay drawn on top of the distracting page itself.
// This function is injected into the page by chrome.scripting.executeScript (serialized via toString), so it MUST be self-contained:
// it must not use any outer variables/functions. Data is passed via `o`: { site, n, warn, seconds, text }
// (text: strings already translated by the background).
export function showNudgeOverlay(o) {
  if (window.__dvcNudgeActive) return;
  window.__dvcNudgeActive = true;

  const mk = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  const css = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .wrap { position: fixed; inset: 0; display: grid; place-items: center; padding: 16px;
      background: rgba(15, 17, 26, .38); backdrop-filter: blur(18px) saturate(120%);
      -webkit-backdrop-filter: blur(18px) saturate(120%);
      font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif; }
    .card { width: min(420px, 100%); padding: 32px 26px 24px; text-align: center; border-radius: 24px;
      background: #fff; color: #171a2b; border: 1px solid #e4e6f0; box-shadow: 0 24px 60px rgba(0, 0, 0, .35); }
    .badge { width: 60px; height: 60px; margin: 0 auto 14px; border-radius: 19px; display: grid; place-items: center;
      font-size: 28px; background: linear-gradient(135deg, #5b5bf0, #8b5cf6); box-shadow: 0 8px 20px rgba(91, 91, 240, .35); }
    h1 { margin: 0 0 16px; font-size: 19px; letter-spacing: -.01em; font-weight: 700; color: inherit; }
    .target { display: inline-flex; align-items: center; gap: 10px; padding: 6px 16px 6px 6px; border-radius: 99px;
      background: #f0f1f8; border: 1px solid #e4e6f0; font-size: 15px; font-weight: 600; }
    .av { width: 30px; height: 30px; border-radius: 99px; display: grid; place-items: center; color: #fff;
      font-weight: 700; text-transform: uppercase; }
    .count { margin: 14px 0 0; color: #6b7088; }
    .count b { color: #171a2b; }
    .warn { margin: 10px 0 0; padding: 8px 12px; border-radius: 10px; background: rgba(229, 72, 77, .12);
      color: #e5484d; font-weight: 600; font-size: 13px; }
    .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 22px; }
    button { font: inherit; cursor: pointer; border-radius: 12px; padding: 12px; font-weight: 700; }
    .primary { border: 0; color: #fff; background: linear-gradient(135deg, #5b5bf0, #8b5cf6); box-shadow: 0 4px 12px rgba(91, 91, 240, .35); }
    .primary:hover { filter: brightness(1.08); }
    .ghost { border: 1px solid #e4e6f0; background: transparent; color: #6b7088; font-weight: 600; }
    .ghost:not(:disabled):hover { border-color: #5b5bf0; color: #5b5bf0; }
    .ghost:disabled { opacity: .6; cursor: default; }
    @media (prefers-color-scheme: dark) {
      .card { background: #181b28; color: #eef0ff; border-color: #2a2f47; }
      .target { background: #20243a; border-color: #2a2f47; }
      .count { color: #9096b4; } .count b { color: #eef0ff; }
      .ghost { border-color: #2a2f47; color: #9096b4; }
    }`;

  const host = document.createElement("div");
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;";
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = css;

  let h = 0;
  for (const c of o.site) h = (h * 31 + c.charCodeAt(0)) % 360;
  const av = mk("div", "av", o.site[0] || "?");
  av.style.background = `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 40) % 360} 70% 45%))`;
  const target = mk("div", "target");
  target.append(av, mk("span", "", o.site));

  const count = mk("p", "count");
  // o.text.count may contain <b>…</b>: build it with the DOM, not innerHTML.
  for (const part of o.text.count.split(/(<b>.*?<\/b>)/)) {
    if (!part) continue;
    const m = part.match(/^<b>(.*)<\/b>$/);
    if (m) count.append(mk("b", "", m[1]));
    else count.append(part);
  }

  const back = mk("button", "primary", o.text.back);
  const go = mk("button", "ghost", o.text.go);
  const actions = mk("div", "actions");
  actions.append(back, go);

  const card = mk("div", "card");
  card.append(mk("div", "badge", "✋"), mk("h1", "", o.text.h1), target, count);
  if (o.warn) card.append(mk("p", "warn", o.warn));
  card.append(actions);
  const wrap = mk("div", "wrap");
  wrap.append(card);
  root.append(style, wrap);

  // Lock page scrolling and pause video/audio behind the overlay (e.g. YouTube autoplay).
  const de = () => document.documentElement;
  let prevOverflow = "";
  let active = true;
  const paused = new Set();
  const pauseAll = () => document.querySelectorAll("video, audio").forEach((m) => {
    if (!m.paused) { paused.add(m); m.pause(); }
  });
  const timer = setInterval(pauseAll, 400);

  const mount = () => {
    prevOverflow = de().style.overflow;
    de().style.overflow = "hidden";
    de().append(host);
    pauseAll();
    // If the page rebuilds the DOM and removes the overlay, re-attach it.
    new MutationObserver(() => { if (active && !host.isConnected) de().append(host); })
      .observe(de(), { childList: true });
  };
  if (de()) mount();
  else {
    const ob = new MutationObserver(() => { if (de()) { ob.disconnect(); mount(); } });
    ob.observe(document, { childList: true });
  }

  // Countdown before allowing "Proceed anyway".
  let left = Math.max(0, o.seconds | 0);
  const tick = () => {
    go.textContent = left > 0 ? o.text.goWait.replace("{n}", String(left)) : o.text.go;
    go.disabled = left > 0;
    if (left > 0) { left -= 1; setTimeout(tick, 1000); }
  };
  tick();

  back.addEventListener("click", () => chrome.runtime.sendMessage({ type: "nudge-back" }));
  go.addEventListener("click", () => {
    active = false;
    clearInterval(timer);
    host.remove();
    if (de()) de().style.overflow = prevOverflow;
    paused.forEach((m) => m.play().catch(() => {}));
    window.__dvcNudgeActive = false;
  });
}
