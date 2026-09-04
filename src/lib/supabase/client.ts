import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom storage adapter ensuring persistent session storage across app restarts on Native & Web
// Expo SecureStore on Android has a strict 2048-byte limit per key.
// Supabase JWT + refresh tokens often exceed 2048 bytes! We split large payloads across chunks.
const CHUNK_SIZE = 1800;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }

      if (!key || typeof key !== 'string') return null;
      const safeKey = key.replace(/[^a-zA-Z0-9.\-_]/g, '_');

      // Check if item was chunked
      const chunkCountStr = await SecureStore.getItemAsync(`${safeKey}_chunks`);
      if (chunkCountStr) {
        const count = parseInt(chunkCountStr, 10);
        let fullStr = '';
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${safeKey}_${i}`);
          if (chunk !== null) {
            fullStr += chunk;
          }
        }
        return fullStr || null;
      }

      // Single item read
      return await SecureStore.getItemAsync(safeKey);
    } catch (err) {
      console.warn('ExpoSecureStoreAdapter.getItem error:', err);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }

      if (!key || typeof key !== 'string') return;
      const safeKey = key.replace(/[^a-zA-Z0-9.\-_]/g, '_');

      // If value is small, write directly
      if (value.length < CHUNK_SIZE) {
        // Clean any old chunks if existed
        await SecureStore.deleteItemAsync(`${safeKey}_chunks`).catch(() => {});
        await SecureStore.setItemAsync(safeKey, value);
        return;
      }

      // Chunk large values (e.g. Supabase JWT sessions)
      const count = Math.ceil(value.length / CHUNK_SIZE);
      await SecureStore.setItemAsync(`${safeKey}_chunks`, count.toString());
      for (let i = 0; i < count; i++) {
        const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await SecureStore.setItemAsync(`${safeKey}_${i}`, chunk);
      }
    } catch (err) {
      console.warn('ExpoSecureStoreAdapter.setItem error:', err);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }

      if (!key || typeof key !== 'string') return;
      const safeKey = key.replace(/[^a-zA-Z0-9.\-_]/g, '_');

      const chunkCountStr = await SecureStore.getItemAsync(`${safeKey}_chunks`).catch(() => null);
      if (chunkCountStr) {
        const count = parseInt(chunkCountStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${safeKey}_${i}`).catch(() => {});
        }
        await SecureStore.deleteItemAsync(`${safeKey}_chunks`).catch(() => {});
      }

      await SecureStore.deleteItemAsync(safeKey).catch(() => {});
    } catch (err) {
      console.warn('ExpoSecureStoreAdapter.removeItem error:', err);
    }
  },
};

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
