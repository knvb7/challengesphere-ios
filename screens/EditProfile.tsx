import { Ionicons } from '@expo/vector-icons';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { AppAlert as Alert } from '@/utils/appAlert';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CircularPhoto from '../components/common/CircularPhoto';
import GenericUserAvatar from '../components/common/GenericUserAvatar';
import MediaSourceChooser from '../components/common/MediaSourceChooser';
import { useUpdateUser, useUser } from '../hooks/useUsers';
import { useAuthContext } from '../providers/AuthProvider';
import { authService } from '../services/authService';
import { mediaService } from '../services/mediaService';
import { getApiErrorMessage } from '../utils/apiError';

interface EditProfileProps {
  username?: string;
  userId?: number;
  onBack?: () => void;
  onSaveSuccess?: () => void;
}

const RESERVED_USERNAME_KEYWORD = 'challengesphere';
const USERNAME_MIN_LENGTH = 5;
const USERNAME_MAX_LENGTH = 20;

const EditProfile = ({
  username: propUsername,
  userId: propUserId,
  onBack,
  onSaveSuccess,
}: EditProfileProps) => {
  const router = useRouter();
  const { user: authUser, setUser } = useAuthContext();
  const userId = propUserId ?? authUser?.id ?? 0;
  const { data: user, isLoading: loadingUser } = useUser(userId);
  const updateUser = useUpdateUser();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [usernameField, setUsernameField] = useState('');
  const [bioField, setBioField] = useState('');

  // ── Profile photo state ──────────────────────────────────────────────────────
  // localPhotoUri: the newly picked image (not yet saved)
  // uploadingPhoto: true while uploading to S3
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Pre-fill once user data arrives ────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setUsernameField(user.username ?? '');
      setBioField(user.bio ?? '');
    }
  }, [user]);

  const handlePickPhoto = () => {
    setShowPhotoChooser(true);
  };

  const handlePhotoSelected = (assets: { uri: string; fileName?: string | null; mimeType?: string; fileSize?: number; width?: number; height?: number }[]) => {
    const asset = assets[0];
    if (!asset) return;
    setLocalPhotoUri(asset.uri);
    setLocalPhotoAsset(asset);
  };

  const uploadPhoto = async (): Promise<string> => {
    if (!localPhotoAsset) throw new Error('Choose a profile photo first.');
    return mediaService.uploadProfilePhotoFromImagePicker(userId, {
      ...localPhotoAsset,
      fileName: localPhotoAsset.fileName ?? `profile_${userId}_${Date.now()}.jpg`,
    });
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    const trimmedUsername = usernameField.trim();
    if (
      trimmedUsername.length < USERNAME_MIN_LENGTH ||
      trimmedUsername.length > USERNAME_MAX_LENGTH
    ) {
      return `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`;
    }
    if (trimmedUsername.toLowerCase().includes(RESERVED_USERNAME_KEYWORD)) {
      return 'Username cannot contain "challengesphere".';
    }
    if (bioField && bioField.trim().length > 500) return 'Bio must be 500 characters or fewer.';
    return null;
  };

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    // Only call the API if something actually changed
    const hasChanges =
      !!localPhotoUri ||
      usernameField.trim() !== (user?.username ?? '') ||
      bioField.trim() !== (user?.bio ?? '');

    if (!hasChanges)
      return;

    try {
      // Upload new photo first (if selected), get back the public URL
      let profilePicUrl: string | undefined;
      if (localPhotoUri) {
        setUploadingPhoto(true);
        try {
          profilePicUrl = await uploadPhoto();
        } finally {
          setUploadingPhoto(false);
        }
      }

      const updatedUser = await updateUser.mutateAsync({
        userId,
        userData: {
          username: usernameField.trim(),
          bio: bioField.trim() || undefined,
          ...(profilePicUrl ? { profilePicUrl } : {}),
        },
      });
      setUser(updatedUser);
      await authService.storeUser(updatedUser);

      setLocalPhotoUri(null); // clear pending photo — saved successfully
      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (onSaveSuccess) {
              onSaveSuccess();
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to update profile. Please try again.'));
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  // ── Dirty check (used to dim Save button) ──────────────────────────────────
  const isDirty =
    !!localPhotoUri ||
    usernameField.trim() !== (user?.username ?? '') ||
    bioField.trim() !== (user?.bio ?? '');

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loadingUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          feedbackTiming="after-paint"
          style={[styles.saveButton, (!isDirty || updateUser.isPending || uploadingPhoto) && styles.saveButtonDisabled]}
          disabled={!isDirty || updateUser.isPending || uploadingPhoto}
        >
          {updateUser.isPending || uploadingPhoto ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} style={styles.avatarWrapper}>
              {localPhotoUri || user?.profilePicUrl ? (
                <CircularPhoto
                  source={{ uri: localPhotoUri || user?.profilePicUrl || '' }}
                  size={100}
                  borderWidth={3}
                  borderColor={localPhotoUri ? '#FFD700' : '#4700ec'}
                />
              ) : (
                <GenericUserAvatar
                  size={100}
                  style={[
                    styles.editAvatarFallback,
                    { borderColor: '#4700ec' },
                  ]}
                />
              )}
              {/* Camera badge overlay */}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickPhoto}>
              <Text style={styles.changePhotoText}>
                {localPhotoUri ? 'Photo selected — tap Save to apply' : 'Change profile photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Field
              label="Username"
              value={usernameField}
              onChangeText={setUsernameField}
              placeholder="Enter your username"
              autoCapitalize="none"
              maxLength={USERNAME_MAX_LENGTH}
            />
            <Field
              label="Bio"
              value={bioField}
              onChangeText={setBioField}
              placeholder="Write a short bio (optional)"
              multiline
              maxLength={500}
              numberOfLines={4}
            />
            <Text style={styles.charCount}>{bioField.length}/500</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <MediaSourceChooser
        visible={showPhotoChooser}
        onClose={() => setShowPhotoChooser(false)}
        onSelected={handlePhotoSelected}
        aspect={[1, 1]}
        title="Profile photo"
      />
    </SafeAreaView>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  maxLength?: number;
  numberOfLines?: number;
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  maxLength,
  numberOfLines,
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.textInput, multiline && styles.textInputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#555"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
      maxLength={maxLength}
      numberOfLines={numberOfLines}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#777389',
    marginTop: 12,
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E7E3EF',
  },
  headerButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    color: '#18142F',
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4700EC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E7E3EF',
  },
  avatarWrapper: {
    position: 'relative',
  },
  editAvatarFallback: {
    borderWidth: 3,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#4700ec',
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoText: {
    color: '#4700ec',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 10,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#655F70',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#18142F',
    fontSize: 15,
  },
  textInputMultiline: {
    height: 110,
    paddingTop: 14,
  },
  charCount: {
    color: '#777389',
    fontSize: 11,
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 16,
  },
});

export default EditProfile;
