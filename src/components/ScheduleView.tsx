import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Filter, Calendar as CalendarIcon, Package, Cpu, ArrowRight, Layers, FileText } from 'lucide-react';
import { ScheduleEntry, cn, getMachineUnit } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ScheduleViewProps {
  entries: ScheduleEntry[];
  globalSearch?: string;
}

interface ConsolidatedMaterial {
  material: string;
  materialClass: string;
  totalQuantity: number;
  unit: string;
}

interface ProductGroup {
  productCode: string;
  materials: ConsolidatedMaterial[];
}

interface MachineGroup {
  machineName: string;
  products: ProductGroup[];
  hasMultipleProducts: boolean;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ entries, globalSearch = '' }) => {
  const [selectedMachine, setSelectedMachine] = useState<string | 'all'>('all');
  
  const availableDates = useMemo(() => {
    const rawDates = entries.map(e => format(e.date, 'yyyy-MM-dd'));
    const uniqueDates = Array.from(new Set(rawDates)) as string[];
    return uniqueDates.sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    // Shift starts at 06:00. If current hour is < 6, we are on the previous day's production schedule.
    const productionDate = now.getHours() < 6 
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      : now;
    
    const todayStr = format(productionDate, 'yyyy-MM-dd');
    
    // Check if today exists in the uploaded data
    const rawDates = entries.map(e => format(e.date, 'yyyy-MM-dd'));
    if (rawDates.includes(todayStr)) {
      return todayStr;
    }
    
    // Fallback to first available date or empty
    const uniqueDates = Array.from(new Set(rawDates)).sort() as string[];
    return uniqueDates[0] || '';
  });

  // Tracing view logic: List all Machine + Size for a specific material across ALL dates
  const tracedResults = useMemo(() => {
    if (!globalSearch) return [];
    
    const results: Array<{ date: Date, machine: string, productCode: string, qty: number }> = [];
    entries.forEach(e => {
        const productCode = e.productCode || '';
        const material = e.material || '';
        const matches = productCode.toLowerCase().includes(globalSearch.toLowerCase()) || 
                       material.toLowerCase().includes(globalSearch.toLowerCase());
        if (matches) {
            results.push({
                date: e.date,
                machine: e.machine,
                productCode: e.productCode,
                qty: parseFloat(e.quantity)
            });
        }
    });
    return results.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [entries, globalSearch]);

  const machines = useMemo(() => {
    const rawMachines = entries.map(e => e.machine);
    const uniqueMachines = Array.from(new Set(rawMachines)) as string[];
    return ['all', ...uniqueMachines].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [entries]);

  // Consolidated logic: Group by Machine -> then by ProductCode
  const machineGroups = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, ConsolidatedMaterial>>> = {};

    entries.forEach(e => {
        const dateStr = format(e.date, 'yyyy-MM-dd');
        if (dateStr !== selectedDate) return;
        
        if (selectedMachine !== 'all' && e.machine !== selectedMachine) return;
        
        if (!groups[e.machine]) groups[e.machine] = {};
        if (!groups[e.machine][e.productCode]) groups[e.machine][e.productCode] = {};
        
        const qty = parseFloat(e.quantity) || 0;
        
        if (groups[e.machine][e.productCode][e.material]) {
            const newTotal = groups[e.machine][e.productCode][e.material].totalQuantity + qty;
            // Round to 4 decimal places to clean up floating point addition noise
            groups[e.machine][e.productCode][e.material].totalQuantity = Math.round(newTotal * 10000) / 10000;
        } else {
            groups[e.machine][e.productCode][e.material] = {
                material: e.material,
                materialClass: e.materialClass,
                totalQuantity: Math.round(qty * 10000) / 10000,
                unit: e.unit
            };
        }
    });

    const finalGroups: MachineGroup[] = Object.entries(groups).map(([machineName, productsMap]) => {
      const products: ProductGroup[] = Object.entries(productsMap).map(([productCode, materialsMap]) => ({
        productCode,
        materials: Object.values(materialsMap)
      }));

      return {
        machineName,
        products,
        hasMultipleProducts: products.length > 1
      };
    }).sort((a, b) => a.machineName.localeCompare(b.machineName, undefined, { numeric: true }));

    return finalGroups;
  }, [entries, selectedDate, selectedMachine]);

  const numberFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {globalSearch ? (
        <div className="space-y-6">
          <header className="bg-indigo-600 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 dark:shadow-none relative overflow-hidden">
             <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl shrink-0" />
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-indigo-100 mb-2">
                    <Search className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Rastreabilidade de Composto / Size</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none uppercase">
                    {globalSearch}
                  </h2>
                  <p className="mt-2 text-indigo-100/80 font-bold text-sm">
                    Localizado em {new Set(tracedResults.map(r => r.machine)).size} máquinas e {new Set(tracedResults.map(r => r.productCode)).size} tamanhos
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-4 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl border border-white/20">
                   <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1">Total Consumido</span>
                   <span className="text-2xl md:text-3xl font-black tabular-nums">
                     {numberFormatter.format(tracedResults.reduce((acc, r) => acc + r.qty, 0))} <span className="text-sm">kg</span>
                   </span>
                </div>
             </div>
          </header>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                     <tr>
                        <th className="pl-6 pr-4 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Máquina</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Modelo (Size)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Quantidade</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {tracedResults.map((res, i) => (
                        <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                           <td className="pl-6 pr-4 py-5">
                              <span className="font-bold text-slate-600 dark:text-slate-400 text-sm whitespace-nowrap">
                                 {format(res.date, 'dd/MM/yyyy')}
                              </span>
                           </td>
                           <td className="px-4 py-5">
                              <div className="flex items-center gap-2">
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none mb-1">
                                       {getMachineUnit(res.machine)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                       <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-900 dark:text-white group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                                          {res.machine}
                                       </div>
                                       <span className="font-black text-slate-900 dark:text-white uppercase text-xs sm:text-sm whitespace-nowrap">Máq {res.machine}</span>
                                    </div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-4 py-5">
                              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-black uppercase border border-amber-100 dark:border-amber-900/50 whitespace-nowrap">
                                 Size {res.productCode}
                              </span>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <span className="font-black text-slate-900 dark:text-white tabular-nums text-sm sm:text-base">
                                 {numberFormatter.format(res.qty)} <span className="text-[10px] opacity-40">kg</span>
                              </span>
                           </td>
                        </tr>
                     ))}
                     {tracedResults.length === 0 && (
                        <tr>
                           <td colSpan={4} className="py-20 text-center text-slate-400">
                              <Package className="w-12 h-12 mx-auto opacity-20 mb-4" />
                              <p className="font-bold px-6">Nenhum registro encontrado para "{globalSearch}"</p>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Plano de Produção</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Consumo consolidado de materiais Mixing Rubber (Final)</p>
            </div>
          </header>

          <div className="space-y-6">
            {/* Date Selector */}
            <div className="overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar scroll-smooth flex gap-3 print:hidden">
            {availableDates.map(dateStr => {
              const isActive = selectedDate === dateStr;
              const dateObj = new Date(dateStr + 'T00:00:00');
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center min-w-[90px] md:min-w-[100px] p-3 md:p-4 rounded-2xl border transition-all duration-300 transform",
                    isActive 
                      ? "bg-indigo-600 dark:bg-indigo-600 border-indigo-600 text-white shadow-xl -translate-y-1" 
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20"
                  )}
                >
                  <span className="text-[10px] uppercase font-black opacity-60 mb-1 tracking-widest">
                    {format(dateObj, 'EEE', { locale: ptBR })}
                  </span>
                  <span className={cn("text-xl md:text-2xl font-black", isActive ? "text-white" : "text-slate-900 dark:text-white")}>
                    {format(dateObj, 'dd')}
                  </span>
                  <span className="text-[10px] font-bold capitalize mt-1">
                    {format(dateObj, 'MMMM', { locale: ptBR })}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 print:hidden">
            <div className="relative flex-1 max-w-xs">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-bold text-slate-900 dark:text-white"
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
              >
                {machines.map(m => (
                  <option key={m} value={m} className="dark:bg-slate-900">
                    {m === 'all' ? 'Todas Máquinas' : `Máquina ${m}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {machineGroups.map((group) => (
                <motion.div
                  layout
                  key={group.machineName}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  {/* Header */}
                  <div className={cn(
                    "px-6 py-5 flex items-center justify-between text-white transition-colors duration-500",
                    group.hasMultipleProducts ? "bg-amber-600" : "bg-slate-900 dark:bg-slate-800"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        {group.hasMultipleProducts ? <Layers className="w-5 h-5 text-amber-200" /> : <Cpu className="w-5 h-5 text-blue-400" />}
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">
                          {getMachineUnit(group.machineName)}
                        </div>
                        <h3 className="font-black text-lg tracking-tight uppercase">
                           Máq #{group.machineName}
                           {!group.hasMultipleProducts && (
                             <span className="ml-2 font-normal text-white/70">Size {group.products[0]?.productCode}</span>
                           )}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-white/60 font-bold uppercase tracking-widest">
                          {group.hasMultipleProducts ? (
                            <span className="text-amber-100 italic font-black">Múltiplos modelos (Sizes) detectados</span>
                          ) : (
                            <span>Modelo único na programação</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Sections */}
                  <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {group.products.map((product) => (
                      <div key={product.productCode} className="flex flex-col">
                        {group.hasMultipleProducts && (
                          <div className="bg-slate-50 dark:bg-slate-800/40 px-6 py-2.5 flex items-center justify-between border-y border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Size: {product.productCode}</span>
                            <span className="text-[10px] font-bold text-slate-400">{product.materials.length} itens</span>
                          </div>
                        )}
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className={cn("bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800", group.hasMultipleProducts ? "hidden" : "")}>
                              <tr>
                                <th className="pl-6 pr-3 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Composto / Material</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Quantidade</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                              {product.materials.map((item) => (
                                <tr key={item.material} className="group hover:bg-blue-50/40 dark:hover:bg-indigo-900/10 transition-all duration-200">
                                  <td className="pl-6 pr-3 py-4">
                                    <div className="flex flex-col">
                                      <span className="font-black text-slate-900 dark:text-white text-sm transition-colors uppercase tabular-nums">
                                        {item.material}
                                      </span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold opacity-60 uppercase truncate max-w-[200px]">
                                        {item.materialClass}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                      <div className="flex flex-col items-end">
                                        <span className="text-lg font-black text-blue-600 dark:text-indigo-400 leading-none tabular-nums">
                                          {numberFormatter.format(item.totalQuantity)}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                          {item.unit}
                                        </span>
                                      </div>
                                      <ArrowRight className="w-4 h-4 text-slate-200 dark:text-slate-700 group-hover:text-blue-200 dark:group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Footer */}
                  <div className="mt-auto bg-slate-50 dark:bg-slate-800/40 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Peso Total Diário</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                            {numberFormatter.format(
                              Math.round(group.products.reduce((acc, p) => 
                                acc + p.materials.reduce((ma, item) => ma + item.totalQuantity, 0), 0
                              ) * 1000) / 1000
                            )}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">kg</span>
                      </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {machineGroups.length === 0 && (
              <div className="md:col-span-2 flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 text-slate-400">
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                  <Package className="w-12 h-12 opacity-20" />
                </div>
                <p className="font-bold text-slate-900 dark:text-white">Nenhuma programação encontrada</p>
                <p className="text-sm opacity-60">Selecione outra data no calendário acima.</p>
              </div>
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
};
