import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable as NativePressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteGloriesForSubmission } from '../../hooks/useFeed';
import { GloryUser } from '../../types/api';
import AvatarImage from './AvatarImage';

interface GloriesModalProps {
  submissionId: number;
  visible: boolean;
  onClose: () => void;
}

const GloryRow = ({ item, onPress }: { item: GloryUser; onPress: () => void }) => {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <AvatarImage uri={item.profilePicUrl} size={44} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.username}>{item.username ?? `User ${item.userId}`}</Text>
        {item.bio ? <Text style={styles.bio} numberOfLines={1} selectable>{item.bio}</Text> : null}
      </View>
      <Ionicons name="sparkles" size={18} color="#4CAF50" />
    </TouchableOpacity>
  );
};

const GloriesModal: React.FC<GloriesModalProps> = ({ submissionId, visible, onClose }) => {
  const router = useRouter();
  const canLoadGlories = visible && submissionId > 0;
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteGloriesForSubmission(canLoadGlories ? submissionId : 0);

  const gloryUsers = data?.pages.flatMap((page) => page.content) ?? [];
  const count = data?.pages[0]?.totalElements ?? 0;

  const handleUserPress = (item: GloryUser) => {
    if (!item.userId) return;
    onClose();
    router.push({
      pathname: '/user-profile',
      params: { id: item.userId.toString(), username: item.username ?? `User ${item.userId}` },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <NativePressable style={styles.backdrop} onPress={onClose} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="sparkles" size={20} color="#4CAF50" />
            <Text style={styles.title}>
              {count > 0 ? `${count} ${count === 1 ? 'Glory' : 'Glories'}` : 'Glories'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
          </View>

          {!canLoadGlories ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={48} color="#555" />
              <Text style={styles.emptyText}>Could not load glories</Text>
            </View>
          ) : isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={48} color="#555" />
              <Text style={styles.emptyText}>Could not load glories</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.8}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : count === 0 ? (
            <View style={styles.center}>
              <Ionicons name="sparkles" size={48} color="#333" />
              <Text style={styles.emptyText}>No glories yet</Text>
              <Text style={styles.emptySubtext}>Be the first to glory this submission!</Text>
            </View>
          ) : (
            <FlatList
              data={gloryUsers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <GloryRow item={item} onPress={() => handleUserPress(item)} />
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                  </View>
                ) : null
              }
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '65%',
    paddingBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D8D2E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#18142F',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  footerLoader: {
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E7E3EF',
  },
  info: {
    flex: 1,
  },
  username: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18142F',
  },
  bio: {
    fontSize: 11,
    color: '#777389',
    marginTop: 2,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18142F',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#777389',
  },
  retryButton: {
    minHeight: 36,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18142F',
  },
});

export default GloriesModal;
