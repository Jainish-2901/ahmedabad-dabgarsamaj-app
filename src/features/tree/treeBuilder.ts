import { FamilyMember, FamilyRelationship } from '@/types/database';

export interface TreePersonNode {
  member: FamilyMember;
  spouse?: FamilyMember;
  children: TreePersonNode[];
  generationLevel: number; // 0: Grandparents, 1: Head generation, 2: Children, etc.
}

export interface TreeDataStructure {
  rootUnits: TreePersonNode[];
  allMembersCount: number;
}

export function buildFamilyTree(
  members: FamilyMember[],
  relationships: FamilyRelationship[]
): TreeDataStructure {
  if (!members || members.length === 0) {
    return { rootUnits: [], allMembersCount: 0 };
  }

  // Active members only
  const activeMembers = members.filter((m) => m.status === 'ACTIVE');
  const memberMap = new Map<string, FamilyMember>();
  activeMembers.forEach((m) => memberMap.set(m.id, m));

  // Build Spouse Pairs Map
  const spouseMap = new Map<string, string>();
  relationships
    .filter((r) => r.relationship_type === 'SPOUSE')
    .forEach((r) => {
      spouseMap.set(r.from_member_id, r.to_member_id);
      spouseMap.set(r.to_member_id, r.from_member_id);
    });

  // Build Parent -> Children Map
  const parentChildrenMap = new Map<string, string[]>();
  relationships
    .filter((r) => r.relationship_type === 'PARENT')
    .forEach((r) => {
      const existing = parentChildrenMap.get(r.from_member_id) || [];
      if (!existing.includes(r.to_member_id)) {
        existing.push(r.to_member_id);
      }
      parentChildrenMap.set(r.from_member_id, existing);
    });

  // Track members already rendered in a couple
  const processedMembers = new Set<string>();

  // Determine generational placement:
  // Level 0: Grandparents (PATERNAL_GRANDFATHER, PATERNAL_GRANDMOTHER, FATHER, MOTHER if elder)
  // Level 1: Family Head, Spouse, Siblings, Brother's Wife
  // Level 2: Children (SON, DAUGHTER, BROTHER_SON, etc.)
  // Level 3: Grandchildren

  const getMemberGeneration = (m: FamilyMember): number => {
    switch (m.relation) {
      case 'PATERNAL_GRANDFATHER':
      case 'PATERNAL_GRANDMOTHER':
      case 'MATERNAL_GRANDFATHER':
      case 'MATERNAL_GRANDMOTHER':
        return 0;
      case 'FATHER':
      case 'MOTHER':
      case 'PATERNAL_UNCLE':
      case 'PATERNAL_AUNT':
      case 'MATERNAL_UNCLE':
      case 'MATERNAL_AUNT':
      case 'FATHER_S_SISTER':
      case 'MOTHER_S_SISTER':
        return 1;
      case 'FAMILY_HEAD':
      case 'HUSBAND':
      case 'WIFE':
      case 'BROTHER':
      case 'SISTER':
      case 'ELDER_BROTHER':
      case 'YOUNGER_BROTHER':
      case 'ELDER_SISTER':
      case 'YOUNGER_SISTER':
      case 'BROTHER_WIFE':
      case 'SISTER_HUSBAND':
      case 'JETH':
      case 'JETHANI':
      case 'DEVAR':
      case 'DEVARANI':
        return 2;
      case 'SON':
      case 'DAUGHTER':
      case 'SON_WIFE':
      case 'DAUGHTER_HUSBAND':
      case 'BROTHER_SON':
      case 'BROTHER_DAUGHTER':
      case 'SISTER_SON':
      case 'SISTER_DAUGHTER':
        return 3;
      default:
        return 2;
    }
  };

  // Find explicit or inferred spouse
  const findSpouse = (member: FamilyMember): FamilyMember | undefined => {
    // 1. Check explicit relationship link
    const explicitSpouseId = spouseMap.get(member.id);
    if (explicitSpouseId && memberMap.has(explicitSpouseId)) {
      return memberMap.get(explicitSpouseId);
    }

    // 2. Inferred spouse fallback (Section 59: Incomplete data)
    if (member.relation === 'FAMILY_HEAD') {
      const spouse = activeMembers.find(
        (m) => (m.relation === 'WIFE' || m.relation === 'HUSBAND') && !processedMembers.has(m.id)
      );
      if (spouse) return spouse;
    }
    if (member.relation === 'FATHER') {
      const mother = activeMembers.find((m) => m.relation === 'MOTHER' && !processedMembers.has(m.id));
      if (mother) return mother;
    }
    if (member.relation === 'PATERNAL_GRANDFATHER') {
      const grandma = activeMembers.find(
        (m) => m.relation === 'PATERNAL_GRANDMOTHER' && !processedMembers.has(m.id)
      );
      if (grandma) return grandma;
    }

    return undefined;
  };

  // Find explicit or inferred children
  const findChildren = (
    member: FamilyMember,
    spouse?: FamilyMember,
    currentGen: number = 2
  ): TreePersonNode[] => {
    const childIds = new Set<string>();

    // 1. Explicit links from member or spouse
    const fromMember = parentChildrenMap.get(member.id) || [];
    fromMember.forEach((id) => childIds.add(id));

    if (spouse) {
      const fromSpouse = parentChildrenMap.get(spouse.id) || [];
      fromSpouse.forEach((id) => childIds.add(id));
    }

    // 2. Inferred children fallback for Family Head
    if (childIds.size === 0 && member.relation === 'FAMILY_HEAD') {
      activeMembers
        .filter(
          (m) =>
            (m.relation === 'SON' || m.relation === 'DAUGHTER') &&
            !processedMembers.has(m.id)
        )
        .forEach((m) => childIds.add(m.id));
    }

    // Inferred children fallback for Father/Mother
    if (childIds.size === 0 && (member.relation === 'FATHER' || member.relation === 'MOTHER')) {
      activeMembers
        .filter((m) => m.relation === 'FAMILY_HEAD' && !processedMembers.has(m.id))
        .forEach((m) => childIds.add(m.id));
    }

    const childrenNodes: TreePersonNode[] = [];

    Array.from(childIds).forEach((cId) => {
      const childMember = memberMap.get(cId);
      if (!childMember || processedMembers.has(childMember.id)) return;

      processedMembers.add(childMember.id);
      const childSpouse = findSpouse(childMember);
      if (childSpouse) processedMembers.add(childSpouse.id);

      const grandChildren = findChildren(childMember, childSpouse, currentGen + 1);

      childrenNodes.push({
        member: childMember,
        spouse: childSpouse,
        children: grandChildren,
        generationLevel: currentGen + 1,
      });
    });

    return childrenNodes;
  };

  // Build root generational nodes
  // Sort members by generation level
  const sortedMembers = [...activeMembers].sort(
    (a, b) => getMemberGeneration(a) - getMemberGeneration(b)
  );

  // Identify which members have existing parents in this tree
  const hasParentInTree = (memberId: string): boolean => {
    for (const [parentId, childIds] of parentChildrenMap.entries()) {
      if (childIds.includes(memberId) && memberMap.has(parentId)) {
        return true;
      }
    }
    return false;
  };

  const rootUnits: TreePersonNode[] = [];

  sortedMembers.forEach((m) => {
    if (processedMembers.has(m.id)) return;
    // If this member already has a parent in the tree, they will be rendered under their parent
    if (hasParentInTree(m.id)) return;

    processedMembers.add(m.id);
    const spouse = findSpouse(m);
    if (spouse) processedMembers.add(spouse.id);

    const genLevel = getMemberGeneration(m);
    const children = findChildren(m, spouse, genLevel);

    rootUnits.push({
      member: m,
      spouse,
      children,
      generationLevel: genLevel,
    });
  });

  return {
    rootUnits,
    allMembersCount: activeMembers.length,
  };
}
