import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { normalizeIndianMobile, updateProfile } from '@/services/profile.service';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { getCityNames } from '@/constants/indian-cities';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C, S } = useThemeColors();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = name.trim() !== (user?.name || '') || phone.trim() !== (user?.phone || '') || city !== (user?.city || '');

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      showAlert('Required', 'Display name cannot be empty.');
      return;
    }
    const normalizedPhone = phone.trim() ? normalizeIndianMobile(phone) : undefined;
    if (phone.trim() && !normalizedPhone) {
      showAlert('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSaving(true);
    const { error } = await updateProfile(user.id, {
      full_name: name.trim(),
      phone: normalizedPhone,
      ...(city !== user.city ? { city } : {}),
    }, user.id);
    setSaving(false);
    if (error) {
      showAlert('Save Failed', error);
      return;
    }
    updateUser({ name: name.trim(), fullName: name.trim(), phone: normalizedPhone, city });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.back();
    }, 1200);
  };

  if (!user) return null;

  const displayName = user.name || user.email?.split('@')[0] || 'U';

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: C.background }]}
      behavior="padding"
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: C.surface, borderBottomColor: C.surfaceBorder }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.surfaceElevated }]} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={C.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Edit Profile</Text>
        {hasChanges && !saving ? (
          <Pressable
            style={[styles.saveHeaderBtn, { backgroundColor: C.primarySubtle, borderColor: C.primary + '44' }]}
            onPress={handleSave}
          >
            <Text style={[styles.saveHeaderText, { color: C.primary }]}>Save</Text>
          </Pressable>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarLarge, { backgroundColor: C.primarySubtle, borderColor: C.primary }]}>
            <Text style={[styles.avatarText, { color: C.primary }]}>
              {(name || displayName).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.avatarHint, { color: C.textMuted }]}>
            Avatar auto-generated from your name
          </Text>
        </View>

        {/* Form card */}
        <View style={[styles.formCard, S.sm, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          {/* Display name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>DISPLAY NAME</Text>
            <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.surfaceBorder }]}>
              <Ionicons name="person-outline" size={18} color={C.textMuted} />
              <TextInput
                style={[styles.input, { color: C.textPrimary }]}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={C.textMuted}
                returnKeyType="next"
                autoCapitalize="words"
                maxLength={40}
              />
              {name.length > 0 && (
                <Pressable onPress={() => setName('')} hitSlop={6}>
                  <MaterialIcons name="close" size={16} color={C.textMuted} />
                </Pressable>
              )}
            </View>
            <Text style={[styles.fieldHint, { color: C.textMuted }]}>
              This is how other users see you on CarryGo
            </Text>
          </View>

          <View style={[styles.fieldDiv, { backgroundColor: C.surfaceBorder }]} />

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>PHONE NUMBER</Text>
            <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="phone" size={18} color={C.textMuted} />
              <TextInput
                style={[styles.input, { color: C.textPrimary }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 00000 00000"
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
                returnKeyType="done"
                maxLength={15}
              />
              {phone.length > 0 && (
                <Pressable onPress={() => setPhone('')} hitSlop={6}>
                  <MaterialIcons name="close" size={16} color={C.textMuted} />
                </Pressable>
              )}
            </View>
            <Text style={[styles.fieldHint, { color: C.textMuted }]}>
              Optional — used for coordination with your delivery partner
            </Text>
          </View>

          <View style={[styles.fieldDiv, { backgroundColor: C.surfaceBorder }]} />

          {/* City */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>CITY</Text>
            <Pressable
              style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.surfaceBorder }]}
              onPress={() => setShowCityPicker(!showCityPicker)}
            >
              <MaterialIcons name="location-city" size={18} color={C.textMuted} />
              <Text style={[styles.input, { color: city ? C.textPrimary : C.textMuted }]}>
                {city || 'Select your city'}
              </Text>
              <MaterialIcons name={showCityPicker ? 'expand-less' : 'expand-more'} size={20} color={C.textMuted} />
            </Pressable>
            {showCityPicker && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {getCityNames().slice(0, 20).map(c => (
                  <Pressable
                    key={c}
                    onPress={() => { setCity(c); setShowCityPicker(false); }}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 6,
                      borderRadius: 8, borderWidth: 1,
                      backgroundColor: city === c ? C.primarySubtle : C.surfaceElevated,
                      borderColor: city === c ? C.primary : C.surfaceBorder,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: city === c ? C.primary : C.textSecondary }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={[styles.fieldHint, { color: C.textMuted }]}>
              Your feed shows trips and parcels relevant to this city
            </Text>
          </View>

          <View style={[styles.fieldDiv, { backgroundColor: C.surfaceBorder }]} />

          {/* Email (read-only) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>EMAIL</Text>
            <View style={[styles.inputRow, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
              <MaterialIcons name="email" size={18} color={C.textMuted} />
              <Text style={[styles.input, { color: C.textSecondary }]}>{user.email}</Text>
              <View style={[styles.lockedBadge, { backgroundColor: C.surfaceBorder }]}>
                <MaterialIcons name="lock" size={11} color={C.textMuted} />
                <Text style={[styles.lockedText, { color: C.textMuted }]}>Locked</Text>
              </View>
            </View>
            <Text style={[styles.fieldHint, { color: C.textMuted }]}>
              Email is your login identity and cannot be changed
            </Text>
          </View>
        </View>

        {/* Stats (read-only info) */}
        <View style={[styles.statsCard, S.sm, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
          <Text style={[styles.statsTitle, { color: C.textMuted }]}>ACCOUNT STATS</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.primary }]}>{(user.rating || 4.5).toFixed(1)}</Text>
              <Ionicons name="star" size={13} color={C.warning} />
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Rating</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{user.totalTrips}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Trips</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{user.totalDeliveries}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Deliveries</Text>
            </View>
            <View style={[styles.statDiv, { backgroundColor: C.surfaceBorder }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: user.verified ? C.success : C.warning }]}>
                {user.verified ? 'Yes' : 'No'}
              </Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>Verified</Text>
            </View>
          </View>
        </View>

        {/* Save button */}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: saved ? C.success : hasChanges ? C.primary : C.surfaceElevated,
              borderColor: saved ? C.success : hasChanges ? C.primary : C.surfaceBorder,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={saving || !hasChanges || saved}
        >
          {saving ? (
            <ActivityIndicator color={C.textInverse} size="small" />
          ) : saved ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color={C.textInverse} />
              <Text style={[styles.saveBtnText, { color: C.textInverse }]}>Saved!</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="save" size={20} color={hasChanges ? C.textInverse : C.textMuted} />
              <Text style={[styles.saveBtnText, { color: hasChanges ? C.textInverse : C.textMuted }]}>
                Save Changes
              </Text>
            </>
          )}
        </Pressable>

        {!hasChanges && (
          <Text style={[styles.noChangesHint, { color: C.textMuted }]}>
            Make changes to your name or phone to enable save
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderBottomWidth: 1, gap: Spacing.md,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  saveHeaderBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  saveHeaderText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  scroll: { padding: Spacing.md, gap: Spacing.md },

  avatarSection: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  avatarLarge: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
  },
  avatarText: { fontSize: 36, fontWeight: FontWeight.bold },
  avatarHint: { fontSize: FontSize.xs },

  formCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    overflow: 'hidden',
  },
  fieldGroup: { padding: Spacing.md, gap: Spacing.sm },
  fieldLabel: {
    fontSize: 10, fontWeight: FontWeight.semibold,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    minHeight: 48,
  },
  input: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  fieldHint: { fontSize: FontSize.xs, lineHeight: 17 },
  fieldDiv: { height: 1, marginHorizontal: Spacing.md },
  lockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  lockedText: { fontSize: 10, fontWeight: FontWeight.semibold },

  statsCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.md, gap: Spacing.md,
  },
  statsTitle: { fontSize: 10, fontWeight: FontWeight.semibold, letterSpacing: 0.8, textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statLabel: { fontSize: 10, fontWeight: FontWeight.medium },
  statDiv: { width: 1, height: 32 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.lg, borderWidth: 1,
    paddingVertical: Spacing.md + 2, marginTop: Spacing.sm,
  },
  saveBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  noChangesHint: { fontSize: FontSize.xs, textAlign: 'center' },
});
