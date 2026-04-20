-- Run this in Sepabase SQL Editor to fix the schema of the existing resolve_leads table
ALTER TABLE public.resolve_leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.resolve_leads RENAME COLUMN parcelas_resultando TO parcelas_resultado;
