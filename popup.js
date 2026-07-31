

const API = "https://api.spotify.com/v1";
const $ = (id) => document.getElementById(id);

const views = {
  setup: $("view-setup"),
  login: $("view-login"),
  loading: $("view-loading"),
  main: $("view-main"),
};

const DEFAULT_SETTINGS = { autoOpen: true, pin: true, accent: true, interval: 2000 };

let state = {
  isPremium: false,
  isPlaying: false,
  hasTrack: false,
  hasDevice: false,
  mode: "api",
  trackId: null,
  durMs: 0,
  shuffle: false,
  repeat: "off",
  liked: false,
  settings: { ...DEFAULT_SETTINGS },
  activeTab: "player",
  pollTimer: null,
  searchTimer: null,
  lastCover: null,
};

/* ---------- storage ---------- */
const store = {
  get: (keys) => new Promise((r) => chrome.storage.local.get(keys, r)),
  set: (obj) => new Promise((r) => chrome.storage.local.set(obj, r)),
};

/* ---------- View / Tabs ---------- */
function showView(name) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  views[name].classList.remove("hidden");
}

function switchTab(name) {
  state.activeTab = name;
  ["player", "search", "settings"].forEach((t) => {
    $("tab-" + t).classList.toggle("hidden", t !== name);
  });
  document.querySelectorAll(".tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === name);
  });
  if (name === "search") setTimeout(() => $("search-input").focus(), 50);
  if (name === "settings") loadDevices();
}

/* ---------- Spotify-API ---------- */
async function api(path, { method = "GET", body } = {}) {
  const token = await SpotifyAuth.getAccessToken();
  const doFetch = (tok) =>
    fetch(API + path, {
      method,
      headers: {
        Authorization: "Bearer " + tok,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let resp = await doFetch(token);
  if (resp.status === 401) {
    const t2 = await SpotifyAuth.getAccessToken();
    resp = await doFetch(t2);
  }
  if (resp.status === 204) return null;
  if (!resp.ok) throw await apiError(resp);
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

async function apiError(resp) {
  let msg = "Error " + resp.status;
  try {
    const j = await resp.json();
    if (j.error?.reason) msg = j.error.reason;
    else if (j.error?.message) msg = j.error.message;
  } catch (_) {}
  const e = new Error(msg);
  e.status = resp.status;
  return e;
}

/* ---------- Utils ---------- */
function fmtTime(ms) {
  if (ms == null) return "0:00";
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function parseMs(txt) {
  if (!txt) return null;
  const p = txt.split(":").map(Number);
  if (p.some((n) => !Number.isFinite(n))) return null;
  return p.length === 2 ? (p[0] * 60 + p[1]) * 1000 : p[0] * 1000;
}
function showHint(text, isHtml = false) {
  const el = $("player-hint");
  if (!text) { el.classList.add("hidden"); el.textContent = ""; return; }
  if (isHtml) el.innerHTML = text; else el.textContent = text;
  el.classList.remove("hidden");
}

/* ---------- Ambient-Hintergrund + Akzentfarbe ---------- */
function setAmbient(coverUrl) {
  if (coverUrl === state.lastCover) return;
  state.lastCover = coverUrl;
  const amb = $("ambient");
  if (coverUrl) {
    amb.style.backgroundImage = "url('" + coverUrl + "')";
    if (state.settings.accent) applyAccentFromCover(coverUrl);
    else setAccent(null);
  } else {
    amb.style.backgroundImage = "none";
    setAccent(null);
  }
}
function setAccent(rgb) {
  document.documentElement.style.setProperty(
    "--accent",
    rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : "#1db954"
  );
}
function applyAccentFromCover(url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      c.width = 12; c.height = 12;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, 12, 12);
      const d = ctx.getImageData(0, 0, 12, 12).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const rr = d[i], gg = d[i + 1], bb = d[i + 2];
        const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
        if (max < 40 || min > 220) continue; // zu dunkel/hell überspringen
        r += rr; g += gg; b += bb; n++;
      }
      if (n === 0) { setAccent(null); return; }
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
      // etwas aufhellen für Kontrast
      const boost = (v) => Math.min(255, Math.round(v * 1.15 + 30));
      setAccent([boost(r), boost(g), boost(b)]);
    } catch (_) {
      setAccent(null);
    }
  };
  img.onerror = () => setAccent(null);
  img.src = url;
}

/* ---------- Rendering ---------- */
function renderTrack({ name, artist, cover, isPlaying, posText, durText, frac }) {
  state.hasTrack = true;
  state.isPlaying = isPlaying;
  $("track-name").textContent = name || "–";
  $("track-artist").textContent = artist || "";
  $("cover").src = cover || "icons/placeholder.png";
  $("play-btn").textContent = isPlaying ? "⏸" : "⏵";
  $("pos").textContent = posText || "";
  $("dur").textContent = durText || "";
  const pct = frac != null ? Math.max(0, Math.min(1, frac)) * 100 : 0;
  $("progress-fill").style.width = pct + "%";
  $("view-main").classList.toggle("is-playing", !!isPlaying);
  setAmbient(cover || null);
}
function renderEmpty() {
  state.hasTrack = false;
  state.isPlaying = false;
  state.trackId = null;
  $("track-name").textContent = "–";
  $("track-artist").textContent = "Nothing playing";
  $("cover").src = "icons/placeholder.png";
  $("progress-fill").style.width = "0%";
  $("pos").textContent = "0:00";
  $("dur").textContent = "0:00";
  $("play-btn").textContent = "⏵";
  $("view-main").classList.remove("is-playing");
  setAdvancedEnabled(false);
  setAmbient(null);
}

// Aktiviert Like/Shuffle/Repeat/Volume (nur API + Premium)
function setAdvancedEnabled(on) {
  ["shuffle-btn", "repeat-btn", "volume", "like-btn"].forEach((id) => {
    $(id).disabled = !on;
  });
}

/* ---------- Web-Player-Tab ---------- */
function getSpotifyTab() {
  return new Promise((res) => {
    chrome.tabs.query({ url: "https://open.spotify.com/*" }, (tabs) => {
      res(tabs && tabs.length ? tabs[0].id : null);
    });
  });
}
function ensureSpotifyTab() {
  return new Promise((res) => {
    chrome.tabs.query({ url: "https://open.spotify.com/*" }, (tabs) => {
      if (tabs && tabs.length) return res(tabs[0].id);
      if (!state.settings.autoOpen) return res(null);
      chrome.tabs.create(
        { url: "https://open.spotify.com", active: false, pinned: !!state.settings.pin },
        (tab) => res(tab ? tab.id : null)
      );
    });
  });
}
function __readNowPlaying() {
  function firstEl(sels) { for (const s of sels) { const el = document.querySelector(s); if (el) return el; } return null; }
  const widget = document.querySelector('[data-testid="now-playing-widget"]') || document;
  const nameEl = firstEl([
    '[data-testid="now-playing-widget"] [data-testid="context-item-link"]',
    '[data-testid="context-item-info-title"]',
    '[data-testid="context-item-link"]',
  ]);
  const name = nameEl ? nameEl.textContent.trim() : null;
  if (!name) return null;
  let artist = "";
  const subt = widget.querySelector('[data-testid="context-item-info-subtitles"]');
  if (subt) artist = subt.textContent.trim();
  else artist = Array.from(widget.querySelectorAll('a[href*="/artist/"]')).map((a) => a.textContent.trim()).join(", ");
  const coverImg = firstEl(['[data-testid="cover-art-image"]', '[data-testid="now-playing-widget"] img']);
  const cover = coverImg ? coverImg.src : null;
  const pp = document.querySelector('[data-testid="control-button-playpause"]');
  let isPlaying = false;
  if (pp) { const l = (pp.getAttribute("aria-label") || "").toLowerCase(); isPlaying = l.includes("pause") || l.includes("pausieren"); }
  const posEl = document.querySelector('[data-testid="playback-position"]');
  const durEl = document.querySelector('[data-testid="playback-duration"]');
  const posText = posEl ? posEl.textContent.trim() : null;
  const durText = durEl ? durEl.textContent.trim() : null;
  let frac = null;
  const range = firstEl(['[data-testid="playback-progressbar"] input[type="range"]', 'input[type="range"][aria-label]']);
  if (range) { const v = Number(range.value), m = Number(range.max); if (Number.isFinite(v) && Number.isFinite(m) && m > 0) frac = v / m; }
  return { name, artist, cover, isPlaying, posText, durText, frac };
}
function __clickControl(action) {
  const map = {
    toggle: '[data-testid="control-button-playpause"]',
    next: '[data-testid="control-button-skip-forward"]',
    prev: '[data-testid="control-button-skip-back"]',
  };
  const sel = map[action]; if (!sel) return false;
  const btn = document.querySelector(sel); if (btn) { btn.click(); return true; } return false;
}
async function tabRead(tabId) {
  try {
    const [r] = await chrome.scripting.executeScript({ target: { tabId }, func: __readNowPlaying });
    return r ? r.result : null;
  } catch (_) { return null; }
}
async function tabClick(tabId, action) {
  try { await chrome.scripting.executeScript({ target: { tabId }, func: __clickControl, args: [action] }); return true; }
  catch (_) { return false; }
}

/* ---------- Konto / Profil ---------- */
async function loadProfile() {
  let me = null;
  try { me = await api("/me"); } catch (_) {}
  state.isPremium = me?.product === "premium";
  const badge = $("account-badge");
  badge.textContent = me ? (state.isPremium ? "Premium" : "Free") : "–";
  badge.classList.toggle("premium", state.isPremium);
}

/* ---------- Now Playing ---------- */
async function refreshNowPlaying() {
  // 1) Web-Player-Tab bevorzugen
  const tabId = await getSpotifyTab();
  if (tabId != null) {
    const np = await tabRead(tabId);
    if (np && np.name) {
      state.mode = "web";
      state.hasDevice = true;
      ["prev-btn", "play-btn", "next-btn"].forEach((id) => ($(id).disabled = false));
      setAdvancedEnabled(false); // erweiterte Regler nur im API-Modus
      renderTrack(np);
      showHint(null);
      return;
    }
  }

  // 2) API-Modus
  state.mode = "api";
  ["prev-btn", "play-btn", "next-btn"].forEach((id) => ($(id).disabled = !state.isPremium));

  let data;
  try { data = await api("/me/player"); }
  catch (e) {
    renderEmpty();
    if (e.status === 403) {
      showHint("403: your account isn't on the app's allowlist. Dashboard → App → Settings → User Management → add yourself, then log in again.");
    }
    return;
  }

  if (!data || !data.item) {
    state.hasDevice = !!data?.device;
    renderEmpty();
    showHint("Nothing active. Use »Settings → Open web player« or start a song on a device.");
    return;
  }

  const t = data.item;
  const posMs = data.progress_ms || 0;
  const durMs = t.duration_ms || 0;
  state.durMs = durMs;
  state.hasDevice = !!data.device;
  state.shuffle = !!data.shuffle_state;
  state.repeat = data.repeat_state || "off";

  renderTrack({
    name: t.name,
    artist: (t.artists || []).map((a) => a.name).join(", "),
    cover: t.album?.images?.[0]?.url,
    isPlaying: data.is_playing,
    posText: fmtTime(posMs),
    durText: fmtTime(durMs),
    frac: durMs ? posMs / durMs : null,
  });

  // Erweiterte Regler
  const advanced = state.isPremium;
  setAdvancedEnabled(advanced);
  $("shuffle-btn").classList.toggle("active", state.shuffle);
  $("repeat-btn").classList.toggle("active", state.repeat !== "off");
  $("repeat-btn").textContent = state.repeat === "track" ? "🔂" : "🔁";
  if (data.device && typeof data.device.volume_percent === "number") {
    $("volume").value = data.device.volume_percent;
    $("vol-ic").textContent = data.device.volume_percent === 0 ? "🔇" : data.device.volume_percent < 50 ? "🔉" : "🔊";
  }
  // Like-Status
  if (t.id && t.id !== state.trackId) {
    state.trackId = t.id;
    updateLike(t.id);
  }
  showHint(null);
}

/* ---------- Grundsteuerung ---------- */
async function control(action) {
  if (state.mode === "web") {
    const tabId = await getSpotifyTab();
    if (tabId != null) { await tabClick(tabId, action); setTimeout(refreshNowPlaying, 300); }
    return;
  }
  if (!state.isPremium) return;
  try {
    if (action === "toggle") await api(state.isPlaying ? "/me/player/pause" : "/me/player/play", { method: "PUT" });
    else if (action === "next") await api("/me/player/next", { method: "POST" });
    else if (action === "prev") await api("/me/player/previous", { method: "POST" });
    setTimeout(refreshNowPlaying, 350);
  } catch (e) { controlError(e); }
}
function controlError(e) {
  if (e.status === 404 || /device/i.test(e.message)) {
    showHint("No active device. Pick one in »Settings« or open the web player.");
  } else if (e.status === 403) {
    showHint("403: account not on the app's allowlist (Settings → Dashboard → User Management).");
  } else {
    showHint("Error: " + e.message);
  }
}

/* ---------- Erweiterte Steuerung (nur API) ---------- */
async function toggleShuffle() {
  if (state.mode !== "api" || !state.isPremium) return;
  try { await api("/me/player/shuffle?state=" + (!state.shuffle), { method: "PUT" }); setTimeout(refreshNowPlaying, 250); }
  catch (e) { controlError(e); }
}
async function cycleRepeat() {
  if (state.mode !== "api" || !state.isPremium) return;
  const next = state.repeat === "off" ? "context" : state.repeat === "context" ? "track" : "off";
  try { await api("/me/player/repeat?state=" + next, { method: "PUT" }); setTimeout(refreshNowPlaying, 250); }
  catch (e) { controlError(e); }
}
async function setVolume(v) {
  if (state.mode !== "api" || !state.isPremium) return;
  try { await api("/me/player/volume?volume_percent=" + Math.round(v), { method: "PUT" }); }
  catch (e) { controlError(e); }
}
async function seekTo(frac) {
  if (state.mode !== "api" || !state.isPremium || !state.durMs) return;
  const pos = Math.round(frac * state.durMs);
  try { await api("/me/player/seek?position_ms=" + pos, { method: "PUT" }); setTimeout(refreshNowPlaying, 250); }
  catch (e) { controlError(e); }
}
async function updateLike(trackId) {
  try {
    const arr = await api("/me/tracks/contains?ids=" + trackId);
    state.liked = Array.isArray(arr) && arr[0];
    $("like-btn").textContent = state.liked ? "♥" : "♡";
    $("like-btn").classList.toggle("active", state.liked);
  } catch (_) {}
}
async function toggleLike() {
  if (!state.trackId || state.mode !== "api") return;
  try {
    if (state.liked) await api("/me/tracks?ids=" + state.trackId, { method: "DELETE" });
    else await api("/me/tracks?ids=" + state.trackId, { method: "PUT" });
    state.liked = !state.liked;
    $("like-btn").textContent = state.liked ? "♥" : "♡";
    $("like-btn").classList.toggle("active", state.liked);
  } catch (e) { controlError(e); }
}

/* ---------- Geräte ---------- */
async function loadDevices() {
  const box = $("device-list");
  box.innerHTML = '<p class="muted small">Loading…</p>';
  let data;
  try { data = await api("/me/player/devices"); }
  catch (e) {
    box.innerHTML = '<p class="muted small">' + (e.status === 403 ? "403 – check the allowlist." : e.message) + "</p>";
    return;
  }
  const devices = data?.devices || [];
  if (!devices.length) {
    box.innerHTML = '<p class="muted small">No devices. Open the web player or a Spotify app.</p>';
    return;
  }
  box.innerHTML = "";
  devices.forEach((d) => {
    const el = document.createElement("div");
    el.className = "device" + (d.is_active ? " active" : "");
    const ic = d.type === "Smartphone" ? "📱" : d.type === "Computer" ? "💻" : d.type === "Speaker" ? "🔈" : "🎧";
    el.innerHTML = '<span class="dev-ic">' + ic + "</span><span></span>";
    el.querySelector("span:last-child").textContent = d.name + (d.is_active ? " · aktiv" : "");
    el.addEventListener("click", () => transferTo(d.id));
    box.appendChild(el);
  });
}
async function transferTo(deviceId) {
  try {
    await api("/me/player", { method: "PUT", body: { device_ids: [deviceId], play: state.isPlaying } });
    setTimeout(() => { loadDevices(); refreshNowPlaying(); }, 400);
  } catch (e) { controlError(e); }
}

/* ---------- Suche ---------- */
async function doSearch(query) {
  const box = $("search-results");
  if (!query.trim()) { box.innerHTML = ""; return; }
  try {
    const data = await api("/search?type=track&limit=12&q=" + encodeURIComponent(query));
    const items = data?.tracks?.items || [];
    if (!items.length) { box.innerHTML = '<p class="muted small">No results.</p>'; return; }
    box.innerHTML = "";
    items.forEach((t) => {
      const el = document.createElement("div");
      el.className = "result";
      const img = t.album?.images?.[t.album.images.length - 1]?.url || "icons/placeholder.png";
      el.innerHTML =
        '<img src="' + img + '" alt="">' +
        '<div class="result-meta"><div class="result-name"></div><div class="result-artist"></div></div>';
      el.querySelector(".result-name").textContent = t.name;
      el.querySelector(".result-artist").textContent = (t.artists || []).map((a) => a.name).join(", ");
      el.addEventListener("click", () => playTrack(t.uri));
      box.appendChild(el);
    });
  } catch (e) {
    const msg = e.status === 403
      ? "403: account not on the app's allowlist. Settings → Dashboard → User Management → add yourself."
      : e.message;
    box.innerHTML = '<p class="error">' + msg + "</p>";
  }
}
async function playTrack(uri) {
  if (!state.isPremium) { switchTab("player"); showHint("Playing via the API requires Premium."); return; }
  try {
    await api("/me/player/play", { method: "PUT", body: { uris: [uri] } });
    $("search-input").value = "";
    $("search-results").innerHTML = "";
    switchTab("player");
    setTimeout(refreshNowPlaying, 400);
  } catch (e) { switchTab("player"); controlError(e); }
}

/* ---------- Polling ---------- */
function startPolling() {
  stopPolling();
  refreshNowPlaying();
  state.pollTimer = setInterval(refreshNowPlaying, state.settings.interval);
}
function stopPolling() { if (state.pollTimer) clearInterval(state.pollTimer); state.pollTimer = null; }
window.addEventListener("unload", stopPolling);

/* ---------- Init ---------- */
async function enterMain() {
  showView("main");
  switchTab("player");
  syncSettingsUI();
  await ensureSpotifyTab();
  await loadProfile();
  startPolling();
}

async function init() {
  showView("loading");
  $("redirect-uri").textContent = SpotifyAuth.getRedirectUri();
  const { settings } = await store.get(["settings"]);
  state.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  const clientId = await SpotifyAuth.getClientId();
  if (!clientId) return showView("setup");
  if (!(await SpotifyAuth.isLoggedIn())) return showView("login");
  try { await enterMain(); }
  catch (e) {
    showView("login");
    $("login-error").textContent = e.message;
    $("login-error").classList.remove("hidden");
  }
}

/* ---------- Settings-UI ---------- */
function syncSettingsUI() {
  $("opt-autoopen").checked = state.settings.autoOpen;
  $("opt-pin").checked = state.settings.pin;
  $("opt-accent").checked = state.settings.accent;
  $("opt-interval").value = String(state.settings.interval);
}
async function updateSetting(key, value) {
  state.settings[key] = value;
  await store.set({ settings: state.settings });
}

/* ---------- Events ---------- */
function wireEvents() {
  // Setup
  $("copy-redirect").addEventListener("click", () => {
    navigator.clipboard.writeText(SpotifyAuth.getRedirectUri());
    $("copy-redirect").textContent = "Copied!";
    setTimeout(() => ($("copy-redirect").textContent = "Copy"), 1200);
  });
  $("save-client-id").addEventListener("click", async () => {
    const val = $("client-id-input").value.trim();
    const err = $("setup-error"); err.classList.add("hidden");
    if (!/^[0-9a-f]{20,}$/i.test(val)) { err.textContent = "That doesn't look like a valid Client ID."; err.classList.remove("hidden"); return; }
    await SpotifyAuth.setClientId(val);
    try { showView("loading"); await SpotifyAuth.login(); await enterMain(); }
    catch (e) { showView("login"); $("login-error").textContent = e.message; $("login-error").classList.remove("hidden"); }
  });

  // Login
  $("login-btn").addEventListener("click", async () => {
    const err = $("login-error"); err.classList.add("hidden");
    try { showView("loading"); await SpotifyAuth.login(); await enterMain(); }
    catch (e) { showView("login"); err.textContent = e.message; err.classList.remove("hidden"); }
  });
  $("reset-setup").addEventListener("click", async () => { await SpotifyAuth.clearAll(); init(); });

  // Tabs
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  // Player-Steuerung
  $("prev-btn").addEventListener("click", () => control("prev"));
  $("play-btn").addEventListener("click", () => control("toggle"));
  $("next-btn").addEventListener("click", () => control("next"));
  $("shuffle-btn").addEventListener("click", toggleShuffle);
  $("repeat-btn").addEventListener("click", cycleRepeat);
  $("like-btn").addEventListener("click", toggleLike);
  $("volume").addEventListener("change", (e) => setVolume(e.target.value));
  $("seek").addEventListener("click", (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  });

  // Suche
  $("search-input").addEventListener("input", (e) => {
    clearTimeout(state.searchTimer);
    const q = e.target.value;
    state.searchTimer = setTimeout(() => doSearch(q), 300);
  });

  // Optionen
  $("opt-autoopen").addEventListener("change", (e) => updateSetting("autoOpen", e.target.checked));
  $("opt-pin").addEventListener("change", (e) => updateSetting("pin", e.target.checked));
  $("opt-accent").addEventListener("change", async (e) => {
    await updateSetting("accent", e.target.checked);
    state.lastCover = null; // Neu anwenden erzwingen
    if (state.hasTrack) setAmbient($("cover").src);
  });
  $("opt-interval").addEventListener("change", async (e) => {
    await updateSetting("interval", Number(e.target.value));
    startPolling();
  });
  $("refresh-devices").addEventListener("click", loadDevices);
  $("open-web").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://open.spotify.com", active: true, pinned: !!state.settings.pin });
  });
  $("relogin-btn").addEventListener("click", async () => {
    try { showView("loading"); await SpotifyAuth.logout(); await SpotifyAuth.login(); await enterMain(); }
    catch (e) { showView("login"); $("login-error").textContent = e.message; $("login-error").classList.remove("hidden"); }
  });
  $("logout-btn").addEventListener("click", async () => { stopPolling(); await SpotifyAuth.logout(); showView("login"); });
  $("reset-setup2").addEventListener("click", async () => { stopPolling(); await SpotifyAuth.clearAll(); init(); });
}

document.addEventListener("DOMContentLoaded", () => { wireEvents(); init(); });
