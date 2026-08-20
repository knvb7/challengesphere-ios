import { Ionicons } from '@expo/vector-icons';
import { AppPressable as Pressable } from '@/components/common/AppPressable';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PinchZoomImage from './PinchZoomImage';

interface SubmissionMediaViewerProps {
  visible: boolean;
  mediaUrls: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function SubmissionMediaViewer({
  visible,
  mediaUrls,
  initialIndex,
  onClose,
}: SubmissionMediaViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const viewerHeight = Math.max(240, height - insets.top - insets.bottom);

  useEffect(() => {
    if (!visible) return;

    const nextIndex = Math.min(Math.max(initialIndex, 0), Math.max(mediaUrls.length - 1, 0));
    setIsZoomed(false);
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: width * nextIndex, animated: false });
    });
  }, [initialIndex, mediaUrls.length, visible, width]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsZoomed(false);
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <SafeAreaView style={styles.screen}>
          <FlatList
            ref={listRef}
            data={mediaUrls}
            horizontal
            pagingEnabled
            scrollEnabled={!isZoomed}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(url, index) => `${url}-${index}`}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            onScrollToIndexFailed={({ index }) => {
              listRef.current?.scrollToOffset({ offset: width * index, animated: false });
            }}
            renderItem={({ item, index }) => (
              <PinchZoomImage
                source={{ uri: item }}
                width={width}
                height={viewerHeight}
                resizeMode="contain"
                maxScale={5}
                onZoomChange={index === activeIndex ? setIsZoomed : undefined}
                resetKey={`${visible}-${activeIndex}-${index}`}
                style={styles.image}
              />
            )}
          />

          <View
            style={[
              styles.topBar,
              { top: Math.max(insets.top, 12) },
            ]}
            pointerEvents="box-none"
          >
            <Pressable
              accessibilityLabel="Close enlarged image"
              accessibilityRole="button"
              hitSlop={16}
              onPress={onClose}
              style={styles.iconButton}
            >
              <Ionicons name="close" size={25} color="#ffffff" />
            </Pressable>
            {mediaUrls.length > 1 ? (
              <View style={styles.counter}>
                <Text style={styles.counterText}>{activeIndex + 1} / {mediaUrls.length}</Text>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  image: {
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,20,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  counter: {
    minWidth: 48,
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,20,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  counterText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
