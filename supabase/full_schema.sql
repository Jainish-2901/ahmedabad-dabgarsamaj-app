-- ============================================================================
-- COMMUNITY FAMILY APPLICATION - COMPLETE DATABASE & STORAGE SCHEMA
-- Run this entire script in your new Supabase Project SQL Editor (1-Click)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
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
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Ahmedabad',
    state TEXT NOT NULL DEFAULT 'Gujarat',
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. FAMILY CODE SEQUENCE & GENERATOR
CREATE SEQUENCE IF NOT EXISTS public.family_code_seq START WITH 101;

CREATE OR REPLACE FUNCTION public.generate_family_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'FAM-' || LPAD(nextval('public.family_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 6. FAMILIES TABLE
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
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    photo_url TEXT,
    gender TEXT NOT NULL,
    mobile TEXT,
    dob DATE NOT NULL,
    relation TEXT NOT NULL,
    residence_type TEXT NOT NULL DEFAULT 'SAME_AS_FAMILY',
    separate_address TEXT,
    separate_area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
    separate_city TEXT,
    separate_state TEXT,
    separate_pincode TEXT,
    education_status TEXT,
    occupation_type TEXT,
    occupation_details JSONB DEFAULT '{}'::jsonb,
    blood_group TEXT,
    birth_place TEXT,
    can_edit_family BOOLEAN NOT NULL DEFAULT false,
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. FAMILY RELATIONSHIPS TABLE
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

-- 9. EDUCATION RECORDS TABLE
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

-- 10. OCCUPATION RECORDS TABLE
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

-- 11. AUDIT LOGS TABLE
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

-- 12. AUTH USER CREATION TRIGGER
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

-- 13. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert profile" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update profile" ON public.profiles FOR UPDATE USING (true);

-- Areas Policies
CREATE POLICY "Allow read areas" ON public.areas FOR SELECT USING (true);
CREATE POLICY "Allow manage areas" ON public.areas FOR ALL USING (true);

-- Families Policies
CREATE POLICY "Allow read families" ON public.families FOR SELECT USING (true);
CREATE POLICY "Allow insert family" ON public.families FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update family" ON public.families FOR UPDATE USING (true);
CREATE POLICY "Allow delete family" ON public.families FOR DELETE USING (true);

-- Family Members Policies
CREATE POLICY "Allow read members" ON public.family_members FOR SELECT USING (true);
CREATE POLICY "Allow insert members" ON public.family_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update members" ON public.family_members FOR UPDATE USING (true);
CREATE POLICY "Allow delete members" ON public.family_members FOR DELETE USING (true);

-- Relationships Policies
CREATE POLICY "Allow read relationships" ON public.family_relationships FOR SELECT USING (true);
CREATE POLICY "Allow insert relationships" ON public.family_relationships FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete relationships" ON public.family_relationships FOR DELETE USING (true);

-- Education & Occupation Policies
CREATE POLICY "Allow read education" ON public.education_records FOR SELECT USING (true);
CREATE POLICY "Allow insert education" ON public.education_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update education" ON public.education_records FOR UPDATE USING (true);

CREATE POLICY "Allow read occupation" ON public.occupation_records FOR SELECT USING (true);
CREATE POLICY "Allow insert occupation" ON public.occupation_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update occupation" ON public.occupation_records FOR UPDATE USING (true);

CREATE POLICY "Allow manage audit_logs" ON public.audit_logs FOR ALL USING (true);

-- 14. SEED DEFAULT AREAS
INSERT INTO public.areas (name, city, state) VALUES
('Nikol', 'Ahmedabad', 'Gujarat'),
('Naroda', 'Ahmedabad', 'Gujarat'),
('Bapunagar', 'Ahmedabad', 'Gujarat'),
('Dabgarwad', 'Ahmedabad', 'Gujarat'),
('Kalupur', 'Ahmedabad', 'Gujarat'),
('Shahpur', 'Ahmedabad', 'Gujarat'),
('Odhav', 'Ahmedabad', 'Gujarat'),
('Vastral', 'Ahmedabad', 'Gujarat'),
('Maninagar', 'Ahmedabad', 'Gujarat'),
('Ghatlodia', 'Ahmedabad', 'Gujarat'),
('Satellite', 'Ahmedabad', 'Gujarat'),
('Gandhinagar', 'Gandhinagar', 'Gujarat')
ON CONFLICT DO NOTHING;

-- 15. STORAGE BUCKET & POLICIES FOR MEMBER PHOTOS
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

-- 16. PERMANENT ACCOUNT & FAMILY DELETION RPC
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

