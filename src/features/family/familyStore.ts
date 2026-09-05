import { EducationRecord, Family, FamilyMember, FamilyRelationship } from '@/types/database';
import { AppStorage } from '@/lib/storage/appStorage';

export interface AppLocalState {
  ownerUserId: string | null;
  currentFamily: Family | null;
  members: FamilyMember[];
  relationships: FamilyRelationship[];
  educations: EducationRecord[];
  occupations: any[];
}

export const localAppStore: AppLocalState = {
  ownerUserId: null,
  currentFamily: null,
  members: [],
  relationships: [],
  educations: [],
  occupations: [],
};

export function getAppStoreKey(userId?: string | null): string {
  if (userId && typeof userId === 'string' && userId.trim()) {
    const safeUser = userId.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    return `cf_persisted_app_store_v2_${safeUser}`;
  }
  return 'cf_persisted_app_store_v2_guest';
}

/**
 * Synchronously resets the in-memory store so no stale family data
 * can ever leak to another user session.
 */
export function resetInMemoryStore(): void {
  localAppStore.ownerUserId = null;
  localAppStore.currentFamily = null;
  localAppStore.members = [];
  localAppStore.relationships = [];
  localAppStore.educations = [];
  localAppStore.occupations = [];
}

/**
 * Direct DB Mode: Family data is never saved into device persistent storage.
 * Supabase Cloud DB is the single source of truth.
 */
export async function persistAppStore(_userId?: string | null): Promise<void> {
  // Direct DB mode: no local file/storage write
}

/**
 * Direct DB Mode: Family data is always fetched directly from Supabase DB.
 */
export async function restoreAppStore(_userId?: string | null): Promise<void> {
  resetInMemoryStore();
}

/**
 * Completely purges any legacy local device cache for all accounts.
 */
export async function clearAppStore(userId?: string | null): Promise<void> {
  resetInMemoryStore();

  try {
    if (userId) {
      await AppStorage.removeItem(getAppStoreKey(userId));
    }
    await AppStorage.removeItem('cf_persisted_app_store_v2_guest');
    await AppStorage.removeItem('cf_persisted_app_store_v1');
  } catch {}
}
