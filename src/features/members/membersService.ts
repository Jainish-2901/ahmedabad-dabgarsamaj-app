import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { EducationRecord, FamilyMember, OccupationRecord } from '@/types/database';
import { calculateAge, formatDate, formatDateForDB } from '@/lib/utils/date';
import { getRelationshipDisplay } from '@/constants/relationships';
import { localAppStore, persistAppStore, restoreAppStore } from '@/features/family/familyStore';

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
      status: 'ACTIVE',
      is_deceased: isDeceased,
      deceased_date: input.deceased_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      age: calculateAge(input.dob),
      display_relation: getRelationshipDisplay(input.relation),
    };

    localAppStore.members.push(newMember);

    if (input.education_level && input.course_or_standard) {
      localAppStore.educations.push({
        id: 'edu-' + Date.now(),
        family_member_id: newMemberId,
        education_level: input.education_level,
        course_or_standard: input.course_or_standard,
        education_status: input.education_status || 'Studying',
        passing_year: input.passing_year || null,
        current_year: input.current_year || null,
        institution: input.institution?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (input.occupation_type) {
      localAppStore.occupations.push({
        id: 'occ-' + Date.now(),
        family_member_id: newMemberId,
        occupation_type: input.occupation_type,
        details: occDetails,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    await persistAppStore();

    if (!isSupabaseConfigured) {
      return { member: newMember };
    }

    try {
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: input.family_id,
          name: input.name.trim(),
          gender: input.gender,
          dob: formatDateForDB(input.dob),
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
          status: 'ACTIVE',
        })
        .select()
        .single();

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

      return {
        member: {
          ...memberData,
          dob: formatDate(memberData.dob),
          age: calculateAge(memberData.dob),
          display_relation: getRelationshipDisplay(memberData.relation),
        },
      };
    } catch (err: any) {
      console.error('addMember error:', err);
      return { error: err?.message || 'Failed to add member' };
    }
  },

  /**
   * Get member by ID
   */
  async getMemberById(memberId: string): Promise<{
    member?: FamilyMember;
    education?: EducationRecord | null;
    occupation?: OccupationRecord | null;
    error?: string;
  }> {
    const localMember = localAppStore.members.find((m) => m.id === memberId);
    const localEdu = localAppStore.educations.find((e) => e.family_member_id === memberId);
    const localOcc = localAppStore.occupations.find((o) => o.family_member_id === memberId);

    if (localMember) {
      const isDeceased =
        localMember.is_deceased === true ||
        (localMember as any).status === 'DECEASED' ||
        (localMember.occupation_details as any)?.is_deceased === true;
      const deceasedDate =
        localMember.deceased_date ||
        (localMember.occupation_details as any)?.deceased_date ||
        null;

      return {
        member: {
          ...localMember,
          is_deceased: isDeceased,
          deceased_date: deceasedDate,
          age: calculateAge(localMember.dob),
          display_relation: getRelationshipDisplay(localMember.relation),
        },
        education: localEdu || null,
        occupation: localOcc || null,
      };
    }

    if (!isSupabaseConfigured) {
      return { error: 'Member not found' };
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

      return {
        member: {
          ...memberData,
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

    const occDetails = {
      ...(updates.occupation_details || {}),
      ...(occupationUpdates?.details || {}),
      is_deceased: isDeceased,
      deceased_date: updates.deceased_date !== undefined ? updates.deceased_date : null,
    };

    const idx = localAppStore.members.findIndex((m) => m.id === memberId);
    if (idx >= 0) {
      localAppStore.members[idx] = {
        ...localAppStore.members[idx],
        ...updates,
        is_deceased: isDeceased,
        deceased_date: updates.deceased_date !== undefined ? updates.deceased_date : localAppStore.members[idx].deceased_date,
        status: 'ACTIVE',
        education_status: educationUpdates?.education_status || updates.education_status || localAppStore.members[idx].education_status,
        occupation_type: occupationUpdates?.occupation_type || updates.occupation_type || localAppStore.members[idx].occupation_type,
        occupation_details: occDetails,
        age: updates.dob ? calculateAge(updates.dob) : localAppStore.members[idx].age,
        display_relation: updates.relation
          ? getRelationshipDisplay(updates.relation)
          : localAppStore.members[idx].display_relation,
      };

      // Sync Education Record
      if (educationUpdates) {
        const eduIdx = localAppStore.educations.findIndex((e) => e.family_member_id === memberId);
        if (eduIdx >= 0) {
          localAppStore.educations[eduIdx] = {
            ...localAppStore.educations[eduIdx],
            ...educationUpdates,
          };
        } else {
          localAppStore.educations.push({
            id: 'edu-' + Date.now(),
            family_member_id: memberId,
            education_level: educationUpdates.education_level || 'Other',
            course_or_standard: educationUpdates.course_or_standard || 'General',
            education_status: educationUpdates.education_status || 'Completed',
            passing_year: educationUpdates.passing_year || null,
            current_year: educationUpdates.current_year || null,
            institution: educationUpdates.institution || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      // Sync Occupation Record
      if (occupationUpdates) {
        const occIdx = localAppStore.occupations.findIndex((o) => o.family_member_id === memberId);
        if (occIdx >= 0) {
          localAppStore.occupations[occIdx] = {
            ...localAppStore.occupations[occIdx],
            ...occupationUpdates,
          };
        } else {
          localAppStore.occupations.push({
            id: 'occ-' + Date.now(),
            family_member_id: memberId,
            occupation_type: occupationUpdates.occupation_type || 'OTHER',
            details: occupationUpdates.details || {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      await persistAppStore();
    }

    if (isSupabaseConfigured) {
      try {
        // Strip virtual fields that do not exist as top-level columns in Supabase family_members
        const { is_deceased: _id, deceased_date: _dd, ...cleanUpdates } = updates as any;

        const { error: updateError } = await supabase
          .from('family_members')
          .update({
            ...cleanUpdates,
            education_status: educationUpdates?.education_status || cleanUpdates.education_status,
            occupation_type: occupationUpdates?.occupation_type || cleanUpdates.occupation_type,
            occupation_details: occDetails,
            updated_at: new Date().toISOString(),
          })
          .eq('id', memberId);

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
   * Soft archive member (Section 42)
   */
  async archiveMember(memberId: string): Promise<{ error?: string }> {
    const idx = localAppStore.members.findIndex((m) => m.id === memberId);
    if (idx >= 0) {
      localAppStore.members[idx].status = 'ARCHIVED';
      await persistAppStore();
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('family_members')
          .update({ status: 'ARCHIVED' })
          .eq('id', memberId);
      } catch {}
    }

    return {};
  },
};
