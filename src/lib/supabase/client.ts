import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://blyjzgurrjhnheczwmvw.supabase.co';

export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseWp6Z3VycmpobmhlY3p3bXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjMyNjUsImV4cCI6MjEwMzkzOTI2NX0.DkrjV51qGd6JnvNXIcRT0rTO8Xu639_5aQG_zz7jiJU';

// Custom storage adapter ensuring persistent session storage across app restarts on Native & Web
const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return Promise.resolve(window.localStorage.getItem(key));
      }
      return Promise.resolve(null);
    }
    if (!key || typeof key !== 'string') return Promise.resolve(null);
    const safeKey = key.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    if (!safeKey) return Promise.resolve(null);
    return SecureStore.getItemAsync(safeKey);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return Promise.resolve();
    }
    if (!key || typeof key !== 'string') return Promise.resolve();
    const safeKey = key.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    if (!safeKey) return Promise.resolve();
    return SecureStore.setItemAsync(safeKey, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return Promise.resolve();
    }
    if (!key || typeof key !== 'string') return Promise.resolve();
    const safeKey = key.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    if (!safeKey) return Promise.resolve();
    return SecureStore.deleteItemAsync(safeKey);
  },
};

export const isSupabaseConfigured = true;

declare global {
  var __supabaseClientInstance: any;
}

export const supabase =
  globalThis.__supabaseClientInstance ??
  createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    }
  );

if (typeof globalThis !== 'undefined') {
  globalThis.__supabaseClientInstance = supabase;
}
