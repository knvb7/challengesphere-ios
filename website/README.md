# ChallengeSphere Website

Standalone static marketing and policy website for ChallengeSphere.

## Run locally

Run from the repository root:

```bash
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173/website/
```

## Pages

- `http://localhost:4173/website/`
- `http://localhost:4173/website/privacy-policy.html`
- `http://localhost:4173/website/child-safety.html`
- `http://localhost:4173/website/account-deletion.html`

## Interest analytics

The browser submits website events to the same-origin Netlify Function:

`/.netlify/functions/interest`

Interest-form submissions also have a Netlify Forms fallback named `interest`,
so leads can still be captured in Netlify if the Google Sheets function is not
configured yet.

The browser must not contain the Google Apps Script URL or webhook secret. The
Netlify Function forwards validated events to Apps Script with a private shared
secret, and Apps Script keeps `ACCEPT_PUBLIC_WRITES = false`.

Required Netlify environment variables:

- `CHALLENGESPHERE_APPS_SCRIPT_URL`: your deployed Google Apps Script web app URL
- `CHALLENGESPHERE_WEBHOOK_SECRET`: a long random shared secret

Required Apps Script setup:

1. Paste `google-sheets-webhook.gs` into Apps Script.
2. Set `SPREADSHEET_ID_OR_URL` to the target Google Sheet ID or URL.
3. In Apps Script project settings, add Script Property
   `CHALLENGESPHERE_WEBHOOK_SECRET` with the same value used in Netlify.
4. Deploy as a web app with:
   - Execute as: Me
   - Who has access: Anyone

The Google Sheet itself can stay private. Visitors do not get access to the Sheet,
Apps Script URL, or secret.

## Google Play notes

After deploying this folder to a public HTTPS URL, use the deployed privacy-policy URL and account-deletion URL in Play Console. Also make sure the Play Console Data safety form matches the app's real data collection, sharing, SDK behavior, and account deletion process.

## Screenshots

Generated verification screenshots are saved in:

```text
website/screenshots/
```
