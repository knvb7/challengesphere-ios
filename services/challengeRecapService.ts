import AsyncStorage from '@react-native-async-storage/async-storage';

const RECAP_SEEN_VALUE = 'true';

function getChallengeRecapSeenKey(userId: number, challengeId: number) {
  return `challenge-recap-seen:${userId}:${challengeId}`;
}

class ChallengeRecapService {
  async hasSeen(userId: number, challengeId: number): Promise<boolean> {
    if (userId <= 0 || challengeId <= 0) return true;

    try {
      const value = await AsyncStorage.getItem(
        getChallengeRecapSeenKey(userId, challengeId),
      );
      return value === RECAP_SEEN_VALUE;
    } catch {
      return false;
    }
  }

  async markSeen(userId: number, challengeId: number): Promise<void> {
    if (userId <= 0 || challengeId <= 0) return;

    try {
      await AsyncStorage.setItem(
        getChallengeRecapSeenKey(userId, challengeId),
        RECAP_SEEN_VALUE,
      );
    } catch {
    }
  }
}

export const challengeRecapService = new ChallengeRecapService();
