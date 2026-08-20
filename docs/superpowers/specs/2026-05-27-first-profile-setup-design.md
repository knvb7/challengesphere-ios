# First Profile Setup Walkthrough Design

## Purpose

Newly registered users should arrive in the app with enough identity to make their first contribution feel personal. After the existing introductory carousel, the app presents an optional one-time profile setup experience called **Claim your spot**.

## Approved Experience

- Applies to users created through email/password registration and users created by Google sign-in.
- Runs after the existing intro carousel, never in place of it.
- Shows once only for a newly created account.
- May be skipped immediately; returning users must not receive the prompt.
- Uses a borderline fun, borderline serious visual voice: dark canvas, warm gold and green accents, confident copy, and a polished live profile preview.

## Screen Content

- Badge: `Claim your spot`
- Title: `Your move, your story.`
- Supporting text: `You have an account. Now make it feel like yours before your first post lands.`
- Live preview: selected photo or current avatar, username, starter state, and the bio as it is written.
- Editable fields: profile photo and short bio only.
- Primary action: `Make it mine`
- Secondary action: `Skip for now`

## Flow

1. A new user signs up through credentials or signs in with Google for the first time.
2. Authentication returns an `isNewUser` signal.
3. The app records a per-user pending profile setup marker.
4. The existing intro carousel is completed first.
5. If profile setup is pending, the user enters `/profile-setup`; otherwise they enter challenges.
6. Saving updates the profile and clears the pending marker.
7. Skipping clears the pending marker without changing profile fields.
8. Relaunching while setup is pending returns the user to setup after intro has already been completed.

## Technical Contract

- Backend `AuthResponse` gains `isNewUser`.
- Registration responds with `isNewUser: true`.
- Google sign-in responds with `isNewUser: true` only when it creates a new database user, not when it links Google to an existing account.
- Frontend onboarding state stores profile setup pending status by authenticated user id.

## Failure Behavior

- Photo picker cancellation leaves state unchanged.
- Save failures keep setup pending and show a retryable alert.
- Skip is always available once the authenticated screen loads.

## Verification

- Frontend regression script covers pending marker routes and required screen copy/actions.
- Backend integration coverage verifies registration exposes the new-user signal.
- Lint/build checks cover changed UI and API types.
