import React, { useMemo, useState } from 'react';
import { Lead, FinancialRecord } from '../../../shared/types';
import { cn, formatCurrency } from '../../../shared/utils';
import {
  AlertCircle,
  TrendingUp,
  DollarSign,
  PieChart,
  Clock,
  CheckCircle2,
  XCircle,
  GripVertical,
  ChevronRight,
  Plus,
  Pencil,
  Check,
  Search,
  Filter,
  ChevronDown,
  BarChart2
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface FinanceProps {
  leads: Lead[];
  onUpdate: (lead: Lead) => void;
  externalFilters?: {
    searchQuery: string;
    dateRange?: { start: string | null; end: string | null; label: string };
  };
}

export default function Finance({ leads, onUpdate, externalFilters }: FinanceProps) {
  const searchQuery = externalFilters?.searchQuery || '';
  const dateRange = externalFilters?.dateRange;
  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_pagamento' | 'finalizado'>('todos');

  // Churn Selection and Filter States
  const [selectedChurn, setSelectedChurn] = useState<Set<string>>(new Set());
  const [churnStatusFilter, setChurnStatusFilter] = useState<'todos' | 'Executar' | 'Executado' | 'Isento'>('todos');

  const [editing, setEditing] = useState<{ id: string; field: 'multa' | 'restituicao' | 'sucumbencia' | 'honorarios' | 'honorariosPagos' | 'parcelas' | 'inicioPenhora' } | null>(null);
  const [editValues, setEditValues] = useState<FinancialRecord | null>(null);

  const parseCurrency = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) return 0;
    return parseInt(digits) / 100;
  };

  const isWithinRange = (dateStr?: string) => {
    if (!dateRange || !dateStr) return true;
    const date = new Date(dateStr);
    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;

    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  };

  const addOneMonth = (dateStr?: string) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const d = new Date(dateStr + 'T12:00:00'); // Use noon to avoid DST issues
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleStartEdit = (lead: Lead, field: 'multa' | 'restituicao' | 'sucumbencia' | 'honorarios' | 'honorariosPagos' | 'parcelas' | 'inicioPenhora') => {
    setEditing({ id: lead.id, field });
    setEditValues({ ...lead.financialRecord! });
  };

  const handleStatusChange = (lead: Lead, newStatus: 'em_pagamento' | 'finalizado') => {
    onUpdate({
      ...lead,
      financialRecord: {
        ...lead.financialRecord!,
        statusResultado: newStatus
      }
    });
  };

  const handleSave = () => {
    if (!editing || !editValues) return;
    const lead = leads.find(l => l.id === editing.id);
    if (lead) {
      onUpdate({
        ...lead,
        financialRecord: editValues
      });
    }
    setEditing(null);
    setEditValues(null);
  };

  // Auto-save on click away
  React.useEffect(() => {
    if (!editing) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isSelect = target.tagName === 'SELECT' || target.tagName === 'OPTION';
      if (!target.closest('.editing-cell') && !isSelect) {
        handleSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editing, editValues]);

  // Filter leads for Churn Queue
  const churnLeads = useMemo(() => {
    let filtered = leads.filter(l => {
      if (l.status !== 'Churn') return false;

      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        l.name.toLowerCase().includes(query) ||
        l.cpf?.includes(query) ||
        l.email?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Status logic (Bloco A)
      const data = l.financialRecord;
      const multa = data?.multaRescisoriaDevida || 0;
      let status: 'Executar' | 'Executado' | 'Isento' = 'Executar';
      if (multa === 0) status = 'Isento';
      else if (data?.statusExecucao === 'Processo de Execução Iniciado') status = 'Executado';

      if (churnStatusFilter !== 'todos' && status !== churnStatusFilter) return false;

      // Date filter (Always use createdAt as requested)
      if (!isWithinRange(l.createdAt)) return false;

      return true;
    });

    // Sorting: Isento (1) < Executado (2) < Executar (3)
    // De baixo para cima: 1, 2, 3 -> Top is 3, Bottom is 1.
    return filtered.sort((a, b) => {
      const getWeight = (lead: Lead) => {
        const multa = lead.financialRecord?.multaRescisoriaDevida || 0;
        if (multa === 0) return 1;
        if (lead.financialRecord?.statusExecucao === 'Processo de Execução Iniciado') return 2;
        return 3;
      };
      return getWeight(b) - getWeight(a); // Descending (3, 2, 1)
    });
  }, [leads, searchQuery, churnStatusFilter]);

  // Filter leads for Results block
  const resultsLeads = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = leads.filter(l => {
      if (!l.financialRecord?.tipoResultado) return false;
      if (!l.documentData?.minutaHomologada) return false;

      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        l.name.toLowerCase().includes(query) ||
        l.cpf?.includes(query) ||
        l.email?.toLowerCase().includes(query);

      const status = l.financialRecord?.statusResultado || 'em_pagamento';
      const matchesStatus = statusFilter === 'todos' || status === statusFilter;

      // Date filter (Always use createdAt as requested)
      if (!isWithinRange(l.createdAt)) return false;

      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      // First sort by status: 'em_pagamento' first, then 'finalizado'
      const statusA = a.financialRecord?.statusResultado === 'finalizado' ? 1 : 0;
      const statusB = b.financialRecord?.statusResultado === 'finalizado' ? 1 : 0;
      if (statusA !== statusB) return statusA - statusB;

      // Then sort by proximity to today
      const dateA = a.financialRecord?.dataPagamento ? new Date(a.financialRecord.dataPagamento + 'T00:00:00') : new Date(8640000000000000);
      const dateB = b.financialRecord?.dataPagamento ? new Date(b.financialRecord.dataPagamento + 'T00:00:00') : new Date(8640000000000000);

      const diffA = Math.abs(dateA.getTime() - today.getTime());
      const diffB = Math.abs(dateB.getTime() - today.getTime());

      return diffA - diffB;
    });
  }, [leads, searchQuery, statusFilter, dateRange]);

  // Metrics
  const metrics = useMemo(() => {
    // 1. Restituído = soma das restituições
    const restituido = leads.reduce((acc, l) => {
      if (!isWithinRange(l.createdAt)) return acc;
      return acc + (l.financialRecord?.valorRestituicao || 0);
    }, 0);

    // 2. Sucumbência = soma das sucumbências
    const sucumbencia = leads.reduce((acc, l) => {
      if (!isWithinRange(l.createdAt)) return acc;
      return acc + (l.financialRecord?.honorariosSucumbenciaisContratuais || 0);
    }, 0);

    // 3. Honorários = soma dos honorários
    const honorarios = leads.reduce((acc, l) => {
      if (!isWithinRange(l.createdAt)) return acc;
      return acc + (l.financialRecord?.valorHonorarios || 0);
    }, 0);

    // 4. Receita de churn (previsto) = soma apenas de churn com status 'Executado'
    const receitaChurnPrevisto = leads.reduce((acc, l) => {
      if (l.status === 'Churn' && l.financialRecord?.statusExecucao === 'Processo de Execução Iniciado') {
        if (!isWithinRange(l.createdAt)) return acc;
        return acc + (l.financialRecord?.multaRescisoriaDevida || 0);
      }
      return acc;
    }, 0);

    return { restituido, sucumbencia, honorarios, receitaChurnPrevisto };
  }, [leads, dateRange]);

  // Loss Rate Monthly Data
  const lossRateChartData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
        month: d.getMonth(),
        year: d.getFullYear(),
        churn: 0,
        signed: 0
      });
    }

    leads.forEach(l => {
      // Find month of interest
      let leadDate: Date | null = null;
      if (l.status === 'Churn') {
        const dateStr = l.financialRecord?.dataChurn || l.createdAt;
        leadDate = dateStr ? new Date(dateStr) : null;
      } else if (l.status === 'Assinado') {
        const dateStr = l.createdAt;
        leadDate = dateStr ? new Date(dateStr) : null;
      }

      if (leadDate) {
        const m = leadDate.getMonth();
        const y = leadDate.getFullYear();
        const dataPoint = months.find(dp => dp.month === m && dp.year === y);
        if (dataPoint) {
          if (l.status === 'Churn') dataPoint.churn++;
          if (l.status === 'Assinado') dataPoint.signed++;
        }
      }
    });

    return months.map(m => {
      const total = m.churn + m.signed;
      const rate = total > 0 ? (m.churn / total) * 100 : 0;
      return {
        name: m.name,
        taxa: parseFloat(rate.toFixed(1))
      };
    });
  }, [leads]);

  const handleGroupForExecution = () => {
    const toUpdate = churnLeads.filter(l => selectedChurn.has(l.id));
    toUpdate.forEach(lead => {
      if ((lead.financialRecord?.multaRescisoriaDevida || 0) > 0) {
        onUpdate({
          ...lead,
          financialRecord: {
            ...lead.financialRecord,
            statusExecucao: 'Processo de Execução Iniciado' as const
          }
        });
      }
    });
    setSelectedChurn(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedChurn.size === churnLeads.length) {
      setSelectedChurn(new Set());
    } else {
      setSelectedChurn(new Set(churnLeads.map(l => l.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedChurn);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedChurn(next);
  };

  const getDaysWaiting = (dateStr?: string) => {
    if (!dateStr) return 0;
    const start = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="h-full flex flex-col bg-antique overflow-y-auto no-scrollbar">
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-6 p-6">
        <MetricCard
          title="Restituído"
          value={formatCurrency(metrics.restituido)}
          icon={<DollarSign size={20} />}
          color="bg-success"
        />
        <MetricCard
          title="Sucumbência"
          value={formatCurrency(metrics.sucumbencia)}
          icon={<TrendingUp size={20} />}
          color="bg-info"
        />
        <MetricCard
          title="Honorários"
          value={formatCurrency(metrics.honorarios)}
          icon={<PieChart size={20} />}
          color="bg-[#C5A059]"
        />
        <MetricCard
          title="Receita de Churn (Previsto)"
          value={formatCurrency(metrics.receitaChurnPrevisto)}
          icon={<AlertCircle size={20} />}
          color="bg-exotic"
        />
      </div>

      <div className="px-6 pb-6 flex flex-col gap-6">
        {/* Bloco A: Resultados Contra Loteadora */}
        {/* Bloco A: Resultados Contra Loteadora */}
        <section className="h-[308px] flex-shrink-0 overflow-hidden flex flex-col card">
          <div className="bg-surface-2/60 text-licorice/60 px-5 py-3 min-h-[48px] flex items-center justify-between border-b border-licorice/6 flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-[#C5A059]" strokeWidth={3} />
              <h2 className="section-label">Resultados Contra Loteadora</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-licorice/30" size={12} />
                <select
                  className="pl-9 pr-10 py-1.5 bg-white/50 border border-licorice/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-licorice/60 focus:outline-none appearance-none cursor-pointer shadow-sm min-w-[200px]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="todos">Todos os Status</option>
                  <option value="em_pagamento">Em Pagamento</option>
                  <option value="finalizado">Finalizado</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-licorice/30 pointer-events-none" size={12} />
              </div>
            </div>
          </div>

          <div className="overflow-auto flex-1 no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-licorice/10" style={{ background: '#FDFDFB' }}>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Cliente</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Resultado</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Restituição</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Parc.</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Valor Parcela</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Sucumbência</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Hon. Devido</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Hon. Pago</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40 text-center">Inic. Pen.</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-licorice/5">
                {resultsLeads.map((lead) => {
                  const record = lead.financialRecord!;
                  const isProcedente = record.tipoResultado === 'sentenca_procedente' || record.tipoResultado === 'acordo';
                  const isImprocedente = record.tipoResultado === 'improcedente';
                  const isAnyFieldEditing = editing?.id === lead.id;
                  const currentRecord = isAnyFieldEditing ? editValues! : record;
                  const isFinalizado = record.statusResultado === 'finalizado';

                  return (
                    <tr 
                      key={lead.id} 
                      className="hover:bg-antique/10 transition-colors group"
                    >
                      <td className="px-6 py-3">
                        <span className="text-sm font-semibold text-licorice">{lead.name}</span>
                      </td>
                      <td className="px-6 py-3">
                        {record.tipoResultado === 'acordo' && (
                          <span className="px-2 py-0.5 rounded-full bg-aventurine/10 text-aventurine text-[10px] font-bold uppercase">Acordo</span>
                        )}
                        {record.tipoResultado === 'sentenca_procedente' && (
                          <span className="px-2 py-0.5 rounded-full bg-aventurine/10 text-aventurine text-[10px] font-bold uppercase">Sentença</span>
                        )}
                        {record.tipoResultado === 'improcedente' && (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-exotic/10 text-exotic text-[10px] font-bold uppercase">Improcedente</span>
                            <AlertCircle size={14} className="text-[#C5A059]" title="Análise necessária" />
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-3 cursor-pointer" onClick={() => handleStartEdit(lead, 'restituicao')}>
                        {editing?.id === lead.id && editing?.field === 'restituicao' ? (
                          <div className="editing-cell">
                            <input
                              type="text"
                              autoFocus
                              className="bg-white border border-aventurine/20 px-3 py-1.5 rounded-lg text-xs font-mono w-28 focus:outline-none focus:ring-2 focus:ring-aventurine/10 text-licorice font-bold"
                              value={formatCurrency(currentRecord.valorRestituicao || 0)}
                              onChange={(e) => setEditValues({ ...editValues!, valorRestituicao: parseCurrency(e.target.value) })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                              onBlur={handleSave}
                            />
                          </div>
                        ) : (
                          <span className="text-sm font-mono text-licorice/60">
                            {isImprocedente ? (
                              <span className={cn(
                                "text-xs italic",
                                isFinalizado ? "text-aventurine" : "text-exotic/80"
                              )}>{record.motivoImprocedencia || 'N/I'}</span>
                            ) : (
                              formatCurrency(record.valorRestituicao || 0)
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 cursor-pointer" onClick={() => handleStartEdit(lead, 'parcelas')}>
                        {editing?.id === lead.id && editing?.field === 'parcelas' ? (
                          <div className="editing-cell flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (editValues?.statusResultado === 'finalizado') {
                                  setEditValues({ 
                                    ...editValues!, 
                                    statusResultado: 'em_pagamento',
                                    parcelasPagas: editValues?.parcelasResultado || 1
                                  });
                                } else {
                                  const next = Math.max(1, (editValues?.parcelasPagas || 1) - 1);
                                  setEditValues({ ...editValues!, parcelasPagas: next });
                                }
                              }}
                              className="w-6 h-6 rounded bg-antique/50 flex items-center justify-center text-licorice/40 hover:text-licorice"
                            >
                              -
                            </button>
                            <div className="flex items-center text-xs font-bold min-w-[32px] justify-center">
                              {editValues?.statusResultado === 'finalizado' ? (
                                <span className="text-aventurine">Finalizado</span>
                              ) : (
                                <div className="flex items-center text-licorice/60">
                                  {editValues?.parcelasPagas}
                                  <span className="mx-1">/</span>
                                  <input
                                    type="number"
                                    autoFocus
                                    className="w-8 bg-transparent border-none p-0 text-xs font-bold focus:outline-none text-center"
                                    value={editValues?.parcelasResultado}
                                    onChange={(e) => setEditValues({ ...editValues!, parcelasResultado: parseInt(e.target.value) || 1 })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                  />
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const total = editValues?.parcelasResultado || 1;
                                const current = editValues?.parcelasPagas || 1;
                                if (editValues?.statusResultado === 'finalizado') return;
                                
                                if (current < total) {
                                  const nextDate = addOneMonth(editValues?.dataPagamento);
                                  setEditValues({ ...editValues!, parcelasPagas: current + 1, dataPagamento: nextDate });
                                } else if (current === total) {
                                  setEditValues({ ...editValues!, statusResultado: 'finalizado' });
                                }
                              }}
                              className="w-6 h-6 rounded bg-antique/50 flex items-center justify-center text-licorice/40 hover:text-licorice"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className={cn(
                            "text-xs font-bold",
                            record.statusResultado === 'finalizado' ? "text-aventurine" : "text-licorice/60"
                          )}>
                            {record.statusResultado === 'finalizado' 
                              ? 'Finalizado' 
                              : `${record.parcelasPagas || 1}/${record.parcelasResultado || 1}`}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm font-mono text-licorice/40">
                          {formatCurrency((currentRecord.valorRestituicao || 0) / (currentRecord.parcelasResultado || 1))}
                        </span>
                      </td>
                      <td className="px-6 py-3 cursor-pointer" onClick={() => handleStartEdit(lead, 'sucumbencia')}>
                        {editing?.id === lead.id && editing?.field === 'sucumbencia' ? (
                          <div className="editing-cell">
                            <input
                              type="text"
                              autoFocus
                              className="bg-white border border-aventurine/20 px-3 py-1.5 rounded-lg text-xs font-mono w-28 focus:outline-none focus:ring-2 focus:ring-aventurine/10 text-licorice font-bold"
                              value={formatCurrency(currentRecord.honorariosSucumbenciaisContratuais || 0)}
                              onChange={(e) => setEditValues({ ...editValues!, honorariosSucumbenciaisContratuais: parseCurrency(e.target.value) })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                              onBlur={handleSave}
                            />
                          </div>
                        ) : (
                          <span className="text-sm font-mono text-licorice/60">
                            {formatCurrency(record.honorariosSucumbenciaisContratuais || 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 cursor-pointer" onClick={() => handleStartEdit(lead, 'honorarios')}>
                        {editing?.id === lead.id && editing?.field === 'honorarios' ? (
                          <div className="editing-cell">
                            <input
                              type="text"
                              autoFocus
                              className="bg-white border border-aventurine/20 px-3 py-1.5 rounded-lg text-xs font-bold text-aventurine w-28 focus:outline-none focus:ring-2 focus:ring-aventurine/10"
                              value={formatCurrency(currentRecord.valorHonorarios || 0)}
                              onChange={(e) => setEditValues({ ...editValues!, valorHonorarios: parseCurrency(e.target.value) })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                              onBlur={handleSave}
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-aventurine">
                            {formatCurrency(record.valorHonorarios || 0) || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 cursor-pointer" onClick={() => handleStartEdit(lead, 'honorariosPagos')}>
                        {editing?.id === lead.id && editing?.field === 'honorariosPagos' ? (
                          <div className="editing-cell">
                            <input
                              type="text"
                              autoFocus
                              className="bg-white border border-aventurine/20 px-3 py-1.5 rounded-lg text-xs font-bold w-28 focus:outline-none focus:ring-2 focus:ring-aventurine/10 text-licorice"
                              value={formatCurrency(currentRecord.honorariosPagos || 0)}
                              onChange={(e) => setEditValues({ ...editValues!, honorariosPagos: parseCurrency(e.target.value) })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                              onBlur={handleSave}
                            />
                          </div>
                        ) : (
                          <span className={cn(
                            "text-xs font-bold",
                            (record.honorariosPagos || 0) < (record.valorHonorarios || 0) ? "text-[#F59E0B]" : "text-[#00A63E]"
                          )}>
                            {formatCurrency(record.honorariosPagos || 0) || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-licorice/20 text-aventurine focus:ring-aventurine/20 cursor-pointer"
                            checked={record.inicioPenhora || false}
                            onChange={(e) => {
                              onUpdate({
                                ...lead,
                                financialRecord: {
                                  ...record,
                                  inicioPenhora: e.target.checked
                                }
                              });
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-0.5">
                          {currentRecord.dataPagamento && (
                            <span className="text-sm font-mono text-licorice/40">{new Date(currentRecord.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          )}
                          {record.anexoSentenca && (
                            <button className="text-[10px] font-bold text-aventurine uppercase flex items-center gap-1 hover:underline">
                              Sentença
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex gap-6 pb-6">
          {/* Bloco B: Fila de Execução */}
          <section className="flex-1 h-[353px] overflow-hidden flex flex-col card">
            <div className="bg-surface-2/50 text-licorice/60 px-5 py-3 flex items-center justify-between min-h-[48px] border-b border-licorice/6 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-[#C5A059]" strokeWidth={3} />
                  <h2 className="section-label">Fila de Execução (Churn)</h2>
                </div>
                {selectedChurn.size > 0 && (
                  <button
                    onClick={handleGroupForExecution}
                    className="flex items-center gap-1.5 px-3 py-1 bg-aventurine text-white rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-aventurine/90 transition-all shadow-sm"
                  >
                    <Check size={10} />
                    Executar ({selectedChurn.size})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-licorice/30" size={10} />
                  <select
                    className="pl-8 pr-8 py-1 bg-white/50 border border-licorice/5 rounded-full text-[9px] font-bold uppercase tracking-widest text-licorice/60 focus:outline-none appearance-none cursor-pointer shadow-sm min-w-[120px]"
                    value={churnStatusFilter}
                    onChange={(e) => setChurnStatusFilter(e.target.value as any)}
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="Executar">Executar</option>
                    <option value="Executado">Executado</option>
                    <option value="Isento">Isento</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-licorice/30 pointer-events-none" size={10} />
                </div>
              </div>
            </div>

            <div className="overflow-auto flex-1 no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-licorice/5" style={{ background: '#FDFDFB' }}>
                    <th className="pl-6 py-4 w-10">
                      <div
                        onClick={toggleSelectAll}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer",
                          selectedChurn.size === churnLeads.length && churnLeads.length > 0 ? "bg-aventurine border-aventurine" : "border-licorice/20 bg-white"
                        )}
                      >
                        {selectedChurn.size === churnLeads.length && churnLeads.length > 0 && <Check size={10} className="text-white" />}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Lead</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Multa Pen.</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Status</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-licorice/40">Churn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-licorice/5">
                  {churnLeads.map((lead) => {
                    const multa = lead.financialRecord?.multaRescisoriaDevida || 0;
                    let status: 'Executar' | 'Executado' | 'Isento' = 'Executar';
                    if (multa === 0) status = 'Isento';
                    else if (lead.financialRecord?.statusExecucao === 'Processo de Execução Iniciado') status = 'Executado';

                    return (
                      <tr key={lead.id} className={cn(
                        "hover:bg-antique/10 transition-colors",
                        selectedChurn.has(lead.id) ? "bg-antique/20" : "",
                        status === 'Executado' || status === 'Isento' ? "opacity-60" : ""
                      )}>
                        <td className="pl-6 py-3">
                          <div
                            onClick={() => toggleSelectOne(lead.id)}
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer",
                              selectedChurn.has(lead.id) ? "bg-aventurine border-aventurine" : "border-licorice/20 bg-white"
                            )}
                          >
                            {selectedChurn.has(lead.id) && <Check size={10} className="text-white" />}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm font-semibold text-licorice">{lead.name}</span>
                        </td>
                        <td className="px-6 py-3 cursor-pointer" onClick={() => handleStartEdit(lead, 'multa')}>
                          {editing?.id === lead.id && editing?.field === 'multa' ? (
                            <div className="editing-cell" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                autoFocus
                                className="bg-white border border-aventurine/20 px-3 py-1.5 rounded-lg text-xs font-mono w-28 focus:outline-none focus:ring-2 focus:ring-aventurine/10 text-licorice font-bold"
                                value={formatCurrency(editValues?.multaRescisoriaDevida || 0)}
                                onChange={(e) => setEditValues({ ...editValues!, multaRescisoriaDevida: parseCurrency(e.target.value) })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                onBlur={handleSave}
                              />
                            </div>
                          ) : (
                            <span className="text-sm font-mono text-licorice/60">
                              {formatCurrency(multa)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest inline-block text-center min-w-[80px]",
                            status === 'Isento' ? "bg-licorice/5 text-licorice/30" :
                              status === 'Executado' ? "bg-red-500/10 text-red-500" :
                                "bg-yellow-400/10 text-yellow-600"
                          )}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm font-mono text-licorice/60">
                            {lead.financialRecord?.dataChurn ? new Date(lead.financialRecord.dataChurn + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {churnLeads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-licorice/30 text-sm italic">
                        Vazio
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bloco C: Gráfico Taxa de Perda */}
          <section className="flex-1 h-[353px] overflow-hidden flex flex-col card">
            <div className="bg-surface-2/50 text-licorice/60 px-5 py-3 min-h-[48px] flex items-center border-b border-licorice/6 flex-shrink-0">
              <div className="flex items-center gap-2">
                <BarChart2 size={13} className="text-[#C5A059]" strokeWidth={3} />
                <h2 className="section-label">Taxa de Perda Mês a Mês</h2>
              </div>
            </div>

            <div className="flex-1 p-6 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lossRateChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTaxa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EA4335" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#EA4335" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#7F7874', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#7F7874', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    cursor={{ stroke: '#EA4335', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Taxa de Perda']}
                  />
                  <Area
                    type="monotone"
                    dataKey="taxa"
                    stroke="#EA4335"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTaxa)"
                    dot={{ r: 4, fill: '#EA4335', strokeWidth: 2, stroke: '#FFFFFF' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card-interactive p-5 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0", color)}
        style={{ boxShadow: '0 4px 12px rgba(26,17,16,0.15)' }}>
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="section-label truncate">{title}</span>
        <span className="font-display text-xl font-bold text-licorice">{value}</span>
      </div>
    </div>
  );
}
