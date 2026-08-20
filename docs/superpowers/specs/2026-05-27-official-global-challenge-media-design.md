# Official Global Challenge Media Design

**Date:** 2026-05-27

## Purpose

Brand the official `challengesphere` account with the ChallengeSphere logo
and supply relevant cover imagery for each of the 50 official global
challenges.

## Official Profile Image

The existing square ChallengeSphere logo asset will be hosted at a durable
application-owned media URL. The official user's `profile_pic_url` will be
updated to that hosted asset by the catalog SQL script so local and Cloud
SQL imports produce the same official identity across discovery and profile
surfaces.

## Challenge Covers

Challenge covers will use a small curated set of photographs selected for
these themes:

- Fun, social, and playful challenges
- Creative and music-oriented challenges
- Reading, journaling, and study challenges
- Fitness and walking challenges
- Health and wellness challenges
- Career, planning, productivity, and self-improvement challenges

Each selected photograph must be available for use under the Unsplash
License. A local source record will list the originating Unsplash page,
credit, theme, and hosted application-owned object path. Controlled hosted
copies avoid making production challenge cards dependent on third-party
hotlinks.

## Data Update

The official seed SQL script will be extended to:

- Set the official account's hosted logo URL on existing or newly inserted
  official accounts.
- Map each official challenge title to a relevant hosted cover URL.
- Update existing official challenge rows as well as newly inserted rows.
- Remain safe to rerun without producing duplicate users or challenges.

## Verification

- Confirm that one official `challengesphere` user has a non-empty logo
  profile URL.
- Confirm that all 50 active public official challenges have non-empty cover
  photo URLs.
- Confirm that rerunning the SQL does not duplicate official challenges.
- Run existing backend/frontend checks affected by the catalog data flow.
