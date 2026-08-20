import {
  AlertButton,
  AlertOptions,
} from 'react-native';
import { getSafeErrorMessage, getSafeErrorTitle } from './apiError';
import { AppMessageType, showAppMessage } from './appMessage';

export interface AppDialog {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
  type: AppMessageType;
}

type AppDialogListener = (dialog: AppDialog) => void;

let dialogListener: AppDialogListener | null = null;
let pendingDialog: AppDialog | null = null;
let nextDialogId = 1;

export const inferMessageType = (title: string): AppMessageType => {
  const normalizedTitle = title.toLowerCase();

  if (
    normalizedTitle.includes('error') ||
    normalizedTitle.includes('failed') ||
    normalizedTitle.includes('unable') ||
    normalizedTitle.includes('could not') ||
    normalizedTitle.includes("couldn't") ||
    normalizedTitle.includes('couldn’t') ||
    normalizedTitle.includes('wrong') ||
    normalizedTitle.includes('trouble')
  ) {
    return 'error';
  }

  if (
    normalizedTitle.includes('warning') ||
    normalizedTitle.includes('required') ||
    normalizedTitle.includes('invalid') ||
    normalizedTitle.includes('slow down') ||
    normalizedTitle.includes('offline') ||
    normalizedTitle.includes('not available') ||
    normalizedTitle.includes('unavailable')
  ) {
    return 'warning';
  }

  if (
    normalizedTitle.includes('success') ||
    normalizedTitle.includes('saved') ||
    normalizedTitle.includes('updated') ||
    normalizedTitle.includes('sent')
  ) {
    return 'success';
  }

  return 'info';
};

export const subscribeToAppDialogs = (listener: AppDialogListener) => {
  dialogListener = listener;

  if (pendingDialog) {
    listener(pendingDialog);
    pendingDialog = null;
  }

  return () => {
    if (dialogListener === listener) {
      dialogListener = null;
    }
  };
};

const showAppDialog = (
  title: string,
  message: string | undefined,
  buttons: AlertButton[],
  options?: AlertOptions
) => {
  const safeTitle = getSafeErrorTitle(title);
  const type = inferMessageType(safeTitle);
  const safeMessage = message ? getSafeErrorMessage(message) : message;
  const dialog: AppDialog = {
    id: nextDialogId++,
    title: safeTitle,
    message: safeMessage?.trim() || undefined,
    buttons,
    options,
    type,
  };

  if (dialogListener) {
    dialogListener(dialog);
  } else {
    pendingDialog = dialog;
  }
};

export const AppAlert = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) {
    if (buttons?.length) {
      const requiresDecision =
        buttons.length > 1 ||
        buttons.some(
          (button) =>
            Boolean(button.onPress) ||
            button.style === 'cancel' ||
            button.style === 'destructive'
        );

      if (requiresDecision) {
        showAppDialog(title, message, buttons, options);
        return;
      }
    }

    const safeTitle = getSafeErrorTitle(title);
    showAppMessage({
      type: inferMessageType(safeTitle),
      title: safeTitle,
      message: message?.trim() || undefined,
    });
  },
};
