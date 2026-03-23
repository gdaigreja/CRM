import express from "express";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// dotenv is only needed locally
if (process.env.VERCEL !== '1') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (e) {
    // Ignore if dotenv is not found
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL: MISSING SUPABASE CREDENTIALS!");
}

const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder");

// Health check endpoint
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", version: "1.0.0", env: process.env.NODE_ENV });
});

// Debug endpoint to check Supabase connection
app.get(["/api/debug/supabase", "/debug/supabase"], async (req, res) => {
  try {
    const { data, error, count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ 
      status: "connected", 
      leadsCount: count,
      url: supabaseUrl.substring(0, 10) + "..."
    });
  } catch (error: any) {
    console.error("DEBUG ERROR:", error);
    res.status(500).json({ status: "error", message: error.message, details: error });
  }
});

// Helpers for Lead Mapping (Frontend <-> Database)
const mapDbLeadToFrontend = (dbLead: any) => ({
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
  valuePaid: Number(dbLead.value_paid || 0),
  propertyType: dbLead.property_type,
  brokerage: Number(dbLead.brokerage || 0),
  delays: dbLead.delays || 0,
  signedDistrato: dbLead.signed_distrato || 'Não',
  proposal: Number(dbLead.proposal || 0),
  status: dbLead.status,
  contract: dbLead.contract,
  documentData: dbLead.document_data,
  financialRecord: dbLead.financial_record,
  createdAt: dbLead.created_at,
  notes: dbLead.notes || "",
  spouseInfo: {
    name: dbLead.spouse_name || "",
    cpf: dbLead.spouse_cpf || "",
    rg: dbLead.spouse_rg || "",
    phone: dbLead.spouse_phone || "",
    email: dbLead.spouse_email || ""
  }
});

const mapFrontendLeadToDb = (lead: any) => ({
  id: lead.id,
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
  value_paid: lead.valuePaid,
  property_type: lead.propertyType,
  brokerage: lead.brokerage,
  delays: lead.delays,
  signed_distrato: lead.signedDistrato,
  proposal: lead.proposal,
  status: lead.status,
  contract: lead.contract,
  document_data: lead.documentData || null,
  financial_record: lead.financialRecord || null,
  notes: lead.notes,
  spouse_name: lead.spouseInfo?.name || null,
  spouse_cpf: lead.spouseInfo?.cpf || null,
  spouse_rg: lead.spouseInfo?.rg || null,
  spouse_phone: lead.spouseInfo?.phone || null,
  spouse_email: lead.spouseInfo?.email || null
});

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

async function getUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw error;
    if (data && data.length > 0) return data;
    
    // Fallback to local file if Supabase has no users
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
    return [];
  } catch (e) {
    console.warn("Error reading users from Supabase, falling back to users.json", e);
    // Fallback to local file if Supabase fails
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
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

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ 
        error: "Sessão inválida ou expirada",
        code: "INVALID_TOKEN" 
      });
    }
    req.user = user;
    next();
  });
};

// Auth Endpoints
app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
  const { email, password } = req.body;
  const users = await getUsers();
  const user = users.find((u: any) => u.email === email);

  if (!user) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  // Simple password check for demo, in real app use bcrypt
  const isPasswordValid = password === user.password;

  if (!isPasswordValid) {
    return res.status(401).json({ error: "E-mail ou senha incorretos" });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

app.get(["/api/auth/me", "/auth/me"], authenticateToken, async (req: any, res) => {
  try {
    const users = await getUsers();
    const user = users.find((u: any) => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
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
      .from('users')
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

  const newLeadData = {
    name: payload.nome,
    profession: payload.profissao || "",
    phone: telefone,
    city: payload.cidade_uf || "",
    state: "",
    value_paid: payload.valor_pago || 0,
    property_type: payload.tipo_imovel || "",
    brokerage: payload.corretagem || 0,
    delays: payload.atrasos || 0,
    signed_distrato: "Não",
    notes: "",
    proposal: 0,
    email: payload.email || "",
    rg: payload.rg || "",
    cpf: payload.cpf || "",
    zip_code: payload.cep || "",
    address: payload.logradouro || "",
    neighborhood: payload.bairro || "",
    status: "Novo"
  };

  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([newLeadData])
      .select();

    if (error) throw error;

    res.status(201).json({
      message: "Lead created successfully",
      id: data[0].id,
      lead: mapDbLeadToFrontend(data[0])
    });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

// API to get leads for the frontend
app.get(["/api/leads", "/leads"], authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data.map(mapDbLeadToFrontend));
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

app.put(["/api/leads/:id", "/leads/:id"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updatedLead = mapFrontendLeadToDb(req.body);

  try {
    const { data, error } = await supabase
      .from('leads')
      .update(updatedLead)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(mapDbLeadToFrontend(data[0]));
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ error: "Failed to update lead" });
  }
});

app.delete(["/api/leads/:id", "/leads/:id"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

app.post(["/api/leads", "/leads"], authenticateToken, async (req, res) => {
  const dbLead = mapFrontendLeadToDb(req.body);
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([dbLead])
      .select();

    if (error) throw error;
    res.status(201).json(mapDbLeadToFrontend(data[0]));
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

// Tasks Endpoints
app.get(["/api/tasks", "/tasks"], authenticateToken, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
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
      .from('tasks')
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
      .from('tasks')
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
      .from('tasks')
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
app.get(["/api/columns", "/columns"], authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('kanban_columns')
      .select('name')
      .order('position', { ascending: true });

    if (error) throw error;
    res.json(data.map(c => c.name));
  } catch (error) {
    console.error("Error fetching columns:", error);
    res.status(500).json({ error: "Failed to fetch columns" });
  }
});

app.post(["/api/columns", "/columns"], authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    // Get current max position
    const { data: currentColumns } = await supabase
      .from('kanban_columns')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = currentColumns && currentColumns.length > 0 ? currentColumns[0].position + 1 : 0;

    const { error } = await supabase
      .from('kanban_columns')
      .insert([{ name, position: nextPosition }]);

    if (error) throw error;
    res.status(201).json({ name });
  } catch (error) {
    console.error("Error creating column:", error);
    res.status(500).json({ error: "Failed to create column" });
  }
});

app.delete(["/api/columns/:name", "/columns/:name"], authenticateToken, async (req, res) => {
  const { name } = req.params;
  try {
    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('name', name);

    if (error) throw error;
    res.json({ message: "Column deleted successfully" });
  } catch (error) {
    console.error("Error deleting column:", error);
    res.status(500).json({ error: "Failed to delete column" });
  }
});

app.patch(["/api/columns/:oldName", "/columns/:oldName"], authenticateToken, async (req, res) => {
  const { oldName } = req.params;
  const { newName } = req.body;

  try {
    // 1. Update column name in kanban_columns
    const { error: colError } = await supabase
      .from('kanban_columns')
      .update({ name: newName })
      .eq('name', oldName);

    if (colError) throw colError;

    // 2. Update all leads that were in this status
    const { error: leadError } = await supabase
      .from('leads')
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
app.get(["/api/roles/permissions", "/roles/permissions"], authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roles_permissions')
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error("Error fetching roles permissions", e);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

app.post(["/api/roles/permissions", "/roles/permissions"], authenticateToken, async (req, res) => {
  const { role_id, permissions } = req.body;
  try {
    const { data, error } = await supabase
      .from('roles_permissions')
      .upsert({ role_id, permissions })
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (e) {
    console.error("Error saving roles permissions", e);
    res.status(500).json({ error: "Failed to save permissions" });
  }
});

app.delete(["/api/roles/permissions/:role_id", "/roles/permissions/:role_id"], authenticateToken, async (req, res) => {
  const { role_id } = req.params;
  try {
    const { error } = await supabase
      .from('roles_permissions')
      .delete()
      .eq('role_id', role_id);
    
    if (error) throw error;
    res.json({ message: "Role deleted successfully" });
  } catch (e) {
    console.error("Error deleting role from Supabase", e);
    res.status(500).json({ error: "Failed to delete role" });
  }
});

app.get(["/api/users", "/users"], authenticateToken, async (req, res) => {
  const users = await getUsers();
  res.json(users);
});

app.post(["/api/users", "/users"], authenticateToken, async (req, res) => {
  const userData = req.body;
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (e) {
    console.error("Error creating user in Supabase", e);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.delete(["/api/users/:id", "/users/:id"], authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('users')
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
      .from('users')
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
  // na Vercel, não precisamos do middleware do Vite nem de servir arquivos estáticos manualmente, 
  // pois a Vercel cuida disso de forma nativa através do vercel.json e da pasta dist.
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== '1') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      
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
startServer();

export default app;
