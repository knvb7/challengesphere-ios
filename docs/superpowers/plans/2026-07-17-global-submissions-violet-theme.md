# Global Submissions Violet Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every green and yellow accent on the global challenge submissions page with the approved violet hierarchy.

**Architecture:** Keep the change local to the existing `StyleSheet` and inline icon colors in `app/global-submissions.tsx`. Do not alter component structure, screen state, data fetching, filtering, sorting, pagination, navigation, or accessibility behavior.

**Tech Stack:** Expo, React Native, TypeScript, Expo Router, `@expo/vector-icons`

## Global Constraints

- Primary action and active control: `#4700EC`.
- Highlight icon and supporting accent: `#8F6BFF`.
- Violet-tinted surface: `#170F2A`.
- Violet border and dark violet icon surface: `#34215E`.
- Active control text and icons: `#F8FAFC`.
- Neutral surface and text colors remain unchanged.
- Do not change layout, copy, filters, sorting, pagination, submission rendering, or interaction behavior.
- Do not run unit tests, per the user's standing request.

---

### Task 1: Apply the unified violet palette

**Files:**
- Modify: `app/global-submissions.tsx:373-442`
- Modify: `app/global-submissions.tsx:657-809`

**Interfaces:**
- Consumes: Existing React Native styles and `Ionicons` color props in `GlobalSubmissionsScreen`.
- Produces: The same screen API and behavior with no remaining green or yellow accent tokens.

- [ ] **Step 1: Record the legacy accent tokens**

Run:

```bash
rg -n "#A7F3D0|#FACC15|#83B6A2|#244036|#101B18|#211F10" app/global-submissions.tsx
```

Expected: matches for the filter eyebrow, reset control, day selector, active-filter label, active sort chip, and result metadata.

- [ ] **Step 2: Replace inline active icon colors**

Update the reset, calendar, day-selector chevron, and active sort icons:

```tsx
<Ionicons name="refresh" size={14} color={hasFilterDraft ? '#F8FAFC' : '#64748B'} />
<Ionicons name="calendar-outline" size={16} color="#8F6BFF" />
<Ionicons name="chevron-down" size={19} color="#8F6BFF" />
<Ionicons name={option.icon} size={13} color={active ? '#F8FAFC' : '#94A3B8'} />
```

- [ ] **Step 3: Replace green and yellow StyleSheet accents**

Set the affected style properties to:

```tsx
filterEyebrow: {
  color: '#8F6BFF',
},
resetButton: {
  backgroundColor: '#4700EC',
},
resetButtonText: {
  color: '#F8FAFC',
},
dayDropdownButton: {
  borderColor: '#34215E',
  backgroundColor: '#170F2A',
},
filterButtonIcon: {
  backgroundColor: '#34215E',
},
dayDropdownLabel: {
  color: '#8F6BFF',
},
activeFilterText: {
  color: '#8F6BFF',
},
sortChipActive: {
  backgroundColor: '#4700EC',
  borderColor: '#4700EC',
},
sortChipTextActive: {
  color: '#F8FAFC',
},
resultMetaFilter: {
  color: '#8F6BFF',
},
```

Preserve every other property in each style object.

- [ ] **Step 4: Confirm that no legacy accent remains**

Run:

```bash
rg -n "#A7F3D0|#FACC15|#83B6A2|#244036|#101B18|#211F10" app/global-submissions.tsx
```

Expected: exit code `1` with no matches.

- [ ] **Step 5: Compile TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code `0` with no TypeScript errors.

- [ ] **Step 6: Export the Android production bundle**

Run:

```bash
EXPO_PUBLIC_API_BASE_URL=https://pqea9mim4b.execute-api.ap-south-1.amazonaws.com/api/v1 npx expo export --platform android --output-dir /tmp/challengesphere-global-submissions-violet-20260717
```

Expected: exit code `0` and an Android bundle written under the specified temporary directory.

- [ ] **Step 7: Check the patch and refresh the code graph**

Run:

```bash
git diff --check -- app/global-submissions.tsx
git diff -- app/global-submissions.tsx
graphify update .
```

Expected: no whitespace errors; the source diff contains only palette substitutions. If `graphify` is unavailable, report that limitation without changing the code.

- [ ] **Step 8: Commit the isolated screen change**

```bash
git add app/global-submissions.tsx
git commit -m "style: unify global submissions violet theme"
```

Expected: one commit containing only `app/global-submissions.tsx`.

