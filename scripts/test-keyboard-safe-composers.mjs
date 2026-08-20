import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const commentContainerSource = readSource('components/common/CommentAndCount.tsx');
const commentSheetSource = readSource('components/common/CommentsSheet.tsx');
const commentPreviewSource = readSource('app/comment-preview.tsx');
const feedHookSource = readSource('hooks/useFeed.ts');
const submissionComposerSource = readSource('components/common/SubmissionComposer.tsx');
const createChallengeSource = readSource('app/(tabs)/create.tsx');
const captionModalSources = [
  ['app/(tabs)/challenges.tsx', readSource('app/(tabs)/challenges.tsx')],
  ['app/challenge-details.tsx', readSource('app/challenge-details.tsx')],
  ['app/challenge-submissions.tsx', readSource('app/challenge-submissions.tsx')],
];

assert.doesNotMatch(
  commentContainerSource,
  /useKeyboardVisibility|isKeyboardVisible/,
  'comment composer should not change its geometry in response to keyboard visibility events'
);
assert.match(
  commentContainerSource,
  /const \{ bottom: bottomInset \} = useSafeAreaInsets\(\);/,
  'comment composer should read the stable device bottom inset'
);
assert.match(
  commentContainerSource,
  /<Modal[\s\S]*<KeyboardAvoidingView\s+style=\{styles\.modalRoot\}[\s\S]*keyboardVerticalOffset=\{Platform\.OS === 'ios' \? -modalBottomInset : 0\}[\s\S]*<CommentsSheet/,
  'comment composer should compensate for safe-area padding without offsetting Android keyboard movement'
);
assert.match(
  commentContainerSource,
  /<KeyboardAvoidingView[\s\S]*style=\{styles\.modalRoot\}[\s\S]*<CommentsSheet/,
  'comment composer should keep keyboard handling at the layout boundary that owns the bottom-aligned input'
);
assert.match(
  commentContainerSource,
  /enabled=\{Platform\.OS === 'ios'\}[\s\S]*behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/,
  'the full-sheet keyboard adjustment should be enabled only on iOS'
);
assert.doesNotMatch(
  commentSheetSource,
  /KeyboardAvoidingView/,
  'shared comment sheet must not apply a second keyboard adjustment inside its fixed-height boundary'
);
assert.match(
  commentSheetSource,
  /testID="comment-input-dock"[\s\S]*paddingBottom: Math\.max\(bottomInset, 12\)/,
  'comment composer should reserve safe-area space under the input row while the keyboard animates'
);
assert.match(
  commentSheetSource,
  /Keyboard\.addListener\('keyboardDidShow',[\s\S]*event\.endCoordinates\.height[\s\S]*Keyboard\.addListener\('keyboardDidHide',[\s\S]*setAndroidKeyboardInset\(0\)[\s\S]*marginBottom: androidKeyboardInset/,
  'Android should reserve the exact IME inset below the composer without moving the sheet'
);
assert.match(
  commentSheetSource,
  /modalSheet:[\s\S]*height: '82%',/,
  'comment composer sheet should keep a stable Instagram-style height when refreshed comments arrive'
);
assert.match(
  commentSheetSource,
  /<FlatList[\s\S]*ListEmptyComponent=\{<EmptyConversation \/>\}[\s\S]*keyboardShouldPersistTaps="handled"/,
  'comment composer should keep one scrollable list tree when posting the first comment'
);
assert.doesNotMatch(
  commentSheetSource,
  /contentContainerStyle=\{comments\.length === 0 \?/,
  'comment composer should not change list container geometry when the first comment arrives'
);
assert.match(
  commentSheetSource,
  /sendButtonTouch:[\s\S]*width:\s*\d+,[\s\S]*height:\s*\d+,[\s\S]*borderRadius:/,
  'comment post button should not resize when showing pending state'
);
assert.match(
  commentPreviewSource,
  /<KeyboardAvoidingView[\s\S]*enabled=\{Platform\.OS === 'ios'\}[\s\S]*behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}[\s\S]*<CommentsSheet\s+embedded/,
  'embedded comment-sheet previews should share the same platform-specific keyboard ownership'
);
assert.match(
  feedHookSource,
  /onSuccess:\s*\(createdComment,\s*\{\s*submissionId,[\s\S]*queryClient\.setQueriesData<PageComment>[\s\S]*content:\s*\[commentForCache,\s*\.\.\.previous\.content\]/,
  'comment post success should update the displayed comments cache immediately'
);

for (const [file, source] of captionModalSources) {
  assert.doesNotMatch(
    source,
    /useKeyboardVisibility|isUploadKeyboardVisible/,
    `${file} should not change modal geometry in response to keyboard visibility events`
  );
  assert.match(
    source,
    /<KeyboardAvoidingView[\s\S]*keyboardVerticalOffset=\{-bottomInset\}[\s\S]*edges=\{\['top', 'bottom'\]\}/,
    `${file} should keep fixed safe-area layout while compensating keyboard avoidance`
  );
  assert.match(
    source,
    /SubmissionComposer/,
    `${file} should use the shared keyboard-safe submission composer`
  );
}
assert.match(
  submissionComposerSource,
  /keyboardShouldPersistTaps="handled"/,
  'shared submission composer should keep modal controls usable while the keyboard is open'
);

assert.match(
  createChallengeSource,
  /<KeyboardAvoidingView[\s\S]*behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\}[\s\S]*keyboardVerticalOffset=\{Platform\.OS === 'ios' \? bottomInset : 0\}[\s\S]*<ScrollView/,
  'challenge creation should wrap its form ScrollView in a keyboard avoiding container'
);
assert.match(
  createChallengeSource,
  /keyboardShouldPersistTaps="handled"[\s\S]*keyboardDismissMode=\{Platform\.OS === 'ios' \? 'interactive' : 'on-drag'\}/,
  'challenge creation ScrollView should remain usable while the keyboard is open'
);
assert.match(
  createChallengeSource,
  /contentContainerStyle=\{\[styles\.scrollContent,\s*\{ paddingBottom: 140 \+ bottomInset \}\]\}/,
  'challenge creation should reserve enough bottom scroll padding for keyboard-covered footer controls'
);
assert.match(
  createChallengeSource,
  /<KeyboardAvoidingView[\s\S]*style=\{styles\.modalKeyboardAvoidingContainer\}[\s\S]*<SafeAreaView style=\{styles\.modalContainer\}/,
  'challenge invite modal should keep its search field and friend list keyboard-safe'
);

console.log('keyboard-safe composer regression checks passed');
