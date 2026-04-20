-- SQL script to setup Resolve Prev tables in Supabase

-- 1. Create table 'resolve_users' (Cloned from 'users')
CREATE TABLE IF NOT EXISTS public.resolve_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create table 'resolve_leads' (Cloned from 'leads')
CREATE TABLE IF NOT EXISTS public.resolve_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    profession TEXT,
    phone TEXT,
    email TEXT,
    rg TEXT,
    cpf TEXT,
    address TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    value_paid NUMERIC(15, 2) DEFAULT 0,
    property_type TEXT,
    brokerage NUMERIC(15, 2) DEFAULT 0,
    delays INTEGER DEFAULT 0,
    signed_distrato TEXT DEFAULT 'Não',
    proposal NUMERIC(15, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Novo',
    contract TEXT,
    document_data JSONB DEFAULT NULL,
    financial_record JSONB DEFAULT NULL,
    multa_rescisoria_devida NUMERIC(15, 2) DEFAULT 0,
    data_churn DATE,
    status_execucao TEXT,
    tipo_resultado TEXT,
    valor_acordo NUMERIC(15, 2) DEFAULT 0,
    data_pagamento DATE,
    valor_honorarios NUMERIC(15, 2) DEFAULT 0,
    valor_condenacao NUMERIC(15, 2) DEFAULT 0,
    valor_restituicao NUMERIC(15, 2) DEFAULT 0,
    honorarios_sucumbenciais_contratuais TEXT,
    status_resultado TEXT,
    motivo_improcedencia TEXT,
    anexo_sentenca TEXT,
    notes TEXT,
    parcelas_resultado INTEGER DEFAULT 0,
    parcelas_pagas INTEGER DEFAULT 0,
    spouse_name TEXT,
    spouse_cpf TEXT,
    spouse_rg TEXT,
    spouse_phone TEXT,
    spouse_email TEXT,
    archived BOOLEAN DEFAULT FALSE,
    drive TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create table 'resolve_tasks' (Cloned from 'tasks')
CREATE TABLE IF NOT EXISTS public.resolve_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    lead_id UUID REFERENCES public.resolve_leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.resolve_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create table 'resolve_kanban_columns' (Cloned from 'kanban_columns')
CREATE TABLE IF NOT EXISTS public.resolve_kanban_columns (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT UNIQUE NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create table 'resolve_roles_permissions' (Cloned from 'roles_permissions')
CREATE TABLE IF NOT EXISTS public.resolve_roles_permissions (
    role_id TEXT PRIMARY KEY,
    permissions JSONB NOT NULL
);

-- 6. Initial Data for Kanban Columns (Based on default setup)
INSERT INTO public.resolve_kanban_columns (name, position) VALUES
('Novo', 0),
('Triagem', 1),
('Aguardando Doc', 2),
('Doc Ok', 3),
('Protocolo', 4),
('Finalizado', 5)
ON CONFLICT (name) DO NOTHING;

-- 7. Initial Admin User for Resolve Prev (IMPORTANT: Change password after first login)
-- Note: Replace 'admin_password_hash' with a temporary password if needed.
-- Since current server.ts uses plain text for fallback/simplicity, I'll put a default.
INSERT INTO public.resolve_users (id, name, email, password, role) VALUES
(uuid_generate_v4(), 'Admin Resolve', 'admin@resolveprev.com.br', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;
