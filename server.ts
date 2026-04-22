import express from "express";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

let _supabase: any = null;
const getSupabase = () => {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("WARNING: MISSING SUPABASE CREDENTIALS!");
    }
    _supabase = createClient(
      supabaseUrl || "https://placeholder.supabase.co", 
      supabaseAnonKey || "placeholder"
    );
  }
  return _supabase;
};

// Replace top-level supabase constant with a proxy or just use the getter
const supabase = new Proxy({}, {
  get: (target, prop) => getSupabase()[prop]
});



// Helper to get dynamic table name based on project
const getTable = (project: string | undefined, baseName: string) => {
  // Normalize project to lowercase and handle defaults
  const p = (project || 'distrato').toLowerCase();
  
  // SHARED TABLES: Users and Roles are now shared across all projects
  if (baseName === 'users' || baseName === 'roles_permissions') {
    return baseName;
  }

  if (p === 'resolve') {
    return `resolve_${baseName}`;
  }
  
  // Default to original distrato table
  return baseName;
};

// Health check endpoint
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", version: "1.0.0", env: process.env.NODE_ENV });
});

// Helpers for Lead Mapping (Frontend <-> Database)
const mapDbLeadToFrontend = (dbLead: any, project: string = 'distrato') => {
  const isResolve = project === 'resolve';
  const lead: any = {
    id: dbLead.id,
    name: dbLead.name,
    profession: dbLead.profession,
    phone: dbLead.phone,
    email: dbLead.email,
    rg: dbLead.rg,
    cpf: dbLead.cpf,
    address: dbLead.address,
    neighborhood: dbLead.neighborhood,
    city: dbLead.city,
    state: dbLead.state,
    zipCode: dbLead.zip_code,
    status: dbLead.status,
    contract: typeof dbLead.contract === 'string' ? (JSON.parse(dbLead.contract || '{}')) : (dbLead.contract || {}),
    documentData: typeof dbLead.document_data === 'string' ? (JSON.parse(dbLead.document_data || '[]')) : (dbLead.document_data || []),
    financialRecord: typeof dbLead.financial_record === 'string' ? (JSON.parse(dbLead.financial_record || '[]')) : (dbLead.financial_record || []),
    createdAt: dbLead.created_at,
    notes: dbLead.notes || "",
    maritalStatus: dbLead.marital_status || "",
    archived: dbLead.archived || false,
    drive: dbLead.drive || "",
  };

  if (isResolve) {
    lead.age = dbLead.age;
    lead.contribution = dbLead.contribution;
    lead.isContributing = dbLead.is_contributing;
    lead.workType = dbLead.work_type;
    lead.incomeRange = dbLead.income_range;
    lead.hasRequested = dbLead.has_requested;
    lead.serviceType = dbLead.service_type;
    lead.birthDate = dbLead.birth_date;
    lead.gender = dbLead.gender;
  } else {
    lead.valuePaid = Number(dbLead.value_paid || 0);
    lead.propertyType = dbLead.property_type;
    lead.brokerage = Number(dbLead.brokerage || 0);
    lead.delays = dbLead.delays || 0;
    lead.signedDistrato = dbLead.signed_distrato || 'Não';
    lead.proposal = Number(dbLead.proposal || 0);
  }

  lead.spouseInfo = (
    (dbLead.spouse_name && dbLead.spouse_name.trim() !== "") ||
    (dbLead.spouse_cpf && dbLead.spouse_cpf.trim() !== "") ||
    (dbLead.spouse_rg && dbLead.spouse_rg.trim() !== "") ||
    (dbLead.spouse_phone && dbLead.spouse_phone.trim() !== "") ||
    (dbLead.spouse_email && dbLead.spouse_email.trim() !== "")
  ) ? {
    name: dbLead.spouse_name || "",
    cpf: dbLead.spouse_cpf || "",
    rg: dbLead.spouse_rg || "",
    phone: dbLead.spouse_phone || "",
    email: dbLead.spouse_email || ""
  } : undefined;

  return lead;
};

const mapFrontendLeadToDb = (lead: any, project: string = 'distrato') => {
  const isResolve = project === 'resolve';
  const dbLead: any = {
    name: lead.name,
    profession: lead.profession,
    phone: lead.phone,
    email: lead.email,
    rg: lead.rg,
    cpf: lead.cpf,
    address: lead.address,
    neighborhood: lead.neighborhood,
    city: lead.city,
    state: lead.state,
    zip_code: lead.zipCode,
    status: lead.status,
    contract: lead.contract,
    document_data: lead.documentData || null,
    financial_record: lead.financialRecord || null,
    notes: lead.notes,
    marital_status: lead.maritalStatus || null,
    spouse_name: lead.spouseInfo?.name || null,
    spouse_cpf: lead.spouseInfo?.cpf || null,
    spouse_rg: lead.spouseInfo?.rg || null,
    spouse_phone: lead.spouseInfo?.phone || null,
    spouse_email: lead.spouseInfo?.email || null,
    archived: lead.archived || false,
    drive: lead.drive || null,
  };

  if (isResolve) {
    dbLead.age = lead.age || null;
    dbLead.contribution = lead.contribution || null;
    dbLead.is_contributing = lead.isContributing || null;
    dbLead.work_type = lead.workType || null;
    dbLead.income_range = lead.incomeRange || null;
    dbLead.has_requested = lead.hasRequested || null;
    dbLead.service_type = lead.serviceType || null;
    dbLead.birth_date = lead.birthDate || null;
    dbLead.gender = lead.gender || null;
  } else {
    dbLead.value_paid = lead.valuePaid;
    dbLead.property_type = lead.propertyType;
    dbLead.brokerage = lead.brokerage;
    dbLead.delays = lead.delays;
    dbLead.signed_distrato = lead.signedDistrato;
    dbLead.proposal = lead.proposal;
  }

  // Only include ID if explicitly provided (usually for updates or if frontend generates it)
  if (lead.id) {
    dbLead.id = lead.id;
  } else {
    // Generate one if it's a new lead without ID (to be safe)
    dbLead.id = uuidv4();
  }

  return dbLead;
};

// Helpers for Task Mapping
const mapDbTaskToFrontend = (dbTask: any) => ({
  id: dbTask.id,
  title: dbTask.title,
  description: dbTask.description,
  status: dbTask.status,
  priority: dbTask.priority,
  dueDate: dbTask.due_date,
  createdAt: dbTask.created_at,
  leadId: dbTask.lead_id,
  userId: dbTask.user_id
});

const mapFrontendTaskToDb = (task: any) => ({
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  due_date: task.dueDate,
  lead_id: task.leadId,
  user_id: task.userId
});

// In a real app, this would be in .env
const API_KEY = process.env.WEBHOOK_API_KEY || "distrato-justo-n8n-key-2026";
const JWT_SECRET = process.env.JWT_SECRET || "distrato-justo-secret-key-2026";

// Mock DB for now (users.json)
const USERS_FILE = path.join(process.cwd(), 'users.json');

async function getUsers(project?: string) {
  try {
    const tableName = 'users';
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) throw error;
    if (data && data.length > 0) return data;
    
    // Fallback to local file only if not on Vercel or if file exists
    if (fs.existsSync(USERS_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      } catch (e) {
        console.error("Error parsing users.json", e);
      }
    }
    return [];
  } catch (e) {
    console.warn("Error reading users from Supabase/File", e);
    return [];
  }
}

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'undefined' || token === 'null' || token === '') {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ 
        error: "Sessão inválida ou expirada",
        code: "INVALID_TOKEN" 
      });
    }
    
    // Ensure project context is present
    if (!decoded.project) {
      decoded.project = 'distrato';
    }
    
    req.user = decoded;
    next();
  });
};

// Auth Endpoints
app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
  const { email, password, operation } = req.body;
  const project = operation || 'distrato';
  
  // Always query the shared users table (no project argument needed now)
  const users = await getUsers(); 
  
  // Normalize lookup: lowercase and trim email for both input and DB
  const targetEmail = (email || "").toLowerCase().trim();
  const user = users.find((u: any) => {
    const dbEmail = (u.email || "").toLowerCase().trim();
    return dbEmail === targetEmail;
  });
  
  console.log("Login DEBUG:", { 
    email, 
    operation, 
    userFound: !!user, 
    totalUsersFetched: users.length,
    matchedUserEmail: user?.email 
  });

  if (!user) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  // Simple password check for demo, in real app use bcrypt
  const typedPassword = (password || "").trim();
  const dbPassword = (user.password || "").trim();
  const isPasswordValid = typedPassword === dbPassword;

  console.log("Login STEP - Password Check:", { 
    email,
    operation,
    typedLength: typedPassword.length,
    dbLength: dbPassword.length,
    match: isPasswordValid
  });

  if (!isPasswordValid) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  const token = jwt.sign({ 
    id: user.id, 
    email: user.email, 
    role: user.role, 
    name: user.name,
    project: project 
  }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      project: project
    }
  });
});

app.get(["/api/auth/me", "/auth/me"], authenticateToken, async (req: any, res) => {
  try {
    const users = await getUsers(req.user.project);
    const user = users.find((u: any) => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      project: req.user.project
    });
  } catch (e) {
    res.status(500).json({ error: "Falha ao buscar perfil" });
  }
});

app.patch(["/api/auth/me", "/auth/me"], authenticateToken, async (req: any, res) => {
  const { name, password } = req.body;
  const userId = req.user.id;

  try {
    const updateData: any = {};
    if (name) updateData.name = name;
    if (password) updateData.password = password;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Nenhum dado para atualizar" });
    }

    const { data, error } = await supabase
      .from(getTable(req.user.project, 'users'))
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) throw error;

    res.json({ message: "Perfil atualizado com sucesso", user: data[0] });
  } catch (e) {
    console.error("Error updating profile", e);
    res.status(500).json({ error: "Falha ao atualizar perfil" });
  }
});

// Webhook Endpoint (No auth required, uses API Key)
app.post(["/api/leads/webhook", "/leads/webhook"], async (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }

  const payload = req.body;
  
  if (!payload.nome) {
    return res.status(400).json({ error: "Bad Request: 'nome' is required" });
  }

  let telefone = payload.telefone || "";
  const numericPhone = telefone.replace(/\D/g, '');
  if (numericPhone && numericPhone.length >= 10) {
    telefone = `https://wa.me/55${numericPhone}`;
  }

  const project = (payload.operation || 'distrato').toLowerCase();
  const isResolve = project === 'resolve';

  const newLeadData: any = {
    name: payload.nome,
    profession: payload.profissao || "",
    phone: telefone,
    city: payload.cidade_uf || "",
    state: "",
    notes: "",
    email: payload.email || "",
    rg: payload.rg || "",
    cpf: payload.cpf || "",
    zip_code: payload.cep || "",
    address: payload.logradouro || "",
    neighborhood: payload.bairro || "",
    status: "Novo"
  };

  if (isResolve) {
    newLeadData.age = payload.idade || 0;
    newLeadData.contribution = payload.contribuicao || 0;
    newLeadData.is_contributing = payload.contribui || null;
    newLeadData.work_type = payload.trabalho || null;
    newLeadData.income_range = payload.renda || null;
    newLeadData.has_requested = payload.ja_solicitou || null;
    newLeadData.service_type = payload.service_type || null;
    newLeadData.marital_status = payload.estado_civil || null;
  } else {
    newLeadData.value_paid = payload.valor_pago || 0;
    newLeadData.property_type = payload.tipo_imovel || "";
    newLeadData.brokerage = payload.corretagem || 0;
    newLeadData.delays = payload.atrasos || 0;
    newLeadData.signed_distrato = "Não";
    newLeadData.proposal = 0;
  }

  try {
    const { data, error } = await supabase
      .from(getTable(project, 'leads'))
      .insert([newLeadData])
      .select();

    if (error) throw error;

    res.status(201).json({
      message: "Lead created successfully",
      id: data[0].id,
      lead: mapDbLeadToFrontend(data[0], project)
    });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

// API to get leads for the frontend
app.get(["/api/leads", "/leads"], authenticateToken, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from(getTable(req.user.project, 'leads'))
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data.map(lead => mapDbLeadToFrontend(lead, req.user.project)));
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

app.put(["/api/leads/:id", "/leads/:id"], authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  console.log(`Updating lead ${id} for project ${req.user.project}...`);
  const updatedLead = mapFrontendLeadToDb(req.body, req.user.project);
  
  // Remove ID from updatedLead to avoid potential issues with updating PK
  const { id: _, ...updateData } = updatedLead;

  try {
    const { data, error } = await supabase
      .from(getTable(req.user.project, 'leads'))
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error("Supabase Update Error:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn("Lead not found for update:", id);
      return res.status(404).json({ error: "Lead not found" });
    }
    
    console.log("Lead updated successfully:", id);
    res.json(mapDbLeadToFrontend(data[0], req.user.project));
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ error: "Failed to update lead" });
  }
});

app.delete(["/api/leads/:id", "/leads/:id"], authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from(getTable(req.user.project, 'leads'))
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

app.post(["/api/leads", "/leads"], authenticateToken, async (req: any, res) => {
  const dbLead = mapFrontendLeadToDb(req.body, req.user.project);
  try {
    const tableName = getTable(req.user.project, 'leads');
    const { data, error } = await supabase
      .from(tableName)
      .insert([dbLead])
      .select();

    if (error) throw error;
    res.status(201).json(mapDbLeadToFrontend(data[0], req.user.project));
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

// Tasks Endpoints
app.get(["/api/tasks", "/tasks"], authenticateToken, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from(getTable(req.user.project, 'tasks'))
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data.map(mapDbTaskToFrontend));
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.post(["/api/tasks", "/tasks"], authenticateToken, async (req: any, res) => {
  const taskData = mapFrontendTaskToDb({ ...req.body, userId: req.user.id });
  
  try {
    const { data, error } = await supabase
      .from(getTable(req.user.project, 'tasks'))
      .insert([taskData])
      .select();

    if (error) throw error;
    res.status(201).json(mapDbTaskToFrontend(data[0]));
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

app.put(["/api/tasks/:id", "/tasks/:id"], authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const updatedTask = mapFrontendTaskToDb(req.body);

  try {
    const { data, error } = await supabase
      .from(getTable(req.user.project, 'tasks'))
      .update(updatedTask)
      .eq('id', id)
      .eq('user_id', req.user.id) // Security: ensure user owns the task
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    }
    res.json(mapDbTaskToFrontend(data[0]));
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

app.delete(["/api/tasks/:id", "/tasks/:id"], authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from(getTable(req.user.project, 'tasks'))
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id); // Security: ensure user owns the task

    if (error) throw error;
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Kanban Columns Endpoints
app.get(["/api/columns", "/columns"], authenticateToken, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from(getTable(req.user.project, 'kanban_columns'))
      .select('name')
      .order('position', { ascending: true });

    if (error) throw error;
    res.json(data.map(c => c.name));
  } catch (error) {
    console.error("Error fetching columns:", error);
    res.status(500).json({ error: "Failed to fetch columns" });
  }
});

app.post(["/api/columns", "/columns"], authenticateToken, async (req: any, res) => {
  const { name } = req.body;
  try {
    // Get current max position
    const { data: currentColumns } = await supabase
      .from(getTable(req.user.project, 'kanban_columns'))
      .select('position')
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = currentColumns && currentColumns.length > 0 ? currentColumns[0].position + 1 : 0;

    const { error } = await supabase
      .from(getTable(req.user.project, 'kanban_columns'))
      .insert([{ name, position: nextPosition }]);

    if (error) throw error;
    res.status(201).json({ name });
  } catch (error) {
    console.error("Error creating column:", error);
    res.status(500).json({ error: "Failed to create column" });
  }
});

app.delete(["/api/columns/:name", "/columns/:name"], authenticateToken, async (req: any, res) => {
  const { name } = req.params;
  try {
    const { error } = await supabase
      .from(getTable(req.user.project, 'kanban_columns'))
      .delete()
      .eq('name', name);

    if (error) throw error;
    res.json({ message: "Column deleted successfully" });
  } catch (error) {
    console.error("Error deleting column:", error);
    res.status(500).json({ error: "Failed to delete column" });
  }
});

app.patch(["/api/columns/:oldName", "/columns/:oldName"], authenticateToken, async (req: any, res) => {
  const { oldName } = req.params;
  const { newName } = req.body;

  try {
    // 1. Update column name in kanban_columns
    const { error: colError } = await supabase
      .from(getTable(req.user.project, 'kanban_columns'))
      .update({ name: newName })
      .eq('name', oldName);

    if (colError) throw colError;

    // 2. Update all leads that were in this status
    const { error: leadError } = await supabase
      .from(getTable(req.user.project, 'leads'))
      .update({ status: newName })
      .eq('status', oldName);

    if (leadError) throw leadError;

    res.json({ message: "Column renamed successfully" });
  } catch (error) {
    console.error("Error renaming column:", error);
    res.status(500).json({ error: "Failed to rename column" });
  }
});

// User Management Endpoints
app.get(["/api/roles/permissions", "/roles/permissions"], authenticateToken, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from(getTable(req.user.project, 'roles_permissions'))
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error("Error fetching roles permissions", e);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

app.post(["/api/roles/permissions", "/roles/permissions"], authenticateToken, async (req: any, res) => {
  const { role_id, permissions } = req.body;
  try {
    const { data, error } = await supabase
      .from(getTable(req.user.project, 'roles_permissions'))
      .upsert({ role_id, permissions })
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (e) {
    console.error("Error saving roles permissions", e);
    res.status(500).json({ error: "Failed to save permissions" });
  }
});

app.delete(["/api/roles/permissions/:role_id", "/roles/permissions/:role_id"], authenticateToken, async (req: any, res) => {
  const { role_id } = req.params;
  try {
    const { error } = await supabase
      .from(getTable(req.user.project, 'roles_permissions'))
      .delete()
      .eq('role_id', role_id);
    
    if (error) throw error;
    res.json({ message: "Role deleted successfully" });
  } catch (e) {
    console.error("Error deleting role from Supabase", e);
    res.status(500).json({ error: "Failed to delete role" });
  }
});

app.get(["/api/users", "/users"], authenticateToken, async (req: any, res) => {
  const users = await getUsers(req.user.project);
  res.json(users);
});

app.post(["/api/users", "/users"], authenticateToken, async (req: any, res) => {
  const userData = req.body;
  try {
    const { data, error } = await supabase
      .from(getTable(req.user.project, 'users'))
      .insert([userData])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (e) {
    console.error("Error creating user in Supabase", e);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.delete(["/api/users/:id", "/users/:id"], authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from(getTable(req.user.project, 'users'))
      .delete()
      .match({ id });
    
    if (error) throw error;
    res.json({ message: "User deleted successfully" });
  } catch (e) {
    console.error("Error deleting user from Supabase", e);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.patch(["/api/users/:id", "/users/:id"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const { data, error } = await supabase
      .from(getTable((req as any).user.project, 'users'))
      .update(updates)
      .match({ id })
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (e) {
    console.error("Error updating user in Supabase", e);
    res.status(500).json({ error: "Failed to update user" });
  }
});

async function startServer() {
  // Na Vercel, não precisamos (e não devemos) servir arquivos estáticos via Express,
  // pois a Vercel cuida disso nativamente. O Express só servirá a API.
  if (process.env.VERCEL === '1') {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    
    app.get('/distrato', (req, res) => {
      res.sendFile(path.join(distPath, 'distrato.html'));
    });
    
    app.get('/resolve', (req, res) => {
      res.sendFile(path.join(distPath, 'resolve.html'));
    });
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "custom",
      });
      app.use(vite.middlewares);
      
      app.get('/distrato', async (req, res) => {
        const html = await fs.readFileSync(path.resolve(__dirname, 'distrato.html'), 'utf-8');
        res.status(200).set({ 'Content-Type': 'text/html' }).end(await vite.transformIndexHtml('/distrato.html', html));
      });
      
      app.get('/resolve', async (req, res) => {
        const html = await fs.readFileSync(path.resolve(__dirname, 'resolve.html'), 'utf-8');
        res.status(200).set({ 'Content-Type': 'text/html' }).end(await vite.transformIndexHtml('/resolve.html', html));
      });

      app.get('/', async (req, res) => {
        try {
          const html = await fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
          res.status(200).set({ 'Content-Type': 'text/html' }).end(await vite.transformIndexHtml('/', html));
        } catch (e) {
          res.status(500).end(String(e));
        }
      });

      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(`Development server running on http://localhost:${PORT}`);
      });
    } catch (e) {
      console.error("Failed to start Vite dev server:", e);
    }
  }
}

// Inicializa o servidor se necessário (localmente)
if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
