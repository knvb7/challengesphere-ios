import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_INVITE_CODE_KEY = '@challengesphere/pending-invite-code';
const INVITE_CODE_PATTERN = /^[A-Za-z0-9]{8,12}$/;
const INVITE_LINK_PATTERN = /(?:^|:\/\/|\/)invite\/([A-Za-z0-9]{8,12})(?:[/?#]|$)/i;

export const normalizeInviteCode = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return INVITE_CODE_PATTERN.test(normalized) ? normalized : '';
};

export const extractInviteCode = (value: string | null | undefined): string => {
  const directCode = normalizeInviteCode(value);
  if (directCode) return directCode;

  const match = value?.trim().match(INVITE_LINK_PATTERN);
  return normalizeInviteCode(match?.[1]);
};

class PendingInviteService {
  async save(inviteCode: string): Promise<boolean> {
    const normalized = normalizeInviteCode(inviteCode);
    if (!normalized) return false;

    await AsyncStorage.setItem(PENDING_INVITE_CODE_KEY, normalized);
    return true;
  }

  async get(): Promise<string | null> {
    const stored = await AsyncStorage.getItem(PENDING_INVITE_CODE_KEY);
    const normalized = normalizeInviteCode(stored);

    if (!normalized && stored) {
      await AsyncStorage.removeItem(PENDING_INVITE_CODE_KEY);
    }

    return normalized || null;
  }

  async clear(expectedInviteCode?: string): Promise<void> {
    if (expectedInviteCode) {
      const stored = await this.get();
      if (stored && stored !== normalizeInviteCode(expectedInviteCode)) return;
    }

    await AsyncStorage.removeItem(PENDING_INVITE_CODE_KEY);
  }
}

export const pendingInviteService = new PendingInviteService();
export default pendingInviteService;
