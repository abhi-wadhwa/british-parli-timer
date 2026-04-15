# BP Timer v1.0.1

A British Parliamentary debate timer that lives entirely in the macOS
menu bar. Great for judges who want to track a speech while flowing
without a second window stealing their attention.

## What's new in v1.0.1

- **One-command installer.** Paste one line into Terminal and BP Timer
  installs itself, clears the Gatekeeper quarantine, and launches — no
  "BP Timer is damaged" error, no right-click gymnastics.

## Install

Open **Terminal** (⌘Space → type `terminal` → Return), paste this,
press Return:

```
curl -fsSL https://github.com/abhi-wadhwa/british-parli-timer/releases/latest/download/install.sh | bash
```

Look for a bell icon in your menu bar. That's it.

### Manual install

If you'd rather install by hand:

1. Download the DMG for your Mac:
   - **Apple Silicon (M1/M2/M3/M4):** `BP.Timer-1.0.1-arm64.dmg`
   - **Intel:** `BP.Timer-1.0.1.dmg`
2. Open the DMG, drag **BP Timer** to Applications.
3. Open Terminal and run:
   ```
   xattr -dr com.apple.quarantine "/Applications/BP Timer.app"
   ```
   (On macOS 15+ Gatekeeper refuses unsigned apps with a misleading
   "is damaged" message. This removes the quarantine flag; the app is
   fine, it just hasn't been signed with a paid Apple Developer ID.)
4. Launch BP Timer from Applications.

## What it does

- **Always-visible menu-bar readout** in the form `time: status`
  (e.g. `2:14: Protected Time`). It keeps ticking whether the popup
  window is open, minimised, or closed.
- **Popup control window** drops from the menu-bar icon when clicked —
  large digital timer, phase-coloured progress bar, and a milestone
  reference panel.
- **Service-bell dings** at every BP milestone:

  | Time  | Status              | Rings |
  |-------|---------------------|-------|
  | 1:00  | POI Window Open     | 1     |
  | 6:00  | POI Window Closed   | 1     |
  | 7:00  | Time Expired        | 2     |
  | 7:15  | Grace Period Over   | 3     |
  | 7:20+ | Hard Stop           | 1     |

- **Global keyboard shortcuts** (work from any app, even while flowing):
  - `⌘⇧S` start / stop
  - `⌘⇧R` reset
- **No dock icon, no taskbar clutter** — pure menu-bar utility.

## Known limitations

- Unsigned. A paid Apple Developer ID ($99/yr) would let us ship a
  fully signed + notarized build that installs with zero extra steps.
  On the roadmap for a future version.
- No pause-preserving-state: **Stop** + **Start** continues from where
  you stopped, but **Reset** clears the timer to 0:00.

## Uninstall

Drag `/Applications/BP Timer.app` to the Trash.

## Feedback

File issues at the repo. PRs welcome.
