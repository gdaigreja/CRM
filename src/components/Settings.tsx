import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Globe, Terminal, Copy, Check, User, Users, Share2, Plus, Key, Mail, Lock, ShieldCheck, X, Trash2, AlertCircle, ChevronDown, Eye, EyeOff, LogOut } from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initial: string;
}

interface PermissionLevel {
  id: string;
  title: string;
  desc: string;
  color: string;
  features: {
    id: string;
    label: string;
    enabled: boolean;
  }[];
}

const INITIAL_PERMISSIONS: PermissionLevel[] = [
  { 
    id: 'admin',
    title: 'Administrador', 
    desc: 'Acesso total a todas as funções e configurações.', 
    color: 'bg-aventurine',
    features: [
      { id: 'leads', label: 'Leads', enabled: true },
      { id: 'clients', label: 'Clientes', enabled: true },
      { id: 'documents', label: 'Documentos', enabled: true },
      { id: 'tasks', label: 'Tarefas', enabled: true },
      { id: 'generator', label: 'Gerador', enabled: true },
      { id: 'dashboard', label: 'Dashboard', enabled: true },
      { id: 'access', label: 'Acessos', enabled: true },
      { id: 'integrations', label: 'Integrações', enabled: true },
      { id: 'finance', label: 'Financeiro', enabled: true },
    ]
  },
  { 
    id: 'editor',
    title: 'Editor', 
    desc: 'Pode gerenciar leads e documentos, mas não configurações.', 
    color: 'bg-licorice/60',
    features: [
      { id: 'leads', label: 'Leads', enabled: true },
      { id: 'clients', label: 'Clientes', enabled: true },
      { id: 'documents', label: 'Documentos', enabled: true },
      { id: 'tasks', label: 'Tarefas', enabled: true },
      { id: 'generator', label: 'Gerador', enabled: true },
      { id: 'dashboard', label: 'Dashboard', enabled: true },
      { id: 'access', label: 'Acessos', enabled: false },
      { id: 'integrations', label: 'Integrações', enabled: false },
      { id: 'finance', label: 'Financeiro', enabled: true },
    ]
  },
  { 
    id: 'viewer',
    title: 'Visualizador', 
    desc: 'Acesso apenas para leitura de dados e relatórios.', 
    color: 'bg-licorice/20',
    features: [
      { id: 'leads', label: 'Leads', enabled: true },
      { id: 'clients', label: 'Clientes', enabled: true },
      { id: 'documents', label: 'Documentos', enabled: false },
      { id: 'tasks', label: 'Tarefas', enabled: false },
      { id: 'generator', label: 'Gerador', enabled: false },
      { id: 'dashboard', label: 'Dashboard', enabled: true },
      { id: 'access', label: 'Acessos', enabled: false },
      { id: 'integrations', label: 'Integrações', enabled: false },
      { id: 'finance', label: 'Financeiro', enabled: false },
    ]
  },
];

export default function Settings({ onLogout, user, isFeatureEnabled, onUpdateUser }: { 
  onLogout: () => void, 
  user: any,
  isFeatureEnabled: (id: string) => boolean,
  onUpdateUser?: (user: any) => void
}) {
  const [activeTab, setActiveTab] = useState<'perfil' | 'acesso' | 'integracao'>('perfil');
  const [copied, setCopied] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionLevel[]>(INITIAL_PERMISSIONS);
  const [editingPermission, setEditingPermission] = useState<PermissionLevel | null>(null);
  const [isNewLevelModalOpen, setIsNewLevelModalOpen] = useState(false);
  const [newLevel, setNewLevel] = useState({ title: '', desc: '', color: 'bg-aventurine' });
  
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
  }, []);

  const handleUpdateProfile = async () => {
    if (profileNewPassword && profileNewPassword !== profileConfirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = { name: profileName };
      if (profileNewPassword) payload.password = profileNewPassword;

      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        alert("Perfil atualizado com sucesso!");
        setProfileNewPassword('');
        setProfileConfirmPassword('');
        if (onUpdateUser && data.user) {
          onUpdateUser(data.user);
        }
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao atualizar perfil");
      }
    } catch (e) {
      console.error("Error updating profile", e);
      alert("Erro ao atualizar perfil");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/roles/permissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          // Map the data back to PermissionLevel[]
          // We assume the data is stored as { role_id, permissions: PermissionLevel }
          const perms = data.map((p: any) => p.permissions);
          setPermissions(perms);
        }
      }
    } catch (e) {
      console.error("Error fetching permissions", e);
    }
  };

  const savePermission = async (perm: PermissionLevel) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/roles/permissions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          role_id: perm.id,
          permissions: perm
        })
      });
      if (response.ok) {
        // Refresh local state
        setPermissions(prev => prev.map(p => p.id === perm.id ? perm : p));
      }
    } catch (e) {
      console.error("Error saving permission", e);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Map data to include 'initial' if not present
        const mappedUsers = data.map((u: any) => ({
          ...u,
          initial: u.initial || u.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        }));
        setUsers(mappedUsers);
      }
    } catch (e) {
      console.error("Error fetching users", e);
    } finally {
      setIsLoading(false);
    }
  };

  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isConfirmActionModalOpen, setIsConfirmActionModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'viewer', password: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const [isLeadEndpointOpen, setIsLeadEndpointOpen] = useState(false);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleOpenConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmAction({ title, message, onConfirm });
    setIsConfirmActionModalOpen(true);
  };

  const handleCreateUser = async () => {
    const userPayload = {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      password: newUser.password || '123456'
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userPayload)
      });

      if (response.ok) {
        fetchUsers();
        setIsNewUserModalOpen(false);
        setNewUser({ name: '', email: '', role: 'viewer', password: '' });
      }
    } catch (e) {
      console.error("Error creating user", e);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (response.ok) {
        setIsChangePasswordModalOpen(false);
        setNewPassword('');
        setSelectedUser(null);
      }
    } catch (e) {
      console.error("Error changing password", e);
    }
  };

  const handleDeleteUser = (user: SystemUser) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (selectedUser) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          setUsers(users.filter(u => u.id !== selectedUser.id));
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
        }
      } catch (e) {
        console.error("Error deleting user", e);
      }
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    // Prevent deleting core roles if needed, or just follow user request
    handleOpenConfirm(
      "Excluir Nível de Acesso?",
      "Esta ação removerá permanentemente este nível de permissão. Usuários vinculados a este nível podem perder acesso.",
      async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/roles/permissions/${levelId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setPermissions(prev => prev.filter(p => p.id !== levelId));
            setIsConfirmActionModalOpen(false);
          } else {
            const err = await response.json();
            alert(err.error || "Erro ao excluir nível");
          }
        } catch (e) {
          console.error("Error deleting level", e);
          alert("Erro ao excluir nível");
        }
      }
    );
  };

  const handleCreateLevel = async () => {
    if (!newLevel.title) return;
    
    const levelId = newLevel.title.toLowerCase().replace(/\s+/g, '_');
    const newPerm: PermissionLevel = {
      id: levelId,
      title: newLevel.title,
      desc: newLevel.desc,
      color: newLevel.color,
      features: INITIAL_PERMISSIONS[0].features.map(f => ({ ...f, enabled: false }))
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/roles/permissions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          role_id: levelId,
          permissions: newPerm
        })
      });
      if (response.ok) {
        setPermissions(prev => [...prev, newPerm]);
        setIsNewLevelModalOpen(false);
        setNewLevel({ title: '', desc: '', color: 'bg-aventurine' });
      }
    } catch (e) {
      console.error("Error creating level", e);
    }
  };
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (e) {
      console.error("Error updating role", e);
    }
  };

  const apiKey = "distrato-justo-n8n-key-2026";
  const webhookUrl = `${window.location.origin}/api/leads/webhook`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const n8nExample = `{
  "nome": "João Silva",
  "profissao": "Engenheiro",
  "telefone": "11999999999",
  "cidade_uf": "São Paulo/SP",
  "valor_pago": 50000,
  "tipo_imovel": "Apartamento",
  "corretagem": 3000,
  "atrasos": "3 meses",
  "email": "joao@email.com",
  "rg": "12.345.678-9",
  "cpf": "123.456.789-00",
  "cep": "01234-567",
  "logradouro": "Rua Exemplo",
  "bairro": "Centro",
  "origem": "Meta Ads",
  "projeto": "Distrato Justo"
}`;

  const curlCommand = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '${n8nExample.replace(/\s+/g, ' ')}'`;

  return (
    <div className="flex-1 h-full p-8 overflow-y-auto bg-antique/20">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-licorice/5 w-fit">
            <button
              onClick={() => setActiveTab('perfil')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'perfil' 
                  ? "bg-aventurine text-white shadow-md" 
                  : "text-licorice/40 hover:text-licorice hover:bg-antique/50"
              )}
            >
              <User size={14} />
              Perfil
            </button>
            {isFeatureEnabled('access') && (
              <button
                onClick={() => setActiveTab('acesso')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  activeTab === 'acesso' 
                    ? "bg-aventurine text-white shadow-md" 
                    : "text-licorice/40 hover:text-licorice hover:bg-antique/50"
                )}
              >
                <Users size={14} />
                Acessos
              </button>
            )}
            {isFeatureEnabled('integrations') && (
              <button
                onClick={() => setActiveTab('integracao')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  activeTab === 'integracao' 
                    ? "bg-aventurine text-white shadow-md" 
                    : "text-licorice/40 hover:text-licorice hover:bg-antique/50"
                )}
              >
                <Share2 size={14} />
                Integrações
              </button>
            )}
          </div>
        </div>

        {activeTab === 'perfil' && (
          <div className="bg-white p-8 rounded-3xl border border-licorice/5 shadow-sm space-y-10">
            {/* Form Fields */}
            <div className="space-y-8">
              {/* Dados Cadastrais */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-aventurine">
                  <User size={20} />
                  <h2 className="font-bold uppercase tracking-widest text-xs">Dados Cadastrais</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-licorice/20" size={16} />
                      <input 
                        type="text" 
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-licorice/20" size={16} />
                      <input 
                        type="email" 
                        value={profileEmail}
                        disabled
                        className="w-full pl-12 pr-4 py-3 bg-antique/10 border border-licorice/5 rounded-xl text-sm focus:outline-none cursor-not-allowed opacity-60"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Alterar Senha */}
              <div className="space-y-6 pt-8 border-t border-licorice/5">
                <div className="flex items-center gap-3 text-aventurine">
                  <Lock size={20} />
                  <h2 className="font-bold uppercase tracking-widest text-xs">Alterar Senha</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nova Senha</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={profileNewPassword}
                      onChange={(e) => setProfileNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Confirmar Senha</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      value={profileConfirmPassword}
                      onChange={(e) => setProfileConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-licorice/5">
              <button 
                onClick={handleUpdateProfile}
                disabled={isUpdatingProfile}
                className="bg-aventurine text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-aventurine/20 hover:bg-aventurine/90 transition-all disabled:opacity-50"
              >
                {isUpdatingProfile ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'acesso' && (
          <div className="space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-licorice/5 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-aventurine">
                  <ShieldCheck size={20} />
                  <h2 className="font-bold uppercase tracking-widest text-xs">Níveis de Permissão</h2>
                </div>
                <button 
                  onClick={() => setIsNewLevelModalOpen(true)}
                  className="flex items-center gap-2 bg-aventurine text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-aventurine/90 transition-all"
                >
                  <Plus size={14} />
                  Novo Nível
                </button>
              </div>

              <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
                <div className="flex gap-6 min-w-max pb-4">
                  {permissions.map((level) => (
                    <div key={level.id} className="relative group">
                      <button 
                        onClick={() => setEditingPermission(level)}
                        className="p-6 rounded-2xl border border-licorice/5 space-y-3 hover:border-aventurine/20 transition-all group text-left w-80 flex-shrink-0 h-full"
                      >
                        <div className={cn("w-2 h-2 rounded-full", level.color)} />
                        <h3 className="font-bold text-licorice text-sm">{level.title}</h3>
                        <p className="text-[11px] text-licorice/60 leading-relaxed">{level.desc}</p>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLevel(level.id);
                        }}
                        className="absolute top-4 right-4 p-2 text-licorice/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                        title="Excluir Nível"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white p-8 rounded-3xl border border-licorice/5 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-aventurine">
                  <Users size={20} />
                  <h2 className="font-bold uppercase tracking-widest text-xs">Usuários do Sistema</h2>
                </div>
                <button 
                  onClick={() => setIsNewUserModalOpen(true)}
                  className="flex items-center gap-2 bg-aventurine text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-aventurine/90 transition-all"
                >
                  <Plus size={14} />
                  Novo Usuário
                </button>
              </div>

              <div className="overflow-hidden border border-licorice/5 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-antique/30 border-b border-licorice/5">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Usuário</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nível de Acesso</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-licorice/5">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-antique/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-antique rounded-lg flex items-center justify-center text-[10px] font-bold text-licorice">
                              {user.initial}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-licorice">{user.name}</span>
                              <span className="text-[10px] text-licorice/40">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative inline-block group/select">
                            <select 
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className={cn(
                                "appearance-none pl-3 pr-8 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-transparent hover:border-aventurine/20 transition-all focus:outline-none focus:ring-1 focus:ring-aventurine/20",
                                user.role === 'admin' ? "bg-aventurine/10 text-aventurine" : "bg-licorice/5 text-licorice/40"
                              )}
                            >
                              {permissions.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                              ))}
                            </select>
                            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-licorice/20 group-hover/select:text-aventurine" />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSelectedUser(user);
                                setIsChangePasswordModalOpen(true);
                              }}
                              className="p-2 text-licorice/20 hover:text-aventurine transition-all"
                              title="Alterar Senha"
                            >
                              <Key size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 text-licorice/20 hover:text-red-500 transition-all"
                              title="Excluir Usuário"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'integracao' && (
          <div className="space-y-8">
            {/* API Key Section */}
            <section className="bg-white p-8 rounded-3xl border border-licorice/5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-aventurine">
                <Shield size={20} />
                <h2 className="font-bold uppercase tracking-widest text-xs">Segurança da API</h2>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Chave de API (X-API-KEY)</label>
                <div className="flex items-center gap-2 p-3 bg-antique/30 rounded-xl border border-licorice/5 group">
                  <code className="flex-1 text-xs font-mono text-licorice truncate">
                    {isApiKeyVisible ? apiKey : '•'.repeat(apiKey.length)}
                  </code>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
                      className="p-2 hover:bg-white rounded-lg transition-all text-licorice/40 hover:text-aventurine"
                      title={isApiKeyVisible ? "Ocultar chave" : "Mostrar chave"}
                    >
                      {isApiKeyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button 
                      onClick={() => copyToClipboard(apiKey, 'key')}
                      className="p-2 hover:bg-white rounded-lg transition-all text-licorice/40 hover:text-aventurine"
                    >
                      {copied === 'key' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-licorice/40 italic">Use esta chave no Header da sua requisição para autenticar o n8n.</p>
              </div>
            </section>

            {/* Endpoints Section */}
            <section className="bg-white p-8 rounded-3xl border border-licorice/5 shadow-sm space-y-8">
              <div className="flex items-center gap-3 text-aventurine">
                <Terminal size={20} />
                <h2 className="font-bold uppercase tracking-widest text-xs">Endpoints</h2>
              </div>
              
              <div className="space-y-4">
                {/* Criar novo lead Toggle */}
                <div className="border border-licorice/5 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setIsLeadEndpointOpen(!isLeadEndpointOpen)}
                    className="w-full flex items-center justify-between p-4 bg-antique/10 hover:bg-antique/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-aventurine text-white text-[10px] font-bold rounded-md">POST</span>
                      <span className="text-sm font-bold text-licorice">Criar novo lead</span>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={cn("text-licorice/20 transition-transform duration-300", isLeadEndpointOpen && "rotate-180")} 
                    />
                  </button>

                  <AnimatePresence>
                    {isLeadEndpointOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 space-y-6 border-t border-licorice/5">
                          {/* Webhook URL Section */}
                          <div className="space-y-2 pb-6 border-b border-licorice/5">
                            <div className="flex items-center gap-2 text-licorice mb-1">
                              <Globe size={14} className="text-aventurine" />
                              <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">URL de Recebimento (Webhook)</label>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-antique/30 rounded-xl border border-licorice/5 group">
                              <code className="flex-1 text-xs font-mono text-licorice truncate">{webhookUrl}</code>
                              <button 
                                onClick={() => copyToClipboard(webhookUrl, 'url')}
                                className="p-2 hover:bg-white rounded-lg transition-all text-licorice/40 hover:text-aventurine"
                              >
                                {copied === 'url' ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                            <p className="text-[10px] text-licorice/40 italic">Método: POST | Content-Type: application/json</p>
                          </div>

                          <div className="p-4 bg-licorice text-white/90 rounded-2xl space-y-4">
                            <p className="text-xs font-medium">Configuração do nó "HTTP Request":</p>
                            <ul className="text-[11px] space-y-2 list-disc list-inside text-white/60">
                              <li><span className="text-white">Method:</span> POST</li>
                              <li><span className="text-white">URL:</span> {webhookUrl}</li>
                              <li><span className="text-white">Authentication:</span> Header Auth</li>
                              <li><span className="text-white">Header Name:</span> x-api-key</li>
                              <li><span className="text-white">Header Value:</span> {apiKey}</li>
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Comando cURL (Importar no n8n)</label>
                            <div className="relative group">
                              <pre className="p-4 bg-licorice text-white/80 rounded-2xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{ "nome": "João Silva", "profissao": "Engenheiro", "telefone": "11999999999", "cidade_uf": "São Paulo/SP", "valor_pago": 50000, "tipo_imovel": "Apartamento", "corretagem": 3000, "atrasos": "3 meses", "email": "joao@email.com", "rg": "12.345.678-9", "cpf": "123.456.789-00", "cep": "01234-567", "logradouro": "Rua Exemplo", "bairro": "Centro", "origem": "Meta Ads", "projeto": "Distrato Justo" }'`}
                              </pre>
                              <button 
                                onClick={() => copyToClipboard(`curl -X POST "${webhookUrl}" -H "Content-Type: application/json" -H "x-api-key: ${apiKey}" -d '{ "nome": "João Silva", "profissao": "Engenheiro", "telefone": "11999999999", "cidade_uf": "São Paulo/SP", "valor_pago": 50000, "tipo_imovel": "Apartamento", "corretagem": 3000, "atrasos": "3 meses", "email": "joao@email.com", "rg": "12.345.678-9", "cpf": "123.456.789-00", "cep": "01234-567", "logradouro": "Rua Exemplo", "bairro": "Centro", "origem": "Meta Ads", "projeto": "Distrato Justo" }'`, 'curl')}
                                className="absolute top-3 right-3 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white"
                              >
                                {copied === 'curl' ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                            <p className="text-[10px] text-licorice/40 italic">Dica: No n8n, você pode clicar em "Import from cURL" no nó HTTP Request e colar este comando.</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Modais de Permissão */}
      <AnimatePresence>
        {isNewLevelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewLevelModalOpen(false)}
              className="absolute inset-0 bg-licorice/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md max-h-[90vh] bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-aventurine">
                  <Plus size={24} />
                  <h2 className="text-xl font-bold">Novo Nível de Acesso</h2>
                </div>
                <button 
                  onClick={() => setIsNewLevelModalOpen(false)}
                  className="p-2 text-licorice/20 hover:text-licorice transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 pt-0 overflow-y-auto flex-1 space-y-6 no-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nome do Nível</label>
                  <input 
                    type="text" 
                    value={newLevel.title}
                    onChange={(e) => setNewLevel({ ...newLevel, title: e.target.value })}
                    placeholder="Ex: Gerente de Vendas"
                    className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Descrição</label>
                  <textarea 
                    value={newLevel.desc}
                    onChange={(e) => setNewLevel({ ...newLevel, desc: e.target.value })}
                    placeholder="Descreva as responsabilidades deste nível..."
                    rows={3}
                    className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Cor de Identificação</label>
                  <div className="flex gap-3">
                    {['bg-aventurine', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-licorice/60'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewLevel({ ...newLevel, color })}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all border-2",
                          color,
                          newLevel.color === color ? "border-licorice/20 scale-110 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 pt-4 border-t border-licorice/5 shrink-0">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsNewLevelModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreateLevel}
                    className="flex-1 py-3 bg-aventurine text-white rounded-xl text-sm font-bold shadow-lg shadow-aventurine/20 hover:bg-aventurine/90 transition-all"
                  >
                    Criar Nível
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {editingPermission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPermission(null)}
              className="absolute inset-0 bg-licorice/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-aventurine">
                  <ShieldCheck size={24} />
                  <h2 className="text-xl font-bold">Editar Nível de Acesso</h2>
                </div>
                <button 
                  onClick={() => setEditingPermission(null)}
                  className="p-2 text-licorice/20 hover:text-licorice transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 pt-0 overflow-y-auto flex-1 space-y-8 no-scrollbar">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nome do Nível</label>
                    <input 
                      type="text" 
                      value={editingPermission.title}
                      onChange={(e) => setEditingPermission({ ...editingPermission, title: e.target.value })}
                      className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Descrição</label>
                    <textarea 
                      value={editingPermission.desc}
                      onChange={(e) => setEditingPermission({ ...editingPermission, desc: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50 resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Permissões de Features</label>
                      <button 
                        onClick={() => {
                          const allEnabled = editingPermission.features.every(f => f.enabled);
                          const newFeatures = editingPermission.features.map(f => ({ ...f, enabled: !allEnabled }));
                          setEditingPermission({ ...editingPermission, features: newFeatures });
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-aventurine hover:text-aventurine/80 transition-all px-2 py-1 rounded hover:bg-aventurine/5"
                      >
                        {editingPermission.features.every(f => f.enabled) ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {editingPermission.features.map((feature) => (
                        <div key={feature.id} className="flex items-center justify-between p-4 bg-antique/30 rounded-2xl border border-licorice/5">
                          <span className="text-sm font-medium text-licorice">{feature.label}</span>
                          <button 
                            onClick={() => {
                              const newFeatures = editingPermission.features.map(f => 
                                f.id === feature.id ? { ...f, enabled: !f.enabled } : f
                              );
                              setEditingPermission({ ...editingPermission, features: newFeatures });
                            }}
                            className={cn(
                              "relative w-10 h-6 rounded-full transition-all duration-300",
                              feature.enabled ? "bg-aventurine" : "bg-licorice/10"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                              feature.enabled ? "left-5" : "left-1"
                            )} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 pt-4 border-t border-licorice/5 shrink-0">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setEditingPermission(null)}
                    className="flex-1 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      savePermission(editingPermission);
                      setEditingPermission(null);
                    }}
                    className="flex-1 py-3 bg-aventurine text-white rounded-xl text-sm font-bold shadow-lg shadow-aventurine/20 hover:bg-aventurine/90 transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New User Modal */}
      <AnimatePresence>
        {isNewUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewUserModalOpen(false)}
              className="absolute inset-0 bg-licorice/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md max-h-[90vh] bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-aventurine">
                  <Users size={24} />
                  <h2 className="text-xl font-bold">Novo Usuário</h2>
                </div>
                <button 
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="p-2 text-licorice/20 hover:text-licorice transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 pt-0 overflow-y-auto flex-1 space-y-6 no-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nome Completo</label>
                    <input 
                      type="text" 
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50"
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">E-mail</label>
                    <input 
                      type="email" 
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50"
                      placeholder="exemplo@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nível de Acesso</label>
                    <select 
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50 appearance-none"
                    >
                      {permissions.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Senha</label>
                    <div className="relative">
                      <input 
                        type={showNewUserPassword ? "text" : "password"} 
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50 pr-12"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-licorice/20 hover:text-aventurine transition-all"
                      >
                        {showNewUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 pt-4 border-t border-licorice/5 shrink-0">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsNewUserModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreateUser}
                    className="flex-1 py-3 bg-aventurine text-white rounded-xl text-sm font-bold shadow-lg shadow-aventurine/20 hover:bg-aventurine/90 transition-all"
                  >
                    Cadastrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangePasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChangePasswordModalOpen(false)}
              className="absolute inset-0 bg-licorice/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md max-h-[90vh] bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-aventurine">
                  <Key size={24} />
                  <h2 className="text-xl font-bold">Alterar Senha</h2>
                </div>
                <button 
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="p-2 text-licorice/20 hover:text-licorice transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 pt-0 overflow-y-auto flex-1 space-y-6 no-scrollbar">
                <div className="space-y-4">
                  <p className="text-sm text-licorice/60">Alterando senha para: <span className="font-bold text-licorice">{selectedUser?.name}</span></p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nova Senha</label>
                    <div className="relative">
                      <input 
                        type={showChangePassword ? "text" : "password"} 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm focus:outline-none focus:border-aventurine/50 pr-12"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowChangePassword(!showChangePassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-licorice/20 hover:text-aventurine transition-all"
                      >
                        {showChangePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 pt-4 border-t border-licorice/5 shrink-0">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsChangePasswordModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleChangePassword}
                    className="flex-1 py-3 bg-aventurine text-white rounded-xl text-sm font-bold shadow-lg shadow-aventurine/20 hover:bg-aventurine/90 transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-licorice/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                  <Trash2 size={32} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-licorice">Excluir Usuário?</h2>
                  <p className="text-sm text-licorice/60">
                    Tem certeza que deseja excluir o usuário <span className="font-bold">{selectedUser?.name}</span>? Esta ação não pode ser desfeita.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDeleteUser}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generic Action Confirmation Modal */}
      <AnimatePresence>
        {isConfirmActionModalOpen && confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmActionModalOpen(false)}
              className="absolute inset-0 bg-licorice/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6 text-center">
                <div className="w-16 h-16 bg-aventurine/10 rounded-full flex items-center justify-center mx-auto text-aventurine">
                  <AlertCircle size={32} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-licorice">{confirmAction.title}</h2>
                  <p className="text-sm text-licorice/60">{confirmAction.message}</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsConfirmActionModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-all"
                  >
                    Não
                  </button>
                  <button 
                    onClick={confirmAction.onConfirm}
                    className="flex-1 py-3 bg-aventurine text-white rounded-xl text-sm font-bold shadow-lg shadow-aventurine/20 hover:bg-aventurine/90 transition-all"
                  >
                    Sim, Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
