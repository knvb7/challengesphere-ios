# Restore App Support Email Delivery

## Goal

Restore the authenticated App Support flow so every accepted submission sends a detailed email to `ironside-dev@challengesphere.com`. Support submissions are delivered by email only; they are not stored as support-ticket records in the database.

## Root Cause

The frontend still submits support forms to `POST /api/v1/support/tickets` and uploads optional screenshots through `POST /api/v1/support/presigned-urls`. Backend commit `6647f86` replaced both service methods with unconditional `410 Gone` responses as part of a feature-request-only email policy. Consequently, all App Support submissions fail before an email can be sent.

## Scope

This change restores the previously designed App Support behavior:

- signed-in users can submit an issue type, subject, message, and up to three screenshots;
- the backend sends one detailed HTML email to `ironside-dev@challengesphere.com`;
- the backend does not create a support-ticket entity, repository, table, or history record;
- feature-request persistence and delivery remain unchanged.

The authenticated user record may be read to populate account context in the email. Optional screenshots remain S3 objects so the email can contain private links, but the support submission itself is not persisted.

## Backend Design

Restore `SupportServiceImpl` as an email-delivery service rather than a database-backed ticket service. It will:

1. validate the authenticated user and request fields;
2. enforce the existing daily support-submission limit;
3. validate, consume, and safety-check any support screenshot upload references;
4. create private readable screenshot links;
5. build an escaped HTML email;
6. synchronously request email delivery;
7. return success only after the mail provider accepts the message.

Restore support presigned URL generation using the existing support-specific S3 key namespace and upload-security services. This keeps the current frontend screenshot workflow functional without routing image bytes through the API server.

Extend `EmailService` with a focused `sendSupportRequestEmail(subject, html)` operation. Like `sendFeatureRequestEmail`, it has a fixed recipient of `ironside-dev@challengesphere.com`, respects `app.mail.enabled`, and propagates delivery failures as API errors. The implementation may share a private mail-building/sending helper, but callers cannot choose an arbitrary recipient.

## Email Contract

The subject is:

`[ChallengeSphere Support] {issueType}: {subject}`

The HTML body includes:

- issue type and subject;
- the complete user-authored message with line breaks preserved;
- authenticated user id, username, and account email;
- app version, platform, and device information when supplied;
- submission timestamp;
- private links and object keys for up to three screenshots, or an explicit statement that none were attached.

All user-controlled values are HTML-escaped. Newlines are removed from the email subject to prevent header injection. Raw support messages and signed screenshot URLs are not written to application logs.

## Frontend Behavior

The existing App Support screen, API service, and mutation hook remain the client contract. On success, the form clears and confirms that the request was sent. On upload or mail failure, the draft remains available for retry and the UI displays the backend error. No `mailto:` fallback is introduced.

The stale `support@ironside.com` test expectation will be replaced with the actual recipient, `ironside-dev@challengesphere.com`.

## Error Handling And Security

- Missing authentication returns the existing authentication failure.
- Invalid issue type, subject, message, screenshot count, content type, or object reference is rejected before email delivery.
- Screenshot moderation remains fail-closed.
- Daily rate-limit infrastructure failures return service unavailable rather than bypassing spam protection.
- Disabled SMTP returns service unavailable.
- Mail-provider failures return a gateway error; the API must not report a false success.
- No support-ticket database write occurs before or after delivery.

## Testing

Backend tests will prove that:

- a valid support request sends exactly one message to `ironside-dev@challengesphere.com`;
- the email contains the issue, full message, user context, device context, timestamp, and screenshot links;
- support submission does not depend on or write through a ticket repository;
- malformed requests and unsafe screenshot references are rejected;
- mail-disabled and SMTP-failure cases propagate errors;
- support screenshot URLs retain their user-scoped key and security checks;
- feature-request email behavior still passes unchanged.

Frontend checks will prove that the screen still calls the support upload and ticket endpoints, displays the correct recipient, and retains the three-screenshot limit.

## Non-Goals

- support-ticket database persistence or migrations;
- an admin support dashboard;
- in-app support history or status tracking;
- two-way support messaging;
- changes to feature-request storage or response identifiers;
- deployment or live SMTP credential changes.
