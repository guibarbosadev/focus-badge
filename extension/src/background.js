let session = null;
get(KEYS.session).then((s) => (session = s));
browser.storage.onChanged.addListener((changes) => {
  if (KEYS.session in changes) session = changes[KEYS.session].newValue ?? null;
});

browser.webRequest.onBeforeRequest.addListener(
  ({ url }) => {
    if (!isBlocking(session)) return;
    const host = new URL(url).hostname;
    const site = session.blockedSites.find((s) => host === s || host.endsWith(`.${s}`));
    if (!site) return;
    const page = browser.runtime.getURL("src/blocked/blocked.html");
    return { redirectUrl: `${page}?site=${encodeURIComponent(site)}` };
  },
  { urls: ["http://*/*", "https://*/*"], types: ["main_frame"] },
  ["blocking"]
);

browser.alarms.create("ping", { periodInMinutes: 60 });
browser.alarms.onAlarm.addListener(ping);
ping(); // background loads on browser startup, install and update

// Login runs here, not in the popup: the popup closes when the auth window takes focus.
browser.runtime.onMessage.addListener((message) => {
  if (message === "login") return login();
});

async function login() {
  const state = crypto.randomUUID();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: CONFIG.googleClientId,
    response_type: "id_token",
    redirect_uri: browser.identity.getRedirectURL(),
    scope: "openid email profile",
    state,
    nonce: crypto.randomUUID(),
    prompt: "select_account",
  });

  const redirect = await browser.identity.launchWebAuthFlow({
    url: url.toString(),
    interactive: true,
  });
  const params = new URLSearchParams(new URL(redirect).hash.slice(1));
  if (params.get("state") !== state) throw new Error("State mismatch during sign-in.");
  const idToken = params.get("id_token");
  if (!idToken) throw new Error("Google did not return an ID token.");

  const { token, user } = await api("/auth/google", {
    method: "POST",
    body: { idToken },
  });
  await browser.storage.local.set({ [KEYS.token]: token, [KEYS.user]: user });
  ping();
}
