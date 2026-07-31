<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="Spotifly logo" />

# 🎧 Spotifly

**Control Spotify straight from your browser toolbar — see the current track, skip, search, like, tune volume, switch devices. No app switching.**

[![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4?logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore)
[![Edge](https://img.shields.io/badge/Edge-supported-0078D7?logo=microsoftedge&logoColor=white)](https://microsoftedge.microsoft.com/addons)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Spotify Web API](https://img.shields.io/badge/Spotify-Web%20API-1DB954?logo=spotify&logoColor=white)](https://developer.spotify.com/documentation/web-api)
[![No dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)

<sub>Vanilla JS · Zero build step · No trackers · OAuth 2.0 (PKCE)</sub>

</div>

---

## ✨ Highlights

|  | Feature |
|--|---------|
| 🎵 | **Now playing** — title, artist, album art, live progress |
| ⏯️ | **Full controls** — play/pause, previous, next |
| 🔀 | **Shuffle & repeat** — including single-track repeat |
| ❤️ | **Like** — save the current track to your library in one click |
| 🔊 | **Volume + seek** — drag volume, click the bar to scrub |
| 🔎 | **Search & play** — find any track and start it instantly |
| 📱 | **Device switch** — move playback to phone, PC or speaker |
| 🎨 | **Adaptive UI** — ambient blurred cover + accent color pulled from the art |
| 🆓 | **Free-tier fallback** — reads & controls an open `open.spotify.com` tab when the API can't |
| 🔐 | **Private** — PKCE login, no password or secret stored, everything runs locally |

---

## 🖼️ Preview

> _Drop your screenshots / GIF here_

<div align="center">

<!-- Replace these with real screenshots -->
<img src="docs/player.png" width="280" alt="Player tab" />
<img src="docs/search.png" width="280" alt="Search tab" />
<img src="docs/settings.png" width="280" alt="Settings tab" />

</div>

---

## 🚀 Install (unpacked)

```bash
git clone https://github.com/<your-username>/spotifly.git
```

**Chrome** → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick the folder
**Edge** → `edge://extensions` → enable **Developer mode** → **Load unpacked** → pick the folder

Pin it from the toolbar's puzzle icon and you're set.

---

## 🔑 One-time Spotify setup (~2 min)

Every app that logs in to Spotify needs a free **Client ID** — there's no way around it. You only do this once.

<details>
<summary><b>Step-by-step</b></summary>

<br>

1. Click the extension icon — the setup screen shows a **Redirect URI**. Copy it.
2. Open the **[Spotify Developer Dashboard](https://developer.spotify.com/dashboard)** → **Create app**.
3. Fill in:
   - **Redirect URI:** paste the copied URI **exactly** → **Add**
   - **Which API/SDKs:** check **Web API**
4. **Settings → User Management** → add your Spotify **display name + account email**.
   > ⚠️ New apps run in *Development Mode*. Only allowlisted accounts can use the API — everyone else (including you) gets **403**. This step prevents that.
5. Copy the **Client ID** → paste it into the extension → **Save & log in**.

</details>

---

## 🎛️ Usage

| Tab | What you get |
|-----|--------------|
| **Player** | Now playing, like, shuffle/prev/play/next/repeat, volume, click-to-seek |
| **Search** | Type → results → click to play |
| **Settings** | Auto-open web player, pin tab, accent-from-cover, refresh rate, **device picker**, re-login / logout / reset |

> ℹ️ **Active device:** Spotify's API can only control a device that's already active. The extension can auto-open a pinned `open.spotify.com` tab in the background — play once there and control everything from the toolbar afterward.

---

## 🧩 How it works

```
┌───────────────┐   OAuth 2.0 (PKCE)   ┌────────────────────┐
│  popup (UI)   │ ───────────────────► │  accounts.spotify  │
│  vanilla JS   │ ◄─── access token ── │  (no secret)       │
└──────┬────────┘                      └────────────────────┘
       │ REST
       ▼
┌────────────────────┐        fallback         ┌──────────────────────┐
│  api.spotify.com   │  ◄───────────────────►  │  open.spotify.com tab │
│  (Premium control) │  (read/click DOM, Free) │  via scripting.exec   │
└────────────────────┘                         └──────────────────────┘
```

- **API mode** — full control, requires Premium + allowlisted account.
- **Web-player mode** — injects a tiny reader into an open Spotify tab; works on Free for display + play/skip.

---

## 🗂️ Project structure

```
spotifly/
├── manifest.json     # Manifest V3 definition
├── popup.html        # Setup / Login / Player • Search • Settings
├── popup.css         # Dark, animated, Spotify-inspired styling
├── popup.js          # Player logic, controls, search, devices, settings
├── auth.js           # OAuth 2.0 (PKCE), token storage & refresh
└── icons/            # Toolbar icons + cover placeholder
```

---

## 🛠️ Troubleshooting

<details>
<summary><b>403 on search / nothing shows up</b></summary>

Your account isn't allowlisted. Dashboard → your app → **Settings → User Management** → add yourself → log in again.
</details>

<details>
<summary><b>"INVALID_CLIENT: Invalid redirect URI"</b></summary>

The Redirect URI in the dashboard must match the one in the popup **exactly**, trailing `/` included.
</details>

<details>
<summary><b>Advanced controls are greyed out</b></summary>

Your account is Free (or you're in web-player mode). Skip/play via the API requires Premium — a Spotify rule, not the extension.
</details>

---

## 🗺️ Roadmap

- [ ] Playlist quick-access
- [ ] Keyboard shortcuts
- [ ] Recently played
- [ ] Light theme
- [ ] Web Store release

---

## 🤝 Contributing

PRs and issues welcome! Fork, branch, and open a pull request. Keep it dependency-free and vanilla.

---

## 📄 License

Released under the **MIT License** — see [`LICENSE`](LICENSE).

<div align="center">
<sub>Not affiliated with Spotify AB. "Spotify" is a trademark of Spotify AB.</sub>
</div>
