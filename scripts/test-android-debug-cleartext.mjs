import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const debugManifest = await readFile(
  new URL("../android/app/src/debug/AndroidManifest.xml", import.meta.url),
  "utf8",
);
const mainManifest = await readFile(
  new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url),
  "utf8",
);

assert.match(
  debugManifest,
  /<application[^>]*android:usesCleartextTraffic="true"/,
  "debug builds must allow Metro's local HTTP development server",
);
assert.match(
  mainManifest,
  /<application[^>]*android:usesCleartextTraffic="false"/,
  "release-capable builds must continue blocking cleartext traffic",
);

console.log("Android debug cleartext policy is development-only.");
