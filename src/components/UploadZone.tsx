import React, { useCallback, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, isLoading }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (validateFile(file)) {
      onUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onUpload(file);
    }
  };

  const validateFile = (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.xlsm', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValid) {
      setError("Por favor, envie um arquivo Excel (.xlsx, .xls, .xlsm) ou CSV.");
      return false;
    }
    setError(null);
    return true;
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer",
          isDragActive 
            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20" 
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
        )}
      >
        <input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept=".xlsx,.xls,.xlsm,.csv"
          disabled={isLoading}
        />
        
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-full">
          <Upload className={cn("w-10 h-10 text-slate-400 transition-transform", isDragActive && "scale-110 text-indigo-500")} />
        </div>
        
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
          Upload do Plano Semanal
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm font-medium">
          Arraste seu arquivo Excel (.xlsx, .xlsm) aqui ou clique para selecionar. 
        </p>

        <div className="flex gap-4">
           {isLoading ? (
             <div className="flex items-center gap-2 text-indigo-500 font-bold">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Processando...
             </div>
           ) : (
             <span className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
               Selecionar Arquivo
             </span>
           )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {[
          { icon: FileText, label: "Excel Support", desc: ".xlsx / .xlsm / .xls" },
          { icon: CheckCircle2, label: "Fácil Leitura", desc: "Mapeamento Automático" },
          { icon: Upload, label: "Semanal", desc: "Sempre Atualizado" }
        ].map((item, i) => (
          <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex flex-col items-center text-center border border-transparent dark:border-slate-800">
            <item.icon className="w-5 h-5 text-slate-400 mb-2" />
            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{item.label}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold">{item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
