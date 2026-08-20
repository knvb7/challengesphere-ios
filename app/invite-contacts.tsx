import { Ionicons } from '@expo/vector-icons';
import { AppAlert as Alert } from '@/utils/appAlert';
import * as Clipboard from 'expo-clipboard';
import * as Contacts from 'expo-contacts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppTouchableOpacity as TouchableOpacity } from '@/components/common/AppPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildAppInviteMessage,
  buildChallengeInviteMessage,
  buildChallengeInviteUrl,
} from '../constants/inviteLinks';
import { useGenerateInviteLink } from '../hooks/useInvites';
import { useAuthContext } from '../providers/AuthProvider';
import { extractInviteCode, normalizeInviteCode } from '../services/pendingInviteService';

type InviteMode = 'app' | 'challenge';

type ResolvedChallengeInvite = {
  inviteCode: string;
  inviteUrl: string;
};

const getRouteParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const getContactName = (contact: Contacts.Contact) =>
  contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unnamed contact';

const getPrimaryPhoneNumber = (contact: Contacts.Contact) =>
  contact.phoneNumbers?.find((phone) => phone.number || phone.digits);

const getPhoneLabel = (phone?: Contacts.PhoneNumber) =>
  phone?.number || phone?.digits || '';

const normalizeWhatsAppPhone = (phoneNumber: string) => phoneNumber.replace(/\D/g, '');

export default function InviteContactsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUserId } = useAuthContext();
  const generateInviteMutation = useGenerateInviteLink();

  const mode = (getRouteParam(params.mode) === 'challenge' ? 'challenge' : 'app') as InviteMode;
  const challengeId = Number(getRouteParam(params.challengeId) ?? 0);
  const challengeTitle = getRouteParam(params.challengeTitle);
  const routeInviteUrl = getRouteParam(params.inviteUrl);
  const routeInviteCode = extractInviteCode(getRouteParam(params.inviteCode))
    || extractInviteCode(routeInviteUrl);
  const title = mode === 'challenge' ? 'Invite to Challenge' : 'Invite Friends';
  const subtitle = mode === 'challenge'
    ? (challengeTitle ? challengeTitle : 'Share a challenge invitation')
    : 'Bring your friends to ChallengeSphere';

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [contactsRequested, setContactsRequested] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contacts, setContacts] = useState<Contacts.ExistingContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sharingContactId, setSharingContactId] = useState<string | null>(null);
  const [sharingWithoutContact, setSharingWithoutContact] = useState(false);
  const [sharingNatively, setSharingNatively] = useState(false);
  const [copyingInvite, setCopyingInvite] = useState(false);
  const generatedInviteRef = useRef<ResolvedChallengeInvite | null>(
    routeInviteCode
      ? {
          inviteCode: routeInviteCode,
          inviteUrl: buildChallengeInviteUrl(routeInviteCode),
        }
      : null,
  );

  const loadContacts = useCallback(async () => {
    setContactsRequested(true);
    setLoadingContacts(true);
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== Contacts.PermissionStatus.GRANTED) {
        setPermissionDenied(true);
        return;
      }

      const response = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      setPermissionDenied(false);
      setContacts(response.data.filter((contact) => getPrimaryPhoneNumber(contact)));
    } catch {
      Alert.alert('Contacts unavailable', 'Could not load contacts right now.');
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return contacts;
    }

    return contacts.filter((contact) => {
      const name = getContactName(contact).toLowerCase();
      const phone = getPhoneLabel(getPrimaryPhoneNumber(contact)).toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [contacts, searchQuery]);

  const resolveChallengeInvite = useCallback(async (): Promise<ResolvedChallengeInvite | null> => {
    if (mode !== 'challenge') return null;
    if (generatedInviteRef.current) return generatedInviteRef.current;

    if (!challengeId || !currentUserId) {
      throw new Error('missing-challenge');
    }

    const invite = await generateInviteMutation.mutateAsync({
      challengeId,
      userId: currentUserId,
      maxUses: 50,
      expiresInHours: 720,
    });

    const inviteCode = normalizeInviteCode(invite.inviteCode);
    if (!inviteCode) {
      throw new Error('missing-invite-code');
    }

    const resolvedInvite = {
      inviteCode,
      inviteUrl: buildChallengeInviteUrl(inviteCode),
    };
    generatedInviteRef.current = resolvedInvite;
    return resolvedInvite;
  }, [challengeId, currentUserId, generateInviteMutation, mode]);

  const resolveInviteMessage = useCallback(async () => {
    if (mode === 'app') return buildAppInviteMessage();

    const invite = await resolveChallengeInvite();
    if (!invite) throw new Error('missing-challenge');

    return buildChallengeInviteMessage({
      challengeTitle,
      inviteCode: invite.inviteCode,
    });
  }, [challengeTitle, mode, resolveChallengeInvite]);

  const openWhatsApp = useCallback(async (nativeUrl: string, webUrl: string) => {
    const canOpenWhatsApp = await Linking.canOpenURL('whatsapp://send');
    await Linking.openURL(canOpenWhatsApp ? nativeUrl : webUrl);
  }, []);

  const shareToWhatsApp = useCallback(async (phoneNumber?: string) => {
    const message = await resolveInviteMessage();
    const encodedMessage = encodeURIComponent(message);

    if (phoneNumber) {
      const phone = normalizeWhatsAppPhone(phoneNumber);
      if (!phone) {
        throw new Error('missing-phone');
      }

      await openWhatsApp(
        `whatsapp://send?phone=${phone}&text=${encodedMessage}`,
        `https://wa.me/${phone}?text=${encodedMessage}`
      );
      return;
    }

    await openWhatsApp(
      `whatsapp://send?text=${encodedMessage}`,
      `https://wa.me/?text=${encodedMessage}`
    );
  }, [openWhatsApp, resolveInviteMessage]);

  const handleShareWithoutContact = useCallback(async () => {
    setSharingWithoutContact(true);
    try {
      await shareToWhatsApp();
    } catch {
      Alert.alert('Invite unavailable', 'Could not open WhatsApp right now.');
    } finally {
      setSharingWithoutContact(false);
    }
  }, [shareToWhatsApp]);

  const handleNativeShare = useCallback(async () => {
    setSharingNatively(true);
    try {
      const message = await resolveInviteMessage();
      await Share.share({ message, title });
    } catch {
      Alert.alert('Invite unavailable', 'Could not open the share menu right now.');
    } finally {
      setSharingNatively(false);
    }
  }, [resolveInviteMessage, title]);

  const handleCopyInvite = useCallback(async () => {
    setCopyingInvite(true);
    try {
      const value = mode === 'challenge'
        ? (await resolveChallengeInvite())?.inviteUrl
        : await resolveInviteMessage();
      if (!value) throw new Error('missing-invite');
      await Clipboard.setStringAsync(value);
      Alert.alert('Copied', mode === 'challenge' ? 'Invite link copied.' : 'App invite copied.');
    } catch {
      Alert.alert('Invite unavailable', 'Could not copy the invite right now.');
    } finally {
      setCopyingInvite(false);
    }
  }, [mode, resolveChallengeInvite, resolveInviteMessage]);

  const handleShareContact = useCallback(async (contact: Contacts.ExistingContact) => {
    const phoneNumber = getPhoneLabel(getPrimaryPhoneNumber(contact));
    if (!phoneNumber) {
      Alert.alert('No phone number', 'This contact does not have a phone number.');
      return;
    }

    const contactId = contact.id ?? `${getContactName(contact)}-${phoneNumber}`;
    setSharingContactId(contactId);
    try {
      await shareToWhatsApp(phoneNumber);
    } catch (error) {
      Alert.alert(
        'Invite unavailable',
        error instanceof Error && error.message === 'missing-challenge'
          ? 'Could not create a challenge invite link right now.'
          : 'Could not open WhatsApp right now.'
      );
    } finally {
      setSharingContactId(null);
    }
  }, [shareToWhatsApp]);

  const renderContact = ({ item }: { item: Contacts.ExistingContact }) => {
    const phone = getPrimaryPhoneNumber(item);
    const phoneText = getPhoneLabel(phone);
    const contactId = item.id ?? `${getContactName(item)}-${phoneText}`;
    const isSharing = sharingContactId === contactId;

    return (
      <View style={styles.contactRow}>
        <View style={styles.contactAvatar}>
          <Text style={styles.contactInitial}>{getContactName(item).charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.contactText}>
          <Text style={styles.contactName} numberOfLines={1}>{getContactName(item)}</Text>
          <Text style={styles.contactPhone} numberOfLines={1}>{phoneText}</Text>
        </View>
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() => handleShareContact(item)}
          disabled={isSharing || generateInviteMutation.isPending}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="logo-whatsapp" size={19} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#18142F" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.shareActions}>
        <TouchableOpacity
          style={[styles.shareAction, styles.whatsAppShareAction]}
          onPress={handleShareWithoutContact}
          disabled={sharingWithoutContact || generateInviteMutation.isPending}
        >
          {sharingWithoutContact ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="logo-whatsapp" size={22} color="#ffffff" />
          )}
          <Text style={[styles.shareActionText, styles.whatsAppShareActionText]}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareAction}
          onPress={handleNativeShare}
          disabled={sharingNatively || generateInviteMutation.isPending}
        >
          {sharingNatively ? (
            <ActivityIndicator size="small" color="#5B3FE5" />
          ) : (
            <Ionicons name="share-social-outline" size={22} color="#5B3FE5" />
          )}
          <Text style={styles.shareActionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareAction}
          onPress={handleCopyInvite}
          disabled={copyingInvite || generateInviteMutation.isPending}
        >
          {copyingInvite ? (
            <ActivityIndicator size="small" color="#5B3FE5" />
          ) : (
            <Ionicons name="copy-outline" size={22} color="#5B3FE5" />
          )}
          <Text style={styles.shareActionText}>{mode === 'challenge' ? 'Copy link' : 'Copy invite'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareAction}
          onPress={loadContacts}
          disabled={loadingContacts}
        >
          {loadingContacts ? (
            <ActivityIndicator size="small" color="#5B3FE5" />
          ) : (
            <Ionicons name="people-outline" size={22} color="#5B3FE5" />
          )}
          <Text style={styles.shareActionText}>Browse contacts</Text>
        </TouchableOpacity>
      </View>

      {contactsRequested && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#777777" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts"
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              maxLength={100}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#777777" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {!contactsRequested ? (
        <View style={styles.permissionPrimer}>
          <Ionicons name="lock-closed-outline" size={24} color="#8E8A99" />
          <Text style={styles.permissionPrimerTitle}>Contacts stay optional</Text>
          <Text style={styles.permissionPrimerText}>
            Share directly above, or browse contacts when you want to pick a specific person.
          </Text>
        </View>
      ) : loadingContacts ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4700ecff" />
        </View>
      ) : permissionDenied ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={58} color="#666666" />
          <Text style={styles.emptyTitle}>Contacts permission needed</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.primaryButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item, index) => item.id ?? `${getContactName(item)}-${index}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="people-outline" size={58} color="#666666" />
              <Text style={styles.emptyTitle}>{searchQuery ? 'No contacts found' : 'No phone contacts found'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: '#18142F',
    fontSize: 19,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#777389',
    fontSize: 12,
    marginTop: 2,
  },
  headerSpacer: {
    width: 32,
  },
  shareActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  shareAction: {
    width: '48%',
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  whatsAppShareAction: {
    backgroundColor: '#146c38',
    borderColor: '#238c50',
  },
  shareActionText: {
    color: '#5B3FE5',
    fontSize: 13,
    fontWeight: '700',
  },
  whatsAppShareActionText: {
    color: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#18142F',
    fontSize: 15,
    paddingVertical: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  permissionPrimer: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7E3EF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  permissionPrimerTitle: {
    color: '#18142F',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  permissionPrimerText: {
    color: '#8e8a99',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3EF',
    gap: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInitial: {
    color: '#18142F',
    fontSize: 17,
    fontWeight: '700',
  },
  contactText: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    color: '#18142F',
    fontSize: 15,
    fontWeight: '600',
  },
  contactPhone: {
    color: '#777389',
    fontSize: 12,
    marginTop: 3,
  },
  whatsappButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25d366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  emptyTitle: {
    color: '#18142F',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#4700ecff',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
