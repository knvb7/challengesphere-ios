import { Ionicons } from '@expo/vector-icons';
import { AppPressable as Pressable } from '@/components/common/AppPressable';
import React from 'react';
import {
  FlatList,
  Modal,
  Pressable as NativePressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type DurationPickerModalProps = {
  visible: boolean;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
};

export default function DurationPickerModal({
  visible,
  value,
  options,
  onSelect,
  onClose,
}: DurationPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <NativePressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.safeArea}>
          <NativePressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>CHALLENGE FORMAT</Text>
                <Text style={styles.title}>Choose duration</Text>
              </View>
              <Pressable style={styles.close} onPress={onClose}>
                <Ionicons name="close" size={21} color="#D3D4CF" />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item}</Text>
                    {selected ? <Ionicons name="checkmark" size={18} color="#D9CA58" /> : null}
                  </Pressable>
                );
              }}
            />
          </NativePressable>
        </SafeAreaView>
      </NativePressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  safeArea: { width: '100%' },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7E3EF',
  },
  eyebrow: { color: '#878b82', fontSize: 9, fontWeight: '700' },
  title: { color: '#18142F', fontSize: 18, fontWeight: '600', marginTop: 4 },
  close: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
  },
  list: { flexGrow: 0 },
  listContent: { paddingVertical: 8, paddingBottom: 16 },
  option: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  optionSelected: { backgroundColor: '#F0ECFF' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#55584f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#4700EC' },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#4700EC' },
  optionText: { flex: 1, color: '#777389', fontSize: 14, marginLeft: 12 },
  optionTextSelected: { color: '#4700EC', fontWeight: '600' },
});
