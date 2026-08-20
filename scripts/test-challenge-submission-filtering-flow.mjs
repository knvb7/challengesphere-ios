import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');
const readBackend = (relativePath) => readFileSync(path.join(root, '..', 'challengesphere', relativePath), 'utf8');

const challengeDetails = read('app/challenge-details.tsx');
assert.match(challengeDetails, /handleParticipantSubmissionsPress/);
assert.match(challengeDetails, /pathname:\s*['"]\/challenge-submissions['"]/);
assert.match(challengeDetails, /userId:\s*participant\.id\.toString\(\)/);
assert.match(challengeDetails, /readOnly:\s*participant\.id === CURRENT_USER_ID \? ['"]false['"] : ['"]true['"]/);
assert.match(challengeDetails, /accessibilityLabel=\{`View \$\{participant\.username\}'s challenge submissions`\}/);

const globalDetails = read('app/global-challenge-details.tsx');
assert.match(globalDetails, /handleParticipantSubmissionsPress/);
assert.match(globalDetails, /pathname:\s*['"]\/challenge-submissions['"]/);
assert.match(globalDetails, /userId:\s*participant\.id\.toString\(\)/);
assert.match(globalDetails, /readOnly:\s*participant\.id === CURRENT_USER_ID \? ['"]false['"] : ['"]true['"]/);

const challengeSubmissions = read('app/challenge-submissions.tsx');
assert.match(challengeSubmissions, /SUBMISSIONS_PAGE_SIZE\s*=\s*20/);
assert.match(challengeSubmissions, /loadedSubmissions/);
assert.match(challengeSubmissions, /setSubmissionPage\(\(page\) => page \+ 1\)/);
assert.match(challengeSubmissions, /Load more submissions/);
assert.match(challengeSubmissions, /if \(!isOwnTimeline\)\s*\{\s*return Array\.from\(submissionMap\.keys\(\)\)\.sort/);

const globalSubmissions = read('app/global-submissions.tsx');
assert.match(globalSubmissions, /GlobalSubmissionSort/);
assert.match(globalSubmissions, /GLOBAL_SUBMISSIONS_PAGE_SIZE\s*=\s*24/);
assert.match(globalSubmissions, /participantQuery/);
assert.match(globalSubmissions, /selectedSort/);
assert.match(globalSubmissions, /Filter by participant/);
assert.match(globalSubmissions, /handleResetFilters/);
assert.match(globalSubmissions, /activeFilterCount/);
assert.match(globalSubmissions, /selectedDayLabel/);
assert.match(globalSubmissions, /Reset submission filters/);
assert.match(globalSubmissions, /SORT_OPTIONS\.map/);
assert.match(globalSubmissions, /ListFooterComponent=\{renderFooter\}/);
assert.match(globalSubmissions, /setSubmissionPage\(\(page\) => page \+ 1\)/);
assert.match(globalSubmissions, /useGlobalChallengeSubmissionsByDay\([\s\S]*selectedSort,[\s\S]*participantQuery/);

const hooks = read('hooks/useChallenges.ts');
assert.match(hooks, /GlobalSubmissionSort/);
assert.match(hooks, /participantQuery\.trim\(\)\.toLowerCase\(\)/);
assert.match(hooks, /getGlobalChallengeSubmissionsByDay\(challengeId, dayNumber, callerId, page, pageSize, sortBy, participantQuery\)/);

const service = read('services/challengeService.ts');
assert.match(service, /sortBy:\s*GlobalSubmissionSort\s*=\s*['"]newest['"]/);
assert.match(service, /participantQuery\s*=\s*['"]/);
assert.match(service, /params\.append\(['"]sortBy['"], sortBy\)/);
assert.match(service, /const normalizedParticipantQuery = participantQuery\.trim\(\)/);
assert.match(service, /params\.append\(['"]participantQuery['"], normalizedParticipantQuery\)/);

const backendController = readBackend('src/main/java/com/ironside/challengesphere/controller/SubmissionController.java');
assert.match(backendController, /@RequestParam\(defaultValue = "newest"\) String sortBy/);
assert.match(backendController, /@RequestParam\(required = false\) String participantQuery/);

const backendService = readBackend('src/main/java/com/ironside/challengesphere/service/impl/SubmissionServiceImpl.java');
assert.match(backendService, /normalizeGlobalSubmissionSort/);
assert.match(backendService, /findVisibleByChallengeIdAndDayNumberNewest/);
assert.match(backendService, /findVisibleByChallengeIdAndDayNumberOldest/);
assert.match(backendService, /findVisibleByChallengeIdAndDayNumberMostGlories/);

const backendRepository = readBackend('src/main/java/com/ironside/challengesphere/repository/SubmissionRepository.java');
assert.match(backendRepository, /ORDER BY day_number DESC, submission_time DESC, id DESC/);
assert.match(backendRepository, /CAST\(:participantQuery AS TEXT\) IS NULL/);
assert.match(backendRepository, /ORDER BY s\.glories_count DESC/);

console.log('challenge submission filtering flow checks passed');
