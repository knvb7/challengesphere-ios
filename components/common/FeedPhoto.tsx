import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import React from 'react';
import { Dimensions, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import PinchZoomImage from './PinchZoomImage';

interface FeedPhotoProps {
  photoUrl: ImageSourcePropType;
  size?: 'small' | 'medium' | 'large' | 'full' | 'grid-2' | 'grid-3' | number;
  challengeSummary?: string;
  onPress?: () => void;
  borderRadius?: number;
  marginVertical?: number;
}

const FeedPhoto: React.FC<FeedPhotoProps> = ({ 
  photoUrl, 
  size = 'full',
  challengeSummary,
  onPress,
  borderRadius = 3,
  marginVertical = 8
}) => {
  const windowWidth = Dimensions.get('window').width;
  
  const getPhotoSize = () => {
    if (typeof size === 'number') {
      return size;
    }
    
    switch (size) {
      case 'small':
        return (windowWidth - 60) / 3;
      case 'grid-2':
        return (windowWidth - 50) / 2;
      case 'grid-3':
        return (windowWidth - 60) / 3;
      case 'medium':
        return (windowWidth - 40) / 2;
      case 'large':
        return windowWidth * 0.8;
      case 'full':
      default:
        return windowWidth;
    }
  };

  const photoSize = getPhotoSize();
  
  return (
    <View style={[
      styles.container,
      { 
        width: size === 'small' || size === 'grid-2' || size === 'grid-3' ? photoSize : '100%',
        marginVertical: size === 'small' || size === 'grid-2' || size === 'grid-3' ? 2 : marginVertical,
      }
    ]}>
      <PinchZoomImage
        source={photoUrl}
        width={photoSize}
        height={photoSize}
        borderRadius={borderRadius}
        resizeMode="cover"
        style={{ backgroundColor: '#1a1a1a' }}
      />
      {/* "View Challenge" button — only this navigates, not the whole image */}
      {onPress && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.tapBadge}>
          <Ionicons name="open-outline" size={13} color="#fff" />
          <Text style={styles.tapBadgeText}>View Challenge</Text>
        </TouchableOpacity>
      )}
      {challengeSummary && (
        <Text style={styles.challengeSummary} numberOfLines={2}>
          {challengeSummary}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  image: {
    backgroundColor: '#1a1a1a',
    resizeMode: 'cover',
  },
  tapBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  tapBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.2,
  },
  challengeSummary: {
    fontSize: 11,
    color: '#ccc',
    marginTop: 4,
    paddingHorizontal: 4,
    lineHeight: 15,
  },
});

export default FeedPhoto;
