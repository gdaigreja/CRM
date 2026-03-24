import React from 'react';
import { Lead } from '../types';
import { formatCurrency } from '../utils';
import { motion } from 'motion/react';
import { TrendingUp, DollarSign, Users, Target, BarChart3, PieChart, LineChart as LineChartIcon } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface DashboardProps {
  leads: Lead[];
}

export default function Dashboard({ leads }: DashboardProps) {
  const signedLeads = leads.filter(l => l.status === 'Assinado');
  
  // 0. Total Pago pelos Clientes: Soma de Valor Pago apenas para Assinados
  const totalPaid = signedLeads.reduce((acc, curr) => acc + (curr.valuePaid || 0), 0);

  // 1. Projeção de Recuperação: Soma de Valor Pago * 0.75
  const recoveryProjection = signedLeads.reduce((acc, curr) => acc + curr.valuePaid, 0) * 0.75;
  
  // 2. Honorários Totais: (Projeção de Recuperação) * (Média das Porcentagens dos Contratos)
  const avgPercentage = signedLeads.length > 0 
    ? signedLeads.reduce((acc, curr) => acc + (curr.contract?.percentage || 20), 0) / signedLeads.length
    : 20;
  
  const totalFees = recoveryProjection * (avgPercentage / 100);
  
  // 3. Contratos Assinados: Contagem de leads com status 'Assinado'
  const signedLeadsCount = signedLeads.length;

  // 4. Ticket Médio Projetado: Total Fees / Signed Count
  const projectedAverageTicket = signedLeadsCount > 0 ? totalFees / signedLeadsCount : 0;

  // 5. Funil de Eficiência (Métricas em porcentagem)
  const totalLeads = leads.length;
  const count = (status: string) => leads.filter(l => l.status === status).length;

  const assinados = count('Assinado');
  const novos = count('Novo');
  const recuperacao = count('Recuperação');
  const qualificacao = count('Qualificação');
  const desqualificados = count('Desqualificado');
  const reuniao = count('Reunião');
  const standby = count('Stand-by');
  const recusado = count('Recusado');
  const churn = count('Churn');

  const convGeral = totalLeads > 0 ? (assinados / totalLeads) * 100 : 0;
  const alcanceContato = totalLeads > 0 ? ((totalLeads - novos - recuperacao) / totalLeads) * 100 : 0;
  
  const divisorQualificacao = totalLeads - novos - qualificacao - recuperacao;
  const indQualificacao = divisorQualificacao > 0 ? (divisorQualificacao - desqualificados) / divisorQualificacao * 100 : 0;
  
  const qualificados = divisorQualificacao - desqualificados;
  const aprovReunioes = qualificados > 0 ? (reuniao + standby + assinados + recusado) / qualificados * 100 : 0;
  
  const baseFechamento = reuniao + standby + assinados + recusado;
  const convFechamento = baseFechamento > 0 ? assinados / baseFechamento * 100 : 0;
  
  const taxaChurn = assinados > 0 ? (churn / assinados) * 100 : 0;

  // 6. Motivos de Perda (Gráfico de Rosca)
  const lossReasonsData = [
    { name: 'Desqualificado', value: desqualificados },
    { name: 'Recusado', value: recusado },
    { name: 'Churn', value: churn },
    { name: 'Recuperação', value: recuperacao },
  ].filter(item => item.value > 0);

  // 7. Evolução Mensal (Gráfico de Linhas)
  const monthlyData: { [key: string]: { total: number; signed: number } } = {};
  leads.forEach(lead => {
    if (lead.createdAt) {
      const date = new Date(lead.createdAt);
      const monthYear = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { total: 0, signed: 0 };
      }
      monthlyData[monthYear].total++;
      if (lead.status === 'Assinado') {
        monthlyData[monthYear].signed++;
      }
    }
  });

  const monthlyEvolutionData = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    rate: (data.signed / data.total) * 100
  })).sort((a, b) => {
    // Basic sort for month/year (Jan 26, Feb 26, etc.)
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const [monthA, yearA] = a.month.split(' de ');
    const [monthB, yearB] = b.month.split(' de ');
    if (yearA !== yearB) return yearA.localeCompare(yearB);
    return months.indexOf(monthA.toLowerCase()) - months.indexOf(monthB.toLowerCase());
  });

  // Funnel Data
  const funnelData = [
    { name: 'Novo', value: leads.filter(l => l.status === 'Novo').length },
    { name: 'Qualificação', value: leads.filter(l => l.status === 'Qualificação').length },
    { name: 'Follow-up', value: leads.filter(l => l.status === 'Follow-up').length },
    { name: 'Reunião', value: leads.filter(l => l.status === 'Reunião').length },
    { name: 'Stand-by', value: leads.filter(l => l.status === 'Stand-by').length },
    { name: 'Assinado', value: leads.filter(l => l.status === 'Assinado').length },
  ];

  // Colors for charts
  const COLORS = ['#2D2A26', '#4A453E', '#6B6359', '#8C8275', '#AD9F8F'];

  return (
    <div className="h-full overflow-y-auto p-8 no-scrollbar bg-antique/30">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Financial Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard 
            title="Total pago pelos clientes" 
            value={formatCurrency(totalPaid)} 
            icon={<DollarSign size={20} />}
            description="Soma total investida pelos leads"
          />
          <MetricCard 
            title="Projeção de Recuperação" 
            value={formatCurrency(recoveryProjection)} 
            icon={<TrendingUp size={20} />}
            description="75% da soma de leads assinados"
          />
          <MetricCard 
            title="Projeção de Honorários" 
            value={formatCurrency(totalFees)} 
            icon={<DollarSign size={20} />}
            description="Projeção de recebimento"
          />
          <MetricCard 
            title="Ticket Médio Projetado" 
            value={formatCurrency(projectedAverageTicket)} 
            icon={<Target size={20} />}
            description="Média por contrato assinado"
          />
          <MetricCard 
            title="Contratos Assinados" 
            value={signedLeadsCount.toString()} 
            icon={<Target size={20} />}
            description="Total de contratos fechados"
          />
        </div>

        {/* Efficiency Block */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-licorice/40" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-licorice/40">Funil de Eficiência</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <EfficiencyCard title="Conv. Geral" value={convGeral} />
            <EfficiencyCard title="Alcance Contato" value={alcanceContato} />
            <EfficiencyCard title="Índice Qualif." value={indQualificacao} />
            <EfficiencyCard title="Aprov. Reuniões" value={aprovReunioes} />
            <EfficiencyCard title="Conv. Fechamento" value={convFechamento} />
            <EfficiencyCard title="Taxa de Churn" value={taxaChurn} />
          </div>
        </div>

        {/* New Visualizations Block */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Loss Reasons Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-licorice/5 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-licorice/40">Motivos de Perda</h3>
              <PieChart size={16} className="text-licorice/20" />
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={lossReasonsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={100}
                    paddingAngle={0}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {lossReasonsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Evolution Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-licorice/5 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-licorice/40">Evolução Mensal</h3>
              <LineChartIcon size={16} className="text-licorice/20" />
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyEvolutionData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#2D2A26' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#2D2A26' }}
                    unit="%"
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de Conversão']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#2D2A26" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#2D2A26', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Taxa de Conversão"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Block */}
        <div className="grid grid-cols-1 gap-6 pb-8">
          {/* Funnel Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-licorice/5 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-licorice/40">Funil de Conversão</h3>
              <BarChart3 size={16} className="text-licorice/20" />
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#2D2A26' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#2D2A26' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f5f5f5' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EfficiencyCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-licorice/5 flex flex-col gap-2">
      <h3 className="text-[9px] uppercase font-bold text-licorice/30 tracking-widest truncate">{title}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold text-licorice">{value.toFixed(1)}</span>
        <span className="text-[10px] font-bold text-licorice/40">%</span>
      </div>
      <div className="w-full bg-antique h-1 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          className="h-full bg-aventurine"
        />
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, description }: { title: string; value: string; icon: React.ReactNode; description: string }) {
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-licorice/5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className="p-2 bg-antique rounded-lg text-licorice/60">
          {icon}
        </div>
        <span className="text-[10px] font-bold text-aventurine bg-aventurine/5 px-2 py-0.5 rounded-full">
          +12%
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-[10px] uppercase font-bold text-licorice/30 tracking-widest">{title}</h3>
        <p className="text-2xl font-bold tracking-tight text-licorice">{value}</p>
      </div>
      <p className="text-[10px] text-licorice/40 font-medium">{description}</p>
    </motion.div>
  );
}
