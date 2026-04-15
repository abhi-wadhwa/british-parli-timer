# BP Timer v1.0.0

A British Parliamentary debate timer that lives entirely in the macOS
menu bar. Great for judges who want to track a speech while flowing
without a second window stealing their attention.

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

## Install

### Apple Silicon (M1/M2/M3/M4)
Download **BP Timer-1.0.0-arm64.dmg**.

### Intel Mac
Download **BP Timer-1.0.0.dmg**.

Open the DMG, drag BP Timer into Applications, then:

> **Gatekeeper first-launch workaround.** This release is not signed
> with an Apple Developer ID (yet), so macOS will warn on first launch.
>
> - Open Finder → Applications.
> - **Right-click** BP Timer → **Open**.
> - Click **Open** in the dialog that appears.
>
> After this one-time step, the app launches normally. You'll see a
> bell icon with `0:00: Ready` in your menu bar.

## Known limitations

- Unsigned — see Gatekeeper note above.
- No pause-preserving-state: "Stop" + "Start" continues from where you
  stopped, but "Reset" clears the timer to 0:00.
- No keyboard shortcut to toggle the popup yet (use menu-bar click).

## Feedback

File issues at the repo. PRs welcome.
