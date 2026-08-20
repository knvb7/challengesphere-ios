import {
  contentReportService,
  type ContentReportReason,
  type ContentReportTargetType,
} from '@/services/contentReportService';
import { LEGAL_URLS } from '@/constants/legalLinks';
import { AppAlert as Alert } from '@/utils/appAlert';
import { getApiErrorMessage } from '@/utils/apiError';
import { Linking } from 'react-native';

interface ContentReportTarget {
  targetType: ContentReportTargetType;
  targetId: number;
  label: string;
  onReported?: () => void;
}

const submitReport = async (
  target: ContentReportTarget,
  reason: ContentReportReason,
) => {
  try {
    const response = await contentReportService.report(
      target.targetType,
      target.targetId,
      reason,
    );
    Alert.alert('Report received', response.message, [
      {
        text: 'Contact support',
        onPress: () => {
          target.onReported?.();
          void Linking.openURL(LEGAL_URLS.support);
        },
      },
      { text: 'Done', onPress: target.onReported },
    ]);
  } catch (error) {
    Alert.alert(
      'Could not send report',
      getApiErrorMessage(error, 'Please try again.'),
    );
  }
};

export const showContentReportReasons = (target: ContentReportTarget) => {
  if (!Number.isInteger(target.targetId) || target.targetId <= 0) {
    Alert.alert('Could not send report', `This ${target.label} is not available.`);
    return;
  }

  Alert.alert(`Report ${target.label}?`, 'Choose the reason that best fits.', [
    { text: 'Child safety concern', onPress: () => void submitReport(target, 'CHILD_SAFETY') },
    { text: 'Harassment or bullying', onPress: () => void submitReport(target, 'HARASSMENT') },
    { text: 'Hate or discrimination', onPress: () => void submitReport(target, 'HATE') },
    { text: 'Nudity or sexual content', onPress: () => void submitReport(target, 'NUDITY') },
    { text: 'Violence or threats', onPress: () => void submitReport(target, 'VIOLENCE') },
    { text: 'Self-harm concern', onPress: () => void submitReport(target, 'SELF_HARM') },
    { text: 'Spam or scam', onPress: () => void submitReport(target, 'SPAM') },
    { text: 'Other', onPress: () => void submitReport(target, 'OTHER') },
    { text: 'Cancel', style: 'cancel' },
  ]);
};
