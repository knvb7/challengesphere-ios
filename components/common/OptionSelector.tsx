import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface OptionSelectorProps {
  label: string;
  options: string[];
  selectedOption: string;
  onSelect: (option: string) => void;
  required?: boolean;
  error?: string;
}

const OptionSelector: React.FC<OptionSelectorProps> = ({
  label,
  options,
  selectedOption,
  onSelect,
  required = false,
  error,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.option,
              selectedOption === option && styles.selectedOption,
              error && styles.optionError,
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.optionText,
                selectedOption === option && styles.selectedOptionText,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: '#18142F',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  required: {
    color: '#ff4444',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDB6C7',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedOption: {
    backgroundColor: '#4700ecff',
    borderColor: '#4700ecff',
  },
  optionError: {
    borderColor: '#ff4444',
  },
  optionText: {
    color: '#5F5968',
    fontSize: 13,
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#fff',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 13,
    marginTop: 6,
  },
});

export default OptionSelector;
