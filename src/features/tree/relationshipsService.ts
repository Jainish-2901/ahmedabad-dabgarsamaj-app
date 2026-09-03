import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DirectRelationshipType, FamilyRelationship } from '@/types/database';
import { localAppStore, persistAppStore, restoreAppStore } from '@/features/family/familyStore';

export const relationshipsService = {
  /**
   * Fetch all explicit relationships for a given family
   */
  async getFamilyRelationships(familyId: string): Promise<{
    relationships: FamilyRelationship[];
    error?: string;
  }> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('family_relationships')
          .select('*')
          .eq('family_id', familyId);

        if (!error && data) {
          localAppStore.relationships = data as FamilyRelationship[];
          await persistAppStore();
          return { relationships: data as FamilyRelationship[] };
        }
      } catch (err) {
        console.warn('Error fetching live relationships from Supabase:', err);
      }
    }

    if (localAppStore.relationships.length === 0) {
      await restoreAppStore();
    }

    return { relationships: localAppStore.relationships };
  },

  /**
   * Link two family members explicitly
   */
  async addRelationship(
    familyId: string,
    fromMemberId: string,
    toMemberId: string,
    relationshipType: DirectRelationshipType
  ): Promise<{ error?: string }> {
    if (fromMemberId === toMemberId) {
      return { error: 'A member cannot have a relationship with themselves.' };
    }

    const newRel: FamilyRelationship = {
      id: 'rel-' + Date.now(),
      family_id: familyId,
      from_member_id: fromMemberId,
      to_member_id: toMemberId,
      relationship_type: relationshipType,
      created_at: new Date().toISOString(),
    };

    localAppStore.relationships.push(newRel);

    if (relationshipType === 'SPOUSE') {
      localAppStore.relationships.push({
        id: 'rel-' + (Date.now() + 1),
        family_id: familyId,
        from_member_id: toMemberId,
        to_member_id: fromMemberId,
        relationship_type: 'SPOUSE',
        created_at: new Date().toISOString(),
      });
    }

    await persistAppStore();

    if (isSupabaseConfigured) {
      try {
        await supabase.from('family_relationships').insert({
          family_id: familyId,
          from_member_id: fromMemberId,
          to_member_id: toMemberId,
          relationship_type: relationshipType,
        });
      } catch {}
    }

    return {};
  },

  /**
   * Delete a relationship link
   */
  async deleteRelationship(relationshipId: string): Promise<{ error?: string }> {
    localAppStore.relationships = localAppStore.relationships.filter((r) => r.id !== relationshipId);
    await persistAppStore();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('family_relationships')
          .delete()
          .eq('id', relationshipId);
      } catch {}
    }

    return {};
  },
};
