# Official Global Challenges Design

**Date:** 2026-05-27

## Purpose

Load the provided set of 50 challenges as official ChallengeSphere global
challenges and make the discovery screen consistently expose them through
the ordered sections `All`, `Global`, `Following`, and `Others`.

## Data Ownership

Global status is defined by ownership, not a new challenge flag. A reserved
non-login user with username `challengesphere` owns all official global
challenges. Any future public challenge created for this user must appear in
the `Global` discovery section.

An idempotent SQL script in the backend repository will:

- Create the `challengesphere` official account if it does not exist.
- Insert the 50 CSV challenge records as public, active challenges owned by
  that account.
- Map CSV type values to `DAILY` and `ONE_OFF`, and duration labels to day
  counts.
- Preserve the CSV description, rules, and benefits in challenge data.
- Insert the official creator's `user_challenges` association for each seeded
  challenge, matching normal application challenge creation.
- Update the official account's created-challenge count.
- Avoid duplicate official challenges when the script is run again by
  checking official-owner/title pairs.

The same script will be run locally during implementation and supplied for
execution against Cloud SQL.

## Backend Discovery

The existing user-challenge route intentionally enforces mutual-follow
access and cannot be reused for official discovery. A narrowly scoped
backend route will return only active, non-private challenges created by a
specified user, with pagination. The route does not expose private
challenges or relax existing profile/follow protections.

The frontend will resolve the reserved username to its user id, then request
official public challenges through this route. Official challenges therefore
remain discoverable even with no participants and regardless of popularity
rank.

## Frontend Sections

The discovery challenge filters will be displayed in this order:

1. `All`
2. `Global`
3. `Following`
4. `Others`

The sections form clear partitions:

- `All`: every discoverable challenge loaded by the screen, including
  official challenges.
- `Global`: public challenges created by the `challengesphere` account.
- `Following`: non-official challenges created by accounts the current user
  follows.
- `Others`: non-official challenges from accounts the current user does not
  follow.

Official results will be merged into the discovery list by challenge id so
the same item is not rendered twice when it also appears in popular or
recent results. Existing trending card treatment may remain, but it is no
longer a top-level section.

## CSV Mapping

The import maps the provided CSV fields as follows:

| CSV Field | Challenge Storage |
| --- | --- |
| Title | `title` |
| Description and Rules & Guidelines | `description` |
| Category | `categories` and normalized hashtags |
| Rewards & Benefits | `benefits` |
| Challenge Type | `challenge_mode` |
| Duration | `number_of_days` |

Supported duration mappings are `1 Day` to `1`, `3 Days` to `3`, `1 Week`
to `7`, `2 Weeks` to `14`, `1 Month` to `30`, and `3 Months` to `90`.

## Failure Handling

- A missing official account is not an application error; while data has not
  yet been seeded, the `Global` section renders as empty.
- SQL execution is transactional so an insert failure does not leave a
  partially imported official catalog.
- Rerunning the SQL script is safe and should preserve one official account
  and one official record per CSV title.

## Verification

- Backend tests cover the new public-creator discovery behavior and ensure
  only active public creator challenges are returned.
- Frontend regression checks cover the filter order, official classification,
  and mutually exclusive section rules.
- Local PostgreSQL verification checks that the official account exists, the
  official catalog contains 50 imported challenges, and a second SQL run
  does not create duplicates.
- Type checking, linting, and the relevant existing application tests run
  after implementation.
