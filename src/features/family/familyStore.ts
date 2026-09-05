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

export async function persistAppStore(userId?: string | null): Promise<void> {
  try {
    const effectiveUserId = userId || localAppStore.ownerUserId || null;
    localAppStore.ownerUserId = effectiveUserId;
    const serialized = JSON.stringify(localAppStore);
    await AppStorage.setItem(getAppStoreKey(effectiveUserId), serialized);
  } catch (err) {
    console.warn('Failed to persist localAppStore:', err);
  }
}

export async function restoreAppStore(userId?: string | null): Promise<void> {
  try {
    const effectiveUserId = userId || null;
    // If no user ID is provided, do NOT restore any user's family
    if (!effectiveUserId) {
      resetInMemoryStore();
      return;
    }

    const key = getAppStoreKey(effectiveUserId);
    const serialized = await AppStorage.getItem(key);
    if (serialized) {
      const parsed = JSON.parse(serialized);
      if (parsed) {
        // Enforce strict user isolation: if stored owner doesn't match current user, ignore
        if (parsed.ownerUserId && parsed.ownerUserId !== effectiveUserId) {
          resetInMemoryStore();
          return;
        }

        localAppStore.ownerUserId = effectiveUserId;
        localAppStore.currentFamily = parsed.currentFamily || null;
        localAppStore.members = parsed.members || [];
        localAppStore.relationships = parsed.relationships || [];
        localAppStore.educations = parsed.educations || [];
        localAppStore.occupations = parsed.occupations || [];
        return;
      }
    }

    // If no matching persistent store found for this user, keep in-memory store clean
    if (localAppStore.ownerUserId !== effectiveUserId) {
      resetInMemoryStore();
    }
  } catch (err) {
    console.warn('Failed to restore localAppStore:', err);
  }
}

export async function clearAppStore(userId?: string | null): Promise<void> {
  const effectiveUserId = userId || localAppStore.ownerUserId || null;
  resetInMemoryStore();

  try {
    if (effectiveUserId) {
      await AppStorage.removeItem(getAppStoreKey(effectiveUserId));
    }
    await AppStorage.removeItem('cf_persisted_app_store_v2_guest');
    await AppStorage.removeItem('cf_persisted_app_store_v1'); // legacy global key
  } catch {}
}
