export type LeadStatus = string;

export interface Lead {
  id: string;
  name: string;
  profession: string;
  phone: string;
  city: string;
  state: string;
  valuePaid: number;
  propertyType: string;
  brokerage: number;
  delays: number;
  signedDistrato: string;
  notes: string;
  proposal: number;
  status: LeadStatus;

  // Advanced fields
  address?: string;
  neighborhood?: string;
  zipCode?: string;
  email?: string;
  rg?: string;
  cpf?: string;
  contract?: ContractData;
  createdAt?: string;

  // Document Management fields
  documentData?: ClientDocumentData;
  financialRecord?: FinancialRecord;
  userId?: string;
  spouseInfo?: SpouseInfo;
  archived?: boolean;
}

export interface LegalProcessInfo {
  processNumber?: string;
  respondent?: string;
  court?: string;
  lastMovement?: string;
  movementDate?: string;
}

export interface SpouseInfo {
  name: string;
  cpf: string;
  rg: string;
  phone: string;
  email: string;
}

export type DocumentStatus = 'Pendente de Solicitar' | 'Solicitado' | 'Validar' | 'Recebido';

export interface DocumentItem {
  id: string;
  name: string;
  status: DocumentStatus;
  deadline?: string;
  type: 'obrigatório' | 'eventual';
}

export interface Observation {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface ClientDocumentData {
  code: string;
  documents: DocumentItem[];
  observations: Observation[];
  deadlineFatal?: string;
  deadlineFatalTask?: string;
  legalProcess?: LegalProcessInfo;
  emailSent: boolean;
  notificationSent: boolean;
  rescisaoFormalizada?: boolean;
  minutaHomologada?: boolean;
}

export interface ContractData {
  percentage: number;
  format: string;
  value: number;
  paymentMethod: string;
  installments: number;
  dueDate: number;
  firstInstallmentDate: string;
  generateBilling: boolean;
}

export interface FinancialRecord {
  // Bloco A
  multaRescisoriaDevida?: number;
  dataChurn?: string;
  statusExecucao?: 'Aguardando' | 'Processo de Execução Iniciado';

  // Bloco B
  tipoResultado?: 'acordo' | 'sentenca_procedente' | 'improcedente';
  valorAcordo?: number;
  dataPagamento?: string;
  valorHonorarios?: number;
  valorCondenacao?: number;
  valorRestituicao?: number;
  honorariosSucumbenciaisContratuais?: number;
  parcelasResultado?: number;
  parcelasPagas?: number;
  motivoImprocedencia?: string;
  anexoSentenca?: string;
  statusResultado?: 'em_pagamento' | 'finalizado';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  priority: 'baixa' | 'media' | 'alta';
  dueDate?: string;
  createdAt: string;
  leadId?: string; // Optional link to a lead
}
