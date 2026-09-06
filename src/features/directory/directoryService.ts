import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { localAppStore } from '@/features/family/familyStore';
import { Family, FamilyMember, Area } from '@/types/database';
import { calculateAge, formatDate } from '@/lib/utils/date';
import { getRelationshipDisplay } from '@/constants/relationships';

export interface CommunityFamilyBookletItem {
  family: Family;
  headMember: FamilyMember | null;
  members: FamilyMember[];
  membersCount: number;
}

export interface CommunityStats {
  totalFamilies: number;
  totalMembers: number;
  areaBreakdown: { areaName: string; count: number }[];
  occupationBreakdown: { type: string; count: number }[];
}

/**
 * Comprehensive match helper checking all member fields
 */
export function matchesMemberQuery(m: FamilyMember, query: string): boolean {
  if (!query) return false;
  const q = query.trim().toLowerCase();
  const qCompact = q.replace(/\s+/g, '');

  // 1. Name & Mobile
  if (m.name && m.name.toLowerCase().includes(q)) return true;
  if (m.mobile && m.mobile.includes(qCompact)) return true;

  // 2. Blood Group (match normalized with/without spaces, e.g. "b+", "b +", "O-")
  if (m.blood_group) {
    const bg = m.blood_group.toLowerCase();
    const bgCompact = bg.replace(/\s+/g, '');
    if (bgCompact.includes(qCompact) || bg.includes(q)) return true;
  }

  // 3. Birth Place / Native Place
  if (m.birth_place && m.birth_place.toLowerCase().includes(q)) return true;

  // 4. Relation & Display Relation
  if (m.relation && m.relation.toLowerCase().includes(q)) return true;
  if (m.display_relation && m.display_relation.toLowerCase().includes(q)) return true;

  // 5. Education (level, course/standard, institution, status)
  if (m.education_status && m.education_status.toLowerCase().includes(q)) return true;
  if (m.educationRecord) {
    const edu = m.educationRecord;
    if (edu.course_or_standard && edu.course_or_standard.toLowerCase().includes(q)) return true;
    if (edu.education_level && edu.education_level.toLowerCase().includes(q)) return true;
    if (edu.institution && edu.institution.toLowerCase().includes(q)) return true;
    if (edu.education_status && edu.education_status.toLowerCase().includes(q)) return true;
  }

  // 6. Occupation (type, company/business, designation, work location, details)
  if (m.occupation_type && m.occupation_type.toLowerCase().includes(q)) return true;
  if (m.occupationRecord) {
    const occ = m.occupationRecord;
    if (occ.organization_name && occ.organization_name.toLowerCase().includes(q)) return true;
    if (occ.designation && occ.designation.toLowerCase().includes(q)) return true;
    if (occ.business_name && occ.business_name.toLowerCase().includes(q)) return true;
    if (occ.business_type && occ.business_type.toLowerCase().includes(q)) return true;
    if (occ.work_location && occ.work_location.toLowerCase().includes(q)) return true;
  }
  if (m.occupation_details) {
    const detailsStr = JSON.stringify(m.occupation_details).toLowerCase();
    if (detailsStr.includes(q)) return true;
  }

  // 7. Residence / Separate address & city
  if (m.separate_address && m.separate_address.toLowerCase().includes(q)) return true;
  if (m.separate_city && m.separate_city.toLowerCase().includes(q)) return true;

  return false;
}

/**
 * Returns a short label describing which field matched the query
 */
export function getMemberMatchHighlight(m: FamilyMember, query: string): string | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  const qCompact = q.replace(/\s+/g, '');

  if (m.blood_group) {
    const bgCompact = m.blood_group.toLowerCase().replace(/\s+/g, '');
    if (bgCompact.includes(qCompact) || m.blood_group.toLowerCase().includes(q)) {
      return `🩸 બ્લડ ગ્રૂપ: ${m.blood_group}`;
    }
  }

  if (m.birth_place && m.birth_place.toLowerCase().includes(q)) {
    return `🏛️ જન્મ સ્થળ: ${m.birth_place}`;
  }

  if (m.mobile && m.mobile.includes(qCompact)) {
    return `📞 ${m.mobile}`;
  }

  if (m.educationRecord?.course_or_standard && m.educationRecord.course_or_standard.toLowerCase().includes(q)) {
    return `🎓 ${m.educationRecord.course_or_standard}`;
  }
  if (m.education_status && m.education_status.toLowerCase().includes(q)) {
    return `🎓 ${m.education_status}`;
  }

  if (m.occupationRecord?.designation && m.occupationRecord.designation.toLowerCase().includes(q)) {
    return `💼 ${m.occupationRecord.designation}`;
  }
  if (m.occupationRecord?.organization_name && m.occupationRecord.organization_name.toLowerCase().includes(q)) {
    return `🏢 ${m.occupationRecord.organization_name}`;
  }
  if (m.occupationRecord?.business_name && m.occupationRecord.business_name.toLowerCase().includes(q)) {
    return `🏢 ${m.occupationRecord.business_name}`;
  }
  if (m.occupation_type && m.occupation_type.toLowerCase().includes(q)) {
    return `💼 ${m.occupation_type}`;
  }

  if (m.separate_city && m.separate_city.toLowerCase().includes(q)) {
    return `📍 ${m.separate_city}`;
  }

  if (m.name && m.name.toLowerCase().includes(q)) {
    return `👤 ${m.name}`;
  }

  return null;
}

export const directoryService = {
  /**
   * Fetch all active community families with their member lists for the directory booklet
   */
  async getAllCommunityFamilies(params?: {
    searchQuery?: string;
    areaId?: string;
    occupationType?: string;
  }): Promise<{ data: CommunityFamilyBookletItem[]; error?: string }> {
    const query = params?.searchQuery?.trim().toLowerCase() || '';
    const filterAreaId = params?.areaId;
    const filterOccupation = params?.occupationType;

    if (isSupabaseConfigured) {
      try {
        // 1. Query all active families
        let familyQuery = supabase
          .from('families')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('family_code', { ascending: true });

        const { data: familiesData, error: famErr } = await familyQuery;
        if (famErr) {
          console.warn('Directory families fetch error:', famErr);
          return { data: this.getOfflineFamilies(query, filterAreaId, filterOccupation) };
        }

        if (!familiesData || familiesData.length === 0) {
          return { data: [] };
        }

        const familyIds = familiesData.map((f: any) => f.id);

        // 2. Query all active & late members for these families
        const { data: membersData, error: memErr } = await supabase
          .from('family_members')
          .select('*')
          .in('family_id', familyIds)
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: true });

        if (memErr) {
          console.warn('Directory members fetch error:', memErr);
          return { data: this.getOfflineFamilies(query, filterAreaId, filterOccupation) };
        }

        // 3. Query all education & occupation records
        const memberIds = (membersData || []).map((m: any) => m.id);
        const { data: eduData } = await supabase
          .from('education_records')
          .select('*')
          .in('family_member_id', memberIds);

        const { data: occData } = await supabase
          .from('occupation_records')
          .select('*')
          .in('family_member_id', memberIds);

        const eduMap = new Map<string, any>();
        (eduData || []).forEach((e: any) => eduMap.set(e.family_member_id, e));

        const occMap = new Map<string, any>();
        (occData || []).forEach((o: any) => occMap.set(o.family_member_id, o));

        // Group members by family_id
        const membersByFamily = new Map<string, FamilyMember[]>();
        (membersData || []).forEach((m: any) => {
          const edu = eduMap.get(m.id);
          const occ = occMap.get(m.id);
          const isDeceased =
            m.is_deceased === true ||
            m.status === 'DECEASED' ||
            m.occupation_details?.is_deceased === true;
          const deceasedDate =
            m.deceased_date ||
            m.occupation_details?.deceased_date ||
            null;

          const bloodGroup = m.blood_group || m.occupation_details?.blood_group || null;
          const birthPlace = m.birth_place || m.occupation_details?.birth_place || null;

          const member: FamilyMember = {
            ...m,
            blood_group: bloodGroup,
            birth_place: birthPlace,
            is_deceased: isDeceased,
            deceased_date: deceasedDate,
            age: calculateAge(m.dob, isDeceased ? deceasedDate : null),
            dob: formatDate(m.dob),
            display_relation: getRelationshipDisplay(m.relation),
            education_status: edu?.course_or_standard || m.education_status,
            occupation_type: occ?.occupation_type || m.occupation_type,
            occupation_details: occ?.details || m.occupation_details || {},
            educationRecord: edu || null,
            occupationRecord: occ || null,
          };

          const list = membersByFamily.get(m.family_id) || [];
          list.push(member);
          membersByFamily.set(m.family_id, list);
        });

        // 4. Assemble Booklet Items
        let bookletItems: CommunityFamilyBookletItem[] = familiesData.map((f: any) => {
          const members = membersByFamily.get(f.id) || [];
          const head = members.find((m) => m.relation === 'FAMILY_HEAD') || members[0] || null;
          const family: Family = {
            ...f,
            members_count: members.length,
          };
          return {
            family,
            headMember: head,
            members,
            membersCount: members.length,
          };
        });

        // 5. Apply Client-side Search and Occupation filter
        if (query) {
          bookletItems = bookletItems.filter((item) => {
            const famCodeMatch = item.family.family_code.toLowerCase().includes(query);
            const addressMatch = (item.family.address || '').toLowerCase().includes(query);
            const cityMatch = (item.family.city || '').toLowerCase().includes(query);
            const areaMatch = (item.family.area?.name || '').toLowerCase().includes(query);
            const anyMemberMatch = item.members.some((m) => matchesMemberQuery(m, query));
            return famCodeMatch || addressMatch || cityMatch || areaMatch || anyMemberMatch;
          });
        }

        if (filterOccupation && filterOccupation !== 'all') {
          bookletItems = bookletItems.filter((item) =>
            item.members.some((m) => m.occupation_type === filterOccupation)
          );
        }

        return { data: bookletItems };
      } catch (err: any) {
        console.warn('Supabase directory fetch error:', err);
        return { data: this.getOfflineFamilies(query, filterAreaId, filterOccupation) };
      }
    }

    return { data: this.getOfflineFamilies(query, filterAreaId, filterOccupation) };
  },

  /**
   * Offline / Local fallback directory data
   */
  getOfflineFamilies(query: string, filterAreaId?: string, filterOccupation?: string): CommunityFamilyBookletItem[] {
    const curFam = localAppStore.currentFamily;
    if (!curFam) return [];

    const members = localAppStore.members;
    const head = members.find((m) => m.relation === 'FAMILY_HEAD') || members[0] || null;

    let items: CommunityFamilyBookletItem[] = [
      {
        family: curFam,
        headMember: head,
        members,
        membersCount: members.length,
      },
    ];

    if (query) {
      items = items.filter((item) => {
        const famCodeMatch = item.family.family_code.toLowerCase().includes(query);
        const addressMatch = (item.family.address || '').toLowerCase().includes(query);
        const cityMatch = (item.family.city || '').toLowerCase().includes(query);
        const areaMatch = (item.family.area?.name || '').toLowerCase().includes(query);
        const anyMemberMatch = item.members.some((m) => matchesMemberQuery(m, query));
        return famCodeMatch || addressMatch || cityMatch || areaMatch || anyMemberMatch;
      });
    }

    return items;
  },

  /**
   * Fetch aggregate community stats for the directory header banner
   */
  async getCommunityStats(): Promise<CommunityStats> {
    const res = await this.getAllCommunityFamilies();
    const families = res.data;

    let totalMembers = 0;
    const areaMap = new Map<string, number>();
    const occMap = new Map<string, number>();

    families.forEach((item) => {
      totalMembers += item.membersCount;
      const areaName = item.family.area?.name || item.family.city || 'Other Area';
      areaMap.set(areaName, (areaMap.get(areaName) || 0) + 1);

      item.members.forEach((m) => {
        if (m.occupation_type) {
          occMap.set(m.occupation_type, (occMap.get(m.occupation_type) || 0) + 1);
        }
      });
    });

    const areaBreakdown = Array.from(areaMap.entries()).map(([areaName, count]) => ({
      areaName,
      count,
    }));

    const occupationBreakdown = Array.from(occMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    return {
      totalFamilies: families.length,
      totalMembers,
      areaBreakdown,
      occupationBreakdown,
    };
  },
};
