import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const section = process.argv[2] || 'all';
const shouldCheck = (name) => section === 'all' || section === name;

if (shouldCheck('shared-media')) {
  for (const component of [
    'components/common/AvatarImage.tsx',
    'components/common/MediaSourceChooser.tsx',
  ]) {
    assert.ok(exists(component), `${component} should exist`);
  }

  const avatar = read('components/common/AvatarImage.tsx');
  assert.match(avatar, /Image as ExpoImage/);
  assert.match(avatar, /createCachedRemoteImageSource/);
  assert.match(avatar, /cachePolicy="memory-disk"/);
  assert.match(avatar, /onError/);

  const mediaSource = read('components/common/MediaSourceChooser.tsx');
  assert.match(mediaSource, /Gallery/);
  assert.match(mediaSource, /Camera/);
  assert.match(mediaSource, /launchImageLibraryAsync/);
  assert.match(mediaSource, /launchCameraAsync/);
}

if (shouldCheck('animation')) {
  assert.ok(exists('components/common/PublicChallengeBroadcastAnimation.tsx'));
  const challengeCreated = read('app/challenge-created.tsx');
  assert.match(challengeCreated, /PublicChallengeBroadcastAnimation/);
  assert.doesNotMatch(challengeCreated, /CommunityGatheringAnimation/);
  assert.doesNotMatch(challengeCreated, /audienceDot/);
}

if (shouldCheck('onboarding')) {
  const profileSetup = read('app/profile-setup.tsx');
  assert.match(profileSetup, /DateTimePicker/);
  assert.match(profileSetup, /editable=\{false\}/);
  assert.match(profileSetup, /keyboardAwareScrollRef/);
  assert.match(profileSetup, /MediaSourceChooser/);
}

if (shouldCheck('carousel')) {
  const carousel = read('components/common/SubmissionMediaCarousel.tsx');
  assert.match(carousel, /onScrollBeginDrag/);
  assert.match(carousel, /resumeAutoplay/);
  assert.doesNotMatch(carousel, /scrollEnabled=\{!autoPlay\}/);
}

if (shouldCheck('submission-identity')) {
  assert.ok(exists('components/common/ChallengeIdentityStrip.tsx'));
  const feed = read('screens/Feed.tsx');
  assert.match(feed, /ChallengeIdentityStrip/);
  assert.match(feed, /AvatarImage/);
}

if (shouldCheck('challenge-editing')) {
  assert.ok(exists('components/common/DurationPickerModal.tsx'));
  const challengeCard = read('components/common/ChallengeCard.tsx');
  assert.match(challengeCard, /getMainChallengeDescription/);

  const editChallenge = read('app/edit-challenge.tsx');
  assert.match(editChallenge, /DurationPickerModal/);
  assert.match(editChallenge, /MediaSourceChooser/);
}

if (shouldCheck('media-migrations')) {
  const challengeCreate = read('app/(tabs)/create.tsx');
  assert.match(challengeCreate, /MediaSourceChooser/);

  const editProfile = read('screens/EditProfile.tsx');
  assert.match(editProfile, /MediaSourceChooser/);
}

if (shouldCheck('submission-composer')) {
  assert.ok(exists('components/common/SubmissionComposer.tsx'));
  for (const submissionScreen of [
    'app/(tabs)/challenges.tsx',
    'app/challenge-details.tsx',
    'app/challenge-submissions.tsx',
  ]) {
    assert.match(read(submissionScreen), /SubmissionComposer/);
  }
}

if (shouldCheck('auth')) {
  const settings = read('app/settings.tsx');
  assert.match(settings, /await logout\(\)/);
  assert.doesNotMatch(settings, /useLogout/);
  assert.doesNotMatch(settings, /router\.replace\(['"]\/login['"]\)/);

  const authProvider = read('providers/AuthProvider.tsx');
  assert.match(authProvider, /logoutInFlightRef/);
  assert.match(authProvider, /queryClient\.clear\(\)/);

  const rootLayout = read('app/_layout.tsx');
  assert.match(rootLayout, /Stack\.Protected/);
  assert.match(rootLayout, /guard=\{isAuthenticated\}/);
  assert.match(rootLayout, /guard=\{!isAuthenticated\}/);
}

console.log('app polish and media reliability checks passed');
