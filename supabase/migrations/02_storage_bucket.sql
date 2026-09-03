-- ============================================================================
-- SUPABASE STORAGE BUCKET & RLS POLICIES FOR MEMBER PHOTOS
-- ============================================================================

-- 1. Create or update member-photos bucket as public
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-photos', 'member-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow anyone to view member photos
DROP POLICY IF EXISTS "Public can view member photos" ON storage.objects;
CREATE POLICY "Public can view member photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'member-photos');

-- 3. Allow uploads into member-photos bucket
DROP POLICY IF EXISTS "Allow photo uploads in member-photos" ON storage.objects;
CREATE POLICY "Allow photo uploads in member-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'member-photos');

-- 4. Allow updates / overwrites in member-photos bucket
DROP POLICY IF EXISTS "Allow photo updates in member-photos" ON storage.objects;
CREATE POLICY "Allow photo updates in member-photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'member-photos')
WITH CHECK (bucket_id = 'member-photos');

-- 5. Allow photo deletes in member-photos bucket
DROP POLICY IF EXISTS "Allow photo deletes in member-photos" ON storage.objects;
CREATE POLICY "Allow photo deletes in member-photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'member-photos');
