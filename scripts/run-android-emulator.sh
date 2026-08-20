#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK_DIR="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
AVD_NAME="${AVD_NAME:-ChallengeSphere_API35}"

export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-http://cs-backend-alb-21134616-1893852686.ap-south-1.elb.amazonaws.com/api/v1}"
export EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:-745252519059-ednontpssnid8aqer2f9s3v6aat8bl6d.apps.googleusercontent.com}"
export EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="${EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:-745252519059-pm0s0sqb557b38iafdrg787uilc21sle.apps.googleusercontent.com}"

if ! adb devices | grep -qE 'emulator-[0-9]+[[:space:]]+device'; then
  echo "Starting Android emulator: $AVD_NAME"
  emulator -avd "$AVD_NAME" -no-snapshot-load -gpu swiftshader_indirect -netdelay none -netspeed full &
  adb wait-for-device
  until [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do
    sleep 2
  done
fi

# Snapshot-resumed AVDs can retain a stale wall clock, which makes Google Play
# Services reuse credentials that the backend correctly considers expired.
# Keep this development emulator aligned with the host before launching Metro.
if adb root >/dev/null 2>&1; then
  adb wait-for-device
  adb shell settings put global auto_time 0
  adb shell date -u -s "@$(date +%s)" >/dev/null
fi

adb reverse tcp:8081 tcp:8081 || true

cd "$PROJECT_DIR"
echo "Running ChallengeSphere Android app against $EXPO_PUBLIC_API_BASE_URL"
exec npx expo run:android
