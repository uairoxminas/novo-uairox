import React, { useState, useMemo } from 'react';
import { useRaceArbitration, type ArbAthlete } from '@/hooks/useRaceArbitration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Trophy, Lock, Unlock, Ban, Flag, Send } from 'lucide-react';

interface Props { eventId: string; }

// Administrador — SEMPRE recebe o resultado de cada categoria liberada.
const ADMIN_PHONE = '48996459791';

// Normaliza p/ o BotConversa: só dígitos; prefixa 55 se vier sem código do país.
function normalizePhone(raw: string | null): string {
  let d = (raw || '').replace(/\D/g, '');
  if ((d.length === 10 || d.length === 11) && !d.startsWith('55')) d = '55' + d;
  return d;
}

const fmt = (ms: number | null) => {
  if (ms == null) return '—';
  const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, '0')}s`;
};
const MEDAL = ['🥇', '🥈', '🥉'];

// Nome a exibir: categoria de equipe (team_size > 1) → nome da equipe; senão → atleta.
const displayName = (a: ArbAthlete) =>
  a.team_size > 1 ? (a.team_name || 'Sem Equipe') : (a.name || 'Atleta');

// Monta a mensagem de resultado da categoria (todos os atletas/equipes + tempo)
function buildMessage(catName: string, ranked: ArbAthlete[], out: ArbAthlete[]): string {
  const lines = [`🏆 *RESULTADO — ${catName}*`, ''];
  ranked.forEach((a, i) => {
    const pos = i < 3 ? MEDAL[i] : `${i + 1}º`;
    lines.push(`${pos} #${a.bib ?? '?'} ${displayName(a)} — ${fmt(a.finalMs)}`);
  });
  out.forEach(a => {
    lines.push(`${a.state === 'dnf' ? '🏳 DNF' : '⛔ DSQ'} #${a.bib ?? '?'} ${displayName(a)}`);
  });
  return lines.join('\n');
}

export default function RaceAwardsTab({ eventId }: Props) {
  const { data, isLoading } = useRaceArbitration(eventId);
  const [released, setReleased] = useState<Record<string, boolean>>({});
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);

  // Libera a premiação: enfileira o resultado da categoria para o admin + atletas,
  // com 30s entre cada (worker envia). Robusto — não depende da aba aberta.
  async function releaseCategory(g: { id: string; name: string; ranked: ArbAthlete[]; out: ArbAthlete[] }) {
    setReleasing(g.id);
    try {
      const { data: cfg } = await supabase.from('botconversa_config' as any)
        .select('trigger_broadcast_url').eq('event_id', eventId).maybeSingle();
      const webhook = (cfg as any)?.trigger_broadcast_url;
      if (!webhook) { toast.error('Configure o webhook de Broadcast do evento (Config do Evento → BotConversa).'); return; }

      const recipients = new Map<string, string>(); // telefone -> nome
      recipients.set(normalizePhone(ADMIN_PHONE), 'Admin');
      [...g.ranked, ...g.out].forEach(a => {
        const p = normalizePhone(a.phone);
        if (p.length >= 12 && !recipients.has(p)) recipients.set(p, displayName(a));
      });

      const mensagem = buildMessage(g.name, g.ranked, g.out);
      const rows = [...recipients.entries()].map(([telefone, nome]) => ({
        event_id: eventId, category_id: g.id === 'none' ? null : g.id,
        telefone, nome, mensagem, webhook_url: webhook, status: 'pending',
      }));

      const { error } = await supabase.from('premiacao_queue' as any).insert(rows);
      if (error) { toast.error(error.message); return; }
      setReleased(p => ({ ...p, [g.id]: true }));
      toast.success(`Premiação liberada — ${rows.length} mensagem(ns) na fila (envio a cada 30s).`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao liberar premiação.');
    } finally {
      setReleasing(null);
    }
  }

  async function sendTest(catName: string, ranked: ArbAthlete[], out: ArbAthlete[]) {
    const phone = normalizePhone(testPhone);
    if (phone.length < 12) { toast.error('Informe um telefone de teste válido (DDD + número).'); return; }
    setSendingTest(catName);
    try {
      const res = await fetch('/api/premiacao-send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, telefone: phone, nome: 'Teste', mensagem: buildMessage(catName, ranked, out) }),
      });
      const json = await res.json();
      if (res.ok && json.ok) toast.success(`Teste enviado para ${phone}. Confira o WhatsApp.`);
      else toast.error(json.error || `Falha no envio (status ${json.status ?? res.status}).`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro de rede ao enviar teste.');
    } finally {
      setSendingTest(null);
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; athletes: ArbAthlete[] }>();
    (data?.athletes ?? []).forEach(a => {
      const k = a.category_id ?? 'none';
      if (!map.has(k)) map.set(k, { name: a.category_name, athletes: [] });
      map.get(k)!.athletes.push(a);
    });
    return [...map.entries()].map(([id, g]) => {
      const pending = g.athletes.filter(a => a.state === 'racing' || a.state === 'incomplete' || a.state === 'complete');
      const allFinal = pending.length === 0 && g.athletes.length > 0;
      const ranked = g.athletes.filter(a => a.state === 'validated').sort((x, y) => (x.finalMs ?? 9e15) - (y.finalMs ?? 9e15));
      const out = g.athletes.filter(a => a.state === 'dnf' || a.state === 'dsq');
      return { id, name: g.name, total: g.athletes.length, pendingCount: pending.length, allFinal, ranked, out };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#EDAC02]" /></div>;
  if (!groups.length) return <div className="p-12 text-center text-zinc-500">Sem atletas para premiação.</div>;

  return (
    <div className="space-y-4">
      {groups.map(g => {
        const isReleased = !!released[g.id];
        return (
          <div key={g.id} className={`rounded-2xl border overflow-hidden ${g.allFinal ? 'border-[#EDAC02]/30' : 'border-[#1a1a1a]'}`}>
            <div className="p-5 border-b border-[#1a1a1a] flex items-center justify-between gap-3 flex-wrap bg-[#0a0a0a]">
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#EDAC02]" /> {g.name}
                <span className="text-xs font-normal text-zinc-500">{g.total} atleta(s)</span>
              </h3>
              {g.allFinal ? (
                isReleased ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase bg-green-600/20 text-green-400 border border-green-600/40"><Unlock className="w-3.5 h-3.5" /> Premiação liberada</span>
                ) : (
                  <button onClick={() => releaseCategory({ id: g.id, name: g.name, ranked: g.ranked, out: g.out })} disabled={releasing === g.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase bg-[#EDAC02] hover:bg-[#EDAC02]/90 text-black disabled:opacity-50">
                    {releasing === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />} Liberar e notificar
                  </button>
                )
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1a1a1a] text-zinc-500 border border-[#262626]" title="Finalize todos os atletas (validar/DNF/DSQ) para liberar">
                  <Lock className="w-3.5 h-3.5" /> Faltam {g.pendingCount} atleta(s) finalizar
                </span>
              )}
            </div>

            <div className={`divide-y divide-[#111] ${!isReleased && g.allFinal ? 'opacity-100' : ''}`}>
              {g.ranked.length === 0 ? (
                <p className="p-5 text-center text-sm text-zinc-600">Nenhum atleta validado ainda nesta categoria.</p>
              ) : g.ranked.map((a, idx) => (
                <div key={a.registration_id} className={`px-5 py-3 flex items-center justify-between ${idx < 3 && isReleased ? 'bg-[#EDAC02]/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center text-lg">{idx < 3 ? MEDAL[idx] : <span className="text-sm font-black text-zinc-500">{idx + 1}º</span>}</span>
                    <span className="w-9 text-sm font-black text-white">#{a.bib}</span>
                    <span className={`text-sm font-bold ${idx < 3 ? 'text-white' : 'text-zinc-300'}`}>{displayName(a)}</span>
                  </div>
                  <span className="text-base font-black text-[#EDAC02]">{fmt(a.finalMs)}</span>
                </div>
              ))}
              {g.out.map(a => (
                <div key={a.registration_id} className="px-5 py-2.5 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center text-zinc-600">{a.state === 'dnf' ? <Flag className="w-4 h-4 inline" /> : <Ban className="w-4 h-4 inline" />}</span>
                    <span className="w-9 text-sm font-black text-zinc-500">#{a.bib}</span>
                    <span className="text-sm text-zinc-400 line-through">{displayName(a)}</span>
                  </div>
                  <span className="text-xs font-black uppercase text-red-400">{a.state === 'dnf' ? 'DNF' : 'DSQ'}</span>
                </div>
              ))}
            </div>

            {(g.ranked.length > 0 || g.out.length > 0) && (
              <div className="p-4 border-t border-[#1a1a1a] bg-[#0a0a0a] space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-bold">Testar mensagem (antes do envio real)</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="Telefone de teste (DDD + número)"
                    className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-[#111] border border-[#262626] text-sm text-white placeholder:text-zinc-600 focus:border-[#EDAC02]/50 outline-none" />
                  <button onClick={() => sendTest(g.name, g.ranked, g.out)} disabled={sendingTest === g.name}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase bg-[#1a1a1a] hover:bg-[#222] text-[#EDAC02] border border-[#EDAC02]/30 disabled:opacity-50">
                    {sendingTest === g.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Enviar teste
                  </button>
                </div>
                <details className="text-xs text-zinc-500">
                  <summary className="cursor-pointer hover:text-zinc-300">Ver prévia da mensagem</summary>
                  <pre className="mt-2 p-3 rounded-lg bg-[#111] border border-[#262626] text-zinc-300 whitespace-pre-wrap font-sans">{buildMessage(g.name, g.ranked, g.out)}</pre>
                </details>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
