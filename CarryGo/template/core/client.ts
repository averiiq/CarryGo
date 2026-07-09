import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { Database } from '@/types/database';

class SupabaseManager {
  private static instance: SupabaseClient<Database> | null = null;
  private static creating = false;

  static getClient(): SupabaseClient<Database> {
    if (this.instance) {
      return this.instance;
    }

    if (this.creating) {
      throw new Error('[Template:Client] Client is being created, please wait');
    }

    this.creating = true;

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          '[Template:Client] Supabase environment variables missing. ' +
          'Please check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env file'
        );
      }

      this.instance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: this.createStorageAdapter(),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
          flowType: 'pkce',
        },
      });

      return this.instance;
    } finally {
      this.creating = false;
    }
  }

  private static createStorageAdapter() {
    if (Platform.OS === 'web') {
      return {
        getItem: (key: string): Promise<string | null> => {
          if (typeof window !== 'undefined' && window.localStorage) {
            return Promise.resolve(window.localStorage.getItem(key));
          }
          return Promise.resolve(null);
        },
        setItem: (key: string, value: string): Promise<void> => {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
          }
          return Promise.resolve();
        },
        removeItem: (key: string): Promise<void> => {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
          }
          return Promise.resolve();
        },
      };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SecureStore = require('expo-secure-store');
      return {
        getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
        removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
      };
    }
  }
}

export const getSharedSupabaseClient = (): SupabaseClient<Database> => {
  return SupabaseManager.getClient();
};

export const safeSupabaseOperation = async <T>(
  operation: (client: SupabaseClient<Database>) => Promise<T>
): Promise<T> => {
  const client = getSharedSupabaseClient();
  return await operation(client);
};

