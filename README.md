# BP Timer

A British Parliamentary debate timer that lives entirely in the macOS
menu bar. The title next to the tray icon shows `time: status` and
keeps ticking whether the popup is open, minimised, or closed — so a
judge can flow a speech without a second window stealing focus.

Click the tray icon for the popup UI. Right-click for a Start/Stop/
Reset/Quit menu. ⌘⇧S and ⌘⇧R work globally.

## Install (users)

Grab the latest DMG from the [Releases page](../../releases):

- **Apple Silicon (M1/M2/M3/M4):** `BP Timer-<version>-arm64.dmg`
- **Intel:** `BP Timer-<version>.dmg`

Drag *BP Timer* to Applications. On first launch macOS will warn
because the app isn't signed with a Developer ID cert yet — **right-click
→ Open** once, then click **Open** in the dialog. From that point on
it opens normally.

Alternative (Terminal): `xattr -d com.apple.quarantine "/Applications/BP Timer.app"`

## BP milestones

| Time  | Status            | Dings |
|-------|-------------------|-------|
| 1:00  | POI Window Open   | 1     |
| 6:00  | POI Window Closed | 1     |
| 7:00  | Time Expired      | 2     |
| 7:15  | Grace Period Over | 3     |
| 7:20+ | Hard Stop         | 1     |

## Run from source

```
npm install
npm start
```

## Build a release DMG

```
npm run icons    # regenerate app icon + tray glyph (optional)
npm run dist     # produces DMGs + zips for arm64 and x64 in dist/
```

Full release workflow including GitHub publishing, code-signing, and
notarization steps: see [RELEASE.md](./RELEASE.md).

## Files

| File | Purpose |
|------|---------|
| `main.js` | Electron main process. Owns timer state, tray, windows, IPC, shortcuts. |
| `preload.js` | Context-isolated IPC bridge (`window.bp`). |
| `renderer.html` / `renderer.js` | Popup UI. |
| `bell.html` / `bell.js` | Hidden audio window — synthesises the service-bell ding from detuned bell-ratio partials + a high-pass noise strike. |
| `assets/makeIcon.js` | Generator for the 16/32 menu-bar bell glyph (template PNG). |
| `assets/makeAppIcon.js` | Generator for the full 16→1024 app-icon PNG set. |
| `assets/build-icns.sh` | Wraps `iconutil -c icns` to produce `icon.icns`. |
| `RELEASE.md` | Step-by-step release and GitHub publish guide. |
| `RELEASE_NOTES.md` | Template for per-release notes (edit per bump). |

## License

MIT.
