import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const photoDetails = readSource('app/photo-details.tsx');
const photoHeader = readSource('components/common/PhotoDetailsHeader.tsx');
const challengeSubmissions = readSource('app/challenge-submissions.tsx');

assert.match(photoHeader, /rightAction\?: React\.ReactNode/);
assert.match(photoHeader, /rightAction \|\| <View style=\{styles\.placeholder\} \/>/);

assert.match(photoDetails, /useDeleteSubmission/);
assert.match(
  photoDetails,
  /const isOwnSubmission = ownerUserId > 0 && ownerUserId === currentUserId/,
);
assert.match(photoDetails, /<PhotoDetailsHeader[\s\S]*rightAction=\{isOwnSubmission \?/);
assert.match(photoDetails, /accessibilityLabel="Post options"[\s\S]*name="ellipsis-horizontal"/);
assert.match(photoDetails, /visible=\{optionsVisible\}[\s\S]*Delete post[\s\S]*Cancel/);
assert.match(photoDetails, /visible=\{deleteConfirmationVisible\}[\s\S]*Delete post\?/);
assert.match(
  photoDetails,
  /deleteSubmissionMutation\.mutateAsync\(\{\s*submissionId,\s*userId: currentUserId,\s*challengeId: photoData\.challengeId,\s*\}\)/,
);
assert.match(photoDetails, /await deleteSubmissionMutation\.mutateAsync[\s\S]*router\.back\(\)/);

assert.doesNotMatch(
  challengeSubmissions,
  /handleDeleteSubmission|deleteCandidate|cardDeleteButton/,
);

const actionsStart = photoDetails.indexOf('<View style={styles.actionsContainer}>');
const actionsEnd = photoDetails.indexOf('</View>', actionsStart);
const socialActions = photoDetails.slice(actionsStart, actionsEnd);
assert.doesNotMatch(socialActions, /Delete post|ellipsis-horizontal|trash/);

console.log('owner post delete menu checks passed');
