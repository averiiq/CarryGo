import { getSupabaseClient } from '@/template';
import { disabledFeatureMessage, FeatureFlags } from '@/constants/featureFlags';
import { User, UserRole } from '@/types';
import { recreateUserAccount } from '@/services/account.service';
import { checkUserPanStatus } from '@/services/kyc.service';

const PROFILE_SELECT =
  'id, full_name, username, email, phone, rating, total_ratings, total_deliveries, total_trips, joined_at, created_at, verified, push_token, kyc_status, role, city, profile_completed_at, is_deleted, deleted_at';

const LEGACY_PROFILE_SELECT =
  'id, full_name, username, email, phone, rating, total_ratings, total_deliveries, total_trips, joined_at, created_at, verified, push_token, kyc_status';

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
const E164_PHONE_PATTERN = /^\+[1-9][0-9]{7,14}$/;

interface ProfileRow {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  phone?: string | null;
  rating?: number | string | null;
  total_ratings?: number | null;
  total_deliveries?: number | null;
  total_trips?: number | null;
  joined_at?: string | null;
  created_at?: string | null;
  verified?: boolean | null;
  push_token?: string | null;
  kyc_status?: string | null;
  role?: string | null;
  city?: string | null;
  profile_completed_at?: string | null;
  is_aadhaar_verified?: boolean | null;
  is_address_verified?: boolean | null;
  verified_address?: string | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  is_pan_verified?: boolean | null;
  pan_masked?: string | null;
}

function mapProfileRow(data: ProfileRow): User {
  const isApproved = data.kyc_status === 'approved' || Boolean(data.verified);
  return {
    id: data.id,
    name: data.full_name || data.username || data.email?.split('@')[0] || 'User',
    email: data.email || '',
    phone: data.phone || undefined,
    username: data.username || undefined,
    rating: parseFloat(String(data.rating ?? '4.5')) || 4.5,
    totalRatings: data.total_ratings || 0,
    totalDeliveries: data.total_deliveries || 0,
    totalTrips: data.total_trips || 0,
    joinedAt: data.joined_at || data.created_at || new Date().toISOString(),
    verified: isApproved,
    pushToken: data.push_token || undefined,
    kycStatus: isApproved ? 'approved' : ((data.kyc_status as User['kycStatus']) || 'pending'),
    fullName: data.full_name || undefined,
    role: data.role as User['role'],
    city: data.city || undefined,
    profileCompletedAt: data.profile_completed_at || undefined,
    isAadhaarVerified: Boolean(data.is_aadhaar_verified),
    isAddressVerified: Boolean(data.is_address_verified),
    verifiedAddress: data.verified_address || undefined,
    isDeleted: Boolean(data.is_deleted),
    deletedAt: data.deleted_at || undefined,
    isPanVerified: Boolean(data.is_pan_verified),
    panMasked: data.pan_masked || undefined,
  };
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, '');
}

export function normalizeIndianMobile(value: string) {
  const digits = value.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91${digits}` : '';
}

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Username must be 3-24 characters using lowercase letters, numbers, or underscores.';
  }
  return null;
}

export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<{ taken: boolean; error: string | null }> {
  const sb = getSupabaseClient();
  const { data: available, error } = await sb.rpc('check_username_available', {
    check_username: normalizeUsername(username),
    exclude_user_id: excludeUserId || undefined
  });

  if (error) {
    return { taken: false, error: error.message };
  }
  return { taken: !available, error: null };
}

export function isProfileComplete(user: User | null) {
  return Boolean(
    user?.profileCompletedAt
    && user.username
    && USERNAME_PATTERN.test(user.username)
    && user.fullName?.trim()
    && E164_PHONE_PATTERN.test(user.phone || '')
    && user.city
    && user.role
  );
}

export async function fetchProfile(userId: string): Promise<{ data: User | null; error: string | null }> {
  const sb = getSupabaseClient();
  const profileResult = await sb
    .from('user_profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();
  let data = profileResult.data as ProfileRow | null;
  let error = profileResult.error;

  if (error && (error.message.includes('role') || error.message.includes('profile_completed_at') || error.message.includes('is_deleted'))) {
    const legacyResult = await sb
      .from('user_profiles')
      .select(LEGACY_PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle();
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  if (data.is_deleted || Boolean(data.deleted_at)) {
    return { data: null, error: 'ACCOUNT_DELETED' };
  }
  const mappedUser = mapProfileRow(data);
  if (!mappedUser.isPanVerified) {
    try {
      const panStatus = await checkUserPanStatus(userId);
      if (panStatus.isVerified) {
        mappedUser.isPanVerified = true;
        if (panStatus.panMasked) {
          mappedUser.panMasked = panStatus.panMasked;
        }
      }
    } catch {
      // Non-blocking
    }
  }
  return { data: mappedUser, error: null };
}

export async function ensureProfile(
  userId: string,
  email: string,
  defaults?: { username?: string; fullName?: string }
): Promise<{ data: User | null; error: string | null }> {
  const existing = await fetchProfile(userId);
  if (existing.error === 'ACCOUNT_DELETED') {
    const { error: recreateError } = await recreateUserAccount(userId);
    if (recreateError) return { data: null, error: recreateError };
    return fetchProfile(userId);
  }
  if (existing.data || existing.error) return existing;

  const sb = getSupabaseClient();
  const username = defaults?.username?.trim() || null;
  const { error } = await sb.from('user_profiles').insert({
    id: userId,
    email,
    username,
    full_name: defaults?.fullName?.trim() || null,
  });

  if (error && error.code !== '23505') {
    return { data: null, error: error.message };
  }

  return fetchProfile(userId);
}

export async function completeProfile(
  userId: string,
  input: {
    username: string;
    fullName: string;
    phone: string;
    city: string;
    role: UserRole;
  }
): Promise<{ data: User | null; error: string | null }> {
  const username = normalizeUsername(input.username);
  const usernameError = validateUsername(username);
  if (usernameError) return { data: null, error: usernameError };

  const fullName = input.fullName.trim().replace(/\s+/g, ' ');
  if (fullName.length < 2 || fullName.split(' ').length < 2) {
    return { data: null, error: 'Please enter your first and last name.' };
  }

  const phone = normalizeIndianMobile(input.phone);
  if (!phone) return { data: null, error: 'Please enter a valid 10-digit mobile number.' };

  const city = input.city.trim();
  if (!city) return { data: null, error: 'Please select your city.' };

  const sb = getSupabaseClient();
  const completedAt = new Date().toISOString();
  const { data, error } = await sb
    .from('user_profiles')
    .update({
      username,
      full_name: fullName,
      phone,
      city,
      role: input.role,
      profile_completed_at: completedAt,
    })
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    if (error.code === '23505') return { data: null, error: 'That username is already taken.' };
    if (error.code === '23514') return { data: null, error: 'Please check your profile details and try again.' };
    if (error.message.includes('role') || error.message.includes('profile_completed_at')) {
      return { data: null, error: 'Profile setup database migration is not applied yet.' };
    }
    return { data: null, error: error.message };
  }

  return { data: mapProfileRow(data), error: null };
}

export async function updateProfile(
  userId: string,
  updates: Partial<{
    username: string;
    full_name: string;
    phone: string;
    city: string;
    push_token: string;
    role: UserRole;
    profile_completed_at: string;
  }>,
  currentUserId: string
) {
  // Verify the current user is updating their own profile
  if (userId !== currentUserId) return { error: 'Unauthorized' };

  const sb = getSupabaseClient();
  const { error } = await sb.from('user_profiles').update(updates).eq('id', userId);
  return { error: error?.message || null };
}

export async function submitKyc(
  userId: string,
  kycData: {
    fullName: string;
    idType: string;
  }
): Promise<{ error: string | null }> {
  if (!FeatureFlags.kycProvider) return { error: disabledFeatureMessage.kyc };

  const sb = getSupabaseClient();
  const { error } = await sb.rpc('create_kyc_session', {
    p_user_id: userId,
    p_full_name: kycData.fullName,
    p_id_type: kycData.idType,
  });
  return { error: error?.message || null };
}
