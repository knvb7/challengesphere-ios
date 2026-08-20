export interface MotivationalMessage {
  greeting: string;
  title: string;
  subtitle: string;
}

export interface ResolvedMotivationalMessage extends MotivationalMessage {
  displayTitle: string;
}

export const MOTIVATIONAL_MESSAGES: MotivationalMessage[] = [
  { greeting: 'Hey', title: 'Champion', subtitle: 'Ready to conquer today?' },
  { greeting: 'Welcome', title: 'Warrior', subtitle: 'Your streak awaits!' },
  { greeting: 'Yo', title: 'Beast Mode', subtitle: 'Time to level up!' },
  { greeting: "What's up", title: 'Superstar', subtitle: 'Making progress every day!' },
  { greeting: 'Greetings', title: 'Rockstar', subtitle: "You're on fire!" },
  { greeting: 'Hey there', title: 'Legend', subtitle: 'Keep the momentum going!' },
  { greeting: 'Bonjour', title: 'Champ', subtitle: 'Another day, another victory!' },
  { greeting: 'Ciao', title: 'Hero', subtitle: 'Your dedication inspires!' },
  { greeting: 'Hola', title: 'Maverick', subtitle: 'Breaking limits daily!' },
  { greeting: 'Hey', title: 'Trailblazer', subtitle: 'Paving your own path!' },
  { greeting: 'Sup', title: 'Boss', subtitle: 'Running this challenge!' },
  { greeting: 'Welcome back', title: 'Machine', subtitle: 'Consistency is key!' },
  { greeting: 'Good to see you', title: 'Powerhouse', subtitle: 'Unstoppable energy!' },
  { greeting: 'Hey champion', title: 'GOAT', subtitle: 'Built different!' },
];

export const shouldShowProfileMotivationalTransition = (
  randomValue = Math.random(),
): boolean => randomValue < 0.05;

export const getRandomMotivationalMessage = (username: string): ResolvedMotivationalMessage => {
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
  const message = MOTIVATIONAL_MESSAGES[randomIndex];
  return {
    ...message,
    displayTitle: username ? `${username.charAt(0).toUpperCase() + username.slice(1)}` : message.title,
  };
};
