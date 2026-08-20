import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  CHALLENGE_VISIBILITY_FILTER_OPTIONS,
  getChallengeVisibilityFilterLabel,
  type ChallengeVisibilityFilter,
} from '../../utils/challengeVisibilityFilter';

type ChallengeVisibilityDropdownProps = {
  value: ChallengeVisibilityFilter;
  onChange: (value: ChallengeVisibilityFilter) => void;
  style?: StyleProp<ViewStyle>;
};

export default function ChallengeVisibilityDropdown({
  value,
  onChange,
  style,
}: ChallengeVisibilityDropdownProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = getChallengeVisibilityFilterLabel(value);
  const selectedIcon =
    CHALLENGE_VISIBILITY_FILTER_OPTIONS.find((option) => option.value === value)
      ?.icon ?? 'filter';

  const selectFilter = (nextValue: ChallengeVisibilityFilter) => {
    setOpen(false);
    if (nextValue !== value) {
      onChange(nextValue);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen((current) => !current)}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Filter challenges by visibility"
      >
        <Ionicons name={selectedIcon} size={15} color="#18142F" />
        <Text style={styles.triggerText}>{selectedLabel}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.menu}>
          {CHALLENGE_VISIBILITY_FILTER_OPTIONS.map((option) => {
            const selected = option.value === value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => selectFilter(option.value)}
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View
                  style={[
                    styles.optionIcon,
                    selected && styles.optionIconSelected,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={15}
                    color={selected ? '#FFFFFF' : '#18142F'}
                  />
                </View>
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {selected && (
                  <Ionicons name="checkmark" size={16} color="#5B3FE5" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    position: 'relative',
    zIndex: 20,
  },
  trigger: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  triggerText: {
    color: '#18142F',
    fontSize: 12,
    fontWeight: '700',
  },
  menu: {
    position: 'absolute',
    top: 42,
    right: 0,
    width: 184,
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 12,
    zIndex: 30,
  },
  option: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  optionSelected: {
    backgroundColor: '#F0ECFF',
  },
  optionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
  },
  optionIconSelected: {
    backgroundColor: '#4700ec',
  },
  optionText: {
    flex: 1,
    color: '#655F70',
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#5B3FE5',
  },
});
