# ChallengeSphere Website Design

## Objective

Create a beautiful standalone website for ChallengeSphere inside a separate folder in this codebase. The site should match the app's dark neon visual theme, include a public privacy policy, provide an account/data deletion request path for Google Play readiness, run locally first, and include saved screenshots.

## Direction

Use the approved app-native landing page direction:

- Dark-first background with black, deep purple, emerald, gold, and blue ambient glows.
- Lowercase `challengesphere` brand lockup, matching the app intro.
- Conversion-focused landing page for people discovering the app.
- Product language centered on social accountability, private rooms, friends, submissions, glories, streaks, and leaderboards.

## Location

Place the website in a new top-level folder:

- `website/`

This keeps the marketing/legal website separate from the Expo app routes while still living in the same codebase. The site should be a static site that can run locally from the repository root with a simple HTTP server.

## Pages

### Homepage

Path: `website/index.html`

The homepage should include:

- Hero with ChallengeSphere brand, headline, subheadline, app-style preview card, and download call-to-action placeholders.
- Navigation links to Features, Safety, Privacy Policy, and Account Deletion.
- Feature sections for private challenges, friend accountability, photo submissions, glories, and leaderboards.
- Challenge examples that demonstrate fitness, coding, reading, creative, and private group challenges.
- Safety/trust strip explaining privacy, invite-only rooms, data controls, and support.
- Footer with contact email and legal links.

### Privacy Policy

Path: `website/privacy-policy.html`

The privacy policy must be clearly labeled and suitable for a public URL. It must disclose:

- Developer/entity information: ChallengeSphere and Ironside.
- Privacy contact: `ironside-dev@challengesphere.com`.
- Data collected: account/profile data, challenge activity, submissions/photos/comments/glories/leaderboards/follows/invites/reports, integration data, device/app data, contacts/invite data when permission is granted.
- How data is used.
- Public/social content behavior.
- Sharing with service providers and legal/safety purposes.
- Secure handling.
- Retention and deletion policy.
- User choices and rights.
- Children/minors statement.
- International processing.
- Policy update process.

### Account/Data Deletion

Path: `website/account-deletion.html`

This page must give users a web resource where they can request account deletion and associated data deletion. It should:

- Reference ChallengeSphere by name.
- Make the deletion request path prominent.
- Tell users to email `ironside-dev@challengesphere.com`.
- Pre-fill a mailto subject/body with account deletion request language.
- Explain verification, deletion scope, retained safety/legal records, and expected handling at a high level.
- Link back to the privacy policy.

## Google Play Readiness

The website should support current Google Play requirements by providing:

- A public, non-PDF privacy policy page.
- A clear privacy contact mechanism.
- A web resource for account/data deletion requests.
- Data handling language that is consistent with the existing app privacy policy.

Google Play Console actions still remain outside this code change. The developer must later enter the deployed privacy-policy URL and account-deletion URL in Play Console and ensure the Data safety form matches the app's real behavior and SDKs.

## Technical Approach

Use static HTML, CSS, and small progressive-enhancement JavaScript:

- No framework or package install.
- Use `website/styles.css` for the visual system.
- Use `website/script.js` for current year, smooth scrolling, and screenshot metadata helpers if useful.
- Reference existing repo image assets from `/assets/images/...` when the local server is run from the repository root.
- Include a `website/README.md` with local run instructions.
- Save screenshots under `website/screenshots/`.

## Local Run

Run from the repository root:

```bash
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173/website/
```

## Testing and Verification

Verification should include:

- Static link check for key internal links.
- Local HTTP server smoke test.
- Browser or script-based screenshots for homepage, privacy policy, and account deletion page.
- Confirm files exist under `website/`.
- If available, run `graphify update .` after code changes.

## Out of Scope

- Publishing the site to a live domain.
- Submitting the Google Play Console Data safety form.
- Building an authenticated web app.
- Changing existing Expo app navigation or account deletion implementation.

## Spec Self-Review

- No placeholders remain.
- The site is scoped as a standalone static website in `website/`.
- Google Play readiness is framed accurately: the site supports policy requirements, but Play Console submission and legal review remain external.
- Screenshot requirement is included as a deliverable.
