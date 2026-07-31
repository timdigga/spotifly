

const SpotifyAuth = (() => {
  const AUTH_URL = "https://accounts.spotify.com/authorize";
  const TOKEN_URL = "https://accounts.spotify.com/api/token";
  const SCOPES = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "user-library-read",
    "user-library-modify",
  ].join(" ");

  // Von Chrome bereitgestellte Redirect-URL, z. B.
  // https://<extension-id>.chromiumapp.org/
  const REDIRECT_URI = chrome.identity.getRedirectURL();

  /* ---------- kleine Helfer ---------- */

  const store = {
    get: (keys) => new Promise((res) => chrome.storage.local.get(keys, res)),
    set: (obj) => new Promise((res) => chrome.storage.local.set(obj, res)),
    remove: (keys) => new Promise((res) => chrome.storage.local.remove(keys, res)),
  };

  function randomString(length) {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    return Array.from(arr, (b) => chars[b % chars.length]).join("");
  }

  function base64url(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data);
  }

  /* ---------- öffentliche API ---------- */

  function getRedirectUri() {
    return REDIRECT_URI;
  }

  async function getClientId() {
    const { clientId } = await store.get(["clientId"]);
    return clientId || null;
  }

  async function setClientId(clientId) {
    await store.set({ clientId: clientId.trim() });
  }

  async function clearAll() {
    await store.remove([
      "clientId",
      "accessToken",
      "refreshToken",
      "expiresAt",
      "product",
    ]);
  }

  async function logout() {
    await store.remove(["accessToken", "refreshToken", "expiresAt", "product"]);
  }

  async function isLoggedIn() {
    const { refreshToken } = await store.get(["refreshToken"]);
    return !!refreshToken;
  }

  /* ---------- Login-Flow (PKCE) ---------- */

  async function login() {
    const clientId = await getClientId();
    if (!clientId) throw new Error("No Client ID saved.");

    const codeVerifier = randomString(64);
    const codeChallenge = base64url(await sha256(codeVerifier));
    const state = randomString(16);

    const authUrl =
      AUTH_URL +
      "?" +
      new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        state,
        scope: SCOPES,
      }).toString();

    const redirectResponse = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (responseUrl) => {
          if (chrome.runtime.lastError || !responseUrl) {
            reject(new Error(chrome.runtime.lastError?.message || "Login cancelled."));
          } else {
            resolve(responseUrl);
          }
        }
      );
    });

    const returned = new URL(redirectResponse);
    const error = returned.searchParams.get("error");
    if (error) throw new Error("Spotify returned: " + error);
    if (returned.searchParams.get("state") !== state) {
      throw new Error("State mismatch (security check).");
    }
    const code = returned.searchParams.get("code");
    if (!code) throw new Error("No authorization code received.");

    // Code gegen Tokens tauschen
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error("Token exchange failed: " + t);
    }
    const data = await resp.json();
    await saveTokens(data);
  }

  async function saveTokens(data) {
    const patch = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 60s Puffer
    };
    if (data.refresh_token) patch.refreshToken = data.refresh_token;
    await store.set(patch);
  }

  async function refresh() {
    const clientId = await getClientId();
    const { refreshToken } = await store.get(["refreshToken"]);
    if (!clientId || !refreshToken) throw new Error("Not logged in.");

    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });
    if (!resp.ok) {
      // Refresh-Token ungültig → Neu-Login erzwingen
      await logout();
      throw new Error("Session expired, please log in again.");
    }
    const data = await resp.json();
    await saveTokens(data);
  }

  // Gibt einen gültigen Access-Token zurück (refresht bei Bedarf)
  async function getAccessToken() {
    const { accessToken, expiresAt } = await store.get(["accessToken", "expiresAt"]);
    if (accessToken && expiresAt && Date.now() < expiresAt) return accessToken;
    await refresh();
    const { accessToken: fresh } = await store.get(["accessToken"]);
    return fresh;
  }

  return {
    getRedirectUri,
    getClientId,
    setClientId,
    clearAll,
    logout,
    isLoggedIn,
    login,
    getAccessToken,
  };
})();
