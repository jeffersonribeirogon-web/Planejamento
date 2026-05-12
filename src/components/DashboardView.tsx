import { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { ScheduleEntry } from '../lib/utils';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Settings, 
  TrendingUp, 
  Package, 
  Calendar as CalendarIcon,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardViewProps {
  entries: ScheduleEntry[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

export function DashboardView({ entries }: DashboardViewProps) {
  const [selectedDay, setSelectedDay] = useState<string>('');

  // Available days for filter
  const availableDays = useMemo(() => {
    const days = Array.from(new Set(entries.map(e => format(e.date, 'yyyy-MM-dd'))));
    return days.sort();
  }, [entries]);

  // Auto-select today's date when entries are loaded
  useEffect(() => {
    if (entries.length > 0 && !selectedDay) {
      const now = new Date();
      const productionDate = now.getHours() < 6 
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        : now;
      
      const todayStr = format(productionDate, 'yyyy-MM-dd');
      if (availableDays.includes(todayStr)) {
        setSelectedDay(todayStr);
      } else {
        setSelectedDay('all');
      }
    }
  }, [entries, availableDays, selectedDay]);

  // Filter entries based on selected day
  const filteredEntries = useMemo(() => {
    if (selectedDay === 'all' || !selectedDay) return entries;
    return entries.filter(e => format(e.date, 'yyyy-MM-dd') === selectedDay);
  }, [entries, selectedDay]);

  // Alerts: Sizes starting within 36 hours
  const upcomingAlerts = useMemo(() => {
    const now = new Date();
    const thirtySixHoursFromNow = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    
    // Group upcoming entries by productCode
    const upcoming = entries.filter(e => {
      const entryTime = e.date.getTime();
      return entryTime >= now.getTime() && entryTime <= thirtySixHoursFromNow.getTime();
    });

    const products = new Map<string, { machine: string, date: Date, materials: Set<string>, pieceQty: number }>();
    upcoming.forEach(e => {
      if (!products.has(e.productCode)) {
        products.set(e.productCode, { machine: e.machine, date: e.date, materials: new Set(), pieceQty: 0 });
      }
      const data = products.get(e.productCode)!;
      data.materials.add(e.material);
      data.pieceQty += (e.productPieceQty || 0);
    });

    return Array.from(products.entries()).map(([productCode, info]) => ({
      productCode,
      ...info,
      materials: Array.from(info.materials).slice(0, 3) // Only show first 3 to keep it small
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [entries]);

  // Statistics
  const stats = useMemo(() => {
    const materialUsage: Record<string, number> = {};
    const machineUsage: Record<string, number> = {};
    const dailyUsage: Record<string, number> = {};
    let totalWeight = 0;

    filteredEntries.forEach(e => {
      const qty = parseFloat(e.quantity) || 0;
      totalWeight += qty;

      // Material Usage
      materialUsage[e.material] = (materialUsage[e.material] || 0) + qty;
      
      // Machine Usage
      machineUsage[e.machine] = (machineUsage[e.machine] || 0) + qty;

      // Daily Usage (for the full dataset, but we show trend)
      const dayKey = format(e.date, 'dd/MM');
      dailyUsage[dayKey] = (dailyUsage[dayKey] || 0) + qty;
    });

    const topMaterials = Object.entries(materialUsage)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const machineStats = Object.entries(machineUsage)
      .map(([name, value]) => ({ name: `Máq ${name}`, value }))
      .sort((a, b) => b.value - a.value);

    const trendData = Object.entries(dailyUsage)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
          const [d1, m1] = a.name.split('/').map(Number);
          const [d2, m2] = b.name.split('/').map(Number);
          return (m1 * 100 + d1) - (m2 * 100 + d2);
      });

    return {
      totalWeight,
      topMaterial: topMaterials[0],
      topMachine: machineStats[0],
      topMaterials,
      machineStats,
      trendData,
      uniqueMaterials: Object.keys(materialUsage).length,
      activeMachines: Object.keys(machineUsage).length
    };
  }, [filteredEntries]);

  const numberFormatter = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Production Alerts */}
      <AnimatePresence>
        {upcomingAlerts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 fill-amber-500/10" />
              <h3 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Aviso de Produção (Próximas 36h)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {upcomingAlerts.map((alert, idx) => (
                <motion.div 
                  key={`${alert.productCode}-${alert.machine}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex items-center justify-between group hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-amber-200 dark:border-amber-900/30 shadow-sm shadow-amber-500/5">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest leading-none mb-1">Entra em linha</p>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {alert.productCode} 
                        {alert.pieceQty > 0 && <span className="ml-2 text-[10px] text-amber-600/70 font-black">({alert.pieceQty} pçs)</span>}
                      </h4>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {alert.materials.map(mat => (
                          <span key={mat} className="text-[8px] font-black bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/30 text-slate-500 uppercase">
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-2 py-0.5 bg-amber-200 dark:bg-amber-900/50 rounded-md text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-tighter mb-1">
                      Máq {alert.machine}
                    </div>
                    <p className="text-[10px] font-bold text-slate-500">
                      {format(alert.date, "HH:mm 'de' dd/MM")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Análise de Produção</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Visão estratégica do consumo de materiais e eficiência das máquinas</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 px-3 py-1.5 text-slate-500 dark:text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-[10px] uppercase font-black tracking-widest">Filtrar Dia</span>
          </div>
          <select 
            className="bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 appearance-none min-w-[140px] shadow-sm select-none"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            <option value="all">Todos os Dias</option>
            {availableDays.map(day => (
              <option key={day} value={day}>
                {format(new Date(day + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Package} 
          label="Volume Total" 
          value={`${numberFormatter.format(stats.totalWeight)} kg`} 
          color="indigo" 
          subtext={`${stats.uniqueMaterials} compostos diferentes`}
        />
        <StatCard 
          icon={Trophy} 
          label="Mais Utilizado" 
          value={stats.topMaterial?.name || 'N/A'} 
          color="amber" 
          subtext={`${numberFormatter.format(stats.topMaterial?.value || 0)} kg consumidos`}
        />
        <StatCard 
          icon={Settings} 
          label="Máquina Líder" 
          value={stats.topMachine?.name || 'N/A'} 
          color="emerald" 
          subtext={`${numberFormatter.format(stats.topMachine?.value || 0)} kg processados`}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Máquinas Ativas" 
          value={stats.activeMachines.toString()} 
          color="blue" 
          subtext="Em operação no período"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Analysis */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <div className="w-2 h-8 bg-indigo-600 rounded-full" />
              Tendência de Consumo
            </h3>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trendData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={15}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val) => `${Math.round(val/1000)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '16px', 
                    padding: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}
                  labelStyle={{ color: '#6366f1', fontSize: '10px', fontWeight: 900, marginBottom: '4px', textTransform: 'uppercase' }}
                  formatter={(val: number) => [`${numberFormatter.format(val)} kg`, 'Consumo']}
                />
                <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Materials */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px]">
          <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8 flex items-center gap-3">
             <div className="w-2 h-8 bg-amber-500 rounded-full" />
             Top 5 Compostos
          </h3>
          <div className="flex-1 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.topMaterials}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.topMaterials.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '16px', 
                        padding: '12px'
                    }}
                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}
                    formatter={(val: number) => [`${numberFormatter.format(val)} kg`, 'Total']}
                />
                <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    formatter={(val) => <span className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Machine Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8 flex items-center gap-3">
           <div className="w-2 h-8 bg-emerald-500 rounded-full" />
           Carga de Trabalho por Máquina
        </h3>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.machineStats} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                tickFormatter={(val) => `${Math.round(val/1000)}k`}
              />
              <Tooltip 
                cursor={{ fill: '#f1f5f9', radius: 10 }}
                contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '16px', 
                    padding: '12px'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}
                labelStyle={{ color: '#10b981', fontSize: '10px', fontWeight: 900, marginBottom: '4px', textTransform: 'uppercase' }}
                formatter={(val: number) => [`${numberFormatter.format(val)} kg`, 'Total']}
              />
              <Bar 
                dataKey="value" 
                fill="#10b981" 
                radius={[8, 8, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, subtext }: { 
    icon: any, label: string, value: string, color: string, subtext: string 
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400',
    amber: 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300", colorMap[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight truncate">{value}</h4>
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 opacity-80">{subtext}</p>
    </div>
  );
}
