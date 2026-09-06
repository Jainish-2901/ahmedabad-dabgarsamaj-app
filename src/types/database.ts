export type UserRole = 'FAMILY_HEAD' | 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR';

export type RecordStatus = 'ACTIVE' | 'ARCHIVED';

export type Gender = 'Male' | 'Female';

export type ResidenceType = 'SAME_AS_FAMILY' | 'SEPARATE';

export interface Profile {
  id: string;
  auth_user_id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  name: string;
  city: string;
  state: string;
  status: RecordStatus;
  created_at: string;
}

export interface Family {
  id: string;
  family_code: string; // e.g. FAM-000123
  head_user_id: string;
  address: string;
  area_id: string | null;
  city: string;
  state: string;
  pincode: string;
  status: RecordStatus;
  notes?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  area?: Area | null;
  members_count?: number;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  name: string;
  photo_url: string | null;
  gender: Gender;
  mobile: string | null;
  email?: string | null;
  dob?: string | null; // YYYY-MM-DD (DOB is source of truth; age calculated dynamically. Optional for deceased members)
  relation: string; // RelationshipCode (e.g. 'FAMILY_HEAD', 'FATHER', 'BROTHER_WIFE')
  residence_type: ResidenceType;
  separate_address?: string | null;
  separate_area_id?: string | null;
  separate_city?: string | null;
  separate_state?: string | null;
  separate_pincode?: string | null;
  education_status?: string | null;
  occupation_type?: string | null;
  occupation_details?: Record<string, any> | null;
  status: RecordStatus;
  blood_group?: string | null;
  birth_place?: string | null;
  can_edit_family?: boolean;
  is_deceased?: boolean;
  deceased_date?: string | null;
  created_at: string;
  updated_at: string;
  // Virtual / Computed fields
  age?: number;
  display_relation?: string;
  educationRecord?: any;
  occupationRecord?: any;
}

export type DirectRelationshipType = 'SPOUSE' | 'PARENT' | 'CHILD' | 'SIBLING' | 'OTHER';

export interface FamilyRelationship {
  id: string;
  family_id: string;
  from_member_id: string;
  to_member_id: string;
  relationship_type: DirectRelationshipType;
  created_at: string;
}

export interface EducationRecord {
  id: string;
  family_member_id: string;
  education_level: string; // 'School' | 'College' | 'Post-Graduate' | 'Diploma' | 'Other'
  course_or_standard: string; // 'Standard 10', 'BCA', etc.
  education_status: 'Studying' | 'Completed' | 'Dropped' | 'Discontinued' | 'Other';
  current_year?: string | null; // e.g. '2nd Year'
  passing_year?: number | null; // e.g. 2024
  institution?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OccupationRecord {
  id: string;
  family_member_id: string;
  occupation_type: string;
  organization_name?: string | null;
  designation?: string | null;
  business_name?: string | null;
  business_type?: string | null;
  work_location?: string | null;
  experience_years?: number | null;
  details?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, any> | null;
  created_at: string;
}
