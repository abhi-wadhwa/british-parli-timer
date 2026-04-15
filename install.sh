#!/usr/bin/env bash
# BP Timer — one-command installer for macOS.
#
#   curl -fsSL https://github.com/abhi-wadhwa/british-parli-timer/releases/latest/download/install.sh | bash
#
# What it does:
#   1. Detects your Mac's architecture (Apple Silicon vs Intel).
#   2. Downloads the matching DMG from the latest GitHub release.
#   3. Mounts it, copies BP Timer.app to /Applications, unmounts.
#   4. Clears the macOS quarantine attribute (the reason you'd otherwise
#      see "BP Timer is damaged" on first launch — the app is fine, it
#      just isn't signed with a paid Apple Developer ID yet).
#   5. Launches BP Timer — a bell icon should appear in your menu bar.
#
# Safe to re-run: it overwrites any existing /Applications/BP Timer.app.

set -euo pipefail

REPO="abhi-wadhwa/british-parli-timer"
APP_NAME="BP Timer"
APP_PATH="/Applications/${APP_NAME}.app"

# Pretty output
c_reset=$'\033[0m'; c_bold=$'\033[1m'; c_green=$'\033[32m'
c_yellow=$'\033[33m'; c_red=$'\033[31m'; c_dim=$'\033[2m'

say()  { printf '%s➜%s %s\n' "$c_bold" "$c_reset" "$*"; }
ok()   { printf '%s✓%s %s\n' "$c_green" "$c_reset" "$*"; }
warn() { printf '%s!%s %s\n' "$c_yellow" "$c_reset" "$*"; }
die()  { printf '%s✗%s %s\n' "$c_red" "$c_reset" "$*" >&2; exit 1; }

# --- Sanity checks ---
if [[ "$(uname -s)" != "Darwin" ]]; then
  die "BP Timer is macOS only. You're running $(uname -s)."
fi

arch="$(uname -m)"
case "$arch" in
  arm64) dmg_suffix="arm64.dmg" ;;
  x86_64) dmg_suffix=".dmg" ;;
  *) die "Unsupported architecture: $arch" ;;
esac

say "Installing BP Timer for $([[ $arch == arm64 ]] && echo 'Apple Silicon' || echo 'Intel')..."

# --- Find latest release asset URL ---
# We follow GitHub's /latest redirect to discover the tag, then build the
# asset URL ourselves. This avoids depending on jq.
say "Looking up the latest release..."
latest_url="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/${REPO}/releases/latest")"
tag="${latest_url##*/}"
[[ -n "$tag" && "$tag" != "latest" ]] || die "Couldn't determine the latest release tag from $latest_url"

# GitHub rewrites asset filenames by replacing spaces with dots, and the
# download URL uses the format: /releases/download/<tag>/<asset-name>
version="${tag#v}"
if [[ "$arch" == "arm64" ]]; then
  asset="BP.Timer-${version}-arm64.dmg"
else
  asset="BP.Timer-${version}.dmg"
fi
dmg_url="https://github.com/${REPO}/releases/download/${tag}/${asset}"

# --- Download to a temp dir ---
tmp="$(mktemp -d -t bp-timer-install.XXXXXX)"
trap 'rm -rf "$tmp"' EXIT
dmg_path="$tmp/$asset"

say "Downloading $asset (~95 MB)..."
curl -fL --progress-bar -o "$dmg_path" "$dmg_url" \
  || die "Download failed. URL tried: $dmg_url"
ok "Downloaded."

# --- Mount, copy, unmount ---
say "Mounting the disk image..."
mount_output="$(hdiutil attach -nobrowse -noautoopen "$dmg_path")"
mount_point="$(echo "$mount_output" | awk -F'\t' '/\/Volumes\// { for (i=1;i<=NF;i++) if ($i ~ /^\/Volumes\//) { print $i; exit } }')"
[[ -n "$mount_point" && -d "$mount_point" ]] || die "Couldn't find the mounted volume."
ok "Mounted at $mount_point"

src_app="$mount_point/${APP_NAME}.app"
[[ -d "$src_app" ]] || { hdiutil detach "$mount_point" -quiet || true; die "Disk image doesn't contain ${APP_NAME}.app"; }

# If already installed and running, shut it down first so the copy doesn't fail.
if pgrep -f "${APP_PATH}/Contents/MacOS/" >/dev/null 2>&1; then
  say "Quitting the running BP Timer..."
  osascript -e 'tell application "BP Timer" to quit' 2>/dev/null || true
  sleep 1
  pkill -f "${APP_PATH}/Contents/MacOS/" 2>/dev/null || true
fi

if [[ -d "$APP_PATH" ]]; then
  say "Replacing existing $APP_PATH..."
  rm -rf "$APP_PATH"
fi

say "Copying to /Applications..."
# ditto preserves macOS metadata (extended attrs, resource forks) correctly.
ditto "$src_app" "$APP_PATH"
ok "Copied."

say "Unmounting disk image..."
hdiutil detach "$mount_point" -quiet || warn "Couldn't unmount $mount_point (not fatal)."

# --- Clear Gatekeeper quarantine ---
# Without this, macOS 15+ refuses to open ad-hoc-signed apps with a
# misleading "is damaged" error.
say "Clearing quarantine attribute..."
xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null || true
ok "Cleared."

# --- Launch ---
say "Launching BP Timer..."
open "$APP_PATH"

echo
ok "${c_bold}BP Timer ${version} is installed.${c_reset}"
echo "   Look for the bell icon in your menu bar (top-right of the screen)."
echo "   Click it to open the timer, or use ${c_bold}⌘⇧S${c_reset} / ${c_bold}⌘⇧R${c_reset} to start/reset from any app."
echo
echo "${c_dim}To uninstall later: drag /Applications/BP Timer.app to the Trash.${c_reset}"
