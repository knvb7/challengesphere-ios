import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const tabs = read('app/(tabs)/_layout.tsx');
const friends = read('app/(tabs)/index.tsx');
const challenges = read('app/(tabs)/challenges.tsx');
const create = read('app/(tabs)/create.tsx');
const created = read('app/challenge-created.tsx');
const onboarding = read('app/onboarding.tsx');
const profileSetup = read('app/profile-setup.tsx');

const failures = [];

const expectIncludes = (source, value, label) => {
  if (!source.includes(value)) failures.push(`${label}: missing ${JSON.stringify(value)}`);
};

const expectOrder = (source, values, label) => {
  let cursor = -1;
  for (const value of values) {
    const next = source.indexOf(value, cursor + 1);
    if (next < 0 || next <= cursor) {
      failures.push(`${label}: expected ${values.map((item) => JSON.stringify(item)).join(' before ')}`);
      return;
    }
    cursor = next;
  }
};

expectOrder(
  tabs,
  ['name="challenges"', 'name="index"', 'name="create"', 'name="global"', 'name="profile"'],
  'private-first tab order',
);
expectIncludes(tabs, "title: 'Friends'", 'friends tab');
expectIncludes(tabs, "title: 'Explore'", 'secondary discovery tab');

expectIncludes(friends, 'Start something worth sharing', 'friends hub promise');
expectIncludes(
  friends,
  'headerComponent={friendsHeader}',
  'friends header should scroll as part of the activity feed',
);
expectIncludes(friends, 'Create private challenge', 'friends hub primary action');
expectIncludes(friends, "pathname: '/invite-contacts'", 'friends hub invite action');

expectIncludes(challenges, 'Hey {greetingName}', 'personalized challenge home title');
expectOrder(
  challenges,
  ['currentUser?.firstName?.trim()', 'authUser?.firstName?.trim()', 'currentUser?.username?.trim()', 'authUser?.username?.trim()'],
  'challenge home greeting fallback order',
);
expectIncludes(challenges, 'Create private challenge', 'empty private-create action');
expectIncludes(challenges, 'Join with a code', 'empty invite-code action');
expectOrder(
  challenges,
  ['Create private challenge', 'Join with a code', 'Explore global challenges'],
  'empty-state action priority',
);
expectIncludes(challenges, 'Waiting for your crew?', 'waiting-for-crew banner');

expectIncludes(create, 'isPrivate: true', 'private create default');
expectIncludes(create, 'getChallengeTemplateById', 'template prefill');
expectIncludes(create, 'Private by default', 'private create hierarchy');
expectIncludes(create, 'Create & Invite', 'create-and-invite completion action');

expectOrder(created, ['NEXT: BUILD YOUR CREW', 'CHALLENGE DETAILS'], 'post-create invite priority');
expectIncludes(created, 'Invite one friend', 'post-create invite action');

expectOrder(onboarding, ["key: 'friends'", "key: 'private'", "key: 'fun'"], 'friend/private onboarding order');
expectIncludes(onboarding, 'Create a private challenge', 'onboarding final action');
expectIncludes(profileSetup, "router.replace('/(tabs)/create')", 'post-profile create route');

if (failures.length > 0) {
  console.error('Private-first UI regression check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Private-first UI regression check passed.');
