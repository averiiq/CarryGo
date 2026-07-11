import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
          flowType: 'implicit',
        },
      });

      return this.instance;
    } finally {
      this.creating = false;
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
