import { getSafeErrorMessage, getSafeErrorTitle } from './apiError';

export type AppMessageType = 'success' | 'error' | 'warning' | 'info';

export interface AppMessage {
  id: number;
  type: AppMessageType;
  title: string;
  message?: string;
  duration?: number;
}

type AppMessageInput = Omit<AppMessage, 'id'>;
type AppMessageListener = (message: AppMessage) => void;

let listener: AppMessageListener | null = null;
let nextMessageId = 1;

export const subscribeToAppMessages = (nextListener: AppMessageListener) => {
  listener = nextListener;

  return () => {
    if (listener === nextListener) {
      listener = null;
    }
  };
};

export const showAppMessage = (message: AppMessageInput) => {
  const safeMessage = message.message
    ? getSafeErrorMessage(message.message)
    : message.message;

  listener?.({
    ...message,
    title: getSafeErrorTitle(message.title),
    message: safeMessage,
    id: nextMessageId++,
  });
};
