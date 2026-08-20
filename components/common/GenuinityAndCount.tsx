import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import hapticFeedback from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import GloriesModal from './GloriesModal';

interface GenuinityAndCountProps {
  genuineCount: number,
  ingenuineCount: number,
  submissionId?: number,
  isGloried?: boolean,
  isUngloried?: boolean,
  onGenuinePress?: () => void,
  onIngenuinePress?: () => void,
  onLongPressGlory?: () => void,
}

const GenuinityAndCount: React.FC<GenuinityAndCountProps> = ({
  genuineCount,
  ingenuineCount,
  submissionId,
  isGloried = false,
  isUngloried = false,
  onGenuinePress,
  onIngenuinePress,
  onLongPressGlory,
}) => {
  const [gloriesModalVisible, setGloriesModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const longPressTriggeredRef = useRef(false);
  const hasSubmissionId = typeof submissionId === 'number' && submissionId > 0;
  const canOpenGlories = !!onLongPressGlory || hasSubmissionId;

  const openGlories = () => {
    if (onLongPressGlory) {
      onLongPressGlory();
      return;
    }

    if (hasSubmissionId) {
      setGloriesModalVisible(true);
    }
  };

  const handleGenuinePress = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    hapticFeedback.like();
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
    onGenuinePress?.();
  };

  const handleIngenuinePress = () => {
    hapticFeedback.warning();
    onIngenuinePress?.();
  };

  const handleGenuineLongPress = () => {
    longPressTriggeredRef.current = true;
    hapticFeedback.longPress();
    openGlories();
  };

  const handleGloryCountPress = () => {
    if (!canOpenGlories) {
      handleGenuinePress();
      return;
    }
    hapticFeedback.selection();
    openGlories();
  };

  const handleGenuinePressOut = () => {
    setTimeout(() => {
      longPressTriggeredRef.current = false;
    }, 150);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.gloryPill, isGloried && styles.gloryPillActive]}>
          <LinearGradient
            colors={isGloried ? ['#F0ECFF', '#E4DBFF'] : ['#FFFFFF', '#F8F7FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gloryGradient}
          >
            <TouchableOpacity
              onPress={handleGenuinePress}
              onLongPress={handleGenuineLongPress}
              onPressOut={handleGenuinePressOut}
              delayLongPress={300}
              activeOpacity={0.82}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              style={styles.gloryIconButton}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons
                  name={isGloried ? 'sparkles' : 'sparkles-outline'}
                  size={18}
                  color={isGloried ? '#4700EC' : '#6F687A'}
                />
              </Animated.View>
            </TouchableOpacity>
            {genuineCount > 0 && (
              <TouchableOpacity
                onPress={handleGloryCountPress}
                onLongPress={handleGenuineLongPress}
                onPressOut={handleGenuinePressOut}
                delayLongPress={300}
                activeOpacity={0.78}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                style={styles.countButton}
              >
                <Text style={[styles.countText, isGloried && styles.countTextActive]}>
                  {genuineCount}
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        <TouchableOpacity
          onPress={handleIngenuinePress}
          activeOpacity={0.75}
          style={[styles.unGloryButton, isUngloried && styles.unGloryButtonActive]}
        >
          <Ionicons
            name={isUngloried ? 'close-circle' : 'close-circle-outline'}
            size={22}
            color={isUngloried ? '#D92D3F' : '#6F687A'}
          />
          {ingenuineCount > 0 && (
            <Text style={[styles.unGloryCount, isUngloried && styles.unGloryCountActive]}>
              {ingenuineCount}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      {hasSubmissionId && (
        <GloriesModal
          submissionId={submissionId}
          visible={gloriesModalVisible}
          onClose={() => setGloriesModalVisible(false)}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gloryPill: {
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D2E0',
    shadowColor: '#4700EC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  gloryPillActive: {
    borderColor: '#8F6BFF',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 2,
  },
  gloryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: 7,
  },
  gloryIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gloryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18142F',
    letterSpacing: 0.35,
  },
  gloryLabelActive: {
    color: '#4700EC',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5F5968',
  },
  countTextActive: {
    color: '#4700EC',
  },
  countButton: {
    minWidth: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unGloryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 22,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unGloryButtonActive: {
    backgroundColor: '#FFF1F2',
    borderColor: 'rgba(255, 82, 82, 0.48)',
  },
  unGloryCount: {
    fontSize: 11,
    color: '#777389',
    fontWeight: '600',
  },
  unGloryCountActive: {
    color: '#ff5252',
  },
});

export default GenuinityAndCount;
