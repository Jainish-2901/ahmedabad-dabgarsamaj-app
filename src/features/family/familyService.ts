import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Area, Family, FamilyMember } from '@/types/database';
import { calculateAge, formatDate, formatDateForDB, isDummyDOB } from '@/lib/utils/date';
import { getRelationshipDisplay } from '@/constants/relationships';
import { clearAppStore, resetInMemoryStore } from './familyStore';
import { AppStorage } from '@/lib/storage/appStorage';

export interface CreateFamilyInput {
  name: string;
  gender: 'Male' | 'Female';
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

    let userEmail: string | null = null;
    let userPhone: string | null = null;

    // 1. Resolve currently authenticated User ID and email/phone
    if (isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          if (!userId) userId = sessionData.session.user.id;
          userEmail = sessionData.session.user.email || null;
          userPhone = sessionData.session.user.phone || (sessionData.session.user.user_metadata?.phone as string) || null;
        }
      } catch {}
    }

    if ((!userId || !userEmail) && isSupabaseConfigured) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          if (!userId) userId = userData.user.id;
          if (!userEmail) userEmail = userData.user.email || null;
          if (!userPhone) userPhone = userData.user.phone || (userData.user.user_metadata?.phone as string) || null;
        }
      } catch {}
    }

    if (!userId) {
      try {
        const stored = await AppStorage.getItem('cf_persistent_auth_user_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          userId = parsed?.user?.id || null;
          if (!userEmail) userEmail = parsed?.user?.email || null;
          if (!userPhone) userPhone = parsed?.user?.phone || null;
        }
      } catch {}
    }

    // STRICT ISOLATION: If no user is logged in, NEVER return ANY family!
    if (!userId) {
      resetInMemoryStore();
      return { family: null, members: [] };
    }

    // Also check profiles table to ensure we have the member's profile email and phone
    if ((!userEmail || !userPhone) && isSupabaseConfigured) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('email, phone')
          .eq('auth_user_id', userId)
          .maybeSingle();
        if (prof?.email && !userEmail) userEmail = prof.email;
        if (prof?.phone && !userPhone) userPhone = prof.phone;
      } catch {}
    }

    // 2. Fetch directly from Supabase Cloud Database
    if (isSupabaseConfigured) {
      try {
        let familyData: any = null;

        // Step A: Check if this user is the registered Family Head
        const { data: headFamily, error: headFamilyError } = await supabase
          .from('families')
          .select('*')
          .eq('head_user_id', userId)
          .eq('status', 'ACTIVE')
          .maybeSingle();

        if (headFamily && !headFamilyError) {
          familyData = headFamily;
        }

        // Step B: If user is NOT the Family Head, check if they are a family member with EDIT permissions!
        if (!familyData) {
          // B1: Check by member email
          if (userEmail) {
            const cleanEmail = userEmail.toLowerCase().trim();
            const { data: memberRecords } = await supabase
              .from('family_members')
              .select('family_id, can_edit_family, occupation_details')
              .eq('status', 'ACTIVE')
              .or(`email.ilike.${cleanEmail},occupation_details->>email.ilike.${cleanEmail}`)
              .limit(5);

            const permittedMember = memberRecords?.find((m: any) =>
              m.can_edit_family === true ||
              m.occupation_details?.can_edit_family === true ||
              m.occupation_details?.can_edit_family === 'true'
            );

            if (permittedMember?.family_id) {
              const { data: permittedFam } = await supabase
                .from('families')
                .select('*')
                .eq('id', permittedMember.family_id)
                .eq('status', 'ACTIVE')
                .maybeSingle();

              if (permittedFam) {
                familyData = permittedFam;
              }
            }
          }

          // B2: Check by member phone number if still not resolved
          if (!familyData && userPhone) {
            const cleanPhone = userPhone.replace(/[^0-9]/g, '');
            const last10 = cleanPhone.slice(-10);
            if (last10.length >= 7) {
              const { data: phoneMemberRecords } = await supabase
                .from('family_members')
                .select('family_id, can_edit_family, occupation_details')
                .eq('status', 'ACTIVE')
                .ilike('mobile', `%${last10}%`)
                .limit(5);

              const permittedPhoneMember = phoneMemberRecords?.find((m: any) =>
                m.can_edit_family === true ||
                m.occupation_details?.can_edit_family === true ||
                m.occupation_details?.can_edit_family === 'true'
              );

              if (permittedPhoneMember?.family_id) {
                const { data: permittedFam } = await supabase
                  .from('families')
                  .select('*')
                  .eq('id', permittedPhoneMember.family_id)
                  .eq('status', 'ACTIVE')
                  .maybeSingle();

                if (permittedFam) {
                  familyData = permittedFam;
                }
              }
            }
          }
        }

        if (familyData) {
          if (familyData.area_id && !familyData.area) {
            try {
              const { data: areaRecord } = await supabase
                .from('areas')
                .select('id, name')
                .eq('id', familyData.area_id)
                .maybeSingle();
              if (areaRecord) {
                familyData.area = areaRecord;
              }
            } catch (aErr) {
              // ignore area lookup failure
            }
          }

          // Fetch live members directly from Supabase
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
              const isDobUnknown = isDummyDOB(m.dob) || m.occupation_details?.dob_unknown;
              return {
                ...m,
                email: memberEmail,
                can_edit_family: canEdit,
                blood_group: m.blood_group || m.occupation_details?.blood_group || null,
                birth_place: m.birth_place || m.occupation_details?.birth_place || null,
                is_deceased: isDeceased,
                deceased_date: deceasedDate,
                dob: isDobUnknown ? '' : formatDate(m.dob),
                age: isDobUnknown ? undefined : calculateAge(m.dob, isDeceased ? deceasedDate : null),
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

        // Clean slate for newly registered user who has not created a family yet
        resetInMemoryStore();
        return { family: null, members: [] };
      } catch (err) {
        console.warn('Supabase getMyFamily fetch error:', err);
        return { family: null, members: [], error: 'Failed to fetch family from database' };
      }
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
          if (familyData.area_id && !familyData.area) {
            try {
              const { data: areaRecord } = await supabase
                .from('areas')
                .select('id, name')
                .eq('id', familyData.area_id)
                .maybeSingle();
              if (areaRecord) {
                familyData.area = areaRecord;
              }
            } catch (aErr) {
              // ignore
            }
          }

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
              const isDobUnknown = isDummyDOB(m.dob) || m.occupation_details?.dob_unknown;
              return {
                ...m,
                email: memberEmail,
                can_edit_family: canEdit,
                blood_group: m.blood_group || m.occupation_details?.blood_group || null,
                birth_place: m.birth_place || m.occupation_details?.birth_place || null,
                is_deceased: isDeceased,
                deceased_date: deceasedDate,
                dob: isDobUnknown ? '' : formatDate(m.dob),
                age: isDobUnknown ? undefined : calculateAge(m.dob, isDeceased ? deceasedDate : null),
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

    return { family: null, members: [] };
  },

  /**
   * Fetch any family and its members by its unique family_code (e.g. 'ADS-0001')
   */
  async getFamilyByCode(familyCode: string): Promise<{ family: Family | null; members: FamilyMember[]; error?: string }> {
    if (!familyCode || !familyCode.trim()) {
      return { family: null, members: [] };
    }

    const cleanCode = familyCode.trim();

    if (isSupabaseConfigured) {
      try {
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .ilike('family_code', cleanCode)
          .maybeSingle();

        if (familyData && !familyError) {
          return this.getFamilyById(familyData.id);
        }
      } catch (err) {
        console.warn('Supabase getFamilyByCode fetch error:', err);
      }
    }

    return { family: null, members: [] };
  },

  /**
   * Push all locally stored mobile data into Supabase Cloud DB
   */
  async pushLocalDataToSupabase(_passedUserId?: string): Promise<{ success: boolean; count?: number }> {
    return { success: true, count: 0 };
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

    if (!isSupabaseConfigured) {
      return { family: localFam };
    }

    try {
      let userId: string | null = input.head_user_id || null;
      let headUserEmail: string | null = null;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          userId = userId || sessionData.session.user.id;
          headUserEmail = sessionData.session.user.email || null;
        }
      } catch {}

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          userId = userId || userData.user.id;
          headUserEmail = headUserEmail || userData.user.email || null;
        }
      } catch {}

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
        // Security check: ensure this mobile number is not already an active member in any family
        if (input.mobile?.trim()) {
          const cleanPhone = input.mobile.replace(/[^0-9]/g, '');
          const last10 = cleanPhone.slice(-10);
          if (last10.length >= 7) {
            const { data: existingMember } = await supabase
              .from('family_members')
              .select('id, name, relation, family_id')
              .ilike('mobile', `%${last10}%`)
              .eq('status', 'ACTIVE')
              .limit(1)
              .maybeSingle();

            if (existingMember) {
              return {
                error: `આ મોબાઈલ નંબર (${input.mobile.trim()}) પહેલેથી જ પરિવારના સભ્ય (${existingMember.name}) તરીકે નોંધાયેલ છે. આપ નવો પરિવાર નોંધી શકતા નથી.`,
              };
            }
          }
        }

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
          email: headUserEmail,
          blood_group: input.blood_group || null,
          birth_place: input.birth_place || null,
          occupation_details: {
            blood_group: input.blood_group || null,
            birth_place: input.birth_place || null,
            email: headUserEmail,
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

      return { family: familyData as Family };
    } catch (err: any) {
      console.error('createFamilyWithHead error:', err);
      return { error: err?.message || 'Failed to create family' };
    }
  },

  /**
   * Update family directly in Supabase Cloud DB
   */
  async updateFamily(familyId: string, updates: Partial<Family>): Promise<{ family?: Family; error?: string }> {
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
        if (error) {
          return { error: error.message };
        }
      } catch (err: any) {
        console.warn('Supabase updateFamily fallback:', err);
        return { error: err?.message || 'Failed to update family' };
      }
    }

    return { error: 'Database not available' };
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
