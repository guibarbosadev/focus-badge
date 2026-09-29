// Shared by background, popup and options pages (loaded after config.js).
const KEYS = {
  token: "focusbadge:token",
  user: "focusbadge:user",
  deviceId: "focusbadge:deviceId",
  session: "focusbadge:session",
};

async function get(key) {
  return (await browser.storage.local.get(key))[key];
}

function set(key, value) {
  return browser.storage.local.set({ [key]: value });
}

// "https://www.YouTube.com/watch?v=1" -> "youtube.com"; null when not a host.
function normalizeSite(input) {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z]+:\/\//.test(s)) s = `http://${s}`;
  try {
    const host = new URL(s).hostname.replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

// Stained sessions keep blocking: the commitment stands, only the badge records the slip.
function isBlocking(session) {
  if (!session || !["active", "stained"].includes(session.status)) return false;
  return !(session.endDate && Date.parse(session.endDate) <= Date.now());
}

function badgeUrl(session) {
  return `${CONFIG.apiBaseUrl}/badge/${session.id}`;
}

async function api(path, { method = "GET", body } = {}) {
  const token = await get(KEYS.token);
  const res = await fetch(CONFIG.apiBaseUrl + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

// Random per-install id only; no OS/browser details leave the device.
async function getDevice() {
  let deviceId = await get(KEYS.deviceId);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    await set(KEYS.deviceId, deviceId);
  }
  return { deviceId };
}

// Heartbeat: reports the local blocklist; backend merges additions and stains removals.
// Offline or signed out: do nothing, blocking continues locally and the next ping catches up.
async function ping() {
  const session = await get(KEYS.session);
  // "active" past endDate still pings once so the backend can mark it completed.
  if (!["active", "stained"].includes(session?.status)) return;
  try {
    const { session: remote, token } = await api(`/session/${session.id}/ping`, {
      method: "POST",
      body: { blockedSites: session.blockedSites },
    });
    // Keep sites added locally while the request was in flight.
    const latest = await get(KEYS.session);
    remote.blockedSites = [
      ...new Set([...remote.blockedSites, ...(latest?.blockedSites ?? [])]),
    ];
    await browser.storage.local.set({ [KEYS.token]: token, [KEYS.session]: remote });
  } catch (error) {
    if (error.status === 401) await browser.storage.local.remove(KEYS.token);
    if (error.status === 404) await browser.storage.local.remove(KEYS.session);
    console.warn("FocusBadge ping failed", error);
  }
}
