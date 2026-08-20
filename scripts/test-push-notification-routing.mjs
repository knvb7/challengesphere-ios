import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'services/pushNotificationService.ts'), 'utf8');
const notificationsSource = fs.readFileSync(path.join(root, 'app/notifications.tsx'), 'utf8');
const challengesSource = fs.readFileSync(path.join(root, 'app/(tabs)/challenges.tsx'), 'utf8');
const authSource = fs.readFileSync(path.join(root, 'providers/AuthProvider.tsx'), 'utf8');
const photoDetailsSource = fs.readFileSync(path.join(root, 'app/photo-details.tsx'), 'utf8');
const commentsSource = fs.readFileSync(path.join(root, 'components/common/CommentAndCount.tsx'), 'utf8');

assert.match(
  source,
  /type === 'COMMENT' \|\| type === 'GLORY' \|\| type === 'SUBMISSION'[\s\S]*pathname: '\/photo-details'/,
  'submission push notifications should open the submitted photo details'
);
assert.match(
  source,
  /type === 'DAILY_UPLOAD_REMINDER'[\s\S]*pathname: '\/\(tabs\)\/challenges'[\s\S]*uploadChallengeId: challengeId/,
  'daily upload reminder pushes should open My Challenges with the target upload challenge'
);
assert.match(
  source,
  /type === 'CHALLENGE_INVITE'[\s\S]*router\.push\('\/notifications'\)/,
  'challenge invite pushes should open the actionable notification inbox'
);
assert.match(
  source,
  /type === 'CHALLENGE_UPDATE'[\s\S]*pathname: '\/\(tabs\)\/challenges'[\s\S]*focusChallengeId: challengeId/,
  'challenge update pushes should focus the challenge in My Challenges'
);
assert.match(
  source,
  /type === 'FOLLOW'[\s\S]*pathname: '\/user-profile'[\s\S]*id: actorUserId/,
  'follow pushes should open the actor profile'
);
assert.match(
  source,
  /type === 'COMMENT'[\s\S]*commentId, openComments: '1'/,
  'comment pushes should ask photo details to reveal the comments'
);
assert.match(
  notificationsSource,
  /type === 'daily_upload_reminder'[\s\S]*pathname: '\/\(tabs\)\/challenges'[\s\S]*uploadChallengeId: String\(action\.challengeId\)/,
  'daily upload reminder inbox taps should open My Challenges with the upload modal target'
);
assert.match(
  challengesSource,
  /useLocalSearchParams[\s\S]*uploadChallengeId[\s\S]*focusChallengeId[\s\S]*handleUploadMedia\(targetChallenge\)/,
  'My Challenges should consume upload/focus route params and open the upload flow'
);
assert.match(
  source,
  /getExpoPushTokenAsync\(\{ projectId \}\)/,
  'frontend should register Expo push tokens against the EAS project id'
);
for (const requiredText of [
  'Notifications.getLastNotificationResponse()',
  'pendingNotificationResponses',
  'handledNotificationResponseKeys',
  'handleNotificationResponse(lastResponse)',
  'Notifications.clearLastNotificationResponse()',
  'export const setPushNotificationRoutingReady',
  'export const clearPendingPushNotificationResponses',
]) {
  assert.match(
    source,
    new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `cold-launch notification handling should include "${requiredText}"`,
  );
}
assert.match(
  source,
  /notificationRoutingState !== 'AUTHENTICATED'[\s\S]*pendingNotificationResponses\.set\(responseKey, response\)/,
  'notification responses should queue until authenticated routing is ready',
);
assert.match(
  authSource,
  /if \(currentUserId > 0\) \{[\s\S]*setPushNotificationRoutingReady\(true, currentUserId\)[\s\S]*clearPendingPushNotificationResponses\(\)/,
  'AuthProvider should release queued notification routes only after auth restoration',
);
assert.match(
  source,
  /notificationRoutingState === 'UNAUTHENTICATED'[\s\S]*rememberHandledNotificationResponse\(responseKey\)[\s\S]*clearLastNotificationResponseIfHandled\(response\)/,
  'notification taps received while signed out should be discarded instead of queued for another account',
);
assert.match(
  source,
  /clearPendingPushNotificationResponses = \(\) => \{[\s\S]*notificationRoutingState = 'UNAUTHENTICATED'[\s\S]*pendingNotificationResponses\.clear\(\)/,
  'pending cold-launch responses should be cleared when auth resolves unauthenticated',
);
assert.match(
  photoDetailsSource,
  /initiallyOpen=\{openCommentsFromNotification\}/,
  'photo details should pass comment-notification intent to the comments control',
);
assert.match(
  commentsSource,
  /if \(!initiallyOpen \|\| initialOpenHandledRef\.current \|\| submissionId <= 0\)[\s\S]*openComments\(\)/,
  'comment notifications should reveal the comment sheet once the submission is ready',
);

console.log('push notification routing checks passed');
