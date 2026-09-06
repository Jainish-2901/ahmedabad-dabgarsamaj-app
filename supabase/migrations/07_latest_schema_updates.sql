-- ==============================================================================
-- 07_latest_schema_updates.sql
-- અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા - Database Update Script
-- Supabase Dashboard -> SQL Editor માં આ આખી સ્ક્રિપ્ટ રન કરવી.
-- ==============================================================================

-- 1. સ્વર્ગસ્થ સભ્યો માટે Date of Birth (DOB) પરથી NOT NULL constraint હટાવો
ALTER TABLE IF EXISTS public.family_members 
ALTER COLUMN dob DROP NOT NULL;

-- 2. સ્વર્ગસ્થ સભ્ય ઓળખવા માટે is_deceased કોલમ ઉમેરો (જો ન હોય તો)
ALTER TABLE IF EXISTS public.family_members 
ADD COLUMN IF NOT EXISTS is_deceased BOOLEAN DEFAULT false;

-- 3. સ્વર્ગવાસ તારીખ અથવા વર્ષ સાચવવા deceased_date કોલમ ઉમેરો
ALTER TABLE IF EXISTS public.family_members 
ADD COLUMN IF NOT EXISTS deceased_date TEXT;

-- 4. પરિવાર ટેબલમાં વતન (native_place) કોલમ ઉમેરો
ALTER TABLE IF EXISTS public.families 
ADD COLUMN IF NOT EXISTS native_place TEXT DEFAULT 'Ahmedabad';

-- 5. સભ્યોના ટેબલમાં ઈમેલ અને બ્લડગ્રૂપ કોલમ સુનિશ્ચિત કરો
ALTER TABLE IF EXISTS public.family_members 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE IF EXISTS public.family_members 
ADD COLUMN IF NOT EXISTS blood_group TEXT;

ALTER TABLE IF EXISTS public.family_members 
ADD COLUMN IF NOT EXISTS birth_place TEXT;

ALTER TABLE IF EXISTS public.family_members 
ADD COLUMN IF NOT EXISTS can_edit_family BOOLEAN DEFAULT false;

-- 6. પરિવારના એડ્રેસ ફિલ્ડ્સ સુનિશ્ચિત કરો
ALTER TABLE IF EXISTS public.families 
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Ahmedabad';

ALTER TABLE IF EXISTS public.families 
ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Gujarat';

ALTER TABLE IF EXISTS public.families 
ADD COLUMN IF NOT EXISTS pincode TEXT;

-- 7. જૂના રેકોર્ડ્સમાંથી is_deceased અને deceased_date નો ડેટા નવા કોલમમાં ટ્રાન્સફર (Backfill) કરો
UPDATE public.family_members 
SET 
    is_deceased = COALESCE((occupation_details->>'is_deceased')::boolean, false),
    deceased_date = occupation_details->>'deceased_date'
WHERE (occupation_details ? 'is_deceased') 
  AND (is_deceased IS NULL OR is_deceased = false);

-- 8. પર્ફોર્મન્સ ઇન્ડેક્સ ઉમેરો જેથી સર્ચ અને ડિરેક્ટરી ઝડપથી લોડ થાય
CREATE INDEX IF NOT EXISTS idx_family_members_is_deceased 
ON public.family_members(is_deceased);

CREATE INDEX IF NOT EXISTS idx_family_members_name_lower 
ON public.family_members(lower(name));

CREATE INDEX IF NOT EXISTS idx_families_code_lower 
ON public.families(lower(family_code));

CREATE INDEX IF NOT EXISTS idx_family_members_email_lower 
ON public.family_members(lower(email));
