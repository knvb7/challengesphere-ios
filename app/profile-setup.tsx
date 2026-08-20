import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppPressable as Pressable } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import MediaSourceChooser from '../components/common/MediaSourceChooser';
import { COUNTRIES } from '../constants/countries';
import { useUpdateUser } from '../hooks/useUsers';
import { useAuthContext } from '../providers/AuthProvider';
import { authService } from '../services/authService';
import { mediaService } from '../services/mediaService';
import { onboardingService } from '../services/onboardingService';
import type { UserGender } from '../types/api';
import {
  calculateAge,
  formatDateOfBirth,
  getMaximumSelectableDateOfBirth,
  getMinimumSelectableDateOfBirth,
  isSelectableDate,
  MAXIMUM_ACCOUNT_AGE,
  MINIMUM_ACCOUNT_AGE,
  parseDateOfBirth,
} from '../utils/dateOfBirth';
import { getApiErrorMessage } from '../utils/apiError';
import { getUserDisplayName } from '../utils/userDisplay';

const PROFILE_INTERESTS = [
  { label: 'Fun', value: 'fun', icon: 'happy-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Fitness', value: 'fitness', icon: 'barbell-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Strength', value: 'strength', icon: 'fitness-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Running', value: 'running', icon: 'walk-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Health', value: 'health', icon: 'heart-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Coding', value: 'coding', icon: 'code-slash-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Learning', value: 'learning', icon: 'school-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Reading', value: 'reading', icon: 'book-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Creativity', value: 'creativity', icon: 'color-palette-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Cooking', value: 'cooking', icon: 'restaurant-outline' as keyof typeof Ionicons.glyphMap },
  { label: 'Mindfulness', value: 'mindfulness', icon: 'leaf-outline' as keyof typeof Ionicons.glyphMap },
];

const GENDER_OPTIONS: { label: string; value: UserGender; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Woman', value: 'WOMAN', icon: 'female-outline' },
  { label: 'Man', value: 'MAN', icon: 'male-outline' },
  { label: 'Non-binary', value: 'NON_BINARY', icon: 'sparkles-outline' },
  { label: 'Prefer not to say', value: 'PREFER_NOT_TO_SAY', icon: 'remove-circle-outline' },
];

type RequiredProfileField =
  | 'bio'
  | 'interests'
  | 'dateOfBirth'
  | 'gender'
  | 'country';

type ProfileFieldErrors = Partial<Record<RequiredProfileField, string>>;

export default function ProfileSetupScreen() {
  const { user: authUser, setUser, isAuthenticated, isLoading: isAuthLoading } = useAuthContext();
  const userId = authUser?.id ?? 0;
  const updateUser = useUpdateUser();
  const [bio, setBio] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<UserGender | null>(null);
  const [country, setCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [localPhotoAsset, setLocalPhotoAsset] = useState<{
    uri: string;
    fileName?: string | null;
    mimeType?: string;
    fileSize?: number;
    width?: number;
    height?: number;
  } | null>(null);
  const [showPhotoChooser, setShowPhotoChooser] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const keyboardAwareScrollRef = useRef<ScrollView>(null);
  const accessCheckedForUserRef = useRef<number | null>(null);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      keyboardAwareScrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let isActive = true;

    async function checkAccess() {
      if (isAuthLoading) return;
      if (accessCheckedForUserRef.current === userId) return;
      accessCheckedForUserRef.current = userId;
      if (!isAuthenticated || !userId) {
        router.replace('/login');
        return;
      }

      const pending = authUser?.profileComplete === false
        || await onboardingService.hasPendingProfileSetupForUser(userId);
      if (!isActive) return;
      if (!pending) {
        router.replace('/(tabs)/challenges');
        return;
      }
      setIsCheckingAccess(false);
    }

    void checkAccess();
    return () => {
      isActive = false;
    };
  }, [authUser?.profileComplete, isAuthenticated, isAuthLoading, userId]);

  const automaticName = authUser ? getUserDisplayName(authUser) : '';
  const automaticUsername = authUser?.username?.trim() || 'your_username';
  const bioPreview = bio.trim() || 'Your one-line intro will show up here.';
  const photoUri = localPhotoUri;
  const isSaving = updateUser.isPending || isUploading;
  const isProfileReady = Boolean(
    bio.trim()
    && selectedInterests.length > 0
    && isSelectableDate(dateOfBirth.trim())
    && age.trim()
    && gender
    && country.trim().length >= 2
  );
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter((item) => item.toLowerCase().includes(query));
  }, [countrySearch]);

  const clearFieldError = (field: RequiredProfileField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const toggleInterest = (interest: string) => {
    void Haptics.selectionAsync();
    clearFieldError('interests');
    setSelectedInterests((current) => (
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    ));
  };

  const handleDateOfBirthChange = (_event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (!value) return;

    const formatted = formatDateOfBirth(value);
    setDateOfBirth(formatted);
    const calculatedAge = calculateAge(formatted);
    setAge(calculatedAge != null ? String(calculatedAge) : '');
    clearFieldError('dateOfBirth');
  };

  const clearDateOfBirth = () => {
    setDateOfBirth('');
    setAge('');
  };

  const validateRequiredProfileFields = () => {
    const errors: ProfileFieldErrors = {};
    const trimmedBio = bio.trim();
    const trimmedDateOfBirth = dateOfBirth.trim();
    const trimmedCountry = country.trim();

    if (!trimmedBio) {
      errors.bio = 'Write a short bio.';
    }
    if (selectedInterests.length === 0) {
      errors.interests = 'Choose at least one interest.';
    }
    if (!trimmedDateOfBirth) {
      errors.dateOfBirth = 'Choose your date of birth.';
    } else if (!isSelectableDate(trimmedDateOfBirth)) {
      errors.dateOfBirth = `You must be between ${MINIMUM_ACCOUNT_AGE} and ${MAXIMUM_ACCOUNT_AGE} years old.`;
    }
    if (!gender) {
      errors.gender = 'Choose a gender option.';
    }
    if (!trimmedCountry) {
      errors.country = 'Choose your country.';
    } else if (trimmedCountry.length < 2 || trimmedCountry.length > 100) {
      errors.country = 'Country must be 2-100 characters.';
    }

    setFieldErrors(errors);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      Alert.alert('Complete your profile', firstError);
      return false;
    }
    return true;
  };

  const choosePhoto = () => {
    setShowPhotoChooser(true);
  };

  const handlePhotoSelected = (assets: { uri: string; fileName?: string | null; mimeType?: string; fileSize?: number; width?: number; height?: number }[]) => {
    const asset = assets[0];
    if (!asset) return;
    setLocalPhotoUri(asset.uri);
    setLocalPhotoAsset(asset);
    void Haptics.selectionAsync();
  };

  const uploadPhoto = async (): Promise<string> => {
    if (!localPhotoAsset) {
      throw new Error('Choose a profile photo first.');
    }
    return mediaService.uploadProfilePhotoFromImagePicker(userId, {
      ...localPhotoAsset,
      fileName: localPhotoAsset.fileName ?? `profile_${userId}_${Date.now()}.jpg`,
    });
  };

  const enterApp = async () => {
    await onboardingService.completeProfileSetupForUser(userId);
    router.replace('/(tabs)/create');
  };

  const saveProfile = async () => {
    if (!userId || isSaving) return;
    if (!validateRequiredProfileFields()) return;

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let profilePicUrl: string | undefined;
      if (localPhotoAsset) {
        setIsUploading(true);
        try {
          profilePicUrl = await uploadPhoto();
        } finally {
          setIsUploading(false);
        }
      }

      const updatedUser = await updateUser.mutateAsync({
        userId,
        userData: {
          bio: bio.trim(),
          dateOfBirth: dateOfBirth.trim(),
          gender: gender!,
          country: country.trim(),
          interests: selectedInterests,
          ...(profilePicUrl ? { profilePicUrl } : {}),
        },
      });
      setUser(updatedUser);
      await authService.storeUser(updatedUser);
      await enterApp();
    } catch (error: any) {
      Alert.alert(
        'Could not save profile',
        getApiErrorMessage(error, 'Something went wrong. Please try again.'),
      );
    }
  };

  if (isAuthLoading || isCheckingAccess) {
    return (
      <SafeAreaView style={styles.loading} edges={['top', 'bottom']}>
        <ActivityIndicator color="#DDD06A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient colors={['#FFFFFF', '#F7F4FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={keyboardAwareScrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brand}>challengesphere</Text>
            <Text style={styles.requiredHint}>REQUIRED FIELDS MARKED *</Text>
          </View>

          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Claim your spot</Text>
          </View>
          <Text style={styles.title}>Your move,{'\n'}your story.</Text>
          <Text style={styles.subtitle}>
            You have an account. Now make it feel like yours before your first post lands.
          </Text>

          <LinearGradient
            colors={['#FFFFFF', '#F7F4FF']}
            style={styles.preview}
          >
            <View style={styles.previewHeader}>
              <Pressable style={styles.avatarShell} onPress={choosePhoto}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatar} />
                ) : (
                  <Text style={styles.initial}>
                    {(automaticName || automaticUsername).charAt(0).toUpperCase()}
                  </Text>
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              </Pressable>
              <View style={styles.identity}>
                <Text style={styles.username}>@{automaticUsername}</Text>
                <Text style={styles.status} numberOfLines={1}>
                  {automaticName || 'GOOGLE ACCOUNT'}
                </Text>
              </View>
              <View style={[styles.readyPill, !isProfileReady && styles.readyPillPending]}>
                <Text style={[styles.readyText, !isProfileReady && styles.readyTextPending]}>
                  {isProfileReady ? 'READY' : 'REQUIRED'}
                </Text>
              </View>
            </View>
            <Text style={[styles.previewBio, !bio.trim() && styles.previewBioMuted]}>
              {bioPreview}
            </Text>
          </LinearGradient>

          <Pressable
            style={styles.photoButton}
            onPress={choosePhoto}
            disabled={isSaving}
          >
            <Ionicons name="image-outline" color="#4700EC" size={19} />
            <Text style={styles.photoButtonText}>
              {localPhotoUri ? 'Change profile photo' : 'Add profile photo '}
            </Text>
          </Pressable>

          <Text style={styles.fieldLabel}>A SHORT BIO *</Text>
          <View style={[styles.bioField, fieldErrors.bio && styles.fieldInvalid]}>
            <TextInput
              value={bio}
              onChangeText={(value) => {
                setBio(value);
                clearFieldError('bio');
              }}
              placeholder="What are you showing up for?"
              placeholderTextColor="#676B60"
              maxLength={140}
              multiline
              style={styles.bioInput}
            />
            <Text style={styles.counter}>{bio.length}/140</Text>
          </View>
          {fieldErrors.bio ? <Text style={styles.inlineError}>{fieldErrors.bio}</Text> : null}

          <Text style={styles.fieldLabel}>INTERESTS *</Text>
          <View style={styles.interestGrid}>
            {PROFILE_INTERESTS.map((interest) => {
              const active = selectedInterests.includes(interest.value);
              return (
                <Pressable
                  key={interest.value}
                  style={[styles.interestChip, active && styles.interestChipActive]}
                  onPress={() => toggleInterest(interest.value)}
                  disabled={isSaving}
                >
                  <Ionicons
                    name={interest.icon}
                    size={15}
                    color={active ? '#10120B' : '#C9C7B8'}
                  />
                  <Text style={[styles.interestText, active && styles.interestTextActive]}>
                    {interest.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.interests ? <Text style={styles.inlineError}>{fieldErrors.interests}</Text> : null}

          <Text style={styles.fieldLabel}>BIRTHDAY AND AGE *</Text>
          <View style={styles.optionalRow}>
            <Pressable
              style={[styles.optionalField, fieldErrors.dateOfBirth && styles.fieldInvalid]}
              onPress={() => {
                Keyboard.dismiss();
                setShowDatePicker(true);
                keyboardAwareScrollRef.current?.scrollToEnd({ animated: true });
              }}
            >
              <Ionicons name="calendar-outline" size={17} color="#AEB39F" />
              <Text style={[styles.dateValue, !dateOfBirth && styles.datePlaceholder]}>
                {dateOfBirth || 'Date of birth'}
              </Text>
              {dateOfBirth ? (
                <Pressable onPress={clearDateOfBirth} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color="#777C70" />
                </Pressable>
              ) : null}
            </Pressable>
            <View style={styles.ageField}>
              <Ionicons name="lock-closed-outline" size={15} color="#777C70" />
              <TextInput
                value={age}
                placeholder="Age"
                placeholderTextColor="#676B60"
                editable={false}
                maxLength={3}
                style={styles.optionalInput}
              />
            </View>
          </View>
          {showDatePicker ? (
            <View style={styles.datePickerWrap}>
              <DateTimePicker
                value={parseDateOfBirth(dateOfBirth) || new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={getMaximumSelectableDateOfBirth()}
                minimumDate={getMinimumSelectableDateOfBirth()}
                onChange={handleDateOfBirthChange}
                themeVariant="light"
                textColor="#18142F"
                style={styles.datePicker}
              />
              {Platform.OS === 'ios' ? (
                <Pressable style={styles.datePickerDone} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {fieldErrors.dateOfBirth ? <Text style={styles.inlineError}>{fieldErrors.dateOfBirth}</Text> : null}

          <Text style={styles.fieldLabel}>GENDER *</Text>
          <View style={styles.genderGrid}>
            {GENDER_OPTIONS.map((option) => {
              const active = gender === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.genderOption, active && styles.genderOptionActive]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setGender(option.value);
                    clearFieldError('gender');
                  }}
                  disabled={isSaving}
                >
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={active ? '#10120B' : '#C9C7B8'}
                  />
                  <Text style={[styles.genderText, active && styles.genderTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.gender ? <Text style={styles.inlineError}>{fieldErrors.gender}</Text> : null}

          <Text style={styles.fieldLabel}>COUNTRY *</Text>
          <Pressable
            style={[styles.textField, fieldErrors.country && styles.fieldInvalid]}
            onPress={() => {
              Keyboard.dismiss();
              setCountrySearch('');
              setShowCountryPicker(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Choose country"
          >
            <Ionicons name="globe-outline" size={17} color="#AEB39F" />
            <Text style={[styles.countryValue, !country && styles.countryPlaceholder]}>
              {country || 'Choose your country'}
            </Text>
            <Ionicons name="chevron-down" size={17} color="#777C70" />
          </Pressable>
          {fieldErrors.country ? <Text style={styles.inlineError}>{fieldErrors.country}</Text> : null}

          <Pressable
            style={[styles.primary, (isSaving || !userId) && styles.primaryDisabled]}
            onPress={() => void saveProfile()}
            feedbackTiming="after-paint"
            disabled={isSaving || !userId}
          >
            {isSaving ? (
              <ActivityIndicator color="#10120B" />
            ) : (
              <>
                <Text style={styles.primaryText}>Create my profile</Text>
                <Ionicons name="arrow-forward" size={19} color="#111309" />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <MediaSourceChooser
        visible={showPhotoChooser}
        onClose={() => setShowPhotoChooser(false)}
        onSelected={handlePhotoSelected}
        aspect={[1, 1]}
        title="Profile photo"
      />
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowCountryPicker(false)}
            accessibilityLabel="Close country picker"
          />
          <View style={styles.countrySheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.countrySheetHeader}>
              <View>
                <Text style={styles.countrySheetTitle}>Choose your country</Text>
                <Text style={styles.countrySheetSubtitle}>Search or scroll through the list</Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowCountryPicker(false)}
                accessibilityLabel="Close country picker"
              >
                <Ionicons name="close" size={20} color="#D8D6C7" />
              </Pressable>
            </View>
            <View style={styles.countrySearchField}>
              <Ionicons name="search-outline" size={18} color="#8F9388" />
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Search countries"
                placeholderTextColor="#676B60"
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.countrySearchInput}
              />
              {countrySearch ? (
                <Pressable onPress={() => setCountrySearch('')} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color="#777C70" />
                </Pressable>
              ) : null}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {filteredCountries.map((item) => {
                const selected = country === item;
                return (
                  <Pressable
                    key={item}
                    style={[styles.countryOption, selected && styles.countryOptionSelected]}
                    onPress={() => {
                      setCountry(item);
                      clearFieldError('country');
                      setShowCountryPicker(false);
                      void Haptics.selectionAsync();
                    }}
                  >
                    <Text style={[styles.countryOptionText, selected && styles.countryOptionTextSelected]}>
                      {item}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={19} color="#D6C955" /> : null}
                  </Pressable>
                );
              })}
              {filteredCountries.length === 0 ? (
                <Text style={styles.noCountries}>No countries found</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8F7FC' },
  loading: { flex: 1, backgroundColor: '#F8F7FC', alignItems: 'center', justifyContent: 'center' },
  glowTop: {
    position: 'absolute', top: -160, right: -140, width: 330, height: 330,
    borderRadius: 165, backgroundColor: 'rgba(71, 0, 236, 0.08)',
  },
  glowBottom: {
    position: 'absolute', bottom: -160, left: -130, width: 300, height: 300,
    borderRadius: 150, backgroundColor: 'rgba(126, 87, 255, 0.08)',
  },
  content: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 34 },
  brand: { color: '#18142F', fontSize: 18, fontWeight: '600', letterSpacing: -0.35 },
  requiredHint: { color: '#777389', fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  badge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8,
    borderColor: '#DDD4FF', borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 8, marginBottom: 18,
    backgroundColor: '#F0ECFF',
  },
  badgeDot: { height: 7, width: 7, borderRadius: 4, backgroundColor: '#4700EC' },
  badgeText: { color: '#4700EC', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.15, fontWeight: '600' },
  title: { color: '#18142F', fontSize: 40, lineHeight: 43, fontWeight: '600', letterSpacing: -1.4, marginBottom: 12 },
  subtitle: { color: '#777389', fontSize: 15, lineHeight: 23, marginBottom: 25, maxWidth: 330 },
  preview: {
    borderRadius: 24, borderWidth: 1, borderColor: '#E7E3EF', backgroundColor: '#FFFFFF',
    padding: 18, marginBottom: 16,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarShell: {
    width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#4700EC', backgroundColor: '#F0ECFF',
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  initial: { color: '#4700EC', fontSize: 27, fontWeight: '600' },
  cameraBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#4700EC', alignItems: 'center', justifyContent: 'center',
  },
  identity: { flex: 1, paddingLeft: 14 },
  username: { color: '#18142F', fontSize: 16, fontWeight: '600', marginBottom: 5 },
  status: { color: '#777389', fontSize: 10, letterSpacing: 1.05, fontWeight: '600' },
  readyPill: { backgroundColor: '#E9F8EF', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  readyText: { color: '#267A49', fontSize: 10, fontWeight: '600', letterSpacing: 0.7 },
  readyPillPending: { backgroundColor: '#F0ECFF' },
  readyTextPending: { color: '#4700EC' },
  previewBio: { color: '#18142F', fontSize: 14, lineHeight: 21, marginTop: 17 },
  previewBioMuted: { color: '#7b8175' },
  photoButton: {
    height: 49, borderRadius: 16, borderWidth: 1, borderColor: '#DDD4FF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: '#F0ECFF', marginBottom: 22,
  },
  photoButtonText: { color: '#4700EC', fontSize: 14, fontWeight: '500' },
  fieldLabel: { color: '#777389', fontSize: 11, letterSpacing: 1.2, fontWeight: '600', marginBottom: 9 },
  textField: {
    height: 50, borderRadius: 16, borderWidth: 1, borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, marginBottom: 21,
    flexDirection: 'row', alignItems: 'center', gap: 9,
  },
  textInput: { flex: 1, color: '#18142F', fontSize: 15, padding: 0 },
  countryValue: { flex: 1, color: '#18142F', fontSize: 15 },
  countryPlaceholder: { color: '#676b60' },
  fieldInvalid: { borderColor: '#b95959' },
  bioField: {
    minHeight: 96, borderRadius: 17, borderWidth: 1, borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF', padding: 14, marginBottom: 21,
  },
  bioInput: { color: '#18142F', fontSize: 15, lineHeight: 21, minHeight: 47, padding: 0, textAlignVertical: 'top' },
  counter: { color: '#686c62', fontSize: 11, textAlign: 'right', marginTop: 6 },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 22 },
  interestChip: {
    minHeight: 38, borderRadius: 18, borderWidth: 1, borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row',
    alignItems: 'center', gap: 7,
  },
  interestChipActive: { backgroundColor: '#F0ECFF', borderColor: '#4700EC' },
  interestText: { color: '#777389', fontSize: 13, fontWeight: '500' },
  interestTextActive: { color: '#4700EC', fontWeight: '700' },
  optionalRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  optionalField: {
    flex: 1, height: 50, borderRadius: 16, borderWidth: 1, borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF', justifyContent: 'center', paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 9,
  },
  ageField: {
    width: 92, height: 50, borderRadius: 16, borderWidth: 1, borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF', justifyContent: 'center', paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 7,
  },
  optionalInput: { flex: 1, color: '#18142F', fontSize: 15, padding: 0 },
  dateValue: { flex: 1, color: '#18142F', fontSize: 14 },
  datePlaceholder: { color: '#676b60' },
  datePickerWrap: {
    borderRadius: 12, borderWidth: 1, borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF', marginBottom: 10, overflow: 'hidden',
  },
  datePicker: { backgroundColor: '#FFFFFF' },
  datePickerDone: {
    alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 10,
  },
  datePickerDoneText: { color: '#4700EC', fontSize: 14, fontWeight: '600' },
  inlineError: { color: '#C6384C', fontSize: 12, marginBottom: 8 },
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 22 },
  genderOption: {
    minHeight: 42, minWidth: '47%', flex: 1, borderRadius: 16, borderWidth: 1,
    borderColor: '#E7E3EF', backgroundColor: '#FFFFFF', paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  genderOptionActive: { backgroundColor: '#F0ECFF', borderColor: '#4700EC' },
  genderText: { color: '#777389', fontSize: 13, fontWeight: '500', flexShrink: 1 },
  genderTextActive: { color: '#4700EC', fontWeight: '700' },
  primary: {
    height: 56, borderRadius: 18, backgroundColor: '#4700EC', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 9,
  },
  primaryDisabled: { opacity: 0.46 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  countrySheet: {
    maxHeight: '82%',
    minHeight: '62%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D2E5',
    marginBottom: 17,
  },
  countrySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  countrySheetTitle: { color: '#18142F', fontSize: 21, fontWeight: '600' },
  countrySheetSubtitle: { color: '#858a7d', fontSize: 12, marginTop: 4 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0ECFF',
  },
  countrySearchField: {
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#F8F7FC',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },
  countrySearchInput: { flex: 1, color: '#18142F', fontSize: 15, padding: 0 },
  countryOption: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryOptionSelected: { backgroundColor: '#F0ECFF' },
  countryOptionText: { color: '#18142F', fontSize: 15 },
  countryOptionTextSelected: { color: '#4700EC', fontWeight: '600' },
  noCountries: { color: '#858a7d', fontSize: 14, textAlign: 'center', paddingVertical: 36 },
});
