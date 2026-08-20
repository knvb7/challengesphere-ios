import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

interface CircularPhotoProps {
  source: ImageSourcePropType;
  size?: number;
  borderWidth?: number;
  borderColor?: string;
}

const CircularPhoto: React.FC<CircularPhotoProps> = ({ 
  source, 
  size = 50,
  borderWidth = 0,
  borderColor = '#fff'
}) => {
  return (
    <View style={[
      styles.container,
      { 
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor
      }
    ]}>
      <Image
        source={source}
        style={[
          styles.image,
          {
            width: size - (borderWidth * 2),
            height: size - (borderWidth * 2),
            borderRadius: (size - (borderWidth * 2)) / 2,
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
});

export default CircularPhoto;