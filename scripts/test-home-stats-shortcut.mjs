import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

const homeSource = read('app/(tabs)/index.tsx');
const profileTabSource = read('app/(tabs)/profile.tsx');
const profileSource = read('screens/Profile.tsx');

for (const removedText of [
  'Your connections',
  'Followers &amp; following',
  'Your stats',
  'Streaks &amp; progress',
  'accessibilityLabel="Open your connections"',
  'accessibilityLabel="Open your profile stats"',
]) {
  assert.doesNotMatch(
    homeSource,
    new RegExp(removedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `friends tab should not include removed shortcut "${removedText}"`,
  );
}

for (const requiredText of [
  'useLocalSearchParams',
  'initialTab',
  "params.initialTab === 'stats'",
  'initialTab={initialTab}',
]) {
  assert.match(
    profileTabSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `profile tab route should pass stats initial tab "${requiredText}"`,
  );
}

for (const requiredText of [
  'initialTab?: ProfileTab',
  "useState<ProfileTab>(initialTab ?? 'submissions')",
  "new Animated.Value(PROFILE_TABS.indexOf(initialTab ?? 'submissions'))",
  'lastInitialTabRef',
  'switchTab(initialTab)',
]) {
  assert.match(
    profileSource,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `profile screen should support opening directly to stats "${requiredText}"`,
  );
}

console.log('friends shortcut removal checks passed');
