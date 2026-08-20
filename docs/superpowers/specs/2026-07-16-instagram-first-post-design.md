# ChallengeSphere Instagram Post 001 Design

## Objective

Publish ChallengeSphere's first Instagram feed post to `@challengesphere.app`
through Meta's Instagram API. The post introduces the brand to English-speaking
college friend groups ahead of an Android launch. This design covers one approved
post only; recurring content generation and scheduling remain separate work.

## Project isolation

All Instagram publishing code, copied brand assets, local credentials, generated
media, and publish state live in the sibling project
`/Users/pranjaldalal/Documents/Startup/ChallengeSphere-Instagram`. The publisher
must not add runtime code, secrets, generated media, or automation configuration
to `ChallengeSphere-Frontend` or the Spring Boot backend. The approved logo is
copied into the Instagram project so publishing does not depend on either app
repository at runtime.

## Approved creative

Create one 1080 × 1080 PNG using only the existing ChallengeSphere logo, brand
colors, and typography. Do not use generated people, stock photography, or
third-party artwork.

The artwork contains:

- Wordmark: `challengesphere`
- Headline: `Goals hit different with your people.`
- Supporting line: `Create challenges. Show up daily. Win together.`
- Launch chip: `Android · launching soon`

The composition uses the approved dark-purple Brand Arrival direction: a black
and deep-violet radial background, the ChallengeSphere mark at top left, a large
left-aligned headline, and a restrained light launch chip.

## Approved caption

```text
College goals are easier to start—and harder to ghost—when your people are in it with you. 💜

ChallengeSphere gives every goal its own challenge, submissions, and leaderboard.

Launching soon on Android. Follow @challengesphere.app and tag the friend you’d challenge first.

#ChallengeSphere #CollegeLife #Accountability #CampusLife #AndroidApp
```

Alt text:

```text
Purple ChallengeSphere launch graphic reading “Goals hit different with your people.”
```

## Publishing flow

1. Render the deterministic square artwork from the copied, checked-in
   ChallengeSphere logo inside `ChallengeSphere-Instagram` and verify its format
   and dimensions.
2. Upload it to the existing ChallengeSphere public media infrastructure under a
   marketing-specific key that does not collide with user uploads.
3. Verify that Meta can retrieve the media URL without authentication.
4. Validate the Instagram token with `GET /me` and confirm the returned username
   is exactly `challengesphere.app`.
5. Create one image container with the approved caption and alt text.
6. Confirm the container reaches `FINISHED`, then call `media_publish` once.
7. Retrieve the published media record and verify its account, caption, and
   permalink. Record the returned media ID and permalink locally without storing
   the access token.

## Credentials and authorization

The long-lived Instagram user token and Instagram account ID must be provided
through a gitignored local secrets file or environment variables. They must not
appear in source files, command text, logs, screenshots, commits, or conversation.
The Meta app stays unpublished because it serves only the owned Instagram account
under Standard Access.

The user's approval of Post 001 authorizes one `media_publish` call for this exact
asset and caption. Any changed creative or retry after a confirmed successful
publish requires new approval.

## Failure handling

- Abort before creating a container if the token belongs to a different username,
  the media URL is private, or the local creative validation fails.
- Poll container status with a bounded timeout. Do not publish a container that is
  still processing or reports an error.
- Treat an ambiguous network response from `media_publish` as unknown outcome:
  query the account's recent media and the container status before considering a
  retry, preventing duplicate posts.
- Never publish a fallback caption or fallback asset automatically.
- If the completed post is wrong, report its permalink immediately; deletion is a
  separate destructive action requiring explicit approval.

## Verification

- The rendered PNG is exactly 1080 × 1080 and has a valid PNG signature.
- The caption and alt text match this document byte-for-byte after normal newline
  normalization.
- The authenticated username is `challengesphere.app`.
- The public media URL returns an image content type.
- The published media ID resolves to the approved caption and a usable Instagram
  permalink.

## Out of scope

- Daily scheduling or recurring automations
- Marketing database tables or an approval dashboard
- Production demo-user or challenge seeding
- Reels, Stories, carousels, comment automation, and direct messages
- Instagram insights collection
