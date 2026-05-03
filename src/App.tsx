/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { UploadZone } from './components/UploadZone';
import { ScheduleView } from './components/ScheduleView';
import { DashboardView } from './components/DashboardView';
import { HourlyConsumptionView } from './components/HourlyConsumptionView';
import { parseExcelFile } from './lib/excel';
import { ScheduleEntry } from './lib/utils';
import { Layout, LogOut, Settings, HelpCircle, Activity, Search, LayoutDashboard, Moon, Sun, BarChart3, Timer, Gauge, Download, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { ShiftMonitorView } from './components/ShiftMonitorView';
import { exportToExcel } from './lib/export';
import { KanbanCompositionView } from './components/KanbanCompositionView';
import { Box } from 'lucide-react';
import { format, subDays, startOfDay, isBefore } from 'date-fns';
import { DataManagerView } from './components/DataManagerView';

export default function App() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [currentView, setCurrentView] = useState<'schedule' | 'dashboard' | 'shift-monitor' | 'hourly-consumption' | 'kanban' | 'data-manager'>('schedule');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('materialflow_entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));
        
        const hydratedAndFiltered = parsed.map((e: any) => ({
          ...e,
          date: new Date(e.date)
        })).filter((e: any) => !isBefore(e.date, thirtyDaysAgo));
        
        setEntries(hydratedAndFiltered);
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('materialflow_entries', JSON.stringify(entries));
    }
  }, [entries, isInitialized]);

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const parsedEntries = await parseExcelFile(file);
      
      // Merge logic: replace existing entries for the dates found in the new file
      const newDates = new Set(parsedEntries.map(e => format(e.date, 'yyyy-MM-dd')));
      const filteredExisting = entries.filter(e => !newDates.has(format(e.date, 'yyyy-MM-dd')));
      
      const merged = [...filteredExisting, ...parsedEntries];
      setEntries(merged);
      setCurrentView('schedule');
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao processar o arquivo.");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteDates = (datesToDelete: string[]) => {
    const datesSet = new Set(datesToDelete);
    setEntries(prev => {
      const filtered = prev.filter(e => !datesSet.has(format(e.date, 'yyyy-MM-dd')));
      return filtered;
    });
  };

  const confirmReset = () => {
    setEntries([]);
    setGlobalSearch('');
    setIsMobileMenuOpen(false);
    setShowResetConfirm(false);
    setCurrentView('schedule');
  };

  if (!isInitialized) return null;

  const sidebarElement = (
    <>
      <div className="p-8 border-b border-white/5 mb-8">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Activity className="w-6 h-6" />
           </div>
           <div>
              <h1 className="font-black text-lg leading-none text-white tracking-tight">Planejamento</h1>
              <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mt-1 block">de Compostos</span>
           </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <div className="px-4 mb-6">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Monitoramento</p>
          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="buscar composto ou size" 
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  if (e.target.value) setCurrentView('schedule');
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600 focus:bg-white/10"
              />
            </div>

            <button 
              onClick={() => { setGlobalSearch(''); setCurrentView('schedule'); setIsMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-bold",
                (currentView === 'schedule' && !globalSearch) ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <LayoutDashboard className={cn("w-4 h-4", (currentView === 'schedule' && !globalSearch) ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
              Visão Geral
            </button>

            <button 
              onClick={() => { setGlobalSearch(''); setCurrentView('dashboard'); setIsMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-bold",
                currentView === 'dashboard' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <BarChart3 className={cn("w-4 h-4", currentView === 'dashboard' ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
              Dashboard
            </button>

            <button 
              onClick={() => { setGlobalSearch(''); setCurrentView('shift-monitor'); setIsMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-bold",
                currentView === 'shift-monitor' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Timer className={cn("w-4 h-4", currentView === 'shift-monitor' ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
              Monitor de Turno
            </button>

            <button 
              onClick={() => { setGlobalSearch(''); setCurrentView('hourly-consumption'); setIsMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-bold",
                currentView === 'hourly-consumption' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Gauge className={cn("w-4 h-4", currentView === 'hourly-consumption' ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
              Consumo p/ Hora
            </button>

            <button 
              onClick={() => { setGlobalSearch(''); setCurrentView('kanban'); setIsMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-bold",
                currentView === 'kanban' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Box className={cn("w-4 h-4", currentView === 'kanban' ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
              Kanban BR (Sizes)
            </button>

            <button 
              onClick={() => { setGlobalSearch(''); setCurrentView('data-manager'); setIsMobileMenuOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-bold",
                currentView === 'data-manager' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Database className={cn("w-4 h-4", currentView === 'data-manager' ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
              Gerenciar Dados
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 space-y-1">
          <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Ações</p>
          <NavItem 
            icon={Download} 
            label="Exportar Info (.xlsx)" 
            onClick={() => exportToExcel(entries)}
          />
          <NavItem 
            icon={Layout} 
            label="Importar Planilha" 
            onClick={triggerUpload}
          />
        </div>
      </nav>

      <input 
        type="file"
        ref={fileInputRef}
        onChange={onFileInputChange}
        accept=".xlsx,.xlsm"
        className="hidden"
      />
    </>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 dark:bg-slate-950 hidden lg:flex flex-col z-50 shadow-xl border-r border-white/5">
        {sidebarElement}
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-72 bg-slate-900 dark:bg-slate-950 z-[70] flex flex-col lg:hidden"
            >
              {sidebarElement}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:pl-64 min-h-screen">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[40] flex items-center justify-between px-4 md:px-8">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
              >
                <div className="w-6 h-5 flex flex-col justify-between">
                  <span className="w-full h-0.5 bg-slate-900 dark:bg-slate-100 rounded-full" />
                  <span className="w-3/4 h-0.5 bg-slate-900 dark:bg-slate-100 rounded-full" />
                  <span className="w-full h-0.5 bg-slate-900 dark:bg-slate-100 rounded-full" />
                </div>
              </button>
              <div className="font-black text-[11px] text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 Plano de Produção
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-slate-200 dark:border-slate-700"
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">
                Linha de Produção Atualizada
              </div>
           </div>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            {entries.length === 0 ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-12"
              >
                <div className="text-center mb-12">
                   <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Comece aqui</h2>
                   <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto font-medium">
                     Faça o upload do seu plano de produção semanal (.xlsx ou .xlsm) para visualizar quais materiais serão usados em cada estação.
                   </p>
                </div>
                <UploadZone onUpload={handleUpload} isLoading={isLoading} />
              </motion.div>
            ) : (
              <motion.div
                key={currentView === 'dashboard' ? 'dashboard' : currentView === 'shift-monitor' ? 'shift-monitor' : currentView === 'hourly-consumption' ? 'hourly-consumption' : 'view'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {currentView === 'dashboard' ? (
                  <DashboardView entries={entries} />
                ) : currentView === 'shift-monitor' ? (
                  <ShiftMonitorView entries={entries} />
                ) : currentView === 'hourly-consumption' ? (
                  <HourlyConsumptionView entries={entries} />
                ) : currentView === 'kanban' ? (
                  <KanbanCompositionView entries={entries} />
                ) : currentView === 'data-manager' ? (
                  <DataManagerView 
                    entries={entries} 
                    onDeleteDates={handleDeleteDates}
                    onClearAll={confirmReset}
                  />
                ) : (
                  <ScheduleView entries={entries} globalSearch={globalSearch} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center border border-slate-100 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Novo Plano?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed font-bold">
                Isso irá remover todos os dados atuais da produção. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                  Sim, Limpar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
      active 
        ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20" 
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    }`}>
      <Icon className={`w-5 h-5 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
      <span className="text-sm font-bold">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
  );
}

