import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const readSource = (relativePath) => readFileSync(
  fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
  'utf8',
);

const commentContainer = readSource('components/common/CommentAndCount.tsx');
const commentSheet = readSource('components/common/CommentsSheet.tsx');
const commentPreview = readSource('app/comment-preview.tsx');

assert.match(commentContainer, /animationType="none"/);
assert.match(commentContainer, /onShow=\{animateSheetIn\}/);
assert.match(commentContainer, /Animated\.timing\(sheetProgress/);
assert.match(commentContainer, /sheetProgress\.stopAnimation\(\)/);
assert.doesNotMatch(commentContainer, /Animated\.spring/);
assert.match(
  commentContainer,
  /useUser\(currentUserId, currentUserId\)[\s\S]*currentUser\?\.profilePicUrl \|\| user\?\.profilePicUrl/,
  'comment composer should prefer the latest signed-in profile photo',
);
assert.doesNotMatch(
  commentContainer,
  /trigger:\s*\{[\s\S]*?borderWidth:/,
  'comment trigger should not render an outer border',
);
assert.match(
  commentContainer,
  /triggerIcon:\s*\{[\s\S]*?backgroundColor: 'transparent'/,
  'comment icon should blend into the control background',
);
assert.match(
  commentContainer,
  /chatbubble-ellipses-outline" size=\{16\} color="#5B3FE5"/,
  'comment glyph should remain visible on the light violet control',
);

assert.match(commentSheet, /style=\{styles\.refreshSlot\}/);
assert.match(commentSheet, /testID="comments-sheet"/);
assert.match(commentSheet, /alignItems: 'center'/);
assert.match(
  commentSheet,
  /headerTitle:\s*\{[\s\S]*?fontSize: 20,/,
  'comments heading should stay compact',
);
assert.doesNotMatch(commentSheet, /behavior=\{Platform\.OS === 'ios' \? 'position'/);
assert.match(
  commentContainer,
  /<Modal[\s\S]*<KeyboardAvoidingView\s+style=\{styles\.modalRoot\}[\s\S]*enabled=\{Platform\.OS === 'ios'\}[\s\S]*behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}[\s\S]*keyboardVerticalOffset=\{Platform\.OS === 'ios' \? -modalBottomInset : 0\}[\s\S]*<CommentsSheet/,
  'iOS should avoid the keyboard at the modal boundary without moving the full Android sheet',
);
assert.doesNotMatch(
  commentSheet,
  /KeyboardAvoidingView/,
  'the fixed-height shared sheet should not apply a second keyboard adjustment',
);
assert.match(
  commentSheet,
  /testID="comment-input-dock"[\s\S]*paddingBottom: Math\.max\(bottomInset, 12\)/,
  'the composer should retain closed-keyboard safe-area clearance',
);
assert.match(
  commentSheet,
  /Keyboard\.addListener\('keyboardDidShow',[\s\S]*event\.endCoordinates\.height[\s\S]*Keyboard\.addListener\('keyboardDidHide',[\s\S]*setAndroidKeyboardInset\(0\)[\s\S]*marginBottom: androidKeyboardInset/,
  'Android should move only the composer dock by the reported IME inset and reset it when hidden',
);
assert.doesNotMatch(
  commentContainer,
  /Keyboard\.addListener/,
  'the modal owner should not install a competing Android keyboard listener',
);
assert.match(
  commentContainer,
  /newCommentRef\.current = value;[\s\S]*const content = newCommentRef\.current\.trim\(\)/,
  'comment submission should synchronously use the latest native composer value',
);
assert.match(
  commentSheet,
  /onPress=\{onSubmit\}[\s\S]*disabled=\{isSubmitting\}/,
  'the send control should accept the first tap and only disable during submission',
);
assert.match(
  commentPreview,
  /<KeyboardAvoidingView[\s\S]*enabled=\{Platform\.OS === 'ios'\}[\s\S]*behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}[\s\S]*<CommentsSheet\s+embedded/,
  'the embedded preview should use the same single-owner keyboard policy',
);
assert.match(
  `${commentContainer}\n${commentSheet}`,
  /#(?:6C42E8|7B55E7|4700EC|5B3FE5|8F6BFF)|rgba\((?:124,58,237|139,92,246|167,139,250)/i,
  'comment controls and sheet should retain violet accents',
);
assert.match(
  commentSheet,
  /countBadge:\s*\{[\s\S]*?backgroundColor: '#FFFFFF'/,
  'comment count should render in a light circle',
);
assert.match(
  commentSheet,
  /commentBody:\s*\{[\s\S]*?backgroundColor: '#FFFFFF'/,
  'comment cards should use a readable white surface',
);
assert.match(
  commentSheet,
  /testID="comment-composer"[\s\S]*?colors=\{\['#DDD4FF', '#E7E3EF', '#FFFFFF'\]\}/,
  'comment composer frame should retain the light violet treatment',
);
assert.match(
  commentSheet,
  /colors=\{\['#FFFFFF', '#FBFAFD', '#F8F7FC'\]\}/,
  'comments sheet background should stay light',
);

assert.match(commentPreview, /const \{ width \} = useWindowDimensions\(\)/);
assert.doesNotMatch(commentPreview, /const \{ width, height \} = useWindowDimensions\(\)/);

console.log('Comment sheet alignment and motion safeguards passed.');
