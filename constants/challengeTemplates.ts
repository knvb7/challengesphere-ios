export const CHALLENGE_TEMPLATE_AVAILABLE_THROUGH = '2027-07-31' as const;

export const CHALLENGE_TEMPLATE_CATEGORIES = [
  'All',
  'Fun',
  'Fitness',
  'Health',
  'Learning',
  'Productivity',
  'Social',
  'Creativity',
  'Lifestyle',
] as const;

export type ChallengeTemplateCategory = Exclude<
  (typeof CHALLENGE_TEMPLATE_CATEGORIES)[number],
  'All'
>;

export type ChallengeTemplateFallbackKey =
  | 'coding'
  | 'fitness'
  | 'health'
  | 'learning'
  | 'creativity'
  | 'productivity'
  | 'lifestyle';

export type ChallengeTemplateDuration =
  | '1 Day'
  | '3 Days'
  | '1 Week'
  | '2 Weeks'
  | '1 Month'
  | '3 Months'
  | '6 Months'
  | '1 Year';

export interface ChallengeTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly categories: readonly string[];
  readonly challengeMode: 'DAILY' | 'ONE_OFF';
  readonly proofMode: 'FLEXIBLE' | 'PHOTO_REQUIRED';
  readonly duration: ChallengeTemplateDuration;
  readonly rules: string;
  readonly rewards: string;
  readonly cadenceLabel: string;
  readonly proofPrompt: string;
  readonly availabilityThrough: typeof CHALLENGE_TEMPLATE_AVAILABLE_THROUGH;
  readonly fallbackKey: ChallengeTemplateFallbackKey;
}

type ChallengeTemplateSeed = Omit<
  ChallengeTemplate,
  'rules' | 'rewards' | 'proofMode' | 'availabilityThrough'
> & {
  readonly actionRule: string;
  readonly proofMode?: ChallengeTemplate['proofMode'];
};

const createTemplate = ({ actionRule, proofMode = 'PHOTO_REQUIRED', ...template }: ChallengeTemplateSeed): ChallengeTemplate => ({
  ...template,
  proofMode,
  rules: proofMode === 'PHOTO_REQUIRED'
    ? `${actionRule} Use a safe, accessible version that works for you. ${template.proofPrompt} Keep exact locations, private messages, personal details, and other people out of the photo unless they have clearly agreed to be shown.`
    : `${actionRule} Use a safe, accessible version that works for you. Check in with a short caption; a photo is optional. If you add one, follow this privacy-safe idea: ${template.proofPrompt} Keep exact locations, private messages, personal details, and other people out of the photo unless they have clearly agreed to be shown.`,
  rewards: 'Celebrate the check-ins together with encouragement, not pressure or punishment.',
  availabilityThrough: CHALLENGE_TEMPLATE_AVAILABLE_THROUGH,
});

/**
 * Official, evergreen quick starts designed for private friend challenges.
 * Flexible/text-only submissions are currently on hold, so every launch template
 * requires a photo and short caption.
 */
export const CHALLENGE_TEMPLATES: readonly ChallengeTemplate[] = [
  createTemplate({
    id: 'move-your-way-10',
    title: 'Move Your Way 10',
    description: 'Invite friends to choose any comfortable movement for ten minutes and cheer on every kind of progress.',
    categories: ['Fitness', 'Health'],
    challengeMode: 'DAILY',
    duration: '2 Weeks',
    cadenceLabel: 'Daily · 2 weeks',
    actionRule: 'Move for about ten minutes at your own comfortable pace; walking, rolling, seated movement, stretching, dance, and assisted movement all count.',
    proofPrompt: 'Post a photo of your shoes, wheels, timer, or movement space, then caption the movement you chose.',
    fallbackKey: 'fitness',
  }),
  createTemplate({
    id: 'stretch-and-reset',
    title: 'Stretch & Reset',
    description: 'Take a short, gentle reset with friends using stretches or mobility movements that feel comfortable.',
    categories: ['Fitness', 'Health'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Spend three to five minutes on gentle stretching or mobility, stopping any movement that feels painful or unsafe.',
    proofPrompt: 'Post a photo of your chair, mat, or stretch space and caption the movement that felt best.',
    fallbackKey: 'fitness',
  }),
  createTemplate({
    id: 'walk-roll-or-wander',
    title: 'Walk, Roll or Wander',
    description: 'Take a comfortable change-of-scene break, indoors or outside, and compare what everyone notices.',
    categories: ['Fun', 'Fitness', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '2 Weeks',
    cadenceLabel: 'Daily · 2 weeks',
    actionRule: 'Choose a short walk, roll, assisted outing, or indoor route that is comfortable and permitted for you.',
    proofPrompt: 'Post a close-up photo of shoes, wheels, a texture, or a path detail and caption one thing you noticed; avoid addresses and recognisable landmarks.',
    fallbackKey: 'fitness',
  }),
  createTemplate({
    id: 'one-song-dance-break',
    title: 'One-Song Dance Break',
    description: 'Pick one song, move in any way that feels good, and bring a playful energy boost to your group.',
    categories: ['Fun', 'Fitness', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Move for one song using standing, seated, upper-body, or imagined choreography; keep the space clear and comfortable.',
    proofPrompt: 'Post a photo of headphones, a speaker, or your dance space and caption the mood you picked.',
    fallbackKey: 'fitness',
  }),
  createTemplate({
    id: 'hydration-hello',
    title: 'Hydration Hello',
    description: 'Pause for a drink that suits you and use the daily check-in as a friendly reminder, not a volume contest.',
    categories: ['Health', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '2 Weeks',
    cadenceLabel: 'Daily · 2 weeks',
    actionRule: 'Take one mindful drink that is appropriate for you; there is no required amount and personal medical guidance always comes first.',
    proofPrompt: 'Post a photo of your cup or bottle and caption when the reminder helped.',
    fallbackKey: 'health',
  }),
  createTemplate({
    id: 'one-calm-minute',
    title: 'One Calm Minute',
    description: 'Make one quiet minute part of the day and swap simple ways to pause with your challenge group.',
    categories: ['Health', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Pause for one minute with a calming activity of your choice, such as quiet breathing, listening, or noticing your surroundings.',
    proofPrompt: 'Post a photo of a calming object, texture, or space and caption what helped you pause.',
    fallbackKey: 'health',
  }),
  createTemplate({
    id: 'wind-down-win',
    title: 'Wind-Down Win',
    description: 'Try one small ritual before your main sleep period and share ideas without comparing sleep scores.',
    categories: ['Health', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '2 Weeks',
    cadenceLabel: 'Daily · 2 weeks',
    actionRule: 'Choose one comfortable wind-down action before your main sleep period, without setting a required bedtime or sleep target.',
    proofPrompt: 'Post a close-up photo of a book, lamp, cup, or other ritual object and caption the ritual you chose.',
    fallbackKey: 'health',
  }),
  createTemplate({
    id: 'fresh-view-break',
    title: 'Fresh View Break',
    description: 'Step away from the usual view for a few minutes—outside, by a window, or elsewhere indoors.',
    categories: ['Health', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Take a short break in any comfortable setting that gives you a change of view; outside is always optional.',
    proofPrompt: 'Post a close-up photo of a colour, shadow, plant, or texture and caption what caught your attention; do not reveal your exact location.',
    fallbackKey: 'health',
  }),
  createTemplate({
    id: 'read-for-ten',
    title: 'Read for Ten',
    description: 'Read or listen for ten minutes in any format or language, then trade recommendations with friends.',
    categories: ['Learning', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '2 Weeks',
    cadenceLabel: 'Daily · 2 weeks',
    actionRule: 'Spend about ten minutes with a book, article, audiobook, Braille text, or another reading format you enjoy.',
    proofPrompt: 'Post a photo of the cover, reader, headphones, or bookmark and caption one spoiler-free thought; hide private notes and notifications.',
    fallbackKey: 'learning',
  }),
  createTemplate({
    id: 'learn-one-share-one',
    title: 'Learn One, Share One',
    description: 'Learn one small thing each day and make the group smarter through friendly, bite-sized discoveries.',
    categories: ['Learning', 'Social'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Learn one small, non-sensitive fact or technique from a source you trust and explain it in your own words.',
    proofPrompt: 'Post a photo of a relevant object or notes with private details covered, then caption what you learned and name the source.',
    fallbackKey: 'learning',
  }),
  createTemplate({
    id: 'word-around-the-world',
    title: 'Word Around the World',
    description: 'Teach your friends a useful word or phrase from any language and celebrate how differently people communicate.',
    categories: ['Learning', 'Social'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Choose a respectful word or short phrase, check its meaning, and include the language or signing system it comes from.',
    proofPrompt: 'Post a photo of the word written or typed by you and caption its meaning and pronunciation or usage.',
    fallbackKey: 'learning',
  }),
  createTemplate({
    id: 'one-focus-sprint',
    title: 'One Focus Sprint',
    description: 'Choose one task, focus for a short block, and let your friends provide gentle accountability.',
    categories: ['Productivity', 'Learning'],
    challengeMode: 'DAILY',
    duration: '2 Weeks',
    cadenceLabel: 'Daily · 2 weeks',
    actionRule: 'Choose one suitable task and focus on it for ten to twenty-five minutes, taking any breaks or accommodations you need.',
    proofPrompt: 'Post a photo of a timer or cleared workspace and caption the task category; hide screens, documents, and confidential information.',
    fallbackKey: 'productivity',
  }),
  createTemplate({
    id: 'five-minute-reset',
    title: 'Five-Minute Reset',
    description: 'Spend five minutes improving one tiny physical or digital space and enjoy the small win together.',
    categories: ['Productivity', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Reset one small area for about five minutes without lifting, discarding, or handling anything unsafe.',
    proofPrompt: 'Post a tightly cropped photo of the area or an object from it and caption what changed; avoid revealing home, work, or account details.',
    fallbackKey: 'productivity',
  }),
  createTemplate({
    id: 'tomorrows-top-three',
    title: "Tomorrow's Top Three",
    description: 'Choose up to three priorities for the next day and build a calm planning rhythm with friends.',
    categories: ['Productivity', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '2 Weeks',
    cadenceLabel: 'Daily · 2 weeks',
    actionRule: 'Write up to three realistic priorities for your next day; the tasks themselves can stay completely private.',
    proofPrompt: 'Post a photo of your pen, closed planner, or a list with every private word covered and caption only the theme of your plan.',
    fallbackKey: 'productivity',
  }),
  createTemplate({
    id: 'practice-a-small-skill',
    title: 'Practice a Small Skill',
    description: 'Pick a safe skill you already want to improve and let your group make consistent practice more fun.',
    categories: ['Learning', 'Productivity'],
    challengeMode: 'DAILY',
    duration: '2 Weeks',
    cadenceLabel: 'Daily · 2 weeks',
    actionRule: 'Practice one safe, age-appropriate skill for a short session, using suitable supervision or instruction where needed.',
    proofPrompt: 'Post a photo of safe materials or your work in progress and caption one small improvement; do not demonstrate risky tools or stunts.',
    fallbackKey: 'learning',
  }),
  createTemplate({
    id: 'curiosity-capture',
    title: 'Curiosity Capture',
    description: 'Notice one everyday question, look for a reliable answer, and bring the most interesting discoveries back to your group.',
    categories: ['Learning', 'Creativity'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Pick one harmless everyday question and check a reliable source before sharing a short answer in your own words.',
    proofPrompt: 'Post a photo of the object, sketch, or notes that sparked the question and caption the answer plus the source.',
    fallbackKey: 'learning',
  }),
  createTemplate({
    id: 'appreciation-ping',
    title: 'Appreciation Ping',
    description: 'Give someone a sincere thank-you and build a warmer group habit without making private conversations public.',
    categories: ['Social', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Offer one respectful thank-you or note of appreciation with no expectation that the other person responds.',
    proofPrompt: 'Post a neutral photo of a thank-you card, object, or colour and caption what kind of appreciation you shared; never post the message or recipient.',
    fallbackKey: 'lifestyle',
  }),
  createTemplate({
    id: 'twenty-minutes-together',
    title: 'Twenty Minutes Together',
    description: 'Plan one focused shared activity online or offline and make a simple memory with someone you trust.',
    categories: ['Social', 'Lifestyle'],
    challengeMode: 'ONE_OFF',
    duration: '1 Day',
    cadenceLabel: 'One time · Any day',
    actionRule: 'Spend about twenty focused minutes on a mutually agreed activity with a friend, family member, or existing trusted group.',
    proofPrompt: 'Post a photo of the game, craft, snack, call setup, or other activity object and caption what you did; show people only with their permission.',
    fallbackKey: 'lifestyle',
  }),
  createTemplate({
    id: 'try-a-friends-pick',
    title: "Try a Friend's Pick",
    description: 'Ask a friend for one accessible recommendation, try it, and compare what each person chose.',
    categories: ['Fun', 'Social', 'Learning'],
    challengeMode: 'ONE_OFF',
    duration: '1 Day',
    cadenceLabel: 'One time · Any day',
    actionRule: 'Try one safe recommendation that fits your time, budget, access needs, and personal boundaries; declining a suggestion is always okay.',
    proofPrompt: 'Post a photo of the recommended item or activity and caption your reaction without naming the friend unless they consent.',
    fallbackKey: 'lifestyle',
  }),
  createTemplate({
    id: 'kindness-relay',
    title: 'Kindness Relay',
    description: 'Do one small, respectful act of kindness and inspire friends through the action—not the recipient.',
    categories: ['Social', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Choose a small helpful action that respects consent, property, local rules, and the other person\'s dignity.',
    proofPrompt: 'Post a photo of an object that represents the action and caption its category; do not photograph or identify the recipient.',
    fallbackKey: 'lifestyle',
  }),
  createTemplate({
    id: 'same-sky-snapshot',
    title: 'Same-Sky Snapshot',
    description: 'Share one patch of sky with friends and enjoy how the light, colour, and weather differ across the group.',
    categories: ['Social', 'Creativity'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Photograph the sky only from a safe, permitted place; staying indoors and shooting through a window both count.',
    proofPrompt: 'Post a sky photo cropped to remove addresses, landmarks, reflections, and location clues, then caption the colour or mood.',
    fallbackKey: 'creativity',
  }),
  createTemplate({
    id: 'tiny-creative',
    title: 'Tiny Creative',
    description: 'Make something for five minutes in any medium and let experimentation count more than polish.',
    categories: ['Creativity', 'Lifestyle'],
    challengeMode: 'DAILY',
    duration: '2 Weeks',
    cadenceLabel: 'Daily · 2 weeks',
    actionRule: 'Create for about five minutes using a safe medium you already have; drawing, writing, music, movement, arranging, and crafting all count.',
    proofPrompt: 'Post a photo of your materials or work in progress and caption what you experimented with.',
    fallbackKey: 'creativity',
  }),
  createTemplate({
    id: 'seven-day-photo-quest',
    title: 'Seven-Day Photo Quest',
    description: 'Set a simple daily theme—such as colour, texture, shape, or light—and compare creative interpretations.',
    categories: ['Fun', 'Creativity', 'Social'],
    challengeMode: 'DAILY',
    proofMode: 'PHOTO_REQUIRED',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Take one original photo responding to the group\'s daily theme while respecting people, property, and photography rules.',
    proofPrompt: 'Post the themed photo with a short caption; avoid faces, badges, addresses, screens, and exact-location clues.',
    fallbackKey: 'creativity',
  }),
  createTemplate({
    id: 'make-it-together',
    title: 'Make It Together',
    description: 'Create one small thing with a friend, online or offline, and celebrate the finished collaboration.',
    categories: ['Creativity', 'Social'],
    challengeMode: 'ONE_OFF',
    duration: '1 Day',
    cadenceLabel: 'One time · Any day',
    actionRule: 'Agree on a safe, low-pressure creation with someone you already know and make sure every contributor is comfortable with what is shared.',
    proofPrompt: 'Post a photo of the shared materials or result and caption how you collaborated; name or show collaborators only with permission.',
    fallbackKey: 'creativity',
  }),
  createTemplate({
    id: 'reuse-once',
    title: 'Reuse Once',
    description: 'Find one practical way to reuse, repair, refill, borrow, or repurpose something you already have.',
    categories: ['Lifestyle', 'Creativity'],
    challengeMode: 'DAILY',
    duration: '1 Week',
    cadenceLabel: 'Daily · 1 week',
    actionRule: 'Choose one clean, safe item to reuse, repair, refill, borrow, or repurpose without handling hazardous materials or buying anything new.',
    proofPrompt: 'Post a close-up photo of the item and caption how it got another use; remove labels, receipts, addresses, and personal details.',
    fallbackKey: 'lifestyle',
  }),
];

export const getChallengeTemplateById = (
  templateId?: string | null,
): ChallengeTemplate | undefined => {
  const normalizedId = templateId?.trim().toLowerCase();
  if (!normalizedId) return undefined;
  return CHALLENGE_TEMPLATES.find((template) => template.id === normalizedId);
};

export const getAvailableChallengeTemplates = (
  asOf: Date = new Date(),
): readonly ChallengeTemplate[] => {
  const dateKey = asOf.toISOString().slice(0, 10);
  return CHALLENGE_TEMPLATES.filter(
    (template) => dateKey <= template.availabilityThrough,
  );
};
