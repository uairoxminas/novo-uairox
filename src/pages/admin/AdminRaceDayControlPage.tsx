import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, PlayCircle, Loader2, Save, Plus, Trash2, StopCircle } from 'lucide-react';
import { useEventTimingConfig, useUpdateEventTiming, useRaceCheckpoints, useCreateRaceCheckpoint, useToggleFinishLine, useDeleteRaceCheckpoint, useStartHeat } from '@/hooks/useRaceDayConfig';
import { toast } from 'sonner';
import RFIDWristbandsPanel from '@/components/raceday/RFIDWristbandsPanel';
import RFIDBridgePanel from '@/components/raceday/RFIDBridgePanel';

export default function AdminRaceDayControlPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Buscar Baterias
  const { data: heats, isLoading: loadingHeats } = useQuery({
    queryKey: ['heats', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('heats' as any).select('*').eq('event_id', id).order('start_time', { ascending: true, nullsFirst: true }).order('title', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // ======= CONFIGURAÇÕES DE CRONOMETRAGEM =======
  const { data: timingConfigData, isLoading: loadingTiming } = useEventTimingConfig(id!);
  const timingConfig = timingConfigData as any;
  const updateTiming = useUpdateEventTiming();
  
  const [targetVolume, setTargetVolume] = useState<string>('');
  const [debounceSec, setDebounceSec] = useState<string>('');
  const [rssiMin, setRssiMin] = useState<string>('');

  // Set initial states once loaded
  React.useEffect(() => {
    if (timingConfig) {
      setTargetVolume(String(timingConfig.target_passes_volume || 1));
      setDebounceSec(String(timingConfig.debounce_seconds || 40));
      setRssiMin(String(timingConfig.rfid_rssi_min ?? 0));
    }
  }, [timingConfig]);

  const handleSaveTimingParams = () => {
    if (!targetVolume || !debounceSec) return;
    updateTiming.mutate({
      eventId: id!,
      target_passes_volume: parseInt(targetVolume),
      debounce_seconds: parseInt(debounceSec),
      rfid_rssi_min: parseInt(rssiMin) || 0,
    }, {
      onSuccess: () => toast.success('Parâmetros de cronometragem salvos!'),
      onError: (err: any) => toast.error('Erro ao salvar: ' + err.message)
    });
  };

  // ======= PONTOS DE CONTROLE =======
  const { data: checkpoints, isLoading: loadingCheckpoints } = useRaceCheckpoints(id!);
  const createCp = useCreateRaceCheckpoint();
  const toggleCp = useToggleFinishLine();
  const deleteCp = useDeleteRaceCheckpoint();

  const [newCpName, setNewCpName] = useState('');
  const [newCpIsFinish, setNewCpIsFinish] = useState(false);

  const handleAddCheckpoint = () => {
    if (!newCpName.trim()) return;
    createCp.mutate({
      event_id: id!,
      name: newCpName.trim(),
      is_finish_line: newCpIsFinish
    }, {
      onSuccess: () => {
        setNewCpName('');
        setNewCpIsFinish(false);
        toast.success('Ponto adicionado!');
      },
      onError: (err: any) => toast.error('Erro ao criar ponto: ' + err.message)
    });
  };

  // ======= OPERAÇÕES DA BATERIA =======
  const startHeat = useStartHeat();
  const handleStartHeat = (heatId: string) => {
    if (confirm('Atenção: Todos os cronômetros desta bateria vão iniciar em tempo real. Deseja LARGAR a bateria agora?')) {
      startHeat.mutate({ id: heatId, event_id: id! }, {
        onSuccess: () => toast.success('Bateria LARGOU! Cronômetro gravado!'),
        onError: (err: any) => toast.error('Erro ao startar: ' + err.message)
      });
    }
  };

  const inputClass = "w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EDAC02] transition-colors";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/raceday')}
            className="w-10 h-10 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Torre Central</h1>
            <p className="text-sm text-zinc-500">Mesa do Árbitro Geral</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-[#EDAC02]/10 border border-[#EDAC02]/20 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#EDAC02] animate-pulse" />
            <span className="text-sm font-bold text-[#EDAC02]">SISTEMA ARMADO</span>
          </div>
        </div>
      </div>

      {/* DASHBOARDS RÁPIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl">
          <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Status Atletas</h3>
          <p className="text-3xl font-black text-white">0 <span className="text-lg text-zinc-600 font-medium">na Pista</span></p>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl">
          <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Baterias (Heats)</h3>
          <p className="text-3xl font-black text-white">{heats?.length || 0} <span className="text-lg text-zinc-600 font-medium">Cadastradas</span></p>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl">
          <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Passagens Faltantes</h3>
          <p className="text-3xl font-black text-white">--</p>
        </div>
      </div>

      {/* PAINEL DE TÁTICA (CONFIGURAÇÕES E CHECKPOINTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PARÂMETROS */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#1a1a1a]">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <span className="text-[#EDAC02]">⚙️</span> Parâmetros da Etapa
            </h2>
          </div>
          <div className="p-6 space-y-4 flex-1">
            {loadingTiming ? (
              <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#EDAC02]" /></div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Volume Total de Leituras Esperado</label>
                  <input type="number" value={targetVolume} onChange={e => setTargetVolume(e.target.value)} className={inputClass} placeholder="Ex: 33" />
                  <p className="text-xs text-zinc-600 mt-2">Quantas marcações o atleta precisa registrar na prova para completá-la legitimamente.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mt-4 mb-2">Debounce Time (Zona Cega em Segundos)</label>
                  <input type="number" value={debounceSec} onChange={e => setDebounceSec(e.target.value)} className={inputClass} placeholder="Ex: 40" />
                  <p className="text-xs text-zinc-600 mt-2">Após uma passagem, o atleta fica ignorado por este tempo em <strong className="text-zinc-400">qualquer</strong> antena (anti-duplicidade por atleta).</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mt-4 mb-2">Sinal mínimo p/ contar (RSSI)</label>
                  <input type="number" value={rssiMin} onChange={e => setRssiMin(e.target.value)} className={inputClass} placeholder="Ex: 70 (0 = ler tudo)" />
                  <p className="text-xs text-zinc-600 mt-2">Só conta a leitura quando o sinal for igual ou maior que este valor — <strong className="text-zinc-400">quanto maior, mais perto</strong> o atleta precisa estar da antena. <strong className="text-zinc-400">0</strong> desliga o filtro. Referência: parado/longe ≈ 56, passando colado ≈ 80.</p>
                </div>
              </>
            )}
          </div>
          <div className="p-4 border-t border-[#1a1a1a] bg-[#050505]">
            <button 
              onClick={handleSaveTimingParams}
              disabled={updateTiming.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1a] hover:bg-[#262626] text-white font-bold rounded-xl transition-colors"
            >
              <Save className="w-4 h-4 text-[#EDAC02]" /> Salvar Parâmetros
            </button>
          </div>
        </div>

        {/* PONTOS DE CONTROLE FÍSICO */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#1a1a1a]">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <span className="text-[#EDAC02]">📡</span> Tapetes e Leitores
            </h2>
          </div>
          
          <div className="p-6 bg-[#050505] border-b border-[#1a1a1a] space-y-3">
            <div>
               <input type="text" value={newCpName} onChange={e => setNewCpName(e.target.value)} placeholder="Nome do Ponto (Ex: Tapete Central)" className={inputClass} />
            </div>
            <div className="flex gap-3">
              <label className="flex flex-1 items-center gap-2 p-3 border border-[#262626] rounded-lg cursor-pointer bg-[#1a1a1a]">
                 <input type="checkbox" checked={newCpIsFinish} onChange={e => setNewCpIsFinish(e.target.checked)} className="accent-[#EDAC02]" />
                 <span className="text-xs font-bold text-zinc-300 uppercase">É Linha de Chegada Principal?</span>
              </label>
              <button onClick={handleAddCheckpoint} disabled={createCp.isPending} className="px-6 py-3 bg-[#EDAC02] hover:bg-[#EDAC02]/90 text-black font-black uppercase rounded-lg transition-colors flex items-center gap-2">
                <Plus className="w-5 h-5" /> Add
              </button>
            </div>
          </div>

          <div className="p-0 flex-1 overflow-auto bg-[#0a0a0a]">
             {loadingCheckpoints ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#EDAC02]" /></div>
             ) : checkpoints?.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">Nenhum ponto de controle cadastrado.</div>
             ) : (
               <ul className="divide-y divide-[#1a1a1a]">
                 {checkpoints?.map((cp: any) => (
                   <li key={cp.id} className="p-4 flex items-center justify-between hover:bg-[#111] transition-colors">
                     <div>
                       <p className="font-bold text-white tracking-tight">{cp.name}</p>
                       {cp.is_finish_line ? (
                         <span className="inline-block mt-1 text-[10px] uppercase font-black tracking-widest text-[#EDAC02] px-2 py-0.5 rounded border border-[#EDAC02]/30 bg-[#EDAC02]/10">Chegada Final</span>
                       ) : (
                         <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-widest text-zinc-500">Passagem Padrão</span>
                       )}
                     </div>
                     <div className="flex items-center gap-3">
                        {!cp.is_finish_line && (
                          <button onClick={() => toggleCp.mutate({ event_id: id!, checkpoint_id: cp.id })} className="text-xs underline text-zinc-500 hover:text-white">Marcar como Chegada</button>
                        )}
                        <button onClick={() => { if(confirm('Excluir ponto permanentemente? Lembre que ele pode estar recebendo dados!')) deleteCp.mutate({ id: cp.id, event_id: id! })}} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </li>
                 ))}
               </ul>
             )}
          </div>
        </div>

      </div>

      {/* BRIDGE M-ID40 */}
      <RFIDBridgePanel eventId={id!} />

      {/* PAINEL RFID */}
      <RFIDWristbandsPanel eventId={id!} checkpoints={(checkpoints ?? []) as unknown as { id: string; name: string; is_finish_line: boolean }[]} />

      {/* PAINEL DE BATERIAS */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Controle de Baterias (Largada)</h2>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-lg transition-colors">
            + Nova Bateria
          </button>
        </div>
        
        {loadingHeats ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-[#EDAC02] animate-spin" /></div>
        ) : heats?.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">
             Sem baterias cadastradas ainda. Crie as baterias do evento para liberar a largada.
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
              {heats?.map((heat: any) => (
                <div key={heat.id} className="p-4 flex items-center justify-between group hover:bg-[#111] transition-colors">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{heat.title}</h3>
                    <p className="text-sm text-zinc-500">
                      {heat.status === 'pending' ? 'Aguardando Largada' : 
                       heat.status === 'running' ? 'Em Progresso' : 'Finalizada'}
                       {heat.start_time && ` • Agendado para ${new Date(heat.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <div>
                    {heat.status === 'pending' ? (
                      <button 
                        onClick={() => handleStartHeat(heat.id)}
                        disabled={startHeat.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm uppercase tracking-wide bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_20px_rgba(220,38,38,0.7)] transition-all"
                      >
                        <PlayCircle className="w-5 h-5" />
                        Largar Bateria
                      </button>
                    ) : heat.status === 'running' ? (
                       <button onClick={() => navigate(`/admin/raceday/${id}/heat/${heat.id}`)} className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm uppercase tracking-wide bg-[#EDAC02] hover:bg-yellow-400 text-black shadow-[0_0_15px_rgba(237,172,2,0.4)] hover:shadow-[0_0_20px_rgba(237,172,2,0.7)] transition-all">
                        <PlayCircle className="w-5 h-5" />
                        Monitorar Bateria
                       </button>
                    ) : (
                      <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm uppercase tracking-wide bg-[#1a1a1a] text-zinc-500 cursor-not-allowed transition-all">
                        <StopCircle className="w-5 h-5" />
                        Finalizada
                      </button>
                    )}
                  </div>
                </div>
             ))}
          </div>
        )}
      </div>

    </div>
  );
}
