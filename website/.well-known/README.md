# App-link association files

`assetlinks.json` uses the SHA-256 fingerprint discovered from the repository's
release keystore for `com.challengesphere.app`. If Google Play App Signing uses a
different app-signing certificate, set
`ANDROID_APP_LINKS_SHA256_CERT_FINGERPRINTS` in Netlify to the Play Console
fingerprint (or a comma-separated list during certificate rotation).

The generator defaults to the Apple Team ID and iOS bundle identifier configured
by the native ChallengeSphere project: `9CZSSGNN55` and
`com.ironside.challengesphere`. Netlify can override the Team ID with the
optional ten-character `APPLE_TEAM_ID` environment variable if the signing
account changes. The generated association covers `/invite/*`.

The Netlify build intentionally fails when an explicit Team ID override or a
certificate fingerprint is malformed. This prevents a successful deployment
that silently breaks external invitation routing.
