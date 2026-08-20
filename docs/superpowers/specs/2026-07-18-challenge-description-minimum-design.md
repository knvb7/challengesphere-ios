# Challenge Description Minimum Design

## Goal

Allow a new challenge to be created when its trimmed description contains at least 10 characters instead of the current 20-character minimum.

## Validation Contract

- A challenge description remains required.
- Its trimmed length must be between 10 and 500 characters, inclusive.
- All other challenge-creation validation remains unchanged.

## Implementation

Change the description minimum from 20 to 10 in the frontend validation constants and in the backend challenge-creation content policy. The create form will continue to use the frontend constant for immediate field validation, while the API will enforce the same boundary against direct requests. No UI layout, request shape, persistence, or database changes are needed.

## Error Handling

Descriptions shorter than 10 trimmed characters will retain the existing field-specific validation behavior, with the message updated to identify 10 characters as the minimum. Descriptions of 10 characters will be accepted.

## Verification

Per request, no tests will be added or run. Verification is limited to inspecting the final diff and confirming that the frontend and backend creation limits both use a 10-character description minimum and retain the 500-character maximum.
