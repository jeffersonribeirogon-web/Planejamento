import { useMemo, useState } from 'react';
import { ScheduleEntry, getMachineUnit } from '../lib/utils';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Gauge, 
  Calendar as CalendarIcon,
  Filter,
  Activity,
  Cpu,
  Weight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface HourlyConsumptionViewProps {
  entries: ScheduleEntry[];
}

export function HourlyConsumptionView({ entries }: HourlyConsumptionViewProps) {
  // Available dates from entries
  const availableDates = useMemo(() => {
    const uniqueDates = Array.from(new Set(entries.map(e => format(e.date, 'yyyy-MM-dd'))));
    return uniqueDates.sort();
  }, [entries]);

  // Default to current production date or first available
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    // 06:00 production shift logic
    const productionDate = now.getHours() < 6 
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      : now;
    
    const todayStr = format(productionDate, 'yyyy-MM-dd');
    if (availableDates.includes(todayStr)) return todayStr;
    return availableDates[0] || '';
  });

  // Calculate consumption rate per machine and product code
  const machineProductRates = useMemo(() => {
    if (!selectedDate) return [];

    const dayEntries = entries.filter(e => format(e.date, 'yyyy-MM-dd') === selectedDate);
    
    // Count unique product codes per machine
    const machineProductsMap = new Map<string, Set<string>>();
    dayEntries.forEach(e => {
      if (!machineProductsMap.has(e.machine)) {
        machineProductsMap.set(e.machine, new Set());
      }
      machineProductsMap.get(e.machine)!.add(e.productCode);
    });

    // Key: machine_productCode
    const groupings: Record<string, { 
      machine: string,
      productCode: string,
      totalWeight: number, 
      materials: Record<string, { weight: number, class: string }> 
    }> = {};

    dayEntries.forEach(e => {
      const key = `${e.machine}_${e.productCode}`;
      if (!groupings[key]) {
        groupings[key] = { 
          machine: e.machine, 
          productCode: e.productCode,
          totalWeight: 0, 
          materials: {} 
        };
      }
      
      const qty = parseFloat(e.quantity) || 0;
      groupings[key].totalWeight += qty;
      
      if (!groupings[key].materials[e.material]) {
        groupings[key].materials[e.material] = { weight: 0, class: e.materialClass };
      }
      groupings[key].materials[e.material].weight += qty;
    });

    return Object.entries(groupings).map(([key, data]) => ({
      key,
      machineId: data.machine,
      productCode: data.productCode,
      totalWeight: data.totalWeight,
      hourlyRate: data.totalWeight / 24,
      hasMultipleProducts: (machineProductsMap.get(data.machine)?.size || 0) >= 2,
      materials: Object.entries(data.materials).map(([name, mData]) => ({
        name,
        class: mData.class,
        totalWeight: mData.weight,
        hourlyRate: mData.weight / 24
      })).sort((a, b) => b.totalWeight - a.totalWeight)
    })).sort((a, b) => {
      // Sort by machine first, then by product code
      const machineComp = a.machineId.localeCompare(b.machineId, undefined, { numeric: true });
      if (machineComp !== 0) return machineComp;
      return a.productCode.localeCompare(b.productCode);
    });
  }, [entries, selectedDate]);

  const numberFormatter = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Taxa de Consumo Horário</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Análise detalhada de consumo por composto e máquina</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 px-3 py-1.5 text-slate-500 dark:text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-[10px] uppercase font-black tracking-widest">Data</span>
          </div>
          <select 
            className="bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 appearance-none min-w-[160px] shadow-sm cursor-pointer"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            {availableDates.map(date => (
              <option key={date} value={date}>
                {format(new Date(date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Consumption Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {machineProductRates.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum dado para esta data</p>
          </div>
        ) : (
          machineProductRates.map((group) => (
            <div 
              key={group.key} 
              className={cn(
                "bg-white dark:bg-slate-900 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all group flex flex-col overflow-hidden",
                group.hasMultipleProducts 
                  ? "border-amber-200 dark:border-amber-900/30 hover:shadow-amber-500/10" 
                  : "border-slate-200 dark:border-slate-800 hover:shadow-indigo-500/5"
              )}
            >
              {/* Card Header */}
              <div className={cn(
                "p-8 border-b rounded-t-[2.5rem]",
                group.hasMultipleProducts 
                  ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20" 
                  : "bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800"
              )}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm",
                      group.hasMultipleProducts ? "bg-amber-600 shadow-amber-500/20" : "bg-slate-900 shadow-slate-900/20"
                    )}>
                      {group.machineId}
                    </div>
                    <div>
                      <h4 className={cn(
                        "text-[10px] font-black uppercase tracking-widest leading-none mb-1",
                        group.hasMultipleProducts ? "text-amber-600" : "text-indigo-500"
                      )}>
                        {getMachineUnit(group.machineId)}
                      </h4>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight">MÁQUINA {group.machineId}</span>
                        <span className={cn(
                          "text-[11px] font-black px-2 py-0.5 rounded-md mt-1 w-fit uppercase tracking-tighter shadow-sm border",
                          group.hasMultipleProducts 
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200/50" 
                            : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100/50"
                        )}>
                          {group.productCode}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Consumo Horário</span>
                    <span className={cn(
                      "text-xl font-black leading-none",
                      group.hasMultipleProducts ? "text-amber-600 dark:text-amber-500" : "text-indigo-600 dark:text-indigo-400"
                    )}>
                      {numberFormatter.format(group.hourlyRate)}
                      <span className="text-[10px] ml-1 uppercase">kg/h</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Size/Dia</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{numberFormatter.format(group.totalWeight)} kg</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Materiais</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{group.materials.length} itens</span>
                  </div>
                </div>
              </div>

              {/* Material List */}
              <div className="flex-1 p-6 space-y-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 flex items-center justify-between">
                  Compostos Reais
                  {group.hasMultipleProducts && (
                    <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[8px] border border-amber-500/20 animate-pulse">Multi-Produção</span>
                  )}
                </h5>
                <div className="space-y-2">
                  {group.materials.map((mat, mIdx) => (
                    <div 
                      key={`${group.key}-${mat.name}-${mIdx}`}
                      className={cn(
                        "p-4 rounded-2xl bg-white dark:bg-slate-900 border flex items-center justify-between transition-colors",
                        group.hasMultipleProducts 
                          ? "border-amber-100 dark:border-amber-900/20 hover:border-amber-500/30" 
                          : "border-slate-100 dark:border-slate-800 hover:border-indigo-500/20"
                      )}
                    >
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white uppercase mb-0.5">{mat.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">{mat.class}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                            {numberFormatter.format(mat.hourlyRate)}
                          </span>
                          <span className={cn(
                            "text-[9px] font-bold uppercase",
                            group.hasMultipleProducts ? "text-amber-500" : "text-indigo-500"
                          )}>kg/h</span>
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                          {numberFormatter.format(mat.totalWeight)} kg total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Card Footer Decor */}
              <div className={cn(
                "p-4 rounded-b-[2.5rem] border-t",
                group.hasMultipleProducts 
                  ? "bg-amber-600/5 border-amber-100 dark:border-amber-900/20" 
                  : "bg-indigo-600/5 border-slate-100 dark:border-slate-800"
              )}>
                <div className={cn(
                  "h-1.5 w-full rounded-full overflow-hidden",
                  group.hasMultipleProducts ? "bg-amber-100 dark:bg-amber-900/30" : "bg-slate-200 dark:bg-slate-800"
                )}>
                  <div className={cn(
                    "h-full w-full opacity-20",
                    group.hasMultipleProducts ? "bg-amber-600" : "bg-indigo-600"
                  )} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
