import React from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View } from 'react-native';

interface CustomTextInputProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  autoGrow?: boolean;
  labelStyle?: StyleProp<TextStyle>;
}

const CustomTextInput: React.FC<CustomTextInputProps> = ({
  label,
  error,
  helperText,
  required = false,
  autoGrow = false,
  labelStyle,
  style,
  multiline,
  onContentSizeChange,
  scrollEnabled,
  ...props
}) => {
  const [contentHeight, setContentHeight] = React.useState<number>();
  const shouldAutoGrow = autoGrow && Boolean(multiline);
  const flattenedInputStyle = StyleSheet.flatten(style);
  const configuredMinHeight = typeof flattenedInputStyle?.minHeight === 'number'
    ? flattenedInputStyle.minHeight
    : 0;
  const autoGrowMinHeight = shouldAutoGrow && contentHeight !== undefined
    ? Math.max(configuredMinHeight, contentHeight)
    : undefined;

  const handleContentSizeChange: NonNullable<TextInputProps['onContentSizeChange']> = (event) => {
    onContentSizeChange?.(event);

    if (shouldAutoGrow) {
      const nextHeight = Math.ceil(event.nativeEvent.contentSize.height);
      setContentHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, labelStyle]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
          autoGrowMinHeight !== undefined && { minHeight: autoGrowMinHeight },
        ]}
        placeholderTextColor="#666"
        multiline={multiline}
        scrollEnabled={shouldAutoGrow ? false : scrollEnabled}
        onContentSizeChange={
          shouldAutoGrow || onContentSizeChange ? handleContentSizeChange : undefined
        }
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
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
    marginBottom: 8,
  },
  required: {
    color: '#ff4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    padding: 16,
    color: '#18142F',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 13,
    marginTop: 4,
  },
  helperText: {
    color: '#777389',
    fontSize: 13,
    marginTop: 4,
  },
});

export default CustomTextInput;
