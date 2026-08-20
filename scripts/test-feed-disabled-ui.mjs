import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const readBackend = (path) => readFileSync(new URL(`../../challengesphere/${path}`, import.meta.url), 'utf8');

const feedConstants = read('constants/feed.ts');
const feedTab = read('app/(tabs)/index.tsx');
const feedComingSoon = read('components/feed/FeedComingSoon.tsx');
const settings = read('app/settings.tsx');
const apiTypes = read('types/api.ts');
const userService = read('services/userService.ts');
const useUsers = read('hooks/useUsers.ts');

assert.match(feedConstants, /export const FEED_ENABLED = false;/);
assert.match(feedConstants, /Feed page will be coming soon after we have enough challengers\./);
assert.match(feedConstants, /Currently disabled until enough challengers join/);
assert.match(feedConstants, /export const formatChallengerCount = \(count\?: number\)/);

assert.match(apiTypes, /export interface UserCountResponse \{[\s\S]*totalUsers: number;/);
assert.match(userService, /async getTotalUserCount\(\): Promise<UserCountResponse>/);
assert.match(userService, /\/users\/count/);
assert.match(useUsers, /totalCount: \(\) => \[\.\.\.userKeys\.all, 'totalCount'\] as const/);
assert.match(useUsers, /export const useTotalUserCount = \(\)/);

assert.match(feedTab, /FEED_ENABLED \? <Feed\s*\/>/);
assert.match(feedTab, /<Feed\s*\/>/);
assert.match(feedTab, /FeedComingSoon/);
assert.match(feedComingSoon, /useTotalUserCount\(\)/);
assert.match(feedComingSoon, /Current challengers/);
assert.match(feedComingSoon, /formatChallengerCount\(totalUserCountData\?\.totalUsers\)/);
assert.match(feedComingSoon, /The feed is coming soon/, 'disabled feed should state its status directly');
assert.match(feedComingSoon, /react-native-reanimated/);
assert.doesNotMatch(feedComingSoon, /https?:\/\//, 'disabled feed must not wait for remote visuals');

assert.match(settings, /SectionHeader title="Feed"/);
assert.match(settings, /title="Feed Page"/);
assert.match(settings, /subtitle=\{FEED_SETTINGS_SUBTITLE\}/);
assert.match(settings, /value=\{FEED_ENABLED\}/);
assert.match(settings, /disabled=\{true\}/);

const backendController = readBackend('src/main/java/com/ironside/challengesphere/controller/UserController.java');
const backendService = readBackend('src/main/java/com/ironside/challengesphere/service/UserService.java');
const backendServiceImpl = readBackend('src/main/java/com/ironside/challengesphere/service/impl/UserServiceImpl.java');

assert.match(backendController, /@GetMapping\("\/count"\)/);
assert.match(backendController, /userService\.getTotalUserCount\(\)/);
assert.match(backendController, /Map\.of\("totalUsers", totalUsers\)/);
assert.match(backendService, /long getTotalUserCount\(\);/);
assert.match(backendServiceImpl, /public long getTotalUserCount\(\)/);
assert.match(backendServiceImpl, /userRepository\.count\(\)/);

console.log('disabled feed UI regression checks passed');
