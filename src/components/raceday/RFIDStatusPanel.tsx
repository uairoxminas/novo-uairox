import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Radio, CircleDot } from 'lucide-react';

interface Props { eventId: string; readerId?: string; }

const STATUS_LABEL: Record<string, { txt: string; cls: string }> = {
  ok:                { txt: 'REGISTRADO',        cls: 'text-green-400' },
  debounce:          { txt: 'DEBOUNCE',          cls: 'text-zinc-500' },
  race_complete:     { txt: 'PROVA COMPLETA',    cls: 'text-blue-400' },
  weak_signal:       { txt: 'SINAL FRACO',       cls: 'text-zinc-500' },
  unknown_tag:       { txt: 'TAG DESCONHECIDA',  cls: 'text-yellow-400' },
  no_running_heat:   { txt: 'SEM BATERIA',       cls: 'text-orange-400' },
  no_antenna_config: { txt: 'ANTENA N/ CONFIG',  cls: 'text-red-400' },
  no_heat_assignment:{ txt: 'FORA DA BATERIA',   cls: 'text-orange-400' },
};

export default function RFIDStatusPanel({ eventId, readerId = 'reader-1' }: Props) {
  const { data: bridge } = useQuery({
    queryKey: ['status-bridge', readerId],
    queryFn: async () => {
      const { data } = await supabase.from('rfid_bridge_status' as any).select('connected, last_seen, ip').eq('reader_id', readerId).maybeSingle();
      return data as any;
    },
    refetchInterval: 8000,
  });

  const { data: reads = [] } = useQuery({
    queryKey: ['status-reads', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('rfid_reads' as any)
        .select('id, tag_epc, read_at, processed, skip_reason, registrations(bib_number)')
        .eq('event_id', eventId)
        .order('read_at', { ascending: false })
        .limit(15);
      return (data ?? []) as any[];
    },
    refetchInterval: 4000,
  });

  const online = !!bridge?.connected && !!bridge?.last_seen && (Date.now() - new Date(bridge.last_seen).getTime() < 60000);

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-[#1a1a1a] flex items-center justify-between">
        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Radio className="w-5 h-5 text-[#EDAC02]" /> Leitor RFID
          <span className="text-xs font-normal text-zinc-500 normal-case ml-1">{readerId}{bridge?.ip ? ` · ${bridge.ip}` : ''}</span>
        </h2>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${online ? 'bg-green-950/40 text-green-400 border border-green-800/40' : 'bg-[#1a1a1a] text-zinc-500 border border-[#262626]'}`}>
          <CircleDot className={`w-3 h-3 ${online ? 'animate-pulse' : ''}`} /> {online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <div className="min-h-[120px] max-h-[280px] overflow-y-auto divide-y divide-[#111]">
        {reads.length === 0 ? (
          <div className="p-8 text-center">
            <Radio className="w-7 h-7 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-600">{online ? 'Aguardando leituras...' : 'Leitor offline — abra o bridge no notebook.'}</p>
          </div>
        ) : reads.map(r => {
          const st = STATUS_LABEL[r.processed ? 'ok' : (r.skip_reason ?? 'ok')] ?? { txt: (r.skip_reason ?? '—').toUpperCase(), cls: 'text-zinc-500' };
          const bib = r.registrations?.bib_number;
          return (
            <div key={r.id} className="px-5 py-2.5 flex items-center justify-between hover:bg-[#111] transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-12 text-sm font-black text-white">{bib != null ? `#${bib}` : '—'}</span>
                <span className="text-xs font-mono text-zinc-600">{r.tag_epc?.slice(-6)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-widest ${st.cls}`}>{st.txt}</span>
                <span className="text-[10px] text-zinc-700">{new Date(r.read_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
