import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User, Shield, Trash2, Mail, Calendar, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';

interface FirestoreUser {
  userId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: any;
  photoURL?: string;
}

export function UsersManagementView() {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const loadedUsers: FirestoreUser[] = [];
      snapshot.forEach(doc => {
        loadedUsers.push(doc.data() as FirestoreUser);
      });
      
      setUsers(loadedUsers);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError("Você não tem permissão para visualizar esta lista ou houve um erro de conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleRole = async (userId: string, currentRole: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await updateDoc(userRef, { role: newRole });
      
      setUsers(users.map(u => u.userId === userId ? { ...u, role: newRole as 'admin' | 'user' } : u));
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Erro ao atualizar privilégios.");
    }
  };

  const deleteUserRecord = async (userId: string) => {
    if (!confirm("Tem certeza que deseja remover este registro do banco de dados? Isso NÃO remove a conta do Firebase Auth, apenas o perfil e dados no Firestore.")) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.userId !== userId));
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Erro ao excluir usuário.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Carregando usuários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-white font-black uppercase tracking-tight mb-2">Acesso Negado</h3>
        <p className="text-red-400 text-sm font-bold">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Gestão de Usuários</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            Controle de acesso e privilégios do sistema
          </p>
        </div>
        <button 
          onClick={fetchUsers}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
        >
          <Activity className="w-4 h-4" />
          Atualizar Lista
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {users.map((u) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={u.userId}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-indigo-500/30 transition-all shadow-sm"
          >
            <div className="relative">
              <img 
                src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}`} 
                alt={u.displayName} 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800"
              />
              <div className={u.role === 'admin' ? "absolute -top-2 -right-2 bg-indigo-600 text-white p-1 rounded-lg" : "hidden"}>
                <Shield className="w-3 h-3" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{u.displayName}</h4>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  {u.email}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Cadastrado em {u.createdAt?.seconds ? format(new Date(u.createdAt.seconds * 1000), 'dd MMM yyyy', { locale: ptBR }) : '---'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                u.role === 'admin' 
                  ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
              }`}>
                {u.role === 'admin' ? 'Administrador' : 'Operador'}
              </div>

              <div className="flex items-center gap-2 border-l border-slate-100 dark:border-slate-800 pl-4 ml-1">
                <button 
                  onClick={() => toggleRole(u.userId, u.role)}
                  title={u.role === 'admin' ? "Remover Privilégios" : "Tornar Admin"}
                  className="p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition-all"
                >
                  <Shield className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteUserRecord(u.userId)}
                  title="Excluir Registro"
                  className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
            <User className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
