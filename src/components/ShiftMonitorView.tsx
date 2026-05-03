import { useMemo, useState, useEffect } from 'react';
import { ScheduleEntry, getMachineUnit } from '../lib/utils';
import { format, addDays, subDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  TrendingDown, 
  Info,
  AlertCircle,
  Hash,
  Box,
  Timer
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ShiftMonitorViewProps {
  entries: ScheduleEntry[];
}

export function ShiftMonitorView({ entries }: ShiftMonitorViewProps) {
  const [now, setNow] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate current shift information
  const shiftInfo = useMemo(() => {
    const currentHour = now.getHours();
    let shiftDate: Date;
    
    // If before 6am, we are still on the "previous" production day
    if (currentHour < 6) {
      shiftDate = startOfDay(subDays(now, 1));
    } else {
      shiftDate = startOfDay(now);
    }

    const shiftStart = new Date(shiftDate);
    shiftStart.setHours(6, 0, 0, 0);
    
    const shiftEnd = addDays(shiftStart, 1);
    
    const totalMs = shiftEnd.getTime() - shiftStart.getTime();
    const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - shiftStart.getTime()));
    const progress = elapsedMs / totalMs;

    return {
      shiftDate,
      shiftStart,
      shiftEnd,
      progress,
      remainingMinutes: Math.max(0, Math.floor((shiftEnd.getTime() - now.getTime()) / 60000))
    };
  }, [now]);

  // Filter entries for the current shift day
  const shiftEntries = useMemo(() => {
    return entries.filter(e => isSameDay(startOfDay(e.date), shiftInfo.shiftDate));
  }, [entries, shiftInfo.shiftDate]);

  // Calculate totals
  const totals = useMemo(() => {
    const materialSummary: Record<string, { total: number; unit: string; machine: string; materialClass: string }> = {};
    let totalWeight = 0;

    shiftEntries.forEach(e => {
      const qty = parseFloat(e.quantity) || 0;
      totalWeight += qty;
      
      const key = `${e.machine}-${e.material}`;
      if (!materialSummary[key]) {
        materialSummary[key] = { 
          total: 0, 
          unit: e.unit, 
          machine: e.machine,
          materialClass: e.materialClass
        };
      }
      materialSummary[key].total += qty;
    });

    return {
      totalWeight,
      materials: Object.entries(materialSummary)
        .map(([key, data]) => ({
          material: key.split('-')[1],
          ...data
        }))
        .sort((a, b) => b.total - a.total)
    };
  }, [shiftEntries]);

  const numberFormatter = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header Panel */}
      <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">Monitor de Turno</h2>
            </div>
            <p className="text-slate-400 font-bold text-sm tracking-wide">
              Data de Produção: <span className="text-indigo-400">{format(shiftInfo.shiftDate, "dd 'de' MMMM", { locale: ptBR })}</span>
            </p>
          </div>

          <div className="text-right">
            <div className="text-4xl font-black text-white tabular-nums mb-1">
              {format(now, 'HH:mm')}
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Hora Atual</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-12 group">
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Progresso do Turno</span>
              <span className="text-2xl font-black text-white">{Math.round(shiftInfo.progress * 100)}%</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tempo Restante</span>
              <span className="text-lg font-black text-indigo-400">
                {Math.floor(shiftInfo.remainingMinutes / 60)}h {shiftInfo.remainingMinutes % 60}m
              </span>
            </div>
          </div>
          <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5 p-1">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              style={{ width: `${shiftInfo.progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-3 text-[9px] font-black text-slate-600 uppercase tracking-tighter">
            <span>Início 06:00</span>
            <span>Término 06:00 (+1d)</span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Falta Consumir (Estimado)</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {numberFormatter.format(totals.totalWeight * (1 - shiftInfo.progress))}
              </span>
              <span className="text-sm font-bold text-slate-400 uppercase">kg</span>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Carga Total do Dia</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{numberFormatter.format(totals.totalWeight)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-500">Consumido (Estimado)</span>
                <span className="text-xs font-black text-indigo-500">{numberFormatter.format(totals.totalWeight * shiftInfo.progress)} kg</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 opacity-10">
                <Info className="w-32 h-32" />
             </div>
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Nota Metodológica</span>
                </div>
                <p className="text-xs font-bold leading-relaxed opacity-90">
                  Os valores "Consumido" e "Faltante" são calculados com base em uma taxa de consumo linear de 24 horas (06h às 06h).
                </p>
             </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                Detalhamento por Composto
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Máquinas: {new Set(totals.materials.map(m => m.machine)).size}</span>
              </div>
            </div>
            
            <div className="p-0">
                {shiftEntries.length === 0 ? (
                  <div className="p-20 text-center">
                    <Box className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sem programação carregada para este dia</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/30 uppercase tracking-widest">
                          <th className="px-8 py-5 text-[10px] font-black text-slate-500 whitespace-nowrap">Máquina</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-500 whitespace-nowrap">Material</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-500 whitespace-nowrap text-right">Total Dia</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-500 whitespace-nowrap text-right">Taxa (kg/h)</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-500 whitespace-nowrap text-right">Já Usado (Est.)</th>
                          <th className="px-8 py-5 text-[10px] font-black text-indigo-500 whitespace-nowrap text-right">Falta (Est.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {totals.materials.map((m, idx) => (
                          <tr key={`${m.machine}-${m.material}-${idx}`} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">
                                    {getMachineUnit(m.machine)}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-[10px] font-black text-white">
                                      {m.machine}
                                    </div>
                                    <span className="text-xs font-black text-slate-400 dark:text-slate-500">MÁQ</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div>
                                <div className="text-sm font-black text-slate-900 dark:text-white uppercase">{m.material}</div>
                                <div className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">{m.materialClass}</div>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right tabular-nums">
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{numberFormatter.format(m.total)}</span>
                            </td>
                            <td className="px-8 py-6 text-right tabular-nums">
                              <span className="text-sm font-black text-slate-500">{numberFormatter.format(m.total / 24)}</span>
                            </td>
                            <td className="px-8 py-6 text-right tabular-nums">
                              <span className="text-sm font-bold text-slate-400">{numberFormatter.format(m.total * shiftInfo.progress)}</span>
                            </td>
                            <td className="px-8 py-6 text-right tabular-nums">
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                  {numberFormatter.format(m.total * (1 - shiftInfo.progress))}
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden border border-slate-200/50 dark:border-slate-700">
                                  <div 
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${(1 - shiftInfo.progress) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
