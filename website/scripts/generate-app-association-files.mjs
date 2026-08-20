import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const IOS_BUNDLE_ID = 'com.ironside.challengesphere';
const ANDROID_PACKAGE_NAME = 'com.challengesphere.app';
const DEFAULT_APPLE_TEAM_ID = '9CZSSGNN55';
const DISCOVERED_RELEASE_FINGERPRINT =
  '4D:E7:9F:77:E9:AE:35:5A:66:91:6B:6E:63:09:F9:86:E2:5A:30:EF:EF:A0:18:AB:21:1A:52:44:E0:B4:C4:74';
const TEAM_ID_PATTERN = /^[A-Z0-9]{10}$/;
const FINGERPRINT_PATTERN = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

const appleTeamId = (process.env.APPLE_TEAM_ID || DEFAULT_APPLE_TEAM_ID).trim().toUpperCase();
if (!TEAM_ID_PATTERN.test(appleTeamId)) {
  console.error('APPLE_TEAM_ID must be a 10-character Apple Developer Team ID.');
  process.exit(1);
}

const fingerprints = (
  process.env.ANDROID_APP_LINKS_SHA256_CERT_FINGERPRINTS
  || DISCOVERED_RELEASE_FINGERPRINT
)
  .split(',')
  .map((fingerprint) => fingerprint.trim().toUpperCase())
  .filter(Boolean);

if (fingerprints.length === 0 || fingerprints.some((fingerprint) => !FINGERPRINT_PATTERN.test(fingerprint))) {
  console.error('ANDROID_APP_LINKS_SHA256_CERT_FINGERPRINTS contains an invalid SHA-256 fingerprint.');
  process.exit(1);
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = process.env.ASSOCIATION_OUTPUT_DIR
  ? resolve(process.env.ASSOCIATION_OUTPUT_DIR)
  : resolve(scriptDirectory, '../.well-known');

const appleAssociation = {
  applinks: {
    apps: [],
    details: [
      {
        appID: `${appleTeamId}.${IOS_BUNDLE_ID}`,
        paths: ['/invite/*'],
      },
    ],
  },
};

const androidAssociation = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: ANDROID_PACKAGE_NAME,
      sha256_cert_fingerprints: fingerprints,
    },
  },
];

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, 'apple-app-site-association'),
  `${JSON.stringify(appleAssociation, null, 2)}\n`,
  'utf8',
);
writeFileSync(
  resolve(outputDirectory, 'assetlinks.json'),
  `${JSON.stringify(androidAssociation, null, 2)}\n`,
  'utf8',
);

console.log(`Generated verified app-link associations in ${outputDirectory}`);
