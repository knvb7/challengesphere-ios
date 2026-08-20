# Official Global Challenges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed official ChallengeSphere-owned challenges and expose reliable `All`, `Global`, `Following`, and `Others` discovery sections.

**Architecture:** An idempotent backend SQL script creates the reserved official user and catalog. A narrowly scoped backend service/controller endpoint exposes only active public challenges by creator, while frontend utilities classify challenges and the discovery screen fetches the official creator catalog independently of popular ranking.

**Tech Stack:** PostgreSQL, Spring Boot/JPA/JUnit/Mockito, React Native/Expo/TypeScript, Node assertion regression checks.

---

### Task 1: Public Creator Challenge Discovery

**Files:**
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/repository/ChallengeRepository.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/ChallengeService.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/ChallengeServiceImpl.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/controller/ChallengeController.java`
- Test: `../challengesphere/src/test/java/com/ironside/challengesphere/service/impl/ChallengeServiceImplTest.java`

- [ ] **Step 1: Write the failing service test**

Add a test that supplies an active public challenge and confirms
`getPublicChallengesByCreator(41L, 1, 20, 7L)` returns the repository result
without invoking follow access:

```java
when(challengeRepository.findPublicActiveByCreatorId(41L)).thenReturn(List.of(global));
UserChallengesResponse response =
        challengeService.getPublicChallengesByCreator(41L, 1, 20, 7L);
assertEquals(List.of(global), response.getChallenges());
assertEquals(1, response.getTotalCount());
verify(followRepository, never()).existsActiveMutualFollow(any(), any());
```

- [ ] **Step 2: Run the test to verify RED**

Run: `./mvnw test -Dtest=ChallengeServiceImplTest`

Expected: compilation failure because `getPublicChallengesByCreator` and
`findPublicActiveByCreatorId` do not yet exist.

- [ ] **Step 3: Add public-only repository, service, and controller route**

Add the repository query:

```java
@Query(value = """
    SELECT * FROM challengesphere.challenges
    WHERE creator_id = :creatorId AND private = false AND active = true
    ORDER BY created_at DESC, id DESC
    """, nativeQuery = true)
List<Challenge> findPublicActiveByCreatorId(@Param("creatorId") Long creatorId);
```

Expose the service method and implement pagination with
`UserChallengesResponse.create(...)` and `withReadableCoverPhotoUrls(...)`.
Expose authenticated `GET /api/v1/challenges/creator/{creatorId}/public`
with `page` and `pageSize` parameters and the authenticated viewer id for
media URL processing only; it must not call mutual-follow validation.

- [ ] **Step 4: Run backend unit tests to verify GREEN**

Run: `./mvnw test -Dtest=ChallengeServiceImplTest`

Expected: all `ChallengeServiceImplTest` tests pass.

### Task 2: Official Challenge Import SQL

**Files:**
- Create: `../challengesphere/sql/seed_official_global_challenges.sql`

- [ ] **Step 1: Write an idempotent transactional SQL import**

Create a script with:

```sql
BEGIN;
INSERT INTO challengesphere.users (...)
SELECT 'global-challenges@challengesphere.app', 'challengesphere', '!'
WHERE NOT EXISTS (
  SELECT 1 FROM challengesphere.users WHERE lower(username) = 'challengesphere'
);
WITH official AS (
  SELECT id FROM challengesphere.users WHERE lower(username) = 'challengesphere'
), source (...) AS (
  VALUES (... all 50 CSV mapped rows ...)
)
INSERT INTO challengesphere.challenges (...)
SELECT ... FROM official CROSS JOIN source
WHERE NOT EXISTS (
  SELECT 1 FROM challengesphere.challenges c
  WHERE c.creator_id = official.id AND c.title = source.title
);
INSERT INTO challengesphere.user_challenges (...)
SELECT ... FROM challengesphere.challenges c JOIN official ...
ON CONFLICT (user_id, challenge_id) DO UPDATE SET active = true;
UPDATE challengesphere.users ...;
COMMIT;
```

Use `ONE_OFF` for CSV `One-off`, `DAILY` for `Daily`, and map supported
durations to `1`, `3`, `7`, `14`, `30`, and `90` days.

- [ ] **Step 2: Execute locally and verify idempotency**

Run:

```bash
/opt/homebrew/opt/postgresql@16/bin/psql 'postgresql://postgres@127.0.0.1:5432/mihirdalal' -f sql/seed_official_global_challenges.sql
/opt/homebrew/opt/postgresql@16/bin/psql 'postgresql://postgres@127.0.0.1:5432/mihirdalal' -f sql/seed_official_global_challenges.sql
```

Verify exactly one official user and exactly 50 active public official
challenges after both runs.

### Task 3: Frontend Global Classification and Query

**Files:**
- Create: `utils/globalChallenges.ts`
- Modify: `services/challengeService.ts`
- Modify: `hooks/useChallenges.ts`
- Modify: `app/(tabs)/global.tsx`
- Test: `scripts/test-global-challenges.mjs`

- [ ] **Step 1: Write the failing frontend utility/source regression check**

Add a Node test which loads `utils/globalChallenges.ts` and verifies:

```ts
assert.equal(isOfficialGlobalCreator('@ChallengeSphere'), true);
assert.equal(getGlobalChallengeSection(official, 'global'), true);
assert.equal(getGlobalChallengeSection(followed, 'following'), true);
assert.equal(getGlobalChallengeSection(other, 'others'), true);
assert.equal(getGlobalChallengeSection(official, 'following'), false);
```

It must also inspect `app/(tabs)/global.tsx` for filter rendering in the
sequence `all`, `global`, `following`, `others`.

- [ ] **Step 2: Run the check to verify RED**

Run: `node scripts/test-global-challenges.mjs`

Expected: failure because `utils/globalChallenges.ts` does not exist.

- [ ] **Step 3: Implement classification and official data fetch**

Create a focused utility exporting:

```ts
export type GlobalChallengeFilter = 'all' | 'global' | 'following' | 'others';
export const OFFICIAL_GLOBAL_USERNAME = 'challengesphere';
export const isOfficialGlobalCreator = (username: string) =>
  username.trim().replace(/^@/, '').toLowerCase() === OFFICIAL_GLOBAL_USERNAME;
export const matchesGlobalChallengeFilter = (...) => ...;
```

Add `challengeService.getPublicChallengesByCreator(...)` and
`useInfinitePublicChallengesByCreator(...)`. In the discovery screen resolve
`challengesphere` with `useUserByUsername`, load its public catalog, merge it
by id into default discovery content, and use the utility for non-overlapping
filter membership. Render tabs in the approved order and remove the
top-level `Trending` section.

- [ ] **Step 4: Run frontend verification to verify GREEN**

Run:

```bash
node scripts/test-global-challenges.mjs
npx tsc --noEmit
npm run lint
```

Expected: new regression check passes, TypeScript exits successfully, and
lint reports no new errors.

### Task 4: Full Verification

**Files:**
- Verify all changed files in both repositories.

- [ ] **Step 1: Run backend and database checks**

Run `./mvnw test` in `../challengesphere` and run a local SQL query confirming
one `challengesphere` account and 50 active public official challenges.

- [ ] **Step 2: Run frontend checks and graph refresh**

Run in the frontend repository:

```bash
node scripts/test-global-challenges.mjs
npx tsc --noEmit
npm run lint
graphify update .
git diff --check
```

Expected: behavior checks, compiler, lint, and whitespace validation succeed.
If graph visualization generation hits the known node-count limit after AST
processing, record that output rather than misreporting it as a code failure.
