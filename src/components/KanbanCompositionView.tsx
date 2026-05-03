import React, { useMemo, useState } from 'react';
import { ScheduleEntry, cn } from '../lib/utils';
import { Search, Package, Box, Layers, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface KanbanCompositionViewProps {
  entries: ScheduleEntry[];
}

export const KanbanCompositionView: React.FC<KanbanCompositionViewProps> = ({ entries }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const compositionByProduct = useMemo(() => {
    const productStats = new Map<string, { 
      materials: Map<string, { materialClass: string; unit: string; totalWeight: number }>;
      sessions: Set<string>;
      totalPieces: number;
    }>();

    entries.forEach(e => {
      if (!productStats.has(e.productCode)) {
        productStats.set(e.productCode, {
          materials: new Map(),
          sessions: new Set(),
          totalPieces: 0
        });
      }
      
      const stats = productStats.get(e.productCode)!;
      
      if (!stats.materials.has(e.material)) {
        stats.materials.set(e.material, { materialClass: e.materialClass, unit: e.unit, totalWeight: 0 });
      }
      stats.materials.get(e.material)!.totalWeight += parseFloat(e.quantity) || 0;
      
      const sessionKey = `${e.date.getTime()}-${e.machine}`;
      if (!stats.sessions.has(sessionKey)) {
        stats.sessions.add(sessionKey);
        stats.totalPieces += e.productPieceQty || 0;
      }
    });

    return Array.from(productStats.entries())
      .map(([productCode, stats]) => {
        const totalPieces = stats.totalPieces || 1;
        return {
          productCode,
          totalPieces,
          materials: Array.from(stats.materials.entries()).map(([material, matStats]) => ({
            material,
            ...matStats,
            weightPerPiece: matStats.totalWeight / totalPieces
          })).sort((a, b) => a.material.localeCompare(b.material))
        };
      })
      .filter(p => p.productCode.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.productCode.localeCompare(b.productCode, undefined, { numeric: true }));
  }, [entries, searchTerm]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Composição Kanban BR</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Estrutura de materiais por Size (Modelo)</p>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar Size..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm text-slate-900 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {compositionByProduct.map((item) => (
            <motion.div
              layout
              key={item.productCode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors group"
            >
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm">
                      <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Size / Modelo</span>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.productCode}</h3>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mr-2">Planejado</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.productCode}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                       <Package className="w-3 h-3" />
                       {new Intl.NumberFormat('pt-BR').format(item.totalPieces)} Peças
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50 dark:border-slate-800/50">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Material / Item</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Peso p/ Peça</span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {item.materials.map((m) => (
                    <div key={m.material} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 rounded-xl transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tabular-nums">{m.material}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate max-w-[140px]">{m.materialClass}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m.weightPerPiece)}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{m.unit}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                          Total: {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m.totalWeight)} {m.unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {compositionByProduct.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
            <Package className="w-16 h-16 opacity-10 mb-4" />
            <p className="font-bold">Nenhum modelo encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};
