import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus } from '../types';
import { cn, formatPhone, formatCPF, formatRG, formatCEP } from '../utils';
import { 
  Trash2, 
  ExternalLink, 
  ChevronRight,
  User,
  MapPin,
  Save,
  X,
  AlertCircle,
  DollarSign,
  Plus,
  FilePlus,
  Phone
} from 'lucide-react';
import { SpouseInfo } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface EditLeadSidebarProps {
  lead: Lead | null;
  columns: string[];
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export default function EditLeadSidebar({ 
  lead, 
  columns,
  onClose, 
  onUpdate, 
  onDelete 
}: EditLeadSidebarProps) {
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSpouseModalOpen, setIsSpouseModalOpen] = useState(false);

  useEffect(() => {
    setEditingLead(lead);
    setShowDeleteConfirm(false);
  }, [lead]);

  if (!editingLead) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      onUpdate(editingLead);
      onClose();
    }
  };

  const handleDelete = () => {
    if (editingLead) {
      onDelete(editingLead.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleBlur = () => {
    if (editingLead) {
      onUpdate(editingLead);
    }
  };

  return (
    <AnimatePresence>
      {lead && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-licorice/40 backdrop-blur-sm z-[100] flex items-center justify-end"
          onClick={() => {
            handleBlur();
            onClose();
          }}
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-licorice/5 flex items-center justify-between bg-antique/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-aventurine/10 rounded-2xl flex items-center justify-center text-aventurine">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-licorice">Editar Cadastro</h3>
                  <p className="text-xs text-licorice/40">ID: {editingLead.id}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  handleBlur();
                  onClose();
                }}
                className="p-2 hover:bg-licorice/5 rounded-full transition-colors text-licorice/40"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto no-scrollbar p-8">
              <div className="space-y-8">
                {/* Dados Pessoais */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <User size={14} className="text-aventurine" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Dados Pessoais</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Field label="Nome Completo" value={editingLead.name} onChange={v => setEditingLead({...editingLead, name: v})} onBlur={handleBlur} />
                    </div>
                    <Field label="Profissão" value={editingLead.profession} onChange={v => setEditingLead({...editingLead, profession: v})} onBlur={handleBlur} />
                    <Field label="E-mail" value={editingLead.email || ''} onChange={v => setEditingLead({...editingLead, email: v})} onBlur={handleBlur} />
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">Telefone (WhatsApp)</label>
                      <div className="flex gap-2">
                        <input 
                          className="input-field flex-1"
                          value={formatPhone(editingLead.phone)}
                          onChange={e => setEditingLead({...editingLead, phone: e.target.value.replace(/\D/g, '')})}
                          onBlur={handleBlur}
                        />
                        {editingLead.phone && (
                          <a 
                            href={`https://wa.me/55${editingLead.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                    <Field label="RG" value={formatRG(editingLead.rg || '')} onChange={v => setEditingLead({...editingLead, rg: v.replace(/\D/g, '')})} onBlur={handleBlur} />
                    <Field label="CPF" value={formatCPF(editingLead.cpf || '')} onChange={v => setEditingLead({...editingLead, cpf: v.replace(/\D/g, '')})} onBlur={handleBlur} />

                  </div>
                </section>

                {/* Endereço */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={14} className="text-aventurine" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Endereço</h4>
                  </div>
                  <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-2">
                      <Field label="CEP" value={formatCEP(editingLead.zipCode || '')} onChange={v => setEditingLead({...editingLead, zipCode: v.replace(/\D/g, '')})} onBlur={handleBlur} />
                    </div>
                    <div className="col-span-4">
                      <Field label="Logradouro" value={editingLead.address || ''} onChange={v => setEditingLead({...editingLead, address: v})} onBlur={handleBlur} />
                    </div>
                    <div className="col-span-3">
                      <Field label="Bairro" value={editingLead.neighborhood || ''} onChange={v => setEditingLead({...editingLead, neighborhood: v})} onBlur={handleBlur} />
                    </div>
                    <div className="col-span-2">
                      <Field label="Cidade" value={editingLead.city} onChange={v => setEditingLead({...editingLead, city: v})} onBlur={handleBlur} />
                    </div>
                    <div className="col-span-1">
                      <Field label="UF" value={editingLead.state} onChange={v => setEditingLead({...editingLead, state: v})} onBlur={handleBlur} />
                    </div>
                  </div>
                </section>

                {/* Dados do Cônjuge (Espelhado) */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <User size={14} className="text-aventurine" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Dados do Cônjuge</h4>
                  </div>
                  
                  {editingLead.spouseInfo && editingLead.spouseInfo.name?.trim() ? (
                    <div 
                      onClick={() => setIsSpouseModalOpen(true)}
                      className="w-full p-4 bg-licorice/5 rounded-2xl flex items-center justify-between hover:bg-licorice/10 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-licorice rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                          {editingLead.spouseInfo.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-licorice">{editingLead.spouseInfo.name}</span>
                          <span className="text-[10px] text-licorice/40 font-medium tracking-tight">
                            {editingLead.spouseInfo.cpf ? formatCPF(editingLead.spouseInfo.cpf) : ''}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = { ...editingLead, spouseInfo: undefined };
                          setEditingLead(updated);
                          onUpdate(updated);
                        }}
                        className="p-2 hover:bg-licorice/5 rounded-full text-licorice/20 hover:text-exotic transition-all"
                        title="Remover Cônjuge"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setIsSpouseModalOpen(true)}
                      className="w-full py-4 border-2 border-dashed border-licorice/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-licorice/40 hover:bg-licorice/5 hover:border-licorice/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={14} />
                      Adicionar Cônjuge
                    </button>
                  )}
                </section>
              </div>
            </form>

            <AnimatePresence>
              {isSpouseModalOpen && (
                <SpouseModal 
                  open={isSpouseModalOpen}
                  onClose={() => setIsSpouseModalOpen(false)}
                  data={editingLead.spouseInfo || null}
                  onSave={(data) => {
                    const hasData = Object.values(data).some(v => v && v.trim() !== '');
                    const updated = { ...editingLead, spouseInfo: hasData ? data : undefined };
                    setEditingLead(updated);
                    onUpdate(updated);
                  }}
                />
              )}
            </AnimatePresence>

            <div className="p-6 border-t border-licorice/5 bg-antique/10 flex items-center justify-between">
              <button 
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-exotic text-white rounded-xl text-sm font-bold hover:bg-exotic/90 transition-colors flex items-center gap-2 shadow-lg shadow-exotic/20"
              >
                <Trash2 size={16} />
                Excluir Registro
              </button>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    handleBlur();
                    onClose();
                  }}
                  className="px-6 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="px-8 py-3 bg-aventurine text-white rounded-xl text-sm font-bold hover:bg-aventurine/90 transition-colors flex items-center gap-2 shadow-lg shadow-aventurine/20"
                >
                  <Save size={16} />
                  Salvar Alterações
                </button>
              </div>
            </div>
          </motion.div>

          {/* Delete Confirmation */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-licorice/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white w-full max-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6"
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
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="flex-1 py-3 bg-exotic text-white rounded-xl text-sm font-bold hover:bg-exotic/90 transition-colors"
                    >
                      Sim, Excluir
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SpouseModal({ open, onClose, data, onSave }: {
  open: boolean;
  onClose: () => void;
  data: SpouseInfo | null;
  onSave: (data: SpouseInfo) => void;
}) {
  const [localData, setLocalData] = useState<SpouseInfo>(data || {
    name: '',
    cpf: '',
    rg: '',
    phone: '',
    email: ''
  });

  return (
    <div className="fixed inset-0 bg-licorice/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-licorice">Dados do Cônjuge</h3>
            <p className="text-sm text-licorice/40">Insira as informações básicas do parceiro(a).</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-licorice/5 rounded-full transition-colors text-licorice/30">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nome Completo" value={localData.name} onChange={v => setLocalData({...localData, name: v})} onBlur={() => {}} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="CPF" value={formatCPF(localData.cpf)} onChange={v => setLocalData({...localData, cpf: v.replace(/\D/g, '')})} onBlur={() => {}} />
            <Field label="RG" value={formatRG(localData.rg)} onChange={v => setLocalData({...localData, rg: v.replace(/\D/g, '')})} onBlur={() => {}} />
          </div>
          <Field label="Telefone" value={formatPhone(localData.phone)} onChange={v => setLocalData({...localData, phone: v.replace(/\D/g, '')})} onBlur={() => {}} />
          <Field label="E-mail" value={localData.email} onChange={v => setLocalData({...localData, email: v})} onBlur={() => {}} />
        </div>

        <div className="flex gap-3 pt-4 border-t border-licorice/5">
          <button 
            type="button"
            onClick={onClose} 
            className="flex-1 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={() => {
              onSave(localData);
              onClose();
            }}
            className="flex-3 py-3 bg-aventurine text-white rounded-xl text-sm font-bold hover:bg-aventurine/90 transition-all shadow-lg shadow-aventurine/20"
          >
            Salvar Dados
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, value, onChange, onBlur }: { label: string; value: string; onChange: (v: string) => void; onBlur: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">{label}</label>
      <input 
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}
