import { IntegrationProvider } from '../types/integrations';

export interface IntegrationProviderConfig {
  key: IntegrationProvider;
  name: string;
  subtitle: string;
  logoUri: string;
  logoCreditHref?: string;
  fallback: string;
  accent: string;
  available: boolean;
}

// Temporary soft-disable: keep the completed coding integration code available
// for reactivation, but do not expose or load it until the product is ready.
export const CODING_INTEGRATIONS_ENABLED = false;

export const INTEGRATION_PROVIDERS: Record<IntegrationProvider, IntegrationProviderConfig> = {
  CODEFORCES: {
    key: 'CODEFORCES',
    name: 'Codeforces',
    subtitle: 'Competitive programming activity from public submissions',
    logoUri: 'https://codeforces.org/s/39343/images/codeforces-sponsored-by-ton.png',
    fallback: 'CF',
    accent: '#1F8ACB',
    available: CODING_INTEGRATIONS_ENABLED,
  },
  STRAVA: {
    key: 'STRAVA',
    name: 'Strava',
    subtitle: 'Fitness activity sync for running and cycling challenges',
    logoUri: 'https://images.icon-icons.com/2108/PNG/512/strava_icon_130820.png',
    logoCreditHref: 'https://icon-icons.com/authors/816-terence-eden',
    fallback: 'STRAVA',
    accent: '#FC4C02',
    available: false,
  },
  LEETCODE: {
    key: 'LEETCODE',
    name: 'LeetCode',
    subtitle: 'Coding practice progress for DSA challenges',
    logoUri: 'https://leetcode.com/static/images/LeetCode_logo_rvs.png',
    fallback: 'LC',
    accent: '#FFA116',
    available: CODING_INTEGRATIONS_ENABLED,
  },
  HEVY: {
    key: 'HEVY',
    name: 'Hevy',
    subtitle: 'Strength training submissions from Hevy workouts',
    logoUri: 'https://www.hevy.com/favicon.ico',
    fallback: 'HV',
    accent: '#7DFF9A',
    available: false,
  },
  HEALTH_CONNECT: {
    key: 'HEALTH_CONNECT',
    name: 'Android Health Connect',
    subtitle: 'Steps, workouts, and health data with user permission',
    logoUri: 'https://developer.android.com/static/downloads/assets/health_connect_logo_white.png',
    fallback: 'HC',
    accent: '#4285F4',
    available: false,
  },
};

export const INTEGRATION_PROVIDER_LIST = [
  INTEGRATION_PROVIDERS.CODEFORCES,
  INTEGRATION_PROVIDERS.LEETCODE,
  INTEGRATION_PROVIDERS.STRAVA,
  INTEGRATION_PROVIDERS.HEVY,
  INTEGRATION_PROVIDERS.HEALTH_CONNECT,
];
