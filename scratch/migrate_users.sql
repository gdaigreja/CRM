-- 1. Migrate users from resolve_users to users
INSERT INTO public.users (id, name, email, password, role, created_at, updated_at)
SELECT id, name, email, password, role, created_at, updated_at
FROM public.resolve_users
ON CONFLICT (email) DO NOTHING;

-- 2. Update resolve_tasks to reference public.users(id) instead of public.resolve_users(id)
-- Note: We need to drop the existing FK first if it exists.
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'resolve_tasks_user_id_fkey' 
        AND table_name = 'resolve_tasks'
    ) THEN
        ALTER TABLE public.resolve_tasks DROP CONSTRAINT resolve_tasks_user_id_fkey;
    END IF;
END $$;

ALTER TABLE public.resolve_tasks 
ADD CONSTRAINT resolve_tasks_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 3. Cleanup: Rename or signify resolve_users is deprecated
-- (Optional: DROP TABLE public.resolve_users;)
-- I'll keep it for now but maybe rename it to signify it's old.
ALTER TABLE public.resolve_users RENAME TO resolve_users_deprecated;
