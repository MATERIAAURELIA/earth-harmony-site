/**
 * SyncStore — localStorage + server sync.
 * Drop-in replacement: SyncStore.get(key), SyncStore.set(key, data)
 * Auto-syncs to /api/store/<key> on the server.
 */
const SyncStore = {
  _base: location.protocol + '//' + location.hostname + ':8101',
  // only talk to the 8101 server on the home network / this Mac (hosted pages = localStorage only)
  _local: /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname),

  async get(key) {
    // Try server first (source of truth), fall back to localStorage
    if (this._local) try {
      const resp = await fetch(`${this._base}/api/store/${key}`);
      if (resp.ok) {
        const serverData = await resp.json();
        if (serverData && Object.keys(serverData).length) {
          // Check if server is newer
          const lsRaw = localStorage.getItem(key);
          const lsData = lsRaw ? JSON.parse(lsRaw) : null;
          if (!lsData || (serverData._ts && (!lsData._ts || serverData._ts > lsData._ts))) {
            localStorage.setItem(key, JSON.stringify(serverData));
            return serverData;
          }
          return lsData;
        }
      }
    } catch (e) { /* server unavailable, use localStorage */ }
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  async set(key, data) {
    data._ts = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
    // Fire and forget server save
    if (this._local) try {
      fetch(`${this._base}/api/store/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { /* offline, localStorage still saved */ }
  }
};
