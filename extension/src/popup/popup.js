const browserApi =
  typeof browser !== "undefined"
    ? browser
    : typeof chrome !== "undefined"
      ? chrome
      : null;

if (!browserApi) {
  throw new Error("Browser APIs are unavailable in this context.");
}

const manifestConfig = browserApi?.runtime?.getManifest?.() ?? {};

const CONFIG = {
  apiBaseUrl: manifestConfig.focusbadge?.apiBaseUrl ?? "http://localhost:3000",
  googleClientId: manifestConfig.focusbadge?.googleClientId ?? "",
  oauthScopes: ["openid", "email", "profile"],
};

const STORAGE_KEYS = {
  token: "focusbadge:token",
  user: "focusbadge:user",
};

const elements = {
  loginButton: document.getElementById("googleLogin"),
  optionsButton: document.getElementById("options"),
  status: document.getElementById("authStatus"),
};

elements.optionsButton?.addEventListener("click", () => {
  if (browserApi.runtime?.openOptionsPage) {
    browserApi.runtime.openOptionsPage();
  } else {
    const optionsUrl = browserApi.runtime?.getURL?.("src/options/options.html");
    if (optionsUrl) {
      browserApi.tabs?.create?.({ url: optionsUrl });
    }
  }
  window.close();
});

elements.loginButton?.addEventListener("click", () => {
  handleGoogleLogin().catch((error) => {
    console.error("Google login failed", error);
    updateStatus(`Sign-in failed: ${error.message}`);
    setLoginButtonState("idle");
  });
});

initializeAuthState().catch((error) => {
  console.error("Failed to initialize auth state", error);
});

async function initializeAuthState() {
  const stored = await storageGet([STORAGE_KEYS.token, STORAGE_KEYS.user]);
  const token = stored[STORAGE_KEYS.token];
  const user = stored[STORAGE_KEYS.user];

  if (token && user) {
    updateStatus(`Signed in as ${user.name ?? user.email}`);
    if (elements.loginButton) {
      elements.loginButton.textContent = "Reauthenticate with Google";
    }
  } else {
    updateStatus("You are signed out.");
  }
}

async function handleGoogleLogin() {
  if (!CONFIG.googleClientId) {
    throw new Error("Missing Google client ID. Update manifest focusbadge config.");
  }
  if (!browserApi.identity?.launchWebAuthFlow) {
    throw new Error("Browser identity API is not available.");
  }

  setLoginButtonState("loading");
  updateStatus("Launching Google sign-in…");

  console.log('perfoming google auth')
  const idToken = await performGoogleOAuth();
  console.log({ idToken })
  updateStatus("Verifying identity with FocusBadge…");
  console.log('updated status')
  const loginResponse = await exchangeIdToken(idToken);
  console.log({ loginResponse})

  await storageSet({
    [STORAGE_KEYS.token]: loginResponse.token,
    [STORAGE_KEYS.user]: loginResponse.user,
  });

  updateStatus(`Signed in as ${loginResponse.user.name ?? loginResponse.user.email}`);
  setLoginButtonState("success");
  if (elements.loginButton) {
    elements.loginButton.textContent = "Reauthenticate with Google";
  }
}

async function performGoogleOAuth() {
  const redirectUri = browserApi.identity.getRedirectURL();
  const state = generateOpaqueString();
  const nonce = generateOpaqueString();

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", CONFIG.googleClientId);
  url.searchParams.set("response_type", "id_token");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", CONFIG.oauthScopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("prompt", "select_account consent");

  const responseUrl = await launchWebAuthFlow(url.toString());
  const params = extractParams(responseUrl);

  if (params.get("state") !== state) {
    throw new Error("State mismatch while completing Google login.");
  }

  const idToken = params.get("id_token");
  if (!idToken) {
    throw new Error("Google did not return an ID token.");
  }

  return idToken;
}

async function exchangeIdToken(idToken) {
  const response = await fetch(`${CONFIG.apiBaseUrl}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });


  if (!response.ok) {
    let message = `Authentication failed (${response.status})`;
    try {
      const errorBody = await response.json();
      if (errorBody?.error) message = errorBody.error;
    } catch (_) {
      // ignore JSON parse failure
    }
    throw new Error(message);
  }

  return response.json();
}

function extractParams(url) {
  const parsed = new URL(url);
  if (parsed.hash) {
    return new URLSearchParams(parsed.hash.substring(1));
  }
  return new URLSearchParams(parsed.search);
}

function launchWebAuthFlow(url) {
  return new Promise((resolve, reject) => {
    const identity = browserApi.identity;
    if (!identity?.launchWebAuthFlow) {
      reject(new Error("Identity API is unavailable."));
      return;
    }
    const details = { url, interactive: true };
    try {
      if (identity.launchWebAuthFlow.length > 1) {
        identity.launchWebAuthFlow(details, (redirectUrl) => {
          const error = browserApi.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve(redirectUrl);
        });
        return;
      }
      identity.launchWebAuthFlow(details).then(resolve, reject);
    } catch (error) {
      reject(error);
    }
  });
}

function updateStatus(message) {
  if (elements.status) {
    elements.status.textContent = message;
  }
}

function setLoginButtonState(state) {
  if (!elements.loginButton) return;
  if (state === "loading") {
    elements.loginButton.disabled = true;
    elements.loginButton.textContent = "Signing in…";
  } else if (state === "success") {
    elements.loginButton.disabled = false;
  } else {
    elements.loginButton.disabled = false;
    elements.loginButton.textContent = "Continue with Google";
  }
}

function generateOpaqueString() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, "");
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function storageGet(keys) {
  return new Promise((resolve, reject) => {
    try {
      const result = browserApi.storage?.local?.get(keys);
      if (result && typeof result.then === "function") {
        result.then(resolve, reject);
        return;
      }
      browserApi.storage?.local?.get(keys, (items) => {
        const error = browserApi.runtime?.lastError;
        if (error) reject(new Error(error.message));
        else resolve(items);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function storageSet(items) {
  return new Promise((resolve, reject) => {
    try {
      const result = browserApi.storage?.local?.set(items);
      if (result && typeof result.then === "function") {
        result.then(resolve, reject);
        return;
      }
      browserApi.storage?.local?.set(items, () => {
        const error = browserApi.runtime?.lastError;
        if (error) reject(new Error(error.message));
        else resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}
