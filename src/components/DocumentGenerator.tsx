import React, { useState, useCallback, useEffect } from 'react';
import { Lead } from '../types';
import { cn, formatCurrency, formatRG, formatCPF, formatPhone } from '../utils';
import { 
  FileText, 
  Upload, 
  User, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Search,
  X,
  Loader2,
  FileDown,
  Info,
  FilePlus,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Supabase Client for the component
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Variable {
  id: string;
  tag: string;
  description: string;
  field: string;
}

interface DocumentGeneratorProps {
  leads: Lead[];
}

const FIXED_VARIABLES: Variable[] = [
  // Dados Cadastrais / Cliente
  { id: '1', tag: 'nome_cliente', description: 'Nome completo do cliente', field: 'name' },
  { id: '2', tag: 'cpf_cliente', description: 'CPF do cliente', field: 'cpf' },
  { id: '3', tag: 'rg_cliente', description: 'RG do cliente', field: 'rg' },
  { id: '4', tag: 'email_cliente', description: 'E-mail do cliente', field: 'email' },
  { id: '5', tag: 'telefone_cliente', description: 'Telefone do cliente', field: 'phone' },
  { id: '6', tag: 'profissao_cliente', description: 'Profissão do cliente', field: 'profession' },
  { id: '7', tag: 'endereco_cliente', description: 'Logradouro/Endereço', field: 'address' },
  { id: '8', tag: 'bairro_cliente', description: 'Bairro do cliente', field: 'neighborhood' },
  { id: '9', tag: 'cidade_cliente', description: 'Cidade do cliente', field: 'city' },
  { id: '10', tag: 'estado_cliente', description: 'Estado (UF)', field: 'state' },
  { id: '11', tag: 'cep_cliente', description: 'CEP do cliente', field: 'zipCode' },
  
  // Dados do Lead / Negócio
  { id: '12', tag: 'valor_pago', description: 'Valor total pago pelo cliente', field: 'valuePaid' },
  { id: '13', tag: 'tipo_imovel', description: 'Tipo do imóvel (Apto, Casa, etc)', field: 'propertyType' },
  { id: '14', tag: 'valor_corretagem', description: 'Valor da corretagem', field: 'brokerage' },
  { id: '15', tag: 'atrasos_cliente', description: 'Quantidade de parcelas em atraso', field: 'delays' },
  { id: '16', tag: 'distrato_assinado', description: 'Se o distrato foi assinado (Sim/Não)', field: 'signedDistrato' },
  { id: '17', tag: 'valor_proposta', description: 'Valor da proposta de distrato', field: 'proposal' },
  
  // Dados do Contrato (Honorários/Jurídico)
  { id: '18', tag: 'percentual_contrato', description: 'Percentual de honorários (%)', field: 'contract.percentage' },
  { id: '19', tag: 'formato_contrato', description: 'Formato do contrato', field: 'contract.format' },
  { id: '20', tag: 'valor_contrato', description: 'Valor fixo do contrato', field: 'contract.value' },
  { id: '21', tag: 'metodo_pagamento', description: 'Método de pagamento', field: 'contract.paymentMethod' },
  { id: '22', tag: 'parcelas_contrato', description: 'Número de parcelas', field: 'contract.installments' },
  { id: '23', tag: 'dia_vencimento', description: 'Dia de vencimento das parcelas', field: 'contract.dueDate' },
  { id: '24', tag: 'data_primeira_parcela', description: 'Data da primeira parcela', field: 'contract.firstInstallmentDate' },
  
  // Sistema
  { id: '25', tag: 'data_atual', description: 'Data atual do sistema', field: 'data_atual' },
];

export default function DocumentGenerator({ leads }: DocumentGeneratorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [variables] = useState<Variable[]>(FIXED_VARIABLES);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.cpf?.includes(searchQuery) ||
    l.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.docx')) {
        setFile(selectedFile);
        setError(null);
        setSuccess(false);
      } else {
        setError('Por favor, selecione apenas arquivos .docx');
      }
    }
  };

  const getFieldValue = (lead: Lead, field: string) => {
    if (field === 'data_atual') return new Date().toLocaleDateString('pt-BR');
    
    // Handle nested contract fields
    let value: any;
    if (field.startsWith('contract.')) {
      const contractField = field.split('.')[1];
      value = lead.contract ? (lead.contract as any)[contractField] : null;
    } else {
      value = (lead as any)[field];
    }

    if (value === undefined || value === null || value === '') return 'Não informado';

    if (field === 'valuePaid' || field === 'brokerage' || field === 'proposal' || field === 'contract.value') {
      return formatCurrency(value);
    }
    if (field === 'contract.percentage') {
      return `${value}%`;
    }
    if (field === 'cpf') return formatCPF(value);
    if (field === 'rg') return formatRG(value);
    if (field === 'phone') return formatPhone(value);
    if (field === 'address' && !value) return `${lead.city}/${lead.state}`;
    if (field === 'contract.firstInstallmentDate' && value) {
      return new Date(value).toLocaleDateString('pt-BR');
    }

    return String(value);
  };

  const generateDocument = async () => {
    if (!file || !selectedLead) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    try {
      let fileData: ArrayBuffer;

      // Use local file
      const reader = new FileReader();
      fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = (e) => reject(new Error('Erro ao ler o arquivo.'));
        reader.readAsArrayBuffer(file);
      });

      let zip;
      try {
        zip = new PizZip(fileData);
      } catch (e) {
        throw new Error('O arquivo selecionado não é um documento Word válido (.docx).');
      }

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter() {
          return "---";
        }
      });

      // Prepare data for mapping based on fixed variables
      const data: Record<string, string> = {};
      variables.forEach(v => {
        const val = getFieldValue(selectedLead, v.field);
        data[v.tag] = val;
        // Debug log to console to help the user verify data
        console.log(`Mapping tag {{${v.tag}}} to value: ${val}`);
      });

      try {
        doc.setData(data);
        doc.render();
      } catch (e: any) {
        console.error('Docxtemplater Error:', e);
        
        // Detailed error extraction for "Multi error"
        if (e.properties && e.properties.errors instanceof Array) {
          const detailedErrors = e.properties.errors.map((err: any) => {
            let msg = err.message;
            if (err.properties && err.properties.explanation) {
              msg = `${err.properties.explanation}`;
            }
            if (err.properties && err.properties.xtag) {
              msg += ` (Tag detectada: ${err.properties.xtag})`;
            }
            return msg;
          }).join('; ');
          
          throw new Error(`Erro de sintaxe no Word: ${detailedErrors}. Verifique se as chaves {{ }} estão escritas corretamente e sem formatação diferente (negrito/cor) dentro delas.`);
        }
        
        throw new Error(e.message || 'Erro ao processar as tags do documento. Verifique se o modelo está correto.');
      }

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const fileName = `${selectedLead.name.replace(/\s+/g, '_')}_documento.docx`;
      saveAs(out, fileName);

      // Log generation to Supabase
      try {
        await supabase
          .from('generated_documents')
          .insert([{
            lead_id: selectedLead.id,
            template_id: null,
            file_name: fileName,
            file_path: 'local_download' // In a full implementation, we would upload this to storage too
          }]);
      } catch (logErr) {
        console.error('Error logging document generation:', logErr);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao gerar o documento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyTag = (tag: string, id: string) => {
    navigator.clipboard.writeText(`{{${tag}}}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-antique overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Unified Generator Block */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-[32px] border border-licorice/5 shadow-sm space-y-8">
              {/* Section 1: Template Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-antique rounded-xl flex items-center justify-center text-licorice/40 font-bold">
                      <FileText size={20} />
                    </div>
                    <h2 className="font-bold text-licorice">Modelo do Documento</h2>
                  </div>
                  <button 
                    onClick={() => { setFile(null); }}
                    className="text-xs font-bold text-aventurine hover:underline"
                  >
                    Limpar seleção
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Upload New Template */}
                  <div className="space-y-2">
                    <div 
                      className={cn(
                        "relative border-2 border-dashed rounded-[24px] p-6 transition-all flex flex-col items-center justify-center text-center gap-2 h-[200px]",
                        file ? "border-aventurine/30 bg-aventurine/5" : "border-licorice/10 hover:border-aventurine/30 hover:bg-antique/50"
                      )}
                    >
                      <input 
                        type="file" 
                        accept=".docx"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      
                      {file ? (
                        <>
                          <FilePlus size={24} className="text-aventurine" />
                          <p className="text-xs font-bold text-licorice truncate max-w-full px-2">{file.name}</p>
                        </>
                      ) : (
                        <>
                          <Upload size={24} className="text-licorice/20" />
                          <p className="text-[10px] font-bold text-licorice">Clique ou arraste o arquivo .docx aqui</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Select Client */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-antique rounded-xl flex items-center justify-center text-licorice/40 font-bold">
                    <User size={20} />
                  </div>
                  <h2 className="font-bold text-licorice">Seleção de Cliente</h2>
                </div>

                <div className="relative">
                  {selectedLead ? (
                    <div className="flex items-center justify-between p-4 bg-aventurine/5 border border-aventurine/20 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-aventurine text-white rounded-xl flex items-center justify-center font-bold">
                          {selectedLead.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-licorice">{selectedLead.name}</p>
                          <p className="text-xs text-licorice/40">{selectedLead.cpf ? formatCPF(selectedLead.cpf) : selectedLead.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedLead(null)}
                        className="p-2 text-licorice/20 hover:text-rose-500 transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-licorice/30" size={18} />
                        <input 
                          type="text" 
                          placeholder="Buscar cliente por nome ou CPF..."
                          className="w-full pl-12 pr-4 py-4 bg-antique/30 border border-licorice/5 rounded-2xl text-sm focus:outline-none focus:border-aventurine/50"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      
                      {searchQuery && filteredLeads.length > 0 && (
                        <div className="bg-white border border-licorice/5 rounded-2xl overflow-hidden shadow-xl">
                          {filteredLeads.map(lead => (
                            <button
                              key={lead.id}
                              onClick={() => {
                                setSelectedLead(lead);
                                setSearchQuery('');
                              }}
                              className="w-full p-4 text-left hover:bg-antique flex items-center gap-4 transition-all"
                            >
                              <div className="w-8 h-8 bg-licorice/5 rounded-lg flex items-center justify-center text-licorice/40 font-bold text-xs">
                                {lead.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-licorice">{lead.name}</p>
                                <p className="text-[10px] text-licorice/40 uppercase tracking-widest">{lead.city}/{lead.state}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Action Button */}
              <div className="pt-4 border-t border-licorice/5 space-y-6">
                <button 
                  onClick={generateDocument}
                  disabled={!file || !selectedLead || isProcessing}
                  className={cn(
                    "w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 shadow-lg",
                    !file || !selectedLead || isProcessing
                      ? "bg-licorice/10 text-licorice/20 cursor-not-allowed"
                      : "bg-success text-white hover:bg-success/90 shadow-success/20"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processando documento...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Gerar e Baixar Documento
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 text-sm font-bold w-full"
                    >
                      <AlertCircle size={20} />
                      {error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-4 bg-aventurine/5 border border-aventurine/10 rounded-2xl text-aventurine text-sm font-bold w-full"
                    >
                      <CheckCircle2 size={20} />
                      Operação realizada com sucesso!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column: Info & Variables */}
          <div className="space-y-8">
            <div className="bg-[#512E2D] p-8 rounded-[32px] text-white space-y-6 shadow-xl">
              <div className="flex items-center gap-3">
                <Info size={20} className="text-aventurine" />
                <h3 className="font-bold">Dicas de Uso</h3>
              </div>
              <p className="text-sm text-white leading-relaxed">
                No seu arquivo Word, use as tags entre chaves duplas, exemplo: {"{{nome_cliente}}"}.
              </p>
              
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Variáveis Disponíveis</p>
                </div>
                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                  {variables.map(v => (
                    <div key={v.id} className="bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-white/20 transition-all flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-white mb-1 truncate">
                          {"{"}{"{"}{v.tag}{"}"}{"}"}
                        </p>
                        <p className="text-[10px] text-white/40">
                          {v.description}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleCopyTag(v.tag, v.id)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          copiedId === v.id ? "text-aventurine" : "text-white/20 hover:text-white hover:bg-white/10"
                        )}
                        title="Copiar tag"
                      >
                        {copiedId === v.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
