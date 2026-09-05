-- ============================================================================
-- 05_ADD_MEMBER_EMAIL_AND_AUTH.SQL
-- 1. Adds email column to family_members table for authorized member access
-- 2. Adds index on email for quick lookup during login and password recovery
-- 3. Adds secure RPC to synchronize password between head and authorized members
-- ============================================================================

-- 1. Add email column to family_members table if not exists
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Add index on email
CREATE INDEX IF NOT EXISTS idx_family_members_email 
ON public.family_members(lower(email));

-- 3. Create RPC function to synchronize password for family head user account
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

-- Grant execution to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.sync_head_password(UUID, TEXT) TO authenticated, anon;
