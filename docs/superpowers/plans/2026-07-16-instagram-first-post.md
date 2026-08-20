# ChallengeSphere Instagram First Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render, upload, and publish the approved ChallengeSphere Post 001 to `@challengesphere.app` exactly once through Meta's Instagram API.

**Architecture:** A standalone sibling project at `/Users/pranjaldalal/Documents/Startup/ChallengeSphere-Instagram` owns a copied ChallengeSphere logo, deterministic HTML renderer, local secrets, generated media, and publish state. Its narrowly scoped Node CLI validates the Instagram identity, uploads the approved 1080 × 1080 PNG privately to the existing S3 media bucket, gives Meta a time-limited presigned GET URL, creates and polls the media container, calls `media_publish` once, and records the returned media ID locally to prevent duplicates.

**Tech Stack:** Node.js 22 built-ins, installed Google Chrome headless renderer, AWS CLI 2, Amazon S3, Instagram API with Instagram Login (`graph.instagram.com`, Graph API v25.0)

## Global Constraints

- Publish only to the authenticated username `challengesphere.app`.
- Use only the existing ChallengeSphere logo, brand colors, and typography; no generated people, stock photography, or third-party artwork.
- Render exactly one 1080 × 1080 PNG with the approved artwork and byte-stable approved caption and alt text.
- Keep the long-lived Instagram token out of source files, command arguments, logs, screenshots, commits, and conversation.
- Authorize exactly one `media_publish` call for Post 001; a confirmed success or ambiguous outcome must never be retried automatically.
- Use the production media bucket only for `marketing/instagram/post-001.png`; do not modify application users or database records.
- Do not publish fallback creative or copy.
- Do not add operational Instagram code, assets, secrets, generated files, or state to `ChallengeSphere-Frontend` or the Spring Boot backend.

All paths and commands below are relative to `/Users/pranjaldalal/Documents/Startup/ChallengeSphere-Instagram` unless an absolute path is shown.

## File Structure

- Create `package.json`: dependency-free private Node project metadata.
- Create `.gitignore`: isolate local secrets, generated artwork, and publish state.
- Create `assets/challengesphere-logo.png`: approved logo copied once from the frontend repository.
- Create `posts/post-001/post.html`: deterministic 1080 × 1080 artwork source.
- Create `posts/post-001/post.json`: approved caption, alt text, target username, S3 key, and Graph version.
- Create `scripts/render-post-001.mjs`: render HTML through installed Chrome and validate the PNG header/dimensions.
- Create `scripts/publish-post-001.mjs`: identity guard, S3 upload/presign, container polling, one-shot publish, and verification.
- Create `tests/post-001-source.test.mjs`: asset and approved-copy contract tests.
- Create `tests/post-001-publisher.test.mjs`: mocked API and duplicate-prevention tests.
- Create `.env.local.example`: non-secret configuration template.

---

### Task 1: Deterministic approved artwork and copy package

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `assets/challengesphere-logo.png`
- Create: `tests/post-001-source.test.mjs`
- Create: `posts/post-001/post.json`
- Create: `posts/post-001/post.html`
- Create: `scripts/render-post-001.mjs`

**Interfaces:**
- Consumes once during setup: `/Users/pranjaldalal/Documents/Startup/ChallengeSphere-Frontend/assets/images/logo-mark-transparent.png`
- Produces: `generated/post-001.png` and the metadata fields `targetUsername`, `caption`, `altText`, `s3Key`, `graphVersion`

- [ ] **Step 1: Initialize the isolated sibling project**

Run:

```bash
mkdir -p /Users/pranjaldalal/Documents/Startup/ChallengeSphere-Instagram/{assets,posts/post-001,scripts,tests}
cd /Users/pranjaldalal/Documents/Startup/ChallengeSphere-Instagram
git init
cp /Users/pranjaldalal/Documents/Startup/ChallengeSphere-Frontend/assets/images/logo-mark-transparent.png assets/challengesphere-logo.png
```

Create `package.json`:

```json
{
  "name": "challengesphere-instagram",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" }
}
```

Create `.gitignore`:

```gitignore
node_modules/
.env.local
generated/
.state/
.DS_Store
```

- [ ] **Step 2: Write the failing asset contract test**

Create `tests/post-001-source.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const metadata = JSON.parse(await readFile(
  new URL('../posts/post-001/post.json', import.meta.url),
  'utf8',
));
const html = await readFile(
  new URL('../posts/post-001/post.html', import.meta.url),
  'utf8',
);

assert.equal(metadata.targetUsername, 'challengesphere.app');
assert.equal(metadata.graphVersion, 'v25.0');
assert.equal(metadata.s3Key, 'marketing/instagram/post-001.png');
assert.equal(metadata.altText, 'Purple ChallengeSphere launch graphic reading “Goals hit different with your people.”');
assert.equal(metadata.caption, `College goals are easier to start—and harder to ghost—when your people are in it with you. 💜

ChallengeSphere gives every goal its own challenge, submissions, and leaderboard.

Launching soon on Android. Follow @challengesphere.app and tag the friend you’d challenge first.

#ChallengeSphere #CollegeLife #Accountability #CampusLife #AndroidApp`);
assert.match(html, /Goals hit different with your people\./);
assert.match(html, /Create challenges\. Show up daily\. Win together\./);
assert.match(html, /Android · launching soon/);
assert.match(html, /challengesphere-logo\.png/);
assert.doesNotMatch(html, /https?:\/\//);

console.log('Instagram Post 001 source contract passes.');
```

- [ ] **Step 3: Run the contract test to verify it fails**

Run: `node tests/post-001-source.test.mjs`

Expected: FAIL with `ENOENT` for `posts/post-001/post.json`.

- [ ] **Step 4: Add the approved metadata**

Create `posts/post-001/post.json`:

```json
{
  "targetUsername": "challengesphere.app",
  "graphVersion": "v25.0",
  "s3Key": "marketing/instagram/post-001.png",
  "caption": "College goals are easier to start—and harder to ghost—when your people are in it with you. 💜\n\nChallengeSphere gives every goal its own challenge, submissions, and leaderboard.\n\nLaunching soon on Android. Follow @challengesphere.app and tag the friend you’d challenge first.\n\n#ChallengeSphere #CollegeLife #Accountability #CampusLife #AndroidApp",
  "altText": "Purple ChallengeSphere launch graphic reading “Goals hit different with your people.”"
}
```

- [ ] **Step 5: Add the approved square artwork source**

Create `posts/post-001/post.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080,initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    html, body { width: 1080px; height: 1080px; margin: 0; overflow: hidden; }
    body {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 104px;
      color: #fff;
      background: radial-gradient(circle at 80% 75%, #541aa0 0, #160629 31%, #050407 64%);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .orb {
      position: absolute; width: 620px; height: 620px; right: -216px; top: 284px;
      border-radius: 50%; opacity: .82; filter: blur(3px);
      background: radial-gradient(circle at 30% 30%, #d998ff, #5c10bf 58%, transparent 64%);
    }
    .brand { z-index: 1; display: flex; align-items: center; gap: 26px; font-size: 46px; font-weight: 800; letter-spacing: -1.4px; }
    .brand img { width: 88px; height: 88px; object-fit: contain; }
    h1 { z-index: 1; width: 830px; margin: auto 0 0; font-size: 122px; line-height: .94; letter-spacing: -8px; font-weight: 900; }
    .subhead { z-index: 1; width: 760px; margin-top: 36px; font-size: 36px; line-height: 1.35; opacity: .82; }
    .chip { z-index: 1; align-self: flex-start; margin-top: 62px; padding: 24px 34px; border-radius: 999px; color: #17101d; background: #f5f2ea; font-size: 26px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="orb"></div>
  <div class="brand"><img src="../../assets/challengesphere-logo.png" alt=""><span>challengesphere</span></div>
  <h1>Goals hit different with your people.</h1>
  <div class="subhead">Create challenges. Show up daily. Win together.</div>
  <div class="chip">Android · launching soon</div>
</body>
</html>
```

- [ ] **Step 6: Add the deterministic renderer and PNG dimension guard**

Create `scripts/render-post-001.mjs`:

```js
import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = path.join(root, 'posts/post-001/post.html');
const outputDir = path.join(root, 'generated');
const output = path.join(outputDir, 'post-001.png');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

await mkdir(outputDir, { recursive: true });
const render = spawnSync(chrome, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  `--screenshot=${output}`, '--window-size=1080,1080', pathToFileURL(source).href,
], { encoding: 'utf8' });
if (render.status !== 0) throw new Error(`Chrome render failed: ${render.stderr.trim()}`);

const png = await readFile(output);
assertPng1080(png);
console.log(output);

export function assertPng1080(png) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!png.subarray(0, 8).equals(signature)) throw new Error('Rendered asset is not a PNG');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== 1080 || height !== 1080) throw new Error(`Expected 1080x1080, received ${width}x${height}`);
}
```

- [ ] **Step 7: Confirm local generated and secret files are ignored**

Confirm `.gitignore` contains:

```gitignore
.env.local
generated/
.state/
```

- [ ] **Step 8: Render and run the source contract**

Run: `node scripts/render-post-001.mjs && node tests/post-001-source.test.mjs`

Expected: renderer prints an absolute `post-001.png` path, then `Instagram Post 001 source contract passes.`

- [ ] **Step 9: Commit the deterministic creative package**

```bash
git add package.json .gitignore assets/challengesphere-logo.png posts/post-001/post.html posts/post-001/post.json scripts/render-post-001.mjs tests/post-001-source.test.mjs
git commit -m "feat: render approved Instagram launch post"
```

---

### Task 2: One-shot Instagram publishing client

**Files:**
- Create: `tests/post-001-publisher.test.mjs`
- Create: `scripts/publish-post-001.mjs`
- Create: `.env.local.example`

**Interfaces:**
- Consumes: `posts/post-001/post.json`, `generated/post-001.png`, `INSTAGRAM_ACCESS_TOKEN`, and `INSTAGRAM_MEDIA_BUCKET`
- Produces: `.state/post-001.json` containing `containerId`, `mediaId`, `permalink`, `publishedAt`, and no secrets

- [ ] **Step 1: Write failing tests for identity guard and duplicate prevention**

Create `tests/post-001-publisher.test.mjs`:

```js
import assert from 'node:assert/strict';
import { validateIdentity, assertPublishableState, redactGraphError } from '../scripts/publish-post-001.mjs';

assert.equal(validateIdentity({ username: 'challengesphere.app', user_id: '123' }, 'challengesphere.app'), '123');
assert.throws(() => validateIdentity({ username: 'someone.else', user_id: '123' }, 'challengesphere.app'), /Refusing to publish/);
assert.doesNotThrow(() => assertPublishableState(null));
assert.throws(() => assertPublishableState({ mediaId: '1789' }), /already published/);
assert.throws(() => assertPublishableState({ outcome: 'unknown' }), /unknown outcome/);
assert.equal(redactGraphError({ message: 'Bad token', access_token: 'secret' }), '{"message":"Bad token","access_token":"[redacted]"}');

console.log('Instagram one-shot publishing guards pass.');
```

- [ ] **Step 2: Run the guard test to verify it fails**

Run: `node tests/post-001-publisher.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/publish-post-001.mjs`.

- [ ] **Step 3: Implement the pure safety guards**

Start `scripts/publish-post-001.mjs` with:

```js
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function validateIdentity(profile, expectedUsername) {
  if (profile?.username !== expectedUsername || !profile?.user_id) {
    throw new Error(`Refusing to publish: authenticated Instagram username is ${profile?.username ?? 'unknown'}`);
  }
  return String(profile.user_id);
}

export function assertPublishableState(state) {
  if (state?.mediaId) throw new Error(`Post 001 already published as media ${state.mediaId}`);
  if (state?.outcome === 'unknown') throw new Error('Post 001 has an unknown outcome; inspect recent media before retrying');
}

export function redactGraphError(value) {
  return JSON.stringify(value, (key, item) => key.toLowerCase().includes('token') ? '[redacted]' : item);
}
```

- [ ] **Step 4: Implement redacted Graph requests and bounded polling**

Add:

```js
async function graphRequest(url, init, accessToken) {
  const body = init?.body instanceof URLSearchParams ? new URLSearchParams(init.body) : new URLSearchParams();
  body.set('access_token', accessToken);
  const response = await fetch(url, { ...init, body: init?.method === 'POST' ? body : undefined });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(`Instagram API error: ${redactGraphError(payload.error ?? payload)}`);
  return payload;
}

async function pollContainer(baseUrl, containerId, accessToken) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const query = new URLSearchParams({ fields: 'status_code,status', access_token: accessToken });
    const response = await fetch(`${baseUrl}/${containerId}?${query}`);
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(`Container status error: ${redactGraphError(payload.error ?? payload)}`);
    if (payload.status_code === 'FINISHED') return;
    if (payload.status_code === 'ERROR' || payload.status_code === 'EXPIRED') throw new Error(`Container failed: ${payload.status ?? payload.status_code}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Container did not finish within 60 seconds');
}
```

- [ ] **Step 5: Implement private S3 upload and presigned retrieval**

Add:

```js
function runAws(args) {
  const result = spawnSync('aws', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`AWS command failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

async function uploadAndPresign(bucket, key, pngPath) {
  runAws(['s3', 'cp', pngPath, `s3://${bucket}/${key}`, '--content-type', 'image/png', '--cache-control', 'max-age=86400', '--no-progress']);
  const url = runAws(['s3', 'presign', `s3://${bucket}/${key}`, '--expires-in', '86400']);
  const response = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-32' } });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`Presigned media validation failed with HTTP ${response.status}`);
  }
  return url;
}
```

- [ ] **Step 6: Implement the check and one-shot publish commands**

Add this entry point after the helper functions:

```js
async function main() {
const root = fileURLToPath(new URL('..', import.meta.url));
const metadata = JSON.parse(await readFile(path.join(root, 'posts/post-001/post.json'), 'utf8'));
const pngPath = path.join(root, 'generated/post-001.png');
const stateDir = path.join(root, '.state');
const statePath = path.join(stateDir, 'post-001.json');
const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
const bucket = process.env.INSTAGRAM_MEDIA_BUCKET;
const command = process.argv[2];
if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is required');
if (!bucket) throw new Error('INSTAGRAM_MEDIA_BUCKET is required');
if (!['--check', '--publish'].includes(command)) throw new Error('Use --check or --publish');

const baseUrl = `https://graph.instagram.com/${metadata.graphVersion}`;
const meQuery = new URLSearchParams({ fields: 'user_id,username', access_token: accessToken });
const meResponse = await fetch(`${baseUrl}/me?${meQuery}`);
const mePayload = await meResponse.json();
if (!meResponse.ok || mePayload.error) throw new Error(`Identity check failed: ${redactGraphError(mePayload.error ?? mePayload)}`);
const profile = Array.isArray(mePayload.data) ? mePayload.data[0] : mePayload;
const instagramUserId = validateIdentity(profile, metadata.targetUsername);

if (command === '--check') {
  if (!existsSync(pngPath)) throw new Error('Render Post 001 before checking publication');
  console.log(`Validated Instagram target @${metadata.targetUsername} and local artwork.`);
  process.exit(0);
}

await mkdir(stateDir, { recursive: true });
const existingState = existsSync(statePath) ? JSON.parse(await readFile(statePath, 'utf8')) : null;
assertPublishableState(existingState);
const imageUrl = await uploadAndPresign(bucket, metadata.s3Key, pngPath);
const container = await graphRequest(`${baseUrl}/${instagramUserId}/media`, {
  method: 'POST',
  body: new URLSearchParams({ image_url: imageUrl, caption: metadata.caption, alt_text: metadata.altText }),
}, accessToken);
await writeFile(statePath, JSON.stringify({ containerId: String(container.id), outcome: 'container-created' }, null, 2));
await pollContainer(baseUrl, String(container.id), accessToken);

await writeFile(statePath, JSON.stringify({ containerId: String(container.id), outcome: 'unknown' }, null, 2));
const published = await graphRequest(`${baseUrl}/${instagramUserId}/media_publish`, {
  method: 'POST', body: new URLSearchParams({ creation_id: String(container.id) }),
}, accessToken);
const verifyQuery = new URLSearchParams({ fields: 'id,caption,media_type,permalink,username,timestamp', access_token: accessToken });
const verifyResponse = await fetch(`${baseUrl}/${published.id}?${verifyQuery}`);
const verified = await verifyResponse.json();
if (!verifyResponse.ok || verified.username !== metadata.targetUsername || verified.caption !== metadata.caption) {
  throw new Error(`Published media verification failed: ${redactGraphError(verified)}`);
}
const finalState = {
  containerId: String(container.id), mediaId: String(published.id), permalink: verified.permalink,
  publishedAt: verified.timestamp, outcome: 'published',
};
await writeFile(statePath, JSON.stringify(finalState, null, 2));
console.log(`Published Post 001: ${verified.permalink}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 7: Add the non-secret environment template**

Create `.env.local.example`:

```dotenv
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_MEDIA_BUCKET=challengesphere-submissions-prod-ap-south-1
```

- [ ] **Step 8: Run guard tests and verify secret hygiene**

Run: `node tests/post-001-publisher.test.mjs && rg -n "INSTAGRAM_ACCESS_TOKEN=.*[^=]" --glob '!node_modules/**' --glob '!.env.local' .`

Expected: `Instagram one-shot publishing guards pass.` and no committed token assignment.

- [ ] **Step 9: Commit the publishing client**

```bash
git add .env.local.example scripts/publish-post-001.mjs tests/post-001-publisher.test.mjs
git commit -m "feat: add guarded Instagram one-shot publisher"
```

---

### Task 3: Secure check, live publish, and evidence

**Files:**
- Create locally, never commit: `.env.local`
- Generate locally, never commit: `.state/post-001.json`

**Interfaces:**
- Consumes: approved Post 001 creative, the user's long-lived token, configured AWS CLI credentials
- Produces: one live Instagram media object and a verified permalink

- [ ] **Step 1: Create the local secret file without exposing the token**

Copy `.env.local.example` to `.env.local`. The user enters the long-lived token directly in that file using their editor. Do not print, inspect, or commit the file.

- [ ] **Step 2: Confirm the secret file is ignored**

Run: `git check-ignore -v .env.local`

Expected: `.gitignore` reports the `.env.local` rule.

- [ ] **Step 3: Run the non-publishing identity check**

Run:

```bash
set -a
source .env.local
set +a
node scripts/publish-post-001.mjs --check
```

Expected: `Validated Instagram target @challengesphere.app and local artwork.` No token appears in output.

- [ ] **Step 4: Reconfirm the exact live-write scope**

Verify that the metadata SHA-256 and rendered PNG SHA-256 have not changed since approval, the local state file has no `mediaId` or `outcome: unknown`, and the authenticated username is `challengesphere.app`.

- [ ] **Step 5: Execute the approved one-shot publish**

Run in the same shell with the environment loaded:

```bash
node scripts/publish-post-001.mjs --publish
```

Expected: `Published Post 001: https://www.instagram.com/p/.../` exactly once.

- [ ] **Step 6: Verify the live post and local state**

Confirm the permalink opens, displays the approved artwork and caption, belongs to `@challengesphere.app`, and the local state contains `outcome: published`, a media ID, and no access token.

- [ ] **Step 7: Report evidence without exposing secrets**

Return the Instagram permalink, media ID, artwork path, and verification result. Do not include the access token, presigned S3 URL, App Secret, or local environment file contents.
