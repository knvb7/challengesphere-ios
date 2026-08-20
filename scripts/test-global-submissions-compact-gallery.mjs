import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = readFileSync(path.join(root, 'app/global-submissions.tsx'), 'utf8');

// The approved hierarchy keeps the challenge description as the title and removes
// the decorative globe that previously looked like an action.
assert.match(source, /styles\.headerTitle[^>]*numberOfLines=\{1\}[^>]*>\{challengeTitle\}/);
assert.match(source, /Global submissions · \{momentCountLabel\}/);
assert.doesNotMatch(source, /earth-outline/);
assert.doesNotMatch(source, /<View style=\{styles\.filterPanel\}>/);

// Gallery geometry and card styling mirror the established profile gallery.
assert.match(source, /GRID_COLS\s*=\s*2/);
assert.match(source, /GRID_GAP\s*=\s*8/);
assert.match(source, /GRID_HORIZONTAL_PADDING\s*=\s*12/);
assert.match(source, /useWindowDimensions\(\)/);
assert.match(source, /<LinearGradient/);
assert.match(source, /<AvatarImage/);
assert.match(source, /gloriesLabel/);
assert.match(source, /styles\.submissionMetaOverlay/);
assert.match(source, /fontSize:\s*17,[\s\S]*lineHeight:\s*22,[\s\S]*fontWeight:\s*'700'/);

// Focusing participant search exposes challenge participants with avatars and
// usernames; choosing one applies the backend filter and enforces exact user ID.
assert.match(source, /placeholder="Search participant"/);
assert.match(source, /onFocus=\{\(\) => setParticipantPickerOpen\(true\)\}/);
assert.match(source, /matchesUserSearch\(participant, normalizedParticipantQuery\)/);
assert.match(source, /participant\.profilePictureUrl[\s\S]*participant\.profilePicUrl[\s\S]*participant\.userProfilePicUrl/);
assert.match(source, />@\{participant\.username\}<\/Text>/);
assert.match(source, /handleSelectParticipant/);
assert.match(source, /applyParticipantFilter\(participant\.username\)/);
assert.match(source, /submission\.userId === selectedParticipant\.id/);
assert.match(source, /accessibilityLabel=\{`Show submissions from \$\{participant\.username\}`\}/);

// All original day/sort/reset controls remain reachable through compact pills
// and the filter sheet.
assert.match(source, /Open submission filters/);
assert.match(source, /Refine submissions/);
assert.match(source, /Reset submission filters/);
assert.match(source, /Show submissions/);
assert.match(source, /SORT_OPTIONS\.map/);

console.log('global submissions compact gallery checks passed');
