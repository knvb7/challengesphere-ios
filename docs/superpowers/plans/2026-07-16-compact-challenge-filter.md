# Compact My Challenges Visibility Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the My Challenges visibility dropdown into the existing tabs row so it consumes no standalone vertical space.

**Architecture:** Keep the existing visibility state and shared dropdown component unchanged. Restructure only the My Challenges JSX and row styles: a left tab group and a right dropdown share one parent control row, while the dropdown's absolute menu continues opening downward above neighboring content.

**Tech Stack:** React Native, Expo, TypeScript, Node.js source-level regression checks

## Global Constraints

- Keep the current All, Public, and Private filtering behavior unchanged.
- Keep the dropdown label, icons, touch target, haptic feedback, and downward-opening menu unchanged.
- Keep search, tab selection, category filtering, counts, loading states, and archive behavior unchanged.
- Support the narrow Android phone width shown in the supplied screenshot.

---

### Task 1: Combine the tabs and visibility filter into one row

**Files:**
- Create: `scripts/test-my-challenges-compact-filter-row.mjs`
- Modify: `app/(tabs)/challenges.tsx:752-768`
- Modify: `app/(tabs)/challenges.tsx:1146-1187`
- Test: `scripts/test-my-challenges-compact-filter-row.mjs`

**Interfaces:**
- Consumes: Existing `ChallengeVisibilityDropdown` props `value: ChallengeVisibilityFilter` and `onChange: (value: ChallengeVisibilityFilter) => void`.
- Produces: A `styles.tabFilterRow` parent containing `styles.tabGroup` and the existing dropdown, with no `styles.visibilityFilterBar` wrapper.

- [ ] **Step 1: Write the failing layout regression test**

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/(tabs)/challenges.tsx', import.meta.url), 'utf8');

assert.match(
  source,
  /<View style=\{styles\.tabFilterRow\}>[\s\S]*?<View style=\{styles\.tabGroup\}>[\s\S]*?renderTabButton\("all"[\s\S]*?renderTabButton\("created"[\s\S]*?renderTabButton\("past"[\s\S]*?<ChallengeVisibilityDropdown/,
  'the visibility dropdown should share the tabs row',
);
assert.doesNotMatch(
  source,
  /visibilityFilterBar/,
  'the standalone visibility filter row should be removed',
);
assert.match(source, /tabFilterRow:\s*\{[\s\S]*?flexDirection:\s*"row"[\s\S]*?justifyContent:\s*"space-between"/);
assert.match(source, /tabGroup:\s*\{[\s\S]*?flexShrink:\s*1/);

console.log('compact My Challenges filter row checks passed');
```

- [ ] **Step 2: Run the test and verify the current layout fails**

Run: `node scripts/test-my-challenges-compact-filter-row.mjs`

Expected: FAIL with `the visibility dropdown should share the tabs row` because `tabFilterRow` and `tabGroup` do not exist yet.

- [ ] **Step 3: Implement the combined control row**

Replace the separate tab and visibility wrappers with:

```tsx
<View style={styles.tabFilterRow}>
  <View style={styles.tabGroup}>
    {renderTabButton("all", `Active ${activeCount}`)}
    {renderTabButton("created", `Created ${createdCount}`)}
    {renderTabButton("past", `Past ${pastCount}`)}
  </View>
  <ChallengeVisibilityDropdown
    value={visibilityFilter}
    onChange={(nextFilter) => {
      hapticFeedback.selection();
      setVisibilityFilter(nextFilter);
    }}
  />
</View>
```

Replace `tabContainer` and `visibilityFilterBar` with:

```tsx
tabFilterRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  paddingHorizontal: 16,
  paddingTop: 7,
  paddingBottom: 9,
  zIndex: 10,
  elevation: 10,
},
tabGroup: {
  flexDirection: "row",
  alignItems: "center",
  flexShrink: 1,
  gap: 2,
},
```

Keep the current `tabButton`, dropdown, and category styles otherwise unchanged.

- [ ] **Step 4: Run focused regression checks**

Run: `node scripts/test-my-challenges-compact-filter-row.mjs && node scripts/test-challenge-visibility-filter.mjs`

Expected: both scripts print their `passed` messages and exit with status 0.

- [ ] **Step 5: Run static verification**

Run: `npx tsc --noEmit`

Expected: exit status 0. If unrelated pre-existing TypeScript failures occur, record their exact output and verify this change introduces no new diagnostic in `app/(tabs)/challenges.tsx`.

- [ ] **Step 6: Update the code graph**

Run: `graphify update .`

Expected: the graph update completes successfully. If the local `graphify` executable is unavailable, record that limitation.

- [ ] **Step 7: Commit the tested layout change**

```bash
git add app/(tabs)/challenges.tsx scripts/test-my-challenges-compact-filter-row.mjs
git commit -m "fix: compact My Challenges filter row"
```
