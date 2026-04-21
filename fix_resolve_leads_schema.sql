-- CONSOLIDATED SQL Script to update ResolvePrev database schema
-- This script applies all recent changes requested for the retirement domain and UI updates.

-- 1. Add Marital Status column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resolve_leads' AND column_name='marital_status') THEN
        ALTER TABLE public.resolve_leads ADD COLUMN marital_status TEXT;
    END IF;
END $$;

-- 2. Rename existing columns to the new retirement domain fields
-- We use a DO block to safely rename only if the old columns exist
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resolve_leads' AND column_name='value_paid') THEN
        ALTER TABLE public.resolve_leads RENAME COLUMN value_paid TO age;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resolve_leads' AND column_name='property_type') THEN
        ALTER TABLE public.resolve_leads RENAME COLUMN property_type TO contribution;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resolve_leads' AND column_name='brokerage') THEN
        ALTER TABLE public.resolve_leads RENAME COLUMN brokerage TO is_contributing;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resolve_leads' AND column_name='delays') THEN
        ALTER TABLE public.resolve_leads RENAME COLUMN delays TO work_type;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resolve_leads' AND column_name='signed_distrato') THEN
        ALTER TABLE public.resolve_leads RENAME COLUMN signed_distrato TO income_range;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resolve_leads' AND column_name='proposal') THEN
        ALTER TABLE public.resolve_leads RENAME COLUMN proposal TO has_requested;
    END IF;
END $$;

-- 3. Update data types and defaults for the new fields
-- age: INTEGER
ALTER TABLE public.resolve_leads ALTER COLUMN age TYPE INTEGER USING (CASE WHEN age::text ~ '^[0-9]+$' THEN age::integer ELSE 0 END);
ALTER TABLE public.resolve_leads ALTER COLUMN age SET DEFAULT 0;

-- contribution: INTEGER
ALTER TABLE public.resolve_leads ALTER COLUMN contribution TYPE INTEGER USING (CASE WHEN contribution::text ~ '^[0-9]+$' THEN contribution::integer ELSE 0 END);
ALTER TABLE public.resolve_leads ALTER COLUMN contribution SET DEFAULT 0;

-- categorical fields to TEXT
ALTER TABLE public.resolve_leads ALTER COLUMN is_contributing TYPE TEXT;
ALTER TABLE public.resolve_leads ALTER COLUMN work_type TYPE TEXT;
ALTER TABLE public.resolve_leads ALTER COLUMN income_range TYPE TEXT;
ALTER TABLE public.resolve_leads ALTER COLUMN has_requested TYPE TEXT;

-- Reset defaults to NULL for dropdown fields
ALTER TABLE public.resolve_leads ALTER COLUMN is_contributing SET DEFAULT NULL;
ALTER TABLE public.resolve_leads ALTER COLUMN work_type SET DEFAULT NULL;
ALTER TABLE public.resolve_leads ALTER COLUMN income_range SET DEFAULT NULL;
ALTER TABLE public.resolve_leads ALTER COLUMN has_requested SET DEFAULT NULL;

-- 4. Ensure contract column is ready for JSON data (if it was text)
-- If it's already JSONB, this will be a no-op or slight adjustment
-- ALTER TABLE public.resolve_leads ALTER COLUMN contract TYPE JSONB USING contract::jsonb;
