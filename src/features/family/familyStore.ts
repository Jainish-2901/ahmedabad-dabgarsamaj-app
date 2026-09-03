import { Area, EducationRecord, Family, FamilyMember, FamilyRelationship } from '@/types/database';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
  { id: 'area-13', name: 'Surat', city: 'Surat', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-14', name: 'Vadodara', city: 'Vadodara', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
  { id: 'area-15', name: 'Rajkot', city: 'Rajkot', state: 'Gujarat', status: 'ACTIVE', created_at: '' },
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
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(APP_STORE_KEY, serialized);
      }
    } else {
      await SecureStore.setItemAsync(APP_STORE_KEY, serialized);
    }
  } catch (err) {
    console.warn('Failed to persist localAppStore:', err);
  }
}

export async function restoreAppStore(): Promise<void> {
  try {
    let serialized: string | null = null;
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.localStorage) {
        serialized = window.localStorage.getItem(APP_STORE_KEY);
      }
    } else {
      serialized = await SecureStore.getItemAsync(APP_STORE_KEY);
    }

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
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(APP_STORE_KEY);
      }
    } else {
      await SecureStore.deleteItemAsync(APP_STORE_KEY);
    }
  } catch { }
}
