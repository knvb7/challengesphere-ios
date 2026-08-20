import { Platform } from 'react-native';

export const IOS_ADS_ENABLED = process.env.EXPO_PUBLIC_IOS_ADS_ENABLED === 'true';

export const ADS_ENABLED_FOR_PLATFORM = Platform.OS === 'android'
  || (Platform.OS === 'ios' && IOS_ADS_ENABLED);
