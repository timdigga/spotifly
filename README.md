<div align="center">

<img src="icons/icon128.png" width="80" alt="" />

<h1>Spotifly</h1>

<img src="https://readme-typing-svg.demolab.com?font=Segoe+UI&weight=600&size=20&pause=900&color=1DB954&center=true&vCenter=true&width=520&lines=Skip+a+song+without+leaving+your+tab;Search%2C+like%2C+change+volume%2C+switch+devices;Lives+in+your+toolbar%2C+not+in+your+way" alt="tagline" />

<br><br>

![Chrome](https://img.shields.io/badge/Chrome-works-4285F4?logo=googlechrome&logoColor=white)
![Edge](https://img.shields.io/badge/Edge-works-0078D7?logo=microsoftedge&logoColor=white)
![MIT](https://img.shields.io/badge/license-MIT-blue)

</div>

I kept alt-tabbing to Spotify just to skip one song, so I built this. It's a small
toolbar extension for Chrome and Edge. Click the icon and you get whatever's playing
plus the controls I actually use, without opening the app.

No frameworks, no build step, no server. Just a popup talking to Spotify's API.

## Demo

<!-- record a quick GIF and drop it here, it sells the thing way better than words -->
![demo](docs/demo.gif)

## What you can do

Play / pause, skip both ways, shuffle, repeat, like the current track, drag the
volume, and click the progress bar to jump around. There's a search tab to find a
song and play it, and a settings tab where you can move playback to your phone /
laptop / speaker.

The window pulls its color from the album art and shows a little equalizer when
something's playing. Small touches, but they make it feel less like a form.

## Setup

Here's the catch, and it's Spotify's, not mine: any app that logs into Spotify needs
its own Client ID. It's free and you do it once.

1. Load the extension: `chrome://extensions` (or `edge://extensions`) → turn on
   Developer mode → **Load unpacked** → pick this folder.
2. Click the icon. The setup screen shows a **Redirect URI** — copy it.
3. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard),
   hit **Create app**, paste that Redirect URI, tick **Web API**, save.
4. Open **Settings → User Management** and add your own Spotify name + email. Skip
   this and every request comes back **403** (new apps are locked to an allowlist).
5. Copy the **Client ID**, paste it into the extension, log in. That's it.

## A couple of things to know

Spotify only lets you control a device that's already awake. If nothing's playing
anywhere, there's nothing to send "play" to. The extension can quietly open
