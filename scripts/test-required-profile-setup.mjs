import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const profileSetup = read('app/profile-setup.tsx');
const countries = read('constants/countries.ts');
const apiTypes = read('types/api.ts');
const onboardingService = read('services/onboardingService.ts');
const appIndex = read('app/index.tsx');

assert.doesNotMatch(profileSetup, /Skip for now/);
for (const label of [
  'A SHORT BIO *',
  'INTERESTS *',
  'BIRTHDAY AND AGE *',
  'GENDER *',
  'COUNTRY *',
]) {
  assert.ok(profileSetup.includes(label), `${label} should be visibly required`);
}

for (const removedCopy of [
  'YOUR NAME *',
  'USERNAME *',
  '>Name</Text>',
  '>Username</Text>',
  '>Photo</Text>',
  '>Bio</Text>',
  '>Age</Text>',
  '>Gender</Text>',
  '>Country</Text>',
  '>Interests</Text>',
]) {
  assert.ok(!profileSetup.includes(removedCopy), `${removedCopy} should not be shown in profile setup`);
}

assert.match(profileSetup, /getUserDisplayName\(authUser\)/);
assert.match(profileSetup, /authUser\?\.username\?\.trim\(\)/);
assert.match(profileSetup, /COUNTRIES\.filter/);
assert.match(profileSetup, /Choose your country/);
assert.ok(countries.includes("'India'"));
assert.ok(countries.includes("'United States'"));

for (const validation of [
  /if \(!localPhotoAsset\)/,
  /if \(!trimmedBio\)/,
  /if \(selectedInterests\.length === 0\)/,
  /if \(!trimmedDateOfBirth\)/,
  /if \(!gender\)/,
  /if \(!trimmedCountry\)/,
]) {
  assert.match(profileSetup, validation);
}

for (const payloadField of [
  /profilePicUrl,/,
  /bio: bio\.trim\(\)/,
  /dateOfBirth: dateOfBirth\.trim\(\)/,
  /age: Number\(age\.trim\(\)\)/,
  /gender: gender!/,
  /country: country\.trim\(\)/,
  /interests: selectedInterests/,
]) {
  assert.match(profileSetup, payloadField);
}

assert.doesNotMatch(profileSetup, /name: name\.trim\(\)/);
assert.doesNotMatch(profileSetup, /username: username\.trim\(\)/);

assert.match(apiTypes, /country\?: string \| null/);
assert.match(apiTypes, /profileComplete\?: boolean/);
assert.match(onboardingService, /profileComplete === false/);
assert.match(appIndex, /user\?\.profileComplete/);

console.log('required profile setup checks passed');
