import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus } from '../../../shared/types';
import { cn, formatPhone, formatCPF, formatRG, formatCEP, formatCurrency } from '../../../shared/utils';
import { 
  Search, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  Save,
  X,
  AlertCircle,
  FileText
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
  const [viewingNotes, setViewingNotes] = useState<Lead | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const searchQuery = externalFilters?.searchQuery ?? internalSearchQuery;
  const filterType = externalFilters?.filterType ?? internalFilterType;
  const filterStatus = externalFilters?.filterStatus ?? internalFilterStatus;

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const query = searchQuery.toLowerCase();
      const queryDigits = searchQuery.replace(/\D/g, '');
      
      const matchesSearch = 
        (lead.name || '').toLowerCase().includes(query) ||
        (lead.email || '').toLowerCase().includes(query) ||
        (queryDigits !== '' && (
          (lead.cpf || '').includes(queryDigits) ||
          (lead.phone || '').replace(/\D/g, '').includes(queryDigits)
        ));
      
      const isCliente = lead.status === 'Assinado' || lead.status === 'Churn';
      const matchesType = 
        filterType === 'all' || 
        (filterType === 'cliente' && isCliente) || 
        (filterType === 'lead' && !isCliente);
      
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [leads, searchQuery, filterType, filterStatus]);

  // Reset to first page when filtering or searching
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage]);

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
              <tr className="border-b border-licorice/5" style={{ background: '#FDFDFB' }}>
                <th className="w-[15%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nome</th>
                <th className="w-[15%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Telefone</th>
                <th className="w-[15%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Profissão</th>
                <th className="w-[15%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Tipo de Imóvel</th>
                <th className="w-[15%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Valor Pago</th>
                <th className="w-[15%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Status Atual</th>
                <th className="w-[10%] px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-licorice/40 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-licorice/5">
              {paginatedLeads.map((lead) => {
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
                      <span className="text-[10px] font-bold text-licorice/60 uppercase tracking-tight truncate block">{lead.propertyType || 'Não informado'}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-bold text-licorice/60 uppercase tracking-tight truncate block">
                        {formatCurrency(lead.valuePaid || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full inline-block text-center min-w-[80px]",
                        lead.status === 'Assinado' ? "bg-green-500/10 text-green-600" : 
                        lead.status === 'Churn' ? "bg-red-500/10 text-red-600" : "bg-licorice/5 text-licorice/40"
                      )}>
                        {lead.status}
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
                              ? "text-green-600 hover:text-green-500 hover:scale-110" 
                              : "text-green-600/20 cursor-not-allowed"
                          )}
                          title={lead.phone ? "Abrir WhatsApp" : "Telefone não informado"}
                        >
                          <MessageCircle size={14} />
                        </a>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingNotes(lead);
                          }}
                          className="p-1.5 hover:bg-blue-500/10 text-blue-600 rounded-lg transition-colors"
                          title="Ver Briefing"
                        >
                          <FileText size={14} />
                        </button>
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

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-licorice/5 bg-antique/10 flex items-center justify-between">
              <div className="text-xs font-medium text-licorice/40">
                Mostrando <span className="text-licorice font-semibold">{paginatedLeads.length}</span> de <span className="text-licorice font-semibold">{filteredLeads.length}</span> registros
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(1, prev - 1)); }}
                  disabled={currentPage === 1}
                  className={cn(
                    "p-2 rounded-xl border transition-all duration-200",
                    currentPage === 1 
                      ? "border-transparent text-licorice/10 cursor-not-allowed" 
                      : "border-licorice/5 text-licorice/40 hover:bg-white hover:text-aventurine hover:border-aventurine/20 shadow-sm"
                  )}
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show current page, and a few around it if total is large
                    // For now, let's keep it simple as the user asked for "maximum 10 results per page"
                    // but we can optimize the number of buttons shown if needed.
                    if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={(e) => { e.stopPropagation(); setCurrentPage(page); }}
                          className={cn(
                            "w-8 h-8 rounded-xl text-xs font-medium transition-all duration-200",
                            currentPage === page 
                              ? "bg-aventurine text-white shadow-md shadow-aventurine/20" 
                              : "text-licorice/40 hover:bg-white hover:text-licorice border border-transparent hover:border-licorice/5"
                          )}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="text-licorice/20 px-1">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(totalPages, prev + 1)); }}
                  disabled={currentPage === totalPages}
                  className={cn(
                    "p-2 rounded-xl border transition-all duration-200",
                    currentPage === totalPages 
                      ? "border-transparent text-licorice/10 cursor-not-allowed" 
                      : "border-licorice/5 text-licorice/40 hover:bg-white hover:text-aventurine hover:border-aventurine/20 shadow-sm"
                  )}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes Modal */}
      <AnimatePresence>
        {viewingNotes && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-licorice/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={() => setViewingNotes(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl flex flex-col gap-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-blue-600">
                  <FileText size={24} />
                  <h3 className="text-xl font-bold text-licorice">Briefing</h3>
                </div>
                <button 
                  onClick={() => setViewingNotes(null)}
                  className="p-2 text-licorice/20 hover:text-licorice transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-licorice/60">{viewingNotes.name}</p>
                <div className="p-4 bg-antique/30 rounded-2xl border border-licorice/5 text-sm text-licorice/70 leading-relaxed min-h-[150px] max-h-[300px] overflow-y-auto whitespace-pre-wrap no-scrollbar">
                  {viewingNotes.notes || 'Nenhuma nota registrada para este cliente.'}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-licorice/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6"
              onClick={e => e.stopPropagation()}
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
