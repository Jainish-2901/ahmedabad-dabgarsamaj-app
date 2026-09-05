-- ============================================================================
-- Migration 06: Safely remove areas table and foreign key references
-- ============================================================================

-- 1. Remove foreign key constraints referencing the areas table
ALTER TABLE IF EXISTS public.families DROP CONSTRAINT IF EXISTS families_area_id_fkey;
ALTER TABLE IF EXISTS public.family_members DROP CONSTRAINT IF EXISTS family_members_separate_area_id_fkey;

-- 2. Ensure area_id is not required on families table
ALTER TABLE IF EXISTS public.families ALTER COLUMN area_id DROP NOT NULL;

-- 3. Drop the areas table completely
DROP TABLE IF EXISTS public.areas CASCADE;
