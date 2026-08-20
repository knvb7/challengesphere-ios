import { ConfigContext, ExpoConfig } from 'expo/config';

const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || process.env.API_BASE_URL?.trim();
const DEFAULT_API_BASE_URL = 'https://pqea9mim4b.execute-api.ap-south-1.amazonaws.com/api/v1';
const API_BASE_URL = ENV_API_BASE_URL || DEFAULT_API_BASE_URL;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() || '';
const BUILD_TARGET = process.env.CHALLENGESPHERE_BUILD_PLATFORM?.trim().toLowerCase() || 'universal';
const IOS_ADS_SETTING = process.env.EXPO_PUBLIC_IOS_ADS_ENABLED?.trim().toLowerCase();
const IOS_ADS_ENABLED = IOS_ADS_SETTING === 'true';
const IS_PRODUCTION_BUILD = process.env.EAS_BUILD_PROFILE?.startsWith('production') ?? false;
const IS_EXPLICIT_IOS_BUILD = BUILD_TARGET === 'ios';
const INCLUDE_GOOGLE_MOBILE_ADS_PLUGIN = !IS_EXPLICIT_IOS_BUILD || IOS_ADS_ENABLED;
const CONTACTS_PERMISSION_MESSAGE = 'ChallengeSphere reads contacts on this device only so you can choose someone to invite; it does not upload your address book.';
const TRACKING_PERMISSION_MESSAGE = 'ChallengeSphere uses a device identifier to deliver and measure ads. Every app feature remains available if you ask the app not to track.';
const GOOGLE_SAMPLE_ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const GOOGLE_SAMPLE_ADMOB_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const ENV_ADMOB_ANDROID_APP_ID = process.env.ADMOB_ANDROID_APP_ID?.trim();
const ENV_ADMOB_IOS_APP_ID = process.env.ADMOB_IOS_APP_ID?.trim();
const ADMOB_ANDROID_APP_ID = ENV_ADMOB_ANDROID_APP_ID || GOOGLE_SAMPLE_ADMOB_ANDROID_APP_ID;
const ADMOB_IOS_APP_ID = ENV_ADMOB_IOS_APP_ID || GOOGLE_SAMPLE_ADMOB_IOS_APP_ID;
const ADMOB_APP_ID_PATTERN = /^ca-app-pub-\d{16}~\d{10}$/;
const REQUIRE_PRODUCTION_ADMOB_IDS = IS_PRODUCTION_BUILD
  || process.env.ADMOB_REQUIRE_PRODUCTION_IDS === 'true';
const UMP_PROGUARD_RULE = '-keep class com.google.android.gms.internal.consent_sdk.** { *; }';

const uniqueValues = <T,>(values: T[]): T[] => Array.from(new Set(values));

const pluginName = (plugin: NonNullable<ExpoConfig['plugins']>[number]): string =>
  (Array.isArray(plugin) ? plugin[0] ?? '' : plugin);

const pluginOptions = (
  plugins: ExpoConfig['plugins'],
  name: string,
): Record<string, unknown> => {
  const entry = plugins?.find((plugin) => pluginName(plugin) === name);
  if (!Array.isArray(entry) || !entry[1] || typeof entry[1] !== 'object') {
    return {};
  }
  return entry[1] as Record<string, unknown>;
};

const withUmpProguardRule = (existingRules: unknown): string => {
  const rules = typeof existingRules === 'string' ? existingRules.trim() : '';
  if (rules.includes(UMP_PROGUARD_RULE)) return rules;
  return [rules, UMP_PROGUARD_RULE].filter(Boolean).join('\n');
};

if (!API_BASE_URL.startsWith('https://')) {
  throw new Error('ChallengeSphere API_BASE_URL must use HTTPS.');
}

if (!ADMOB_APP_ID_PATTERN.test(ADMOB_ANDROID_APP_ID)
  || (IOS_ADS_ENABLED && !ADMOB_APP_ID_PATTERN.test(ADMOB_IOS_APP_ID))) {
  throw new Error('Enabled ChallengeSphere AdMob App IDs must use the ca-app-pub-…~… format.');
}

if (
  REQUIRE_PRODUCTION_ADMOB_IDS
  && (
    (BUILD_TARGET !== 'ios'
      && (!ENV_ADMOB_ANDROID_APP_ID || ADMOB_ANDROID_APP_ID === GOOGLE_SAMPLE_ADMOB_ANDROID_APP_ID))
    || (IOS_ADS_ENABLED
      && (!ENV_ADMOB_IOS_APP_ID || ADMOB_IOS_APP_ID === GOOGLE_SAMPLE_ADMOB_IOS_APP_ID))
  )
) {
  throw new Error(
    'Production builds require real AdMob App IDs for every platform where ads are enabled.',
  );
}

if (IS_PRODUCTION_BUILD && IS_EXPLICIT_IOS_BUILD && !['true', 'false'].includes(IOS_ADS_SETTING ?? '')) {
  throw new Error('Production iOS builds must explicitly set EXPO_PUBLIC_IOS_ADS_ENABLED to true or false.');
}

if (IS_PRODUCTION_BUILD && IS_EXPLICIT_IOS_BUILD && !REVENUECAT_IOS_API_KEY) {
  throw new Error('Production builds require EXPO_PUBLIC_REVENUECAT_IOS_API_KEY.');
}

console.log(`[app.config.ts] HTTPS API base URL → ${API_BASE_URL}`);
console.log(`[app.config.ts] build target → ${BUILD_TARGET}; iOS ads → ${IOS_ADS_ENABLED ? 'enabled' : 'disabled'}`);

export default ({ config }: ConfigContext): ExpoConfig => {
  const existingAdsOptions = pluginOptions(config.plugins, 'react-native-google-mobile-ads');
  const existingBuildProperties = pluginOptions(config.plugins, 'expo-build-properties');
  const existingAndroidBuildProperties = (
    existingBuildProperties.android && typeof existingBuildProperties.android === 'object'
      ? existingBuildProperties.android
      : {}
  ) as Record<string, unknown>;
  const retainedPlugins = (config.plugins ?? []).filter((plugin) => ![
    'expo-contacts',
    'expo-build-properties',
    'expo-tracking-transparency',
    'react-native-google-mobile-ads',
  ].includes(pluginName(plugin)));
  const adsPlugins: NonNullable<ExpoConfig['plugins']> = [];
  if (INCLUDE_GOOGLE_MOBILE_ADS_PLUGIN) {
    adsPlugins.push([
      'react-native-google-mobile-ads',
      {
        ...existingAdsOptions,
        androidAppId: ADMOB_ANDROID_APP_ID,
        ...(IOS_ADS_ENABLED || !IS_EXPLICIT_IOS_BUILD ? { iosAppId: ADMOB_IOS_APP_ID } : {}),
        delayAppMeasurementInit: true,
      },
    ]);
  }
  if (IS_EXPLICIT_IOS_BUILD && IOS_ADS_ENABLED) {
    adsPlugins.push([
      'expo-tracking-transparency',
      { userTrackingPermission: TRACKING_PERMISSION_MESSAGE },
    ]);
  }

  return {
    ...config,
    name: config.name ?? 'ChallengeSphere',
    slug: config.slug ?? 'challengesphere',
    plugins: [
      ...retainedPlugins,
      'expo-contacts',
      ...adsPlugins,
      [
        'expo-build-properties',
        {
          ...existingBuildProperties,
          android: {
            ...existingAndroidBuildProperties,
            extraProguardRules: withUmpProguardRule(existingAndroidBuildProperties.extraProguardRules),
          },
        },
      ],
    ],
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier ?? 'com.ironside.challengesphere',
      supportsTablet: true,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSAppTransportSecurity: {
          ...(config.ios?.infoPlist?.NSAppTransportSecurity as Record<string, unknown> | undefined),
          NSAllowsArbitraryLoads: false,
          NSAllowsLocalNetworking: false,
        },
        NSContactsUsageDescription: CONTACTS_PERMISSION_MESSAGE,
        LSApplicationQueriesSchemes: uniqueValues([
          ...((config.ios?.infoPlist?.LSApplicationQueriesSchemes as string[] | undefined) ?? []),
          'whatsapp',
        ]),
      },
    },
    android: {
      ...config.android,
      package: config.android?.package ?? 'com.challengesphere.app',
      permissions: uniqueValues([
        ...(config.android?.permissions ?? []),
        'READ_CONTACTS',
        'com.google.android.gms.permission.AD_ID',
      ]),
      adaptiveIcon: {
        foregroundImage: './assets/images/logo.png',
        backgroundColor: '#ffffff',
      },
    },
    extra: {
      ...config.extra,
      apiBaseUrl: API_BASE_URL,
      revenueCatIosApiKey: REVENUECAT_IOS_API_KEY,
      iosAdsEnabled: IOS_ADS_ENABLED,
    },
  };
};
