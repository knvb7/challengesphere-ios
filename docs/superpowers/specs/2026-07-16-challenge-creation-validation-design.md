# Challenge Creation Validation Design

## Goal

Apply the same concise challenge-creation limits in the mobile form and Spring Boot API so invalid challenges are rejected before upload and cannot bypass validation through direct API calls.

## Validation Contract

- Title: required, trimmed, 5 to 80 characters.
- Description: required, trimmed, 20 to 500 characters.
- Rules: required, trimmed, 10 to 1,000 characters.
- Categories: 1 to 5 entries.
- Category names: trimmed, 2 to 30 characters, unique ignoring case, and must not contain commas.
- Rewards remain optional with the existing 1,000-character frontend limit.
- Existing duration, five-cover-photo, and twenty-invite limits remain unchanged.

## Frontend

Define named validation constants beside the challenge form. Use one validation function for step navigation and final submission so both paths return the same field-specific errors. Keep input `maxLength` values aligned with the contract, display compact character counters for title, description, and rules, prevent selection of more than five categories, and validate custom categories before adding them.

The create request will send the main description and rules as separate fields. It will continue sending rewards through `benefits`.

## Backend

Extend `ChallengeCreateRequest` with a `rules` field. Bean Validation enforces the title bounds and raw-payload safety limits. A focused service policy validates the parsed description, rules, and categories so both new and legacy request shapes receive the same field limits. Categories are parsed from the comma-separated request value so count, per-category length, comma safety, and case-insensitive uniqueness are checked consistently.

The service trims accepted text and builds the existing canonical stored description containing the main description, rules, and optional benefits. The database representation and challenge response format therefore remain compatible with existing detail and edit screens.

For backward compatibility during app rollout, the backend accepts an older combined description only when it contains the existing `Rules & Guidelines:` section. It parses and validates that section before canonicalizing storage. New clients always send separate fields.

## Error Handling

Invalid requests return HTTP 400 with a specific validation message. The frontend maps these errors to the relevant form field where local validation can identify it, and retains the existing general mutation error for server-side failures.

## Verification

No tests will be added or run, per request. Verification consists of TypeScript compilation, Maven compilation with tests skipped, and manual boundary checks of the shared limits.
