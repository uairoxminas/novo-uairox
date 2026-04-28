import { useState, useEffect } from 'react';
import { usePanelPasswords, type PanelType } from '@/hooks/usePanelAuth';
import { useEvents } from '@/hooks/useEvents';
import { Eye, EyeOff, Save, Loader2, Lock, Key } from 'lucide-react';
import { toast } from 'sonner';

const PANEL_INFO: Record<string, { label: string; color: string; icon: string }> = {
  admin: { label: 'Admin', color: '#EDAC02', icon: '🏗️' },
  judge: { label: 'Judge', color: '#22c55e', icon: '⚡' },
  headjudge: { label: 'Head Judge', color: '#ef4444', icon: '🔴' },
  finaljudge: { label: 'Final Judge', color: '#3b82f6', icon: '🏁' },
};

export default function AdminDashboard() {
  const { data: events } = useEvents();
  const { fetchPasswords, updatePassword, isLoading: updatingPassword } = usePanelPasswords();
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [loadingPasswords, setLoadingPasswords] = useState(true);

  useEffect(() => {
    fetchPasswords()
      .then((data) => {
        const map: Record<string, string> = {};
        const editMap: Record<string, string> = {};
        data.forEach((d: any) => {
          map[d.panel] = d.password;
          editMap[d.panel] = d.password;
        });
        setPasswords(map);
        setEditValues(editMap);
      })
      .catch(() => toast.error('Erro ao carregar senhas'))
      .finally(() => setLoadingPasswords(false));
  }, [fetchPasswords]);

  const handleSave = async (panel: PanelType) => {
    const newPass = editValues[panel]?.trim();
    if (!newPass) {
      toast.error('A senha não pode ficar vazia');
      return;
    }
    try {
      await updatePassword(panel, newPass);
      setPasswords(prev => ({ ...prev, [panel]: newPass }));
      toast.success(`Senha do ${PANEL_INFO[panel].label} atualizada!`);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const activeEventsCount = events?.length || 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Visão Geral do Sistema</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white/5 rounded-xl border border-white/10">
          <h3 className="text-zinc-400 text-sm">Total de Eventos</h3>
          <p className="text-3xl font-bold text-white mt-2">{activeEventsCount}</p>
        </div>
        <div className="p-6 bg-white/5 rounded-xl border border-white/10">
          <h3 className="text-zinc-400 text-sm">Painéis Ativos</h3>
          <p className="text-3xl font-bold text-white mt-2">4</p>
        </div>
        <div className="p-6 bg-white/5 rounded-xl border border-white/10">
          <h3 className="text-zinc-400 text-sm flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Autenticação</h3>
          <p className="text-lg font-bold text-[#EDAC02] mt-2">Senha por Painel</p>
        </div>
      </div>

      {/* Senhas dos Painéis */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1a1a1a] flex items-center gap-3">
          <Key className="w-5 h-5 text-[#EDAC02]" />
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Senhas dos Painéis</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Gerencie as senhas de acesso para cada área do sistema</p>
          </div>
        </div>

        {loadingPasswords ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#EDAC02] animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {Object.entries(PANEL_INFO).map(([panel, info]) => {
              const isChanged = editValues[panel] !== passwords[panel];
              return (
                <div key={panel} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Panel info */}
                  <div className="flex items-center gap-3 sm:w-48">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ background: `${info.color}15`, border: `1px solid ${info.color}30` }}
                    >
                      {info.icon}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{info.label}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">/{panel}</p>
                    </div>
                  </div>

                  {/* Password input */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type={showPassword[panel] ? 'text' : 'password'}
                        value={editValues[panel] || ''}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [panel]: e.target.value }))}
                        className="w-full h-11 bg-[#111] border border-[#262626] rounded-lg px-4 pr-10 text-white font-mono text-sm focus:outline-none transition-colors"
                        style={{ borderColor: isChanged ? info.color : undefined }}
                      />
                      <button
                        onClick={() => setShowPassword(prev => ({ ...prev, [panel]: !prev[panel] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showPassword[panel] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleSave(panel as PanelType)}
                      disabled={!isChanged || updatingPassword}
                      className="h-11 px-4 rounded-lg font-bold text-xs uppercase flex items-center gap-2 transition-all disabled:opacity-20"
                      style={{
                        background: isChanged ? info.color : '#1a1a1a',
                        color: isChanged ? '#000' : '#666',
                      }}
                    >
                      {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
