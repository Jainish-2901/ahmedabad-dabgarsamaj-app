-- ============================================================================
-- 04_DELETE_ACCOUNT_RPC.SQL
-- Creates a secure RPC function to allow users to permanently delete their account
-- and all associated family records, members, and relations.
-- ============================================================================

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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
