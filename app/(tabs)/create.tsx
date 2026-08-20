import hapticFeedback from '@/utils/haptics';
import { AppAlert as Alert } from '@/utils/appAlert';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomTextInput from '../../components/common/CustomTextInput';
import AvatarImage from '../../components/common/AvatarImage';
import { getChallengeTemplateById } from '../../constants/challengeTemplates';
import { CHALLENGE_VALIDATION, validateChallengeCategory } from '../../constants/challengeValidation';
import MediaSourceChooser from '../../components/common/MediaSourceChooser';
import OptionSelector from '../../components/common/OptionSelector';
import Separator from '../../components/common/Separator';
import SubmissionMediaViewer from '../../components/common/SubmissionMediaViewer';
import { useCreateChallenge } from '../../hooks/useChallenges';
import { useFullscreenMediaViewer } from '../../hooks/useFullscreenMediaViewer';
import { useUploadChallengeCoverPhotos } from '../../hooks/useMedia';
import { useUserFollowers, useUserFollowing } from '../../hooks/useUsers';
import { useAuthContext } from '../../providers/AuthProvider';
import { useSubscription } from '../../providers/SubscriptionContext';
import { ChallengeCreateRequest, ChallengeProofMode, User } from '../../types/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { getDeviceTimeZone, startOfLocalDay, toLocalCalendarDate } from '../../utils/deviceTime';
import {
  showChallengeLimitUpgrade,
  showChallengeLimitUpgradeForStatus,
} from '../../utils/challengeLimitUpgrade';

const createSteps = [
  { title: 'Challenge', subtitle: 'Choose a goal you want to begin.', icon: 'sparkles-outline' },
  { title: 'Rhythm', subtitle: 'Set when and how you want to show up.', icon: 'calendar-outline' },
  { title: 'Cover', subtitle: 'Add an optional visual people will recognize.', icon: 'images-outline' },
  { title: 'People', subtitle: 'Invite now, later, or start on your own.', icon: 'people-outline' },
] as const;

const MAX_INVITED_USERS = 20;

type CategoryIconName = keyof typeof Ionicons.glyphMap;

const CATEGORY_ICONS: Record<string, CategoryIconName> = {
  Fun: 'happy-outline',
  Fitness: 'barbell-outline',
  Coding: 'code-slash-outline',
  Learning: 'school-outline',
  Productivity: 'checkmark-done-outline',
  Creativity: 'color-palette-outline',
  Lifestyle: 'sparkles-outline',
  Health: 'heart-outline',
  Social: 'people-outline',
  Other: 'add-circle-outline',
};

const getCategoryIcon = (category: string): CategoryIconName => (
  CATEGORY_ICONS[category] || 'pricetag-outline'
);

interface MediaItem {
  id: string;
  uri: string;
  type: 'image';
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

interface ChallengeForm {
  title: string;
  description: string;
  categories: string[];
  challengeMode: 'DAILY' | 'ONE_OFF';
  proofMode: ChallengeProofMode;
  duration: string;
  rules: string;
  rewards: string;
  isPrivate: boolean;
  maxParticipants: string;
  startDate: string;
  photos: MediaItem[];
}

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  isSelected: boolean;
}

type CreationMethod = 'template' | 'scratch';

type ChallengeFormErrors = Partial<Record<
  'title' | 'description' | 'categories' | 'duration' | 'rules' | 'maxParticipants',
  string
>>;

const validateLength = (value: string, label: string, min: number, max: number) => {
  const length = value.trim().length;
  if (length < min) return `${label} must be at least ${min} characters`;
  if (length > max) return `${label} must be at most ${max} characters`;
  return '';
};

const normalizeCategory = (category: string) => category.trim().toLocaleLowerCase();

const validateChallengeForm = (form: ChallengeForm): ChallengeFormErrors => {
  const formErrors: ChallengeFormErrors = {};
  const titleError = validateLength(
    form.title,
    'Title',
    CHALLENGE_VALIDATION.title.min,
    CHALLENGE_VALIDATION.title.max
  );
  const descriptionError = validateLength(
    form.description,
    'Description',
    CHALLENGE_VALIDATION.description.min,
    CHALLENGE_VALIDATION.description.max
  );
  const rulesError = validateLength(
    form.rules,
    'Rules',
    CHALLENGE_VALIDATION.rules.min,
    CHALLENGE_VALIDATION.rules.max
  );

  if (titleError) formErrors.title = titleError;
  if (descriptionError) formErrors.description = descriptionError;
  if (rulesError) formErrors.rules = rulesError;

  if (form.categories.length === 0) {
    formErrors.categories = 'At least one category is required';
  } else if (form.categories.length > CHALLENGE_VALIDATION.category.maxCount) {
    formErrors.categories = `A challenge can have at most ${CHALLENGE_VALIDATION.category.maxCount} categories`;
  } else {
    const invalidCategory = form.categories
      .map(category => validateChallengeCategory(category))
      .find((error): error is string => Boolean(error));
    const normalizedCategories = form.categories.map(normalizeCategory);

    if (invalidCategory) {
      formErrors.categories = invalidCategory;
    } else if (new Set(normalizedCategories).size !== normalizedCategories.length) {
      formErrors.categories = 'Categories must be unique';
    }
  }

  if (form.challengeMode === 'DAILY' && !form.duration) {
    formErrors.duration = 'Duration is required';
  }
  if (form.maxParticipants.trim() && Number.isNaN(Number(form.maxParticipants))) {
    formErrors.maxParticipants = 'Must be a valid number';
  }

  return formErrors;
};

const stepFields: readonly (readonly (keyof ChallengeFormErrors)[])[] = [
  ['title', 'description', 'categories'],
  ['duration', 'rules'],
  [],
  ['maxParticipants'],
];

const requiredFields: readonly (keyof ChallengeFormErrors)[] = [
  'title',
  'description',
  'categories',
  'duration',
  'rules',
];

const Create = () => {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    templateId?: string | string[];
    startMode?: string | string[];
  }>();
  const templateId = Array.isArray(routeParams.templateId)
    ? routeParams.templateId[0] || ''
    : routeParams.templateId || '';
  const startMode = Array.isArray(routeParams.startMode)
    ? routeParams.startMode[0] || ''
    : routeParams.startMode || '';
  const selectedTemplate = useMemo(
    () => getChallengeTemplateById(templateId),
    [templateId],
  );
  const appliedTemplateIdRef = useRef<string | null>(null);
  const { currentUserId } = useAuthContext();
  const { status: subscriptionStatus, refreshStatus } = useSubscription();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const CURRENT_USER_ID = currentUserId;
  const [creationMethod, setCreationMethod] = useState<CreationMethod>(
    startMode === 'blank' ? 'scratch' : 'template',
  );
  const [hasChosenCreationMethod, setHasChosenCreationMethod] = useState(
    Boolean(selectedTemplate) || startMode === 'blank',
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const shouldLoadInvitees = CURRENT_USER_ID > 0 && (currentStep === 3 || showInviteModal);
  const createChallengeMutation = useCreateChallenge();
  const uploadChallengeCoverPhotosMutation = useUploadChallengeCoverPhotos();
  const {
    mediaUrls: viewerMediaUrls,
    initialIndex: viewerInitialIndex,
    visible: viewerVisible,
    openViewer,
    closeViewer,
  } = useFullscreenMediaViewer();
  const {
    data: followersData,
    isLoading: followersLoading,
    error: followersError,
  } = useUserFollowers(CURRENT_USER_ID, 1, 100, CURRENT_USER_ID, shouldLoadInvitees);
  const {
    data: followingData,
    isLoading: followingLoading,
    error: followingError,
  } = useUserFollowing(CURRENT_USER_ID, 1, 100, CURRENT_USER_ID, shouldLoadInvitees);
  const [form, setForm] = useState<ChallengeForm>({
    title: '',
    description: '',
    categories: [],
    challengeMode: 'DAILY',
    proofMode: 'PHOTO_REQUIRED',
    duration: '',
    rules: '',
    rewards: '',
    isPrivate: true, // Default to private
    maxParticipants: '',
    startDate: '',
    photos: [],
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [validationWarning, setValidationWarning] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [otherCategoryDraft, setOtherCategoryDraft] = useState('');
  const [showMediaSourceChooser, setShowMediaSourceChooser] = useState(false);
  const deviceTimeZone = useMemo(() => getDeviceTimeZone(), []);

  useEffect(() => {
    if (!selectedTemplate || appliedTemplateIdRef.current === selectedTemplate.id) return;

    setCreationMethod('template');
    setHasChosenCreationMethod(true);
    appliedTemplateIdRef.current = selectedTemplate.id;
    setForm((current) => ({
      ...current,
      title: selectedTemplate.title,
      description: selectedTemplate.description,
      categories: [...selectedTemplate.categories],
      challengeMode: selectedTemplate.challengeMode,
      proofMode: selectedTemplate.proofMode,
      duration: selectedTemplate.challengeMode === 'ONE_OFF' ? '' : selectedTemplate.duration,
      rules: selectedTemplate.rules,
      rewards: selectedTemplate.rewards,
      isPrivate: true,
    }));
    setErrors({});
    setValidationWarning('');
    setCurrentStep(0);
  }, [selectedTemplate]);

  useEffect(() => {
    if (startMode !== 'blank' || selectedTemplate) return;
    setCreationMethod('scratch');
    setHasChosenCreationMethod(true);
  }, [selectedTemplate, startMode]);

  const predefinedCategories = ['Fun', 'Fitness', 'Coding', 'Learning', 'Productivity', 'Creativity', 'Lifestyle', 'Health', 'Social', 'Other'];
  const challengeTypeOptions = ['Daily', 'One-off'];
  const durations = ['1 Day', '3 Days', '1 Week', '2 Weeks', '1 Month'];
  const friendsLoading = followersLoading || followingLoading;
  const friendsError = followersError || followingError;
  const isCreating = createChallengeMutation.isPending || uploadChallengeCoverPhotosMutation.isPending;

  const friends = useMemo<Friend[]>(() => {
    const usersById = new Map<number, User>();

    followersData?.users?.forEach(user => usersById.set(user.id, user));
    followingData?.users?.forEach(user => usersById.set(user.id, user));

    return Array.from(usersById.values())
      .filter(user => user.id !== CURRENT_USER_ID)
      .map(user => ({
        id: user.id.toString(),
        name: user.username || `User ${user.id}`,
        username: user.username ? `@${user.username}` : `#${user.id}`,
        avatar: user.profilePicUrl,
        isSelected: selectedFriendIds.has(user.id.toString()),
      }));
  }, [CURRENT_USER_ID, followersData?.users, followingData?.users, selectedFriendIds]);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFriends = friends.filter(friend => friend.isSelected);

  const setCategoryError = (message: string) => {
    hapticFeedback.warning();
    setErrors(prev => ({ ...prev, categories: message }));
    setValidationWarning('Please fix the highlighted field before creating the challenge.');
  };

  const toggleFriendSelection = (friendId: string) => {
    if (!selectedFriendIds.has(friendId) && selectedFriendIds.size >= MAX_INVITED_USERS) {
      hapticFeedback.warning();
      Alert.alert('Invite Limit Reached', `You can invite up to ${MAX_INVITED_USERS} users to a challenge.`);
      return;
    }

    hapticFeedback.selection();
    setSelectedFriendIds(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else if (next.size < MAX_INVITED_USERS) {
        next.add(friendId);
      }
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    // "Other" is a prompt trigger, not a real category tag.
    if (category === 'Other') {
      if (form.categories.length >= CHALLENGE_VALIDATION.category.maxCount) {
        setCategoryError(`A challenge can have at most ${CHALLENGE_VALIDATION.category.maxCount} categories`);
        return;
      }
      hapticFeedback.selection();
      setOtherCategoryDraft('');
      setShowOtherModal(true);
      return;
    }

    const isSelected = form.categories.includes(category);
    if (!isSelected && form.categories.length >= CHALLENGE_VALIDATION.category.maxCount) {
      setCategoryError(`A challenge can have at most ${CHALLENGE_VALIDATION.category.maxCount} categories`);
      return;
    }

    hapticFeedback.selection();
    setForm(prev => ({
      ...prev,
      categories: isSelected
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
    // Clear error when user selects categories
    if (errors.categories) {
      const newErrors = { ...errors };
      delete newErrors.categories;
      setErrors(newErrors);
    }
    if (validationWarning) {
      setValidationWarning('');
    }
  };

  const confirmOtherCategory = () => {
    const trimmed = otherCategoryDraft.trim();
    const categoryError = validateChallengeCategory(trimmed);
    if (categoryError) {
      setCategoryError(categoryError);
      return;
    }
    if (form.categories.length >= CHALLENGE_VALIDATION.category.maxCount) {
      setCategoryError(`A challenge can have at most ${CHALLENGE_VALIDATION.category.maxCount} categories`);
      return;
    }
    if (form.categories.some(category => normalizeCategory(category) === normalizeCategory(trimmed))) {
      setCategoryError('Categories must be unique');
      return;
    }

    hapticFeedback.selection();
    setForm(prev => ({ ...prev, categories: [...prev.categories, trimmed] }));
    if (errors.categories) {
      const newErrors = { ...errors };
      delete newErrors.categories;
      setErrors(newErrors);
    }
    if (validationWarning) {
      setValidationWarning('');
    }
    setOtherCategoryDraft('');
    setShowOtherModal(false);
  };

  const allCategories = [...predefinedCategories, ...form.categories.filter(c => !predefinedCategories.includes(c))];

  // Media handling functions
  const addPhoto = () => {
    hapticFeedback.buttonPress();
    if (form.photos.length >= 5) {
      hapticFeedback.warning();
      Alert.alert('Limit Reached', 'You can upload a maximum of 5 photos.');
      return;
    }
    setShowMediaSourceChooser(true);
  };

  const handleMediaSelected = (assets: ImagePicker.ImagePickerAsset[]) => {
    hapticFeedback.success();
    const remaining = 5 - form.photos.length;
    const selected = assets.slice(0, remaining).map((asset, index): MediaItem => ({
        id: `${Date.now()}_${index}`,
        uri: asset.uri,
        type: 'image',
        fileName: asset.fileName || `challenge_photo_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        fileSize: asset.fileSize,
    }));
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...selected] }));
  };

  const removePhoto = (photoId: string) => {
    hapticFeedback.delete();
    setForm(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }));
  };

  // Date picker functions
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      updateForm('startDate', toLocalCalendarDate(date));
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const clearDate = () => {
    setSelectedDate(null);
    updateForm('startDate', '');
  };

  const updateForm = (field: keyof ChallengeForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as string]) {
      const newErrors = { ...errors };
      delete newErrors[field as string];
      setErrors(newErrors);
    }
    if (validationWarning) {
      setValidationWarning('');
    }
  };

  const getFirstStepWithErrors = (newErrors: ChallengeFormErrors) => {
    if (newErrors.title || newErrors.description || newErrors.categories) return 0;
    if (newErrors.duration || newErrors.rules) return 1;
    return createSteps.length - 1;
  };

  const showValidationWarning = (newErrors: ChallengeFormErrors) => {
    const missingRequiredCount = requiredFields
      .filter((field) => Boolean(newErrors[field]))
      .length;

    setValidationWarning(
      missingRequiredCount > 0
        ? 'Please complete the required fields highlighted below.'
        : 'Please fix the highlighted field before creating the challenge.'
    );
  };

  const validateCurrentStep = (): boolean => {
    const allErrors = validateChallengeForm(form);
    const currentStepFields = stepFields[currentStep] ?? [];
    const newErrors = currentStepFields.reduce<ChallengeFormErrors>((stepErrors, field) => {
      if (allErrors[field]) stepErrors[field] = allErrors[field];
      return stepErrors;
    }, {});

    setErrors(prev => {
      const nextErrors = { ...prev };
      currentStepFields.forEach(field => delete nextErrors[field]);
      return { ...nextErrors, ...newErrors };
    });
    if (Object.keys(newErrors).length > 0) {
      showValidationWarning(newErrors);
    } else {
      setValidationWarning('');
    }
    return Object.keys(newErrors).length === 0;
  };

  const goToNextStep = () => {
    hapticFeedback.buttonPress();
    if (!validateCurrentStep()) {
      hapticFeedback.warning();
      return;
    }
    setCurrentStep(step => Math.min(step + 1, createSteps.length - 1));
  };

  const goToPreviousStep = () => {
    hapticFeedback.selection();
    setCurrentStep(step => Math.max(step - 1, 0));
  };

  const handleWizardBack = () => {
    if (currentStep > 0) {
      goToPreviousStep();
      return;
    }

    hapticFeedback.selection();
    router.setParams({ templateId: '', startMode: '' });
    setHasChosenCreationMethod(false);
  };

  const handleCreateChallenge = async () => {
    hapticFeedback.buttonPress();
    if (isCreating) {
      return;
    }

    const newErrors = validateChallengeForm(form);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      hapticFeedback.warning();
      setCurrentStep(getFirstStepWithErrors(newErrors));
      showValidationWarning(newErrors);
      return;
    }
    setValidationWarning('');

    if (!CURRENT_USER_ID) {
      hapticFeedback.error();
      Alert.alert('Sign In Required', 'Please sign in before creating a challenge.');
      return;
    }

    const invitedUserIds = selectedFriends.map(friend => Number(friend.id)).filter(Number.isFinite);
    if (invitedUserIds.length > MAX_INVITED_USERS) {
      hapticFeedback.warning();
      Alert.alert('Invite Limit Reached', `You can invite up to ${MAX_INVITED_USERS} users to a challenge.`);
      return;
    }

    const challengeVisibility = form.isPrivate ? 'private' : 'public';
    if (showChallengeLimitUpgradeForStatus(
      subscriptionStatus,
      challengeVisibility,
      'create',
      () => router.push('/premium' as any),
    )) {
      hapticFeedback.warning();
      return;
    }

    const invitedFriendsCount = selectedFriends.length;
    const visibilityType = form.isPrivate ? 'Private' : 'Public';

    // Convert duration string to numberOfDays
    const durationToDays: { [key: string]: number } = {
      '1 Day': 1,
      '3 Days': 3,
      '1 Week': 7,
      '2 Weeks': 14,
      '1 Month': 30,
      '3 Months': 90,
      '6 Months': 180,
      '1 Year': 365,
    };
    const numberOfDays = form.challengeMode === 'ONE_OFF'
      ? 1
      : durationToDays[form.duration] || 7;
    const normalizedCategories = form.categories.map(category => category.trim());
    const resolvedStartDate = form.startDate || toLocalCalendarDate(new Date());

    try {
      const coverPhotoUrls = form.photos.length > 0
        ? await uploadChallengeCoverPhotosMutation.mutateAsync({
            userId: CURRENT_USER_ID,
            images: form.photos.map(photo => ({
              uri: photo.uri,
              fileName: photo.fileName,
              mimeType: photo.mimeType,
              fileSize: photo.fileSize,
              type: photo.mimeType,
            })),
          })
        : [];

      // Build API request
      const createRequest: ChallengeCreateRequest = {
        title: form.title.trim(),
        description: form.description.trim(),
        rules: form.rules.trim(),
        creatorUserId: CURRENT_USER_ID,
        hashtags: normalizedCategories.map(category => category.toLowerCase()).join(','),
        categories: normalizedCategories.join(','),
        categoryValues: normalizedCategories,
        benefits: form.rewards.trim() || undefined,
        isPrivate: form.isPrivate,
        startDate: resolvedStartDate,
        numberOfDays,
        challengeMode: form.challengeMode,
        proofMode: form.proofMode,
        coverPhotoUrls: coverPhotoUrls.length > 0 ? coverPhotoUrls : undefined,
        invitedUserIds,
      };

      createChallengeMutation.mutate(createRequest, {
          onSuccess: (response) => {
            hapticFeedback.challengeCreated();
            void refreshStatus().catch(() => undefined);

            // Navigate to success screen with challenge details
            const params = {
              title: form.title,
              visibility: visibilityType,
              duration: form.challengeMode === 'ONE_OFF' ? 'One-off' : form.duration,
              challengeMode: form.challengeMode,
              categories: form.categories.join(', '),
              maxParticipants: form.maxParticipants || '',
              invitedFriends: invitedFriendsCount.toString(),
              challengeId: response.challengeId?.toString() || '',
              startDate: resolvedStartDate,
            };

            // Reset form first
            resetForm();

            // Navigate to success screen
            router.push({
              pathname: '/challenge-created',
              params: params
            });
          },
          onError: (error: any) => {
            hapticFeedback.error();
            const message = getApiErrorMessage(error, 'Failed to create challenge. Please try again.');
            if (showChallengeLimitUpgrade(
              error,
              message,
              () => router.push('/premium' as any),
              { action: 'create', visibility: challengeVisibility },
            )) {
              return;
            }
            Alert.alert('Error', message);
          },
        });
    } catch (error: any) {
      hapticFeedback.error();
      const message = getApiErrorMessage(error, 'Failed to upload challenge photos. Please try again.');
      Alert.alert('Upload Failed', message);
    }
  };

  const resetForm = () => {
    appliedTemplateIdRef.current = null;
    if (templateId || startMode) {
      router.setParams({ templateId: '', startMode: '' });
    }
    setForm({
      title: '',
      description: '',
      categories: [],
      challengeMode: 'DAILY',
      proofMode: 'PHOTO_REQUIRED',
      duration: '',
      rules: '',
      rewards: '',
      isPrivate: true, // Default to private
      maxParticipants: '',
      startDate: '',
      photos: [],
    });
    setErrors({});
    setValidationWarning('');
    setSelectedFriendIds(new Set());
    setSearchQuery('');
    setCurrentStep(0);
    setCreationMethod('template');
    setHasChosenCreationMethod(false);
  };

  const handleCreationMethodContinue = () => {
    hapticFeedback.buttonPress();
    if (creationMethod === 'template') {
      router.push('/challenge-templates' as any);
      return;
    }

    router.setParams({ templateId: '', startMode: 'blank' });
    setHasChosenCreationMethod(true);
  };

  const isFormDirty = (): boolean => {
    return !!(
      form.title.trim() ||
      form.description.trim() ||
      form.categories.length > 0 ||
      form.challengeMode !== 'DAILY' ||
      form.proofMode !== 'PHOTO_REQUIRED' ||
      form.duration ||
      form.rules.trim() ||
      form.rewards.trim() ||
      form.maxParticipants.trim() ||
      form.startDate ||
      form.photos.length > 0 ||
      selectedFriends.length > 0
    );
  };

  const handleDiscard = () => {
    if (!isFormDirty()) {
      Alert.alert('Nothing to Discard', 'The form is already empty.');
      return;
    }
    hapticFeedback.warning();
    Alert.alert(
      'Discard Challenge?',
      'Are you sure you want to discard? All unsaved changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            hapticFeedback.delete();
            resetForm();
          },
        },
      ]
    );
  };

  if (!hasChosenCreationMethod) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['#FBF9FF', '#F3EFFF', '#F8F5FC']}
          locations={[0, 0.58, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.creationMethodGlowTop} />
        <View pointerEvents="none" style={styles.creationMethodGlowBottom} />
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.creationMethodContent,
            { paddingBottom: 28 + bottomInset },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.creationMethodHero}>
            <View style={styles.creationMethodHeroIconHalo}>
              <LinearGradient
                colors={['#7C55F4', '#4700EC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.creationMethodHeroIcon}
              >
                <Ionicons name="sparkles" size={25} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.creationMethodEyebrow}>New challenge</Text>
            <Text style={styles.creationMethodHeading}>How would you like to create it?</Text>
            <Text style={styles.creationMethodCopy}>
              Choose a template to move faster, or start with a blank challenge.
            </Text>
          </View>

          <View style={styles.creationMethodOptions}>
            <TouchableOpacity
              style={[
                styles.creationMethodOption,
                creationMethod === 'template' && styles.creationMethodOptionSelected,
              ]}
              onPress={() => {
                hapticFeedback.selection();
                setCreationMethod('template');
              }}
              accessibilityRole="radio"
              accessibilityLabel="Use a challenge template"
              accessibilityState={{ selected: creationMethod === 'template' }}
            >
              <View style={[
                styles.creationMethodOptionIcon,
                creationMethod === 'template' && styles.creationMethodOptionIconSelected,
              ]}>
                <Ionicons
                  name="albums-outline"
                  size={23}
                  color={creationMethod === 'template' ? '#FFFFFF' : '#5B3FE5'}
                />
              </View>
              <View style={styles.creationMethodOptionCopy}>
                <View style={styles.creationMethodOptionTitleRow}>
                  <Text style={styles.creationMethodOptionTitle}>Use a template</Text>
                  <View style={styles.creationMethodRecommendedBadge}>
                    <Text style={styles.creationMethodRecommendedText}>Recommended</Text>
                  </View>
                </View>
                <Text style={styles.creationMethodOptionText}>
                  Start quickly with a ready-made challenge you can personalise.
                </Text>
              </View>
              <View style={[
                styles.creationMethodRadio,
                creationMethod === 'template' && styles.creationMethodRadioSelected,
              ]}>
                {creationMethod === 'template' ? (
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                ) : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.creationMethodOption,
                creationMethod === 'scratch' && styles.creationMethodOptionSelected,
              ]}
              onPress={() => {
                hapticFeedback.selection();
                setCreationMethod('scratch');
              }}
              accessibilityRole="radio"
              accessibilityLabel="Create a challenge from scratch"
              accessibilityState={{ selected: creationMethod === 'scratch' }}
            >
              <View style={[
                styles.creationMethodOptionIcon,
                creationMethod === 'scratch' && styles.creationMethodOptionIconSelected,
              ]}>
                <Ionicons
                  name="create-outline"
                  size={23}
                  color={creationMethod === 'scratch' ? '#FFFFFF' : '#5B3FE5'}
                />
              </View>
              <View style={styles.creationMethodOptionCopy}>
                <Text style={styles.creationMethodOptionTitle}>Create it myself</Text>
                <Text style={styles.creationMethodOptionText}>
                  Build your own way!
                </Text>
              </View>
              <View style={[
                styles.creationMethodRadio,
                creationMethod === 'scratch' && styles.creationMethodRadioSelected,
              ]}>
                {creationMethod === 'scratch' ? (
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                ) : null}
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.creationMethodContinueButton}
            onPress={handleCreationMethodContinue}
            accessibilityRole="button"
            accessibilityLabel={
              creationMethod === 'template' ? 'Browse challenge templates' : 'Create challenge yourself'
            }
            activeOpacity={0.86}
          >
            <LinearGradient
              colors={['#6D35F2', '#4700EC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.creationMethodContinueGradient}
            >
              <Text style={styles.creationMethodContinueText}>
                {creationMethod === 'template' ? 'Browse templates' : 'Start creating'}
              </Text>
              <View style={styles.creationMethodContinueIcon}>
                <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.creationMethodFooterHint}>
            Nothing is published until you review and create it.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const FriendItem: React.FC<{ friend: Friend }> = ({ friend }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() => toggleFriendSelection(friend.id)}
    >
      <AvatarImage uri={friend.avatar} size={40} style={styles.friendAvatar} />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.name}</Text>
        <Text style={styles.friendUsername}>{friend.username}</Text>
      </View>
      <View style={[styles.checkbox, friend.isSelected && styles.checkedBox]}>
        {friend.isSelected && <Ionicons name="checkmark" size={16} color="#ffffff" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? bottomInset : 0}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + bottomInset }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <TouchableOpacity
              style={styles.stepIconCircle}
              onPress={handleWizardBack}
              accessibilityRole="button"
              accessibilityLabel={currentStep > 0 ? 'Go to previous step' : 'Go back'}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.progressTextBlock}>
              <Text style={styles.progressEyebrow}>
                Step {currentStep + 1} of {createSteps.length}
              </Text>
              <Text style={styles.progressTitle}>{createSteps[currentStep].title}</Text>
              <Text style={styles.progressSubtitle}>{createSteps[currentStep].subtitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.discardButton}
              onPress={handleDiscard}
              accessibilityRole="button"
              accessibilityLabel="Discard challenge draft"
            >
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
            </TouchableOpacity>
          </View>
          <View style={styles.progressTrack}>
            {createSteps.map((step, index) => (
              <View
                key={step.title}
                style={[styles.progressSegment, index <= currentStep && styles.progressSegmentActive]}
              />
            ))}
          </View>
        </View>

        {validationWarning ? (
          <View style={styles.validationWarningCard}>
            <Ionicons name="alert-circle" size={18} color="#FFB020" />
            <Text style={styles.validationWarningText}>{validationWarning}</Text>
          </View>
        ) : null}

        {currentStep === 0 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepHeading}>Make it yours</Text>
            <Text style={styles.stepCopy}>
              Give your friends a clear goal they can understand at a glance.
            </Text>

            <CustomTextInput
              label="Challenge Title"
              labelStyle={styles.compactInputLabel}
              placeholder="Enter an engaging title..."
              value={form.title}
              onChangeText={(value) => updateForm('title', value)}
              error={errors.title}
              helperText={`${form.title.trim().length}/${CHALLENGE_VALIDATION.title.max}`}
              maxLength={CHALLENGE_VALIDATION.title.max}
              required
            />

            <CustomTextInput
              label="Description"
              labelStyle={styles.compactInputLabel}
              placeholder="Describe what participants will do..."
              value={form.description}
              onChangeText={(value) => updateForm('description', value)}
              error={errors.description}
              multiline
              autoGrow
              numberOfLines={4}
              style={styles.textArea}
              helperText={`${form.description.trim().length}/${CHALLENGE_VALIDATION.description.max}`}
              maxLength={CHALLENGE_VALIDATION.description.max}
              required
            />

            <View style={styles.multiSelectContainer}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Categories</Text>
                <Text style={styles.requiredIndicator}>*</Text>
              </View>
              {errors.categories && (
                <Text style={styles.errorText}>{errors.categories}</Text>
              )}
              <View style={styles.categoriesGrid}>
                {allCategories.map((category) => {
                  const isSelected = form.categories.includes(category);
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected
                      ]}
                      onPress={() => toggleCategory(category)}
                    >
                      <Ionicons
                        name={getCategoryIcon(category)}
                        size={18}
                        color={isSelected ? '#4700EC' : '#18142F'}
                        style={styles.categoryIcon}
                      />
                      <Text style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected
                      ]}>
                        {category}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color="#5B3FE5" style={styles.categoryCheckIcon} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {currentStep === 1 && (
          <View style={styles.stepCard}>
            <Text style={styles.stepHeading}>Shape the challenge format</Text>
            <Text style={styles.stepCopy}>
              Decide whether this is a daily habit or a one-time challenge, then set the rules.
            </Text>

            <OptionSelector
              label="Challenge Type"
              options={challengeTypeOptions}
              selectedOption={form.challengeMode === 'ONE_OFF' ? 'One-off' : 'Daily'}
              onSelect={(value) => {
                const nextMode = value === 'One-off' ? 'ONE_OFF' : 'DAILY';
                updateForm('challengeMode', nextMode);
                if (nextMode === 'ONE_OFF') {
                  updateForm('duration', '');
                  updateForm('startDate', '');
                  setSelectedDate(null);
                  setShowDatePicker(false);
                }
              }}
              required
            />

            {form.challengeMode === 'DAILY' && (
              <OptionSelector
                label="Duration"
                options={durations}
                selectedOption={form.duration}
                onSelect={(value) => updateForm('duration', value)}
                error={errors.duration}
                required
              />
            )}

            <Text style={styles.stepHeading}>Photo check-ins</Text>
            <Text style={styles.stepCopy}>
              Every check-in needs a short update and at least one photo.
            </Text>

            {form.challengeMode === 'DAILY' && (
              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerLabel}>Start Date (Optional)</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={showDatePickerModal}
                >
                  <Ionicons name="calendar" size={20} color="#4700ecff" />
                  <Text style={[styles.datePickerText, !form.startDate && styles.datePickerPlaceholder]}>
                    {form.startDate || 'Select start date or leave empty for immediate start'}
                  </Text>
                  {form.startDate && (
                    <TouchableOpacity onPress={clearDate} style={styles.clearDateButton}>
                      <Ionicons name="close-circle" size={20} color="#666666" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <CustomTextInput
              label="Rules & Guidelines"
              labelStyle={styles.compactInputLabel}
              placeholder="What are the rules participants must follow?"
              value={form.rules}
              onChangeText={(value) => updateForm('rules', value)}
              error={errors.rules}
              multiline
              autoGrow
              numberOfLines={3}
              style={styles.textArea}
              helperText={`${form.rules.trim().length}/${CHALLENGE_VALIDATION.rules.max}`}
              maxLength={CHALLENGE_VALIDATION.rules.max}
              required
            />

            <CustomTextInput
              label="Rewards & Benefits"
              labelStyle={styles.compactInputLabel}
              placeholder="What will participants gain? (optional)"
              value={form.rewards}
              onChangeText={(value) => updateForm('rewards', value)}
              multiline
              autoGrow
              numberOfLines={2}
              style={styles.textArea}
              maxLength={CHALLENGE_VALIDATION.rewards.max}
            />
          </View>
        )}

        {showDatePicker && Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
          >
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerModalContent}>
                <View style={styles.datePickerModalHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerModalTitle}>Select Start Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={startOfLocalDay()}
                  timeZoneName={deviceTimeZone}
                  themeVariant="light"
                  style={styles.datePickerIOS}
                />
              </View>
            </View>
          </Modal>
        )}
        
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={startOfLocalDay()}
            timeZoneName={deviceTimeZone}
          />
        )}

        {currentStep === 2 && (
          <View style={styles.stepCard}>
            <Text style={styles.sectionTitle}>Challenge Media</Text>
            <Text style={styles.sectionSubtitle}>
              Add photos to showcase your challenge (optional)
            </Text>

            <View style={styles.mediaTypeContainer}>
              <View style={styles.mediaTypeHeader}>
                <Text style={styles.mediaTypeTitle}>Photos ({form.photos.length}/5)</Text>
                <TouchableOpacity
                  style={[styles.addMediaButton, form.photos.length >= 5 && styles.addMediaButtonDisabled]}
                  onPress={addPhoto}
                  disabled={form.photos.length >= 5}
                >
                  <Ionicons name="camera" size={20} color={form.photos.length >= 5 ? "#666666" : "#4700ecff"} />
                  <Text style={[styles.addMediaText, form.photos.length >= 5 && styles.addMediaTextDisabled]}>
                    Add Photo
                  </Text>
                </TouchableOpacity>
              </View>

              {form.photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScrollView}>
                  {form.photos.map((photo, index) => (
                    <View key={photo.id} style={styles.mediaItem}>
                      <TouchableOpacity
                        onPress={() => openViewer(form.photos.map((photo) => photo.uri), index)}
                        activeOpacity={0.88}
                        accessibilityLabel={`Open photo ${index + 1} fullscreen`}
                        accessibilityRole="button"
                      >
                        <Image source={{ uri: photo.uri }} style={styles.mediaPreview} resizeMode="contain" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeMediaButton}
                        onPress={() => removePhoto(photo.id)}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <TouchableOpacity style={styles.emptyMediaCard} onPress={addPhoto}>
                  <Ionicons name="image-outline" size={34} color="#4700ecff" />
                  <Text style={styles.emptyMediaTitle}>Add a visual hook</Text>
                  <Text style={styles.emptyMediaText}>A cover image makes your challenge easier to spot.</Text>
                </TouchableOpacity>
              )}
            </View>

            <Separator marginTop={6} marginBottom={18} />

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Preview</Text>
              <Text style={styles.previewTitle} selectable>{form.title || 'Your challenge title'}</Text>
              <Text style={styles.previewDescription} numberOfLines={2} selectable>
                {form.description || 'A short description will appear here.'}
              </Text>
              <View style={styles.previewMetaRow}>
                <Text style={styles.previewPill}>{form.categories[0] || 'Category'}</Text>
                <Text style={styles.previewPill}>
                  {form.challengeMode === 'ONE_OFF' ? 'One-off' : form.duration || 'Daily'}
                </Text>
                <Text style={styles.previewPill}>{form.isPrivate ? 'Private' : 'Public'}</Text>
              </View>
            </View>
          </View>
        )}

        {currentStep === 3 && (
          <View style={styles.stepCard}>
            <Text style={styles.sectionTitle}>Private by default</Text>
            <Text style={styles.stepCopy}>
              Your challenge stays inside your invited circle. Public discovery is optional.
            </Text>

            <View
              style={styles.visibilityWarningCard}
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              accessibilityLabel="Important: Challenge visibility cannot be changed after creation."
            >
              <Ionicons
                name="warning-outline"
                size={20}
                color="#FFB020"
                accessible={false}
              />
              <View style={styles.visibilityWarningCopy}>
                <Text style={styles.visibilityWarningTitle}>Choose carefully</Text>
                <Text style={styles.visibilityWarningText}>
                  Challenge visibility cannot be changed after creation.
                </Text>
              </View>
            </View>

            {subscriptionStatus ? (
              <View style={[
                styles.planLimitCard,
                (form.isPrivate
                  ? subscriptionStatus.activePrivateChallenges >= subscriptionStatus.privateChallengeLimit
                  : subscriptionStatus.activePublicChallenges >= subscriptionStatus.publicChallengeLimit)
                  && styles.planLimitCardFull,
              ]}>
                <View style={styles.planLimitIcon}>
                  <Ionicons
                    name={subscriptionStatus.premium ? 'diamond' : 'layers-outline'}
                    size={19}
                    color="#5B25D6"
                  />
                </View>
                <View style={styles.planLimitCopy}>
                  <Text style={styles.planLimitTitle}>
                    {subscriptionStatus.premium ? 'Premium' : 'Free'} plan · {form.isPrivate
                      ? `${subscriptionStatus.activePrivateChallenges} of ${subscriptionStatus.privateChallengeLimit} private`
                      : `${subscriptionStatus.activePublicChallenges} of ${subscriptionStatus.publicChallengeLimit} public`}
                  </Text>
                  <Text style={styles.planLimitText}>Challenges you create and join both count toward this active limit.</Text>
                </View>
                {!subscriptionStatus.premium ? (
                  <TouchableOpacity
                    style={styles.planUpgradeButton}
                    onPress={() => router.push('/premium' as any)}
                    accessibilityLabel="View ChallengeSphere Premium"
                  >
                    <Ionicons name="diamond" size={13} color="#FFFFFF" />
                    <Text style={styles.planUpgradeButtonText}>Unlock 15</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <View style={styles.visibilityContainer}>
              <TouchableOpacity
                style={[styles.visibilityOption, form.isPrivate && styles.visibilityOptionActive]}
                onPress={() => {
                  hapticFeedback.selection();
                  updateForm('isPrivate', true);
                }}
              >
                <View style={styles.visibilityHeader}>
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color={form.isPrivate ? '#4700ecff' : '#666666'}
                  />
                  <Text style={[styles.visibilityTitle, form.isPrivate && styles.visibilityTitleActive]}>
                    Private Challenge
                  </Text>
                  {/* <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                  </View> */}
                  <View style={[styles.radioButton, form.isPrivate && styles.radioButtonActive]}>
                    {form.isPrivate && <View style={styles.radioButtonInner} />}
                  </View>
                </View>
                <Text style={styles.visibilityDescription}>
                  Only invited friends can see and join. Best for trusted accountability and a challenge that feels like yours.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.visibilityOption, !form.isPrivate && styles.visibilityOptionActive]}
                onPress={() => {
                  hapticFeedback.selection();
                  updateForm('isPrivate', false);
                }}
              >
                <View style={styles.visibilityHeader}>
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color={!form.isPrivate ? '#4700ecff' : '#666666'}
                  />
                  <Text style={[styles.visibilityTitle, !form.isPrivate && styles.visibilityTitleActive]}>
                    Public Challenge
                  </Text>
                  <View style={[styles.radioButton, !form.isPrivate && styles.radioButtonActive]}>
                    {!form.isPrivate && <View style={styles.radioButtonInner} />}
                  </View>
                </View>
                <Text style={styles.visibilityDescription}>
                  Anyone can discover and join. Choose this only when you want to open the challenge beyond your friends.
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inviteSection}>
              <Text style={styles.sectionTitle}>Invite people (optional)</Text>
              <Text style={styles.inviteDescription}>
                {form.isPrivate
                  ? 'Start on your own or choose specific app friends now. Only the owner can send targeted private invitations later.'
                  : 'Invite specific friends to join your public challenge. Others can still discover and join without an invitation.'
                }
              </Text>
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  setShowInviteModal(true);
                }}
              >
                <Ionicons name="person-add" size={20} color="#4700ecff" />
                <Text style={styles.inviteButtonText}>
                  {selectedFriends.length > 0
                    ? `${selectedFriends.length} friends selected`
                    : 'Choose friends already in your sphere'
                  }
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#666666" />
              </TouchableOpacity>

              {selectedFriends.length > 0 && (
                <View style={styles.selectedFriends}>
                  {selectedFriends.slice(0, 3).map((friend) => (
                    <AvatarImage
                      key={friend.id}
                      uri={friend.avatar}
                      size={32}
                      style={styles.selectedFriendAvatar}
                    />
                  ))}
                  {selectedFriends.length > 3 && (
                    <View style={styles.moreCount}>
                      <Text style={styles.moreCountText}>+{selectedFriends.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Ready to create</Text>
              <View style={styles.summaryRow}>
                <Ionicons
                  name={form.isPrivate ? "lock-closed" : "globe-outline"}
                  size={16}
                  color="#4700ecff"
                />
                <Text style={styles.summaryText}>
                  {form.isPrivate ? 'Private Challenge' : 'Public Challenge'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name={form.challengeMode === 'ONE_OFF' ? 'checkmark-circle-outline' : 'calendar'} size={16} color="#4700ecff" />
                <Text style={styles.summaryText}>
                  {form.challengeMode === 'ONE_OFF' ? 'One-off' : form.duration || 'Daily'}
                </Text>
              </View>
              {selectedFriends.length > 0 && (
                <View style={styles.summaryRow}>
                  <Ionicons name="people" size={16} color="#4700ecff" />
                  <Text style={styles.summaryText}>
                    {selectedFriends.length} friends invited
                  </Text>
                </View>
              )}
              {form.maxParticipants && form.maxParticipants !== 'No limit' && (
                <View style={styles.summaryRow}>
                  <Ionicons name="person" size={16} color="#4700ecff" />
                  <Text style={styles.summaryText}>
                    Max {form.maxParticipants} participants
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.wizardFooter}>
          {currentStep > 0 ? (
            <TouchableOpacity
              style={styles.backStepButton}
              onPress={goToPreviousStep}
              disabled={isCreating}
              haptic="selection"
            >
              <Ionicons name="chevron-back" size={19} color="#18142F" />
              <Text style={styles.backStepText}>Back</Text>
            </TouchableOpacity>
          ) : null}

          {currentStep < createSteps.length - 1 ? (
            <TouchableOpacity
              style={styles.nextStepButton}
              onPress={goToNextStep}
              haptic="selection"
            >
              <Text style={styles.nextStepText}>Next</Text>
              <Ionicons name="chevron-forward" size={19} color="#ffffff" />
            </TouchableOpacity>
          ) : currentStep === createSteps.length - 1 ? (
            <TouchableOpacity
              style={[styles.nextStepButton, styles.createStepButton, isCreating && styles.nextStepButtonDisabled]}
              onPress={handleCreateChallenge}
              feedbackTiming="after-paint"
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.nextStepText}>
                    {uploadChallengeCoverPhotosMutation.isPending
                      ? "Uploading Photos..."
                      : createChallengeMutation.isPending
                        ? "Creating..."
                        : "Create challenge"}
                  </Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Other Category Modal */}
      <Modal
        visible={showOtherModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowOtherModal(false)}
      >
        <View style={styles.otherModalOverlay}>
          <View style={styles.otherModalCard}>
            <Text style={styles.otherModalTitle}>Add a custom category</Text>
            <Text style={styles.otherModalSubtitle}>
              Enter a category that describes your challenge.
            </Text>
            <TextInput
              style={styles.otherModalInput}
              placeholder="e.g. Meditation, Cooking..."
              placeholderTextColor="#666666"
              value={otherCategoryDraft}
              onChangeText={setOtherCategoryDraft}
              onSubmitEditing={confirmOtherCategory}
              autoFocus
              returnKeyType="done"
              maxLength={CHALLENGE_VALIDATION.category.max}
            />
            {errors.categories ? (
              <Text style={styles.errorText}>{errors.categories}</Text>
            ) : null}
            <View style={styles.otherModalActions}>
              <TouchableOpacity
                style={[styles.otherModalButton, styles.otherModalCancel]}
                onPress={() => setShowOtherModal(false)}
              >
                <Text style={styles.otherModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.otherModalButton,
                  styles.otherModalConfirm,
                  !otherCategoryDraft.trim() && styles.otherModalConfirmDisabled,
                ]}
                onPress={confirmOtherCategory}
                disabled={!otherCategoryDraft.trim()}
              >
                <Text style={styles.otherModalConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Friends Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardAvoidingContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? bottomInset : 0}
        >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={[styles.inviteModalHeaderButton, styles.inviteModalHeaderButtonStart]}
              onPress={() => setShowInviteModal(false)}
            >
              <Text style={styles.modalCancel} numberOfLines={1}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.inviteModalTitle} numberOfLines={1}>Invite Friends</Text>
            <TouchableOpacity
              style={[styles.inviteModalHeaderButton, styles.inviteModalHeaderButtonEnd]}
              onPress={() => setShowInviteModal(false)}
            >
              <Text style={styles.modalDone} numberOfLines={1}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              maxLength={100}
            />
          </View>

          {friendsLoading ? (
            <View style={styles.inviteStateContainer}>
              <ActivityIndicator color="#4700ecff" size="large" />
              <Text style={styles.inviteStateText}>Loading friends...</Text>
            </View>
          ) : friendsError ? (
            <View style={styles.inviteStateContainer}>
              <Ionicons name="warning-outline" size={36} color="#FF5252" />
              <Text style={styles.inviteStateText}>Could not load followers and following.</Text>
            </View>
          ) : filteredFriends.length === 0 ? (
            <View style={styles.inviteStateContainer}>
              <Ionicons name="people-outline" size={40} color="#666666" />
              <Text style={styles.inviteStateText}>
                {searchQuery.trim() ? 'No matching friends found.' : 'Follow people or gain followers to invite them.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredFriends}
              renderItem={({ item }) => <FriendItem friend={item} />}
              keyExtractor={(item) => item.id}
              style={styles.friendsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            />
          )}
        </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
      <MediaSourceChooser
        visible={showMediaSourceChooser}
        onClose={() => setShowMediaSourceChooser(false)}
        onSelected={handleMediaSelected}
        allowsMultipleSelection
        selectionLimit={5 - form.photos.length}
        aspect={[16, 9]}
        title="Challenge photos"
      />
      <SubmissionMediaViewer
        visible={viewerVisible}
        mediaUrls={viewerMediaUrls}
        initialIndex={viewerInitialIndex}
        onClose={closeViewer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1EFF7',
  },
  discardButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    marginLeft: 8,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    flexGrow: 1,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#D8D2E2',
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4700ecff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  progressTextBlock: {
    flex: 1,
  },
  progressEyebrow: {
    color: '#6C42E8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  progressTitle: {
    color: '#18142F',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 3,
  },
  progressSubtitle: {
    color: '#655F70',
    fontSize: 12,
    lineHeight: 17,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 7,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D8D2E2',
  },
  progressSegmentActive: {
    backgroundColor: '#4700ecff',
  },
  validationWarningCard: {
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 176, 32, 0.4)',
    backgroundColor: 'rgba(255, 176, 32, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  validationWarningText: {
    flex: 1,
    color: '#8A5700',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D8D2E2',
    elevation: 2,
  },
  creationMethodContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  creationMethodGlowTop: {
    position: 'absolute',
    top: -100,
    right: -88,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(109, 53, 242, 0.10)',
  },
  creationMethodGlowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 196, 163, 0.12)',
  },
  creationMethodHero: {
    alignItems: 'center',
    marginBottom: 26,
  },
  creationMethodHeroIconHalo: {
    width: 76,
    height: 76,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(232, 224, 255, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.86)',
  },
  creationMethodHeroIcon: {
    width: 58,
    height: 58,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4700EC',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 4,
  },
  creationMethodEyebrow: {
    marginBottom: 6,
    color: '#6C42E8',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  creationMethodHeading: {
    color: '#18142F',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  creationMethodCopy: {
    maxWidth: 330,
    marginTop: 9,
    color: '#655F70',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    textAlign: 'center',
  },
  creationMethodOptions: {
    gap: 14,
  },
  creationMethodOption: {
    minHeight: 108,
    padding: 15,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DED9E8',
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    shadowColor: '#18142F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  creationMethodOptionSelected: {
    borderColor: '#5B3FE5',
    borderWidth: 2,
    backgroundColor: '#F5F1FF',
    shadowColor: '#5B3FE5',
    shadowOpacity: 0.13,
    shadowRadius: 12,
    elevation: 3,
  },
  creationMethodOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E0FF',
  },
  creationMethodOptionIconSelected: {
    backgroundColor: '#5B3FE5',
  },
  creationMethodOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  creationMethodOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  creationMethodOptionTitle: {
    color: '#18142F',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  creationMethodOptionText: {
    marginTop: 5,
    color: '#655F70',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  creationMethodRecommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E5DBFF',
  },
  creationMethodRecommendedText: {
    color: '#4A25B8',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  creationMethodRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#A19BAA',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  creationMethodRadioSelected: {
    borderColor: '#5B3FE5',
    backgroundColor: '#5B3FE5',
  },
  creationMethodContinueButton: {
    marginTop: 22,
    borderRadius: 20,
    shadowColor: '#4700EC',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 5,
  },
  creationMethodContinueGradient: {
    minHeight: 60,
    borderRadius: 20,
    paddingLeft: 22,
    paddingRight: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  creationMethodContinueIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  creationMethodContinueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  creationMethodFooterHint: {
    marginTop: 12,
    color: '#77717F',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepHeading: {
    color: '#18142F',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 7,
  },
  stepCopy: {
    color: '#655F70',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
    marginBottom: 16,
  },
  visibilityContainer: {
    marginBottom: 20,
  },
  visibilityWarningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    marginBottom: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 176, 32, 0.4)',
    backgroundColor: 'rgba(255, 176, 32, 0.12)',
  },
  visibilityWarningCopy: {
    flex: 1,
  },
  visibilityWarningTitle: {
    color: '#8A5700',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  visibilityWarningText: {
    marginTop: 2,
    color: '#6F4A08',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  planLimitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    marginBottom: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9CBFF',
    backgroundColor: '#F3EFFF',
  },
  planLimitCardFull: {
    borderColor: '#9A67FF',
    backgroundColor: '#EEE7FF',
  },
  planLimitIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  planLimitCopy: {
    flex: 1,
    minWidth: 0,
  },
  planLimitTitle: {
    color: '#312C3B',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  planLimitText: {
    color: '#6F687B',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 2,
  },
  planUpgradeButton: {
    height: 30,
    minWidth: 76,
    paddingHorizontal: 9,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#5B25D6',
  },
  planUpgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  visibilityOption: {
    backgroundColor: '#F8F7FC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#D8D2E2',
  },
  visibilityOptionActive: {
    borderColor: '#4700ecff',
    backgroundColor: '#F1ECFF',
  },
  visibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
    flex: 1,
    marginLeft: 12,
  },
  visibilityTitleActive: {
    color: '#4700ecff',
  },
  recommendedBadge: {
    marginRight: 9,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F0ECFF',
    borderWidth: 1,
    borderColor: '#DDD4FF',
  },
  recommendedBadgeText: {
    color: '#5B3FE5',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  visibilityDescription: {
    fontSize: 13,
    color: '#777389',
    lineHeight: 19,
    marginLeft: 32,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
    borderColor: '#4700ecff',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4700ecff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 15,
    color: '#18142F',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333333',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#4700ecff',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    marginLeft: 22,
  },
  inviteSection: {
    marginBottom: 20,
  },
  inviteDescription: {
    fontSize: 13,
    color: '#777389',
    lineHeight: 19,
    marginBottom: 16,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F7FC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8D2E2',
    marginBottom: 12,
  },
  inviteButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#18142F',
    marginLeft: 12,
  },
  selectedFriends: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  selectedFriendAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#4700ecff',
  },
  moreCount: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4700ecff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCountText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  wizardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 22,
    marginBottom: 20,
  },
  backStepButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backStepText: {
    color: '#18142F',
    fontSize: 15,
    fontWeight: '700',
  },
  nextStepButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#4700ecff',
    borderWidth: 1,
    borderColor: '#6f3bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createStepButton: {
    backgroundColor: '#4700ecff',
  },
  nextStepButtonDisabled: {
    opacity: 0.48,
  },
  nextStepText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  greenButton: {
    backgroundColor: '#4caf50',
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  viewFollowersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
  },
  viewFollowersText: {
    fontSize: 15,
    color: '#4700ecff',
    marginLeft: 8,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  modalKeyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D8D2E2',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#18142F',
  },
  inviteModalTitle: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 8,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: '#18142F',
    textAlign: 'center',
  },
  inviteModalHeaderButton: {
    width: 76,
    minHeight: 44,
    justifyContent: 'center',
  },
  inviteModalHeaderButtonStart: {
    alignItems: 'flex-start',
  },
  inviteModalHeaderButtonEnd: {
    alignItems: 'flex-end',
  },
  modalCancel: {
    fontSize: 15,
    color: '#777389',
  },
  modalDone: {
    fontSize: 15,
    color: '#4700ecff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8D2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#18142F',
  },
  friendsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inviteStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  inviteStateText: {
    color: '#777389',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#18142F',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 13,
    color: '#777389',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#4700ecff',
    borderColor: '#4700ecff',
  },
  summaryContainer: {
    backgroundColor: '#F8F7FC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#655F70',
    marginLeft: 8,
  },
  mediaSection: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#777389',
    marginBottom: 16,
    lineHeight: 19,
  },
  mediaTypeContainer: {
    marginBottom: 20,
  },
  mediaTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaTypeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#4700ecff20',
    borderRadius: 14,
    gap: 6,
  },
  addMediaButtonDisabled: {
    backgroundColor: '#66666620',
  },
  addMediaText: {
    fontSize: 13,
    color: '#4700ecff',
    fontWeight: '500',
  },
  addMediaTextDisabled: {
    color: '#777389',
  },
  mediaScrollView: {
    marginTop: 8,
  },
  mediaItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaPreview: {
    width: 120,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    resizeMode: 'contain',
  },
  emptyMediaCard: {
    minHeight: 150,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#4700ec88',
    backgroundColor: '#4700ec10',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  emptyMediaTitle: {
    color: '#18142F',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 5,
  },
  emptyMediaText: {
    color: '#777389',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  previewLabel: {
    color: '#6C42E8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewTitle: {
    color: '#18142F',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 7,
  },
  previewDescription: {
    color: '#655F70',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  previewMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewPill: {
    color: '#5B3FE5',
    backgroundColor: '#4700ec20',
    borderColor: '#4700ec55',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  datePickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18142F',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    gap: 12,
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: '#18142F',
  },
  datePickerPlaceholder: {
    color: '#777389',
  },
  clearDateButton: {
    padding: 2,
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 34,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D8D2E2',
  },
  datePickerModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#18142F',
  },
  datePickerCancelText: {
    fontSize: 15,
    color: '#777389',
  },
  datePickerDoneText: {
    fontSize: 15,
    color: '#4700ecff',
    fontWeight: '600',
  },
  datePickerIOS: {
    backgroundColor: '#FFFFFF',
  },
  // Multi-select category styles
  multiSelectContainer: {
    paddingTop: 24,
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 18,
    paddingVertical: 10,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#18142F',
  },
  compactInputLabel: {
    fontSize: 13,
  },
  requiredIndicator: {
    fontSize: 13,
    lineHeight: 18,
    color: '#ff5252',
    marginLeft: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#ff5252',
    marginBottom: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F6F4FA',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D8D2E2',
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#E7DFFF',
    borderColor: '#5B3FE5',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#18142F',
  },
  categoryChipTextSelected: {
    color: '#4700ecff',
  },
  categoryIcon: {
    flexShrink: 0,
  },
  categoryCheckIcon: {
    marginLeft: 4,
  },
  selectedCategoriesText: {
    fontSize: 11,
    color: '#655F70',
    fontStyle: 'italic',
  },
  otherModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  otherModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  otherModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#18142F',
    marginBottom: 6,
  },
  otherModalSubtitle: {
    fontSize: 12,
    color: '#777389',
    marginBottom: 16,
    lineHeight: 17,
  },
  otherModalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#18142F',
    fontSize: 14,
    marginBottom: 16,
  },
  otherModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  otherModalButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
  },
  otherModalCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E7E3EF',
  },
  otherModalCancelText: {
    color: '#5F5968',
    fontSize: 13,
    fontWeight: '600',
  },
  otherModalConfirm: {
    backgroundColor: '#4700ecff',
  },
  otherModalConfirmDisabled: {
    opacity: 0.4,
  },
  otherModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default Create;
