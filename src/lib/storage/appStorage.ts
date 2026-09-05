import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Universal persistent storage adapter for Web & Native (Android/iOS).
 * 
 * Why this is necessary:
 * 1. Android SecureStore has a strict 2048-byte Keystore limit. Large payloads
 *    (Supabase JWTs, user sessions, family records) fail silently or crash on Android.
 * 2. FileSystem.documentDirectory persists permanently across app restarts, background kills,
 *    and device reboots, behaving exactly like WhatsApp / Instagram session storage.
 * 3. Backward compatibility: Reads from SecureStore if the file does not exist yet.
 */

function getSafeFilename(key: string): string {
  const sanitized = key.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  return `cf_storage_${sanitized}.json`;
}

function getBaseDir(): string | null {
  const dir = FileSystem.documentDirectory;
  if (!dir) return null;
  return dir.endsWith('/') ? dir : `${dir}/`;
}

// In-memory fast cache to ensure immediate synchronous availability and bridge resilience
const memoryCache = new Map<string, string>();

export const AppStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!key || typeof key !== 'string') return null;

    try {
      // 1. Web Platform
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        if (typeof window !== 'undefined' && window.localStorage) {
          const val = window.localStorage.getItem(key);
          if (val !== null) return val;
        }
        return memoryCache.get(key) || null;
      }

      // 2. Memory Cache Check (Instant)
      if (memoryCache.has(key)) {
        return memoryCache.get(key) || null;
      }

      // 3. Native Platforms (Android / iOS): Use FileSystem documentDirectory with normalized slash
      const baseDir = getBaseDir();
      if (baseDir) {
        const fileUri = `${baseDir}${getSafeFilename(key)}`;
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(fileUri);
          if (content) {
            memoryCache.set(key, content);
            return content;
          }
        }
      }

      // 4. Fallback to SecureStore (for backward compatibility with previous sessions)
      const safeKey = key.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 200);
      const secureVal = await SecureStore.getItemAsync(safeKey).catch(() => null);
      if (secureVal) {
        memoryCache.set(key, secureVal);
        // Migrate to file system storage
        if (baseDir) {
          const fileUri = `${baseDir}${getSafeFilename(key)}`;
          await FileSystem.writeAsStringAsync(fileUri, secureVal).catch(() => {});
        }
        return secureVal;
      }
    } catch (err) {
      console.warn(`AppStorage.getItem error for key [${key}]:`, err);
    }

    return memoryCache.get(key) || null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!key || typeof key !== 'string' || value === undefined || value === null) return;

    try {
      memoryCache.set(key, value);

      // 1. Web Platform
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }

      // 2. Native Platforms: Write to persistent documentDirectory with normalized slash
      const baseDir = getBaseDir();
      if (baseDir) {
        const fileUri = `${baseDir}${getSafeFilename(key)}`;
        await FileSystem.writeAsStringAsync(fileUri, value);
      }

      // Also mirror to SecureStore if payload is small (< 1800 bytes) as secondary backup
      if (value.length < 1800) {
        const safeKey = key.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 200);
        await SecureStore.setItemAsync(safeKey, value).catch(() => {});
      }
    } catch (err) {
      console.warn(`AppStorage.setItem error for key [${key}]:`, err);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!key || typeof key !== 'string') return;

    try {
      memoryCache.delete(key);

      // 1. Web Platform
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }

      // 2. Native Platforms: Remove file from documentDirectory
      const baseDir = getBaseDir();
      if (baseDir) {
        const fileUri = `${baseDir}${getSafeFilename(key)}`;
        await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
      }

      // Also remove from SecureStore
      const safeKey = key.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 200);
      await SecureStore.deleteItemAsync(safeKey).catch(() => {});
    } catch (err) {
      console.warn(`AppStorage.removeItem error for key [${key}]:`, err);
    }
  },
};
