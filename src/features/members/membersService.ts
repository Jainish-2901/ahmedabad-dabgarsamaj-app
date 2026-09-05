import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { EducationRecord, FamilyMember, OccupationRecord } from '@/types/database';
import { calculateAge, formatDate, formatDateForDB } from '@/lib/utils/date';
import { getRelationshipDisplay } from '@/constants/relationships';

export interface AddMemberInput {
  family_id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dob: string; // DD-MM-YYYY or YYYY-MM-DD
  relation: string; // RelationshipCode
  mobile?: string;
  photo_url?: string | null;
  residence_type: 'SAME_AS_FAMILY' | 'SEPARATE';
  separate_address?: string;
  separate_area_id?: string | null;
  separate_city?: string;
  separate_state?: string;
  separate_pincode?: string;
  // Education fields
  education_level?: string;
  course_or_standard?: string;
  education_status?: 'Studying' | 'Completed' | 'Discontinued' | 'Dropped' | 'Other';
  passing_year?: number;
  current_year?: string;
  institution?: string;
  // Occupation fields
  occupation_type?: string;
  occupation_details?: Record<string, any>;
  // Life status fields
  is_deceased?: boolean;
  deceased_date?: string | null;
  // Personal detail fields
  blood_group?: string | null;
  birth_place?: string | null;
  email?: string | null;
  can_edit_family?: boolean;
}

export function mapOccupationFields(type?: string | null, details?: Record<string, any>) {
  if (!type) return null;
  const d = details || {};

  const organization_name =
    d.company_name ||
    d.practice_name ||
    d.school_or_college ||
    d.previous_organization ||
    null;

  const designation =
    d.designation ||
    d.profession ||
    d.specialization ||
    d.current_year_or_std ||
    null;

  const business_name =
    d.business_name ||
    d.shop_name ||
    null;

  const business_type =
    d.business_type ||
    d.shop_type ||
    d.work_description ||
    null;

  const work_location =
    d.work_location ||
    d.business_location ||
    d.shop_location ||
    d.work_address ||
    d.village_or_taluka ||
    null;

  const parsedExp = d.experience_years ? parseInt(String(d.experience_years), 10) : null;
  const experience_years = isNaN(parsedExp as number) ? null : parsedExp;

  return {
    occupation_type: type,
    organization_name,
    designation,
    business_name,
    business_type,
    work_location,
    experience_years,
    details: d,
  };
}

export const membersService = {
  /**
   * Add a new member to the family
   */
  async addMember(input: AddMemberInput): Promise<{ member?: FamilyMember; error?: string }> {
    const newMemberId = 'mem-' + Date.now();
    const isDeceased = input.is_deceased === true;
    const occDetails = {
      ...(input.occupation_details || {}),
      is_deceased: isDeceased,
      deceased_date: input.deceased_date || null,
      blood_group: input.blood_group || null,
      birth_place: input.birth_place || null,
    };

    const newMember: FamilyMember = {
      id: newMemberId,
      family_id: input.family_id,
      name: input.name.trim(),
      gender: input.gender,
      dob: formatDate(input.dob),
      relation: input.relation,
      mobile: input.mobile?.trim() || null,
      photo_url: input.photo_url || null,
      residence_type: input.residence_type,
      separate_address: input.residence_type === 'SEPARATE' ? input.separate_address?.trim() || null : null,
      separate_area_id: input.residence_type === 'SEPARATE' ? input.separate_area_id || null : null,
      separate_city: input.residence_type === 'SEPARATE' ? input.separate_city?.trim() || 'Ahmedabad' : null,
      separate_state: input.residence_type === 'SEPARATE' ? input.separate_state?.trim() || 'Gujarat' : null,
      separate_pincode: input.residence_type === 'SEPARATE' ? input.separate_pincode?.trim() || null : null,
      education_status: input.education_status || null,
      occupation_type: input.occupation_type || null,
      occupation_details: occDetails,
      blood_group: input.blood_group || null,
      birth_place: input.birth_place || null,
      status: 'ACTIVE',
      is_deceased: isDeceased,
      deceased_date: input.deceased_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      age: calculateAge(input.dob),
      display_relation: getRelationshipDisplay(input.relation),
    };

    if (!isSupabaseConfigured) {
      return { member: newMember };
    }

    try {
      const insertPayload: any = {
        family_id: input.family_id,
        name: input.name.trim(),
        gender: input.gender,
        dob: formatDateForDB(input.dob),
        relation: input.relation,
        mobile: input.mobile ? input.mobile.trim() : null,
        photo_url: input.photo_url || null,
        residence_type: input.residence_type,
        address: input.residence_type === 'SEPARATE' ? input.separate_address || null : null,
        area_id: input.residence_type === 'SEPARATE' ? input.separate_area_id || null : null,
        city: input.residence_type === 'SEPARATE' ? input.separate_city || 'Ahmedabad' : null,
        state: input.residence_type === 'SEPARATE' ? input.separate_state || 'Gujarat' : null,
        pincode: input.residence_type === 'SEPARATE' ? input.separate_pincode || null : null,
        education_status: input.education_status || null,
        occupation_type: input.occupation_type || null,
        blood_group: input.blood_group || null,
        birth_place: input.birth_place || null,
        email: input.email || null,
        can_edit_family: input.can_edit_family || false,
        occupation_details: occDetails,
        is_deceased: isDeceased,
        deceased_date: input.deceased_date || null,
        status: 'ACTIVE',
      };

      let { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .insert(insertPayload)
        .select()
        .single();

      // Graceful fallback if database schema does not have blood_group/birth_place columns yet
      if (memberError && (memberError.message?.includes('blood_group') || memberError.message?.includes('birth_place') || memberError.code === 'PGRST204')) {
        delete insertPayload.blood_group;
        delete insertPayload.birth_place;
        const retryRes = await supabase.from('family_members').insert(insertPayload).select().single();
        memberData = retryRes.data;
        memberError = retryRes.error;
      }

      if (memberError) {
        console.error('Supabase member insert error:', memberError);
        return { error: memberError.message };
      }

      // Insert / Update education record in Supabase
      if (input.education_level && input.course_or_standard) {
        try {
          const { data: existingEdu } = await supabase
            .from('education_records')
            .select('id')
            .eq('family_member_id', memberData.id)
            .maybeSingle();

          if (existingEdu) {
            await supabase.from('education_records').update({
              education_level: input.education_level,
              course_or_standard: input.course_or_standard,
              education_status: input.education_status || 'Studying',
              passing_year: input.passing_year || null,
              current_year: input.current_year || null,
              institution: input.institution?.trim() || null,
              updated_at: new Date().toISOString(),
            }).eq('id', existingEdu.id);
          } else {
            await supabase.from('education_records').insert({
              family_member_id: memberData.id,
              education_level: input.education_level,
              course_or_standard: input.course_or_standard,
              education_status: input.education_status || 'Studying',
              passing_year: input.passing_year || null,
              current_year: input.current_year || null,
              institution: input.institution?.trim() || null,
            });
          }
        } catch (eduErr) {
          console.warn('Education record sync error:', eduErr);
        }
      }

      // Insert / Update occupation record in Supabase
      if (input.occupation_type) {
        try {
          const { data: existingOcc } = await supabase
            .from('occupation_records')
            .select('id')
            .eq('family_member_id', memberData.id)
            .maybeSingle();

          const occPayload = mapOccupationFields(input.occupation_type, input.occupation_details);

          if (existingOcc && occPayload) {
            await supabase.from('occupation_records').update({
              ...occPayload,
              updated_at: new Date().toISOString(),
            }).eq('id', existingOcc.id);
          } else if (occPayload) {
            await supabase.from('occupation_records').insert({
              family_member_id: memberData.id,
              ...occPayload,
            });
          }
        } catch (occErr) {
          console.warn('Occupation record sync error:', occErr);
        }
      }

      const memberObj: FamilyMember = {
        ...memberData,
        blood_group: memberData.blood_group || (memberData.occupation_details as any)?.blood_group || null,
        birth_place: memberData.birth_place || (memberData.occupation_details as any)?.birth_place || null,
        dob: formatDate(memberData.dob),
        age: calculateAge(memberData.dob),
        display_relation: getRelationshipDisplay(memberData.relation),
      };

      return {
        member: memberObj,
      };
    } catch (err: any) {
      console.error('addMember error:', err);
      return { error: err?.message || 'Failed to add member' };
    }
  },

  /**
   * Get member by ID directly from Supabase Cloud DB
   */
  async getMemberById(memberId: string): Promise<{
    member?: FamilyMember;
    education?: EducationRecord | null;
    occupation?: OccupationRecord | null;
    error?: string;
  }> {
    if (!isSupabaseConfigured) {
      return { error: 'Database is not configured' };
    }

    try {
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (memberError || !memberData) {
        return { error: 'Member not found' };
      }

      const { data: educationData } = await supabase
        .from('education_records')
        .select('*')
        .eq('family_member_id', memberId)
        .maybeSingle();

      const { data: occupationData } = await supabase
        .from('occupation_records')
        .select('*')
        .eq('family_member_id', memberId)
        .maybeSingle();

      const isDeceased =
        memberData.is_deceased === true ||
        memberData.status === 'DECEASED' ||
        (memberData.occupation_details as any)?.is_deceased === true;
      const deceasedDate =
        memberData.deceased_date ||
        (memberData.occupation_details as any)?.deceased_date ||
        null;
      const bloodGroup = memberData.blood_group || (memberData.occupation_details as any)?.blood_group || null;
      const birthPlace = memberData.birth_place || (memberData.occupation_details as any)?.birth_place || null;
      const memberEmail = memberData.email || (memberData.occupation_details as any)?.email || null;
      const canEdit = memberData.can_edit_family === true || (memberData.occupation_details as any)?.can_edit_family === true || memberData.relation === 'FAMILY_HEAD';

      return {
        member: {
          ...memberData,
          email: memberEmail,
          can_edit_family: canEdit,
          blood_group: bloodGroup,
          birth_place: birthPlace,
          is_deceased: isDeceased,
          deceased_date: deceasedDate,
          age: calculateAge(memberData.dob),
          display_relation: getRelationshipDisplay(memberData.relation),
        },
        education: (educationData as EducationRecord) || null,
        occupation: (occupationData as OccupationRecord) || null,
      };
    } catch (err: any) {
      return { error: err?.message || 'Failed to load member' };
    }
  },

  /**
   * Update existing member
   */
  async updateMember(
    memberId: string,
    updates: Partial<FamilyMember>,
    educationUpdates?: Partial<EducationRecord>,
    occupationUpdates?: Partial<OccupationRecord>
  ): Promise<{ error?: string }> {
    const isDeceased = updates.is_deceased !== undefined
      ? updates.is_deceased
      : ((updates as any).status === 'DECEASED');

    const bloodGroup = updates.blood_group !== undefined ? updates.blood_group : undefined;
    const birthPlace = updates.birth_place !== undefined ? updates.birth_place : undefined;

    const occDetails = {
      ...(updates.occupation_details || {}),
      ...(occupationUpdates?.details || {}),
      is_deceased: isDeceased,
      deceased_date: updates.deceased_date !== undefined ? updates.deceased_date : null,
      ...(bloodGroup !== undefined ? { blood_group: bloodGroup } : {}),
      ...(birthPlace !== undefined ? { birth_place: birthPlace } : {}),
    };

    if (isSupabaseConfigured) {
      try {
        // Strip virtual fields that do not exist as top-level columns in Supabase family_members
        const { is_deceased: _id, deceased_date: _dd, ...cleanUpdates } = updates as any;

        const formattedDob = cleanUpdates.dob ? formatDateForDB(cleanUpdates.dob) : undefined;

        const updatePayload: any = {
          ...cleanUpdates,
          ...(formattedDob ? { dob: formattedDob } : {}),
          education_status: educationUpdates?.education_status || cleanUpdates.education_status,
          occupation_type: occupationUpdates?.occupation_type || cleanUpdates.occupation_type,
          occupation_details: occDetails,
          updated_at: new Date().toISOString(),
        };

        if (bloodGroup !== undefined) updatePayload.blood_group = bloodGroup;
        if (birthPlace !== undefined) updatePayload.birth_place = birthPlace;

        let { error: updateError } = await supabase
          .from('family_members')
          .update(updatePayload)
          .eq('id', memberId);

        if (updateError && (updateError.message?.includes('blood_group') || updateError.message?.includes('birth_place') || updateError.code === 'PGRST204')) {
          delete updatePayload.blood_group;
          delete updatePayload.birth_place;
          const retryRes = await supabase.from('family_members').update(updatePayload).eq('id', memberId);
          updateError = retryRes.error;
        }

        if (updateError) {
          console.error('Supabase updateMember error:', updateError);
          return { error: updateError.message };
        }

        if (educationUpdates && (educationUpdates.education_level || educationUpdates.course_or_standard)) {
          const { data: existingEdu } = await supabase
            .from('education_records')
            .select('id')
            .eq('family_member_id', memberId)
            .maybeSingle();

          if (existingEdu) {
            await supabase
              .from('education_records')
              .update({
                ...educationUpdates,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingEdu.id);
          } else {
            await supabase
              .from('education_records')
              .insert({
                family_member_id: memberId,
                ...educationUpdates,
              });
          }
        }

        if (occupationUpdates && occupationUpdates.occupation_type) {
          const { data: existingOcc } = await supabase
            .from('occupation_records')
            .select('id')
            .eq('family_member_id', memberId)
            .maybeSingle();

          const occPayload = mapOccupationFields(
            occupationUpdates.occupation_type,
            occupationUpdates.details || (occupationUpdates as any)
          );

          if (existingOcc && occPayload) {
            await supabase
              .from('occupation_records')
              .update({
                ...occPayload,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingOcc.id);
          } else if (occPayload) {
            await supabase
              .from('occupation_records')
              .insert({
                family_member_id: memberId,
                ...occPayload,
              });
          }
        }
      } catch (err) {
        console.warn('Supabase member update error:', err);
      }
    }

    return {};
  },

  /**
   * Permanently delete member from DB (and all associated records) and local store
   */
  async deleteMember(memberId: string): Promise<{ error?: string }> {
    if (isSupabaseConfigured) {
      try {
        // Delete related child records explicitly first (in case cascading is not set up on older migrations)
        await supabase.from('education_records').delete().eq('family_member_id', memberId);
        await supabase.from('occupation_records').delete().eq('family_member_id', memberId);
        await supabase.from('family_relationships').delete().or(`from_member_id.eq.${memberId},to_member_id.eq.${memberId}`);

        // Permanently delete the member row from DB
        const { error: delErr } = await supabase
          .from('family_members')
          .delete()
          .eq('id', memberId);

        if (delErr) {
          console.error('Supabase deleteMember error:', delErr);
          return { error: delErr.message };
        }
      } catch (err: any) {
        console.warn('Supabase deleteMember exception:', err);
        return { error: err.message || 'Failed to delete member from database' };
      }
    }

    return {};
  },

  /**
   * Toggle or set edit permission for a family member with their email address
   */
  async toggleEditPermission(
    memberId: string,
    canEdit: boolean,
    email?: string | null
  ): Promise<{ error?: string }> {
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    if (isSupabaseConfigured) {
      try {
        const { data: member } = await supabase
          .from('family_members')
          .select('occupation_details')
          .eq('id', memberId)
          .maybeSingle();

        const occDetails = {
          ...((member?.occupation_details as any) || {}),
          can_edit_family: canEdit,
          ...(email !== undefined ? { email: cleanEmail } : {}),
        };

        const updatePayload: any = {
          can_edit_family: canEdit,
          occupation_details: occDetails,
          updated_at: new Date().toISOString(),
        };
        if (email !== undefined) {
          updatePayload.email = cleanEmail;
        }

        // Try direct column update first
        const { error: directErr } = await supabase
          .from('family_members')
          .update(updatePayload)
          .eq('id', memberId);

        if (directErr) {
          // If column doesn't exist yet on DB, fallback gracefully to storing in occupation_details JSON
          const { error: fallbackErr } = await supabase
            .from('family_members')
            .update({
              occupation_details: occDetails,
              updated_at: new Date().toISOString(),
            })
            .eq('id', memberId);

          if (fallbackErr) {
            console.error('Failed to update member edit permission:', fallbackErr);
            return { error: fallbackErr.message };
          }
        }

        // If permission is granted with an email, pre-register member with Supabase Auth
        // via silent REST signup so Supabase Auth can dispatch password reset OTPs to them
        if (canEdit && cleanEmail) {
          try {
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
            const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
            if (supabaseUrl && supabaseAnonKey) {
              await fetch(`${supabaseUrl}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                  apikey: supabaseAnonKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: cleanEmail,
                  password: 'TempPassword@' + Math.random().toString(36).slice(-8),
                  data: {
                    is_family_member: true,
                    member_id: memberId,
                  },
                }),
              });
            }
          } catch (signupErr) {
            console.warn('Silent member auth registration notice:', signupErr);
          }
        }
      } catch (err: any) {
        console.warn('Supabase toggleEditPermission error:', err);
        return { error: err.message || 'Failed to update permission' };
      }
    }

    return {};
  },

  /**
   * Backward compatibility alias for deleteMember
   */
  async archiveMember(memberId: string): Promise<{ error?: string }> {
    return this.deleteMember(memberId);
  },
};
