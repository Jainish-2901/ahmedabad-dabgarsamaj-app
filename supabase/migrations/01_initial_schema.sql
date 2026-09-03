-- ============================================================================
-- COMMUNITY FAMILY CENSUS & DIGITAL DIRECTORY
-- Initial PostgreSQL / Supabase Schema & Row-Level Security Policies
-- Following 02_Community_Family_System_Flow_Design.md Specification
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('FAMILY_HEAD', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE record_status AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE
-- Stores user role and metadata linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'FAMILY_HEAD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. AREAS TABLE
-- Standardized areas for consistent filtering, statistics, and dropdowns (Section 40)
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Ahmedabad',
    state TEXT NOT NULL DEFAULT 'Gujarat',
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. FAMILY CODE SEQUENCE
CREATE SEQUENCE IF NOT EXISTS public.family_code_seq START WITH 101;

CREATE OR REPLACE FUNCTION public.generate_family_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'FAM-' || LPAD(nextval('public.family_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 6. FAMILIES TABLE
-- Primary organizational unit (Section 7)
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_code TEXT NOT NULL UNIQUE DEFAULT public.generate_family_code(),
    head_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    address TEXT NOT NULL,
    area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
    city TEXT NOT NULL DEFAULT 'Ahmedabad',
    state TEXT NOT NULL DEFAULT 'Gujarat',
    pincode TEXT NOT NULL,
    status record_status NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. FAMILY MEMBERS TABLE
-- Family head is also a member here (Section 6 & 8)
-- DOB is the single source of truth for age (Section 9)
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    photo_url TEXT,
    gender TEXT NOT NULL, -- 'Male', 'Female', 'Other', 'Prefer not to say'
    mobile TEXT,
    dob DATE NOT NULL,
    relation TEXT NOT NULL, -- Standard code, e.g., 'FAMILY_HEAD', 'FATHER', 'BROTHER_WIFE'
    residence_type TEXT NOT NULL DEFAULT 'SAME_AS_FAMILY', -- 'SAME_AS_FAMILY' or 'SEPARATE'
    separate_address TEXT,
    separate_area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
    separate_city TEXT,
    separate_state TEXT,
    separate_pincode TEXT,
    education_status TEXT,
    occupation_type TEXT,
    occupation_details JSONB DEFAULT '{}'::jsonb,
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. FAMILY RELATIONSHIPS TABLE
-- Explicit relationship graph for accurate family tree rendering (Sections 13, 14, 15)
CREATE TABLE IF NOT EXISTS public.family_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    from_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    to_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- 'SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'OTHER'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_no_self_rel CHECK (from_member_id <> to_member_id),
    CONSTRAINT uq_family_rel UNIQUE (from_member_id, to_member_id, relationship_type)
);

-- 9. EDUCATION RECORDS TABLE (Section 39)
CREATE TABLE IF NOT EXISTS public.education_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    education_level TEXT NOT NULL, -- 'School', 'College', 'Diploma', etc.
    course_or_standard TEXT NOT NULL, -- 'Standard 10', 'BCA', etc.
    education_status TEXT NOT NULL DEFAULT 'Studying', -- 'Studying', 'Completed', 'Discontinued'
    current_year TEXT,
    passing_year INT,
    institution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. OCCUPATION RECORDS TABLE (Section 39)
CREATE TABLE IF NOT EXISTS public.occupation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    occupation_type TEXT NOT NULL, -- 'STUDENT', 'EMPLOYEE', 'BUSINESS_OWNER', etc.
    organization_name TEXT,
    designation TEXT,
    business_name TEXT,
    business_type TEXT,
    work_location TEXT,
    experience_years INT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. AUDIT LOGS TABLE (Section 41)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 12. PERFORMANCE INDEXES (Section 61)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_families_head_user ON public.families(head_user_id);
CREATE INDEX IF NOT EXISTS idx_families_area ON public.families(area_id);
CREATE INDEX IF NOT EXISTS idx_families_code ON public.families(family_code);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_name ON public.family_members(name);
CREATE INDEX IF NOT EXISTS idx_family_members_dob ON public.family_members(dob);
CREATE INDEX IF NOT EXISTS idx_family_members_relation ON public.family_members(relation);
CREATE INDEX IF NOT EXISTS idx_family_members_status ON public.family_members(status);
CREATE INDEX IF NOT EXISTS idx_family_relationships_family ON public.family_relationships(family_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_from ON public.family_relationships(from_member_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_to ON public.family_relationships(to_member_id);
CREATE INDEX IF NOT EXISTS idx_education_member ON public.education_records(family_member_id);
CREATE INDEX IF NOT EXISTS idx_occupation_member ON public.occupation_records(family_member_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);

-- ============================================================================
-- 13. AUTOMATIC TRIGGERS (Updated timestamp & New user profile creation)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_families_updated_at ON public.families;
CREATE TRIGGER set_families_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_family_members_updated_at ON public.family_members;
CREATE TRIGGER set_family_members_updated_at BEFORE UPDATE ON public.family_members FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to auto-create profile row on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (auth_user_id, email, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.phone,
        'FAMILY_HEAD'
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- 14. ROW LEVEL SECURITY (RLS) - Mandatory (Section 37 & 74)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_user_id = auth.uid()
        AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin());

-- AREAS POLICIES
CREATE POLICY "Anyone authenticated can view active areas"
    ON public.areas FOR SELECT
    TO authenticated
    USING (status = 'ACTIVE' OR public.is_admin());

CREATE POLICY "Admins can manage areas"
    ON public.areas FOR ALL
    TO authenticated
    USING (public.is_admin());

-- FAMILIES POLICIES
-- Family Head can view and update their own family; Admin can manage all
CREATE POLICY "Family Head can view own family"
    ON public.families FOR SELECT
    TO authenticated
    USING (head_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Family Head can insert own family"
    ON public.families FOR INSERT
    TO authenticated
    WITH CHECK (head_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Family Head can update own family"
    ON public.families FOR UPDATE
    TO authenticated
    USING (head_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admin can delete or archive family"
    ON public.families FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- FAMILY MEMBERS POLICIES
-- Accessible if member belongs to user's family or if user is admin
CREATE POLICY "Family Head can view own members"
    ON public.family_members FOR SELECT
    TO authenticated
    USING (
        family_id IN (SELECT id FROM public.families WHERE head_user_id = auth.uid())
        OR public.is_admin()
    );

CREATE POLICY "Family Head can insert own members"
    ON public.family_members FOR INSERT
    TO authenticated
    WITH CHECK (
        family_id IN (SELECT id FROM public.families WHERE head_user_id = auth.uid())
        OR public.is_admin()
    );

CREATE POLICY "Family Head can update own members"
    ON public.family_members FOR UPDATE
    TO authenticated
    USING (
        family_id IN (SELECT id FROM public.families WHERE head_user_id = auth.uid())
        OR public.is_admin()
    );

CREATE POLICY "Family Head can delete own members"
    ON public.family_members FOR DELETE
    TO authenticated
    USING (
        family_id IN (SELECT id FROM public.families WHERE head_user_id = auth.uid())
        OR public.is_admin()
    );

-- FAMILY RELATIONSHIPS POLICIES
CREATE POLICY "Family Head can view own relationships"
    ON public.family_relationships FOR SELECT
    TO authenticated
    USING (
        family_id IN (SELECT id FROM public.families WHERE head_user_id = auth.uid())
        OR public.is_admin()
    );

CREATE POLICY "Family Head can manage own relationships"
    ON public.family_relationships FOR ALL
    TO authenticated
    USING (
        family_id IN (SELECT id FROM public.families WHERE head_user_id = auth.uid())
        OR public.is_admin()
    );

-- EDUCATION & OCCUPATION POLICIES
CREATE POLICY "Users can view education of own family"
    ON public.education_records FOR SELECT
    TO authenticated
    USING (
        family_member_id IN (
            SELECT fm.id FROM public.family_members fm
            JOIN public.families f ON fm.family_id = f.id
            WHERE f.head_user_id = auth.uid()
        )
        OR public.is_admin()
    );

CREATE POLICY "Users can manage education of own family"
    ON public.education_records FOR ALL
    TO authenticated
    USING (
        family_member_id IN (
            SELECT fm.id FROM public.family_members fm
            JOIN public.families f ON fm.family_id = f.id
            WHERE f.head_user_id = auth.uid()
        )
        OR public.is_admin()
    );

CREATE POLICY "Users can view occupation of own family"
    ON public.occupation_records FOR SELECT
    TO authenticated
    USING (
        family_member_id IN (
            SELECT fm.id FROM public.family_members fm
            JOIN public.families f ON fm.family_id = f.id
            WHERE f.head_user_id = auth.uid()
        )
        OR public.is_admin()
    );

CREATE POLICY "Users can manage occupation of own family"
    ON public.occupation_records FOR ALL
    TO authenticated
    USING (
        family_member_id IN (
            SELECT fm.id FROM public.family_members fm
            JOIN public.families f ON fm.family_id = f.id
            WHERE f.head_user_id = auth.uid()
        )
        OR public.is_admin()
    );

-- AUDIT LOGS POLICIES
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Authenticated users can create audit log records"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================================================
-- 15. INITIAL SEED DATA (Areas)
-- ============================================================================
INSERT INTO public.areas (name, city, state) VALUES
('Kalupur', 'Ahmedabad', 'Gujarat'),
('Shahpur', 'Ahmedabad', 'Gujarat'),
('Jamalpur', 'Ahmedabad', 'Gujarat'),
('Gheekanta', 'Ahmedabad', 'Gujarat'),
('Dabgarvad', 'Ahmedabad', 'Gujarat'),
('Saraspur', 'Ahmedabad', 'Gujarat'),
('Asarwa', 'Ahmedabad', 'Gujarat'),
('Rakhial', 'Ahmedabad', 'Gujarat'),
('Nikol', 'Ahmedabad', 'Gujarat'),
('Naroda', 'Ahmedabad', 'Gujarat'),
('Bapunagar', 'Ahmedabad', 'Gujarat'),
('Odhav', 'Ahmedabad', 'Gujarat'),
('Vastral', 'Ahmedabad', 'Gujarat'),
('Maninagar', 'Ahmedabad', 'Gujarat'),
('Ghatlodia', 'Ahmedabad', 'Gujarat'),
('Chandkheda', 'Ahmedabad', 'Gujarat'),
('Satellite', 'Ahmedabad', 'Gujarat'),
('Prahladnagar', 'Ahmedabad', 'Gujarat'),
('Gota', 'Ahmedabad', 'Gujarat'),
('Ranip', 'Ahmedabad', 'Gujarat'),
('Sabarmati', 'Ahmedabad', 'Gujarat'),
('Gandhinagar', 'Gandhinagar', 'Gujarat'),
('Surat', 'Surat', 'Gujarat'),
('Vadodara', 'Vadodara', 'Gujarat'),
('Rajkot', 'Rajkot', 'Gujarat')
ON CONFLICT DO NOTHING;
