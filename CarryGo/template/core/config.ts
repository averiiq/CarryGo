import { AuthConfig, AppConfig } from './types';

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig | null = null;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public initialize(config: AppConfig) {
    if (this.config) {
      // Already configured — overwriting with new values
    }
    
    this.config = { ...config };
  }

  public getConfig(): AppConfig {
    if (!this.config) {
      this.config = this.createDefaultConfig();
    }
    return { ...this.config };
  }

  private createDefaultConfig(): AppConfig {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        supabase: { url: '', anonKey: '' },
        auth: false,
        payments: false,
        storage: false,
      };
    }

    return {
      supabase: { url: supabaseUrl, anonKey: supabaseAnonKey },
      auth: { enabled: true, profileTableName: 'user_profiles' },
      payments: false,
      storage: false,
    };
  }

  public getModuleConfig<T>(moduleName: keyof AppConfig): T | null {
    const config = this.getConfig();
    const value = config[moduleName];
    if (value === false || value === null || value === undefined) return null;
    return value as unknown as T;
  }

  public isModuleEnabled(moduleName: keyof AppConfig): boolean {
    const moduleConfig = this.getModuleConfig(moduleName);
    return moduleConfig !== false && moduleConfig !== null;
  }

  public getSupabaseConfig() {
    return this.getConfig().supabase;
  }

  public updateConfig(updates: Partial<AppConfig>) {
    const config = this.getConfig();
    this.config = { ...config, ...updates };
  }
}

export const configManager = ConfigManager.getInstance();

interface CreateConfigOptions {
  auth?: {
    enabled?: boolean;
    profileTableName?: string;
  } | false;
  supabase?: {
    url?: string;
    anonKey?: string;
  };
}

export const createConfig = (options: CreateConfigOptions = {}): AppConfig => {
  if (options.auth === false) {
    return {
      supabase: { url: '', anonKey: '' },
      auth: false,
      payments: false,
      storage: false,
    };
  }

  const authConfig: AuthConfig = {
    enabled: true,
    profileTableName: 'user_profiles',
    ...(typeof options.auth === 'object' ? options.auth : {}),
  };

  const supabaseUrl = options.supabase?.url || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = options.supabase?.anonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      supabase: { url: '', anonKey: '' },
      auth: false,
      payments: false,
      storage: false,
    };
  }

  return {
    supabase: { url: supabaseUrl, anonKey: supabaseAnonKey },
    auth: authConfig,
    payments: false,
    storage: false,
  };
};