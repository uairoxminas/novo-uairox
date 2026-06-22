import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Props {
  eventId: string;
  readerId?: string;
  checkpoints: { id: string }[];
  heats: { id: string }[];
  timingConfig: { target_passes_volume?: number | null } | null;
  onReadiness?: (ready: boolean) => void;
}

interface CheckItem {
  ok: boolean;
  warn?: boolean;     // amarelo (não bloqueia)
  label: string;
  hint: string;
}

export default function RaceReadinessChecklist({
  eventId, readerId = 'reader-1', checkpoints, heats, timingConfig, onReadiness,
}: Props) {
  // Heartbeat do bridge
  const { data: bridge } = useQuery({
    queryKey: ['readiness-bridge', readerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('rfid_bridge_status' as any)
        .select('connected, last_seen')
        .eq('reader_id', readerId)
        .maybeSingle();
      return data as any;
    },
    refetchInterval: 8000,
  });

  // Antenas ativas deste evento
  const { data: antennas = [] } = useQuery({
    queryKey: ['readiness-antennas', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('rfid_antennas' as any)
        .select('reader_id, checkpoint_id, is_active')
        .eq('event_id', eventId)
        .eq('is_active', true);
      return (data ?? []) as any[];
    },
    refetchInterval: 15000,
  });

  // Atletas e bibs
  const { data: regStats } = useQuery({
    queryKey: ['readiness-regs', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('registrations' as any)
        .select('id, bib_number')
        .eq('event_id', eventId);
      const list = (data ?? []) as any[];
      return { total: list.length, semBib: list.filter(r => r.bib_number == null).length };
    },
    refetchInterval: 30000,
  });

  const online        = !!bridge?.connected && !!bridge?.last_seen && (Date.now() - new Date(bridge.last_seen).getTime() < 60000);
  const hasAntenna    = antennas.some(a => a.reader_id === readerId && a.checkpoint_id);
  const hasCheckpoint = (checkpoints?.length ?? 0) > 0;
  const hasVolume     = (timingConfig?.target_passes_volume ?? 0) > 0;
  const hasHeats      = (heats?.length ?? 0) > 0;
  const allBib        = !!regStats && regStats.total > 0 && regStats.semBib === 0;

  const checks: CheckItem[] = [
    { ok: online,        label: 'Leitor conectado (bridge ONLINE)',        hint: 'Abra o bridge no notebook (INICIAR-BRIDGE.bat) e confira a internet.' },
    { ok: hasAntenna,    label: 'Antena mapeada NESTE evento',             hint: 'Pulseiras RFID → Configurar Leitor → reader-1 → selecione o tapete → Salvar.' },
    { ok: hasCheckpoint, label: 'Tapete / ponto de controle criado',       hint: 'Tapetes e Leitores → adicione um ponto (ex: Largada/Chegada).' },
    { ok: hasVolume,     label: 'Volume de leituras definido',             hint: 'Parâmetros da Etapa → Volume Total de Leituras (ex: 4) → Salvar.' },
    { ok: hasHeats,      label: 'Baterias criadas',                        hint: 'Crie as baterias do evento com os atletas.' },
    { ok: allBib, warn: true,
      label: regStats ? `Atletas com número (bib): ${regStats.total - regStats.semBib}/${regStats.total}` : 'Atletas com número (bib)',
      hint: 'Defina o bib de cada atleta (bib = número da pulseira). Sem bib, o atleta não é identificado.' },
  ];

  // Bloqueadores (o "warn" do bib não bloqueia)
  const ready = online && hasAntenna && hasCheckpoint && hasVolume && hasHeats;
  useEffect(() => { onReadiness?.(ready); }, [ready, onReadiness]);

  return (
    <div className={`rounded-2xl border overflow-hidden ${ready ? 'border-green-800/40 bg-green-950/10' : 'border-[#EDAC02]/30 bg-[#EDAC02]/5'}`}>
      <div className="p-5 border-b border-[#1a1a1a] flex items-center gap-3">
        {ready
          ? <ShieldCheck className="w-6 h-6 text-green-400" />
          : <ShieldAlert className="w-6 h-6 text-[#EDAC02]" />}
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Prontidão para Largar</h2>
          <p className={`text-xs font-bold ${ready ? 'text-green-400' : 'text-[#EDAC02]'}`}>
            {ready ? 'TUDO PRONTO — pode largar as baterias.' : 'PENDÊNCIAS — resolva os itens em vermelho antes de largar.'}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-[#1a1a1a]">
        {checks.map((c, i) => (
          <li key={i} className="px-5 py-3 flex items-start gap-3">
            {c.ok
              ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              : c.warn
                ? <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`text-sm font-bold ${c.ok ? 'text-zinc-200' : c.warn ? 'text-yellow-400' : 'text-red-400'}`}>{c.label}</p>
              {!c.ok && <p className="text-xs text-zinc-500 mt-0.5">{c.hint}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
