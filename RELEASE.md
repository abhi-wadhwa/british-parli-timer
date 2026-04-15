# Releasing BP Timer

This doc walks through cutting a release and publishing it to GitHub so
BP debaters can install it.

## 0. One-time setup

You'll need:
- macOS (the build must be produced on a Mac — `iconutil`, `codesign`,
  `hdiutil`, and DMG tooling are all macOS-only).
- Node.js 18+ (you have 22.18.0).
- A GitHub repository to host the release (e.g. `abhiwadhwa/bp-timer`).
- The GitHub CLI (`gh`) installed and authenticated, **or** you can
  upload the DMG through the GitHub web UI.

Optional (for a signed + notarized release — frictionless install):
- Apple Developer Program membership (\$99/yr).
- A **Developer ID Application** certificate in your login keychain.
- An app-specific password for your Apple ID (notarization).

Without signing, the app still works — users just have to right-click →
Open once (or run `xattr -d com.apple.quarantine`) to clear the
Gatekeeper quarantine. See "Install instructions for users" below.

## 1. Bump the version

Edit `package.json` → `version`. Semantic versioning:
- Bug fix / tweak → patch (`1.0.0` → `1.0.1`)
- New feature, backward-compatible → minor (`1.0.1` → `1.1.0`)
- Breaking UI/behavior change → major (`1.1.0` → `2.0.0`)

## 2. Regenerate icons (only if changed)

```
npm run icons
```

This rebuilds `assets/trayTemplate*.png` (menu-bar glyph) and
`assets/icon.icns` (app icon) from their generator scripts.

## 3. Build the DMG

```
npm run dist
```

Produces in `dist/`:
- `BP Timer-<version>.dmg`            — Intel (x64)
- `BP Timer-<version>-arm64.dmg`      — Apple Silicon (M1/M2/M3/M4)
- `BP Timer-<version>-mac.zip`        — Intel zip (for auto-update / alt download)
- `BP Timer-<version>-arm64-mac.zip`  — Apple Silicon zip

Users on Apple Silicon should download the `arm64` DMG; users on Intel
Macs should download the plain one. If you'd rather ship a single file,
run `npm run dist:universal` instead (it's ~2× the size).

## 4. Smoke-test

```
open "dist/mac-arm64/BP Timer.app"      # or dist/mac for Intel
```

Check:
- [ ] Bell icon appears in the menu bar, no dock icon
- [ ] Title shows `0:00: Ready`
- [ ] Left-click opens the popup at the tray position
- [ ] Start button → title ticks every second, status changes
- [ ] At 1:00 a single service-bell ding plays (let it run or
      temporarily shorten the first milestone in `main.js` for a
      faster test)
- [ ] ⌘⇧S and ⌘⇧R global shortcuts work from another app
- [ ] Right-click on tray icon opens Start/Stop/Reset/Quit menu

## 5. Tag the release in git

```
git add -A
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

## 6. Publish to GitHub Releases

### Option A — GitHub CLI (recommended)

```
gh release create v1.0.0 \
  --title "BP Timer v1.0.0" \
  --notes-file RELEASE_NOTES.md \
  "dist/BP Timer-1.0.0-arm64.dmg#BP Timer (Apple Silicon)" \
  "dist/BP Timer-1.0.0.dmg#BP Timer (Intel)" \
  "dist/BP Timer-1.0.0-arm64-mac.zip" \
  "dist/BP Timer-1.0.0-mac.zip"
```

### Option B — Web UI

1. Go to `https://github.com/<you>/bp-timer/releases/new`.
2. Choose the tag `v1.0.0`.
3. Title: `BP Timer v1.0.0`.
4. Drag the four files from `dist/` into the assets section.
5. Paste `RELEASE_NOTES.md` into the description.
6. Publish.

## 7. Install instructions for users (put in README)

> **Apple Silicon (M1/M2/M3/M4):** Download `BP Timer-<version>-arm64.dmg`.
> **Intel Macs:** Download `BP Timer-<version>.dmg`.
>
> Open the DMG, drag BP Timer to your Applications folder, then:
>
> The first time you open the app, macOS will say
> *"BP Timer cannot be opened because Apple cannot check it for malicious software."*
> This is because the app is not (yet) signed with an Apple Developer
> ID certificate. To open it anyway:
>
> **Method 1 (right-click once):**
> 1. Open Applications in Finder.
> 2. **Right-click** BP Timer → **Open**.
> 3. Click **Open** in the dialog that appears.
> From now on it opens normally.
>
> **Method 2 (Terminal, for a batch install):**
> ```
> xattr -d com.apple.quarantine "/Applications/BP Timer.app"
> ```
>
> You should then see a small bell icon in your menu bar with
> `0:00: Ready` next to it.

## 8. (Optional) Full code-signing and notarization

Unsigned apps will *always* trigger the Gatekeeper warning on first
launch. To eliminate it:

1. Enroll in the Apple Developer Program.
2. In Xcode or the Apple Developer portal, create a
   **Developer ID Application** certificate and install it in your
   login keychain.
3. Create an app-specific password at appleid.apple.com.
4. Set these env vars before `npm run dist`:
   ```
   export APPLE_ID="you@example.com"
   export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
   export APPLE_TEAM_ID="XXXXXXXXXX"
   ```
5. In `package.json` → `build.mac`, change:
   ```json
   "hardenedRuntime": true,
   "gatekeeperAssess": true,
   "identity": "Developer ID Application: Your Name (TEAM_ID)",
   "notarize": true
   ```
6. Run `npm run dist` as usual. electron-builder will sign and then
   submit for Apple notarization (takes 1–5 min).  The resulting DMG
   will install cleanly with no Gatekeeper prompts.

## Release checklist (copy into each release PR)

```
- [ ] Version bumped in package.json
- [ ] Icons regenerated if changed (npm run icons)
- [ ] npm run dist completes cleanly
- [ ] Smoke-test: menu bar title ticks, popup opens, bell rings at 1:00
- [ ] Global shortcuts (⌘⇧S, ⌘⇧R) work
- [ ] README install instructions still accurate
- [ ] git tag vX.Y.Z pushed
- [ ] GitHub release drafted with both arm64 and x64 DMGs
- [ ] Release notes include: new features, bug fixes, known issues
```
