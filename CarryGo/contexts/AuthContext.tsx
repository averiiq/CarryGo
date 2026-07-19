import { createContext, useState, useEffect, useRef, ReactNode, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/template';
import { User } from '@/types';
import { ensureProfile, fetchProfile, isProfileComplete } from '@/services/profile.service';
import { registerForPushNotifications, savePushToken } from '@/services/notifications.service';
import { Haptic } from '@/services/haptics.service';
import { AUTH_TIMEOUTS } from '@/constants/timing';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  requiresProfileSetup: boolean;
  isLoading: boolean;
  sessionError: string | null;
  sendOTP: (email: string) => Promise<{ error: string | null }>;
  verifyOTP: (email: string, otp: string) => Promise<{ error: string | null; requiresProfileSetup?: boolean }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function profileEmailFor(userId: string, email?: string | null) {
  return email?.trim().toLowerCase() || `${userId}@carrygo.local`;
}

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('email rate limit') || m.includes('rate limit')) {
    return 'Too many attempts. Please wait a minute before trying again.';
  }
  if (m.includes('invalid otp') || m.includes('token has expired') || m.includes('otp expired')) {
    return 'The code is incorrect or has expired. Try requesting a new one.';
  }
  if (m.includes('user already registered')) {
    return 'This email is already registered. Sending you a sign-in code.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please verify your email first. Check your inbox for the code.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (m.includes('signup is disabled')) {
    return 'New registrations are temporarily disabled. Please try again later.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Prevents onAuthStateChange from redundantly loading user when verifyOTP already handled it
  const verifyHandledRef = useRef(false);

  const loadUser = useCallback(async (userId: string, email?: string | null) => {
    try {
      let result = await fetchProfile(userId);
      if (!result.data && !result.error) {
        result = await ensureProfile(userId, profileEmailFor(userId, email));
      }

      if (result.data) {
        setUser(result.data);
      } else {
        setUser(null);
      }
      return result;
    } catch {
      return { data: null, error: 'Failed to load profile' };
    }
  }, []);

  useEffect(() => {
    let sb: ReturnType<typeof getSupabaseClient>;
    try {
      sb = getSupabaseClient();
    } catch {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, AUTH_TIMEOUTS.SESSION_INIT);

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      try {
        setSessionError(null);
        if (session?.user) {
          // Skip redundant profile load if verifyOTP already set the user
          if (verifyHandledRef.current) {
            verifyHandledRef.current = false;
          } else {
            await loadUser(session.user.id, session.user.email ?? '');
          }
          registerForPushNotifications().then(async token => {
            if (token && isMounted) {
              await savePushToken(session.user.id, token);
            }
          }).catch(() => {});
        } else {
          setUser(null);
          queryClient.clear();
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Session sync failed';
          setSessionError(msg);
        }
      } finally {
        if (isMounted && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [loadUser, queryClient]);

  const sendOTP = useCallback(async (email: string): Promise<{ error: string | null }> => {
    try {
      const sb = getSupabaseClient();

      const sendTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), AUTH_TIMEOUTS.SEND_OTP)
      );

      const { error } = await Promise.race([
        sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }),
        sendTimeout,
      ]);

      if (error) return { error: mapAuthError(error.message) };
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error sending OTP';
      return { error: mapAuthError(message) };
    }
  }, []);

  const verifyOTP = useCallback(async (
    email: string,
    otp: string
  ): Promise<{ error: string | null; requiresProfileSetup?: boolean }> => {
    try {
      const sb = getSupabaseClient();

      const verifyTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Verification timed out. Please try again.')), AUTH_TIMEOUTS.VERIFY_OTP)
      );

      const { data, error } = await Promise.race([
        sb.auth.verifyOtp({ email, token: otp, type: 'email' }),
        verifyTimeout,
      ]);

      if (error) return { error: mapAuthError(error.message) };

      if (data.user) {
        Haptic.success();
        verifyHandledRef.current = true;
        const quickCheck = new Promise<{ data: User | null; error: string | null }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: null }), AUTH_TIMEOUTS.PROFILE_CHECK)
        );
        try {
          const profileResult = await Promise.race([
            fetchProfile(data.user.id),
            quickCheck,
          ]);
          if (profileResult.data) {
            setUser(profileResult.data);
            return { error: null, requiresProfileSetup: !isProfileComplete(profileResult.data) };
          }
        } catch {}
        return { error: null, requiresProfileSetup: true };
      }
      return { error: 'Could not load the authenticated account.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error verifying OTP';
      return { error: mapAuthError(message) };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const sb = getSupabaseClient();
      await sb.auth.signOut();
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (user) await loadUser(user.id, user.email);
  }, [user, loadUser]);

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    requiresProfileSetup: !!user && !isProfileComplete(user),
    isLoading,
    sessionError,
    sendOTP,
    verifyOTP,
    logout,
    updateUser,
    refreshUser,
  }), [user, isLoading, sessionError, sendOTP, verifyOTP, logout, updateUser, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
