import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dropdown = read('components/challenges/ChallengeVisibilityDropdown.tsx');

assert.match(
  dropdown,
  /menu:[\s\S]*right:\s*0,/,
  'visibility menu should open inward from the right edge',
);
assert.doesNotMatch(
  dropdown,
  /menu:[\s\S]*left:\s*0,/,
  'visibility menu must not overflow from a right-edge trigger',
);

const ownProfile = read('screens/Profile.tsx');

assert.match(
  ownProfile,
  /<ChallengeVisibilityDropdown[\s\S]*style=\{styles\.challengeVisibilityDropdown\}/,
  'own-profile visibility dropdown should opt into viewport-safe right alignment',
);
assert.match(
  ownProfile,
  /challengeVisibilityDropdown:[\s\S]*alignSelf:\s*'flex-end'/,
  'own-profile visibility dropdown should keep its inward-opening menu on screen',
);

const comments = read('components/common/CommentAndCount.tsx');
const commentsSheet = read('components/common/CommentsSheet.tsx');

assert.match(
  comments,
  /<KeyboardAvoidingView[\s\S]*enabled=\{Platform\.OS === 'ios'\}[\s\S]*behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/,
  'comments should keep the full-sheet keyboard adjustment iOS-only',
);
assert.match(
  commentsSheet,
  /testID="comment-input-dock"[\s\S]*paddingBottom: Math\.max\(bottomInset, 12\)/,
  'comment composer should reserve the device bottom safe area',
);
assert.match(
  commentsSheet,
  /event\.endCoordinates\.height[\s\S]*marginBottom: androidKeyboardInset/,
  'the Android composer should sit directly above the keyboard without moving the sheet',
);
assert.match(
  commentsSheet,
  /modalSheet:[\s\S]*height:\s*'82%'/,
  'comments should use a stable Instagram-style bottom sheet',
);
assert.match(
  comments,
  /accessibilityLabel="Close comments"/,
  'the dimmed backdrop should dismiss comments accessibly',
);
assert.doesNotMatch(
  comments,
  /keyboardTranslateY/,
  'comments must not manually translate the full sheet from keyboard events',
);
assert.match(
  comments,
  /Keyboard\.isVisible\(\)[\s\S]*Keyboard\.dismiss\(\)[\s\S]*return;[\s\S]*closeComments\(\)/,
  'Android back should dismiss an open keyboard before closing comments',
);
assert.match(
  comments,
  /<KeyboardAvoidingView[\s\S]*style=\{styles\.modalRoot\}[\s\S]*<CommentsSheet/,
  'the modal should retain a single keyboard-aware layout boundary',
);
assert.doesNotMatch(
  commentsSheet,
  /KeyboardAvoidingView/,
  'keyboard avoidance should not be trapped inside the fixed-height comments sheet',
);

const challengeDetails = read('app/challenge-details.tsx');
const challengeService = read('services/challengeService.ts');

assert.match(
  challengeDetails,
  /normalizedRemoveReason\.length > 0/,
  'participant removal should require a reason without imposing a minimum length',
);
assert.match(
  challengeDetails,
  /removeParticipantSheet:[\s\S]*maxHeight:\s*'88%'/,
  'the removal reason should use a keyboard-safe bottom sheet',
);
assert.match(
  challengeDetails,
  /paddingBottom: Math\.max\(bottomInset, 16\)/,
  'the removal sheet should stay above bottom notches and home indicators',
);
assert.match(
  challengeDetails,
  /fallbackSource=\{isOfficialParticipant \? OFFICIAL_ACCOUNT_AVATAR_SOURCE : undefined\}/,
  'the official account should show the bundled logo when its remote avatar is unavailable',
);
assert.match(
  challengeDetails,
  /participantName:[\s\S]*fontSize:\s*13,/,
  'participant usernames should use compact typography',
);
assert.match(
  challengeDetails,
  /<Text style=\{styles\.participantName\} numberOfLines=\{1\}>\s*\{participantDisplayUsername\}\s*<\/Text>/,
  'participant usernames should render without an @ prefix',
);
assert.match(
  challengeService,
  /\{ reason \}/,
  'the removal reason should be sent to the API',
);

console.log('social challenge polish checks passed');
