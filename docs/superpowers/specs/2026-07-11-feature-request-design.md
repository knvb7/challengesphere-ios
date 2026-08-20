# Feature Request Design

## Goal

Give authenticated users a fast, dedicated way to suggest product features from Settings. Requests must be stored in PostgreSQL with enough context for future review while keeping the user-entered request concise.

## User Experience

Settings will contain a new standalone section named **Feature Request**. It will not be grouped under Help & Legal. The section contains one row:

- **Request a Feature**
- Subtitle: **Share an idea that would improve ChallengeSphere**
- Icon: a lightbulb or sparkles icon consistent with the current Settings design

Selecting the row opens a dedicated authenticated route at `/feature-request`.

The screen contains:

1. A short introduction explaining that ideas are reviewed for future releases.
2. A single-select category control with `Challenges`, `Community`, `Progress & Stats`, `App Experience`, and `Other`.
3. One multiline request field prompting: **What should we add, and how would it help?**
4. A live character counter and client-side validation requiring 10–300 trimmed characters.
5. A primary submit button with disabled and loading states.
6. An inline success state showing that the request was received, with options to return to Settings or submit another idea.

No screenshots, title field, voting, request history, or admin UI are included in this version.

## Data Model

Create a Flyway migration for a `feature_requests` PostgreSQL table with:

- `id BIGSERIAL PRIMARY KEY`
- `user_id BIGINT NOT NULL` referencing `users(id)`
- `category VARCHAR(40) NOT NULL`
- `message VARCHAR(300) NOT NULL`
- `app_version VARCHAR(80)`
- `platform VARCHAR(80)`
- `device_info VARCHAR(200)`
- `status VARCHAR(30) NOT NULL DEFAULT 'NEW'`
- `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`

Database constraints will restrict categories to the supported values, message length to 10–300 characters after trimming, and status to `NEW`, `REVIEWING`, `PLANNED`, `DECLINED`, or `COMPLETED`. Add indexes on `user_id`, `status`, and `created_at` for future review queries.

## Backend

Add `POST /api/v1/support/feature-requests`.

The request body contains `category`, `message`, `appVersion`, `platform`, and `deviceInfo`. The controller derives `user_id` exclusively from the authenticated JWT principal and never accepts ownership from the client.

Validation is enforced at three layers:

- Bean validation on the request DTO.
- Service-level trimming, enum validation, and length checks.
- SQL constraints on persisted data.

The service stores the request through a dedicated repository and returns `id`, `status`, `createdAt`, and a success message. Submission is rate-limited separately from support tickets to reduce spam. A failure leaves the frontend draft intact so the user can retry.

## Frontend Data Flow

Add feature-request request/response types, a method on the support service, and a focused React Query mutation hook. The screen automatically supplies app version, platform, and available device information; the user only chooses a category and writes the request.

On success, the form is cleared only after the API confirms persistence. On validation or network failure, the entered text and category remain unchanged and a user-friendly error is shown.

## Security and Privacy

- Authentication is mandatory.
- User identity comes from the JWT principal.
- The endpoint exposes no list or read API to ordinary users.
- Input is bounded and stored as plain text; it is never rendered as HTML.
- Rate limits apply per authenticated user and client IP.
- Logs include request identifiers and user IDs but never the feature-request message.

## Verification

Backend coverage will verify authenticated ownership, valid persistence, category validation, trimmed 10–300 character boundaries, rejection of oversized input, and rate limiting. Frontend coverage will verify the standalone Settings section, route wiring, category selection, counter, client validation, loading/success behavior, and API payload. TypeScript compilation and focused regression checks must pass.

