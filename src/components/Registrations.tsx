import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus } from '../types';
import { cn, formatPhone, formatCPF, formatRG, formatCEP, formatCurrency } from '../utils';
import { 
  Search, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  Filter,
  ChevronRight,
  User,
  MapPin,
  Phone,
  Mail,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RegistrationsProps {
  leads: Lead[];
  columns: string[];
  onUpdate: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onEdit: (lead: Lead) => void;
  externalFilters?: {
    searchQuery: string;
    filterType: 'all' | 'lead' | 'cliente';
    filterStatus: LeadStatus | 'all';
  };
}

export default function Registrations({ 
  leads, 
  columns,
  onUpdate, 
  onDelete, 
  onEdit,
  externalFilters
}: RegistrationsProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalFilterType, setInternalFilterType] = useState<'all' | 'lead' | 'cliente'>('all');
  const [internalFilterStatus, setInternalFilterStatus] = useState<LeadStatus | 'all'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const searchQuery = externalFilters?.searchQuery ?? internalSearchQuery;
  const filterType = externalFilters?.filterType ?? internalFilterType;
  const filterStatus = externalFilters?.filterStatus ?? internalFilterStatus;

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.cpf || '').includes(searchQuery.replace(/\D/g, '')) ||
        (lead.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const isCliente = lead.status === 'Assinado' || lead.status === 'Churn';
      const matchesType = 
        filterType === 'all' || 
        (filterType === 'cliente' && isCliente) || 
        (filterType === 'lead' && !isCliente);
      
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [leads, searchQuery, filterType, filterStatus]);

  const handleDelete = (id: string) => {
    onDelete(id);
    setShowDeleteConfirm(null);
  };

  return (
    <div className="h-full flex flex-col bg-antique overflow-hidden">
      {/* List Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        <div className="bg-white rounded-2xl border border-licorice/5 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-licorice/5 bg-antique/30">
                <th className="w-[12.5%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nome</th>
                <th className="w-[12.5%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Telefone</th>
                <th className="w-[12.5%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Profissão</th>
                <th className="w-[12.5%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Classificação</th>
                <th className="w-[12.5%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Status Atual</th>
                <th className="w-[12.5%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Valor Pago</th>
                <th className="w-[12.5%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Criação</th>
                <th className="w-[12.5%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-licorice/5">
              {filteredLeads.map((lead) => {
                const isItemCliente = lead.status === 'Assinado' || lead.status === 'Churn';
                return (
                  <tr 
                    key={lead.id} 
                    onClick={() => onEdit(lead)}
                    className="hover:bg-antique/10 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-licorice truncate">{lead.name}</span>
                        <span className="text-[10px] text-licorice/40 truncate">{lead.email || 'Sem e-mail'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs text-licorice/60 font-semibold font-mono">
                        {lead.phone ? formatPhone(lead.phone) : 'Não informado'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-bold text-licorice/60 uppercase tracking-tight truncate block">{lead.profession || 'Não informada'}</span>
                    </td>
                    <td className="px-6 py-3">
                      {isItemCliente ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold uppercase">Cliente</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 text-[10px] font-bold uppercase">Lead</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-bold text-licorice/60 uppercase tracking-tight truncate block">{lead.status}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-bold text-licorice/60 uppercase tracking-tight truncate block">
                        {formatCurrency(lead.valuePaid || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] text-licorice/40 font-mono">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : '--/--/----'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-start gap-2 transition-opacity">
                        <a 
                          href={lead.phone ? `https://wa.me/55${lead.phone.replace(/\D/g, '')}` : undefined}
                          target={lead.phone ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (!lead.phone) e.preventDefault();
                            e.stopPropagation();
                          }}
                          className={cn(
                            "p-1.5 rounded-lg transition-all",
                            lead.phone 
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white" 
                              : "bg-green-500/5 text-green-600/20 cursor-not-allowed"
                          )}
                          title={lead.phone ? "Abrir WhatsApp" : "Telefone não informado"}
                        >
                          <Phone size={14} />
                        </a>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(lead.id);
                        }}
                        className="p-1.5 hover:bg-exotic/10 text-exotic rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="p-20 flex flex-col items-center justify-center text-licorice/30 gap-4">
              <Search size={40} strokeWidth={1} />
              <p className="text-sm">Nenhum registro encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-licorice/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6"
            >
              <div className="w-16 h-16 bg-exotic/10 rounded-full flex items-center justify-center text-exotic">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-licorice">Excluir Registro?</h3>
                <p className="text-sm text-licorice/60 mt-2">Esta ação não pode ser desfeita. Todos os dados deste lead serão perdidos permanentemente.</p>
              </div>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 py-3 bg-exotic text-white rounded-xl text-sm font-bold hover:bg-exotic/90 transition-colors"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
        active ? "bg-aventurine text-white shadow-sm" : "text-licorice/40 hover:text-licorice"
      )}
    >
      {label}
    </button>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">{label}</label>
      <input 
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
