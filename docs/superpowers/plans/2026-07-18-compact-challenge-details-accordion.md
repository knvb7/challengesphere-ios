# Compact Challenge Details Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the challenge metadata tile grid with a beautiful, collapsed-by-default inline accordion that reveals all metadata with one tap.

**Architecture:** Keep expansion state and presentation inside the existing shared `ChallengeDetailsOverview` component so personal and global challenge screens stay consistent without new props or screen-level state. Add one focused source regression script, update two existing source assertions to reflect the grouped timeline row, and preserve every data and navigation contract.

**Tech Stack:** Expo, React Native, TypeScript, React 19, `@expo/vector-icons`, Node.js source-level regression scripts

## Global Constraints

- The accordion is collapsed on every initial mount and is not persisted between visits.
- The hero image, title, description, progress, submission preview, creator, participants, leaderboard, and global-submissions actions retain their existing behavior.
- The collapsed summary uses `Category · Duration · Visibility`.
- Expanded content shows Category, Duration, Timeline, Created, Visibility, and optional tags as rows inside one surface.
- Current day is not repeated in the expanded metadata because it already appears above.
- Expansion must not trigger navigation, loading, or an API request.
- Missing category uses `General`; missing duration uses the calculated day count; invalid dates use the existing `Not set` formatter behavior.
- Do not add a runtime dependency or change backend/API code.
- Preserve unrelated in-progress worktree changes, especially `app/challenge-details.tsx`.

---

### Task 1: Build and verify the shared challenge-details accordion

**Files:**
- Create: `scripts/test-compact-challenge-details-accordion.mjs`
- Modify: `components/common/ChallengeDetailsOverview.tsx:1-780`
- Modify: `scripts/test-challenge-details-overview-redesign.mjs:25-58`
- Modify: `scripts/test-ui-regressions.mjs:542-565`

**Interfaces:**
- Consumes: Existing `category`, `duration`, `numberOfDays`, `createdAt`, `startDate`, `endDate`, `isPrivate`, and `tags` props plus existing `formatDate`, `formatDateTime`, `parseChallengeCategories`, and `Ionicons` utilities.
- Produces: A local `detailsExpanded: boolean` state, a single accessible accordion press target, and a local `DetailRow` presentation helper. No exported interface changes.

- [ ] **Step 1: Write the failing focused regression script**

Create `scripts/test-compact-challenge-details-accordion.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = readFileSync(
  path.join(root, 'components/common/ChallengeDetailsOverview.tsx'),
  'utf8',
);

assert.match(
  source,
  /const \[detailsExpanded, setDetailsExpanded\] = useState\(false\)/,
  'challenge metadata should start collapsed on every mount',
);
assert.match(source, /accessibilityRole="button"/);
assert.match(source, /accessibilityState=\{\{ expanded: detailsExpanded \}\}/);
assert.match(
  source,
  /accessibilityLabel=\{detailsExpanded \? 'Hide challenge details' : 'Show challenge details'\}/,
);
assert.match(source, /detailsExpanded \? 'Show less' : 'Show more'/);
assert.match(source, /detailsExpanded && \(/, 'metadata rows should render only after expansion');
assert.match(source, /categoryPills\.join\(', '\) \|\| 'General'/);
assert.match(source, /duration \|\| `\$\{numberOfDays \|\| 1\} days`/);
assert.match(source, /label="Timeline"/);
assert.match(source, /formatDate\(startDate\)/);
assert.match(source, /formatDate\(endDate\)/);
assert.match(source, /label="Created" value=\{formatDateTime\(createdAt\)\}/);
assert.match(source, /label="Visibility" value=\{visibility\}/);
assert.match(source, /visibleTags\.length > 0/);
assert.doesNotMatch(source, /styles\.detailGrid/);
assert.doesNotMatch(source, /const DetailTile/);

console.log('compact challenge details accordion checks passed');
```

- [ ] **Step 2: Run the new script and verify that it fails**

Run:

```bash
node scripts/test-compact-challenge-details-accordion.mjs
```

Expected: exit code `1` because `detailsExpanded` and the accordion do not exist yet.

- [ ] **Step 3: Add the collapsed-by-default state and summary values**

Change the React import and add local state and fallback values inside `ChallengeDetailsOverview`:

```tsx
import React, { useState } from 'react';

const [detailsExpanded, setDetailsExpanded] = useState(false);
const categoryText = categoryPills.join(', ') || 'General';
const durationText = duration || `${numberOfDays || 1} days`;
const detailsSummary = `${categoryText} · ${durationText} · ${visibility}`;
```

Place the state with the component's other derived display values. It must not be hoisted to either screen.

- [ ] **Step 4: Replace the metadata tile grid and separate tags section with one accordion**

Replace the existing `Challenge Details` heading, `detailGrid`, and standalone tags block with:

```tsx
<View style={[styles.detailsAccordion, detailsExpanded && styles.detailsAccordionExpanded]}>
  <TouchableOpacity
    style={styles.detailsAccordionHeader}
    onPress={() => setDetailsExpanded((expanded) => !expanded)}
    activeOpacity={0.76}
    accessibilityRole="button"
    accessibilityState={{ expanded: detailsExpanded }}
    accessibilityLabel={detailsExpanded ? 'Hide challenge details' : 'Show challenge details'}
  >
    <View style={styles.detailsHeaderIcon}>
      <Ionicons name="information-circle-outline" size={21} color="#C5B5FF" />
    </View>
    <View style={styles.detailsHeaderCopy}>
      <Text style={styles.detailsHeaderTitle}>Challenge details</Text>
      <Text style={styles.detailsHeaderSummary} numberOfLines={1}>
        {detailsSummary}
      </Text>
    </View>
    <View style={styles.detailsToggle}>
      <Text style={styles.detailsToggleText}>
        {detailsExpanded ? 'Show less' : 'Show more'}
      </Text>
      <Ionicons
        name={detailsExpanded ? 'chevron-up' : 'chevron-down'}
        size={16}
        color="#A98CFF"
      />
    </View>
  </TouchableOpacity>

  {detailsExpanded && (
    <View style={styles.detailsExpandedContent}>
      <DetailRow icon="bookmark-outline" label="Category" value={categoryText} />
      <DetailRow icon="time-outline" label="Duration" value={durationText} />
      <DetailRow
        icon="calendar-outline"
        label="Timeline"
        value={`${formatDate(startDate)} – ${formatDate(endDate)}`}
      />
      <DetailRow icon="sparkles-outline" label="Created" value={formatDateTime(createdAt)} />
      <DetailRow
        icon={isPrivate ? 'lock-closed-outline' : 'eye-outline'}
        label="Visibility"
        value={visibility}
        last
      />

      {visibleTags.length > 0 && (
        <View style={styles.detailsTagsSection}>
          <Text style={styles.detailsTagsLabel}>Tags</Text>
          <View style={styles.tagsWrap}>
            {visibleTags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )}
</View>
```

- [ ] **Step 5: Replace `DetailTile` with the compact row helper**

Remove `DetailTile` and add:

```tsx
const DetailRow = ({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) => (
  <View style={[styles.detailRow, !last && styles.detailRowDivider]}>
    <View style={styles.detailRowIcon}>
      <Ionicons name={icon} size={17} color="#BBA7FF" />
    </View>
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text style={styles.detailRowValue} numberOfLines={2}>{value}</Text>
  </View>
);
```

- [ ] **Step 6: Replace the tile styles with the accordion visual system**

Delete `detailGrid`, `detailTile`, `detailIcon`, `detailLabel`, and `detailValue`. Add these exact styles while preserving the existing reusable tag styles:

```tsx
detailsAccordion: {
  marginTop: 18,
  borderRadius: 18,
  overflow: 'hidden',
  backgroundColor: '#121017',
  borderWidth: 1,
  borderColor: '#302940',
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 18,
  elevation: 4,
},
detailsAccordionExpanded: {
  borderColor: '#49377A',
},
detailsAccordionHeader: {
  minHeight: 78,
  paddingHorizontal: 14,
  paddingVertical: 13,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 11,
},
detailsHeaderIcon: {
  width: 38,
  height: 38,
  borderRadius: 13,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#211837',
  borderWidth: 1,
  borderColor: '#45336F',
},
detailsHeaderCopy: {
  flex: 1,
  minWidth: 0,
},
detailsHeaderTitle: {
  color: '#FFFFFF',
  fontSize: 14,
  lineHeight: 18,
  fontWeight: '700',
  marginBottom: 4,
},
detailsHeaderSummary: {
  color: '#948AA2',
  fontSize: 10,
  lineHeight: 14,
  fontWeight: '500',
},
detailsToggle: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  flexShrink: 0,
},
detailsToggleText: {
  color: '#B69EFF',
  fontSize: 10,
  fontWeight: '700',
},
detailsExpandedContent: {
  marginHorizontal: 14,
  paddingBottom: 14,
  borderTopWidth: 1,
  borderTopColor: '#2D2735',
},
detailRow: {
  minHeight: 54,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingVertical: 10,
},
detailRowDivider: {
  borderBottomWidth: 1,
  borderBottomColor: '#28222F',
},
detailRowIcon: {
  width: 30,
  height: 30,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#1F1733',
},
detailRowLabel: {
  width: 66,
  color: '#8F86A0',
  fontSize: 10,
  fontWeight: '700',
},
detailRowValue: {
  flex: 1,
  color: '#F7F3FC',
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '600',
  textAlign: 'right',
},
detailsTagsSection: {
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: '#28222F',
},
detailsTagsLabel: {
  color: '#8F86A0',
  fontSize: 10,
  fontWeight: '700',
  marginBottom: 9,
},
```

- [ ] **Step 7: Update existing regression expectations for the grouped metadata**

In `scripts/test-challenge-details-overview-redesign.mjs`, replace the required strings `Start date` and `End date` with `Timeline`, and add `Show more` and `Show less` to the list. Keep `Current day` because it remains in the summary strip.

In `scripts/test-ui-regressions.mjs`, replace the old tile assertion:

```js
assert.match(
  challengeDetailsOverviewSource,
  /label="Start date" value=\{formatDate\(startDate\)\}/,
  'the shared challenge overview should show the start date in its detail tiles',
);
```

with:

```js
assert.match(
  challengeDetailsOverviewSource,
  /label="Timeline"[\s\S]*formatDate\(startDate\)[\s\S]*formatDate\(endDate\)/,
  'the shared challenge overview should group the start and end dates in its expanded timeline row',
);
```

- [ ] **Step 8: Run focused and existing regression scripts**

Run:

```bash
node scripts/test-compact-challenge-details-accordion.mjs
node scripts/test-challenge-details-overview-redesign.mjs
node scripts/test-challenge-submission-previews.mjs
node scripts/test-ui-regressions.mjs
```

Expected: all four commands exit `0` and print their respective passed messages.

- [ ] **Step 9: Run static validation**

Run:

```bash
npx tsc --noEmit
npx eslint components/common/ChallengeDetailsOverview.tsx
git diff --check -- components/common/ChallengeDetailsOverview.tsx scripts/test-compact-challenge-details-accordion.mjs scripts/test-challenge-details-overview-redesign.mjs scripts/test-ui-regressions.mjs
```

Expected: TypeScript, focused lint, and whitespace checks exit `0`. If unrelated pre-existing TypeScript errors occur in already-modified files, record them separately and verify that the touched component introduces none.

- [ ] **Step 10: Refresh the code graph and inspect the isolated diff**

Run:

```bash
graphify update .
git diff -- components/common/ChallengeDetailsOverview.tsx scripts/test-compact-challenge-details-accordion.mjs scripts/test-challenge-details-overview-redesign.mjs scripts/test-ui-regressions.mjs
```

Expected: `graphify update .` completes if the installed command is available; otherwise report the missing project tool. The source diff contains only the accordion, its styles, and matching regression updates.

- [ ] **Step 11: Commit only the accordion implementation**

Run:

```bash
git add components/common/ChallengeDetailsOverview.tsx scripts/test-compact-challenge-details-accordion.mjs scripts/test-challenge-details-overview-redesign.mjs scripts/test-ui-regressions.mjs
git commit -m "feat: simplify challenge details metadata"
```

Expected: one commit containing only the four listed files; unrelated worktree changes remain unstaged.
