import React, { useMemo, useState } from 'react';
import { ScheduleEntry, cn } from '../lib/utils';
import { Database, Trash2, Calendar, HardDrive, AlertCircle, RefreshCw, X, Check } from 'lucide-react';
import { format, isBefore, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface DataManagerViewProps {
  entries: ScheduleEntry[];
  onDeleteDates: (dates: string[]) => void;
  onClearAll: () => void;
}

export const DataManagerView: React.FC<DataManagerViewProps> = ({ entries, onDeleteDates, onClearAll }) => {
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const datesSummary = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => {
      const dateKey = format(e.date, 'yyyy-MM-dd');
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    });

    return Array.from(map.entries()).map(([date, count]) => ({
      date,
      count,
      label: format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy (EEEE)', { locale: ptBR })
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  const totalEntries = entries.length;
  const storageEstimated = new Blob([JSON.stringify(entries)]).size / 1024; // KB

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Gerenciar Histórico</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Dados armazenados localmente no seu navegador</p>
          </div>
        </div>
        
        {showClearAllConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mr-2">Apagar tudo?</span>
            <button 
              onClick={onClearAll}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="Confirmar"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowClearAllConfirm(false)}
              className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 transition-colors"
              title="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowClearAllConfirm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/30"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Tudo
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Dias Salvos</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{datesSummary.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total de Linhas</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{totalEntries.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Espaço Estimado</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{storageEstimated.toFixed(1)} KB</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Datas em Memória</h3>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 px-3 py-1.5 rounded-full">
            <AlertCircle className="w-4 h-4" />
            Dados com mais de 30 dias são limpos automaticamente
          </div>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          <AnimatePresence mode="popLayout">
            {datesSummary.map((item) => (
              <motion.div 
                layout
                key={item.date}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-600 transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white capitalize">{item.label}</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.count} registros de materiais</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {confirmDeleteDate === item.date ? (
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 p-2 rounded-xl border border-red-100 dark:border-red-900/20">
                      <span className="text-[9px] font-black text-red-600 uppercase tracking-widest px-2">Apagar?</span>
                      <button
                        onClick={() => {
                          onDeleteDates([item.date]);
                          setConfirmDeleteDate(null);
                        }}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteDate(null)}
                        className="p-2 bg-white dark:bg-slate-800 text-slate-400 rounded-lg hover:text-slate-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteDate(item.date)}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      title="Remover este dia"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {datesSummary.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <Database className="w-12 h-12 mx-auto opacity-10 mb-4" />
              <p className="font-bold">Nenhum dado salvo localmente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
