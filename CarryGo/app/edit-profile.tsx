import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import {
  normalizeIndianMobile,
  normalizeUsername,
  validateUsername,
  updateProfile,
  uploadAndSaveAvatar,
} from '@/services/profile.service';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius, TouchTarget } from '@/constants/theme';
import { queryKeys } from '@/lib/query/queryKeys';
import { Haptic } from '@/services/haptics.service';
import { CitySelectModal } from '@/components/feature/CitySelectModal';
import { UserRole } from '@/types';

// Curated avatar presets for instant profile photo selection
const AVATAR_PRESETS = [
  { id: 'traveler_1', label: 'Explorer', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
  { id: 'traveler_2', label: 'Voyager', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
  { id: 'traveler_3', label: 'Commuter', uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
  { id: 'traveler_4', label: 'Nomad', uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
  { id: 'traveler_5', label: 'Courier', uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80' },
  { id: 'traveler_6', label: 'Pilot', uri: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80' },
];

const POPULAR_CITIES = ['Gurugram', 'Delhi', 'Faridabad', 'Panipat', 'Rohtak', 'Chandigarh'];

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, S } = useThemeColors();

  // Form state
  const [avatarUri, setAvatarUri] = useState<string>(user?.avatar || '');
  const [name, setName] = useState<string>(user?.fullName || user?.name || '');
  const [username, setUsername] = useState<string>(user?.username || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [city, setCity] = useState<string>(user?.city || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'both');
  const [bio, setBio] = useState<string>(user?.verifiedAddress || '');

  // UI state
  const [showCityModal, setShowCityModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Check for unsaved changes
  const hasChanges = useMemo(() => {
    return (
      avatarUri !== (user?.avatar || '') ||
      name.trim() !== (user?.fullName || user?.name || '') ||
      normalizeUsername(username) !== (user?.username || '') ||
      phone.trim() !== (user?.phone || '') ||
      city !== (user?.city || '') ||
      role !== (user?.role || 'both')
    );
  }, [avatarUri, name, username, phone, city, role, user]);

  // Pick photo from Camera
  const handleTakePhoto = useCallback(async () => {
    Haptic.tap();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Camera Permission Needed', 'Please allow camera access to take your profile picture.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        Haptic.success();
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      showAlert('Camera Error', 'Could not open camera. Please try selecting from your library.');
    }
  }, [showAlert]);

  // Pick photo from Gallery
  const handlePickFromLibrary = useCallback(async () => {
    Haptic.tap();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Library Permission Needed', 'Please allow photo library access to choose your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        Haptic.success();
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      showAlert('Gallery Error', 'Could not open photo library. Please try again.');
    }
  }, [showAlert]);

  // Select curated avatar preset
  const handleSelectPreset = useCallback((uri: string) => {
    Haptic.select();
    setAvatarUri(uri);
  }, []);

  // Save changes
  const handleSave = async () => {
    if (!user) return;

    // 1. Mandatory Profile Picture Check
    if (!avatarUri) {
      Haptic.warning();
      showAlert(
        'Profile Picture Required',
        'Profile photo is mandatory so senders, travelers, and recipients can identify you on transit routes. Please take a photo or select an avatar preset.'
      );
      return;
    }

    // 2. Full Name validation
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    if (trimmedName.length < 2) {
      Haptic.warning();
      showAlert('Full Name Required', 'Please enter your complete name.');
      return;
    }

    // 3. Username validation
    const normalizedUser = normalizeUsername(username);
    if (normalizedUser) {
      const userErr = validateUsername(normalizedUser);
      if (userErr) {
        Haptic.warning();
        showAlert('Invalid Username', userErr);
        return;
      }
    }

    // 4. Phone validation
    const normalizedPhone = phone.trim() ? normalizeIndianMobile(phone) : undefined;
    if (phone.trim() && !normalizedPhone) {
      Haptic.warning();
      showAlert('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setSaving(true);

    try {
      let finalAvatarUrl = avatarUri;

      // If photo was changed from local uri, upload and save
      if (avatarUri !== user.avatar && (avatarUri.startsWith('file://') || avatarUri.startsWith('content://'))) {
        setIsUploadingPhoto(true);
        const uploadResult = await uploadAndSaveAvatar(user.id, avatarUri);
        setIsUploadingPhoto(false);
        if (uploadResult.avatarUrl) {
          finalAvatarUrl = uploadResult.avatarUrl;
        }
      }

      // Update user_profiles database record
      const { error } = await updateProfile(
        user.id,
        {
          full_name: trimmedName,
          username: normalizedUser || undefined,
          phone: normalizedPhone,
          city: city || undefined,
          role,
          avatar_url: finalAvatarUrl,
        },
        user.id
      );

      if (error) {
        setSaving(false);
        Haptic.error();
        showAlert('Save Failed', error);
        return;
      }

      // Update local auth user state and persistent storage
      updateUser({
        name: trimmedName,
        fullName: trimmedName,
        username: normalizedUser || undefined,
        phone: normalizedPhone,
        city: city || undefined,
        role,
        avatar: finalAvatarUrl,
      });

      // Invalidate relevant query caches
      queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });

      setSaving(false);
      setSaved(true);
      Haptic.success();

      setTimeout(() => {
        setSaved(false);
        router.back();
      }, 1000);
    } catch (err: any) {
      setSaving(false);
      setIsUploadingPhoto(false);
      Haptic.error();
      showAlert('Error', err?.message || 'Failed to save profile changes. Please try again.');
    }
  };

  if (!user) return null;

  const initial = (name || user.name || 'U').charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: C.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top App Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { backgroundColor: C.surfaceElevated }, pressed && { opacity: 0.7 }]}
          hitSlop={TouchTarget.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={22} color={C.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Edit Profile</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>Visible across all delivery routes</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveHeaderBtn,
            {
              backgroundColor: hasChanges ? C.primary : C.surfaceElevated,
              borderColor: hasChanges ? C.primary : C.surfaceBorder,
            },
            pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
          ]}
          onPress={handleSave}
          disabled={saving || saved || (!hasChanges && Boolean(avatarUri))}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : saved ? (
            <View style={styles.savedRow}>
              <MaterialIcons name="check" size={16} color="#FFFFFF" />
              <Text style={[styles.saveHeaderText, { color: '#FFFFFF' }]}>Saved</Text>
            </View>
          ) : (
            <Text style={[styles.saveHeaderText, { color: hasChanges ? '#FFFFFF' : C.textMuted }]}>
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, Spacing.xl) + 60 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* ── 1. MANDATORY PROFILE PHOTO HERO SECTION ── */}
        <View style={[styles.avatarCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <LinearGradient
            colors={[C.primarySubtle, 'transparent']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <View style={styles.avatarRow}>
            {/* Main Avatar Frame */}
            <View style={styles.avatarFrameWrap}>
              <View style={[styles.avatarOuterRing, { borderColor: avatarUri ? C.primary : C.warning }]}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: C.primarySubtle }]}>
                    <Text style={[styles.avatarInitial, { color: C.primary }]}>{initial}</Text>
                  </View>
                )}
              </View>

              {/* Floating Camera Button Badge */}
              <Pressable
                onPress={handleTakePhoto}
                style={({ pressed }) => [
                  styles.cameraBadge,
                  { backgroundColor: C.primary, borderColor: C.surface },
                  pressed && { transform: [{ scale: 0.92 }] },
                ]}
                hitSlop={TouchTarget.smallHitSlop}
                accessibilityRole="button"
                accessibilityLabel="Take a profile photo with camera"
              >
                <MaterialIcons name="photo-camera" size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Photo Action Buttons */}
            <View style={styles.avatarActionsCol}>
              <View style={styles.avatarTitleWrap}>
                <View style={styles.mandatoryBadgeRow}>
                  <Text style={[styles.avatarSectionTitle, { color: C.textPrimary }]}>Profile Picture</Text>
                  <View style={[styles.mandatoryBadge, { backgroundColor: avatarUri ? C.successSubtle : '#FEF3C7' }]}>
                    <Text style={[styles.mandatoryBadgeText, { color: avatarUri ? C.success : '#D97706' }]}>
                      {avatarUri ? 'Photo Active' : 'Required'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.avatarSectionSub, { color: C.textMuted }]}>
                  Visible to senders and travelers on matched journeys
                </Text>
              </View>

              <View style={styles.photoButtonsRow}>
                <Pressable
                  onPress={handleTakePhoto}
                  style={({ pressed }) => [
                    styles.photoActionBtn,
                    { backgroundColor: C.primary, borderColor: C.primary },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <MaterialIcons name="camera-alt" size={14} color="#FFFFFF" />
                  <Text style={[styles.photoActionBtnText, { color: '#FFFFFF' }]}>Camera</Text>
                </Pressable>

                <Pressable
                  onPress={handlePickFromLibrary}
                  style={({ pressed }) => [
                    styles.photoActionBtn,
                    { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <MaterialIcons name="photo-library" size={14} color={C.textPrimary} />
                  <Text style={[styles.photoActionBtnText, { color: C.textPrimary }]}>Gallery</Text>
                </Pressable>

                {avatarUri ? (
                  <Pressable
                    onPress={() => {
                      Haptic.tap();
                      setAvatarUri('');
                    }}
                    style={({ pressed }) => [
                      styles.photoRemoveBtn,
                      { backgroundColor: C.errorSubtle, borderColor: C.error + '33' },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <MaterialIcons name="delete-outline" size={16} color={C.error} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          {/* Preset Traveler Avatars */}
          <View style={[styles.presetsSection, { borderTopColor: C.surfaceBorderLight }]}>
            <Text style={[styles.presetsHeading, { color: C.textSecondary }]}>
              OR CHOOSE A VERIFIED TRAVELER AVATAR
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsList}>
              {AVATAR_PRESETS.map((p) => {
                const isSelected = avatarUri === p.uri;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => handleSelectPreset(p.uri)}
                    style={({ pressed }) => [
                      styles.presetChip,
                      {
                        borderColor: isSelected ? C.primary : C.surfaceBorder,
                        backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                      },
                      pressed && { transform: [{ scale: 0.95 }] },
                    ]}
                  >
                    <Image source={{ uri: p.uri }} style={styles.presetImage} contentFit="cover" />
                    <Text
                      style={[
                        styles.presetLabel,
                        { color: isSelected ? C.primaryDark : C.textSecondary, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* ── 2. PERSONAL IDENTITY INFORMATION ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <Text style={[styles.cardHeading, { color: C.textMuted }]}>PERSONAL INFORMATION</Text>

          {/* Full Name */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Full Name *</Text>
            <View style={[styles.inputWrapper, { backgroundColor: C.inputBg, borderColor: C.surfaceBorder }]}>
              <Ionicons name="person-outline" size={18} color={C.textMuted} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="First and last name"
                placeholderTextColor={C.textMuted}
                style={[styles.textInput, { color: C.textPrimary }]}
                autoCapitalize="words"
                maxLength={50}
              />
              {name.length > 0 && (
                <Pressable onPress={() => setName('')} hitSlop={TouchTarget.smallHitSlop}>
                  <MaterialIcons name="cancel" size={16} color={C.textMuted} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Username */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Username</Text>
            <View style={[styles.inputWrapper, { backgroundColor: C.inputBg, borderColor: C.surfaceBorder }]}>
              <Feather name="at-sign" size={17} color={C.textMuted} />
              <TextInput
                value={username}
                onChangeText={(val) => setUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                placeholderTextColor={C.textMuted}
                style={[styles.textInput, { color: C.textPrimary }]}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={24}
              />
            </View>
            <Text style={[styles.fieldHint, { color: C.textMuted }]}>
              Unique handle for parcel tracking and route coordination
            </Text>
          </View>

          {/* City Hub */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Primary City / Hub *</Text>
            <Pressable
              onPress={() => {
                Haptic.tap();
                setShowCityModal(true);
              }}
              style={[styles.inputWrapper, { backgroundColor: C.inputBg, borderColor: C.surfaceBorder }]}
            >
              <MaterialIcons name="location-on" size={19} color={city ? C.primary : C.textMuted} />
              <Text style={[styles.textInput, { color: city ? C.textPrimary : C.textMuted, paddingTop: 14 }]}>
                {city || 'Select transit city or hub'}
              </Text>
              <MaterialIcons name="expand-more" size={20} color={C.textMuted} />
            </Pressable>

            {/* Quick 1-tap city chips */}
            <View style={styles.popularCitiesWrap}>
              {POPULAR_CITIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    Haptic.select();
                    setCity(c);
                  }}
                  style={({ pressed }) => [
                    styles.cityQuickChip,
                    {
                      backgroundColor: city === c ? C.primarySubtle : C.surfaceElevated,
                      borderColor: city === c ? C.primary : C.surfaceBorder,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.cityQuickChipText,
                      { color: city === c ? C.primaryDark : C.textSecondary, fontWeight: city === c ? '700' : '500' },
                    ]}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Mobile Number</Text>
            <View style={[styles.inputWrapper, { backgroundColor: C.inputBg, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="phone" size={18} color={C.textMuted} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
                style={[styles.textInput, { color: C.textPrimary }]}
                maxLength={15}
              />
            </View>
            <Text style={[styles.fieldHint, { color: C.textMuted }]}>
              Used for handover OTP and live delivery communication
            </Text>
          </View>
        </View>

        {/* ── 3. ROLE PREFERENCE SELECTION ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <Text style={[styles.cardHeading, { color: C.textMuted }]}>COMMUNITY ROLE</Text>

          <View style={styles.rolesRow}>
            {[
              { id: 'sender' as const, label: 'Sender', icon: 'inventory-2' as const, desc: 'Sending packages' },
              { id: 'traveller' as const, label: 'Traveler', icon: 'flight-takeoff' as const, desc: 'Carrying & earning' },
              { id: 'both' as const, label: 'Both', icon: 'swap-horiz' as const, desc: 'Send & carry' },
            ].map((r) => {
              const isSelected = role === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    Haptic.select();
                    setRole(r.id);
                  }}
                  style={({ pressed }) => [
                    styles.roleCard,
                    {
                      backgroundColor: isSelected ? C.primarySubtle : C.surfaceElevated,
                      borderColor: isSelected ? C.primary : C.surfaceBorder,
                    },
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <View style={[styles.roleIconBox, { backgroundColor: isSelected ? C.primary : C.surface }]}>
                    <MaterialIcons name={r.icon} size={18} color={isSelected ? '#FFFFFF' : C.textSecondary} />
                  </View>
                  <Text style={[styles.roleTitle, { color: isSelected ? C.primaryDark : C.textPrimary }]}>
                    {r.label}
                  </Text>
                  <Text style={[styles.roleDesc, { color: C.textMuted }]}>{r.desc}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── 4. IDENTITY & COMPLIANCE ── */}
        <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.surfaceBorder }, S.card]}>
          <Text style={[styles.cardHeading, { color: C.textMuted }]}>SECURITY & VERIFICATION</Text>

          {/* Email */}
          <View style={styles.complianceRow}>
            <View style={[styles.complianceIconBox, { backgroundColor: C.surfaceElevated }]}>
              <MaterialIcons name="email" size={18} color={C.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.complianceTitle, { color: C.textPrimary }]}>{user.email}</Text>
              <Text style={[styles.complianceSub, { color: C.textMuted }]}>Primary login credential (Locked)</Text>
            </View>
            <MaterialIcons name="lock" size={16} color={C.textMuted} />
          </View>

          <View style={[styles.dividerLine, { backgroundColor: C.surfaceBorderLight }]} />

          {/* KYC Status */}
          <View style={styles.complianceRow}>
            <View
              style={[
                styles.complianceIconBox,
                { backgroundColor: user.kycStatus === 'approved' ? C.successSubtle : C.warningSubtle },
              ]}
            >
              <MaterialIcons
                name={user.kycStatus === 'approved' ? 'verified-user' : 'shield'}
                size={18}
                color={user.kycStatus === 'approved' ? C.success : C.warning}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.complianceTitle, { color: C.textPrimary }]}>
                {user.kycStatus === 'approved' ? 'Government ID Verified' : 'ID Verification'}
              </Text>
              <Text style={[styles.complianceSub, { color: C.textMuted }]}>
                {user.kycStatus === 'approved' ? 'Government KYC compliant' : 'Required to carry parcels on routes'}
              </Text>
            </View>
            {user.kycStatus !== 'approved' ? (
              <Pressable
                onPress={() => router.push('/kyc')}
                style={({ pressed }) => [
                  styles.verifyNowBtn,
                  { backgroundColor: C.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.verifyNowBtnText}>Verify</Text>
              </Pressable>
            ) : (
              <MaterialIcons name="check-circle" size={20} color={C.success} />
            )}
          </View>
        </View>

        {/* ── 5. BOTTOM SAVE BUTTON ── */}
        <Pressable
          onPress={handleSave}
          disabled={saving || saved || (!hasChanges && Boolean(avatarUri))}
          style={({ pressed }) => [
            styles.bottomSaveBtn,
            {
              backgroundColor: saved ? C.success : hasChanges ? C.primary : C.surfaceElevated,
              borderColor: saved ? C.success : hasChanges ? C.primary : C.surfaceBorder,
            },
            pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
          ]}
        >
          {saving ? (
            <View style={styles.savedRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[styles.bottomSaveBtnText, { color: '#FFFFFF' }]}>
                {isUploadingPhoto ? 'Uploading photo...' : 'Saving changes...'}
              </Text>
            </View>
          ) : saved ? (
            <View style={styles.savedRow}>
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
              <Text style={[styles.bottomSaveBtnText, { color: '#FFFFFF' }]}>Profile Updated!</Text>
            </View>
          ) : (
            <View style={styles.savedRow}>
              <MaterialIcons name="save" size={20} color={hasChanges ? '#FFFFFF' : C.textMuted} />
              <Text style={[styles.bottomSaveBtnText, { color: hasChanges ? '#FFFFFF' : C.textMuted }]}>
                Save Changes
              </Text>
            </View>
          )}
        </Pressable>
      </ScrollView>

      {/* City Select Modal */}
      <CitySelectModal
        visible={showCityModal}
        onClose={() => setShowCityModal(false)}
        onSelect={(cityName) => setCity(cityName)}
        title="Select Transit City"
        subtitle="Your hub for traveler-to-sender route matching"
        selectedCity={city}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: Spacing.sm + 2,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  saveHeaderBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderText: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // ── Avatar Card Styles ──
  avatarCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarFrameWrap: {
    position: 'relative',
  },
  avatarOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 38,
    fontWeight: FontWeight.bold,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarActionsCol: {
    flex: 1,
  },
  avatarTitleWrap: {
    marginBottom: Spacing.xs + 2,
  },
  mandatoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  mandatoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mandatoryBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  avatarSectionSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  photoActionBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  photoRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm + 2,
    borderTopWidth: 1,
  },
  presetsHeading: {
    fontSize: 9.5,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
    marginBottom: Spacing.xs + 2,
  },
  presetsList: {
    gap: Spacing.xs + 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    paddingLeft: 4,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  presetLabel: {
    fontSize: 11,
  },

  // ── Section Card Styles ──
  sectionCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm + 2,
  },
  cardHeading: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  fieldBlock: {
    gap: 4,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 4,
    height: 48,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: FontSize.sm + 0.5,
    height: '100%',
    paddingVertical: 0,
  },
  fieldHint: {
    fontSize: 10.5,
    marginTop: 2,
  },
  popularCitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  cityQuickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  cityQuickChipText: {
    fontSize: 11,
  },

  // ── Roles Grid Styles ──
  rolesRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
  },
  roleCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.sm + 2,
    alignItems: 'center',
    gap: 4,
  },
  roleIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  roleTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  roleDesc: {
    fontSize: 9.5,
    textAlign: 'center',
  },

  // ── Compliance Styles ──
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingVertical: 4,
  },
  complianceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  complianceTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  complianceSub: {
    fontSize: 11,
    marginTop: 1,
  },
  dividerLine: {
    height: 1,
  },
  verifyNowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  verifyNowBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // ── Bottom Save Button ──
  bottomSaveBtn: {
    minHeight: 52,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  bottomSaveBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
