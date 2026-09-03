-- ============================================================================
-- 03_FIX_RLS_AND_TRIGGERS.SQL
-- Fixes Auth Trigger to store Phone Number and streamline RLS policies
-- ============================================================================

-- 1. Fix Auth Trigger for Phone Number & Role
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

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- 2. Streamlined PROFILES Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Allow authenticated read profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Allow authenticated update profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth_user_id = auth.uid());


-- 3. Streamlined FAMILIES Policies
DROP POLICY IF EXISTS "Family Head can view own family" ON public.families;
DROP POLICY IF EXISTS "Family Head can insert own family" ON public.families;
DROP POLICY IF EXISTS "Family Head can update own family" ON public.families;
DROP POLICY IF EXISTS "Admin can delete or archive family" ON public.families;

CREATE POLICY "Allow authenticated read families"
    ON public.families FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert families"
    ON public.families FOR INSERT
    TO authenticated
    WITH CHECK (head_user_id = auth.uid());

CREATE POLICY "Allow authenticated update families"
    ON public.families FOR UPDATE
    TO authenticated
    USING (head_user_id = auth.uid());


-- 4. Streamlined FAMILY MEMBERS Policies
DROP POLICY IF EXISTS "Family Head can view own members" ON public.family_members;
DROP POLICY IF EXISTS "Family Head can insert own members" ON public.family_members;
DROP POLICY IF EXISTS "Family Head can update own members" ON public.family_members;
DROP POLICY IF EXISTS "Family Head can delete own members" ON public.family_members;

CREATE POLICY "Allow authenticated read family_members"
    ON public.family_members FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert family_members"
    ON public.family_members FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update family_members"
    ON public.family_members FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated delete family_members"
    ON public.family_members FOR DELETE
    TO authenticated
    USING (true);


-- 5. Streamlined FAMILY RELATIONSHIPS Policies
DROP POLICY IF EXISTS "Family Head can view own relationships" ON public.family_relationships;
DROP POLICY IF EXISTS "Family Head can insert own relationships" ON public.family_relationships;
DROP POLICY IF EXISTS "Family Head can delete own relationships" ON public.family_relationships;

CREATE POLICY "Allow authenticated read family_relationships"
    ON public.family_relationships FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert family_relationships"
    ON public.family_relationships FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete family_relationships"
    ON public.family_relationships FOR DELETE
    TO authenticated
    USING (true);


-- 6. Streamlined EDUCATION & OCCUPATION Policies
DROP POLICY IF EXISTS "Allow authenticated read education" ON public.education_records;
DROP POLICY IF EXISTS "Allow authenticated insert education" ON public.education_records;
DROP POLICY IF EXISTS "Allow authenticated update education" ON public.education_records;

CREATE POLICY "Allow authenticated read education"
    ON public.education_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert education"
    ON public.education_records FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update education"
    ON public.education_records FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated read occupation" ON public.occupation_records;
DROP POLICY IF EXISTS "Allow authenticated insert occupation" ON public.occupation_records;
DROP POLICY IF EXISTS "Allow authenticated update occupation" ON public.occupation_records;

CREATE POLICY "Allow authenticated read occupation"
    ON public.occupation_records FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert occupation"
    ON public.occupation_records FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update occupation"
    ON public.occupation_records FOR UPDATE
    TO authenticated
    USING (true);
