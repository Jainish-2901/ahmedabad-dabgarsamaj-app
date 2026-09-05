import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Area, Family, FamilyMember } from '@/types/database';
import { calculateAge, formatDate, formatDateForDB } from '@/lib/utils/date';
import { getRelationshipDisplay } from '@/constants/relationships';
import { localAppStore, persistAppStore, restoreAppStore, clearAppStore, resetInMemoryStore } from './familyStore';
import { AppStorage } from '@/lib/storage/appStorage';

export interface CreateFamilyInput {
  name: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dob: string;
  mobile: string;
  photo_url?: string | null;
  address: string;
  area_id?: string | null;
  city: string;
  state: string;
  pincode: string;
  education_status?: string;
  occupation_type?: string;
  head_user_id?: string;
  blood_group?: string | null;
  birth_place?: string | null;
}

export const familyService = {
  /**
   * Fetch all active areas (deprecated: areas are now removed)
   */
  async getAreas(): Promise<{ data: Area[]; error?: string }> {
    return { data: [] };
  },


  /**
   * Get current user's family and members from Supabase Cloud DB with offline fallback
   */
  async getMyFamily(passedUserId?: string): Promise<{ family: Family | null; members: FamilyMember[]; error?: string }> {
    let userId: string | null = passedUserId || null;

    // 1. Resolve currently authenticated User ID
    if (!userId && isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData?.session?.user?.id || null;
      } catch {}
    }

    if (!userId && isSupabaseConfigured) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        userId = userData?.user?.id || null;
      } catch {}
    }

    if (!userId) {
      try {
        const stored = await AppStorage.getItem('cf_persistent_auth_user_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          userId = parsed?.user?.id || null;
        } else {
          const legacyStored = await AppStorage.getItem('cf_persistent_auth_user_v1');
          if (legacyStored) {
            const parsed = JSON.parse(legacyStored);
            userId = parsed?.user?.id || null;
          }
        }
      } catch {}
    }

    // STRICT ISOLATION: If no user is logged in, NEVER return ANY cached family!
    if (!userId) {
      resetInMemoryStore();
      return { family: null, members: [] };
    }

    // 2. Try to fetch from Supabase Cloud Database first
    if (isSupabaseConfigured) {
      try {
        // A. Fetch family for this user as head
        let { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('head_user_id', userId)
          .eq('status', 'ACTIVE')
          .maybeSingle();

        // B. If not found by head_user_id, check member link via profile phone or email
        if (!familyData) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', userId)
            .maybeSingle();

          if (userProfile?.phone) {
            const cleanPhone = userProfile.phone.replace(/[^0-9]/g, '').slice(-10);
            const { data: memberByPhone } = await supabase
              .from('family_members')
              .select('family_id')
              .ilike('mobile', `%${cleanPhone}%`)
              .maybeSingle();

            if (memberByPhone?.family_id) {
              const { data: famById } = await supabase
                .from('families')
                .select('*')
                .eq('id', memberByPhone.family_id)
                .eq('status', 'ACTIVE')
                .maybeSingle();
              familyData = famById;
            }
          }

          // Check member link via profile email or auth user email
          if (!familyData) {
            let userEmail = userProfile?.email;
            if (!userEmail) {
              const { data: authUser } = await supabase.auth.getUser();
              userEmail = authUser?.user?.email;
            }
            if (userEmail) {
              const { data: memberByEmail } = await supabase
                .from('family_members')
                .select('family_id')
                .ilike('email', userEmail.trim())
                .maybeSingle();

              if (memberByEmail?.family_id) {
                const { data: famById } = await supabase
                  .from('families')
                  .select('*')
                  .eq('id', memberByEmail.family_id)
                  .eq('status', 'ACTIVE')
                  .maybeSingle();
                familyData = famById;
              }
            }
          }
        }

        // NOTE: NO RANDOM FALLBACK! If user has no active family, do NOT assign someone else's family!

        if (familyData && !familyError) {
          // Fetch live members from Supabase
          const { data: membersData, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('family_id', familyData.id)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: true });

          if (!membersError && membersData) {
            const members: FamilyMember[] = membersData.map((m: any) => {
              const isDeceased = m.is_deceased === true || m.status === 'DECEASED' || m.occupation_details?.is_deceased === true;
              const deceasedDate = m.deceased_date || m.occupation_details?.deceased_date || null;
              const canEdit = m.can_edit_family === true || m.occupation_details?.can_edit_family === true || m.relation === 'FAMILY_HEAD';
              const memberEmail = m.email || m.occupation_details?.email || null;
              return {
                ...m,
                email: memberEmail,
                can_edit_family: canEdit,
                blood_group: m.blood_group || m.occupation_details?.blood_group || null,
                birth_place: m.birth_place || m.occupation_details?.birth_place || null,
                is_deceased: isDeceased,
                deceased_date: deceasedDate,
                age: calculateAge(m.dob),
                display_relation: getRelationshipDisplay(m.relation),
              };
            });

            const family: Family = {
              ...familyData,
              members_count: members.length,
            };

            const memberIds = members.map((m) => m.id);

            // Fetch education records for all members
            const { data: eduData } = await supabase
              .from('education_records')
              .select('*')
              .in('family_member_id', memberIds);

            // Fetch occupation records for all members
            const { data: occData } = await supabase
              .from('occupation_records')
              .select('*')
              .in('family_member_id', memberIds);

            // Update local store as resilient offline cache strictly for THIS user
            localAppStore.ownerUserId = userId;
            localAppStore.currentFamily = family;
            localAppStore.members = members;
            if (eduData) localAppStore.educations = eduData;
            if (occData) localAppStore.occupations = occData;
            await persistAppStore(userId);

            return { family, members };
          }
        } else if (!familyData) {
          // If the user has no family registered in Supabase, make sure their local cache is clean
          if (localAppStore.ownerUserId === userId) {
            localAppStore.currentFamily = null;
            localAppStore.members = [];
            localAppStore.relationships = [];
            localAppStore.educations = [];
            localAppStore.occupations = [];
            await persistAppStore(userId);
          }
          return { family: null, members: [] };
        }
      } catch (err) {
        console.warn('Supabase getMyFamily network fallback:', err);
      }
    }

    // 3. Fallback to Local Persistent Store ONLY if it belongs to THIS exact user
    await restoreAppStore(userId);

    if (
      localAppStore.currentFamily &&
      (localAppStore.ownerUserId === userId || localAppStore.currentFamily.head_user_id === userId)
    ) {
      const members = localAppStore.members.map((m) => ({
        ...m,
        age: calculateAge(m.dob),
        display_relation: getRelationshipDisplay(m.relation),
      }));
      return {
        family: { ...localAppStore.currentFamily, members_count: members.length },
        members,
      };
    }

    return { family: null, members: [] };
  },

  /**
   * Fetch any family by its ID along with its active members
   */
  async getFamilyById(familyId: string): Promise<{ family: Family | null; members: FamilyMember[]; error?: string }> {
    if (!familyId) {
      return { family: null, members: [] };
    }

    if (isSupabaseConfigured) {
      try {
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', familyId)
          .maybeSingle();

        if (familyData && !familyError) {
          const { data: membersData, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('family_id', familyId)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: true });

          if (!membersError && membersData) {
            const members: FamilyMember[] = membersData.map((m: any) => {
              const isDeceased = m.is_deceased === true || m.status === 'DECEASED' || m.occupation_details?.is_deceased === true;
              const deceasedDate = m.deceased_date || m.occupation_details?.deceased_date || null;
              const canEdit = m.can_edit_family === true || m.occupation_details?.can_edit_family === true || m.relation === 'FAMILY_HEAD';
              const memberEmail = m.email || m.occupation_details?.email || null;
              return {
                ...m,
                email: memberEmail,
                can_edit_family: canEdit,
                blood_group: m.blood_group || m.occupation_details?.blood_group || null,
                birth_place: m.birth_place || m.occupation_details?.birth_place || null,
                is_deceased: isDeceased,
                deceased_date: deceasedDate,
                age: calculateAge(m.dob),
                display_relation: getRelationshipDisplay(m.relation),
              };
            });

            const family: Family = {
              ...familyData,
              members_count: members.length,
            };

            return { family, members };
          }
        }
      } catch (err) {
        console.warn('Supabase getFamilyById network fallback:', err);
      }
    }

    await restoreAppStore();
    if (localAppStore.currentFamily && localAppStore.currentFamily.id === familyId) {
      const members = localAppStore.members.map((m) => ({
        ...m,
        age: calculateAge(m.dob),
        display_relation: getRelationshipDisplay(m.relation),
      }));
      return {
        family: { ...localAppStore.currentFamily, members_count: members.length },
        members,
      };
    }

    return { family: null, members: [] };
  },

  /**
   * Push all locally stored mobile data into Supabase Cloud DB
   */
  async pushLocalDataToSupabase(): Promise<{ success: boolean; error?: string; count?: number }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured' };
    }

    await restoreAppStore();
    if (!localAppStore.currentFamily || localAppStore.members.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User is not logged in. Please sign in to sync.' };
      }

      const localFam = localAppStore.currentFamily;

      // 1. Check if family already exists in Supabase
      const { data: existingFam } = await supabase
        .from('families')
        .select('*')
        .eq('head_user_id', user.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      let dbFamilyId = existingFam?.id;

      if (!dbFamilyId) {
        // Insert Family
        const { data: insertedFam, error: famErr } = await supabase
          .from('families')
          .insert({
            head_user_id: user.id,
            address: localFam.address || 'Address',
            city: localFam.city || 'Ahmedabad',
            state: localFam.state || 'Gujarat',
            pincode: localFam.pincode || '380001',
            status: 'ACTIVE',
          })
          .select()
          .single();

        if (famErr) throw famErr;
        dbFamilyId = insertedFam.id;
      }

      // 2. Sync Members
      const memberIdMap: Record<string, string> = {};

      for (const m of localAppStore.members) {
        const { data: insertedMember, error: memErr } = await supabase
          .from('family_members')
          .insert({
            family_id: dbFamilyId,
            name: m.name,
            gender: m.gender,
            mobile: m.mobile || null,
            dob: m.dob,
            photo_url: m.photo_url || null,
            relation: m.relation,
            residence_type: m.residence_type || 'SAME_AS_FAMILY',
            separate_address: m.separate_address || null,
            separate_city: m.separate_city || null,
            separate_pincode: m.separate_pincode || null,
            education_status: m.education_status || null,
            occupation_type: m.occupation_type || null,
            occupation_details: m.occupation_details || {},
            status: 'ACTIVE',
          })
          .select()
          .single();

        if (!memErr && insertedMember) {
          memberIdMap[m.id] = insertedMember.id;
        }
      }

      // 3. Sync Relationships
      for (const rel of localAppStore.relationships) {
        const fromDbId = memberIdMap[rel.from_member_id];
        const toDbId = memberIdMap[rel.to_member_id];
        if (fromDbId && toDbId) {
          await supabase.from('family_relationships').insert({
            family_id: dbFamilyId,
            from_member_id: fromDbId,
            to_member_id: toDbId,
            relationship_type: rel.relationship_type,
          });
        }
      }

      return { success: true, count: Object.keys(memberIdMap).length };
    } catch (err: any) {
      console.warn('Sync to Supabase error:', err);
      return { success: false, error: err?.message || 'Sync failed' };
    }
  },

  /**
   * Create a new family and automatically create the Family Head member record
   */
  async createFamilyWithHead(input: CreateFamilyInput): Promise<{ family?: Family; error?: string }> {
    let resolvedUserId: string | null = input.head_user_id || null;

    if (!resolvedUserId && isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        resolvedUserId = sessionData?.session?.user?.id || null;
      } catch {}
    }

    if (!resolvedUserId && isSupabaseConfigured) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        resolvedUserId = userData?.user?.id || null;
      } catch {}
    }

    if (!resolvedUserId) {
      try {
        const stored = await AppStorage.getItem('cf_persistent_auth_user_v2');
        if (stored) {
          resolvedUserId = JSON.parse(stored)?.user?.id || null;
        }
      } catch {}
    }

    const effectiveUserId = resolvedUserId || 'user-' + Date.now();

    const newFamilyId = 'fam-' + Date.now();
    const headMemberId = 'mem-' + Date.now();
    const familyCode = 'FAM-' + Math.floor(100000 + Math.random() * 900000);

    const localFam: Family = {
      id: newFamilyId,
      family_code: familyCode,
      head_user_id: effectiveUserId,
      address: input.address.trim(),
      area_id: null,
      area: null,
      city: input.city.trim() || 'Ahmedabad',
      state: input.state.trim() || 'Gujarat',
      pincode: input.pincode.trim(),
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members_count: 1,
    };

    const headMember: FamilyMember = {
      id: headMemberId,
      family_id: newFamilyId,
      name: input.name.trim(),
      gender: input.gender,
      photo_url: input.photo_url || null,
      mobile: input.mobile.trim(),
      dob: input.dob,
      relation: 'FAMILY_HEAD',
      residence_type: 'SAME_AS_FAMILY',
      education_status: input.education_status || null,
      occupation_type: input.occupation_type || null,
      blood_group: input.blood_group || null,
      birth_place: input.birth_place || null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      age: calculateAge(input.dob),
      display_relation: 'Family Head / પરિવાર વડા',
    };

    localAppStore.ownerUserId = effectiveUserId;
    localAppStore.currentFamily = localFam;
    localAppStore.members = [headMember];
    await persistAppStore(effectiveUserId);

    if (!isSupabaseConfigured) {
      return { family: localFam };
    }

    try {
      let userId: string | null = input.head_user_id || null;

      if (!userId) {
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData?.session?.user?.id || null;
      }

      if (!userId) {
        const { data: userData } = await supabase.auth.getUser();
        userId = userData?.user?.id || null;
      }

      if (!userId) {
        return { error: 'You are not logged in. Please sign in to create a family.' };
      }

      // Check if family already exists for this user to prevent duplicate rows on retry
      const { data: existingFam } = await supabase
        .from('families')
        .select('*')
        .eq('head_user_id', userId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      let familyData = existingFam;

      if (!familyData) {
        // Insert new family
        const { data: insertedFam, error: familyError } = await supabase
          .from('families')
          .insert({
            head_user_id: userId,
            address: input.address.trim(),
            area_id: null,
            city: input.city.trim() || 'Ahmedabad',
            state: input.state.trim() || 'Gujarat',
            pincode: input.pincode.trim(),
            status: 'ACTIVE',
          })
          .select()
          .single();

        if (familyError) {
          console.error('Supabase family insert error:', familyError);
          return { error: familyError.message };
        }
        familyData = insertedFam;
      } else {
        // Update existing family
        const { data: updatedFam } = await supabase
          .from('families')
          .update({
            address: input.address.trim(),
            area_id: null,
            city: input.city.trim() || 'Ahmedabad',
            state: input.state.trim() || 'Gujarat',
            pincode: input.pincode.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', familyData.id)
          .select()
          .single();
        if (updatedFam) familyData = updatedFam;
      }

      // Check if Family Head member record already exists
      const { data: existingHead } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyData.id)
        .eq('relation', 'FAMILY_HEAD')
        .maybeSingle();

      let headData = existingHead;

      if (!headData) {
        const headPayload: any = {
          family_id: familyData.id,
          name: input.name.trim(),
          gender: input.gender,
          photo_url: input.photo_url || null,
          mobile: input.mobile.trim(),
          dob: formatDateForDB(input.dob),
          relation: 'FAMILY_HEAD',
          residence_type: 'SAME_AS_FAMILY',
          education_status: input.education_status || null,
          occupation_type: input.occupation_type || null,
          blood_group: input.blood_group || null,
          birth_place: input.birth_place || null,
          occupation_details: {
            blood_group: input.blood_group || null,
            birth_place: input.birth_place || null,
          },
          status: 'ACTIVE',
        };

        let { data: insertedHead, error: headError } = await supabase
          .from('family_members')
          .insert(headPayload)
          .select()
          .single();

        if (headError && (headError.message?.includes('blood_group') || headError.message?.includes('birth_place') || headError.code === 'PGRST204')) {
          delete headPayload.blood_group;
          delete headPayload.birth_place;
          const retryRes = await supabase.from('family_members').insert(headPayload).select().single();
          insertedHead = retryRes.data;
          headError = retryRes.error;
        }

        if (headError) {
          console.error('Head member insert error:', headError);
          return { error: headError.message };
        }
        headData = insertedHead;
      } else {
        const updateHeadPayload: any = {
          name: input.name.trim(),
          gender: input.gender,
          photo_url: input.photo_url || existingHead.photo_url,
          mobile: input.mobile.trim(),
          dob: formatDateForDB(input.dob),
          education_status: input.education_status || existingHead.education_status,
          occupation_type: input.occupation_type || existingHead.occupation_type,
          updated_at: new Date().toISOString(),
        };

        if (input.blood_group !== undefined) updateHeadPayload.blood_group = input.blood_group;
        if (input.birth_place !== undefined) updateHeadPayload.birth_place = input.birth_place;

        let { data: updatedHead, error: updateHeadError } = await supabase
          .from('family_members')
          .update(updateHeadPayload)
          .eq('id', headData.id)
          .select()
          .single();

        if (updateHeadError && (updateHeadError.message?.includes('blood_group') || updateHeadError.message?.includes('birth_place') || updateHeadError.code === 'PGRST204')) {
          delete updateHeadPayload.blood_group;
          delete updateHeadPayload.birth_place;
          const retryRes = await supabase.from('family_members').update(updateHeadPayload).eq('id', headData.id).select().single();
          updatedHead = retryRes.data;
        }

        if (updatedHead) headData = updatedHead;
      }

      // If occupation provided, insert/upsert into occupation_records
      if (input.occupation_type && headData) {
        try {
          await supabase.from('occupation_records').upsert({
            family_member_id: headData.id,
            occupation_type: input.occupation_type,
            updated_at: new Date().toISOString(),
          });
        } catch {}
      }

      localAppStore.ownerUserId = effectiveUserId;
      localAppStore.currentFamily = familyData as Family;
      if (headData) {
        localAppStore.members = [{
          ...headData,
          age: calculateAge(headData.dob),
          display_relation: getRelationshipDisplay(headData.relation),
        }];
      }
      await persistAppStore(effectiveUserId);
      return { family: familyData as Family };
    } catch (err: any) {
      console.error('createFamilyWithHead error:', err);
      return { error: err?.message || 'Failed to create family' };
    }
  },

  /**
   * Update family
   */
  async updateFamily(familyId: string, updates: Partial<Family>): Promise<{ family?: Family; error?: string }> {
    if (localAppStore.currentFamily) {
      localAppStore.currentFamily = {
        ...localAppStore.currentFamily,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await persistAppStore(localAppStore.ownerUserId);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('families')
          .update({
            address: updates.address,
            area_id: updates.area_id,
            city: updates.city,
            state: updates.state,
            pincode: updates.pincode,
            updated_at: new Date().toISOString(),
          })
          .eq('id', familyId)
          .select()
          .single();

        if (data && !error) {
          return { family: data as Family };
        }
      } catch (err) {
        console.warn('Supabase updateFamily fallback:', err);
      }
    }

    return { family: localAppStore.currentFamily || undefined };
  },

  /**
   * Permanently delete a family and all associated data, members, and user profile
   */
  async deleteFamilyAccount(familyId?: string, userId?: string): Promise<{ error?: string }> {
    try {
      // 1. Permanently delete from Supabase Cloud DB
      if (isSupabaseConfigured) {
        // Try RPC function first (runs as security definer and cleans up auth.users as well)
        const { error: rpcError } = await supabase.rpc('delete_user_account');

        if (rpcError) {
          console.warn('RPC delete_user_account fallback:', rpcError);
          // Fallback to direct table deletions
          if (familyId) {
            const { data: memberIds } = await supabase
              .from('family_members')
              .select('id')
              .eq('family_id', familyId);

            if (memberIds && memberIds.length > 0) {
              const ids = memberIds.map((m: any) => m.id);
              await supabase.from('education_records').delete().in('family_member_id', ids);
              await supabase.from('occupation_records').delete().in('family_member_id', ids);
            }

            await supabase.from('family_relationships').delete().eq('family_id', familyId);
            try {
              await supabase.from('member_edit_access').delete().eq('family_id', familyId);
            } catch {}

            await supabase.from('family_members').delete().eq('family_id', familyId);
            await supabase.from('families').delete().eq('id', familyId);
          }

          if (userId) {
            await supabase.from('profiles').delete().eq('auth_user_id', userId);
          }
        }
      }

      // 2. Clear local store completely
      await clearAppStore();

      return {};
    } catch (err: any) {
      console.error('deleteFamilyAccount exception:', err);
      return { error: err.message || 'Failed to delete family account' };
    }
  },
};
