import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DirectRelationshipType, FamilyRelationship } from '@/types/database';

export const relationshipsService = {
  /**
   * Fetch all explicit relationships for a given family directly from Supabase Cloud DB
   */
  async getFamilyRelationships(familyId: string): Promise<{
    relationships: FamilyRelationship[];
    error?: string;
  }> {
    if (!familyId) {
      return { relationships: [] };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('family_relationships')
          .select('*')
          .eq('family_id', familyId);

        if (!error && data) {
          return { relationships: data as FamilyRelationship[] };
        }
        if (error) {
          return { relationships: [], error: error.message };
        }
      } catch (err: any) {
        console.warn('Error fetching live relationships from Supabase:', err);
        return { relationships: [], error: err?.message || 'Failed to fetch relationships' };
      }
    }

    return { relationships: [] };
  },

  /**
   * Link two family members explicitly directly in Supabase Cloud DB
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

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('family_relationships').insert({
          family_id: familyId,
          from_member_id: fromMemberId,
          to_member_id: toMemberId,
          relationship_type: relationshipType,
        });

        if (error) return { error: error.message };

        if (relationshipType === 'SPOUSE') {
          await supabase.from('family_relationships').insert({
            family_id: familyId,
            from_member_id: toMemberId,
            to_member_id: fromMemberId,
            relationship_type: 'SPOUSE',
          });
        }

        return {};
      } catch (err: any) {
        return { error: err?.message || 'Failed to save relationship' };
      }
    }

    return {};
  },

  /**
   * Delete a relationship link directly from Supabase Cloud DB
   */
  async deleteRelationship(relationshipId: string): Promise<{ error?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('family_relationships')
          .delete()
          .eq('id', relationshipId);

        if (error) return { error: error.message };
      } catch (err: any) {
        return { error: err?.message || 'Failed to delete relationship' };
      }
    }

    return {};
  },
};
