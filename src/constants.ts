import { Lead, DocumentItem } from './types';

export const DEFAULT_DOCUMENTS: DocumentItem[] = [
  { id: 'd1', name: 'RG ou CNH', status: 'Pendente de Solicitar', type: 'obrigatório' },
  { id: 'd2', name: 'Comprovante de Residência', status: 'Pendente de Solicitar', type: 'obrigatório' },
  { id: 'd3', name: 'Contrato de Compra e Venda', status: 'Pendente de Solicitar', type: 'obrigatório' },
  { id: 'd4', name: 'Briefing', status: 'Pendente de Solicitar', type: 'obrigatório' },
  { id: 'd5', name: 'Extrato de Pagamentos', status: 'Pendente de Solicitar', type: 'obrigatório' },
];

export const INITIAL_LEADS: Lead[] = [];

export const KANBAN_COLUMNS = [
  'Novo',
  'Qualificação',
  'Follow-up',
  'Reunião',
  'Stand-by',
  'Assinado',
  'Churn',
  'Recusado',
  'Desqualificado',
  'Recuperação'
];
