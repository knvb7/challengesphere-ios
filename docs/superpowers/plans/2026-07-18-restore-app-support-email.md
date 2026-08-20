# Restore App Support Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore authenticated App Support so valid submissions send a detailed email to `ironside-dev@challengesphere.com` without persisting a support-ticket record.

**Architecture:** Re-enable the existing support endpoints and their secure screenshot-upload pipeline. `SupportServiceImpl` validates and formats the request, while `EmailService` exposes a recipient-locked support delivery method parallel to feature-request delivery; neither component creates a support repository or database entity.

**Tech Stack:** Java 17, Spring Boot, Spring Mail, JUnit 5, Mockito, React Native/Expo, TypeScript, Node assertion scripts.

## Global Constraints

- Support delivery always targets `ironside-dev@challengesphere.com`.
- No support-ticket entity, repository, table, migration, or history record may be added.
- The existing feature-request persistence and email contract must remain unchanged.
- Support accepts issue type, subject of 3–120 characters, message of 10–4000 characters, and at most three image screenshots.
- Email success is synchronous: disabled mail or SMTP failure must fail the API request.
- User-controlled email content must be HTML-escaped, and subject newlines must be removed.
- Raw support messages and signed screenshot URLs must not be logged.
- Existing unrelated working-tree changes in both repositories must remain untouched.

---

### Task 1: Add recipient-locked support email delivery

**Files:**
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/EmailService.java`
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/EmailServiceImpl.java`
- Test: `../challengesphere/src/test/java/com/ironside/challengesphere/service/impl/EmailServiceImplTest.java`

**Interfaces:**
- Consumes: configured `JavaMailSender`, `spring.mail.username`, and `app.mail.enabled`.
- Produces: `void sendSupportRequestEmail(String subject, String html) throws ChallengeSphereException`.

- [ ] **Step 1: Write the failing recipient and failure-contract tests**

Add a test that calls `sendSupportRequestEmail("Support request", "<p>Broken upload</p>")`, captures the `MimeMessage`, and asserts exactly one `TO` recipient with address `ironside-dev@challengesphere.com`, no CC/BCC, and one `mailSender.send(message)` call. Add a disabled-mail test:

```java
ReflectionTestUtils.setField(service, "mailEnabled", false);
ChallengeSphereException error = assertThrows(
        ChallengeSphereException.class,
        () -> service.sendSupportRequestEmail("Support request", "<p>Broken upload</p>")
);
assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
verify(mailSender, never()).send(any(MimeMessage.class));
```

- [ ] **Step 2: Run the focused test and confirm the missing method failure**

Run: `cd ../challengesphere && ./mvnw -Dtest=EmailServiceImplTest test`

Expected: compilation fails because `sendSupportRequestEmail` does not exist.

- [ ] **Step 3: Add the focused interface and implementation**

Add the interface method:

```java
void sendSupportRequestEmail(String subject, String html) throws ChallengeSphereException;
```

Use one fixed internal recipient for both inbound developer-mail methods and a private delivery helper:

```java
private static final String DEVELOPER_INBOX = "ironside-dev@challengesphere.com";

@Override
public void sendSupportRequestEmail(String subject, String html)
        throws ChallengeSphereException {
    sendDeveloperInboxEmail(subject, html, "support request");
}

@Override
public void sendFeatureRequestEmail(String subject, String html)
        throws ChallengeSphereException {
    sendDeveloperInboxEmail(subject, html, "feature request");
}
```

The private helper checks `mailEnabled`, sets `fromAddress`, `DEVELOPER_INBOX`, subject, and HTML body, then sends synchronously. It throws `SERVICE_UNAVAILABLE` when disabled and `BAD_GATEWAY` on `MessagingException` or `MailException`. It logs only the delivery kind, never subject or body.

- [ ] **Step 4: Run the mail tests**

Run: `cd ../challengesphere && ./mvnw -Dtest=EmailServiceImplTest test`

Expected: all `EmailServiceImplTest` tests pass.

- [ ] **Step 5: Commit the mail boundary**

```bash
cd ../challengesphere
git add src/main/java/com/ironside/challengesphere/service/EmailService.java \
  src/main/java/com/ironside/challengesphere/service/impl/EmailServiceImpl.java \
  src/test/java/com/ironside/challengesphere/service/impl/EmailServiceImplTest.java
git commit -m "feat: add support request email delivery"
```

### Task 2: Restore secure support submission and screenshot handling

**Files:**
- Modify: `../challengesphere/src/main/java/com/ironside/challengesphere/service/impl/SupportServiceImpl.java`
- Replace: `../challengesphere/src/test/java/com/ironside/challengesphere/service/impl/SupportServiceDisabledTest.java`

**Interfaces:**
- Consumes: `UserRepository`, `MediaUrlService`, `EmailService.sendSupportRequestEmail`, `UploadQuotaService`, `IssuedUploadService`, `RateLimitStore`, `ContentModerationService`, and `ModerationEnforcementService`.
- Produces: working `generatePresignedUrls(Long, GeneratePresignedUrlsRequest)` and `createTicket(Long, CreateSupportTicketRequest)` methods.

- [ ] **Step 1: Replace the disabled regression test with failing support behavior tests**

Construct `SupportServiceImpl` with mocks for all eight dependencies. For a valid no-screenshot request, configure `userRepository.findById(42L)` and an allowed daily `RateLimitStore.Decision`; assert `SupportTicketResponse.isSuccess()` and capture both arguments to `sendSupportRequestEmail`. Assert the subject is `[ChallengeSphere Support] Bug: Upload fails` and the HTML contains:

```text
ChallengeSphere Support Request
pranjal@example.com
The upload fails after reaching 100%.
1.0.0
android
Pixel 9
No screenshots attached.
```

Also assert the HTML escapes `<script>` in a submitted message and the captured subject contains no `\r` or `\n`.

For a screenshot request, use a key matching `support/user_42/screenshots/{13-digit timestamp}_{uuid}.png`; configure `mediaUrlService.objectExists(key)` as true, moderation as `new Result(Verdict.CLEAN, List.of())`, and `toReadableMediaUrl(key)` as a private URL. Assert the email contains both the link and object key and verify `issuedUploadService.consume(42L, List.of(key), SUPPORT_SCREENSHOT)`.

For presigned URLs, submit one JPEG `MediaFileInfo`, configure `userRepository.existsById(42L)` and `mediaUrlService.createUploadUrl(...)`, then assert the returned object key begins with `support/user_42/screenshots/` and verify the upload quota and issued-upload services.

- [ ] **Step 2: Run the support regression test and confirm HTTP 410 behavior**

Run: `cd ../challengesphere && ./mvnw -Dtest=SupportServiceDisabledTest test`

Expected: behavior tests fail because both methods currently throw `410 Gone` and the constructor has no dependencies.

- [ ] **Step 3: Restore the support implementation with no persistence dependency**

Restore the dependency-injected implementation and the following request flow:

```java
User user = userRepository.findById(userId).orElseThrow(() ->
        new ChallengeSphereException("User not found", HttpStatus.NOT_FOUND, logger));
reserveDailySupportTicket(userId);
List<String> screenshotKeys = normalizedScreenshotKeys(request);
issuedUploadService.consume(userId, screenshotKeys, IssuedUploadService.Purpose.SUPPORT_SCREENSHOT);
for (String key : screenshotKeys) {
    validateScreenshotKey(userId, key);
}
moderateSupportScreenshots(userId, screenshotKeys);
emailService.sendSupportRequestEmail(
        buildSupportEmailSubject(request),
        buildSupportEmailHtml(user, request, screenshotKeys)
);
return new SupportTicketResponse(true, "Support request sent");
```

Restore support-specific upload validation, a maximum of three images, user-scoped UUID keys, one-hour presigned upload expiry, upload quota reservation, issued-upload tickets, object-existence checks, strict screenshot moderation, and five support submissions per user per day.

The email body must include the authenticated user, issue, complete escaped message, app/device context, UTC submission timestamp, and private screenshot links. The service has no `SupportTicketRepository`, model, entity, or save call.

- [ ] **Step 4: Run the support service tests**

Run: `cd ../challengesphere && ./mvnw -Dtest=SupportServiceDisabledTest test`

Expected: all restored behavior, escaping, screenshot, and presigned-URL tests pass.

- [ ] **Step 5: Run the combined support and feature-request backend tests**

Run: `cd ../challengesphere && ./mvnw -Dtest=SupportServiceDisabledTest,EmailServiceImplTest,FeatureRequestServiceImplTest test`

Expected: all focused tests pass and feature-request behavior remains unchanged.

- [ ] **Step 6: Commit the support service restoration**

```bash
cd ../challengesphere
git add src/main/java/com/ironside/challengesphere/service/impl/SupportServiceImpl.java \
  src/test/java/com/ironside/challengesphere/service/impl/SupportServiceDisabledTest.java
git commit -m "fix: restore app support email submissions"
```

### Task 3: Align frontend regression coverage and verify end to end contracts

**Files:**
- Modify: `scripts/test-app-support.mjs`

**Interfaces:**
- Consumes: the existing App Support route, screen, service, hook, media upload service, and API types.
- Produces: a static regression check for the actual developer inbox and the unchanged support endpoints.

- [ ] **Step 1: Update the stale recipient assertion**

Replace the old `support@ironside.com` assertion with:

```javascript
assert.match(screen, /ironside-dev@challengesphere\.com/);
assert.doesNotMatch(screen, /support@ironside\.com/);
```

Keep assertions for `/support/presigned-urls`, `/support/tickets`, `uploadSupportScreenshots`, and the three-screenshot limit.

- [ ] **Step 2: Run the frontend support and feature-request checks**

Run: `npm run test:app-support && node ./scripts/test-feature-request.mjs`

Expected: both scripts print their pass messages and exit zero.

- [ ] **Step 3: Run static and backend verification**

Run: `npm run lint`

Expected: exit zero, or only pre-existing warnings documented in the handoff.

Run: `cd ../challengesphere && ./mvnw -Dtest=SupportServiceDisabledTest,EmailServiceImplTest,FeatureRequestServiceImplTest test`

Expected: all focused backend tests pass.

Run: `cd ../challengesphere && ./mvnw test`

Expected: the complete backend suite passes.

- [ ] **Step 4: Refresh the frontend knowledge graph**

Run: `graphify update .`

Expected: graph update completes. If the local graphify data is absent, record that fact without creating unrelated graph files.

- [ ] **Step 5: Review the final diff and commit the frontend test**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only the support test plus the user's pre-existing `app/settings.tsx` and `screens/Profile.tsx` edits are present.

```bash
git add scripts/test-app-support.mjs
git commit -m "test: align app support recipient coverage"
```
