# App Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an authenticated in-app App Support flow that lets users submit issues and screenshots to `ironside-dev@challengesphere.com`.

**Architecture:** The frontend adds a dedicated App Support route, local screenshot selection, direct S3 upload through a support presigned URL endpoint, and a ticket creation call. The backend adds authenticated support endpoints, support-scoped S3 object keys, validation, signed screenshot read links, and email delivery through the existing mail service.

**Tech Stack:** Expo Router, React Native, React Query, Axios, Spring Boot, Spring Security, Jakarta Validation, JavaMail, JUnit 5, Mockito.

---

## File Structure

- Create frontend route: `ChallengeSphere-Frontend/app/app-support.tsx`
- Create frontend screen: `ChallengeSphere-Frontend/screens/AppSupport.tsx`
- Create frontend API wrapper: `ChallengeSphere-Frontend/services/supportService.ts`
- Create frontend hook: `ChallengeSphere-Frontend/hooks/useSupport.ts`
- Modify frontend route links: `ChallengeSphere-Frontend/app/settings.tsx`, `ChallengeSphere-Frontend/screens/HelpCenter.tsx`
- Modify frontend media enum: `ChallengeSphere-Frontend/types/api.ts`
- Modify frontend upload service: `ChallengeSphere-Frontend/services/mediaService.ts`
- Create frontend regression script: `ChallengeSphere-Frontend/scripts/test-app-support.mjs`
- Modify frontend package script: `ChallengeSphere-Frontend/package.json`
- Modify backend media enum: `challengesphere/src/main/java/com/ironside/challengesphere/util/MediaTypes.java`
- Modify backend email service contract and implementation: `challengesphere/src/main/java/com/ironside/challengesphere/service/EmailService.java`, `challengesphere/src/main/java/com/ironside/challengesphere/service/impl/EmailServiceImpl.java`
- Create backend request/response DTOs: `challengesphere/src/main/java/com/ironside/challengesphere/api/request/CreateSupportTicketRequest.java`, `challengesphere/src/main/java/com/ironside/challengesphere/api/response/SupportTicketResponse.java`
- Create backend service: `challengesphere/src/main/java/com/ironside/challengesphere/service/SupportService.java`, `challengesphere/src/main/java/com/ironside/challengesphere/service/impl/SupportServiceImpl.java`
- Create backend controller: `challengesphere/src/main/java/com/ironside/challengesphere/controller/SupportController.java`
- Create backend tests: `challengesphere/src/test/java/com/ironside/challengesphere/service/impl/SupportServiceImplTest.java`

## Task 1: Backend Support Contract And Service

**Files:**
- Modify: `challengesphere/src/main/java/com/ironside/challengesphere/util/MediaTypes.java`
- Modify: `challengesphere/src/main/java/com/ironside/challengesphere/service/EmailService.java`
- Modify: `challengesphere/src/main/java/com/ironside/challengesphere/service/impl/EmailServiceImpl.java`
- Create: `challengesphere/src/main/java/com/ironside/challengesphere/api/request/CreateSupportTicketRequest.java`
- Create: `challengesphere/src/main/java/com/ironside/challengesphere/api/response/SupportTicketResponse.java`
- Create: `challengesphere/src/main/java/com/ironside/challengesphere/service/SupportService.java`
- Create: `challengesphere/src/main/java/com/ironside/challengesphere/service/impl/SupportServiceImpl.java`
- Test: `challengesphere/src/test/java/com/ironside/challengesphere/service/impl/SupportServiceImplTest.java`

- [x] **Step 1: Write service tests**

Create tests that verify support presigned URLs use `support/user_{id}/screenshots/`, video uploads are rejected, ticket submission sends to `ironside-dev@challengesphere.com`, and foreign support keys are rejected.

Run: `./mvnw -Dtest=SupportServiceImplTest test`

Expected before implementation: compilation fails because support classes do not exist.

- [x] **Step 2: Add support media enum**

Add `SUPPORT_SCREENSHOT` to `MediaTypes`.

- [x] **Step 3: Add email delivery contract**

Add `void sendHtmlEmail(String to, String subject, String html) throws ChallengeSphereException;` to `EmailService`. Implement it in `EmailServiceImpl` with real failure propagation when mail is disabled or SMTP fails.

- [x] **Step 4: Add request and response DTOs**

Create `CreateSupportTicketRequest` with `IssueType issueType`, `String subject`, `String message`, `String appVersion`, `String platform`, `String deviceInfo`, and `List<String> screenshotKeys`. Use Jakarta validation for subject length 3-120, message length 10-4000, and screenshot count max 3.

Create `SupportTicketResponse` with `boolean success` and `String message`.

- [x] **Step 5: Implement support service**

`SupportServiceImpl.generatePresignedUrls(Long userId, GeneratePresignedUrlsRequest request)` validates the authenticated user id, accepts only image content types with `SUPPORT_SCREENSHOT`, creates `support/user_{userId}/screenshots/{timestamp}_{uuid}.{ext}` keys, and signs PUT URLs through `MediaUrlService.createUploadUrl`.

`SupportServiceImpl.createTicket(Long userId, CreateSupportTicketRequest request)` loads the user, validates screenshot keys are support keys for that user, signs GET links through `MediaUrlService.signReadableUrl`, escapes user-provided text, and calls `emailService.sendHtmlEmail("ironside-dev@challengesphere.com", subject, html)`.

- [x] **Step 6: Verify service tests**

Run: `./mvnw -Dtest=SupportServiceImplTest test`

Expected after implementation: tests pass.

## Task 2: Backend Controller

**Files:**
- Create: `challengesphere/src/main/java/com/ironside/challengesphere/controller/SupportController.java`
- Test: `challengesphere/src/test/java/com/ironside/challengesphere/service/impl/SupportServiceImplTest.java`

- [x] **Step 1: Add controller endpoints**

Create authenticated endpoints:

```java
@PostMapping("/presigned-urls")
public ResponseEntity<PresignedUrlsResponse> generatePresignedUrls(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody GeneratePresignedUrlsRequest request
) throws ChallengeSphereException

@PostMapping("/tickets")
public ResponseEntity<SupportTicketResponse> createTicket(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateSupportTicketRequest request
) throws ChallengeSphereException
```

Both endpoints use `SecurityAccess.requireUserId(principal)` and do not trust client-supplied user ownership.

- [x] **Step 2: Verify backend compile**

Run: `./mvnw -DskipTests compile`

Expected: compile succeeds.

## Task 3: Frontend Service, Upload Support, And Screen

**Files:**
- Modify: `ChallengeSphere-Frontend/types/api.ts`
- Modify: `ChallengeSphere-Frontend/services/mediaService.ts`
- Create: `ChallengeSphere-Frontend/services/supportService.ts`
- Create: `ChallengeSphere-Frontend/hooks/useSupport.ts`
- Create: `ChallengeSphere-Frontend/screens/AppSupport.tsx`
- Create: `ChallengeSphere-Frontend/app/app-support.tsx`
- Modify: `ChallengeSphere-Frontend/app/settings.tsx`
- Modify: `ChallengeSphere-Frontend/screens/HelpCenter.tsx`

- [x] **Step 1: Add support API types**

Add `SUPPORT_SCREENSHOT` to frontend `MediaType`. Add `SupportIssueType`, `CreateSupportTicketRequest`, and `SupportTicketResponse`.

- [x] **Step 2: Add support upload method**

Add `uploadSupportScreenshots(userId, images, onProgress)` to `mediaService`. It calls `/support/presigned-urls`, uses `SUPPORT_SCREENSHOT`, accepts images only, uploads each image to its presigned URL, and returns object keys.

- [x] **Step 3: Add support service and hook**

`supportService.createSupportTicket(payload)` posts to `/support/tickets`.

`useCreateSupportTicket()` wraps it in a React Query mutation.

- [x] **Step 4: Add App Support screen**

Build `screens/AppSupport.tsx` with issue type chips, subject input, message input, max 3 screenshot previews, `MediaSourceChooser`, submit progress, validation alerts, and success state. Use `useAuthContext()` for the current user id. Preserve form content on upload or submit failure.

- [x] **Step 5: Add route and navigation**

Add `app/app-support.tsx`. Update Settings support section and Help Center Contact Support to navigate to `/app-support` instead of `mailto:`.

- [x] **Step 6: Verify TypeScript surface**

Run: `npx tsc --noEmit`

Expected: no support-related type errors.

## Task 4: Focused Frontend Regression Check

**Files:**
- Create: `ChallengeSphere-Frontend/scripts/test-app-support.mjs`
- Modify: `ChallengeSphere-Frontend/package.json`

- [x] **Step 1: Add static regression script**

Script assertions:

- `app/app-support.tsx` renders `screens/AppSupport`
- `screens/AppSupport.tsx` imports `MediaSourceChooser`
- support screen caps screenshots with `MAX_SCREENSHOTS = 3`
- support screen calls `uploadSupportScreenshots`
- support service posts to `/support/tickets`
- settings and help center route to `/app-support`

- [x] **Step 2: Add package script**

Add `"test:app-support": "node ./scripts/test-app-support.mjs"`.

- [x] **Step 3: Run focused frontend check**

Run: `npm run test:app-support`

Expected: script exits with status 0.

## Task 5: Final Verification

**Files:**
- `ChallengeSphere-Frontend/app/app-support.tsx`
- `ChallengeSphere-Frontend/screens/AppSupport.tsx`
- `ChallengeSphere-Frontend/services/supportService.ts`
- `ChallengeSphere-Frontend/hooks/useSupport.ts`
- `ChallengeSphere-Frontend/services/mediaService.ts`
- `ChallengeSphere-Frontend/types/api.ts`
- `ChallengeSphere-Frontend/app/settings.tsx`
- `ChallengeSphere-Frontend/screens/HelpCenter.tsx`
- `ChallengeSphere-Frontend/scripts/test-app-support.mjs`
- `ChallengeSphere-Frontend/package.json`
- `challengesphere/src/main/java/com/ironside/challengesphere/controller/SupportController.java`
- `challengesphere/src/main/java/com/ironside/challengesphere/service/SupportService.java`
- `challengesphere/src/main/java/com/ironside/challengesphere/service/impl/SupportServiceImpl.java`
- `challengesphere/src/main/java/com/ironside/challengesphere/service/EmailService.java`
- `challengesphere/src/main/java/com/ironside/challengesphere/service/impl/EmailServiceImpl.java`
- `challengesphere/src/main/java/com/ironside/challengesphere/api/request/CreateSupportTicketRequest.java`
- `challengesphere/src/main/java/com/ironside/challengesphere/api/response/SupportTicketResponse.java`
- `challengesphere/src/main/java/com/ironside/challengesphere/util/MediaTypes.java`
- `challengesphere/src/test/java/com/ironside/challengesphere/service/impl/SupportServiceImplTest.java`

- [x] **Step 1: Run backend support tests**

Run: `./mvnw -Dtest=SupportServiceImplTest test`

Expected: tests pass.

- [x] **Step 2: Run backend compile**

Run: `./mvnw -DskipTests compile`

Expected: compile succeeds.

- [x] **Step 3: Run frontend support script**

Run: `npm run test:app-support`

Expected: script exits with status 0.

- [x] **Step 4: Run frontend type check**

Run: `npx tsc --noEmit`

Expected: no new support-related type errors. If unrelated pre-existing type errors appear, record them with file paths and verify the support files are not among them.
