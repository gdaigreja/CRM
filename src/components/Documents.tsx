import React, { useState, useEffect } from 'react';
import { Search, Mail, Bell, Plus, Trash2, X, ChevronDown, ChevronUp, Send, Calendar, Pencil, AlertCircle, AlertTriangle, FileText, Archive, Activity, Scale, Check as LucideCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, DocumentItem, DocumentStatus, Observation, ClientDocumentData } from '../types';
import { DEFAULT_DOCUMENTS } from '../constants';
import { cn } from '../utils';
import { v4 as uuidv4 } from 'uuid';

interface DocumentsProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onEditLead: (lead: Lead) => void;
  searchQuery: string;
  filterPendencias: boolean;
  filterComPrazo: boolean;
  filterArquivados: boolean;
}

export default function Documents({ leads, onUpdateLead, onDeleteLead, onEditLead, searchQuery, filterPendencias, filterComPrazo, filterArquivados }: DocumentsProps) {
  const [selectedClient, setSelectedClient] = useState<Lead | null>(null);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  // Filter leads that have documentData and status is 'Assinado' or 'Churn'
  const clients = leads.filter(l => l.documentData && (l.status === 'Assinado' || l.status === 'Churn'));

  const filteredClients = clients.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.documentData?.code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Filter by archived status
    if (filterArquivados) {
      if (!c.archived) return false;
    } else {
      if (c.archived) return false;
    }

    if (filterPendencias) {
      if (c.status === 'Churn') {
        if (c.documentData?.rescisaoFormalizada) return false;
      } else if (c.financialRecord?.tipoResultado === 'acordo' || c.financialRecord?.tipoResultado === 'sentenca_procedente') {
        if (c.documentData?.minutaHomologada) return false;
      } else {
        const hasPendencias = (c.documentData?.documents || []).some(d => d.status !== 'Recebido');
        if (!hasPendencias) return false;
      }
    }

    if (filterComPrazo) {
      const hasPrazo = c.documentData?.deadlineFatal || (c.documentData?.documents || []).some(d => d.deadline);
      if (!hasPrazo) return false;
    }

    return true;
  }).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="flex flex-col h-full bg-antique overflow-hidden">
      {/* Grid Area */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredClients.map(client => (
            <ClientCard 
              key={client.id} 
              client={client} 
              onClick={() => setSelectedClient(client)}
              onUpdate={onUpdateLead}
            />
          ))}
        </div>
      </div>

      {/* Overlays & Modals */}
      <AnimatePresence>
        {selectedClient && (
          <DocumentDetailOverlay 
            client={selectedClient} 
            onClose={() => setSelectedClient(null)}
            onEditLead={onEditLead}
            onDelete={() => {
              onDeleteLead(selectedClient.id);
              setSelectedClient(null);
            }}
            onUpdate={(updatedLead) => {
              onUpdateLead(updatedLead);
              setSelectedClient(updatedLead);
            }}
          />
        )}
        {isNewClientModalOpen && (
          <NewClientDocumentModal 
            leads={leads}
            onClose={() => setIsNewClientModalOpen(false)}
            onConfirm={(leadId, code) => {
              const lead = leads.find(l => l.id === leadId);
              if (lead) {
                const updatedLead: Lead = {
                  ...lead,
                  documentData: {
                    code,
                    documents: [...DEFAULT_DOCUMENTS],
                    observations: [],
                    emailSent: false,
                    notificationSent: false,
                    minutaHomologada: false
                  }
                };
                onUpdateLead(updatedLead);
              }
              setIsNewClientModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const ClientCard: React.FC<{ client: Lead; onClick: () => void; onUpdate: (lead: Lead) => void }> = ({ client, onClick, onUpdate }) => {
  const docData = client.documentData || { code: '', documents: [], observations: [], emailSent: false, notificationSent: false, minutaHomologada: false };
  
  const getProgress = (type: 'obrigatório' | 'eventual') => {
    const docs = (docData.documents || []).filter(d => d.type === type);
    if (docs.length === 0) return { current: 0, total: 0, percent: 0 };
    const completed = docs.filter(d => d.status === 'Recebido').length;
    return { current: completed, total: docs.length, percent: (completed / docs.length) * 100 };
  };

  const obrProgress = getProgress('obrigatório');
  const eveProgress = getProgress('eventual');

  const getBarColor = (percent: number) => {
    if (percent === 100) return '#00A63E';
    if (percent > 50) return 'bg-orange-400';
    return 'bg-exotic';
  };

  return (
    <motion.div 
      layoutId={`client-card-${client.id}`}
      onClick={onClick}
      className={cn(
        "bg-white p-5 rounded-2xl border shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col gap-4 relative overflow-hidden",
        docData?.deadlineFatal ? "border-exotic/30" : 
        client.financialRecord?.tipoResultado ? "border-[#00A63E]/30" : "border-licorice/5 hover:border-aventurine/20"
      )}
    >
      {docData?.deadlineFatal && (
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
          <div className="absolute top-2 right-[-25px] bg-exotic text-white text-[10px] font-bold py-1 w-[100px] text-center rotate-45 shadow-sm">
            {docData.deadlineFatal.split('-').slice(1).reverse().join('/')}
          </div>
        </div>
      )}
      {client.status === 'Churn' && (
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-10">
          <div className="absolute top-2 right-[-30px] bg-red-600 text-white text-[9px] font-bold py-0.5 w-[100px] text-center rotate-45 shadow-sm uppercase tracking-widest">
            churn
          </div>
        </div>
      )}
      {client.financialRecord?.tipoResultado && client.status !== 'Churn' && (
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-10">
          <div className="absolute top-2 right-[-30px] bg-[#00A63E] text-white text-[8px] font-bold py-0.5 w-[100px] text-center rotate-45 shadow-sm uppercase tracking-[0.2em]">
            {client.financialRecord.tipoResultado === 'acordo' ? 'acordo' : 'sentença'}
          </div>
        </div>
      )}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-licorice group-hover:text-aventurine transition-colors truncate max-w-[150px]">{client.name || 'Sem Nome'}</h3>
            {docData?.deadlineFatal && (
              <div className="w-2 h-2 rounded-full bg-exotic animate-pulse" />
            )}
          </div>
        </div>

      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest">
            <span className="text-licorice/40">Obrigatórios</span>
            <span 
              className={cn("font-bold")} 
              style={{ color: obrProgress.percent === 100 ? '#00A63E' : 'var(--color-exotic)' }}
            >
              {obrProgress.current}/{obrProgress.total}
            </span>
          </div>
          <div className="h-1 w-full bg-licorice/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${obrProgress.percent}%` }}
              className={cn("h-full transition-all duration-500", obrProgress.percent !== 100 && getBarColor(obrProgress.percent))}
              style={{ backgroundColor: obrProgress.percent === 100 ? '#00A63E' : undefined }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest">
            <span className="text-licorice/40">Eventuais</span>
            <span 
              className={cn("font-bold")} 
              style={{ color: eveProgress.percent === 100 ? '#00A63E' : 'var(--color-exotic)' }}
            >
              {eveProgress.current}/{eveProgress.total}
            </span>
          </div>
          <div className="h-1 w-full bg-licorice/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${eveProgress.percent}%` }}
              className={cn("h-full transition-all duration-500", eveProgress.percent !== 100 && getBarColor(eveProgress.percent))}
              style={{ backgroundColor: eveProgress.percent === 100 ? '#00A63E' : undefined }}
            />
          </div>
        </div>
      </div>

      <div className="mt-1 pt-4 border-t border-licorice/5 flex gap-2">
        {client.status === 'Churn' ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const newValue = !docData.rescisaoFormalizada;
              onUpdate({ 
                ...client, 
                archived: newValue,
                documentData: { ...docData, rescisaoFormalizada: newValue } 
              });
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border",
              docData.rescisaoFormalizada ? "bg-red-600/10 border-red-600/20 text-red-600" : "bg-licorice/5 border-transparent text-licorice/30 hover:border-licorice/10"
            )}
          >
            <div className={cn("w-3 h-3 rounded-sm border flex items-center justify-center", docData.rescisaoFormalizada ? "bg-red-600 border-red-600" : "border-licorice/20 bg-white")}>
              {docData.rescisaoFormalizada && <Check size={8} className="text-white" />}
            </div>
            <FileText size={12} />
            Rescisão Formalizada
          </button>
        ) : (
          (client.financialRecord?.tipoResultado === 'acordo' || client.financialRecord?.tipoResultado === 'sentenca_procedente') ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const newValue = !docData.minutaHomologada;
                onUpdate({ 
                  ...client, 
                  archived: newValue,
                  documentData: { ...docData, minutaHomologada: newValue } 
                });
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border",
                docData.minutaHomologada ? "bg-[#00A63E]/10 border-[#00A63E]/20 text-[#00A63E]" : "bg-licorice/5 border-transparent text-licorice/30 hover:border-licorice/10"
              )}
            >
              <div className={cn("w-3 h-3 rounded-sm border flex items-center justify-center", docData.minutaHomologada ? "bg-[#00A63E] border-[#00A63E]" : "border-licorice/20 bg-white")}>
                {docData.minutaHomologada && <Check size={8} className="text-white" />}
              </div>
              <FileText size={12} />
              Minuta Homologada
            </button>
          ) : (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ ...client, documentData: { ...docData, emailSent: !docData.emailSent } });
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border",
                  docData.emailSent ? "bg-aventurine/10 border-aventurine/20 text-aventurine" : "bg-licorice/5 border-transparent text-licorice/30 hover:border-licorice/10"
                )}
              >
                <div className={cn("w-3 h-3 rounded-sm border flex items-center justify-center", docData.emailSent ? "bg-aventurine border-aventurine" : "border-licorice/20 bg-white")}>
                  {docData.emailSent && <Check size={8} className="text-white" />}
                </div>
                <Mail size={12} />
                Email
              </button>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ ...client, documentData: { ...docData, notificationSent: !docData.notificationSent } });
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border",
                  docData.notificationSent ? "bg-aventurine/10 border-aventurine/20 text-aventurine" : "bg-licorice/5 border-transparent text-licorice/30 hover:border-licorice/10"
                )}
              >
                <div className={cn("w-3 h-3 rounded-sm border flex items-center justify-center", docData.notificationSent ? "bg-aventurine border-aventurine" : "border-licorice/20 bg-white")}>
                  {docData.notificationSent && <Check size={8} className="text-white" />}
                </div>
                <Bell size={12} />
                Notificação
              </button>
            </>
          )
        )}
      </div>
    </motion.div>
  );
};

function Check({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Placeholder components to be moved to separate files or implemented below
const DocumentDetailOverlay: React.FC<{ client: Lead; onClose: () => void; onUpdate: (lead: Lead) => void; onDelete: () => void; onEditLead: (lead: Lead) => void }> = ({ client, onClose, onUpdate, onDelete, onEditLead }) => {
  const [isObrigatorioOpen, setIsObrigatorioOpen] = useState(true);
  const [isEventualOpen, setIsEventualOpen] = useState(true);
  const [newObservation, setNewObservation] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChurnModal, setShowChurnModal] = useState(false);
  const [hasFine, setHasFine] = useState<boolean | null>(null);
  const [fineValue, setFineValue] = useState('');
  
  const [showResultModal, setShowResultModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  
  const [deadlineDateValue, setDeadlineDateValue] = useState('');
  const [deadlineTaskValue, setDeadlineTaskValue] = useState('');
  
  const [processNumber, setProcessNumber] = useState('');
  const [court, setCourt] = useState('');
  const [lastMovement, setLastMovement] = useState('');
  const [movementDate, setMovementDate] = useState('');
  
  const [movementOptions, setMovementOptions] = useState<string[]>(['Inicial Protocolada', 'Aguardando Citação', 'Contestação Apresentada', 'Decisão Interlocutória', 'Sentença Proferida']);
  
  const [resultType, setResultType] = useState<'acordo' | 'sentenca'>('acordo');
  const [restituicaoValue, setRestituicaoValue] = useState('');
  const [sucumbenciaValue, setSucumbenciaValue] = useState('');
  const [parcelasValue, setParcelasValue] = useState('1');
  const [honorariosValue, setHonorariosValue] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('en-CA'));
  
  const docData = client.documentData || { code: '', documents: [], observations: [], emailSent: false, notificationSent: false, minutaHomologada: false };

  // Sync search internal state when modals open
  useEffect(() => {
    if (showDeadlineModal) {
      setDeadlineDateValue(docData.deadlineFatal || '');
      setDeadlineTaskValue(docData.deadlineFatalTask || '');
    }
  }, [showDeadlineModal, docData.deadlineFatal, docData.deadlineFatalTask]);

  useEffect(() => {
    if (showLegalModal) {
      setProcessNumber(client.legalProcess?.processNumber || '');
      setCourt(client.legalProcess?.court || '');
      setLastMovement(client.legalProcess?.lastMovement || '');
      setMovementDate(client.legalProcess?.movementDate || '');
    }
  }, [showLegalModal, client.legalProcess]);

  const maskProcessNumber = (val: string) => {
    const numbers = val.replace(/\D/g, '');
    let masked = '';
    if (numbers.length > 0) masked += numbers.substring(0, 7);
    if (numbers.length > 7) masked += '-' + numbers.substring(7, 9);
    if (numbers.length > 9) masked += '.' + numbers.substring(9, 13);
    if (numbers.length > 13) masked += '.' + numbers.substring(13, 14);
    if (numbers.length > 14) masked += '.' + numbers.substring(14, 16);
    if (numbers.length > 16) masked += '.' + numbers.substring(16, 20);
    return masked.substring(0, 25);
  };

  const handleConfirmChurn = () => {
    const value = parseCurrency(fineValue);
    const updatedFinancialRecord = {
      ...(client.financialRecord || {}),
      multaRescisoriaDevida: hasFine ? value : 0,
      dataChurn: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local time
      statusExecucao: 'Aguardando' as const
    };

    onUpdate({
      ...client,
      status: 'Churn',
      financialRecord: updatedFinancialRecord,
      documentData: {
        ...docData,
        rescisaoFormalizada: false // Initial state
      }
    });
    setShowChurnModal(false);
  };

  const handleConfirmResult = () => {
    const record = client.financialRecord || {};
    const updatedFinancialRecord = {
      ...record,
      tipoResultado: resultType === 'acordo' ? 'acordo' : 'sentenca_procedente',
      valorRestituicao: parseCurrency(restituicaoValue),
      honorariosSucumbenciaisContratuais: parseCurrency(sucumbenciaValue),
      parcelasResultado: parseInt(parcelasValue) || 1,
      valorHonorarios: parseCurrency(honorariosValue),
      dataPagamento: paymentDate,
    };

    onUpdate({
      ...client,
      financialRecord: updatedFinancialRecord,
    });
    setShowResultModal(false);
  };

  const handleConfirmDeadline = () => {
    onUpdate({
      ...client,
      documentData: {
        ...docData,
        deadlineFatal: deadlineDateValue,
        deadlineFatalTask: deadlineTaskValue
      }
    });
    setShowDeadlineModal(false);
  };

  const handleConfirmLegal = () => {
    onUpdate({
      ...client,
      legalProcess: {
        processNumber,
        court,
        lastMovement,
        movementDate
      }
    });
    // Add to shared movement options if new
    if (lastMovement && !movementOptions.includes(lastMovement)) {
      setMovementOptions([...movementOptions, lastMovement]);
    }
    setShowLegalModal(false);
  };

  const updateHonorarios = (restitution: string) => {
    const total = parseCurrency(restitution);
    const perc = (client.contract?.percentage || 20) / 100;
    setHonorariosValue(formatCurrency(total * perc));
  };

  const parseCurrency = (val: string) => {
    return Number(val.replace(/\D/g, '')) / 100;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleUpdateDoc = (docId: string, updates: Partial<DocumentItem>) => {
    const updatedDocs = (docData.documents || []).map(d => d.id === docId ? { ...d, ...updates } : d);
    onUpdate({
      ...client,
      documentData: { ...docData, documents: updatedDocs }
    });
  };

  const handleAddObservation = () => {
    if (!newObservation.trim()) return;
    const obs: Observation = {
      id: uuidv4(),
      author: 'Gabriel Igreja', // Mock user
      text: newObservation,
      timestamp: new Date().toISOString()
    };
    onUpdate({
      ...client,
      documentData: { ...docData, observations: [obs, ...(docData.observations || [])] }
    });
    setNewObservation('');
  };

  const handleAddEventualDoc = () => {
    const newDoc: DocumentItem = {
      id: uuidv4(),
      name: 'Novo Documento Eventual',
      status: 'Pendente de Solicitar',
      type: 'eventual'
    };
    onUpdate({
      ...client,
      documentData: { ...docData, documents: [...(docData.documents || []), newDoc] }
    });
  };

  const handleDeleteDoc = (docId: string) => {
    onUpdate({
      ...client,
      documentData: { ...docData, documents: (docData.documents || []).filter(d => d.id !== docId) }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-licorice/40 backdrop-blur-md z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-5xl bg-white max-h-[90vh] rounded-[32px] shadow-2xl flex overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Left Column: Document Management */}
        <div className="flex-[0.65] flex flex-col border-r border-licorice/5 bg-antique/20 overflow-hidden">
          {/* Header */}
          <div className="p-5 bg-[#512E2D] text-white flex justify-between items-stretch">
            <div className="flex flex-col justify-between gap-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold tracking-tight">{client.name}</h2>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onEditLead(client)}
                    className="p-1 text-white/40 hover:text-white transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {client.status === 'Churn' ? (
                  <button 
                    onClick={() => {
                      const newValue = !docData.rescisaoFormalizada;
                      onUpdate({ 
                        ...client, 
                        archived: newValue,
                        documentData: { ...docData, rescisaoFormalizada: newValue } 
                      });
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border w-[180px]",
                      docData.rescisaoFormalizada ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40" : "bg-white/5 border-white/10 text-white/40"
                    )}
                  >
                    <FileText size={12} />
                    <span>Rescisão Formalizada</span>
                    {docData.rescisaoFormalizada && <Check size={8} />}
                  </button>
                ) : (
                  <>
                    {(client.financialRecord?.tipoResultado === 'acordo' || client.financialRecord?.tipoResultado === 'sentenca_procedente') ? (
                      <button 
                        onClick={() => {
                          const newValue = !docData.minutaHomologada;
                          onUpdate({ 
                            ...client, 
                            archived: newValue,
                            documentData: { ...docData, minutaHomologada: newValue } 
                          });
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border w-[180px]",
                          docData.minutaHomologada ? "bg-[#00A63E]/10 border-[#00A63E]/20 text-[#00A63E] shadow-lg shadow-[#00A63E]/10" : "bg-white/5 border-white/10 text-white/40"
                        )}
                      >
                        <FileText size={12} />
                        <span>Minuta Homologada</span>
                        {docData.minutaHomologada && <Check size={8} />}
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => onUpdate({ ...client, documentData: { ...docData, emailSent: !docData.emailSent } })}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border w-[120px]",
                            docData.emailSent ? "bg-orange-500 border-orange-500 text-white" : "bg-white/5 border-white/10 text-white/40"
                          )}
                        >
                          <Mail size={12} />
                          <span>Email</span>
                          {docData.emailSent && <Check size={8} />}
                        </button>

                        <button 
                          onClick={() => onUpdate({ ...client, documentData: { ...docData, notificationSent: !docData.notificationSent } })}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border w-[120px]",
                            docData.notificationSent ? "bg-orange-500 border-orange-500 text-white" : "bg-white/5 border-white/10 text-white/40"
                          )}
                        >
                          <Bell size={12} />
                          <span>Notificação</span>
                          {docData.notificationSent && <Check size={8} />}
                        </button>
                      </>
                    )}

                    {!client.financialRecord?.tipoResultado && (
                      <button 
                        onClick={() => setShowDeadlineModal(true)}
                        className={cn(
                          "p-2 rounded-lg border flex items-center justify-center transition-all group shadow-sm",
                          docData.deadlineFatal ? "bg-exotic/10 border-exotic/30 text-exotic" : "bg-white/5 border-white/10 text-white/20 hover:text-white/40 hover:bg-white/10"
                        )}
                        title="Marcar Prazo Fatal"
                      >
                        <Calendar size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-start items-end gap-4 min-h-[64px]">
              {client.status !== 'Churn' && !client.financialRecord?.tipoResultado && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowLegalModal(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg transition-all bg-transparent border-2 border-blue-500/30 text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/50 hover:scale-105 active:scale-95"
                    title="Alterar Status / Processo"
                  >
                    <Scale size={16} />
                  </button>
                  <button 
                    onClick={() => setShowChurnModal(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg transition-all bg-transparent border-2 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 hover:scale-105 active:scale-95"
                    title="Marcar Churn"
                  >
                    <X size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      setShowResultModal(true);
                      // Pre-fill honorarios based on current percentage
                      const perc = (client.contract?.percentage || 20) / 100;
                      setHonorariosValue(formatCurrency(0));
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-lg transition-all bg-transparent border-2 border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10 hover:border-emerald-400 hover:scale-105 active:scale-95"
                    title="Registrar Resultado (Acordo/Sentença)"
                  >
                    <LucideCheck size={16} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Accordions */}
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
            {/* Obrigatórios */}
            <div className="space-y-4">
              <button 
                onClick={() => setIsObrigatorioOpen(!isObrigatorioOpen)}
                className="flex items-center gap-4 w-full group"
              >
                <div className="w-1 h-6 bg-[#9F8258] rounded-full" />
                <span className="text-xs font-bold uppercase tracking-widest text-licorice/60 group-hover:text-licorice transition-colors">Documentos Obrigatórios</span>
                <div className="flex-1 h-px bg-licorice/5" />
                {isObrigatorioOpen ? <ChevronUp size={18} className="text-licorice/30" /> : <ChevronDown size={18} className="text-licorice/30" />}
              </button>

              <AnimatePresence>
                {isObrigatorioOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    {(docData.documents || []).filter(d => d.type === 'obrigatório').map(doc => (
                      <DocumentRow key={doc.id} doc={doc} onUpdate={(u) => handleUpdateDoc(doc.id, u)} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Eventuais */}
            <div className="space-y-4">
              <button 
                onClick={() => setIsEventualOpen(!isEventualOpen)}
                className="flex items-center gap-4 w-full group"
              >
                <div className="w-1 h-6 bg-[#9F8258] rounded-full" />
                <span className="text-xs font-bold uppercase tracking-widest text-licorice/60 group-hover:text-licorice transition-colors">Documentos Eventuais</span>
                <div className="flex-1 h-px bg-licorice/5" />
                {isEventualOpen ? <ChevronUp size={18} className="text-licorice/30" /> : <ChevronDown size={18} className="text-licorice/30" />}
              </button>

              <AnimatePresence>
                {isEventualOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    {(docData.documents || []).filter(d => d.type === 'eventual').map(doc => (
                      <DocumentRow key={doc.id} doc={doc} onUpdate={(u) => handleUpdateDoc(doc.id, u)} onDelete={() => handleDeleteDoc(doc.id)} />
                    ))}
                    <button 
                      onClick={handleAddEventualDoc}
                      className="w-full py-4 border-2 border-dashed border-licorice/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-licorice/30 hover:border-aventurine/30 hover:text-aventurine transition-all"
                    >
                      + Adicionar Item Eventual
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Observations */}
        <div className="flex-[0.35] flex flex-col bg-white border-l border-licorice/5 overflow-hidden">
          <div className="p-6 border-b border-licorice/5 flex items-center gap-3">
            <Mail size={18} className="text-licorice/30" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-licorice/60">Observações Internas</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
            {(docData.observations || []).map(obs => (
              <div key={obs.id} className="space-y-1.5">
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest">
                  <span className="text-licorice/60">{obs.author}</span>
                  <span className="text-licorice/30">{new Date(obs.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {new Date(obs.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="bg-antique/30 p-3 rounded-xl rounded-tl-none border border-licorice/5 text-[11px] text-licorice/80 leading-relaxed">
                  {obs.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-licorice/5">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Nova observação..."
                className="w-full pl-4 pr-12 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-[11px] focus:outline-none focus:border-aventurine/50"
                value={newObservation}
                onChange={(e) => setNewObservation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddObservation()}
              />
              <button 
                onClick={handleAddObservation}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#512E2D] text-white rounded-lg flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-black/20"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-licorice/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}>
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
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 text-sm font-bold text-licorice/40 hover:text-licorice transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onDelete();
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 py-3 bg-exotic text-white rounded-xl text-sm font-bold hover:bg-exotic/90 transition-all"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showLegalModal && (
          <div className="fixed inset-0 bg-licorice/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowLegalModal(false); }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => {
                  setProcessNumber('');
                  setCourt('');
                  setLastMovement('');
                  setMovementDate('');
                  onUpdate({
                    ...client,
                    legalProcess: undefined
                  });
                  setShowLegalModal(false);
                }}
                className="absolute right-6 top-6 text-licorice/20 hover:text-exotic transition-colors"
                title="Limpar Informações"
              >
                <Trash2 size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                  <Scale size={24} />
                </div>
                <h3 className="text-xl font-bold text-licorice">Informações do Processo</h3>
                <p className="text-sm text-licorice/40">Atualize os dados judiciais do cliente.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Número do Processo</label>
                  <input 
                    type="text" 
                    placeholder="0000000-00.0000.0.00.0000"
                    className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500/50 transition-colors"
                    value={processNumber}
                    onChange={(e) => {
                      const masked = maskProcessNumber(e.target.value);
                      setProcessNumber(masked);
                      onUpdate({
                        ...client,
                        legalProcess: {
                          processNumber: masked,
                          court,
                          lastMovement,
                          movementDate
                        }
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Tribunal (TJ)</label>
                  <select 
                    className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                    value={court}
                    onChange={(e) => {
                      const newCourt = e.target.value;
                      setCourt(newCourt);
                      onUpdate({
                        ...client,
                        legalProcess: {
                          processNumber,
                          court: newCourt,
                          lastMovement,
                          movementDate
                        }
                      });
                    }}
                  >
                    <option value="">Selecione o Tribunal</option>
                    {['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'].map(uf => (
                      <option key={uf} value={`TJ${uf}`}>TJ{uf}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Última Movimentação</label>
                  <div className="relative">
                    <input 
                      list="movements-list"
                      placeholder="Escrava ou selecione..."
                      className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500/50 transition-colors"
                      value={lastMovement}
                      onChange={(e) => {
                        const newMovement = e.target.value;
                        setLastMovement(newMovement);
                      }}
                      onBlur={() => {
                        onUpdate({
                          ...client,
                          legalProcess: {
                            processNumber,
                            court,
                            lastMovement,
                            movementDate
                          }
                        });
                        // Add to shared options
                        if (lastMovement && !movementOptions.includes(lastMovement)) {
                          setMovementOptions([lastMovement, ...movementOptions]);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && lastMovement) {
                          onUpdate({
                            ...client,
                            legalProcess: {
                              processNumber,
                              court,
                              lastMovement,
                              movementDate
                            }
                          });
                          if (!movementOptions.includes(lastMovement)) {
                            setMovementOptions([lastMovement, ...movementOptions]);
                          }
                        }
                      }}
                    />
                    <datalist id="movements-list">
                      {movementOptions.map(opt => <option key={opt} value={opt} />)}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Data da Movimentação</label>
                  <input 
                    type="date" 
                    className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500/50 transition-colors"
                    value={movementDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setMovementDate(newDate);
                      onUpdate({
                        ...client,
                        legalProcess: {
                          processNumber,
                          court,
                          lastMovement,
                          movementDate: newDate
                        }
                      });
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showDeadlineModal && (
          <div className="fixed inset-0 bg-licorice/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowDeadlineModal(false); }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl space-y-6 relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => {
                  setDeadlineDateValue('');
                  setDeadlineTaskValue('');
                  onUpdate({ ...client, documentData: { ...docData, deadlineFatal: undefined, deadlineFatalTask: undefined } });
                  setShowDeadlineModal(false);
                }}
                className="absolute right-6 top-6 text-licorice/20 hover:text-exotic transition-colors"
                title="Remover Prazo"
              >
                <Trash2 size={20} />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-exotic/10 rounded-full flex items-center justify-center text-exotic mx-auto mb-2">
                  <Calendar size={24} />
                </div>
                <h3 className="text-xl font-bold text-licorice">Prazo Fatal</h3>
                <p className="text-sm text-licorice/40">Defina a data e a tarefa correspondente.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Data do Prazo</label>
                  <input 
                    type="date" 
                    className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-semibold focus:outline-none focus:border-exotic/50 transition-colors"
                    value={deadlineDateValue}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setDeadlineDateValue(newDate);
                      onUpdate({
                        ...client,
                        documentData: {
                          ...docData,
                          deadlineFatal: newDate,
                          deadlineFatalTask: deadlineTaskValue
                        }
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Tarefa/Anotação</label>
                  <textarea 
                    className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-medium focus:outline-none focus:border-exotic/50 transition-colors h-24 resize-none"
                    placeholder="O que deve ser feito até este prazo?"
                    value={deadlineTaskValue}
                    onChange={(e) => setDeadlineTaskValue(e.target.value)}
                    onBlur={() => {
                      onUpdate({
                        ...client,
                        documentData: {
                          ...docData,
                          deadlineFatal: deadlineDateValue,
                          deadlineFatalTask: deadlineTaskValue
                        }
                      });
                    }}
                  />
                </div>
              </div>


            </motion.div>
          </div>
        )}

        {showResultModal && (
          <div className="fixed inset-0 bg-licorice/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowResultModal(false); }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl space-y-8 relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowResultModal(false)}
                className="absolute right-6 top-6 text-licorice/20 hover:text-licorice transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-licorice">Registrar Resultado</h3>
                <p className="text-sm text-licorice/40">Insira os detalhes técnicos do acordo ou sentença para baixa no financeiro.</p>
              </div>

              <div className="flex bg-antique/50 p-1 rounded-xl gap-1">
                <button 
                  onClick={() => setResultType('acordo')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                    resultType === 'acordo' ? "bg-white text-aventurine shadow-sm" : "text-licorice/40 hover:text-licorice/60"
                  )}
                >
                  Acordo
                </button>
                <button 
                  onClick={() => setResultType('sentenca')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                    resultType === 'sentenca' ? "bg-white text-aventurine shadow-sm" : "text-licorice/40 hover:text-licorice/60"
                  )}
                >
                  Sentença
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Restituição</label>
                  <input 
                    type="text" 
                    placeholder="R$ 0,00"
                    className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-semibold focus:outline-none focus:border-aventurine/50 transition-colors"
                    value={restituicaoValue}
                    onChange={(e) => {
                      const val = formatCurrency(parseCurrency(e.target.value));
                      setRestituicaoValue(val);
                      updateHonorarios(val);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Sucumbência</label>
                  <input 
                    type="text" 
                    placeholder="R$ 0,00"
                    className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-semibold focus:outline-none focus:border-aventurine/50 transition-colors"
                    value={sucumbenciaValue}
                    onChange={(e) => {
                      const val = formatCurrency(parseCurrency(e.target.value));
                      setSucumbenciaValue(val);
                      updateHonorarios(restituicaoValue);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Parcelas</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-semibold focus:outline-none focus:border-aventurine/50 transition-colors"
                    value={parcelasValue}
                    onChange={(e) => setParcelasValue(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Honorários ({client.contract?.percentage || 20}%)</label>
                  <input 
                    type="text" 
                    placeholder="R$ 0,00"
                    className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-semibold text-aventurine focus:outline-none focus:border-aventurine/50 transition-colors"
                    value={honorariosValue}
                    onChange={(e) => setHonorariosValue(formatCurrency(parseCurrency(e.target.value)))}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40 block ml-1">Data de Pagamento</label>
                  <input 
                    type="date" 
                    className="w-full bg-antique/30 border border-licorice/5 p-4 rounded-2xl text-sm font-semibold focus:outline-none focus:border-aventurine/50 transition-colors"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={handleConfirmResult}
                className="w-full py-4 bg-aventurine text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-aventurine/20 hover:scale-105 active:scale-95 transition-all"
              >
                Confirmar Registro
              </button>
            </motion.div>
          </div>
        )}

        {showChurnModal && (
          <div className="fixed inset-0 bg-licorice/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setShowChurnModal(false); }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl flex flex-col items-center text-center gap-6 relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => {
                  setShowChurnModal(false);
                  setHasFine(null);
                  setFineValue('');
                }}
                className="absolute top-4 right-4 p-2 text-licorice/20 hover:text-licorice transition-colors"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-licorice">Confirmar Churn?</h3>
                <p className="text-sm text-licorice/60">Haverá multa contratual para este cliente?</p>
              </div>
              
              <div className="flex w-full gap-8 justify-center">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className="text-sm font-bold text-licorice/60 group-hover:text-licorice leading-none">Sim</span>
                  <div 
                    onClick={() => setHasFine(true)}
                    className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                      hasFine === true ? "bg-aventurine border-aventurine" : "bg-white border-licorice/10 group-hover:border-licorice/20"
                    )}
                  >
                    {hasFine === true && <LucideCheck size={14} className="text-white" strokeWidth={3} />}
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className="text-sm font-bold text-licorice/60 group-hover:text-licorice leading-none">Não</span>
                  <div 
                    onClick={() => setHasFine(false)}
                    className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                      hasFine === false ? "bg-aventurine border-aventurine" : "bg-white border-licorice/10 group-hover:border-licorice/20"
                    )}
                  >
                    {hasFine === false && <LucideCheck size={14} className="text-white" strokeWidth={3} />}
                  </div>
                </label>
              </div>

              {hasFine === true && (
                <div className="w-full space-y-2 text-left animate-in fade-in slide-in-from-top-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Valor da Multa (R$)</label>
                   <input 
                    type="text"
                    className="w-full px-4 py-3 bg-antique/30 border border-licorice/5 rounded-xl text-sm font-mono focus:outline-none focus:border-aventurine/50"
                    placeholder="R$ 0,00"
                    value={fineValue ? formatCurrency(parseCurrency(fineValue)) : ''}
                    onChange={(e) => setFineValue(e.target.value)}
                   />
                </div>
              )}

              <div className="w-full pt-2">
                <button 
                  onClick={handleConfirmChurn}
                  disabled={hasFine === null || (hasFine === true && !fineValue)}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-600/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const DocumentRow: React.FC<{ doc: DocumentItem; onUpdate: (u: Partial<DocumentItem>) => void; onDelete?: () => void }> = ({ doc, onUpdate, onDelete }) => {
  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case 'Pendente de Solicitar': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'Solicitado': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Validar': return 'bg-yellow-400/10 text-yellow-600 border-yellow-400/20';
      case 'Recebido': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      default: return 'bg-licorice/5 text-licorice/40 border-licorice/10';
    }
  };

  const getDotColor = (status: DocumentStatus) => {
    switch (status) {
      case 'Pendente de Solicitar': return 'bg-orange-500';
      case 'Solicitado': return 'bg-blue-500';
      case 'Validar': return 'bg-yellow-400';
      case 'Recebido': return 'bg-emerald-500';
      default: return 'bg-licorice/20';
    }
  };

  return (
    <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-licorice/5 shadow-sm group">
      <div className={cn("w-1.5 h-1.5 rounded-full", getDotColor(doc.status))} />
      <input 
        className="flex-1 text-[11px] font-semibold text-licorice bg-transparent border-none focus:outline-none"
        value={doc.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
      />
      
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onUpdate({ deadline: doc.deadline ? undefined : 'Sinalizado' })}
          className={cn(
            "p-2 rounded-lg transition-all border",
            doc.deadline ? "bg-exotic/10 border-exotic/20 text-exotic" : "bg-white border-licorice/5 text-licorice/20 hover:text-licorice/40 hover:border-licorice/10"
          )}
          title={doc.deadline ? "Prazo Sinalizado" : "Marcar Prazo"}
        >
          <Calendar size={12} />
        </button>

        <div className="relative">
          <select 
            className={cn(
              "appearance-none pl-3 pr-8 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest border focus:outline-none cursor-pointer",
              getStatusColor(doc.status)
            )}
            value={doc.status}
            onChange={(e) => onUpdate({ status: e.target.value as DocumentStatus })}
          >
            <option value="Pendente de Solicitar">Pendente de Solicitar</option>
            <option value="Solicitado">Solicitado</option>
            <option value="Validar">Validar</option>
            <option value="Recebido">Recebido</option>
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
        </div>

        {onDelete && (
          <button 
            onClick={onDelete}
            className="p-1.5 text-licorice/10 hover:text-exotic transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

const NewClientDocumentModal: React.FC<{ leads: Lead[]; onClose: () => void; onConfirm: (leadId: string, code: string) => void }> = ({ leads, onClose, onConfirm }) => {
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [code, setCode] = useState('');

  // Only show leads that don't have documentData yet
  const availableLeads = leads.filter(l => !l.documentData);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#512E2D]/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 bg-[#512E2D] text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-aventurine rounded-2xl flex items-center justify-center">
              <Plus size={24} />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Cadastrar Novo Cliente</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-10 space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Projeto / Origem</label>
              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-licorice/5 border border-licorice/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-licorice/30">ResolvePrev</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Nome do Cliente *</label>
              <select 
                className="w-full px-6 py-4 bg-antique/30 border border-licorice/5 rounded-2xl text-sm focus:outline-none focus:border-aventurine/50"
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
              >
                <option value="">Selecione um cliente...</option>
                {availableLeads.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-licorice/40">Código do Cliente *</label>
              <input 
                type="text" 
                placeholder="Ex: CLI-2024-001"
                className="w-full px-6 py-4 bg-antique/30 border border-licorice/5 rounded-2xl text-sm focus:outline-none focus:border-aventurine/50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 border border-licorice/10 rounded-2xl text-xs font-bold uppercase tracking-widest text-licorice/60 hover:bg-antique transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => onConfirm(selectedLeadId, code)}
              disabled={!selectedLeadId || !code}
              className="flex-1 py-4 bg-aventurine text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-aventurine/20 hover:bg-aventurine/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cadastrar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
