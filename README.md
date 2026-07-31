<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="Spotifly Logo">

# Spotifly

A lightweight browser extension that lets you control Spotify without leaving your current tab.

View what's playing, pause or skip songs, search tracks, switch devices, adjust the volume and more—all from the browser toolbar.

</div>

---

## Features

- View the currently playing song
- Album artwork with live progress
- Play / Pause
- Previous / Next track
- Shuffle and Repeat
- Save the current song to your library
- Volume slider
- Seek through the current song
- Search and instantly play tracks
- Switch between available Spotify devices
- Automatically matches the UI colors to the album cover
- Optional fallback using an open Spotify Web Player tab
- OAuth 2.0 (PKCE) authentication
- No external libraries or build tools

---


## Installation

### Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the Spotifly folder

### Edge

1. Open `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the Spotifly folder

After that you can pin the extension from the browser toolbar.

---

## Spotify Setup

Spotify requires every application to use its own Client ID.

Setup only takes a few minutes.

1. Open the extension.
2. Copy the Redirect URI shown on the setup page.
3. Go to the Spotify Developer Dashboard.
4. Create a new application.
5. Add the copied Redirect URI exactly as shown.
6. Enable the **Web API**.
7. Add your Spotify account under **User Management**.
8. Copy the Client ID into the extension.
9. Log in.

If you don't add your Spotify account to the allowlist while the app is in Development Mode, Spotify will return **403 Forbidden**.

---

## Usage

### Player

- Current song
- Playback controls
- Shuffle & Repeat
- Save track
- Volume
- Seek bar

### Search

Search for any track and start playing it immediately.

### Settings

- Choose playback device
- Refresh interval
- Accent color from album art
- Automatically open Spotify Web Player
- Login / Logout
- Reset settings

---

## How it works

```
Popup
   │
   │ OAuth (PKCE)
   ▼
Spotify Accounts
   │
   ▼
Spotify Web API
   │
   └── Playback control

or

Popup
   │
   ▼
Spotify Web Player
(reads and controls the page directly)
```

If Spotify Premium is available, the extension uses the official Spotify Web API.

If not, it can optionally communicate with an open Spotify Web Player tab to provide basic playback information and controls.

---

## Project Structure

```
spotifly/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── auth.js
├── icons/
└── docs/
```

---

## Troubleshooting

### 403 Forbidden

Your Spotify account probably isn't added under **User Management** in the Spotify Developer Dashboard.

### Invalid Redirect URI

Make sure the Redirect URI in the Spotify Dashboard matches the one shown in the extension exactly.

### Playback controls don't work

Spotify only allows playback control through the Web API for Premium accounts.

Without Premium, use the optional Web Player mode.

---

## Planned Features

- Playlists
- Recently Played
- Keyboard shortcuts
- Light theme
- Chrome Web Store release

---

## Contributing

Pull requests are welcome.

If you find a bug or have an idea for a new feature, feel free to open an issue.

---

## License

This project is licensed under the MIT License.

---

<div align="center">

Spotifly is an independent project and is not affiliated with or endorsed by Spotify AB.

</div>
