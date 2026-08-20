import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React from 'react';
import { StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];
    
    if (disabled) {
      return [...baseStyle, styles.disabled];
    } else {
      return [...baseStyle, styles[variant]];
    }
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${size}Text`]];
    
    if (disabled) {
      return [...baseStyle, styles.disabledText];
    } else {
      return [...baseStyle, styles[`${variant}Text`]];
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sizes
  small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  medium: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 18,
  },
  // Variants
  primary: {
    backgroundColor: '#4700ecff',
  },
  secondary: {
    backgroundColor: '#333',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4700ecff',
  },
  disabled: {
    backgroundColor: '#666',
  },
  // Text styles
  text: {
    fontWeight: '600',
  },
  smallText: {
    fontSize: 13,
  },
  mediumText: {
    fontSize: 15,
  },
  largeText: {
    fontSize: 17,
  },
  primaryText: {
    color: '#18142F',
  },
  secondaryText: {
    color: '#18142F',
  },
  outlineText: {
    color: '#4700ecff',
  },
  disabledText: {
    color: '#777389',
  },
});

export default CustomButton;
