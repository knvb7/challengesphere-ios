import React from 'react';
import { StyleSheet, View } from 'react-native';

interface SeparatorProps {
  width?: string | number;
  height?: number;
  backgroundColor?: string;
  marginTop?: number;
  marginBottom?: number;
  marginHorizontal?: number;
  style?: any;
}

const Separator: React.FC<SeparatorProps> = ({
  width = '150%',
  height = 1,
  backgroundColor = '#333',
  marginTop = 20,
  marginBottom = 20,
  marginHorizontal = 0,
  style,
}) => {
  return (
    <View
      style={[
        styles.separator,
        {
          width,
          height,
          backgroundColor,
          marginTop,
          marginBottom,
          marginHorizontal,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  separator: {
    alignSelf: 'center',
  },
});

export default Separator;
