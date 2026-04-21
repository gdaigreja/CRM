import { Lead, DocumentItem } from '../../shared/types';

export const DEFAULT_DOCUMENTS: DocumentItem[] = [
  { id: 'd1', name: 'RG ou CNH', status: 'Pendente de Solicitar', type: 'obrigatório' },
  { id: 'd2', name: 'Comprovante de Residência', status: 'Pendente de Solicitar', type: 'obrigatório' },
  { id: 'd3', name: 'Certidão de Nascimento ou Casamento', status: 'Pendente de Solicitar', type: 'obrigatório' },
  { id: 'd4', name: 'CTPS (Física e Digital)', status: 'Pendente de Solicitar', type: 'obrigatório' },
  { id: 'd5', name: 'Carnê INSS', status: 'Pendente de Solicitar', type: 'obrigatório' },
  { id: 'd6', name: 'Reservista', status: 'Pendente de Solicitar', type: 'obrigatório' },
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
