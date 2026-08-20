# Bottom Tab Responsiveness Design

## Problem

Bottom navigation taps can feel delayed or appear not to register. The regression began when the tab navigator was changed to eagerly mount every tab. The Challenges, Global, Create, Feed, and Profile screens contain substantial render work and multiple data hooks, so mounting them together can keep the JavaScript thread busy while it is also expected to process taps and navigation state changes.

The project also has a `HapticTab` button that gives immediate press-in feedback, but the tab navigator does not currently use it.

## Design

The bottom tab navigator will use the navigation library's default lazy mounting behavior. Only the initial tab mounts at startup; another tab mounts when the user first opens it. Existing startup query prefetching remains responsible for warming common data without rendering every tab UI.

Inactive mounted tabs will use `freezeOnBlur: true` on iOS and Android. This suspends their React renders while another tab is active and leaves their state intact for a fast return. Screen transitions remain set to `none`, so navigation does not wait for an animation.

The navigator will use the existing `HapticTab` as its tab-bar button. Its press-in haptic gives immediate confirmation while the normal React Navigation `onPress` continues to own navigation and accessibility behavior.

## Backend Impact

The fix adds no API calls, polling, or invalidation. Lazy mounting prevents inactive screen query hooks from running until those screens are opened, so it can reduce duplicate startup requests. The existing `AppDataPreloader` remains unchanged and continues to warm its bounded set of cached queries once per signed-in user.

## Failure Handling

Navigation remains owned by React Navigation; no custom press timing or duplicate dispatch is introduced. If haptics are unavailable, the existing haptics utility already degrades independently and navigation still proceeds through the provided button props.

## Verification

- Replace the regression assertion that requires `lazy: false` with assertions for lazy mounting, inactive-screen freezing, zero-duration transitions, and the shared haptic tab button.
- Run the focused bottom-tab regression test before and after the implementation to demonstrate failure then success.
- Run TypeScript/lint validation and the existing UI regression test to catch configuration or layout regressions.
- Confirm that no startup preloader or query-hook behavior was expanded.
