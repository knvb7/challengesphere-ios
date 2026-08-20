import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertButton,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppDialog,
  subscribeToAppDialogs,
} from '../utils/appAlert';

const TYPE_TREATMENT = {
  success: { icon: 'checkmark-circle-outline', accent: '#3fd28f' },
  error: { icon: 'alert-circle-outline', accent: '#ff6b70' },
  warning: { icon: 'warning-outline', accent: '#f6c453' },
  info: { icon: 'information-circle-outline', accent: '#a58cff' },
} as const;

const EXIT_ACTION_PATTERN = /\b(log\s*out|logout|exit|leave)\b/i;
const TRASH_ACTION_PATTERN = /\b(delete|remove|discard|clear)\b/i;
const BLOCK_ACTION_PATTERN = /\b(block|deactivate|decline)\b/i;

const getDialogTreatment = (dialog: AppDialog) => {
  if (EXIT_ACTION_PATTERN.test(dialog.title)) {
    return { icon: 'log-out-outline', accent: '#d23848' } as const;
  }

  if (TRASH_ACTION_PATTERN.test(dialog.title)) {
    return { icon: 'trash-outline', accent: '#d23848' } as const;
  }

  return TYPE_TREATMENT[dialog.type];
};

const getDestructiveButtonIcon = (buttonText: string) => {
  if (EXIT_ACTION_PATTERN.test(buttonText)) return 'log-out-outline';
  if (TRASH_ACTION_PATTERN.test(buttonText)) return 'trash-outline';
  if (BLOCK_ACTION_PATTERN.test(buttonText)) return 'ban-outline';
  return null;
};

export default function AppDialogHost() {
  const [dialog, setDialog] = useState<AppDialog | null>(null);

  useEffect(() => subscribeToAppDialogs(setDialog), []);

  const close = useCallback((invokeDismiss = true) => {
    if (!dialog) return;
    const onDismiss = invokeDismiss ? dialog.options?.onDismiss : undefined;
    setDialog(null);
    if (onDismiss) requestAnimationFrame(onDismiss);
  }, [dialog]);

  const pressButton = useCallback((button: AlertButton) => {
    setDialog(null);
    if (button.onPress) {
      requestAnimationFrame(() => button.onPress?.());
    }
  }, []);

  const cancelButton = useMemo(
    () => dialog?.buttons.find((button) => button.style === 'cancel'),
    [dialog]
  );

  const dismissFromBackdrop = useCallback(() => {
    if (!dialog || dialog.options?.cancelable === false) return;

    if (cancelButton) {
      pressButton(cancelButton);
      return;
    }

    close();
  }, [cancelButton, close, dialog, pressButton]);

  if (!dialog) return null;

  const treatment = getDialogTreatment(dialog);
  const buttons = dialog.buttons.length > 0 ? dialog.buttons : [{ text: 'OK' }];

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismissFromBackdrop}
    >
      <View style={styles.screen}>
        <Pressable
          accessibilityLabel="Close dialog"
          accessibilityRole="button"
          onPress={dismissFromBackdrop}
          style={styles.backdrop}
        />

        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.headingRow}>
            <View style={[styles.iconFrame, { backgroundColor: `${treatment.accent}1f` }]}>
              <Ionicons name={treatment.icon} size={24} color={treatment.accent} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{dialog.title}</Text>
              {!!dialog.message && <Text style={styles.message}>{dialog.message}</Text>}
            </View>
          </View>

          <View style={[styles.actions, buttons.length > 2 && styles.stackedActions]}>
            {buttons.map((button, index) => {
              const destructive = button.style === 'destructive';
              const cancel = button.style === 'cancel';
              const buttonText = button.text || 'OK';
              const destructiveIcon = destructive ? getDestructiveButtonIcon(buttonText) : null;

              return (
                <TouchableOpacity
                  key={`${button.text || 'Action'}-${index}`}
                  activeOpacity={0.8}
                  onPress={() => pressButton(button)}
                  style={[
                    styles.actionButton,
                    cancel && styles.cancelButton,
                    destructive && styles.destructiveButton,
                    buttons.length > 2 && styles.stackedButton,
                  ]}
                >
                  {destructiveIcon ? (
                    <Ionicons name={destructiveIcon} size={17} color="#ffffff" />
                  ) : null}
                  <Text style={[styles.actionText, cancel && styles.cancelText]}>
                    {buttonText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.74)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E7E3EF',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    marginBottom: 21,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconFrame: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
    paddingTop: 1,
  },
  title: {
    color: '#18142F',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  message: {
    color: '#a7a7ad',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  stackedActions: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    minHeight: 49,
    borderRadius: 16,
    backgroundColor: '#4700ec',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  stackedButton: {
    flex: 0,
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  destructiveButton: {
    backgroundColor: '#b93b45',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelText: {
    color: '#4700EC',
  },
});
