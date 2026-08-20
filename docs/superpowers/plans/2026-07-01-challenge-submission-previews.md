# Challenge Submission Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reference-style recent-submission image previews to My Challenges, Global Challenges, profile challenge cards, and opened challenge details.

**Architecture:** A Spring Boot batch endpoint returns up to four privacy-filtered image-submission previews per challenge in one request. Expo uses one React Query request per challenge list (or one challenge detail), then passes normalized preview data into a reusable, fetch-free `ChallengeSubmissionPreview` component shared by cards and detail screens.

**Tech Stack:** Java 21, Spring Boot, Spring Data JPA/PostgreSQL, JUnit 5/Mockito, React Native/Expo, TypeScript, TanStack Query, Expo Router, `expo-image`.

---

## File structure

Backend (`../challengesphere`):

- Create `src/main/java/com/ironside/challengesphere/api/request/SubmissionPreviewsRequest.java`: validates up to 50 challenge IDs and an optional profile user ID.
- Create `src/main/java/com/ironside/challengesphere/api/response/SubmissionPreviewItemResponse.java`: one clickable image preview.
- Create `src/main/java/com/ironside/challengesphere/api/response/ChallengeSubmissionPreviewResponse.java`: preview items and total for one challenge.
- Create `src/main/java/com/ironside/challengesphere/repository/projection/SubmissionPreviewProjection.java`: native-query projection.
- Modify `src/main/java/com/ironside/challengesphere/repository/SubmissionRepository.java`: one window-function query for top four and totals.
- Modify `src/main/java/com/ironside/challengesphere/service/SubmissionService.java`: batch-preview contract.
- Modify `src/main/java/com/ironside/challengesphere/service/impl/SubmissionServiceImpl.java`: authorization, media signing, grouping.
- Modify `src/main/java/com/ironside/challengesphere/controller/SubmissionController.java`: authenticated `POST /api/v1/submissions/previews`.
- Create `src/test/java/com/ironside/challengesphere/service/impl/SubmissionPreviewServiceTest.java`: ordering, filtering, empty, and signing behavior.
- Create `src/test/java/com/ironside/challengesphere/controller/SubmissionPreviewControllerTest.java`: authenticated caller propagation.

Frontend:

- Modify `types/api.ts`: batch preview request/response types.
- Modify `services/challengeService.ts`: normalized batch-preview client method.
- Modify `hooks/useChallenges.ts`: stable preview query key, hook, and mutation invalidation.
- Create `components/common/ChallengeSubmissionPreview.tsx`: shared visual panel.
- Modify `components/common/ChallengeCard.tsx`: render the shared panel between header and metadata.
- Modify `app/(tabs)/challenges.tsx`: one preview query for My Challenges, navigation, and refresh.
- Modify `app/(tabs)/global.tsx`: one preview query for Global Challenges and shared panel insertion.
- Modify `app/user-profile.tsx`: profile-filtered preview query and profile scope propagation.
- Modify `components/common/ChallengeDetailsOverview.tsx`: full-width preview panel in opened challenges.
- Modify `app/challenge-details.tsx`: load preview data, keep optional profile scope, and navigate from preview images.
- Modify `app/global-challenge-details.tsx`: load and render preview data.
- Modify `app/challenge-submissions.tsx`: continue accepting `userId`, `username`, and `readOnly` route scope.
- Create `scripts/test-challenge-submission-previews.mjs`: frontend wiring and regression checks.
- Modify `package.json`: add `test:challenge-previews`.

### Task 1: Backend request/response contract

**Files:**

- Create: `../challengesphere/src/main/java/com/ironside/challengesphere/api/request/SubmissionPreviewsRequest.java`
- Create: `../challengesphere/src/main/java/com/ironside/challengesphere/api/response/SubmissionPreviewItemResponse.java`
- Create: `../challengesphere/src/main/java/com/ironside/challengesphere/api/response/ChallengeSubmissionPreviewResponse.java`
- Test: `../challengesphere/src/test/java/com/ironside/challengesphere/controller/SubmissionPreviewControllerTest.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/controller/SubmissionController.java`

- [ ] **Step 1: Write the failing controller test**

Create a controller test that injects a mocked `SubmissionService`, passes an authenticated `UserPrincipal`, and asserts that the principal's ID—not any client-supplied caller ID—is passed to the service:

```java
@Test
void previewsUseAuthenticatedViewer() throws Exception {
    SubmissionService service = mock(SubmissionService.class);
    SubmissionController controller = new SubmissionController();
    ReflectionTestUtils.setField(controller, "submissionService", service);
    SubmissionPreviewsRequest request = new SubmissionPreviewsRequest();
    request.setChallengeIds(List.of(8L, 5L, 8L));
    request.setUserId(22L);
    UserPrincipal principal = mock(UserPrincipal.class);
    when(principal.getId()).thenReturn(7L);
    when(service.getSubmissionPreviews(List.of(8L, 5L, 8L), 22L, 7L))
            .thenReturn(List.of());

    ResponseEntity<List<ChallengeSubmissionPreviewResponse>> response =
            controller.getSubmissionPreviews(principal, request);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    verify(service).getSubmissionPreviews(List.of(8L, 5L, 8L), 22L, 7L);
}
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
cd ../challengesphere
./mvnw -Dtest=SubmissionPreviewControllerTest test
```

Expected: compilation fails because the preview DTOs and controller method do not exist.

- [ ] **Step 3: Add the validated request and immutable response DTOs**

Use:

```java
@Data
public class SubmissionPreviewsRequest {
    @NotEmpty
    @Size(max = 50)
    private List<@NotNull @Positive Long> challengeIds;
    @Positive
    private Long userId;
}
```

```java
public record SubmissionPreviewItemResponse(
        Long submissionId,
        Long userId,
        String mediaUrl,
        Timestamp submissionTime
) {}
```

```java
public record ChallengeSubmissionPreviewResponse(
        Long challengeId,
        List<SubmissionPreviewItemResponse> submissions,
        long totalCount
) {}
```

- [ ] **Step 4: Add the authenticated controller method and service signature**

Add to `SubmissionService`:

```java
List<ChallengeSubmissionPreviewResponse> getSubmissionPreviews(
        List<Long> challengeIds,
        Long userId,
        Long callerId
) throws ChallengeSphereException;
```

Add before `/{submissionId}` in `SubmissionController`:

```java
@PostMapping("/previews")
public ResponseEntity<List<ChallengeSubmissionPreviewResponse>> getSubmissionPreviews(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody SubmissionPreviewsRequest request
) throws ChallengeSphereException {
    Long callerId = SecurityAccess.requireUserId(principal);
    return ResponseEntity.ok(submissionService.getSubmissionPreviews(
            request.getChallengeIds(),
            request.getUserId(),
            callerId
    ));
}
```

- [ ] **Step 5: Run the controller test**

Run:

```bash
./mvnw -Dtest=SubmissionPreviewControllerTest test
```

Expected: PASS.

- [ ] **Step 6: Commit the contract**

```bash
git add src/main/java/com/ironside/challengesphere/api/request/SubmissionPreviewsRequest.java \
  src/main/java/com/ironside/challengesphere/api/response/SubmissionPreviewItemResponse.java \
  src/main/java/com/ironside/challengesphere/api/response/ChallengeSubmissionPreviewResponse.java \
  src/main/java/com/ironside/challengesphere/controller/SubmissionController.java \
  src/main/java/com/ironside/challengesphere/service/SubmissionService.java \
  src/test/java/com/ironside/challengesphere/controller/SubmissionPreviewControllerTest.java
git commit -m "feat: add submission preview API contract"
```

### Task 2: Privacy-safe batch preview query and service

**Files:**

- Create: `../challengesphere/src/main/java/com/ironside/challengesphere/repository/projection/SubmissionPreviewProjection.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/repository/SubmissionRepository.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/SubmissionServiceImpl.java`
- Test: `../challengesphere/src/test/java/com/ironside/challengesphere/service/impl/SubmissionPreviewServiceTest.java`

- [ ] **Step 1: Write failing service tests**

Mock the projection query, `FollowRepository`, and `MediaUrlService`. Cover:

```java
@Test
void returnsRequestedChallengesIncludingEmptyOnes() throws Exception {
    when(repository.findSubmissionPreviews(List.of(5L, 8L), null, 7L))
            .thenReturn(List.of(row(
                    5L,
                    101L,
                    20L,
                    "a.jpg,b.jpg",
                    Timestamp.from(Instant.parse("2026-07-01T12:00:00Z")),
                    6L,
                    1L
            )));
    when(mediaUrlService.toReadableMediaUrl("a.jpg")).thenReturn("signed-a");

    List<ChallengeSubmissionPreviewResponse> result =
            service.getSubmissionPreviews(List.of(8L, 5L, 8L), null, 7L);

    assertEquals(List.of(5L, 8L), result.stream().map(ChallengeSubmissionPreviewResponse::challengeId).toList());
    assertEquals("signed-a", result.get(0).submissions().get(0).mediaUrl());
    assertEquals(6L, result.get(0).totalCount());
    assertTrue(result.get(1).submissions().isEmpty());
}

@Test
void profileScopeRequiresNormalFollowAccess() {
    when(followRepository.existsActiveMutualFollow(7L, 22L)).thenReturn(false);
    assertThrows(ChallengeSphereException.class,
            () -> service.getSubmissionPreviews(List.of(5L), 22L, 7L));
    verifyNoInteractions(repository);
}
```

Define the test projection helper explicitly:

```java
private SubmissionPreviewProjection row(
        Long challengeId,
        Long submissionId,
        Long userId,
        String mediaUrls,
        Timestamp submissionTime,
        Long totalCount,
        Long rowNumber
) {
    SubmissionPreviewProjection row = mock(SubmissionPreviewProjection.class);
    when(row.getChallengeId()).thenReturn(challengeId);
    when(row.getSubmissionId()).thenReturn(submissionId);
    when(row.getUserId()).thenReturn(userId);
    when(row.getMediaUrls()).thenReturn(mediaUrls);
    when(row.getSubmissionTime()).thenReturn(submissionTime);
    when(row.getTotalCount()).thenReturn(totalCount);
    when(row.getRowNumber()).thenReturn(rowNumber);
    return row;
}
```

Also assert duplicate IDs are removed, IDs are sorted, only the first image media URL is signed, and no more than four items are emitted per challenge.

- [ ] **Step 2: Run the service test and confirm it fails**

Run:

```bash
./mvnw -Dtest=SubmissionPreviewServiceTest test
```

Expected: compilation fails because the projection, query, and service implementation are absent.

- [ ] **Step 3: Add the projection and one PostgreSQL window query**

Create:

```java
public interface SubmissionPreviewProjection {
    Long getChallengeId();
    Long getSubmissionId();
    Long getUserId();
    String getMediaUrls();
    Timestamp getSubmissionTime();
    Long getTotalCount();
    Long getRowNumber();
}
```

Add a native CTE to `SubmissionRepository`:

```java
@Query(value = """
        WITH visible AS (
          SELECT s.challenge_id,
                 s.id AS submission_id,
                 s.user_id,
                 s.media_urls,
                 s.submission_time,
                 COUNT(*) OVER (PARTITION BY s.challenge_id) AS total_count,
                 ROW_NUMBER() OVER (
                   PARTITION BY s.challenge_id
                   ORDER BY s.submission_time DESC, s.id DESC
                 ) AS row_number
          FROM challengesphere.submissions s
          JOIN challengesphere.challenges c ON c.id = s.challenge_id
          WHERE s.challenge_id IN (:challengeIds)
            AND s.active = true
            AND c.active = true
            AND NULLIF(BTRIM(s.media_urls), '') IS NOT NULL
            AND s.media_urls ~* '\\.(jpe?g|png|webp|heic|heif)(\\?|,|$)'
            AND (CAST(:profileUserId AS BIGINT) IS NULL OR s.user_id = :profileUserId)
            AND (
              s.user_id = :viewerId OR (
                NOT EXISTS (
                  SELECT 1 FROM challengesphere.user_blocks ub
                  WHERE ub.active = true
                    AND ((ub.blocker_user_id = :viewerId AND ub.blocked_user_id = s.user_id)
                      OR (ub.blocker_user_id = s.user_id AND ub.blocked_user_id = :viewerId))
                )
                AND (
                  (c.private = false AND s.is_private = false)
                  OR EXISTS (
                    SELECT 1 FROM challengesphere.user_challenges uc
                    WHERE uc.challenge_id = s.challenge_id
                      AND uc.user_id = :viewerId
                      AND uc.active = true
                  )
                )
              )
            )
        )
        SELECT challenge_id AS challengeId,
               submission_id AS submissionId,
               user_id AS userId,
               media_urls AS mediaUrls,
               submission_time AS submissionTime,
               total_count AS totalCount,
               row_number AS rowNumber
        FROM visible
        WHERE row_number <= 4
        ORDER BY challenge_id ASC, row_number ASC
        """, nativeQuery = true)
List<SubmissionPreviewProjection> findSubmissionPreviews(
        @Param("challengeIds") List<Long> challengeIds,
        @Param("profileUserId") Long profileUserId,
        @Param("viewerId") Long viewerId
);
```

- [ ] **Step 4: Implement deterministic grouping and profile authorization**

Implement `getSubmissionPreviews` as:

```java
List<Long> ids = challengeIds == null ? List.of() : challengeIds.stream()
        .filter(Objects::nonNull)
        .distinct()
        .sorted()
        .limit(50)
        .toList();
if (ids.isEmpty()) return List.of();
if (userId != null) ensureFollowAccess(userId, callerId, "submissions");

Map<Long, List<SubmissionPreviewItemResponse>> items = new LinkedHashMap<>();
Map<Long, Long> totals = new HashMap<>();
ids.forEach(id -> items.put(id, new ArrayList<>()));
for (SubmissionPreviewProjection row :
        submissionRepository.findSubmissionPreviews(ids, userId, callerId)) {
    String firstMedia = mediaUrlService.toReadableMediaUrlList(row.getMediaUrls())
            .stream()
            .filter(this::isImageMediaUrl)
            .findFirst()
            .orElse(null);
    if (firstMedia == null) continue;
    items.get(row.getChallengeId()).add(new SubmissionPreviewItemResponse(
            row.getSubmissionId(),
            row.getUserId(),
            firstMedia,
            row.getSubmissionTime()
    ));
    totals.put(row.getChallengeId(), row.getTotalCount());
}
return ids.stream()
        .map(id -> new ChallengeSubmissionPreviewResponse(
                id,
                List.copyOf(items.get(id)),
                totals.getOrDefault(id, 0L)
        ))
        .toList();
```

Add the image predicate used above:

```java
private boolean isImageMediaUrl(String value) {
    if (value == null || value.isBlank()) return false;
    String path = value.split("\\?", 2)[0].toLowerCase(Locale.ROOT);
    return path.endsWith(".jpg")
            || path.endsWith(".jpeg")
            || path.endsWith(".png")
            || path.endsWith(".webp")
            || path.endsWith(".heic")
            || path.endsWith(".heif");
}
```

- [ ] **Step 5: Run focused and full backend tests**

Run:

```bash
./mvnw -Dtest=SubmissionPreviewServiceTest,SubmissionPreviewControllerTest test
./mvnw test
```

Expected: both focused tests and the full suite pass.

- [ ] **Step 6: Commit backend behavior**

```bash
git add src/main/java/com/ironside/challengesphere/repository/projection/SubmissionPreviewProjection.java \
  src/main/java/com/ironside/challengesphere/repository/SubmissionRepository.java \
  src/main/java/com/ironside/challengesphere/service/impl/SubmissionServiceImpl.java \
  src/test/java/com/ironside/challengesphere/service/impl/SubmissionPreviewServiceTest.java
git commit -m "feat: return privacy-safe challenge submission previews"
```

### Task 3: Frontend batch data layer

**Files:**

- Modify: `types/api.ts`
- Modify: `services/challengeService.ts`
- Modify: `hooks/useChallenges.ts`
- Create: `scripts/test-challenge-submission-previews.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add a failing frontend regression script**

Create a Node assertion script that requires the preview types, endpoint, stable query key, normalized IDs, and mutation invalidation:

```js
const types = read('types/api.ts');
assert.match(types, /interface SubmissionPreviewItem/);
assert.match(types, /interface ChallengeSubmissionPreview/);
assert.match(types, /interface SubmissionPreviewsRequest/);

const service = read('services/challengeService.ts');
assert.match(service, /post<ChallengeSubmissionPreview\\[]>\\('\\/submissions\\/previews'/);
assert.match(service, /getSubmissionPreviews/);

const hooks = read('hooks/useChallenges.ts');
assert.match(hooks, /submissionPreviews:/);
assert.match(hooks, /useSubmissionPreviews/);
assert.match(hooks, /invalidateQueries\\(\\{ queryKey: challengeKeys\\.submissionPreviewsRoot\\(\\)/);
```

Add `"test:challenge-previews": "node ./scripts/test-challenge-submission-previews.mjs"` to `package.json`.

- [ ] **Step 2: Run the script and confirm it fails**

Run:

```bash
npm run test:challenge-previews
```

Expected: FAIL on the first missing preview type.

- [ ] **Step 3: Add frontend types and the service method**

Add:

```ts
export interface SubmissionPreviewItem {
  submissionId: number;
  userId: number;
  mediaUrl: string;
  submissionTime: string;
}

export interface ChallengeSubmissionPreview {
  challengeId: number;
  submissions: SubmissionPreviewItem[];
  totalCount: number;
}

export interface SubmissionPreviewsRequest {
  challengeIds: number[];
  userId?: number;
}
```

Add to `ChallengeService`:

```ts
async getSubmissionPreviews(
  challengeIds: number[],
  userId?: number,
): Promise<ChallengeSubmissionPreview[]> {
  const normalizedIds = [...new Set(challengeIds)]
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);
  if (!normalizedIds.length) return [];
  const response = await apiClient.post<ChallengeSubmissionPreview[]>(
    '/submissions/previews',
    { challengeIds: normalizedIds, ...(userId ? { userId } : {}) },
  );
  return Array.isArray(response.data) ? response.data : [];
}
```

- [ ] **Step 4: Add a stable React Query hook and invalidation**

Add keys:

```ts
submissionPreviewsRoot: () => [...challengeKeys.submissions(), 'previews'] as const,
submissionPreviews: (challengeIds: number[], userId?: number) => [
  ...challengeKeys.submissionPreviewsRoot(),
  [...new Set(challengeIds)].sort((a, b) => a - b),
  userId || 0,
] as const,
```

Add:

```ts
export const useSubmissionPreviews = (
  challengeIds: number[],
  userId?: number,
  enabled = true,
) => {
  const ids = [...new Set(challengeIds)]
    .filter((id) => id > 0)
    .sort((a, b) => a - b);
  return useQuery({
    queryKey: challengeKeys.submissionPreviews(ids, userId),
    queryFn: () => challengeService.getSubmissionPreviews(ids, userId),
    enabled: enabled && ids.length > 0,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
};
```

Invalidate `challengeKeys.submissionPreviewsRoot()` after create, reupload, and delete submission success.

- [ ] **Step 5: Run tests and type-check**

Run:

```bash
npm run test:challenge-previews
npx tsc --noEmit
```

Expected: the regression script passes and TypeScript reports no new errors.

- [ ] **Step 6: Commit the data layer**

```bash
git add types/api.ts services/challengeService.ts hooks/useChallenges.ts \
  scripts/test-challenge-submission-previews.mjs package.json
git commit -m "feat: add challenge preview data hook"
```

### Task 4: Shared reference-style preview panel

**Files:**

- Create: `components/common/ChallengeSubmissionPreview.tsx`
- Modify: `scripts/test-challenge-submission-previews.mjs`

- [ ] **Step 1: Extend the failing script for the visual contract**

Assert that the component:

```js
const preview = read('components/common/ChallengeSubmissionPreview.tsx');
assert.match(preview, /No recent submissions yet\\./);
assert.match(preview, /Be the first one to submit!/);
assert.match(preview, /User submissions/);
assert.match(preview, /totalCount - submissions\\.length/);
assert.match(preview, /createCachedRemoteImageSource/);
assert.match(preview, /onSubmissionPress/);
assert.match(preview, /onViewAll/);
```

- [ ] **Step 2: Run the script and confirm it fails**

Run `npm run test:challenge-previews`.

Expected: FAIL because `ChallengeSubmissionPreview.tsx` does not exist.

- [ ] **Step 3: Implement the fetch-free shared component**

Use this public interface:

```ts
interface ChallengeSubmissionPreviewProps {
  preview?: ChallengeSubmissionPreview;
  loading?: boolean;
  profileMode?: boolean;
  profileUsername?: string;
  onSubmissionPress?: (submission: SubmissionPreviewItem) => void;
  onViewAll?: () => void;
  compact?: boolean;
}
```

Track failed image IDs in local state and remove them from the rendered thumbnail list in `onError`, so one inaccessible media URL does not break the row. Render a bordered `View`, camera/title row, optional `View all`, and:

```tsx
{loading ? (
  <View style={styles.thumbnailRow}>
    {[0, 1, 2, 3].map((index) => <View key={index} style={styles.skeleton} />)}
  </View>
) : submissions.length ? (
  <View style={styles.thumbnailRow}>
    {submissions.slice(0, 4).map((submission, index) => {
      const hiddenCount = Math.max(0, totalCount - submissions.length);
      const showOverflow = index === 3 && hiddenCount > 0;
      return (
        <TouchableOpacity
          key={submission.submissionId}
          style={styles.thumbnailButton}
          onPress={() => onSubmissionPress?.(submission)}
        >
          <ExpoImage
            source={createCachedRemoteImageSource(submission.mediaUrl)}
            style={styles.thumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setFailedSubmissionIds((current) => (
              current.includes(submission.submissionId)
                ? current
                : [...current, submission.submissionId]
            ))}
          />
          {showOverflow && (
            <View style={styles.overflowOverlay}>
              <Text style={styles.overflowText}>+{hiddenCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
) : (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>
      {profileMode ? `No submissions from ${profileUsername || 'this user'} yet.` : 'No recent submissions yet.'}
    </Text>
    {!profileMode && <Text style={styles.emptySubtitle}>Be the first one to submit!</Text>}
  </View>
)}
```

Use `flex: 1`, `aspectRatio: 1`, 10–12px gaps, 14px thumbnail radius, dark translucent fills, `#9b7cff` accents, and a stable minimum height.

- [ ] **Step 4: Run the frontend regression and type-check**

Run:

```bash
npm run test:challenge-previews
npx tsc --noEmit
```

Expected: PASS with no new TypeScript errors.

- [ ] **Step 5: Commit the shared component**

```bash
git add components/common/ChallengeSubmissionPreview.tsx scripts/test-challenge-submission-previews.mjs
git commit -m "feat: add reusable submission preview panel"
```

### Task 5: My, Global, and profile challenge cards

**Files:**

- Modify: `components/common/ChallengeCard.tsx`
- Modify: `app/(tabs)/challenges.tsx`
- Modify: `app/(tabs)/global.tsx`
- Modify: `app/user-profile.tsx`
- Modify: `scripts/test-challenge-submission-previews.mjs`

- [ ] **Step 1: Extend the failing integration assertions**

Require every named screen to import/use the hook and preview panel, and require profile navigation to include `previewUserId`:

```js
for (const screen of [
  'app/(tabs)/challenges.tsx',
  'app/(tabs)/global.tsx',
  'app/user-profile.tsx',
]) {
  assert.match(read(screen), /useSubmissionPreviews/);
}
assert.match(read('components/common/ChallengeCard.tsx'), /ChallengeSubmissionPreview/);
assert.match(read('app/user-profile.tsx'), /previewUserId/);
```

- [ ] **Step 2: Run the script and confirm it fails**

Run `npm run test:challenge-previews`.

Expected: FAIL because card and screen integration is absent.

- [ ] **Step 3: Add preview props to `ChallengeCard`**

Add:

```ts
preview?: ChallengeSubmissionPreview;
previewLoading?: boolean;
profilePreview?: boolean;
profileUsername?: string;
onPreviewSubmissionPress?: (submission: SubmissionPreviewItem) => void;
onPreviewViewAll?: () => void;
```

Render `ChallengeSubmissionPreview` after the summary/header content and before `metadataGrid`. Stop event propagation in preview actions so tapping an image does not also open the card.

- [ ] **Step 4: Batch-load My Challenges previews**

Derive `visibleChallengeIds` from the currently filtered mapped challenges, call:

```ts
const {
  data: previewRows = [],
  isLoading: previewsLoading,
  refetch: refetchPreviews,
} = useSubmissionPreviews(visibleChallengeIds);
const previewsByChallengeId = useMemo(
  () => new Map(previewRows.map((row) => [String(row.challengeId), row])),
  [previewRows],
);
```

Pass the matching preview to each card. `onPreviewSubmissionPress` routes to `/photo-details` with `buildSubmissionDetailRouteParams`. `onPreviewViewAll` routes to `/global-submissions` for challenge-wide recent submissions. Add `refetchPreviews()` to pull-to-refresh.

- [ ] **Step 5: Batch-load Global previews**

Derive IDs from the `FlatList` data, call `useSubmissionPreviews`, place `ChallengeSubmissionPreview` in the custom global card between `cardSignalRow` and `globalMetaGrid`, and wire image/View All navigation identically. Preserve creator follow and join button event handling.

- [ ] **Step 6: Batch-load profile-filtered previews and carry scope**

Call:

```ts
const profileChallengeIds = combinedChallenges.map((challenge) => Number(challenge.id)).filter(Boolean);
const { data: profilePreviewRows = [], isLoading: profilePreviewsLoading } =
  useSubmissionPreviews(profileChallengeIds, profileUserId, canViewProfileDetails);
```

Pass `profilePreview`, `profileUsername`, and callbacks to `ChallengeCard`. Card press must include:

```ts
previewUserId: String(profileUserId),
previewUsername: userData?.username || username,
```

`View all` routes to `/challenge-submissions` with:

```ts
{
  challengeId: mappedChallenge.id,
  userId: String(profileUserId),
  username: userData?.username || username,
  readOnly: 'true',
}
```

- [ ] **Step 7: Run frontend checks**

Run:

```bash
npm run test:challenge-previews
npx tsc --noEmit
npm run lint
```

Expected: preview checks pass; no new type or lint errors.

- [ ] **Step 8: Commit list-card integration**

```bash
git add components/common/ChallengeCard.tsx 'app/(tabs)/challenges.tsx' \
  'app/(tabs)/global.tsx' app/user-profile.tsx \
  scripts/test-challenge-submission-previews.mjs
git commit -m "feat: show submissions on challenge cards"
```

### Task 6: Show previews inside opened challenges

**Files:**

- Modify: `components/common/ChallengeDetailsOverview.tsx`
- Modify: `app/challenge-details.tsx`
- Modify: `app/global-challenge-details.tsx`
- Modify: `scripts/test-challenge-submission-previews.mjs`

- [ ] **Step 1: Add failing detail-screen assertions**

```js
const overview = read('components/common/ChallengeDetailsOverview.tsx');
assert.match(overview, /ChallengeSubmissionPreview/);
assert.match(overview, /submissionPreview/);

for (const detail of ['app/challenge-details.tsx', 'app/global-challenge-details.tsx']) {
  const source = read(detail);
  assert.match(source, /useSubmissionPreviews/);
  assert.match(source, /submissionPreview=/);
  assert.match(source, /refetchPreviews/);
}
assert.match(read('app/challenge-details.tsx'), /previewUserId/);
```

- [ ] **Step 2: Run the script and confirm it fails**

Run `npm run test:challenge-previews`.

Expected: FAIL on missing detail-preview wiring.

- [ ] **Step 3: Extend the shared overview**

Add props:

```ts
submissionPreview?: ChallengeSubmissionPreview;
submissionPreviewLoading?: boolean;
submissionPreviewProfileMode?: boolean;
submissionPreviewUsername?: string;
onSubmissionPreviewPress?: (submission: SubmissionPreviewItem) => void;
onSubmissionPreviewViewAll?: () => void;
```

Render `ChallengeSubmissionPreview` after description and before `summaryGrid`, using `compact={false}`.

- [ ] **Step 4: Add preview data and profile scope to regular details**

Read:

```ts
const previewUserId = Number(params.previewUserId) || undefined;
const previewUsername = (params.previewUsername as string | undefined)?.replace(/^@/, '');
const {
  data: previewRows = [],
  isLoading: previewLoading,
  refetch: refetchPreviews,
} = useSubmissionPreviews([challengeId], previewUserId);
const submissionPreview = previewRows[0];
```

Pass the preview props to `ChallengeDetailsOverview`. Thumbnail presses open `/photo-details`; View All opens `/challenge-submissions` when scoped to a profile, otherwise `/global-submissions`. Include `refetchPreviews()` in `onRefresh`.

- [ ] **Step 5: Add challenge-wide preview data to global details**

Call `useSubmissionPreviews([challengeId])`, pass it to `ChallengeDetailsOverview`, route thumbnails to `/photo-details`, route View All to existing `openGlobalSubmissions`, and refresh previews during pull-to-refresh.

- [ ] **Step 6: Run frontend checks**

Run:

```bash
npm run test:challenge-previews
npx tsc --noEmit
npm run lint
```

Expected: preview checks pass and no new TypeScript/lint errors are introduced.

- [ ] **Step 7: Commit opened-challenge integration**

```bash
git add components/common/ChallengeDetailsOverview.tsx app/challenge-details.tsx \
  app/global-challenge-details.tsx scripts/test-challenge-submission-previews.mjs
git commit -m "feat: show submission images in challenge details"
```

### Task 7: End-to-end verification and visual polish

**Files:**

- Modify as required by verification findings only.

- [ ] **Step 1: Run all targeted automated checks**

```bash
cd ../challengesphere
./mvnw test
cd ../ChallengeSphere-Frontend
npm run test:challenge-previews
npx tsc --noEmit
npm run lint
```

Expected: all commands pass, or only clearly documented pre-existing frontend diagnostics remain with no changed-file errors.

- [ ] **Step 2: Start the app and inspect all required surfaces**

Run:

```bash
npx expo start --web
```

Verify at mobile width:

- My Challenges: 0, 1, 4, and more-than-4 image states.
- Global Challenges: same row and overflow behavior.
- Profile Challenges: only the profile user's submissions.
- Regular details: images appear after opening a card.
- Profile-origin details: user filter persists.
- Global details: challenge-wide images appear.
- Thumbnail and View All navigation target the correct submission scope.
- Pull-to-refresh refreshes previews.

- [ ] **Step 3: Compare against the supplied reference**

Inspect the supplied image at:

```text
/Users/pranjaldalal/Downloads/ChatGPT Image Jul 1, 2026, 06_14_25 PM.png
```

Adjust only spacing, thumbnail radius, border color, typography, and overflow treatment needed for a close match. Re-run Step 1 after every code adjustment.

- [ ] **Step 4: Review the final diff for scope and secrets**

```bash
git diff --check
git status --short
git diff --stat
git diff -- \
  components/common/ChallengeSubmissionPreview.tsx \
  components/common/ChallengeCard.tsx \
  components/common/ChallengeDetailsOverview.tsx \
  'app/(tabs)/challenges.tsx' \
  'app/(tabs)/global.tsx' \
  app/user-profile.tsx \
  app/challenge-details.tsx \
  app/global-challenge-details.tsx
```

Expected: no whitespace errors, unrelated user changes are preserved, and no credentials or generated build artifacts are added.

- [ ] **Step 5: Commit verification fixes**

If verification required changes, stage the exact preview files reported by `git status`, for example:

```bash
git add components/common/ChallengeSubmissionPreview.tsx \
  components/common/ChallengeCard.tsx \
  components/common/ChallengeDetailsOverview.tsx
git commit -m "fix: polish challenge submission previews"
```

If no changes were required, do not create an empty commit.
