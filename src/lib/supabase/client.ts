import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { AppStorage } from '@/lib/storage/appStorage';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

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
        storage: AppStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    }
  );

if (typeof globalThis !== 'undefined') {
  globalThis.__supabaseClientInstance = supabase;
}
