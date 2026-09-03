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
          .select('*, area:areas(*)')
          .eq('status', 'ACTIVE')
          .order('family_code', { ascending: true });

        if (filterAreaId && filterAreaId !== 'all') {
          familyQuery = familyQuery.eq('area_id', filterAreaId);
        }

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

          const member: FamilyMember = {
            ...m,
            is_deceased: isDeceased,
            deceased_date: deceasedDate,
            age: calculateAge(m.dob),
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
            const headMatch = item.headMember ? item.headMember.name.toLowerCase().includes(query) : false;
            const anyMemberMatch = item.members.some(
              (m) =>
                m.name.toLowerCase().includes(query) ||
                (m.mobile && m.mobile.includes(query)) ||
                (m.education_status && m.education_status.toLowerCase().includes(query)) ||
                (m.occupation_type && m.occupation_type.toLowerCase().includes(query))
            );
            return famCodeMatch || addressMatch || cityMatch || areaMatch || headMatch || anyMemberMatch;
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
        const headMatch = item.headMember ? item.headMember.name.toLowerCase().includes(query) : false;
        const memberMatch = item.members.some((m) => m.name.toLowerCase().includes(query));
        return famCodeMatch || headMatch || memberMatch;
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
