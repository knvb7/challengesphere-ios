import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const screens = [
  'app/challenge-details.tsx',
  'app/global-challenge-details.tsx',
];

for (const screenPath of screens) {
  const screen = readFileSync(path.join(root, screenPath), 'utf8');

  assert.match(
    screen,
    /const handleParticipantProfilePress = [\s\S]*?pathname: ['"]\/user-profile['"]/,
    `${screenPath} should route participant profile presses to the user profile`,
  );
  assert.match(
    screen,
    /onPress=\{\(\) => handleParticipantProfilePress\(participant\)\}[\s\S]*?accessibilityRole="link"/,
    `${screenPath} should make the participant username a profile link`,
  );
  assert.match(
    screen,
    /style=\{styles\.participantSubmissionsButton\}[\s\S]*?onPress=\{\(\) => handleParticipantSubmissionsPress\(participant\)\}[\s\S]*?>Submissions<\/Text>/,
    `${screenPath} should expose submissions as a separate labeled button`,
  );
}

console.log('participant profile navigation checks passed');
