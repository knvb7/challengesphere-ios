# Authenticated Compact Typography Design

## Goal

Increase visible content density in the signed-in app experience by making text slightly smaller while retaining comfortable legibility for routine use.

## Scope

Apply the compact typography pass to authenticated tabs, signed-in destination screens, and shared components rendered in those experiences. This includes feed, challenge lists and detail flows, create and edit flows, submission views, profiles, followers, notifications, leaderboard, settings, help/about/privacy/change-password routes reachable from signed-in settings, and shared signed-in cards, inputs, buttons, statistics, comment, glory, and header components.

Do not change login, signup, or onboarding typography. Do not resize icons, photos, tab icons, or oversized decorative/celebration display elements solely for this request.

## Selected Direction

The approved option is **Balanced compact**:

- Decrease ordinary text styles by `1px`.
- Preserve any text already `11px` or smaller to maintain legibility.
- Adjust explicit `lineHeight` values only where needed to match reduced body text and gain vertical space without clipping.
- Leave spacing and component architecture unchanged unless a smaller line height requires a narrowly paired adjustment.

## Implementation

The app currently defines typography directly in local `StyleSheet` declarations across screens and shared components, rather than through a centralized signed-in theme token. For this pass, modify scoped existing style declarations in place. Introducing a new global typography abstraction would broaden risk and could unintentionally affect excluded screens.

Inline `fontSize` declarations in authenticated screens count as part of the same pass. Files with existing unrelated edits must retain those changes while updating only typography values relevant to this request.

## Verification

Add focused source-based regression assertions establishing:

- Representative authenticated surfaces use the balanced compact scale.
- Text values already at the small-label floor are not reduced below `11px`.
- `app/login.tsx`, `app/signup.tsx`, and `app/onboarding.tsx` are not modified as part of this change.

Run the typography regression test, TypeScript validation, and lint. Existing unrelated test or lint failures should be reported separately rather than repaired as part of this typography task.
