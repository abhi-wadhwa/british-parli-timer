# BP Timer v1.1.0

## What's new

- **Real service bell sound.** Replaced the synthesized ding with an
  actual service bell sample (2s with fade-out). Sounds like the front
  desk bell you slap at a hotel.
- **Continuous dinging past 7:20.** Once the hard stop hits, the bell
  rings every single second until you stop or reset the timer. No more
  polite silence while a speaker runs over — they'll know.

## Install

Open **Terminal** (⌘Space → type `terminal` → Return), paste this,
press Return:

```
curl -fsSL https://github.com/abhi-wadhwa/british-parli-timer/releases/latest/download/install.sh | bash
```

Look for a bell icon in your menu bar. That's it.

### Manual install

1. Download the DMG for your Mac:
   - **Apple Silicon (M1/M2/M3/M4):** `BP.Timer-1.1.0-arm64.dmg`
   - **Intel:** `BP.Timer-1.1.0.dmg`
2. Open the DMG, drag **BP Timer** to Applications.
3. Open Terminal and run:
   ```
   xattr -dr com.apple.quarantine "/Applications/BP Timer.app"
   ```
4. Launch BP Timer from Applications.

## BP milestones

| Time  | Status              | Rings |
|-------|---------------------|-------|
| 0:00  | Protected Time      | 1     |
| 1:00  | POI Window Open     | 1     |
| 6:00  | POI Window Closed   | 1     |
| 7:00  | Time Expired        | 2     |
| 7:15  | Grace Period Over   | 3     |
| 7:20  | Hard Stop           | 1     |
| 7:21+ | Hard Stop           | 1/sec |

## Shortcuts

- `⌘⇧S` start / stop (works from any app)
- `⌘⇧R` reset

## Uninstall

Drag `/Applications/BP Timer.app` to the Trash.
