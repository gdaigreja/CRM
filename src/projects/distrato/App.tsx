import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';
import {
  LayoutDashboard,
  Users,
  Columns,
  FileText,
  Settings,
  Plus,
  Search,
  MoreHorizontal,
  Phone,
  MapPin,
  Pencil,
  X,
  Check,
  FilePlus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertCircle,
  Calendar,
  ChevronDown,
  Filter,
  CheckSquare,
  List,
  LogOut,
  Database,
  DollarSign,
  Activity,
  ExternalLink,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { Lead, LeadStatus, ContractData, SpouseInfo } from '../../shared/types';
import { INITIAL_LEADS, KANBAN_COLUMNS, DEFAULT_DOCUMENTS } from './constants';
import { cn, formatCurrency, formatPhone, parseCurrency, formatRG, formatCPF, formatCEP, formatPercent } from '../../shared/utils';
import Dashboard from './components/Dashboard';
import Registrations from './components/Registrations';
import EditLeadSidebar from './components/EditLeadSidebar';
import Documents from './components/Documents';
import SettingsView from './components/Settings';
import Tasks from './components/Tasks';
import DocumentGenerator from './components/DocumentGenerator';
import Login from '../../shared/components/Login';
import Finance from './components/Finance';

const STATUS_COLORS: Record<string, string> = {
  'Novo': '#94a3b8',           // Gray
  'Qualificação': '#F97316',   // Vibrant Orange
  'Follow-up': '#EAB308',      // Yellow
  'Reunião': '#2E7D32',        // Green
  'Stand-by': '#3B82F6',       // Blue
  'Recusado': '#EF4444',       // Red
  'Desqualificado': '#A855F7', // Purple
  'Recuperação': '#A0522D',    // Terracotta (Default)
  'Assinado': '#4ADE80',       // Light Green
  'Churn': '#EF4444',          // Red
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [columns, setColumns] = useState<string[]>(KANBAN_COLUMNS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [pendingFinalize, setPendingFinalize] = useState<{ lead: Lead, contract: ContractData } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'kanban' | 'dashboard' | 'registrations' | 'documents' | 'settings' | 'tasks' | 'generator' | 'finance'>('kanban');
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    document.title = 'Distrato Justo';
    if (user && user.project === 'resolve') {
      window.location.href = '/resolve';
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      console.log("Fetching data from API...");
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch Leads
        const leadsRes = await fetch('/api/leads', { headers });
        console.log("Leads API Status:", leadsRes.status);

        if (leadsRes.status === 401 || leadsRes.status === 403) {
          console.warn("Session expired or invalid. Logging out...");
          handleLogout();
          return;
        }

        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeads(prevLeads => {
            const serverMap = new Map(data.map((l: Lead) => [l.id, l]));

            // Keep local leads that haven't hit the server yet
            const locallyAddedLeads = prevLeads.filter(p => !serverMap.has(p.id));

            // Construct new list: server items + local items
            // Then sort by creation date (descending) as before
            return [...data, ...locallyAddedLeads].sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            });
          });
        } else {
          // If the API fails but we are authenticated, don't clear leads immediately
          // as it might be a temporary error.
          console.error("Failed to fetch leads from DB:", leadsRes.statusText);
        }

        // Fetch Current User Profile to sync role
        const profileRes = await fetch('/api/auth/me', { headers });
        console.log("Profile API Status:", profileRes.status);
        if (profileRes.ok) {
          const userData = await profileRes.json();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }

        // Fetch Columns
        const columnsRes = await fetch('/api/columns', { headers });
        console.log("Columns API Status:", columnsRes.status);
        if (columnsRes.ok) {
          const data = await columnsRes.json();
          if (data && data.length > 0) setColumns(data);
        }

        // Fetch Permissions
        const permissionsRes = await fetch('/api/roles/permissions', { headers });
        console.log("Permissions API Status:", permissionsRes.status);
        if (permissionsRes.ok) {
          const data = await permissionsRes.json();
          const permsMap: Record<string, string[]> = {};
          data.forEach((p: any) => {
            // p.permissions is the PermissionLevel object
            if (p.permissions && Array.isArray(p.permissions.features)) {
              const enabledFeatures = p.permissions.features
                .filter((f: any) => f.enabled)
                .map((f: any) => f.id);

              let roleId = (p.role_id || '').toLowerCase();
              if (roleId === 'administrador') roleId = 'admin';
              if (roleId === 'visualizador') roleId = 'viewer';

              permsMap[roleId] = enabledFeatures;
            }
          });
          setRolePermissions(permsMap);
        }
      } catch (e) {
        console.error("Error fetching data", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Registration Filters
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [regFilterType, setRegFilterType] = useState<'all' | 'lead' | 'cliente'>('cliente');
  const [regFilterStatus, setRegFilterStatus] = useState<LeadStatus | 'all'>('all');

  // Dashboard Filters
  const [dateRange, setDateRange] = useState<{ start: string | null, end: string | null, label: string }>({
    start: null,
    end: new Date().toISOString(),
    label: 'Desde o início'
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Documents Filters
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docFilterPendencias, setDocFilterPendencias] = useState(false);
  const [docFilterComPrazo, setDocFilterComPrazo] = useState(false);
  const [docFilterArquivados, setDocFilterArquivados] = useState(false);
  const [docFilterDistribuidos, setDocFilterDistribuidos] = useState(false);
  const [docFilterNaoDistribuidos, setDocFilterNaoDistribuidos] = useState(false);
  const [docFilterTodos, setDocFilterTodos] = useState(true);
  const [showDocFilter, setShowDocFilter] = useState(false);

  // Tasks Filters
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskFilterStatus, setTaskFilterStatus] = useState<'todos' | 'pendente' | 'em_andamento' | 'concluida'>('todos');
  const [taskView, setTaskView] = useState<'list' | 'kanban'>('list');
  // Finance Filters
  const [financeSearchQuery, setFinanceSearchQuery] = useState('');

  const [triggerNewTask, setTriggerNewTask] = useState<number>(0);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  useEffect(() => {
    if (user) {
      console.log("Current User Role:", user.role);
      console.log("Role Permissions Loaded:", Object.keys(rolePermissions).length > 0 ? "Yes" : "No");
    }
  }, [user, rolePermissions]);

  const isFeatureEnabled = useCallback((featureId: string) => {
    if (!user) return false;

    // Normalize role to match permission IDs
    let role = user.role?.toLowerCase();
    if (role === 'administrador') role = 'admin';
    if (role === 'visualizador') role = 'viewer';

    // Admin always has access to everything
    if (role === 'admin') return true;

    // Map view IDs to feature IDs if necessary
    const map: Record<string, string> = {
      'kanban': 'leads',
      'registrations': 'clients',
    };

    const id = map[featureId] || featureId;

    // Special case for settings view
    if (id === 'settings') {
      if (rolePermissions[role]) {
        return rolePermissions[role].includes('access') || rolePermissions[role].includes('integrations');
      }
      // Fallback if permissions not loaded
      if (role === 'editor') return false; // Editor by default doesn't see settings
      if (role === 'viewer') return false;
      return false;
    }

    // If we have dynamic permissions, use them
    if (rolePermissions[role]) {
      return rolePermissions[role].includes(id);
    }

    // Fallback to hardcoded logic if permissions haven't loaded yet
    if (role === 'editor') {
      return ['leads', 'clients', 'tasks', 'documents', 'generator', 'dashboard', 'finance'].includes(id);
    }

    if (role === 'viewer') {
      return ['leads', 'clients', 'dashboard'].includes(id);
    }

    return false;
  }, [user, rolePermissions]);

  // Redirect if current view is not allowed
  useEffect(() => {
    if (isAuthenticated && !isFeatureEnabled(view)) {
      // Find first enabled feature
      const features = ['kanban', 'dashboard', 'registrations', 'documents', 'tasks', 'generator', 'finance', 'settings'];
      const firstEnabled = features.find(f => isFeatureEnabled(f));
      if (firstEnabled) {
        setView(firstEnabled as any);
      }
    }
  }, [view, user, isAuthenticated, isFeatureEnabled]);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const newLeads: Lead[] = Array.from(leads);
    const leadIndex = newLeads.findIndex(l => l.id === draggableId);
    if (leadIndex === -1) return;

    const [removed] = newLeads.splice(leadIndex, 1) as Lead[];
    const oldStatus = removed.status;
    const newStatus = destination.droppableId as LeadStatus;

    // No longer checking for risk of moving out of 'Assinado'

    removed.status = newStatus;

    // Initialize documentData if moved to 'Assinado'
    if (removed.status === 'Assinado' && !removed.documentData) {
      removed.documentData = {
        code: `C${Math.floor(Math.random() * 1000)}`,
        documents: [...DEFAULT_DOCUMENTS],
        observations: [],
        emailSent: false,
        notificationSent: false
      };
    }

    // Insert at new index
    newLeads.push(removed);
    setLeads(newLeads);

    // Update in DB
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/leads/${removed.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(removed)
      });
    } catch (e) {
      console.error("Error updating lead status", e);
    }
  };

  const updateLead = async (updatedLead: Lead, force = false) => {
    const originalLead = leads.find(l => l.id === updatedLead.id);

    // No longer checking for risk of moving out of 'Assinado' via form

    // Keeping documentData even after status change

    // Initialize documentData if moved to 'Assinado'
    if (updatedLead.status === 'Assinado' && !updatedLead.documentData) {
      updatedLead.documentData = {
        code: `C${Math.floor(Math.random() * 1000)}`,
        documents: [...DEFAULT_DOCUMENTS],
        observations: [],
        emailSent: false,
        notificationSent: false
      };
    }

    setLeads(prev => {
      const index = prev.findIndex(l => l.id === updatedLead.id);
      if (index > -1) {
        const next = [...prev];
        next[index] = updatedLead;
        return next;
      }
      // Only add if it's truly a new ID (not just a mismatch)
      return [updatedLead, ...prev];
    });
    if (selectedLead?.id === updatedLead.id) {
      setSelectedLead(updatedLead);
    }

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/leads/${updatedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedLead)
      });
    } catch (e) {
      console.error("Error updating lead", e);
    }
  };

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    if (selectedLead?.id === id) setSelectedLead(null);

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (e) {
      console.error("Error deleting lead", e);
    }
  };

  const handleFinalize = (lead: Lead, contract: ContractData) => {
    setPendingFinalize({ lead, contract });
  };

  const executeFinalize = async () => {
    if (!pendingFinalize) return;
    const { lead, contract } = pendingFinalize;
    const updatedLead = { ...lead, contract };
    
    // Save locally/DB first
    setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l));

    const webhookUrl = "https://n8n.srv1077266.hstgr.cloud/webhook/distratojusto";

    const payload = {
      nome: updatedLead.name,
      profissao: updatedLead.profession,
      dados_cliente: {
        telefone: updatedLead.phone,
        cidade: updatedLead.city,
        estado: updatedLead.state,
        valor_pago: updatedLead.valuePaid,
        tipo_imovel: updatedLead.propertyType,
        corretagem: updatedLead.brokerage,
        atrasos: updatedLead.delays,
        distrato_assinado: updatedLead.signedDistrato,
        proposta: updatedLead.proposal,
        origem: updatedLead.status,
        criado_em: updatedLead.createdAt
      },
      dados_contrato: {
        percentual: contract.percentage,
        formato: contract.format,
        valor_fixo: contract.value,
        metodo_pagamento: contract.paymentMethod,
        parcelas: contract.installments,
        dia_vencimento: contract.dueDate,
        data_primeira_parcela: contract.firstInstallmentDate,
        gerar_cobranca: contract.generateBilling
      },
      notas: updatedLead.notes,
      dados_avancados: {
        dados_pessoais: {
          email: updatedLead.email,
          rg: updatedLead.rg,
          cpf: updatedLead.cpf
        },
        endereco: {
          cep: updatedLead.zipCode,
          logradouro: updatedLead.address,
          bairro: updatedLead.neighborhood,
          cidade: updatedLead.city,
          uf: updatedLead.state
        },
        conjuge: updatedLead.spouseInfo
      }
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setPendingFinalize(null);
        setSelectedLead(null);
        setShowSuccessModal(true);
      } else {
        throw new Error('Falha ao enviar dados para o webhook.');
      }
    } catch (error) {
      console.error('Webhook error:', error);
      alert('Contrato finalizado, mas houve um erro ao enviar os dados para o servidor.');
      setPendingFinalize(null);
      setSelectedLead(null);
    }
  };

  const filteredLeads = leads
    .filter(l => {
      const query = searchQuery.toLowerCase();
      const queryDigits = searchQuery.replace(/\D/g, '');
      const matchesSearch = 
        (l.name || '').toLowerCase().includes(query) ||
        (l.city || '').toLowerCase().includes(query) ||
        (queryDigits !== '' && (l.phone || '').replace(/\D/g, '').includes(queryDigits));
      
      if (view === 'dashboard' && dateRange) {
        const date = new Date(l.createdAt || '');
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end) : null;
        
        if (start && date < start) return false;
        if (end && date > end) return false;
      }

      return matchesSearch;
    })
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

  const addNewLead = async (status: string) => {
    // Generate an ID for local use, but we'll try to sync with server ASAP
    const newLead: Lead = {
      id: uuidv4(),
      name: 'Novo Lead',
      profession: '',
      phone: '',
      city: '',
      state: '',
      valuePaid: 0,
      propertyType: 'Sem construção',
      brokerage: 0,
      delays: 0,
      signedDistrato: 'Não',
      notes: '',
      proposal: 0,
      status,

      createdAt: new Date().toISOString(),
      documentData: status === 'Assinado' ? {
        code: `C${Math.floor(Math.random() * 1000)}`,
        documents: [...DEFAULT_DOCUMENTS],
        observations: [],
        emailSent: false,
        notificationSent: false
      } : undefined
    };

    // Add locally immediately for fast UI response
    setLeads(prev => {
      // Check if by any chance this ID already exists (shouldn't happen with UUID)
      if (prev.some(l => l.id === newLead.id)) return prev;
      return [newLead, ...prev];
    });
    setEditingLead(newLead);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLead)
      });

      if (response.ok) {
        const savedLead = await response.json();
        setLeads(prev => {
          // Replace the temporary lead with the server version
          // Use a Map to quickly filter out the old ID and ensure uniqueness
          const map = new Map();
          prev.forEach(l => {
            if (l.id !== newLead.id) map.set(l.id, l);
          });
          map.set(savedLead.id, savedLead);
          return Array.from(map.values()).sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
        });

        // Update editing state if still active
        setEditingLead(prev => prev?.id === newLead.id ? savedLead : prev);
        setSelectedLead(prev => prev?.id === newLead.id ? savedLead : prev);
      }
    } catch (e) {
      console.error("Error creating lead", e);
    }
  };

  const renameColumn = async (oldName: string, newName: string) => {
    if (!newName || oldName === newName) {
      setEditingColumn(null);
      return;
    }
    setColumns(prev => prev.map(c => c === oldName ? newName : c));
    setLeads(prev => prev.map(l => l.status === oldName ? { ...l, status: newName } : l));
    setEditingColumn(null);

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/columns/${oldName}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newName })
      });
    } catch (e) {
      console.error("Error renaming column", e);
    }
  };

  const addColumn = async () => {
    const name = `Nova Coluna ${columns.length + 1}`;
    setColumns([...columns, name]);

    try {
      const token = localStorage.getItem('token');
      await fetch('/api/columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, order: columns.length + 1 })
      });
    } catch (e) {
      console.error("Error adding column", e);
    }
  };

  const deleteColumn = async (columnName: string) => {
    if (window.confirm(`Deseja excluir a coluna "${columnName}"?`)) {
      setColumns(prev => prev.filter(c => c !== columnName));

      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/columns/${columnName}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.error("Error deleting column", e);
      }
    }
  };

  const getPredefinedRange = (type: string) => {
    const now = new Date();
    switch (type) {
      case 'este mês':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          end: now.toISOString(),
          label: 'Este mês'
        };
      case 'mês anterior':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
          end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString(),
          label: 'Mês anterior'
        };
      case 'este ano':
        return {
          start: new Date(now.getFullYear(), 0, 1).toISOString(),
          end: now.toISOString(),
          label: 'Este ano'
        };
      case 'ano anterior':
        return {
          start: new Date(now.getFullYear() - 1, 0, 1).toISOString(),
          end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString(),
          label: 'Ano anterior'
        };
      case 'desde o início':
      default:
        return { start: null, end: now.toISOString(), label: 'Desde o início' };
    }
  };

  // View label map
  const viewLabels: Record<string, string> = {
    kanban: 'Leads',
    dashboard: 'Dashboard',
    registrations: 'Clientes',
    documents: 'Operação',
    settings: 'Configurações',
    tasks: 'Tarefas',
    generator: 'Gerador de Documentos',
    finance: 'Financeiro',
  };

  return (
    <div className="flex h-screen w-full bg-antique overflow-hidden font-sans text-licorice">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col py-5 border-r text-white transition-all duration-300 relative z-20",
          isSidebarExpanded ? "w-60 px-5" : "w-[72px] items-center px-3"
        )}
        style={{
          background: 'linear-gradient(180deg, #512E2D 0%, #3d2120 100%)',
          borderColor: 'rgba(255,255,255,0.07)',
          boxShadow: '4px 0 24px rgba(26,17,16,0.18)',
        }}
      >
        {/* Logo area */}
        <div className={cn(
          "flex items-center justify-center mb-8",
        )}>
          {isSidebarExpanded ? (
            <img
              src="/assets/images/logo_maior.png"
              alt="Logo Distrato Justo"
              className="h-16 object-contain animate-glow-pulse"
            />
          ) : (
            <img
              src="/assets/images/logo_pequena.png"
              alt="Logo Distrato Justo"
              className="w-9 h-9 object-contain animate-glow-pulse"
            />
          )}
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/8 mb-5" />

        <nav className="flex flex-col gap-1 w-full flex-1">
          {isFeatureEnabled('leads') && (
            <SidebarIcon icon={<Columns size={18} />} label="Leads" active={view === 'kanban'} expanded={isSidebarExpanded} onClick={() => setView('kanban')} />
          )}
          {isFeatureEnabled('clients') && (
            <SidebarIcon icon={<Users size={18} />} label="Clientes" active={view === 'registrations'} expanded={isSidebarExpanded} onClick={() => setView('registrations')} />
          )}
          {isFeatureEnabled('documents') && (
            <SidebarIcon icon={<Activity size={18} />} label="Operação" active={view === 'documents'} expanded={isSidebarExpanded} onClick={() => setView('documents')} />
          )}
          {isFeatureEnabled('finance') && (
            <SidebarIcon icon={<DollarSign size={18} />} label="Financeiro" active={view === 'finance'} expanded={isSidebarExpanded} onClick={() => setView('finance')} />
          )}
          {isFeatureEnabled('tasks') && (
            <SidebarIcon icon={<CheckSquare size={18} />} label="Tarefas" active={view === 'tasks'} expanded={isSidebarExpanded} onClick={() => setView('tasks')} />
          )}
          {isFeatureEnabled('generator') && (
            <SidebarIcon icon={<FilePlus size={18} />} label="Gerador" active={view === 'generator'} expanded={isSidebarExpanded} onClick={() => setView('generator')} />
          )}
          {isFeatureEnabled('dashboard') && (
            <SidebarIcon icon={<LayoutDashboard size={18} />} label="Dashboard" active={view === 'dashboard'} expanded={isSidebarExpanded} onClick={() => setView('dashboard')} />
          )}
          {(isFeatureEnabled('access') || isFeatureEnabled('integrations')) && (
            <SidebarIcon icon={<Settings size={18} />} label="Configurações" active={view === 'settings'} expanded={isSidebarExpanded} onClick={() => setView('settings')} />
          )}
        </nav>

        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className="flex items-center justify-center p-2 rounded-xl cursor-pointer transition-all duration-200 text-white/40 hover:text-white hover:bg-white/8 w-full mb-3"
        >
          {isSidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Divider */}
        <div className="w-full h-px bg-white/8 mb-4" />

        {/* User chip */}
        {isSidebarExpanded ? (
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-xs font-semibold text-white truncate">{user?.name || 'Usuário'}</span>
              <span className="text-[10px] text-white/40 capitalize">{user?.role || 'editor'}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Debug Panel (Only for Admin) */}
        {user?.role === 'admin' && (
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => {
                const win = window.open("", "Debug", "width=600,height=800");
                if (win) {
                  win.document.write(`
                    <html>
                      <head>
                        <title>Supabase Setup SQL</title>
                        <style>
                          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 32px; line-height: 1.6; color: #1a1a1a; background: #fdfcfb; }
                          h2 { color: #512E2D; border-bottom: 2px solid #512E2D; padding-bottom: 8px; }
                          pre { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 12px; overflow-x: auto; font-family: "JetBrains Mono", monospace; font-size: 13px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                          .note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0; border-radius: 4px; }
                          code { background: #eee; padding: 2px 4px; border-radius: 4px; }
                          .btn { display: inline-block; padding: 10px 20px; background: #512E2D; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; cursor: pointer; border: none; }
                        </style>
                      </head>
                      <body>
                        <h2>Supabase Setup SQL</h2>
                        <p>Execute this SQL in your <strong>Supabase SQL Editor</strong> to create the necessary tables for the CRM:</p>
                        
                        <div class="note">
                          <strong>Important:</strong> Make sure you have the <code>uuid-ossp</code> extension enabled in your Supabase project (it's usually enabled by default).
                        </div>

                        <pre>
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  status TEXT DEFAULT 'novo',
  source TEXT,
  value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contact TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  assigned_to UUID,
  tags TEXT[] DEFAULT '{}',
  contract_value NUMERIC DEFAULT 0,
  contract_start_date DATE,
  contract_end_date DATE,
  contract_status TEXT DEFAULT 'pending',
  contract JSONB,
  document_data JSONB,
  financial_record JSONB,
  spouse_name TEXT,
  spouse_cpf TEXT,
  spouse_rg TEXT,
  spouse_phone TEXT,
  spouse_email TEXT,
  archived BOOLEAN DEFAULT false,
  drive TEXT
);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pendente',
  priority TEXT DEFAULT 'media',
  due_date TIMESTAMP WITH TIME ZONE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_to UUID
);

-- 4. Columns Table
CREATE TABLE IF NOT EXISTS columns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  color TEXT
);

-- 5. Roles & Permissions Table
CREATE TABLE IF NOT EXISTS roles_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Insert Initial Admin User (password: password123)
-- Using bcrypt hash for 'password123'
INSERT INTO users (name, email, password, role) 
VALUES ('Admin User', 'admin@crm.com', '$2a$10$Xm8Y.zG6.X6.X6.X6.X6.X6.X6.X6.X6.X6.X6.X6.X6.X6.X6.X6', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 7. Insert Default Kanban Columns
INSERT INTO columns (id, title, "order", color) VALUES
('novo', 'Novo Lead', 0, '#4285F4'),
('contato', 'Em Contato', 1, '#FBBC05'),
('proposta', 'Proposta Enviada', 2, '#34A853'),
('negociacao', 'Em Negociação', 3, '#EA4335'),
('fechado', 'Contrato Assinado', 4, '#10B981'),
('perdido', 'Perdido', 5, '#6B7280')
ON CONFLICT (id) DO NOTHING;
                        </pre>
                        
                        <button class="btn" onclick="window.close()">Close Debug Window</button>
                      </body>
                    </html>
                  `);
                }
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Database size={14} />
              Setup Supabase SQL
            </button>
          </div>
        )}

        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-6 flex-shrink-0 relative z-50"
          style={{
            background: 'rgba(245,242,237,0.85)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(26,17,16,0.08)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.8), 0 2px 8px rgba(26,17,16,0.04)',
          }}
        >
          <div className="flex items-center gap-4 flex-1">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mr-2">
              <span className="font-display font-semibold text-sm text-licorice/80">{viewLabels[view] || view}</span>
            </div>
            {view === 'kanban' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-licorice/30" size={14} />
                <input
                  type="text"
                  placeholder="Buscar leads..."
                  className="pl-9 pr-4 py-2 bg-white/50 border border-licorice/5 rounded-xl text-xs focus:outline-none focus:border-aventurine/50 w-64 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}

            {view === 'registrations' && (
              <div className="flex items-center justify-between w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-licorice/30" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar por nome, CPF ou e-mail..."
                    className="pl-9 pr-4 py-2 bg-white/50 border border-licorice/5 rounded-xl text-xs focus:outline-none focus:border-aventurine/50 w-64 shadow-sm"
                    value={regSearchQuery}
                    onChange={(e) => setRegSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}


            {view === 'documents' && (
              <div className="flex items-center justify-between w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-licorice/30" size={14} />
                  <input
                    type="text"
                    placeholder="Filtrar cliente..."
                    className="pl-9 pr-4 py-2 bg-white/50 border border-licorice/5 rounded-xl text-xs focus:outline-none focus:border-aventurine/50 w-64 shadow-sm"
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowDocFilter(!showDocFilter)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 bg-white/50 border rounded-xl text-xs font-medium transition-all shadow-sm",
                      (docFilterArquivados || docFilterPendencias || docFilterComPrazo || docFilterDistribuidos || docFilterNaoDistribuidos || docFilterTodos)
                        ? "border-licorice/5 text-[#512E2D] shadow-md shadow-[#512E2D]/10 bg-white"
                        : "border-licorice/5 text-licorice/40 hover:bg-white/80"
                    )}
                  >
                    <Filter size={12} />
                    <span>Filtros</span>
                    {(docFilterArquivados || docFilterPendencias || docFilterComPrazo || docFilterDistribuidos || docFilterNaoDistribuidos || docFilterTodos) && (
                      <span className="bg-[#512E2D] text-white text-[10px] px-1.5 rounded-full min-w-[18px]">
                        {[docFilterArquivados, docFilterPendencias, docFilterComPrazo, docFilterDistribuidos, docFilterNaoDistribuidos, docFilterTodos].filter(Boolean).length}
                      </span>
                    )}
                    <ChevronDown size={12} className={cn("transition-transform duration-200", showDocFilter && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {showDocFilter && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setShowDocFilter(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full right-0 mt-3 w-[420px] bg-white rounded-[32px] shadow-2xl border border-licorice/5 z-[100] overflow-hidden"
                        >
                          <div className="p-8">
                            {/* Bloco 1: Todos */}
                            <div className="pb-6 border-b border-licorice/5 mb-6">
                              <label className="flex items-center gap-6 cursor-pointer group">
                                <span className={cn("flex-1 text-[11px] font-bold tracking-[0.05em] transition-colors", docFilterTodos ? "text-[#512E2D]" : "text-licorice/20 group-hover:text-licorice/40")}>Todos</span>
                                <div
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const next = !docFilterTodos;
                                    setDocFilterTodos(next);
                                    if (next) {
                                      setDocFilterArquivados(false);
                                      setDocFilterDistribuidos(false);
                                      setDocFilterNaoDistribuidos(false);
                                      setDocFilterPendencias(false);
                                      setDocFilterComPrazo(false);
                                    }
                                  }}
                                  className={cn(
                                    "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                                    docFilterTodos ? "bg-[#512E2D] border-[#512E2D]" : "border-licorice/10 bg-white group-hover:border-[#512E2D]/30 shadow-inner"
                                  )}
                                >
                                  {docFilterTodos && <Check size={12} className="text-white" />}
                                </div>
                              </label>
                            </div>

                            {/* Bloco 2: Colunas */}
                            <div className="flex gap-10">
                              {/* Coluna Esquerda: Exclusivos */}
                              <div className="flex-1 space-y-5">

                                <label className="flex items-center gap-6 cursor-pointer group">
                                  <span className={cn("flex-1 text-[11px] font-bold transition-colors", docFilterDistribuidos ? "text-[#512E2D]" : "text-licorice/40 group-hover:text-licorice")}>Distribuídos</span>
                                  <div
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setDocFilterDistribuidos(true);
                                      setDocFilterNaoDistribuidos(false);
                                      setDocFilterArquivados(false);
                                      setDocFilterTodos(false);
                                    }}
                                    className={cn(
                                      "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                      docFilterDistribuidos ? "border-[#512E2D] p-0.5" : "border-licorice/10 bg-white"
                                    )}
                                  >
                                    {docFilterDistribuidos && <div className="w-full h-full rounded-full bg-[#512E2D]" />}
                                  </div>
                                </label>

                                <label className="flex items-center gap-6 cursor-pointer group">
                                  <span className={cn("flex-1 text-[11px] font-bold transition-colors", docFilterNaoDistribuidos ? "text-[#512E2D]" : "text-licorice/40 group-hover:text-licorice shadow-none")}>Não Distribuídos</span>
                                  <div
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setDocFilterNaoDistribuidos(true);
                                      setDocFilterDistribuidos(false);
                                      setDocFilterArquivados(false);
                                      setDocFilterTodos(false);
                                    }}
                                    className={cn(
                                      "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                      docFilterNaoDistribuidos ? "border-[#512E2D] p-0.5" : "border-licorice/10 bg-white"
                                    )}
                                  >
                                    {docFilterNaoDistribuidos && <div className="w-full h-full rounded-full bg-[#512E2D]" />}
                                  </div>
                                </label>

                                <label className="flex items-center gap-6 cursor-pointer group">
                                  <span className={cn("flex-1 text-[11px] font-bold transition-colors", docFilterArquivados ? "text-[#512E2D]" : "text-licorice/40 group-hover:text-licorice")}>Arquivados</span>
                                  <div
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setDocFilterArquivados(true);
                                      setDocFilterDistribuidos(false);
                                      setDocFilterNaoDistribuidos(false);
                                      setDocFilterTodos(false);
                                    }}
                                    className={cn(
                                      "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                      docFilterArquivados ? "border-[#512E2D] p-0.5" : "border-licorice/10 bg-white"
                                    )}
                                  >
                                    {docFilterArquivados && <div className="w-full h-full rounded-full bg-[#512E2D]" />}
                                  </div>
                                </label>
                              </div>

                              {/* Divisor vertical */}
                              <div className="w-px bg-licorice/5 self-stretch" />

                              {/* Coluna Direita: Acumulativos */}
                              <div className="space-y-5">

                                <label className="flex items-center gap-6 cursor-pointer group">
                                  <span className={cn("flex-1 text-xs font-medium transition-colors", docFilterPendencias ? "text-[#512E2D]" : "text-licorice/40 group-hover:text-licorice")}>Pendências</span>
                                  <div
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setDocFilterPendencias(!docFilterPendencias);
                                      setDocFilterTodos(false);
                                    }}
                                    className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                      docFilterPendencias ? "bg-[#512E2D] border-[#512E2D]" : "border-licorice/10 bg-white group-hover:border-[#512E2D]/30"
                                    )}
                                  >
                                    {docFilterPendencias && <Check size={10} className="text-white" />}
                                  </div>
                                </label>

                                <label className="flex items-center gap-6 cursor-pointer group">
                                  <span className={cn("flex-1 text-xs font-medium transition-colors", docFilterComPrazo ? "text-[#512E2D]" : "text-licorice/40 group-hover:text-licorice")}>Prazos</span>
                                  <div
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setDocFilterComPrazo(!docFilterComPrazo);
                                      setDocFilterTodos(false);
                                    }}
                                    className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                      docFilterComPrazo ? "bg-[#512E2D] border-[#512E2D]" : "border-licorice/10 bg-white group-hover:border-[#512E2D]/30"
                                    )}
                                  >
                                    {docFilterComPrazo && <Check size={10} className="text-white" />}
                                  </div>
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="bg-antique/30 p-4 px-8 border-t border-licorice/5 flex items-center justify-between">
                            <button
                              onClick={() => {
                                setDocFilterArquivados(false);
                                setDocFilterPendencias(false);
                                setDocFilterComPrazo(false);
                                setDocFilterDistribuidos(false);
                                setDocFilterNaoDistribuidos(false);
                                setDocFilterTodos(true);
                              }}
                              className="text-xs font-medium text-[#512E2D] hover:underline"
                            >
                              Limpar
                            </button>
                            <button
                              onClick={() => setShowDocFilter(false)}
                              className="bg-[#512E2D] text-white px-8 py-2.5 rounded-xl text-xs font-medium shadow-lg shadow-[#512E2D]/20 hover:scale-105 active:scale-95 transition-all"
                            >
                              Aplicar
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {view === 'finance' && (
              <div className="flex items-center justify-between w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-licorice/30" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar por nome, CPF ou e-mail..."
                    className="pl-9 pr-4 py-2 bg-white/50 border border-licorice/5 rounded-xl text-xs focus:outline-none focus:border-aventurine/50 w-64 shadow-sm"
                    value={financeSearchQuery}
                    onChange={(e) => setFinanceSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}

            {view === 'tasks' && (
              <div className="flex items-center justify-between w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-licorice/30" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar tarefas..."
                    className="pl-9 pr-4 py-2 bg-white/50 border border-licorice/5 rounded-xl text-xs focus:outline-none focus:border-aventurine/50 w-64 shadow-sm"
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex bg-white/50 p-0.5 rounded-lg border border-licorice/5">
                    {(['todos', 'pendente', 'em_andamento', 'concluida'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setTaskFilterStatus(status)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                          taskFilterStatus === status ? "bg-aventurine text-white shadow-sm" : "text-licorice/40 hover:text-licorice"
                        )}
                      >
                        {status === 'todos' && 'Todos'}
                        {status === 'pendente' && 'Pendentes'}
                        {status === 'em_andamento' && 'Em andamento'}
                        {status === 'concluida' && 'Concluídas'}
                      </button>
                    ))}
                  </div>
                  <div className="flex bg-white/50 p-0.5 rounded-lg border border-licorice/5">
                    <button
                      onClick={() => setTaskView('list')}
                      className={cn("px-2 py-2 rounded-xl transition-all", taskView === 'list' ? "bg-aventurine text-white shadow-sm" : "text-licorice/40 hover:text-licorice")}
                    >
                      <List size={14} />
                    </button>
                    <button
                      onClick={() => setTaskView('kanban')}
                      className={cn("px-2 py-2 rounded-xl transition-all", taskView === 'kanban' ? "bg-aventurine text-white shadow-sm" : "text-licorice/40 hover:text-licorice")}
                    >
                      <Columns size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => setTriggerNewTask(Date.now())}
                    className="bg-aventurine text-white px-5 py-2 rounded-xl text-xs font-medium shadow-sm hover:bg-aventurine/90 transition-all flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Nova Tarefa
                  </button>
                </div>
              </div>
            )}
          </div>
          {view === 'kanban' && (
            <button
              onClick={addColumn}
              className="bg-aventurine text-white px-5 py-2 rounded-xl text-xs font-medium shadow-sm hover:bg-aventurine/90 transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              Nova Coluna
            </button>
          )}

          {(view === 'dashboard' || view === 'finance') && (
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 px-4 py-2 bg-white/50 border border-licorice/5 rounded-xl text-xs font-medium text-licorice/60 hover:bg-white/80 transition-all min-w-[150px] whitespace-nowrap"
              >
                <Calendar size={14} />
                <span>{dateRange.label}</span>
                <ChevronDown size={14} />
              </button>

              <AnimatePresence>
                {showDatePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-licorice/5 z-[100] overflow-hidden"
                  >
                    <div className="flex flex-col">
                      {['este mês', 'mês anterior', 'este ano', 'ano anterior', 'desde o início'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setDateRange(getPredefinedRange(opt));
                            setShowDatePicker(false);
                          }}
                          className="px-4 py-2 text-left text-xs hover:bg-antique/50 transition-colors capitalize"
                        >
                          {opt}
                        </button>
                      ))}
                      <div className="border-t border-licorice/5 p-2 flex flex-col gap-2">
                        <p className="text-[9px] font-bold uppercase text-licorice/30 px-2">Personalizado</p>
                        <div className="flex flex-col gap-1 px-2">
                          <input
                            type="date"
                            className="text-[10px] border border-licorice/5 rounded p-1 outline-none"
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value).toISOString() : null, label: 'Personalizado' }))}
                          />
                          <input
                            type="date"
                            className="text-[10px] border border-licorice/5 rounded p-1 outline-none"
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value).toISOString() : null, label: 'Personalizado' }))}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-licorice/40 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
            title="Sair"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'kanban' ? (
            <div className="flex-1 h-full overflow-x-auto p-5 no-scrollbar">
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-3.5 h-full">
                  {columns.filter(c => c !== 'Assinado' && c !== 'Churn').map((column) => (
                    <Droppable key={column} droppableId={column}>
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="kanban-column"
                        >
                          {/* Column header with left accent strip */}
                          <div className="flex items-center justify-between px-4 py-3 group/col border-b border-licorice/6">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              {/* Status dot */}
                              <span 
                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                style={{ background: STATUS_COLORS[column] || '#A0522D', opacity: 1 }} 
                              />
                              {editingColumn === column ? (
                                <input
                                  autoFocus
                                  className="text-[11px] font-bold uppercase tracking-wider text-licorice bg-antique border border-aventurine/40 rounded-lg px-2 py-0.5 outline-none w-full"
                                  defaultValue={column}
                                  onBlur={(e) => renameColumn(column, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') renameColumn(column, e.currentTarget.value);
                                    if (e.key === 'Escape') setEditingColumn(null);
                                  }}
                                />
                              ) : (
                                <h2
                                  onClick={() => setEditingColumn(column)}
                                  className="text-[11px] font-bold uppercase tracking-wider text-licorice/50 cursor-pointer hover:text-licorice transition-colors truncate"
                                >
                                  {column}
                                </h2>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-licorice/40 bg-licorice/8 px-2 py-0.5 rounded-full">
                                {filteredLeads.filter(l => l.status === column).length}
                              </span>
                              <button
                                onClick={() => addNewLead(column)}
                                className="p-1 text-licorice/25 hover:text-aventurine hover:bg-aventurine/10 rounded-lg transition-all"
                                title="Adicionar Lead"
                              >
                                <Plus size={12} />
                              </button>
                              <button
                                onClick={() => deleteColumn(column)}
                                className="p-1 text-licorice/25 hover:text-exotic hover:bg-exotic/8 rounded-lg transition-all opacity-0 group-hover/col:opacity-100"
                                title="Excluir Coluna"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2.5 no-scrollbar flex flex-col gap-2.5">
                            {filteredLeads
                              .filter(l => l.status === column)
                              .map((lead, index) => (
                                <LeadCard
                                  key={lead.id}
                                  lead={lead}
                                  index={index}
                                  onClick={() => setSelectedLead(lead)}
                                  onEdit={() => setEditingLead(lead)}
                                />
                              ))}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </DragDropContext>
            </div>
          ) : view === 'dashboard' ? (
            <Dashboard leads={filteredLeads} />
          ) : view === 'documents' ? (
            <Documents
              leads={leads}
              onUpdateLead={updateLead}
              onDeleteLead={deleteLead}
              onEditLead={setEditingLead}
              searchQuery={docSearchQuery}
              filterPendencias={docFilterPendencias}
              filterComPrazo={docFilterComPrazo}
              filterArquivados={docFilterArquivados}
              filterDistribuidos={docFilterDistribuidos}
              filterNaoDistribuidos={docFilterNaoDistribuidos}
              filterTodos={docFilterTodos}
            />
          ) : view === 'registrations' ? (
            <Registrations
              leads={leads}
              columns={columns}
              onUpdate={updateLead}
              onDelete={deleteLead}
              onEdit={setEditingLead}
              externalFilters={{
                searchQuery: regSearchQuery,
                filterType: regFilterType,
                filterStatus: regFilterStatus
              }}
            />
          ) : view === 'tasks' ? (
            <Tasks
              leads={leads}
              externalFilters={{
                searchQuery: taskSearchQuery,
                filterStatus: taskFilterStatus,
                view: taskView,
                triggerNewTask
              }}
              onTriggerConsumed={() => setTriggerNewTask(0)}
            />
          ) : view === 'generator' ? (
            <DocumentGenerator leads={leads} />
          ) : view === 'finance' ? (
            <Finance
              leads={leads}
              onUpdate={updateLead}
              externalFilters={{
                searchQuery: financeSearchQuery,
                dateRange: dateRange
              }}
            />
          ) : (
            <SettingsView
              onLogout={handleLogout}
              user={user}
              isFeatureEnabled={isFeatureEnabled}
              onUpdateUser={(updatedUser) => {
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
              }}
            />
          )}
        </div>
      </main>

      {/* Global Sidebar */}
      <EditLeadSidebar
        lead={editingLead}
        columns={columns}
        onClose={() => setEditingLead(null)}
        onUpdate={updateLead}
        onDelete={(id) => {
          deleteLead(id);
          if (selectedLead?.id === id) setSelectedLead(null);
        }}
      />

      {/* Modals */}
      <AnimatePresence>
        {selectedLead && (
          <UnifiedLeadModal
            lead={selectedLead}
            columns={columns}
            onClose={() => setSelectedLead(null)}
            onUpdate={updateLead}
            onDelete={(id) => {
              setShowDeleteConfirm(id);
            }}
            onAdvanced={() => setEditingLead(selectedLead)}
            onFinalize={(contract) => handleFinalize(selectedLead, contract)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <DeleteConfirmModal
            onClose={() => setShowDeleteConfirm(null)}
            onConfirm={() => {
              deleteLead(showDeleteConfirm);
              setShowDeleteConfirm(null);
              if (selectedLead?.id === showDeleteConfirm) setSelectedLead(null);
              if (editingLead?.id === showDeleteConfirm) setEditingLead(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingFinalize && (
          <FinalizeConfirmModal
            onClose={() => setPendingFinalize(null)}
            onConfirm={executeFinalize}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessModal && (
          <SuccessModal
            onClose={() => setShowSuccessModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DeleteConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(26,17,16,0.35)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="bg-white w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center gap-6"
        style={{ boxShadow: '0 24px 64px rgba(26,17,16,0.22), 0 0 0 1px rgba(26,17,16,0.06)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,99,33,0.1)' }}>
          <AlertCircle size={28} className="text-exotic" />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-licorice">Excluir Registro?</h3>
          <p className="text-sm text-licorice/50 mt-2 leading-relaxed">Esta ação não pode ser desfeita. Todos os dados deste lead serão perdidos permanentemente.</p>
        </div>
        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-licorice/40 hover:text-licorice bg-antique/40 hover:bg-antique rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 text-white text-sm font-bold rounded-xl transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#FF6321', boxShadow: '0 4px 12px rgba(255,99,33,0.3)' }}
          >
            Sim, Excluir
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FinalizeConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(26,17,16,0.35)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="bg-white w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center gap-6"
        style={{ boxShadow: '0 24px 64px rgba(26,17,16,0.22), 0 0 0 1px rgba(26,17,16,0.06)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(46,125,50,0.1)' }}>
          <FilePlus size={28} className="text-aventurine" />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-licorice">Gerar Contrato?</h3>
          <p className="text-sm text-licorice/50 mt-2 leading-relaxed">Os dados serão salvos e enviados para o processamento do contrato.</p>
        </div>
        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-licorice/40 hover:text-licorice bg-antique/40 hover:bg-antique rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 text-white text-sm font-bold rounded-xl transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#2E7D32', boxShadow: '0 4px 12px rgba(46,125,50,0.3)' }}
          >
            Sim, Gerar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(26,17,16,0.35)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="bg-white w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center gap-6"
        style={{ boxShadow: '0 24px 64px rgba(26,17,16,0.22), 0 0 0 1px rgba(26,17,16,0.06)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(46,125,50,0.1)' }}>
          <Check size={28} className="text-aventurine" />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-licorice">Sucesso!</h3>
          <p className="text-sm text-licorice/50 mt-2 leading-relaxed">O contrato foi gerado e os dados foram enviados com sucesso para o webhook.</p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 text-white text-sm font-bold rounded-xl transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#2E7D32', boxShadow: '0 4px 12px rgba(46,125,50,0.3)' }}
        >
          Entendido
        </button>
      </motion.div>
    </motion.div>
  );
}


function SidebarIcon({ icon, label, active = false, expanded = false, onClick }: { icon: React.ReactNode; label?: string; active?: boolean; expanded?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      title={!expanded ? label : undefined}
      className={cn(
        "relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-200 select-none group",
        !expanded && "justify-center",
        active
          ? "text-white"
          : "text-white/50 hover:text-white hover:bg-white/8"
      )}
      style={active ? {
        background: 'rgba(255,255,255,0.14)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 3px rgba(0,0,0,0.2)',
      } : {}}
    >
      {/* Active left indicator */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
          style={{ background: 'rgba(255,255,255,0.7)' }}
        />
      )}
      <div className="flex-shrink-0">{icon}</div>
      {expanded && (
        <span className={cn(
          "text-[13px] font-medium whitespace-nowrap overflow-hidden",
          active ? "text-white" : "text-white/50 group-hover:text-white"
        )}>
          {label}
        </span>
      )}
    </div>
  );
}

function LeadCard({ lead, index, onClick, onEdit }: { lead: Lead; index: number; onClick: () => void; onEdit: () => void; key?: string }) {
  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => {
        const card = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={onClick}
            className={cn(
              "group relative cursor-pointer rounded-xl transition-shadow duration-150",
              snapshot.isDragging && "z-[9999]"
            )}
            style={{
              ...provided.draggableProps.style,
              background: snapshot.isDragging ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(26,17,16,0.08)',
              boxShadow: snapshot.isDragging
                ? '0 12px 32px rgba(26,17,16,0.18), 0 4px 8px rgba(26,17,16,0.10), 0 0 0 1px rgba(77,42,41,0.15)'
                : '0 1px 3px rgba(26,17,16,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
              // Ensure the card keeps its width when portaled
              width: snapshot.isDragging ? '270px' : provided.draggableProps.style?.width,
              pointerEvents: 'auto',
            }}
          >
            {/* Hover lift effect handled via CSS transition */}
            <div className="p-3.5">
              <div className="flex justify-between items-start mb-2.5">
                <h3 className="text-sm font-semibold leading-snug text-licorice group-hover:text-aventurine transition-colors duration-150 pr-6">
                  {lead.name}
                </h3>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="absolute top-3 right-3 p-1.5 text-licorice/20 hover:text-aventurine hover:bg-aventurine/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Pencil size={11} />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-licorice/40">
                  <Phone size={10} className="flex-shrink-0" />
                  <span className="truncate">{lead.phone ? formatPhone(lead.phone) : '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-licorice/40">
                  <MapPin size={10} className="flex-shrink-0" />
                  <span className="truncate">{lead.city ? `${lead.city}${lead.state ? '/' + lead.state : ''}` : '—'}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-licorice/6 flex justify-between items-center">
                <span className="text-xs font-bold font-mono text-aventurine">{formatCurrency(lead.valuePaid)}</span>
                <span className="inline-flex items-center text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(26,17,16,0.06)', color: 'rgba(26,17,16,0.40)' }}>
                  {lead.propertyType}
                </span>
              </div>
            </div>
          </div>
        );

        if (snapshot.isDragging) {
          return createPortal(card, document.body);
        }

        return card;
      }}
    </Draggable>
  );
}

function UnifiedLeadModal({ lead, columns, onClose, onUpdate, onDelete, onAdvanced, onFinalize }: {
  lead: Lead;
  columns: string[];
  onClose: () => void;
  onUpdate: (l: Lead) => void;
  onDelete: (id: string) => void;
  onAdvanced: () => void;
  onFinalize: (c: ContractData) => void;
}) {
  const [localLead, setLocalLead] = useState(lead);
  const [contract, setContract] = useState<ContractData>(lead.contract || {
    percentage: 20,
    format: 'Parcelado',
    value: 1200,
    paymentMethod: 'Boleto Bancário',
    installments: 12,
    dueDate: 10,
    firstInstallmentDate: new Date().toISOString().split('T')[0],
    generateBilling: true
  });

  useEffect(() => {
    setLocalLead(lead);
    if (lead.contract) setContract(lead.contract);
  }, [lead]);

  const handleChange = (field: keyof Lead, value: any) => {
    setLocalLead(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = () => {
    onUpdate({ ...localLead, contract });
  };

  const handleClose = () => {
    onUpdate({ ...localLead, contract });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-licorice/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <motion.div
        layout
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 bg-aventurine text-white flex justify-between items-center">
          <div className="flex-1 mr-4">
            <input
              className="text-lg font-bold bg-transparent border-none focus:outline-none w-full text-white placeholder:text-white/50"
              value={localLead.name}
              onChange={e => handleChange('name', e.target.value)}
              onBlur={handleBlur}
              placeholder="Nome do Lead"
            />
            <input
              className="text-xs opacity-80 bg-transparent border-none focus:outline-none w-full text-white placeholder:text-white/50"
              value={localLead.profession}
              onChange={e => handleChange('profession', e.target.value)}
              onBlur={handleBlur}
              placeholder="Profissão"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onFinalize(contract)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title="Gerar Contrato"
            >
              <FilePlus size={20} />
            </button>
            <button
              onClick={() => {
                onUpdate({ ...localLead, contract });
                onAdvanced();
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title="Dados Avançados"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => onDelete(localLead.id)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              title="Excluir Registro"
            >
              <Trash2 size={18} />
            </button>

          </div>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-200px)] no-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column: Basic Data */}
            <div className="space-y-6 border-r border-licorice/10 pr-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-licorice/40 border-b border-licorice/5 pb-2">Dados do Cliente</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Telefone</label>
                  <div className="flex gap-2">
                    <input
                      className="input-field w-3/4"
                      value={formatPhone(localLead.phone)}
                      onChange={e => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                      onBlur={handleBlur}
                    />
                    {localLead.phone && (
                      <a
                        href={`https://wa.me/55${localLead.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center shadow-lg shadow-green-500/20"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
                <QuickField label="Cidade/UF" value={`${localLead.city}${localLead.state ? '/' + localLead.state : ''}`} onChange={v => {
                  const [city, state] = v.split('/');
                  handleChange('city', city || '');
                  handleChange('state', state || '');
                }} onBlur={handleBlur} />

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Valor Pago</label>
                  <input
                    className="input-field font-mono"
                    value={formatCurrency(localLead.valuePaid)}
                    onChange={e => handleChange('valuePaid', parseCurrency(e.target.value))}
                    onBlur={handleBlur}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Tipo de Imóvel</label>
                  <div className="relative">
                    <select
                      className="input-field appearance-none pr-10"
                      value={localLead.propertyType}
                      onChange={e => {
                        handleChange('propertyType', e.target.value);
                        onUpdate({ ...localLead, propertyType: e.target.value, contract });
                      }}
                    >
                      <option>Sem construção</option>
                      <option>Com construção</option>
                      <option>Planta</option>
                      <option>Imóvel Pronto</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-licorice/40 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Corretagem</label>
                  <input
                    className="input-field font-mono"
                    value={formatCurrency(localLead.brokerage)}
                    onChange={e => handleChange('brokerage', parseCurrency(e.target.value))}
                    onBlur={handleBlur}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Atrasos (Meses)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={localLead.delays}
                    onChange={e => handleChange('delays', Number(e.target.value))}
                    onBlur={handleBlur}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Distrato Assinado</label>
                  <div className="relative">
                    <select
                      className="input-field appearance-none pr-10"
                      value={localLead.signedDistrato}
                      onChange={e => {
                        handleChange('signedDistrato', e.target.value);
                        onUpdate({ ...localLead, signedDistrato: e.target.value, contract });
                      }}
                    >
                      <option>Sim</option>
                      <option>Não</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-licorice/40 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Proposta</label>
                  <input
                    className="input-field font-mono"
                    value={formatCurrency(localLead.proposal)}
                    onChange={e => handleChange('proposal', parseCurrency(e.target.value))}
                    onBlur={handleBlur}
                  />
                </div>

              </div>
            </div>

            {/* Right Column: Contract Data */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-licorice/40 border-b border-licorice/5 pb-2">Dados do Contrato</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Porcentagem (%)</label>
                  <input
                    className="input-field font-mono"
                    value={formatPercent(contract.percentage)}
                    onChange={e => setContract({ ...contract, percentage: Number(e.target.value.replace(/\D/g, '')) })}
                    onBlur={handleBlur}
                  />
                </div>
                  <div className="relative flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Formato</label>
                    <div className="relative">
                      <select
                        className="input-field appearance-none pr-10"
                        value={contract.format}
                        onChange={e => {
                          const format = e.target.value;
                          let newContract = { ...contract, format };
                          if (format === 'Isento' || format === 'Ao Final') {
                            newContract = {
                              ...newContract,
                              value: 0,
                              paymentMethod: '',
                              installments: 0,
                              dueDate: 0,
                              firstInstallmentDate: '',
                              generateBilling: false
                            };
                          }
                          setContract(newContract);
                          onUpdate({ ...localLead, contract: newContract });
                        }}
                      >
                        <option>Parcelado</option>
                        <option>Ao Final</option>
                        <option>Isento</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-licorice/40 pointer-events-none" size={16} />
                    </div>
                  </div>

                {/* Other contract fields - disabled if format is Isento or Ao Final */}
                <div className={cn("flex flex-col gap-1", (contract.format === 'Isento' || contract.format === 'Ao Final') && "opacity-40 pointer-events-none")}>
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Valor (R$)</label>
                  <input
                    disabled={contract.format === 'Isento' || contract.format === 'Ao Final'}
                    className="input-field font-mono"
                    value={contract.format === 'Isento' || contract.format === 'Ao Final' ? '' : formatCurrency(contract.value)}
                    onChange={e => setContract({ ...contract, value: parseCurrency(e.target.value) })}
                    onBlur={handleBlur}
                  />
                </div>
                <div className={cn("flex flex-col gap-1", (contract.format === 'Isento' || contract.format === 'Ao Final') && "opacity-40 pointer-events-none")}>
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Meio de Pagamento</label>
                  <div className="relative">
                    <select
                      disabled={contract.format === 'Isento' || contract.format === 'Ao Final'}
                      className="input-field appearance-none pr-10"
                      value={contract.paymentMethod}
                      onChange={e => {
                        const newContract = { ...contract, paymentMethod: e.target.value };
                        setContract(newContract);
                        onUpdate({ ...localLead, contract: newContract });
                      }}
                    >
                      <option value="">Selecione...</option>
                      <option>Boleto Bancário</option>
                      <option>Cartão de Crédito</option>
                      <option>PIX</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-licorice/40 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className={cn("flex flex-col gap-1", (contract.format === 'Isento' || contract.format === 'Ao Final') && "opacity-40 pointer-events-none")}>
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Parcelas</label>
                  <input
                    disabled={contract.format === 'Isento' || contract.format === 'Ao Final'}
                    type="number"
                    className="input-field"
                    value={contract.format === 'Isento' || contract.format === 'Ao Final' ? '' : contract.installments}
                    onChange={e => setContract({ ...contract, installments: Number(e.target.value) })}
                    onBlur={handleBlur}
                  />
                </div>
                <div className={cn("flex flex-col gap-1", (contract.format === 'Isento' || contract.format === 'Ao Final') && "opacity-40 pointer-events-none")}>
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Vencimento (Dia)</label>
                  <input
                    disabled={contract.format === 'Isento' || contract.format === 'Ao Final'}
                    type="number"
                    className="input-field"
                    value={contract.format === 'Isento' || contract.format === 'Ao Final' ? '' : contract.dueDate}
                    onChange={e => setContract({ ...contract, dueDate: Number(e.target.value) })}
                    onBlur={handleBlur}
                  />
                </div>
                <div className={cn("flex flex-col gap-1", (contract.format === 'Isento' || contract.format === 'Ao Final') && "opacity-40 pointer-events-none")}>
                  <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Data 1ª Parcela</label>
                  <input
                    disabled={contract.format === 'Isento' || contract.format === 'Ao Final'}
                    type="date"
                    className="input-field"
                    value={contract.firstInstallmentDate}
                    onChange={e => setContract({ ...contract, firstInstallmentDate: e.target.value })}
                    onBlur={handleBlur}
                  />
                </div>
                <div className={cn("flex items-center justify-between pt-4", (contract.format === 'Isento' || contract.format === 'Ao Final') && "opacity-40 pointer-events-none")}>
                  <span className="text-xs font-bold text-licorice/60">Gerar Cobrança</span>
                  <motion.button
                    disabled={contract.format === 'Isento' || contract.format === 'Ao Final'}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      const newContract = { ...contract, generateBilling: !contract.generateBilling };
                      setContract(newContract);
                      onUpdate({ ...localLead, contract: newContract });
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative",
                      contract.generateBilling ? "bg-aventurine" : "bg-licorice/10"
                    )}
                  >
                    <motion.div
                      layout
                      className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        contract.generateBilling ? "right-1" : "left-1"
                      )}
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Notas</label>
            <textarea
              className="input-field min-h-[80px] resize-none"
              value={localLead.notes}
              onChange={e => handleChange('notes', e.target.value)}
              onBlur={handleBlur}
              placeholder="Observações importantes..."
            />
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
function QuickField({ label, value, onChange, onBlur, type = "text" }: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  onBlur: () => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">{label}</label>
      <input
        type={type}
        className="input-field"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}


