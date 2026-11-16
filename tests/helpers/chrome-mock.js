// Minimal fake of `chrome.*` to run the service worker in Node (no browser needed).
// Usage: const chrome = installChromeMock(); then `await import("../src/background/index.js")`.

function makeEvent() {
  const fns = [];
  return { addListener: (fn) => fns.push(fn), fire: (...args) => fns.map((fn) => fn(...args)) };
}

export function installChromeMock() {
  const stores = { local: {}, session: {} };
  const calls = { badge: [], notifications: [], tabsUpdate: [], tabsRemove: [], tabsCreate: [] };
  const storageChanged = makeEvent();

  const area = (name) => ({
    async get(keys) {
      const store = stores[name];
      if (keys == null) return { ...store };
      const out = {};
      for (const k of [].concat(keys)) if (k in store) out[k] = store[k];
      return out;
    },
    async set(obj) {
      const changes = {};
      for (const [k, v] of Object.entries(obj)) {
        changes[k] = { oldValue: stores[name][k], newValue: v };
        stores[name][k] = v;
      }
      storageChanged.fire(changes, name);
    },
    async remove(keys) {
      const changes = {};
      for (const k of [].concat(keys)) {
        if (k in stores[name]) changes[k] = { oldValue: stores[name][k] };
        delete stores[name][k];
      }
      if (Object.keys(changes).length) storageChanged.fire(changes, name);
    },
  });

  const chrome = {
    // Test controls
    _local: stores.local,
    _session: stores.session,
    _calls: calls,
    _reset() {
      for (const s of Object.values(stores)) for (const k of Object.keys(s)) delete s[k];
      for (const c of Object.values(calls)) c.length = 0;
    },

    runtime: {
      id: "test-ext",
      getURL: (p) => `chrome-extension://test-ext/${p.replace(/^\//, "")}`,
      onMessage: makeEvent(),
      onStartup: makeEvent(),
      onInstalled: makeEvent(),
    },
    storage: { local: area("local"), session: area("session"), onChanged: storageChanged },
    webNavigation: { onCommitted: makeEvent() },
    tabs: {
      onRemoved: makeEvent(),
      async update(id, props) { calls.tabsUpdate.push({ id, ...props }); },
      async remove(id) { calls.tabsRemove.push(id); },
      async create(props) { calls.tabsCreate.push(props); },
      async query() { return [{ id: 1 }, { id: 2 }]; },
    },
    alarms: { onAlarm: makeEvent(), async get() {}, create() {} },
    action: {
      async setBadgeText(o) { calls.badge.push(o.text); },
      async setBadgeBackgroundColor() {},
    },
    notifications: { create(o) { calls.notifications.push(o); } },
  };

  globalThis.chrome = chrome;
  return chrome;
}
