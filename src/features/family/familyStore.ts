import { Area, EducationRecord, Family, FamilyMember, FamilyRelationship } from '@/types/database';
import { AppStorage } from '@/lib/storage/appStorage';

export const DEFAULT_AREAS: Area[] = [
  { id: 'area-1', name: 'Nikol', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-2', name: 'Naroda', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-3', name: 'Bapunagar', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-4', name: 'Dabgarwad', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-5', name: 'Kalupur', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-6', name: 'Shahpur', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-7', name: 'Odhav', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-8', name: 'Vastral', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-9', name: 'Maninagar', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-10', name: 'Ghatlodia', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-11', name: 'Satellite', city: 'Ahmedabad', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-12', name: 'Gandhinagar', city: 'Gandhinagar', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'other', name: 'Other / અન્ય', city: 'Other', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
];

export interface AppLocalState {
  currentFamily: Family | null;
  members: FamilyMember[];
  relationships: FamilyRelationship[];
  educations: EducationRecord[];
  occupations: any[];
}

export const localAppStore: AppLocalState = {
  currentFamily: null,
  members: [],
  relationships: [],
  educations: [],
  occupations: [],
};

const APP_STORE_KEY = 'cf_persisted_app_store_v1';

export async function persistAppStore(): Promise<void> {
  try {
    const serialized = JSON.stringify(localAppStore);
    await AppStorage.setItem(APP_STORE_KEY, serialized);
  } catch (err) {
    console.warn('Failed to persist localAppStore:', err);
  }
}

export async function restoreAppStore(): Promise<void> {
  try {
    const serialized = await AppStorage.getItem(APP_STORE_KEY);
    if (serialized) {
      const parsed = JSON.parse(serialized);
      if (parsed) {
        localAppStore.currentFamily = parsed.currentFamily || null;
        localAppStore.members = parsed.members || [];
        localAppStore.relationships = parsed.relationships || [];
        localAppStore.educations = parsed.educations || [];
        localAppStore.occupations = parsed.occupations || [];
      }
    }
  } catch (err) {
    console.warn('Failed to restore localAppStore:', err);
  }
}

export async function clearAppStore(): Promise<void> {
  localAppStore.currentFamily = null;
  localAppStore.members = [];
  localAppStore.relationships = [];
  localAppStore.educations = [];
  localAppStore.occupations = [];

  try {
    await AppStorage.removeItem(APP_STORE_KEY);
  } catch {}
}
