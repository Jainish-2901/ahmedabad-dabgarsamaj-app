-- ============================================================================
-- COMMUNITY FAMILY APPLICATION - COMPLETE DATABASE & STORAGE SCHEMA
-- અમદાવાદ ડબગર સમાજ ડિજિટલ પરિચય પુસ્તિકા
-- Run this entire script in your Supabase Project SQL Editor (1-Click Setup)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('FAMILY_HEAD', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.record_status AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    role public.user_role NOT NULL DEFAULT 'FAMILY_HEAD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. FAMILY CODE SEQUENCE & GENERATOR
CREATE SEQUENCE IF NOT EXISTS public.family_code_seq START WITH 101;

CREATE OR REPLACE FUNCTION public.generate_family_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'FAM-' || LPAD(nextval('public.family_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 5. FAMILIES TABLE
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_code TEXT NOT NULL UNIQUE DEFAULT public.generate_family_code(),
    head_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    address TEXT NOT NULL,
    area_id UUID,
    city TEXT NOT NULL DEFAULT 'Ahmedabad',
    state TEXT NOT NULL DEFAULT 'Gujarat',
    pincode TEXT NOT NULL,
    native_place TEXT DEFAULT 'Ahmedabad',
    status public.record_status NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure native_place exists if table already existed
ALTER TABLE IF EXISTS public.families ADD COLUMN IF NOT EXISTS native_place TEXT DEFAULT 'Ahmedabad';
ALTER TABLE IF EXISTS public.families ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Ahmedabad';
ALTER TABLE IF EXISTS public.families ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Gujarat';
ALTER TABLE IF EXISTS public.families ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE IF EXISTS public.families ALTER COLUMN area_id DROP NOT NULL;

-- 6. FAMILY MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    photo_url TEXT,
    gender TEXT NOT NULL,
    mobile TEXT,
    email TEXT,
    dob DATE, -- Nullable for late/deceased members
    relation TEXT NOT NULL,
    residence_type TEXT NOT NULL DEFAULT 'SAME_AS_FAMILY',
    separate_address TEXT,
    separate_area_id UUID,
    separate_city TEXT,
    separate_state TEXT,
    separate_pincode TEXT,
    education_status TEXT,
    occupation_type TEXT,
    occupation_details JSONB DEFAULT '{}'::jsonb,
    blood_group TEXT,
    birth_place TEXT,
    is_deceased BOOLEAN DEFAULT false,
    deceased_date TEXT,
    can_edit_family BOOLEAN NOT NULL DEFAULT false,
    status public.record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all latest columns & constraints exist if table already existed
ALTER TABLE IF EXISTS public.family_members ALTER COLUMN dob DROP NOT NULL;
ALTER TABLE IF EXISTS public.family_members ADD COLUMN IF NOT EXISTS is_deceased BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.family_members ADD COLUMN IF NOT EXISTS deceased_date TEXT;
ALTER TABLE IF EXISTS public.family_members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE IF EXISTS public.family_members ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE IF EXISTS public.family_members ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE IF EXISTS public.family_members ADD COLUMN IF NOT EXISTS can_edit_family BOOLEAN DEFAULT false;

-- 7. FAMILY RELATIONSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.family_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    from_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    to_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_no_self_rel CHECK (from_member_id <> to_member_id),
    CONSTRAINT uq_family_rel UNIQUE (from_member_id, to_member_id, relationship_type)
);

-- 8. EDUCATION RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.education_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    education_level TEXT NOT NULL,
    course_or_standard TEXT NOT NULL,
    education_status TEXT NOT NULL DEFAULT 'Studying',
    current_year TEXT,
    passing_year INT,
    institution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. OCCUPATION RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.occupation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    occupation_type TEXT NOT NULL,
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

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. AUTH USER CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        auth_user_id,
        email,
        phone,
        role
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'FAMILY_HEAD'::public.user_role)
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 12. HIGH-PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_families_head_user_id ON public.families(head_user_id);
CREATE INDEX IF NOT EXISTS idx_families_code_lower ON public.families(lower(family_code));
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_is_deceased ON public.family_members(is_deceased);
CREATE INDEX IF NOT EXISTS idx_family_members_name_lower ON public.family_members(lower(name));
CREATE INDEX IF NOT EXISTS idx_family_members_email_lower ON public.family_members(lower(email));
CREATE INDEX IF NOT EXISTS idx_relationships_family ON public.family_relationships(family_id);
CREATE INDEX IF NOT EXISTS idx_relationships_members ON public.family_relationships(from_member_id, to_member_id);
CREATE INDEX IF NOT EXISTS idx_education_member ON public.education_records(family_member_id);
CREATE INDEX IF NOT EXISTS idx_occupation_member ON public.occupation_records(family_member_id);

-- 13. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Allow read profiles" ON public.profiles;
CREATE POLICY "Allow read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert profile" ON public.profiles;
CREATE POLICY "Allow insert profile" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update profile" ON public.profiles;
CREATE POLICY "Allow update profile" ON public.profiles FOR UPDATE USING (true);

-- Families Policies (Public readable for QR scan verification & community directory)
DROP POLICY IF EXISTS "Allow read families" ON public.families;
CREATE POLICY "Allow read families" ON public.families FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert family" ON public.families;
CREATE POLICY "Allow insert family" ON public.families FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update family" ON public.families;
CREATE POLICY "Allow update family" ON public.families FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete family" ON public.families;
CREATE POLICY "Allow delete family" ON public.families FOR DELETE USING (true);

-- Family Members Policies (Public readable for QR scan verification & community directory)
DROP POLICY IF EXISTS "Allow read members" ON public.family_members;
CREATE POLICY "Allow read members" ON public.family_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert members" ON public.family_members;
CREATE POLICY "Allow insert members" ON public.family_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update members" ON public.family_members;
CREATE POLICY "Allow update members" ON public.family_members FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete members" ON public.family_members;
CREATE POLICY "Allow delete members" ON public.family_members FOR DELETE USING (true);

-- Relationships Policies
DROP POLICY IF EXISTS "Allow read relationships" ON public.family_relationships;
CREATE POLICY "Allow read relationships" ON public.family_relationships FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert relationships" ON public.family_relationships;
CREATE POLICY "Allow insert relationships" ON public.family_relationships FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete relationships" ON public.family_relationships;
CREATE POLICY "Allow delete relationships" ON public.family_relationships FOR DELETE USING (true);

-- Education & Occupation Policies
DROP POLICY IF EXISTS "Allow read education" ON public.education_records;
CREATE POLICY "Allow read education" ON public.education_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert education" ON public.education_records;
CREATE POLICY "Allow insert education" ON public.education_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update education" ON public.education_records;
CREATE POLICY "Allow update education" ON public.education_records FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow read occupation" ON public.occupation_records;
CREATE POLICY "Allow read occupation" ON public.occupation_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert occupation" ON public.occupation_records;
CREATE POLICY "Allow insert occupation" ON public.occupation_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update occupation" ON public.occupation_records;
CREATE POLICY "Allow update occupation" ON public.occupation_records FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow manage audit_logs" ON public.audit_logs;
CREATE POLICY "Allow manage audit_logs" ON public.audit_logs FOR ALL USING (true);

-- 14. STORAGE BUCKET & POLICIES FOR MEMBER PHOTOS
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-photos', 'member-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view member photos" ON storage.objects;
CREATE POLICY "Public can view member photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "Allow photo uploads in member-photos" ON storage.objects;
CREATE POLICY "Allow photo uploads in member-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "Allow photo updates in member-photos" ON storage.objects;
CREATE POLICY "Allow photo updates in member-photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'member-photos')
WITH CHECK (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "Allow photo deletes in member-photos" ON storage.objects;
CREATE POLICY "Allow photo deletes in member-photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'member-photos');

-- 15. RPC: PERMANENT ACCOUNT & FAMILY DELETION
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_user_id UUID;
    fam_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Find family where current user is head
    SELECT id INTO fam_id FROM public.families WHERE head_user_id = current_user_id;

    IF fam_id IS NOT NULL THEN
        -- Delete education and occupation records
        DELETE FROM public.education_records WHERE family_member_id IN (
            SELECT id FROM public.family_members WHERE family_id = fam_id
        );
        DELETE FROM public.occupation_records WHERE family_member_id IN (
            SELECT id FROM public.family_members WHERE family_id = fam_id
        );
        -- Delete relationships
        DELETE FROM public.family_relationships WHERE family_id = fam_id;

        -- Delete member edit access if table exists
        BEGIN
            DELETE FROM public.member_edit_access WHERE family_id = fam_id;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;

        -- Delete members
        DELETE FROM public.family_members WHERE family_id = fam_id;
        -- Delete family
        DELETE FROM public.families WHERE id = fam_id;
    END IF;

    -- Delete profile
    DELETE FROM public.profiles WHERE auth_user_id = current_user_id;

    -- Delete auth user
    DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- 16. RPC: SYNCHRONIZE HEAD PASSWORD FOR AUTHORIZED MEMBERS
CREATE OR REPLACE FUNCTION public.sync_head_password(p_head_user_id UUID, p_new_password TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    IF p_head_user_id IS NULL OR p_new_password IS NULL OR length(p_new_password) < 6 THEN
        RETURN false;
    END IF;

    -- Update auth user password hash using pgcrypto blowfish crypt
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = p_head_user_id;

    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_head_password(UUID, TEXT) TO authenticated, anon;
