-- Migration 06: Ensure families.area_id is optional (NULLABLE)
-- Allows families to register without selecting an area.

ALTER TABLE public.families ALTER COLUMN area_id DROP NOT NULL;
