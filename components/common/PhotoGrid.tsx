import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import FeedPhoto from './FeedPhoto';

interface PhotoGridItem {
  id: string;
  photoUrl: any;
  challengeSummary?: string;
}

interface PhotoGridProps {
  photos: PhotoGridItem[];
  onPhotoPress?: (photo: PhotoGridItem) => void;
  numColumns?: number;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ 
  photos, 
  onPhotoPress,
  numColumns = 2
}) => {
  const renderPhoto = ({ item }: { item: PhotoGridItem }) => (
    <FeedPhoto
      photoUrl={item.photoUrl}
      size={numColumns === 2 ? "grid-2" : "grid-3"}
      challengeSummary={item.challengeSummary}
      onPress={() => onPhotoPress?.(item)}
      borderRadius={2}
      marginVertical={1}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    gap: 1,
  },
  row: {
    justifyContent: 'space-between',
    gap: 1,
  },
});

export default PhotoGrid;
