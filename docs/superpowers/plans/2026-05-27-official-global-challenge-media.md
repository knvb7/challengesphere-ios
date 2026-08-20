# Official Global Challenge Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the official ChallengeSphere account its logo avatar and assign curated hosted cover photos to all 50 official challenges.

**Architecture:** The existing logo and six free-to-use Unsplash photographs are uploaded to a stable public official-catalog asset location. The existing idempotent SQL seed script assigns the hosted logo and category-appropriate cover URLs to existing and newly seeded rows, with a media-source document retaining attribution and license evidence.

**Tech Stack:** PostgreSQL SQL, Amazon S3 hosted assets, Unsplash License source photography, shell verification.

---

### Task 1: SQL Media Coverage Regression

**Files:**
- Create: `../challengesphere/sql/verify_official_global_challenge_media.sql`

- [ ] **Step 1: Add a failing verification query**

Create a query that fails through non-zero `psql` exit when the official user
has no `profile_pic_url` or any active official challenge lacks
`cover_photo_urls`:

```sql
\set ON_ERROR_STOP on
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM challengesphere.users
      WHERE lower(username) = 'challengesphere'
        AND profile_pic_url IS NOT NULL
        AND profile_pic_url <> ''
  ) THEN
      RAISE EXCEPTION 'Official profile logo is missing';
  END IF;
  IF EXISTS (
      SELECT 1 FROM challengesphere.challenges c
      JOIN challengesphere.users u ON u.id = c.creator_id
      WHERE lower(u.username) = 'challengesphere'
        AND c.active = TRUE
        AND (c.cover_photo_urls IS NULL OR c.cover_photo_urls = '')
  ) THEN
      RAISE EXCEPTION 'Official challenge cover images are missing';
  END IF;
END $$;
```

- [ ] **Step 2: Run verification to confirm RED**

Run:

```bash
psql 'postgresql://postgres@127.0.0.1:5432/mihirdalal' -f sql/verify_official_global_challenge_media.sql
```

Expected: failure because the seeded official catalog has no hosted media
fields yet.

### Task 2: Hosted Asset Set and Attribution

**Files:**
- Create: `../challengesphere/docs/official-global-challenge-media-sources.md`

- [ ] **Step 1: Select and obtain licensed source files**

Use the bundled app asset for `official/challengesphere-logo.png` and
download one Unsplash License image for each catalog theme:

```text
fun-social.jpg
creative.jpg
reading-study.jpg
fitness.jpg
wellness.jpg
productivity.jpg
```

- [ ] **Step 2: Upload controlled copies**

Upload these assets to a public `official/global-challenges/` object prefix
in the ChallengeSphere media bucket and record each source page, author,
license and final HTTPS object URL in the media-source document.

### Task 3: SQL Asset Assignment

**Files:**
- Modify: `../challengesphere/sql/seed_official_global_challenges.sql`

- [ ] **Step 1: Add official profile URL update**

Extend the user insert/update logic so `profile_pic_url` is set to the hosted
ChallengeSphere logo for the reserved account whether the account already
exists or is newly created.

- [ ] **Step 2: Add cover mapping update**

Add a `VALUES (title, cover_url)` mapping for all 50 official titles and an
`UPDATE challengesphere.challenges` statement scoped to the official creator.
Use the six hosted theme image URLs according to each title's content.

- [ ] **Step 3: Apply seed and verify GREEN**

Run the seed script locally, then run
`sql/verify_official_global_challenge_media.sql`. Verify:

```text
official_profile_with_logo=1
official_challenges_with_covers=50
official_challenges_missing_covers=0
duplicate_titles=0
```

### Task 4: Regression Verification

**Files:**
- Verify: `../challengesphere/sql/seed_official_global_challenges.sql`
- Verify: frontend discovery rendering paths already implemented

- [ ] **Step 1: Rerun SQL for idempotency**

Apply the seed script twice and confirm there remain 50 official public
active challenges with zero duplicate official titles.

- [ ] **Step 2: Run scoped existing checks**

Run:

```bash
node scripts/test-global-challenges.mjs
npx tsc --noEmit
git diff --check
```

in the frontend repository, and `git diff --check` in the backend repository.
