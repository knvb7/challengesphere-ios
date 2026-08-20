import { AppAlert as Alert } from './appAlert';

export const confirmAccountDeletionEntry = (onContinue: () => void) => {
  Alert.alert(
    'Account deletion warning (1 of 3)',
    'Deleting your account is permanent. Do you really want to continue? You will still need to type DELETE and confirm one final warning.',
    [
      { text: 'No, keep my account', style: 'cancel' },
      {
        text: 'Yes, review deletion',
        style: 'destructive',
        onPress: onContinue,
      },
    ],
    { cancelable: true },
  );
};
