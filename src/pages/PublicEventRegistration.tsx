import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calcInstallmentAmounts, calcMaxInstallmentDate } from '@/hooks/useInstallments';
import { sendWebhook } from '@/lib/botconversa';
import { DEFAULT_MESSAGES, interpolate } from '@/lib/botconversaMessages';

// ============ DATA HOOK ============
function usePublicEvent(idOrSlug?: string) {
  const [event, setEvent] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  useEffect(() => {
    if (!idOrSlug) return;
    async function resolveEvent() {
      setLoading(true);
      // Check if it looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug!);
      
      let evData: any = null;
      
      if (isUUID) {
        // Direct UUID lookup
        const { data } = await supabase.from('events').select('*').eq('id', idOrSlug!).single();
        evData = data;
      } else {
        // Try slug lookup first
        const { data } = await (supabase as any).from('events').select('*').eq('slug', idOrSlug!).single();
        evData = data;
      }
      
      if (!evData) {
        setEvent(null);
        setLoading(false);
        return;
      }
      
      setEvent(evData);
      setResolvedId(evData.id);
      
      const eid = evData.id;
      const [catRes, batchRes, kitRes, stgRes, regCountRes] = await Promise.all([
        supabase.from('categories').select('*').eq('event_id', eid).order('created_at'),
        supabase.from('price_batches').select('*').eq('event_id', eid).eq('active', true).order('order_index'),
        supabase.from('athlete_kits').select('*').eq('event_id', eid).eq('active', true).order('created_at'),
        supabase.from('event_stages').select('*').eq('event_id', eid).order('order_index'),
        // Count only active registrations (not waitlist/cancelled)
        supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('event_id', eid).in('status', ['pending', 'confirmed']),
      ]);
      setCategories(catRes.data || []);
      setBatches(batchRes.data || []);
      setKits(kitRes.data || []);
      setStages(stgRes.data || []);
      setRegistrationCount(regCountRes.count || 0);

      // Count confirmed registrations for PIX switch logic
      const { count: confCount } = await supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eid)
        .eq('status', 'confirmed');
      setConfirmedCount(confCount || 0);

      setLoading(false);
    }
    resolveEvent();
  }, [idOrSlug]);

  return { event, categories, batches, kits, stages, registrationCount, confirmedCount, loading, resolvedId };
}

// ============ HELPERS ============
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

function getActiveBatch(batches: any[], categoryId?: string) {
  const now = new Date();
  
  // Garantir que varremos por ordem e não falhamos na quebra de lote
  const validBatches = batches.filter(b => {
    if (categoryId) {
      return !b.category_id || b.category_id === categoryId;
    }
    return !b.category_id; // Global request só vê globais
  });

  const sorted = [...validBatches].sort((a,b) => (a.order_index || 0) - (b.order_index || 0));
  
  return sorted.find(b => {
    // Regra 1: Validação de Tempo
    const start = b.start_date ? new Date(b.start_date) : null;
    const end = b.end_date ? new Date(b.end_date) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    
    // Regra 2: Validação de Limite Físico de Volume
    if (b.max_registrations && (b.registrations_count || 0) >= b.max_registrations) return false;
    
    // Passou nas duas regras? Ele é o lote Ativo!
    return true;
  }) || null;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getDaysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============ BATCH URGENCY COMPONENT ============
function BatchUrgency({ batch }: { batch: any }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!batch?.end_date && !batch?.max_registrations) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [batch]);

  if (!batch) return null;

  const hasEndDate = !!batch.end_date;
  const hasLimit = !!batch.max_registrations;
  if (!hasEndDate && !hasLimit) return null;

  const used = batch.registrations_count || 0;
  const total = batch.max_registrations || 0;
  const remaining = hasLimit ? Math.max(0, total - used) : null;
  const spotsPercent = hasLimit && total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  let countdown = '';
  let isLastDay = false;
  if (hasEndDate) {
    const diff = new Date(batch.end_date).getTime() - now.getTime();
    if (diff <= 0) {
      countdown = 'Encerrado';
    } else {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      isLastDay = days === 0;
      if (days > 0) countdown = `${days}d ${hours}h ${mins}m`;
      else if (hours > 0) countdown = `${hours}h ${mins}m ${secs}s`;
      else countdown = `${mins}m ${secs}s`;
    }
  }

  return (
    <div className="space-y-2 mb-3">
      {hasEndDate && (
        <div className={`flex items-center gap-1.5 text-xs font-bold ${isLastDay ? 'text-red-400' : 'text-amber-400'}`}>
          <span>⏱</span>
          <span>{isLastDay ? '⚠ ÚLTIMO DIA! ' : ''}Termina em {countdown}</span>
        </div>
      )}
      {hasLimit && remaining !== null && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Vagas neste lote</span>
            <span className={`text-[10px] font-black ${remaining <= 5 ? 'text-red-400' : remaining <= 10 ? 'text-amber-400' : 'text-zinc-300'}`}>
              {remaining === 0 ? 'Esgotado' : remaining <= 5 ? `⚠ ${remaining} restantes!` : `${remaining} disponíveis`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${spotsPercent >= 90 ? 'bg-red-500' : spotsPercent >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${spotsPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============ LOT PROGRESS DOTS ============
function LotProgress({ batches, activeBatch, categoryId }: { batches: any[]; activeBatch: any; categoryId?: string }) {
  const relevant = batches
    .filter(b => categoryId ? (!b.category_id || b.category_id === categoryId) : !b.category_id)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  if (relevant.length <= 1) return null;

  const activeIdx = activeBatch ? relevant.findIndex(b => b.id === activeBatch.id) : -1;

  return (
    <div className="flex items-center gap-0 mb-4">
      {relevant.map((b, i) => {
        const isCurrent = i === activeIdx;
        const isPast = activeIdx !== -1 && i < activeIdx;
        return (
          <div key={b.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-3 h-3 rounded-full border-2 transition-all ${
                isCurrent ? 'bg-[#EDAC02] border-[#EDAC02] shadow-[0_0_6px_rgba(237,172,2,0.6)]' :
                isPast ? 'bg-zinc-600 border-zinc-600' :
                'bg-transparent border-zinc-700'
              }`} />
              <span className={`text-[8px] font-black uppercase tracking-wider whitespace-nowrap ${
                isCurrent ? 'text-[#EDAC02]' : isPast ? 'text-zinc-600' : 'text-zinc-700'
              }`}>
                {b.name.split(/[\s–-]/)[0]} {b.name.split(/[\s–-]/)[1] || ''}
              </span>
            </div>
            {i < relevant.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${i < activeIdx ? 'bg-zinc-600' : 'bg-zinc-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============ MAIN PAGE ============
export default function PublicEventRegistration() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('convite');
  const { event, categories, batches, kits, stages, registrationCount, confirmedCount, loading, resolvedId } = usePublicEvent(id);
  const [showRegistration, setShowRegistration] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const registrationRef = useRef<HTMLDivElement>(null);

  // ============ INVITE LINK VALIDATION ============
  const [inviteLink, setInviteLink] = useState<any>(null);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteChecking, setInviteChecking] = useState(!!inviteToken);

  useEffect(() => {
    if (!inviteToken || !resolvedId) return;
    setInviteChecking(true);
    (async () => {
      const { data } = await (supabase as any)
        .from('event_invite_links')
        .select('*')
        .eq('token', inviteToken)
        .eq('event_id', resolvedId)
        .is('revoked_at', null)
        .maybeSingle();
      if (data) {
        const now = new Date();
        const expired = data.expires_at && new Date(data.expires_at) < now;
        const usedUp = data.max_uses && data.current_uses >= data.max_uses;
        if (!expired && !usedUp) {
          setInviteLink(data);
          setInviteValid(true);
          setShowRegistration(true); // Auto-show form
        }
      }
      setInviteChecking(false);
    })();
  }, [inviteToken, resolvedId]);

  const globalActiveBatch = getActiveBatch(batches);
  // Check if ANY batch is active (global or category-specific)
  const anyBatchActive = batches.some(b => {
    const now = new Date();
    const start = b.start_date ? new Date(b.start_date) : null;
    const end = b.end_date ? new Date(b.end_date) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    if (b.max_registrations && (b.registrations_count || 0) >= b.max_registrations) return false;
    return true;
  });
  const globalIsSoldOut = batches.length > 0 && !anyBatchActive;

  // Capacity logic — invite bypasses capacity
  const maxCapacity = event?.max_capacity as number | null;
  const isEventFull = inviteValid ? false : (maxCapacity != null && registrationCount >= maxCapacity);
  const spotsRemaining = maxCapacity != null ? Math.max(0, maxCapacity - registrationCount) : null;

  const scrollToRegistration = () => {
    setShowRegistration(true);
    setTimeout(() => registrationRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-center px-4">
        <div>
          <p className="text-6xl mb-4">🏃</p>
          <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">Evento não encontrado</h1>
          <p className="text-sm text-zinc-500">Verifique o link e tente novamente</p>
          <a href="/" className="inline-block mt-6 px-6 py-3 bg-[#EDAC02] text-black font-black uppercase tracking-widest text-sm">← Voltar</a>
        </div>
      </div>
    );
  }

  const daysUntil = getDaysUntil(event.date);
  const city = event.location.split('-').pop()?.trim() || event.location;

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* ============ HERO ============ */}
      <section className="relative min-h-[80vh] flex items-end overflow-hidden">
        {event.image_url ? (
          <>
            <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#EDAC02]/10 via-[#050505] to-[#050505]">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(237,172,2,0.1) 35px, rgba(237,172,2,0.1) 70px)' }} />
          </div>
        )}

        {/* Back button */}
        <a href="/" className="absolute top-6 left-6 z-30 flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span className="text-sm font-bold uppercase tracking-widest">Voltar</span>
        </a>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <div className="max-w-3xl">
            {/* Status badge */}
            {inviteValid && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white font-black uppercase tracking-widest text-xs mb-6 border border-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                🎟️ CONVITE ESPECIAL — INSCRIÇÃO GARANTIDA
              </span>
            )}
            {!inviteValid && event.status === 'open' && !globalIsSoldOut && !isEventFull && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#EDAC02] text-black font-black uppercase tracking-widest text-xs mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>
                Inscrições Abertas
              </span>
            )}
            {!inviteValid && event.status === 'open' && isEventFull && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white font-black uppercase tracking-widest text-xs mb-6 border border-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-white opacity-50"></span>
                EVENTO LOTADO — LISTA DE ESPERA ABERTA
              </span>
            )}
            {!inviteValid && event.status === 'open' && globalIsSoldOut && !isEventFull && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white font-black uppercase tracking-widest text-xs mb-6 border border-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-white opacity-50"></span>
                INSCRIÇÕES ESGOTADAS
              </span>
            )}

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tighter italic leading-none mb-4">
              {event.title}
            </h1>

            <div className="flex items-center gap-6 text-white/60 font-black uppercase tracking-widest text-sm mb-8">
              <span className="flex items-center gap-2">📅 {formatDateShort(event.date)}</span>
              <span className="flex items-center gap-2">📍 {city}</span>
              {daysUntil > 0 && <span className="text-[#EDAC02]">⏱️ {daysUntil} dias</span>}
            </div>

            {/* Spots remaining indicator */}
            {spotsRemaining != null && event.status === 'open' && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-lg border ${
                isEventFull 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                  : spotsRemaining <= 20 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                    : 'bg-[#EDAC02]/10 border-[#EDAC02]/30 text-[#EDAC02]'
              }`}>
                <span className="text-lg">🏟️</span>
                <span className="font-black text-sm uppercase tracking-wider">
                  {isEventFull 
                    ? `${maxCapacity}/${maxCapacity} vagas preenchidas` 
                    : `Restam ${spotsRemaining} de ${maxCapacity} vagas`
                  }
                </span>
              </div>
            )}

            {event.description && (
              <p className="text-lg text-white/50 max-w-xl leading-relaxed mb-10 whitespace-pre-line">{event.description}</p>
            )}

          </div>
        </div>
      </section>

      {/* ============ A REGRA 30/39 — only for selecao event ============ */}
      {event.slug === 'selecao' && (
        <section className="relative overflow-hidden bg-[#020202]">
          <div className="flex flex-col lg:flex-row min-h-[520px]">

            {/* LEFT — dark side: A REGRA + 30/39 + dates */}
            <div className="relative flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-20 bg-[#020202] z-10">
              {/* diagonal right edge */}
              <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-24 z-20"
                   style={{ background: 'linear-gradient(to bottom right, #020202 50%, transparent 50%)' }} />

              <p className="text-[10px] font-black text-[#EDAC02] tracking-[.3em] uppercase mb-6">A Regra</p>

              {/* Giant 30/39 */}
              <div className="flex items-center gap-0 mb-8 select-none">
                <span className="text-[clamp(96px,15vw,160px)] font-black text-white leading-none tracking-tighter" style={{ fontStyle: 'italic' }}>30</span>
                <div className="flex flex-col mx-3 gap-2">
                  <div className="w-10 h-[3px] bg-[#EDAC02]" />
                  <div className="w-10 h-[3px] bg-zinc-700" />
                </div>
                <span className="text-[clamp(96px,15vw,160px)] font-black text-zinc-600 leading-none tracking-tighter" style={{ fontStyle: 'italic' }}>39</span>
              </div>

              {/* Dates */}
              <div className="flex gap-8">
                <div>
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Início</p>
                  <p className="text-base font-black text-white font-mono">11/06/2026</p>
                </div>
                <div className="w-px bg-[#1a1a1a]" />
                <div>
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Final</p>
                  <p className="text-base font-black text-white font-mono">19/07/2026</p>
                </div>
              </div>
            </div>

            {/* RIGHT — golden dark: explanation */}
            <div className="relative flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-16 py-20"
                 style={{ background: 'linear-gradient(135deg, #0a0800 0%, #0d0900 100%)' }}>
              <div className="absolute inset-0 opacity-5"
                   style={{ backgroundImage: 'repeating-linear-gradient(45deg, #EDAC02 0, #EDAC02 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />

              <div className="relative z-10 max-w-lg">
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight italic mb-6 leading-tight">
                  A matemática<br />
                  <span className="text-[#EDAC02]">da constância</span>
                </h3>

                <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                  A Copa do Mundo dura exatamente <strong className="text-white">39 dias</strong> (de 11 de Junho a 19 de Julho). Sua missão é vencer o jogo mental e concluir a tarefa diária em pelo menos <strong className="text-[#EDAC02]">30 desses dias</strong>.
                </p>

                <p className="text-sm text-zinc-500 leading-relaxed mb-8">
                  Isso significa que você tem <strong className="text-white">9 "dias de folga"</strong> estratégicos para usar quando o corpo pedir, quando a rotina apertar ou quando precisar descansar.
                </p>

                {/* Meta box */}
                <div className="border border-[#EDAC02]/30 bg-[#EDAC02]/5 px-5 py-4 flex items-center gap-4">
                  <span className="text-[#EDAC02] text-2xl font-black flex-shrink-0">🏆</span>
                  <div>
                    <p className="text-[10px] font-black text-[#EDAC02] uppercase tracking-widest mb-0.5">Meta Mínima</p>
                    <p className="text-sm font-bold text-white leading-snug">30 dias concluídos = <span className="text-[#EDAC02]">Passaporte carimbado para o grande sorteio</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============ PROVAS / STAGES ============ */}
      {stages.length > 0 && (
        <section className="py-24 bg-[#050505] border-y border-[#1a1a1a]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {(() => {
              const isTemplated = stages.some((s: any) => s.name.startsWith('RUN ') || s.name.startsWith('🏃'));
              return (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-16 border-b border-[#1a1a1a] pb-8 gap-6">
              <div>
                {isTemplated ? (
                  <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
                    O <span className="text-[#EDAC02]">Percurso</span>
                  </h2>
                ) : (
                  <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
                    A <span className="text-[#EDAC02]">Missão Diária</span>
                  </h2>
                )}
                {isTemplated && (
                  <p className="text-zinc-500 text-lg mt-2">Corrida + Funcional · 8 UaiZones</p>
                )}
              </div>
              {event.status === 'open' && (
                <button onClick={scrollToRegistration} className="px-8 py-4 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest skew-x-[-10deg] hover:bg-white transition-colors flex-shrink-0">
                  <span className="inline-block skew-x-[10deg]">Inscrever →</span>
                </button>
              )}
            </div>
              );
            })()}

            {(() => {
              const isTemplated = stages.some((s: any) => s.name.startsWith('RUN ') || s.name.startsWith('🏃'));
              if (isTemplated) {
                const pairs: any[][] = [];
                const sorted = [...stages].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
                for (let i = 0; i < sorted.length; i += 2) {
                  pairs.push([sorted[i], sorted[i + 1]].filter(Boolean));
                }
                const sampleRun = pairs[0]?.find((s: any) => s.name.startsWith('RUN ') || s.name.startsWith('🏃'));
                const unifiedRunText = sampleRun?.distance_meters >= 1000 ? `${(sampleRun.distance_meters/1000).toFixed(0)}km` : `${sampleRun?.distance_meters || 400}m`;
                
                return (
                  <div className="flex flex-col w-full">
                    {/* Run Summary Banner */}
                    <div className="flex justify-center mb-10 w-full relative">
                       <div className="absolute inset-0 top-1/2 -translate-y-1/2 w-full h-px bg-[#262626]"></div>
                       <div className="bg-[#EDAC02] text-black px-8 py-2 md:py-3 shadow-[4px_4px_0_0_#000] border-2 border-[#1a1a1a] relative z-10 w-max max-w-[90%] skew-x-[-5deg]">
                         <span className="font-black text-xl md:text-3xl uppercase tracking-widest text-center block skew-x-[5deg]">
                           CORRIDA {pairs.length} X {unifiedRunText}
                         </span>
                       </div>
                    </div>
                    {/* The 8 Zones Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-x-8 md:gap-y-8 w-full">
                      {pairs.map((pair, idx) => {
                        const zone = pair.find((s: any) => !s.name.startsWith('RUN ') && !s.name.startsWith('🏃'));
                        if (!zone) return null;
                        
                        return (
                          <div key={idx} className="flex flex-col group">
                            {/* Image container */}
                            <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden mb-4 border border-[#1a1a1a]">
                              {zone.image_url ? (
                                <img src={zone.image_url} alt={zone.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-110" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                                  <span className="text-5xl opacity-10 drop-shadow-xl group-hover:scale-110 transition-transform duration-500">🏋️</span>
                                </div>
                              )}
                              
                              {/* Number Badge */}
                              <div className="absolute bottom-0 left-0 bg-[#EDAC02] text-black w-12 h-12 flex items-center justify-center text-xl font-black shadow-[3px_3px_0_0_#000]">
                                {String(idx + 1).padStart(2, '0')}
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div>
                               <h3 className="text-white text-lg md:text-xl font-black uppercase tracking-tight leading-tight mb-1">
                                 {zone.name.replace(/UAIZONE \d+ – /i, '').replace(/UAIZONE \d+/i, '').trim()}
                               </h3>
                               <p className="text-[#EDAC02] font-mono font-bold text-base md:text-lg mb-1 uppercase tracking-tighter">
                                 {zone.metric_text || (zone.distance_meters ? `${zone.distance_meters}M` : zone.description?.replace(/[🔴🔵🟢🟡🟠🟣⭐]/g, '').trim() || '-')}
                               </p>
                               {(zone.distance_meters != null || zone.metric_text) && (
                                 <p className="text-zinc-500 text-xs md:text-[13px] uppercase tracking-widest font-bold">
                                   {zone.weight_load ? zone.weight_load : (zone.description?.replace(/[🔴🔵🟢🟡🟠🟣⭐]/g, '').trim().startsWith(String(zone.distance_meters)) 
                                     ? 'Carga Livre' 
                                     : zone.description?.replace(/[🔴🔵🟢🟡🟠🟣⭐]/g, '').trim())}
                                 </p>
                               )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Simple List (non-templated / manual stages)
              const hasAnyImage = stages.some((s: any) => s.image_url);

              if (hasAnyImage) {
                // Grid layout with photos
                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[...stages].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((stage: any, idx: number) => (
                      <div key={stage.id} className="flex flex-col group">
                        <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden mb-3 border border-[#1a1a1a]">
                          {stage.image_url ? (
                            <img src={stage.image_url} alt={stage.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-110" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                              <span className="text-5xl opacity-10">🏋️</span>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 bg-[#EDAC02] text-black w-10 h-10 flex items-center justify-center text-base font-black shadow-[3px_3px_0_0_#000]">
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                        </div>
                        <h3 className="text-white text-sm md:text-base font-black uppercase tracking-tight leading-tight mb-1">{stage.name}</h3>
                        {stage.metric_text && <p className="text-[#EDAC02] font-mono font-bold text-sm uppercase">{stage.metric_text}</p>}
                        {stage.distance_meters && <p className="text-[#EDAC02] font-mono font-bold text-sm uppercase">{stage.distance_meters >= 1000 ? `${(stage.distance_meters/1000).toFixed(0)}km` : `${stage.distance_meters}m`}</p>}
                        {stage.weight_load && <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">{stage.weight_load}</p>}
                        {stage.description && !stage.metric_text && !stage.distance_meters && <p className="text-zinc-500 text-xs mt-0.5">{stage.description}</p>}
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="max-w-4xl mx-auto space-y-3">
                  {stages.map((stage: any, idx: number) => (
                    <div key={stage.id} className="flex items-center gap-4 bg-[#0a0a0a] border border-[#1a1a1a] p-4 group hover:border-[#EDAC02]/30 transition-all">
                      <div className="w-12 h-12 flex items-center justify-center bg-[#EDAC02]/10 text-[#EDAC02] font-black text-lg flex-shrink-0 group-hover:bg-[#EDAC02] group-hover:text-black transition-colors">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-black text-white uppercase tracking-tight truncate">{stage.name}</p>
                        {stage.description && <p className="text-sm text-zinc-500 truncate mt-1">{stage.description}</p>}
                      </div>
                      {stage.distance_meters && (
                        <span className="text-sm font-bold text-[#EDAC02] uppercase tracking-wider flex-shrink-0 font-mono">
                          {stage.distance_meters >= 1000 ? `${(stage.distance_meters/1000).toFixed(0)}km` : `${stage.distance_meters}m`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* ============ VALIDAÇÃO DIGITAL — only for selecao event ============ */}
      {event.slug === 'selecao' && (
        <section className="py-24 bg-[#080808] border-y border-[#1a1a1a]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Header */}
            <div className="text-center mb-16">
              <p className="text-[10px] font-black text-[#EDAC02] tracking-[.3em] uppercase mb-3">Como comprovar</p>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
                Validação <span className="text-[#EDAC02]">Digital</span>
              </h2>
              {/* connector line */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <div className="h-px flex-1 max-w-[120px] bg-[#1a1a1a]" />
                <div className="w-2 h-2 bg-[#EDAC02] rotate-45" />
                <div className="h-px flex-1 max-w-[120px] bg-[#1a1a1a]" />
              </div>
            </div>

            {/* 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Card 01 — GPS */}
              <div className="group relative bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#EDAC02]/40 transition-all duration-300 p-8 flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <span className="text-6xl font-black text-[#EDAC02]/15 leading-none select-none italic" style={{ fontStyle: 'italic' }}>01</span>
                  <span className="text-3xl">🏃</span>
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3">GPS + 1 km</h3>
                <p className="text-sm text-zinc-500 leading-relaxed flex-1">
                  Corra <strong className="text-white">1 km ou mais</strong> usando o app de sua preferência para registrar com GPS.
                </p>
                <div className="mt-5 pt-5 border-t border-[#1a1a1a]">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#EDAC02] uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EDAC02]" />
                    Velocidade mínima média 6 km/h
                  </span>
                </div>
              </div>

              {/* Card 02 — Instagram */}
              <div className="group relative bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#EDAC02]/40 transition-all duration-300 p-8 flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <span className="text-6xl font-black text-[#EDAC02]/15 leading-none select-none italic" style={{ fontStyle: 'italic' }}>02</span>
                  <span className="text-3xl">📸</span>
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3">Instagram Stories</h3>
                <p className="text-sm text-zinc-500 leading-relaxed flex-1">
                  Poste as repetições do movimento funcional do dia nos Stories, marque <strong className="text-white">@uairox.hybridrun</strong> e salve no Destaque <strong className="text-white">"UAIROX"</strong> no seu perfil.
                </p>
                <div className="mt-5 pt-5 border-t border-[#1a1a1a]">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#EDAC02] uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EDAC02]" />
                    Criar destaque "UAIROX" no perfil
                  </span>
                </div>
              </div>

              {/* Card 03 — App */}
              <div className="group relative bg-[#0a0a0a] border border-[#EDAC02]/20 hover:border-[#EDAC02]/60 transition-all duration-300 p-8 flex flex-col">
                {/* highlight corner */}
                <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden">
                  <div className="absolute top-0 right-0 w-0 h-0" style={{ borderLeft: '48px solid transparent', borderTop: '48px solid #EDAC02' }} />
                </div>
                <div className="flex items-start justify-between mb-6">
                  <span className="text-6xl font-black text-[#EDAC02]/20 leading-none select-none italic" style={{ fontStyle: 'italic' }}>03</span>
                  <span className="text-3xl">📱</span>
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3">App Exclusivo</h3>
                <p className="text-sm text-zinc-500 leading-relaxed flex-1">
                  Acesse nosso App exclusivo da Seleção e cole sua <strong className="text-[#EDAC02]">"figurinha do dia"</strong> em 3 segundos com o <strong className="text-white">Check-in de Honra</strong>.
                </p>
                <div className="mt-5 pt-5 border-t border-[#EDAC02]/20">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#EDAC02] uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EDAC02]" />
                    3 segundos · Check-in de Honra
                  </span>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ============ KITS ============ */}
      {kits.length > 0 && event.slug !== 'selecao' && (
        <section className="py-24 bg-[#080808] border-y border-[#1a1a1a]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 border-b border-[#1a1a1a] pb-8">
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
                Kits de <span className="text-[#EDAC02]">Atleta</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kits.map((kit: any) => (
                <div key={kit.id} className="relative bg-[#050505] border border-[#1a1a1a] rounded-2xl overflow-hidden group hover:border-[#EDAC02]/30 transition-all shadow-xl">
                  <div className={`absolute top-4 right-4 px-3 py-1 text-[10px] shadow-lg font-black tracking-widest uppercase rounded z-10 ${kit.is_optional === false ? 'bg-[#25D366] text-black' : 'bg-black text-[#EDAC02] border border-[#EDAC02]/30'}`}>
                    {kit.is_optional === false ? 'Incluso na Inscrição' : 'Kit de Upgrade'}
                  </div>
                  {kit.image_url ? (
                    <div className="relative w-full aspect-[4/3] bg-[#0a0a0a] border-b border-[#1a1a1a]">
                       <img src={kit.image_url} alt={kit.name} className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/3] bg-gradient-to-br from-[#EDAC02]/5 to-[#1a1a1a] flex items-center justify-center border-b border-[#1a1a1a]">
                       <span className="text-6xl opacity-50 drop-shadow-lg">🎽</span>
                    </div>
                  )}
                  <div className="p-6 relative z-10">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{kit.name}</h3>
                    {kit.description && <p className="text-sm text-zinc-400 mt-3 border-l-2 border-[#262626] pl-3">{kit.description}</p>}
                    <p className={`text-3xl font-black italic tracking-tighter mt-6 ${kit.is_optional === false ? 'text-[#25D366]' : 'text-[#EDAC02]'}`}>
                      {kit.is_optional === false ? 'Grátis (Incluso)' : `+ R$ ${Number(kit.price).toFixed(2).replace('.', ',')}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ A RECOMPENSA — selecao event ============ */}
      {event.slug === 'selecao' && kits.length > 0 && (() => {
        const prize = kits.find((k: any) => k.is_optional !== false) || kits[kits.length - 1];
        const included = kits.find((k: any) => k.is_optional === false) || kits[0];
        return (
          <section className="bg-[#020202]">
            {/* Section header */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
              <p className="text-[10px] font-black text-[#EDAC02] tracking-[.3em] uppercase mb-3">Você vai ganhar</p>
              <h2 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter italic">
                A <span className="text-[#EDAC02]">Recompensa</span>
              </h2>
            </div>

            {/* PRIZE — Esteira (full hero) */}
            <div className="relative overflow-hidden border-y border-[#1a1a1a]" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #1a1200 0%, #020202 70%)' }}>
              {/* gold glow */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(237,172,2,0.08) 0%, transparent 70%)' }} />
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col lg:flex-row items-center gap-12">
                {/* Image */}
                <div className="flex-1 flex justify-center">
                  <div className="relative w-full max-w-lg">
                    <div className="absolute -inset-4 rounded-2xl" style={{ background: 'radial-gradient(ellipse at center, rgba(237,172,2,0.15) 0%, transparent 70%)' }} />
                    {prize?.image_url ? (
                      <img src={prize.image_url} alt={prize.name} className="relative w-full object-contain max-h-80 drop-shadow-2xl" />
                    ) : (
                      <div className="relative w-full aspect-video bg-[#0a0a0a] border border-[#EDAC02]/20 flex items-center justify-center rounded-xl">
                        <span className="text-7xl">🏃</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Text */}
                <div className="flex-1 max-w-lg">
                  <div className="inline-flex items-center gap-2 bg-[#EDAC02] text-black px-4 py-1.5 text-[10px] font-black uppercase tracking-widest mb-6">
                    ⭐ Grande Sorteio
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight italic leading-tight mb-4">
                    {prize?.name || 'Esteira Curva Brave'}
                  </h3>
                  {prize?.description && <p className="text-zinc-400 text-sm leading-relaxed mb-6">{prize.description}</p>}
                  <div className="border border-[#EDAC02]/30 bg-[#EDAC02]/5 px-5 py-4 flex items-start gap-3">
                    <span className="text-[#EDAC02] text-xl flex-shrink-0 mt-0.5">🏆</span>
                    <div>
                      <p className="text-[10px] font-black text-[#EDAC02] uppercase tracking-widest mb-1">Condição</p>
                      <p className="text-sm text-white font-bold leading-snug">Cole as <span className="text-[#EDAC02]">30 figurinhas</span> no álbum seguindo as regras de validação e concorra ao sorteio.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* INCLUDED — Camisa (large featured strip) */}
            <div className="border-b border-[#1a1a1a]" style={{ background: 'linear-gradient(135deg, #0a0800 0%, #050300 100%)' }}>
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col lg:flex-row items-center gap-12">
                {/* Text */}
                <div className="flex-1 max-w-lg order-2 lg:order-1">
                  <div className="inline-flex items-center gap-2 bg-[#25D366] text-black px-4 py-1.5 text-[10px] font-black uppercase tracking-widest mb-6">
                    ✓ Garantido para todos
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight italic leading-tight mb-4">
                    {included?.name || 'Camisa Oficial Seleção UAIROX'}
                  </h3>
                  {included?.description && <p className="text-zinc-400 text-sm leading-relaxed mb-6">{included.description}</p>}
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Todos os participantes inscritos recebem a Camisa Oficial <strong className="text-white">SELEÇÃO UAIROX</strong> — independentemente de completar os 30 dias.
                  </p>
                </div>
                {/* Image */}
                <div className="flex-1 flex justify-center order-1 lg:order-2">
                  <div className="relative w-full max-w-lg">
                    <div className="absolute -inset-4 rounded-2xl" style={{ background: 'radial-gradient(ellipse at center, rgba(37,211,102,0.06) 0%, transparent 70%)' }} />
                    {included?.image_url ? (
                      <img src={included.image_url} alt={included.name} className="relative w-full object-contain max-h-72 drop-shadow-2xl" />
                    ) : (
                      <div className="relative w-full aspect-video bg-[#0a0a0a] border border-[#25D366]/20 flex items-center justify-center rounded-xl">
                        <span className="text-7xl">👕</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ============ CATEGORIAS & PREÇO ============ */}
      {categories.length > 0 && (
        <section className="py-24 bg-[#050505]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-16 border-b border-[#1a1a1a] pb-8">
              {event?.slug === 'selecao' ? (
                <>
                  <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
                    A Convocação Está <span className="text-[#EDAC02]">Oficialmente Aberta</span>
                  </h2>
                  <p className="text-zinc-400 text-lg mt-2">
                    As vagas são estritamente limitadas devido à confecção das camisas oficiais.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
                    Escolha Sua <span className="text-[#EDAC02]">Categoria</span>
                  </h2>
                  <p className="text-zinc-500 text-lg mt-2">
                    Encontre a modalidade ideal para o seu nível.
                  </p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat: any) => {
                const teamSize = cat.team_size || 1;
                const localActiveBatch = getActiveBatch(batches, cat.id);
                const relevantBatches = batches.filter(b => !b.category_id || b.category_id === cat.id);
                const localIsSoldOut = relevantBatches.length > 0 && !localActiveBatch;
                const price = localActiveBatch ? Number(localActiveBatch.price) : 0;
                return (
                  <div key={cat.id} className="bg-[#0a0a0a] border border-[#1a1a1a] p-8 hover:border-[#EDAC02]/30 transition-all duration-300 group flex flex-col">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-4">{cat.name}</h3>
                      <div className="flex flex-wrap gap-2 mb-6">
                        <span className="px-3 py-1 bg-[#EDAC02]/10 text-[#EDAC02] font-black uppercase tracking-widest text-[10px] border border-[#EDAC02]/20">
                          {cat.team_size === 1 ? 'Individual' : `${cat.team_size} Participantes`}
                        </span>
                        {cat.gender_requirement !== 'any' && (
                          <span className="px-3 py-1 bg-[#111] text-zinc-400 font-bold uppercase tracking-widest text-[10px] border border-[#262626]">
                            {cat.gender_requirement === 'masculino' ? '♂ Masculino' : cat.gender_requirement === 'feminino' ? '♀ Feminino' : 'Misto'}
                          </span>
                        )}
                        {cat.age_type !== 'livre' && cat.min_age && (
                          <span className="px-3 py-1 bg-[#111] text-zinc-400 font-bold uppercase tracking-widest text-[10px] border border-[#262626]">
                            {cat.min_age}-{cat.max_age || '+'} anos
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="pt-6 border-t border-[#1a1a1a]">
                      {/* Progresso de lotes */}
                      <LotProgress batches={batches} activeBatch={localActiveBatch} categoryId={cat.id} />

                      {/* Urgência inteligente */}
                      {!localIsSoldOut && !isEventFull && (
                        <BatchUrgency batch={localActiveBatch} />
                      )}

                      <div className="flex items-end justify-between">
                        <div>
                          <div className="mb-2">
                            <p className="text-xs text-zinc-400 font-bold mb-1">💲 Pix à vista:</p>
                            <p className={`text-3xl font-black italic tracking-tighter leading-none ${localIsSoldOut || isEventFull ? 'text-zinc-600' : 'text-[#EDAC02]'}`}>{formatCurrency(price)}</p>
                            {event?.slug === 'selecao' && !localIsSoldOut && !isEventFull && (
                              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">+ frete para envio da camisa</p>
                            )}
                          </div>
                          {localActiveBatch?.price_card && Number(localActiveBatch.price_card) !== price && (
                            <p className="text-xs text-zinc-400 mt-1">💳 Cartão: <span className="text-white font-bold">{formatCurrency(Number(localActiveBatch.price_card))}</span></p>
                          )}
                          {localActiveBatch?.price_installments && Number(localActiveBatch.price_installments) !== price && (() => {
                            const totalInstallments = Number(localActiveBatch.price_installments);
                            const n = localActiveBatch.installments_count || 3;
                            const perInstallment = totalInstallments / n;
                            return (
                              <p className="text-xs text-zinc-400 mt-0.5">
                                📅 Pix Parcelado: <span className="text-white font-bold">{n}x {formatCurrency(perInstallment)}</span>
                              </p>
                            );
                          })()}
                          {localActiveBatch && <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{localActiveBatch.name}</p>}
                        </div>
                        {(inviteValid || (event.status === 'open' && !localIsSoldOut && !isEventFull)) && (
                          <button onClick={() => { setCategoryId(cat.id); scrollToRegistration(); }} className="px-6 py-3 bg-white text-black font-black uppercase tracking-widest text-xs skew-x-[-10deg] hover:bg-[#EDAC02] transition-colors">
                            <span className="inline-block skew-x-[10deg]">Inscrever</span>
                          </button>
                        )}
                        {!inviteValid && event.status === 'open' && isEventFull && !localIsSoldOut && (
                          <button onClick={() => { setCategoryId(cat.id); scrollToRegistration(); }} className="px-6 py-3 bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black uppercase tracking-widest text-xs skew-x-[-10deg] hover:bg-amber-500/20 transition-colors">
                            <span className="inline-block skew-x-[10deg]">📋 Lista de Espera</span>
                          </button>
                        )}
                        {!inviteValid && event.status === 'open' && localIsSoldOut && (
                          <div className="px-6 py-3 border border-red-500/30 text-red-500 bg-[#111] font-black uppercase tracking-widest text-xs skew-x-[-10deg]">
                            <span className="inline-block skew-x-[10deg]">Esgotado</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============ CTA REGISTRATION ============ */}
      {(inviteValid || (event.status === 'open' && !isEventFull)) && !showRegistration && (
        <section className={`py-20 text-center ${inviteValid ? 'bg-emerald-600' : 'bg-[#EDAC02]'}`}>
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-4xl md:text-6xl font-black text-black uppercase tracking-tighter italic mb-4">
              {inviteValid ? 'Você foi Convidado! 🎟️' : 'Pronto Para o Desafio?'}
            </h2>
            <p className="text-black/60 text-lg mb-8">
              {inviteValid
                ? 'Você tem um convite especial para se inscrever neste evento. Garanta sua vaga agora!'
                : (spotsRemaining != null ? `Restam ${spotsRemaining} vagas!` : 'Vagas limitadas.') + ' Garanta a sua agora e faça parte da comunidade UAIROX.'
              }
            </p>
            <button onClick={scrollToRegistration} className="bg-black text-white px-12 py-5 font-black text-lg uppercase tracking-widest skew-x-[-10deg] hover:bg-[#111] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
              <span className="inline-block skew-x-[10deg]">Inscrever Agora →</span>
            </button>
          </div>
        </section>
      )}

      {/* ============ CTA WAITLIST (when event is full) ============ */}
      {!inviteValid && event.status === 'open' && !showRegistration && isEventFull && (
        <section className="py-20 bg-gradient-to-b from-red-600/20 to-[#050505] text-center border-y border-red-500/20">
          <div className="max-w-3xl mx-auto px-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">📋</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter italic mb-4">
              Evento <span className="text-red-400">Lotado</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-3 max-w-xl mx-auto">
              Todas as {maxCapacity} vagas foram preenchidas. Mas você ainda pode entrar na lista de espera!
            </p>
            <p className="text-zinc-500 text-sm mb-8">
              Se alguém cancelar, os próximos da fila serão notificados por ordem de entrada.
            </p>
            <button onClick={scrollToRegistration} className="bg-amber-500 text-black px-12 py-5 font-black text-lg uppercase tracking-widest skew-x-[-10deg] hover:bg-amber-400 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
              <span className="inline-block skew-x-[10deg]">📋 Entrar na Lista de Espera →</span>
            </button>
          </div>
        </section>
      )}

      {/* ============ REGISTRATION FORM ============ */}
      {(showRegistration || inviteValid || event.status !== 'open') && (
        <div ref={registrationRef}>
          <RegistrationForm
            eventId={resolvedId!}
            event={event}
            categories={categories}
            batches={batches}
            kits={kits}
            initialCategoryId={categoryId}
            isEventFull={isEventFull}
            confirmedCount={confirmedCount}
            isInviteMode={inviteValid}
            inviteLinkId={inviteLink?.id || null}
          />
        </div>
      )}

      {/* ============ FOOTER ============ */}
      <footer className="py-8 border-t border-[#1a1a1a] text-center bg-[#050505]">
        <a href="/" className="inline-block mb-4">
          <img 
            src="/logo-uairox.webp" 
            alt="UAIROX" 
            className="w-[120px] h-auto object-contain mx-auto"
            loading="lazy"
          />
        </a>
        <p className="text-xs text-zinc-600">UAIROX © {new Date().getFullYear()} • Hybrid RUN</p>
      </footer>
    </div>
  );
}

// ============ STEP INDICATOR ============
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
          i < current ? 'bg-[#EDAC02]' : i === current ? 'bg-[#EDAC02]/50' : 'bg-[#262626]'
        }`} />
      ))}
    </div>
  );
}

// ============ REGISTRATION FORM ============
function RegistrationForm({ eventId, event, categories, batches, kits, initialCategoryId, isEventFull, confirmedCount, isInviteMode = false, inviteLinkId = null }: {
  eventId: string; event: any; categories: any[]; batches: any[]; kits: any[]; initialCategoryId: string; isEventFull: boolean; confirmedCount: number; isInviteMode?: boolean; inviteLinkId?: string | null;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState(initialCategoryId);
  
  // Sincroniza a categoria quando o usuário clica em "Inscrever" no card
  useEffect(() => {
    if (initialCategoryId) {
      setCategoryId(initialCategoryId);
    }
  }, [initialCategoryId]);

  const [kitId, setKitId] = useState('');

  // Auto-select mandatory kit se for o primeiro render e existir kit obrigatório
  useEffect(() => {
    if (kits && kits.length > 0 && !kitId) {
      const mandatoryKits = kits.filter((k:any) => k.is_optional === false);
      if (mandatoryKits.length > 0) {
        setKitId(mandatoryKits[0].id);
      }
    }
  }, [kits, kitId]);
  // Athlete data structure - index 0 = main athlete, 1+ = team members
  type AthleteData = { name: string; email: string; phone: string; instagram: string; birth_date: string; gender: string; shirt_size: string; gym: string; photo_url: string; };
  const emptyAthlete = (): AthleteData => ({ name: '', email: '', phone: '', instagram: '', birth_date: '', gender: '', shirt_size: '', gym: '', photo_url: '' });
  const [athletes, setAthletes] = useState<AthleteData[]>([emptyAthlete()]);
  const [teamName, setTeamName] = useState('');
  const [photoUploading, setPhotoUploading] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<any>(null);

  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'pix' | 'card' | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [processingConfirmation, setProcessingConfirmation] = useState(false);

  // Installment state
  const [paymentType, setPaymentType] = useState<'full' | 'card' | 'installments'>('full');
  const [installmentCount, setInstallmentCount] = useState<2 | 3>(2);
  const [installmentDate2, setInstallmentDate2] = useState('');
  const [installmentDate3, setInstallmentDate3] = useState('');

  // Shipping / freight (selecao event only)
  type FreightOption = { id: number; name: string; company: string; price: number; delivery_time: number };
  const [shippingAddress, setShippingAddress] = useState({ cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' });
  const [freightOptions, setFreightOptions] = useState<FreightOption[]>([]);
  const [selectedFreight, setSelectedFreight] = useState<FreightOption | null>(null);
  const [freightLoading, setFreightLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // Installment helpers
  // Invite mode overrides: treat as normal registration even if event is "full"
  const effectiveIsEventFull = isInviteMode ? false : isEventFull;

  const pixInstallmentsAvailable = !effectiveIsEventFull && event?.pix_installments_enabled && (() => {
    const deadline = event?.pix_installments_deadline;
    if (!deadline) return true;
    return new Date() <= new Date(deadline + 'T23:59:59');
  })();
  const maxInstallmentDate = event?.date ? calcMaxInstallmentDate(event.date) : null;
  const maxInstallmentDateStr = maxInstallmentDate ? maxInstallmentDate.toISOString().split('T')[0] : '';
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedKit = kits.find(k => k.id === kitId);
  const formActiveBatch = getActiveBatch(batches, categoryId);
  const teamSize = selectedCategory?.team_size || 1;
  const isTeam = teamSize > 1;

  // PIX Switch: override pix_key if event has secondary key and threshold is reached
  const getEffectivePixKey = (): string | null => {
    const batchKey = formActiveBatch?.pix_key || null;
    const secondaryKey = event?.pix_key_secondary;
    const switchAt = event?.pix_switch_at;
    if (secondaryKey && switchAt && confirmedCount >= switchAt) {
      return secondaryKey;
    }
    return batchKey;
  };
  const effectivePixKey = getEffectivePixKey();

  // Price per payment method — fallback to base price
  const basePricePix = formActiveBatch ? Number(formActiveBatch.price) : 0;
  const basePriceCard = formActiveBatch?.price_card ? Number(formActiveBatch.price_card) : basePricePix;
  const basePriceInstallments = formActiveBatch?.price_installments ? Number(formActiveBatch.price_installments) : basePricePix;
  const basePrice = paymentType === 'installments' ? basePriceInstallments : paymentType === 'card' ? basePriceCard : basePricePix;
  
  const kitPrice = selectedKit ? Number(selectedKit.price) : 0;
  const freightAmount = (event?.slug === 'selecao' && selectedFreight) ? selectedFreight.price : 0;
  // Coupon only for PIX à vista and Cartão — NOT for parcelado
  let discount = 0;
  if (couponDiscount && paymentType !== 'installments') {
    discount = couponDiscount.discount_type === 'percentage'
      ? (basePrice * couponDiscount.discount_value) / 100
      : couponDiscount.discount_value;
  }
  const totalPrice = Math.max(0, basePrice + kitPrice - discount + freightAmount);
  const totalPriceCard = Math.max(0, basePriceCard + kitPrice - discount + freightAmount);
  const totalPriceInstallmentsNoDiscount = Math.max(0, basePriceInstallments + kitPrice + freightAmount);
  const installmentAmounts = paymentType === 'installments' ? calcInstallmentAmounts(totalPrice, installmentCount) : [];

  // Helper to update a specific athlete field
  const updateAthlete = (index: number, field: keyof AthleteData, value: string) => {
    setAthletes(prev => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [field]: value };
      return arr;
    });
  };

  // Handle training photo upload
  const handlePhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(index);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `athlete-photos/${eventId}/${Date.now()}-${index}.${fileExt}`;
      const { error } = await supabase.storage.from('receipts').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
      updateAthlete(index, 'photo_url', data.publicUrl);
      toast.success('Foto enviada!');
    } catch (err: any) {
      toast.error('Erro no upload: ' + err.message);
    } finally {
      setPhotoUploading(null);
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      const total = selectedCategory.team_size || 1;
      setAthletes(prev => {
        const arr = [...prev];
        while (arr.length < total) arr.push(emptyAthlete());
        return arr.slice(0, total);
      });
    }
    
    // Invalida o cupom se a categoria for alterada e o cupom não for compatível com a nova
    if (couponDiscount && (couponDiscount as any).category_id && (couponDiscount as any).category_id !== categoryId) {
      setCouponDiscount(null);
      setCouponCode('');
      toast.error('Cupom removido: Inválido para a nova categoria selecionada');
    }
  }, [categoryId, selectedCategory, couponDiscount]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    const { data } = await (supabase as any)
      .from('discount_coupons')
      .select('*, coupon_batch_rules(*)')
      .eq('event_id', eventId).eq('code', couponCode.toUpperCase()).eq('active', true).single();
    if (data) {
      if (data.category_id && data.category_id !== categoryId) { toast.error('Cupom não é válido para a sua categoria atual'); return; }
      if (data.max_uses && (data.current_uses || 0) >= data.max_uses) { toast.error('Cupom esgotado'); return; }

      // Verifica travas de lote
      const rules: any[] = data.coupon_batch_rules || [];
      let effectiveType: string = data.discount_type;
      let effectiveValue: number = data.discount_value;

      if (rules.length > 0) {
        const matchingRule = rules.find((r: any) => r.batch_id === formActiveBatch?.id);
        if (!matchingRule) {
          toast.error(`Cupom inválido para o ${formActiveBatch?.name || 'lote atual'}`);
          return;
        }
        if (matchingRule.discount_value != null) {
          effectiveType = matchingRule.discount_type || data.discount_type;
          effectiveValue = matchingRule.discount_value;
        }
      }

      const applied = { ...data, discount_type: effectiveType, discount_value: effectiveValue };
      setCouponDiscount(applied);
      toast.success(`Cupom aplicado: ${effectiveType === 'percentage' ? `${effectiveValue}% OFF` : `R$ ${Number(effectiveValue).toFixed(2)} OFF`}`);
    } else { toast.error('Cupom inválido'); }
  };

  const handleCepLookup = async (digits: string) => {
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const viacepRes = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const viacepData = await viacepRes.json();
      if (!viacepData.erro) {
        setShippingAddress(prev => ({
          ...prev,
          rua: viacepData.logradouro || '',
          bairro: viacepData.bairro || '',
          cidade: viacepData.localidade || '',
          estado: viacepData.uf || '',
        }));
      } else {
        toast.error('CEP não encontrado.');
      }
    } catch {}
    setCepLoading(false);
    setFreightLoading(true);
    setFreightOptions([]);
    setSelectedFreight(null);
    try {
      const res = await fetch('/api/calculate-freight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep_destino: digits }),
      });
      const data = await res.json();
      if (data.options?.length > 0) {
        setFreightOptions(data.options);
        if (data.options.length === 1) setSelectedFreight(data.options[0]);
      } else {
        toast.error(data.error || 'Não foi possível calcular o frete para este CEP.');
      }
    } catch (err: any) {
      toast.error('Erro ao calcular frete: ' + err.message);
    } finally {
      setFreightLoading(false);
    }
  };

  const handleSubmit = async () => {
    const a1 = athletes[0];
    if (!categoryId || !a1.name.trim() || !a1.email.trim() || !a1.phone.trim() || !a1.birth_date || !a1.gender || !a1.shirt_size || !a1.gym.trim()) { toast.error('Preencha os campos obrigatórios do Atleta 1.'); return; }
    if (isTeam) {
      if (!teamName.trim()) { toast.error('Informe o nome da equipe.'); return; }
      for (let i = 1; i < athletes.length; i++) {
        const m = athletes[i];
        if (!m.name.trim() || !m.email.trim() || !m.phone.trim() || !m.birth_date || !m.gender || !m.shirt_size || !m.gym.trim()) {
          toast.error(`Preencha os campos obrigatórios do Atleta ${i + 1}.`); return;
        }
      }
    }
    setSubmitting(true);
    try {
      const teamMembersData = isTeam ? athletes.slice(1).map(m => ({
        name: m.name.trim(), email: m.email.trim(), phone: m.phone.trim(),
        instagram: m.instagram.trim(), birth_date: m.birth_date, gender: m.gender,
        shirt_size: m.shirt_size,
        gym: m.gym.trim(), photo_url: m.photo_url || null,
      })) : null;

      const isInstallments = paymentType === 'installments' && !effectiveIsEventFull;

      const { data, error } = await supabase.from('registrations').insert({
        event_id: eventId, category_id: categoryId, kit_id: effectiveIsEventFull ? null : (kitId || null),
        batch_id: effectiveIsEventFull ? null : (formActiveBatch?.id || null), coupon_id: effectiveIsEventFull ? null : (couponDiscount?.id || null),
        status: effectiveIsEventFull ? 'waitlist' : 'pending', 
        total_paid: effectiveIsEventFull ? 0 : (isInstallments ? 0 : totalPrice),
        payment_method: effectiveIsEventFull ? null : (isInstallments ? 'pix' : (formActiveBatch?.payment_link ? 'link' : 'pix')),
        payment_type: isInstallments ? 'installments' : 'full',
        athlete_name: a1.name.trim(), athlete_email: a1.email.trim(),
        athlete_phone: a1.phone.trim(), athlete_birth_date: a1.birth_date || null,
        athlete_gender: a1.gender || null, athlete_shirt_size: a1.shirt_size || null,
        athlete_instagram: a1.instagram.trim() || null,
        athlete_gym: a1.gym.trim() || null,
        athlete_photo_url: a1.photo_url || null,
        team_name: isTeam ? teamName.trim() : null, team_members: teamMembersData,
        ...(event?.slug === 'selecao' && selectedFreight ? {
          shipping_address: shippingAddress,
          shipping_service_name: selectedFreight.name,
          shipping_freight_amount: selectedFreight.price,
        } : {}),
      } as any).select().single();
      if (error) throw error;
      if (couponDiscount) {
        await supabase.from('discount_coupons').update({ current_uses: (couponDiscount.current_uses || 0) + 1 }).eq('id', couponDiscount.id);
      }

      // Increment invite link usage counter
      if (isInviteMode && inviteLinkId) {
        const { data: linkData } = await (supabase as any)
          .from('event_invite_links')
          .select('current_uses')
          .eq('id', inviteLinkId)
          .single();
        if (linkData) {
          await (supabase as any)
            .from('event_invite_links')
            .update({ current_uses: (linkData.current_uses || 0) + 1 })
            .eq('id', inviteLinkId);
        }
      }
      setRegistrationId(data.id);

      // Create installments if parcelado
      if (isInstallments) {
        const amounts = calcInstallmentAmounts(totalPrice, installmentCount);
        const today = new Date().toISOString().split('T')[0];
        const installments: any[] = [{ registration_id: data.id, installment_number: 1, amount: amounts[0], due_date: today, status: 'pending' }];
        installments.push({ registration_id: data.id, installment_number: 2, amount: amounts[1], due_date: installmentDate2, status: 'pending' });
        if (installmentCount === 3) {
          installments.push({ registration_id: data.id, installment_number: 3, amount: amounts[2], due_date: installmentDate3, status: 'pending' });
        }
        await (supabase as any).from('registration_installments').insert(installments);
      }
      
      // Auto-capture to marketing contacts base via API (uses service_role)
      const marketingRows = [
        { name: a1.name.trim(), phone: a1.phone.trim().replace(/\D/g, ''), email: a1.email.trim() || undefined },
        ...(teamMembersData || []).filter((m: any) => m.phone).map((m: any) => ({
          name: m.name?.trim() || undefined,
          phone: m.phone.trim().replace(/\D/g, ''),
          email: m.email?.trim() || undefined,
        })),
      ].filter(r => r.phone.length >= 8);
      if (marketingRows.length > 0) {
        fetch('/api/marketing-contacts?action=import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: marketingRows }),
        }).then(res => {
          if (!res.ok) console.error('[Marketing Auto-Capture] API error:', res.status);
          else console.log(`[Marketing Auto-Capture] ${marketingRows.length} contato(s) sincronizado(s)`);
        }).catch(err => console.error('[Marketing Auto-Capture] Fetch error:', err.message));
      }

      setSuccess(true);
    } catch (err: any) { toast.error('Erro ao salvar inscrição: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const sendConfirmationMessages = () => {
    if (!athletes.length) return;

    const sharedFields = {
      event_name: event?.title || 'UAIROX Evento',
      event_slug: event?.slug || null,
      whatsapp_link: event?.whatsapp_group_link || null,
      registration_code: registrationId?.slice(0, 8) || null,
      category_name: selectedCategory?.name || null,
      total_price: totalPrice,
      pix_key: effectivePixKey || null,
      payment_type: paymentType === 'installments' ? 'installments' : 'full',
      team_name: isTeam ? teamName.trim() || null : null,
      ...(event?.slug === 'selecao' && selectedFreight ? {
        freight_service: selectedFreight.name,
        freight_amount: selectedFreight.price,
        freight_days: selectedFreight.delivery_time,
        shipping_address: `${shippingAddress.rua}, ${shippingAddress.numero}${shippingAddress.complemento ? ` — ${shippingAddress.complemento}` : ''}, ${shippingAddress.bairro}, ${shippingAddress.cidade}/${shippingAddress.estado} · CEP ${shippingAddress.cep}`,
      } : {}),
    };

    // Email para cada membro da equipe (ou atleta individual)
    athletes.forEach(athlete => {
      if (!athlete.email?.trim()) return;
      fetch('/api/send-registration-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sharedFields,
          athlete_name: athlete.name.trim(),
          athlete_email: athlete.email.trim(),
          shirt_size: athlete.shirt_size || null,
        }),
      }).then(async res => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          console.error('Erro ao enviar email:', d.error || res.status);
        }
      }).catch(err => console.error('Erro ao enviar email:', err.message));
    });

    // WhatsApp webhook para cada membro
    (supabase as any).from('botconversa_config')
      .select('trigger_inscricao_ativo, trigger_inscricao_url, msg_inscricao')
      .eq('event_id', eventId)
      .maybeSingle()
      .then(async ({ data: bcfg }: any) => {
        if (!bcfg?.trigger_inscricao_ativo || !bcfg?.trigger_inscricao_url) return;
        const template = bcfg.msg_inscricao || DEFAULT_MESSAGES.inscricao;
        const valorFmt = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
        const codigo = registrationId?.slice(0, 8) || '';
        for (const athlete of athletes) {
          if (!athlete.phone?.trim()) continue;
          const message = interpolate(template, {
            nome: athlete.name.trim(),
            evento: event?.title || '',
            categoria: selectedCategory?.name || '',
            equipe: isTeam ? teamName.trim() : '',
            camisa: athlete.shirt_size || '',
            total: valorFmt,
            pix: paymentType !== 'installments' ? (effectivePixKey || '') : '',
            codigo,
            grupo: event?.whatsapp_group_link || '',
          });
          const payload = { telefone: athlete.phone.trim(), message };
          const { ok, error } = await sendWebhook(bcfg.trigger_inscricao_url, payload);
          (supabase as any).from('botconversa_logs').insert({
            event_id: eventId, registration_id: registrationId,
            trigger_type: 'inscricao', webhook_url: bcfg.trigger_inscricao_url,
            payload, status: ok ? 'sent' : 'failed',
            error_message: ok ? null : error,
          }).then(() => {});
        }
      });
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !registrationId) return;

    setReceiptUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${registrationId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      const url = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('registrations')
        .update({ pix_receipt_url: url } as any)
        .eq('id', registrationId);

      if (updateError) throw updateError;

      setReceiptUrl(url);
      toast.success('Comprovante recebido!');

      // Trigger confirmation: show processing animation, fire messages, then open overlay
      setProcessingConfirmation(true);
      sendConfirmationMessages();
      setTimeout(() => {
        setProcessingConfirmation(false);
        setShowSuccessOverlay(true);
      }, 1500);
    } catch (err: any) {
      toast.error('Erro ao enviar comprovante: ' + err.message);
    } finally {
      setReceiptUploading(false);
    }
  };

  const inputClass = "w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none transition-colors";
  const labelClass = "block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5";

  // ============ PROCESSING OVERLAY ============
  if (processingConfirmation) {
    return (
      <div className="fixed inset-0 z-50 bg-[#020202] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-[#EDAC02]/20 border-t-[#EDAC02] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">📨</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-white font-black text-lg uppercase tracking-wider">Processando...</p>
          <p className="text-zinc-500 text-sm mt-1">Enviando confirmação por email e WhatsApp</p>
        </div>
      </div>
    );
  }

  // ============ SUCCESS OVERLAY ============
  if (success && showSuccessOverlay) {
    const isSelecao = event?.slug === 'selecao';
    return (
      <div className="fixed inset-0 z-50 bg-[#020202] flex flex-col items-center justify-center overflow-hidden">
        <style>{`
          @keyframes rise-particle { 0%{transform:translateY(0) scale(1);opacity:.9} 100%{transform:translateY(-140px) scale(0.2);opacity:0} }
          .rise-p { animation: rise-particle linear infinite; position:absolute; border-radius:50%; background:#EDAC02; }
        `}</style>
        <div className="rise-p w-1.5 h-1.5" style={{bottom:'18%',left:'12%',animationDuration:'3.2s',animationDelay:'0s'}} />
        <div className="rise-p w-1 h-1" style={{bottom:'22%',left:'28%',animationDuration:'2.6s',animationDelay:'0.6s'}} />
        <div className="rise-p w-2 h-2" style={{bottom:'14%',left:'50%',animationDuration:'3.8s',animationDelay:'1.1s'}} />
        <div className="rise-p w-1 h-1" style={{bottom:'28%',left:'68%',animationDuration:'2.2s',animationDelay:'0.3s'}} />
        <div className="rise-p w-1.5 h-1.5" style={{bottom:'16%',left:'84%',animationDuration:'4s',animationDelay:'0.9s'}} />
        <div className="rise-p w-1 h-1" style={{bottom:'10%',left:'42%',animationDuration:'2.9s',animationDelay:'1.7s'}} />
        <div className="rise-p w-1 h-1" style={{bottom:'20%',left:'90%',animationDuration:'3.5s',animationDelay:'0.4s'}} />
        <div className="rise-p w-2 h-2" style={{bottom:'12%',left:'8%',animationDuration:'4.2s',animationDelay:'1.3s'}} />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(237,172,2,0.10)_0%,transparent_65%)]" />

        <div className="relative z-10 text-center px-6 max-w-sm w-full">
          <div className="w-24 h-24 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-[#EDAC02]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <p className="text-[10px] font-bold text-[#EDAC02]/50 uppercase tracking-[0.35em] mb-2">Inscrição Recebida</p>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
            {isSelecao ? 'Você Está' : 'Inscrição'}
          </h1>
          <h1 className="text-5xl font-black text-[#EDAC02] uppercase tracking-tighter italic leading-none mb-8">
            {isSelecao ? 'Convocado!' : 'Confirmada!'}
          </h1>

          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 mb-6 space-y-2.5 text-sm text-left">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Atleta</span>
              <span className="text-white font-bold truncate ml-4 max-w-[55%] text-right">{athletes[0]?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Categoria</span>
              <span className="text-white">{selectedCategory?.name}</span>
            </div>
            {athletes[0]?.shirt_size && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Camisa</span>
                <span className="text-white">{athletes[0].shirt_size}</span>
              </div>
            )}
            {freightAmount > 0 && selectedFreight && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Frete</span>
                <span className="text-white">{selectedFreight.name} · {selectedFreight.delivery_time} dias úteis</span>
              </div>
            )}
            <div className="border-t border-[#262626] pt-2.5 flex justify-between items-center">
              <span className="text-zinc-400 font-bold">Total</span>
              <span className="text-[#EDAC02] font-black text-xl">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-600 text-xs">Código</span>
              <span className="text-zinc-400 font-mono text-xs">{registrationId?.slice(0, 8)}</span>
            </div>
          </div>

          {event?.whatsapp_group_link ? (
            <a
              href={event.whatsapp_group_link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-[#25D366] text-black font-black text-base uppercase tracking-widest rounded-xl hover:bg-[#1db954] transition-colors text-center block"
            >
              📲 Entrar no Grupo de Atletas
            </a>
          ) : (
            <button
              onClick={() => setShowSuccessOverlay(false)}
              className="w-full py-4 bg-[#EDAC02] text-black font-black text-base uppercase tracking-widest rounded-xl hover:bg-[#d4980a] transition-colors"
            >
              Ver Detalhes do Pagamento →
            </button>
          )}
          <p className="text-xs text-zinc-600 mt-3">Um email de confirmação foi enviado para {athletes[0]?.email}</p>
        </div>
      </div>
    );
  }

  // ============ SUCCESS ============
  if (success) {
    // Waitlist success screen
    if (effectiveIsEventFull) {
      return (
        <section className="py-20 bg-[#050505]">
          <div className="max-w-xl mx-auto px-4">
            <div className="bg-[#0a0a0a] border border-amber-500/30 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📋</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Você está na Lista de Espera! 🙏</h2>
              <p className="text-sm text-zinc-400 mb-4">
                Sua inscrição no <span className="text-white font-bold">{event.title}</span> foi registrada na <span className="text-amber-400 font-bold">lista de espera</span>.
              </p>
              <div className="bg-[#050505] rounded-xl p-5 mb-6 border border-amber-500/20 text-left">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">📋 Como Funciona</p>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    Você será notificado por e-mail caso uma vaga seja liberada
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    A ordem da fila é por data de entrada na lista
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    Não é necessário nenhum pagamento por enquanto
                  </li>
                </ul>
              </div>
              {event.whatsapp_group_link && (
                <a href={event.whatsapp_group_link} target="_blank" rel="noopener noreferrer" className="inline-flex w-full justify-center items-center gap-2 px-6 py-3 bg-[#25D366] text-black hover:text-white font-black rounded-lg hover:bg-[#128C7E] transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  Acessar GRUPO DE ATLETAS
                </a>
              )}
            </div>
          </div>
        </section>
      );
    }

    // Installment success screen
    if (paymentType === 'installments') {
      const amounts = calcInstallmentAmounts(totalPrice, installmentCount);
      const portalUrl = `${window.location.origin}/pagamento/${registrationId}`;
      return (
        <section className="py-20 bg-[#050505]">
          <div className="max-w-xl mx-auto px-4">
            <div className="bg-[#0a0a0a] border border-[#EDAC02]/30 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-[#EDAC02]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">💳</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Inscrição Parcelada! 🎉</h2>
              <p className="text-sm text-zinc-400 mb-6">
                <span className="text-white font-bold">{event.title}</span> — PIX Parcelado ({installmentCount}x de {formatCurrency(amounts[0])})
              </p>

              {/* 1st installment PIX */}
              <div className="bg-[#050505] rounded-xl p-5 mb-4 border border-[#EDAC02]/20 text-left">
                <p className="text-xs font-bold text-[#EDAC02] uppercase tracking-wider mb-3">⚡ 1ª Parcela — {formatCurrency(amounts[0])} (pagar agora)</p>
                {effectivePixKey && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1 font-bold">CHAVE PIX:</p>
                    <div className="flex items-center gap-2 mb-3">
                      <code className="flex-1 bg-[#111] px-3 py-2.5 rounded-lg text-sm text-[#EDAC02] font-mono border border-[#262626] select-all">{effectivePixKey}</code>
                      <button onClick={() => { navigator.clipboard.writeText(effectivePixKey!); toast.success('PIX copiado!'); }} className="px-4 py-2.5 bg-[#EDAC02] text-black font-black rounded-lg text-sm">Copiar</button>
                    </div>
                  </div>
                )}
                {/* Upload comprovante 1a parcela */}
                <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-[#262626] rounded-xl cursor-pointer hover:border-[#EDAC02]/30 transition-colors">
                  {receiptUrl ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      <span className="text-sm font-bold">Comprovante Enviado!</span>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400 font-bold">{receiptUploading ? 'Enviando...' : '📎 Anexar Comprovante da 1ª Parcela'}</p>
                  )}
                  <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleUploadReceipt} disabled={receiptUploading} />
                </label>
              </div>

              {/* Próximas parcelas */}
              <div className="bg-[#050505] rounded-xl p-5 mb-4 border border-[#1a1a1a] text-left">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">📅 Próximas Parcelas</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">2ª Parcela</span>
                    <span className="text-white font-bold">{formatCurrency(amounts[1])} — {new Date(installmentDate2 + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  {installmentCount === 3 && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">3ª Parcela</span>
                      <span className="text-white font-bold">{formatCurrency(amounts[2])} — {new Date(installmentDate3 + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Portal link */}
              <div className="bg-[#050505] rounded-xl p-5 mb-6 border border-[#EDAC02]/10 text-left">
                <p className="text-xs font-bold text-[#EDAC02] uppercase tracking-wider mb-2">🔗 Portal de Pagamentos</p>
                <p className="text-xs text-zinc-500 mb-3">Acesse para pagar parcelas e enviar comprovantes:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#111] px-3 py-2.5 rounded-lg text-xs text-[#EDAC02] font-mono border border-[#262626] truncate">{portalUrl}</code>
                  <button onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('Link copiado!'); }} className="px-3 py-2.5 bg-[#111] border border-[#262626] text-zinc-300 font-bold rounded-lg text-xs hover:text-[#EDAC02] transition-colors">Copiar</button>
                </div>
              </div>

              <p className="text-xs text-zinc-500 mb-2">Código: <span className="text-white font-mono">{registrationId?.slice(0, 8)}</span></p>
            </div>
          </div>
        </section>
      );
    }

    // Normal success screen
    return (
      <section className="py-20 bg-[#050505]">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-[#0a0a0a] border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Inscrição Realizada! 🎉</h2>
            <p className="text-sm text-zinc-400 mb-6">Sua inscrição em <span className="text-white font-bold">{event.title}</span> foi registrada.</p>
            {totalPrice > 0 && (
              <div className="bg-[#050505] rounded-xl p-5 mb-6 border border-[#1a1a1a] text-left">
                <p className="text-xs font-bold text-[#EDAC02] uppercase tracking-wider mb-3">💰 Pagamento</p>
                          {(() => {
                  const hasPix = !!effectivePixKey;
                  const hasCard = !!formActiveBatch?.payment_link;
                  const showSelection = hasPix && hasCard && !selectedPaymentMethod;
                  const methodToShow = selectedPaymentMethod || (hasPix && !hasCard ? 'pix' : !hasPix && hasCard ? 'card' : null);

                  if (showSelection) {
                    return (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-zinc-400 font-bold mb-1">Como você deseja pagar?</p>
                        <button onClick={() => setSelectedPaymentMethod('pix')} className="flex items-center gap-4 w-full p-4 border border-[#262626] rounded-xl hover:border-[#EDAC02] hover:bg-[#EDAC02]/5 bg-[#0a0a0a] transition-all group text-left">
                          <div className="w-12 h-12 rounded-full bg-[#EDAC02]/10 flex items-center justify-center text-[#EDAC02] group-hover:bg-[#EDAC02] group-hover:text-black transition-colors">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                          </div>
                          <div>
                            <p className="font-black text-white text-lg">PIX</p>
                            <p className="text-xs text-zinc-500">Aprovação rápida e sem taxas</p>
                          </div>
                        </button>

                        <button onClick={() => setSelectedPaymentMethod('card')} className="flex items-center gap-4 w-full p-4 border border-[#262626] rounded-xl hover:border-[#EDAC02] hover:bg-[#EDAC02]/5 bg-[#0a0a0a] transition-all group text-left">
                          <div className="w-12 h-12 rounded-full bg-[#EDAC02]/10 flex items-center justify-center text-[#EDAC02] group-hover:bg-[#EDAC02] group-hover:text-black transition-colors">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                          </div>
                          <div>
                            <p className="font-black text-white text-lg">Cartão de Crédito</p>
                            <p className="text-xs text-zinc-500">Parcele em até 12x</p>
                          </div>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {hasPix && hasCard && (
                        <button onClick={() => setSelectedPaymentMethod(null)} className="text-[10px] text-zinc-500 hover:text-[#EDAC02] transition-colors mb-4 uppercase tracking-widest font-bold flex items-center gap-1 group">
                          <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                          Escolher outra forma de pagamento
                        </button>
                      )}

                      {methodToShow === 'pix' && effectivePixKey && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-1 font-bold">CHAVE PIX:</p>
                          <div className="flex items-center gap-2 mb-4">
                            <code className="flex-1 bg-[#111] px-3 py-2.5 rounded-lg text-sm text-[#EDAC02] font-mono border border-[#262626] select-all shadow-inner">{effectivePixKey}</code>
                            <button onClick={() => { navigator.clipboard.writeText(effectivePixKey!); toast.success('PIX copiado!'); }} className="px-4 py-2.5 bg-[#EDAC02] text-black font-black rounded-lg text-sm hover:bg-[#d49b02] transition-colors shadow">Copiar</button>
                          </div>

                          {/* Área de Upload do Comprovante */}
                          <div className="bg-[#111] border border-[#262626] rounded-xl p-4 shadow-inner mt-6">
                            <p className="text-sm text-white font-bold mb-1">Anexar Comprovante</p>
                            <p className="text-xs text-zinc-500 mb-4">Acelere a aprovação da sua inscrição enviando o comprovante agora.</p>
                            
                            {receiptUrl ? (
                              <div className="flex flex-col gap-3 mt-1">
                                <div className="flex items-center justify-center gap-2 text-green-500 bg-green-500/10 px-4 py-3 rounded-lg border border-green-500/20">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                  <span className="text-sm font-bold">Comprovante Recebido!</span>
                                </div>
                                
                                {event.whatsapp_group_link && (
                                  <div className="p-4 bg-[#0a0a0a] border border-[#262626] rounded-xl text-center shadow-lg border-t-brand-500/30">
                                    <p className="text-sm text-white font-black mb-1">Último Passo 🚀</p>
                                    <p className="text-xs text-zinc-400 mb-4 px-2">Entre no grupo oficial do evento para receber todas as novidades.</p>
                                    <a href={event.whatsapp_group_link} target="_blank" rel="noopener noreferrer" className="inline-flex w-full justify-center items-center gap-2 px-6 py-3 bg-[#25D366] text-black hover:text-white font-black rounded-lg hover:bg-[#128C7E] transition-all">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                      Acessar GRUPO DE ATLETAS
                                    </a>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed ${receiptUploading ? 'border-[#EDAC02] opacity-70' : 'border-[#262626] hover:border-[#EDAC02]'} rounded-lg cursor-pointer bg-[#0a0a0a] transition-colors`}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                  {receiptUploading ? (
                                    <svg className="animate-spin h-6 w-6 text-[#EDAC02] mb-3 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-3 mx-auto"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                  )}
                                  <p className="text-sm text-zinc-400 font-bold">
                                    {receiptUploading ? 'Enviando comprovante...' : 'Enviar Imagem/PDF do Comprovante'}
                                  </p>
                                </div>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*,application/pdf"
                                  onChange={handleUploadReceipt}
                                  disabled={receiptUploading}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                      {methodToShow === 'card' && formActiveBatch?.payment_link && (
                        <div className="text-center pt-4 pb-2">
                           <a href={formActiveBatch.payment_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full py-5 bg-[#EDAC02] text-black font-black rounded-xl text-center hover:bg-[#d49b02] transition-colors text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transform">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                             Pagar com Cartão de Crédito
                           </a>
                           <p className="text-xs text-zinc-500 mt-4">Você será redirecionado para o ambiente seguro de pagamento.</p>
                           
                            {/* Upload Area for Card Receipt */}
                            <div className="bg-[#111] border border-[#262626] rounded-xl p-4 shadow-inner mt-6 text-left">
                              <p className="text-sm text-white font-bold mb-1">Anexar Comprovante</p>
                              <p className="text-xs text-zinc-500 mb-4">Após o pagamento, anexe o print ou recibo gerado para liberar sua inscrição.</p>
                              
                              {receiptUrl ? (
                                <div className="flex flex-col gap-3 mt-1">
                                  <div className="flex items-center justify-center gap-2 text-green-500 bg-green-500/10 px-4 py-3 rounded-lg border border-green-500/20">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    <span className="text-sm font-bold">Comprovante Recebido!</span>
                                  </div>
                                  
                                  {event.whatsapp_group_link && (
                                    <div className="p-4 bg-[#0a0a0a] border border-[#262626] rounded-xl text-center shadow-lg border-t-brand-500/30">
                                      <p className="text-sm text-white font-black mb-1">Último Passo 🚀</p>
                                      <p className="text-xs text-zinc-400 mb-4 px-2">Entre no grupo oficial do evento para receber todas as novidades.</p>
                                      <a href={event.whatsapp_group_link} target="_blank" rel="noopener noreferrer" className="inline-flex w-full justify-center items-center gap-2 px-6 py-3 bg-[#25D366] text-black hover:text-white font-black rounded-lg hover:bg-[#128C7E] transition-all">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                        Acessar GRUPO DE ATLETAS
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed ${receiptUploading ? 'border-[#EDAC02] opacity-70' : 'border-[#262626] hover:border-[#EDAC02]'} rounded-lg cursor-pointer bg-[#0a0a0a] transition-colors`}>
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                    {receiptUploading ? (
                                      <svg className="animate-spin h-6 w-6 text-[#EDAC02] mb-3 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-3 mx-auto"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    )}
                                    <p className="text-sm text-zinc-400 font-bold">
                                      {receiptUploading ? 'Enviando comprovante...' : 'Enviar Imagem/PDF do Comprovante'}
                                    </p>
                                  </div>
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*,application/pdf"
                                    onChange={handleUploadReceipt}
                                    disabled={receiptUploading}
                                  />
                                </label>
                              )}
                            </div>
                        </div>
                      )}

                    </div>
                  );
                })()}
              </div>
            )}
            <p className="text-xs text-zinc-500 mb-2">Código da Inscrição: <span className="text-white font-mono">{registrationId?.slice(0, 8)}</span></p>
          </div>
        </div>
      </section>
    );
  }

  if (!isInviteMode && event.status !== 'open') return null;

  const steps = [
    { title: 'Categoria', subtitle: 'Escolha sua modalidade' },
    { title: 'Dados', subtitle: 'Informações do atleta' },
    { title: 'Revisão', subtitle: 'Confirme e finalize' },
  ];

  const canAdvance = () => {
    if (step === 0) return !!categoryId;
    if (step === 1) {
      const a1 = athletes[0];
      if (!a1.name.trim() || !a1.email.trim() || !a1.phone.trim() || !a1.birth_date || !a1.gender || !a1.shirt_size || !a1.gym.trim()) return false;
      if (isTeam) {
        if (!teamName.trim()) return false;
        for (let i = 1; i < athletes.length; i++) {
          const m = athletes[i];
          if (!m.name.trim() || !m.email.trim() || !m.phone.trim() || !m.birth_date || !m.gender || !m.shirt_size || !m.gym.trim()) return false;
        }
      }
      if (event?.slug === 'selecao') {
        if (shippingAddress.cep.replace(/\D/g, '').length !== 8) return false;
        if (!shippingAddress.rua.trim() || !shippingAddress.numero.trim() || !shippingAddress.bairro.trim() || !shippingAddress.cidade.trim() || !shippingAddress.estado.trim()) return false;
        if (!selectedFreight) return false;
      }
      return true;
    }
    return true;
  };

  return (
    <section id="inscricao" className="py-20 bg-[#050505] border-t border-[#1a1a1a]">
      <div className="max-w-xl mx-auto px-4 space-y-6">
        <div className="text-center mb-8">
          {isEventFull && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-sm font-black text-amber-400 uppercase tracking-wider">Lista de Espera</p>
                  <p className="text-xs text-zinc-400 mt-0.5">O evento está lotado. Preencha seus dados para entrar na fila — sem pagamento por enquanto.</p>
                </div>
              </div>
            </div>
          )}
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic">
            {isEventFull ? (
              <>Lista de <span className="text-amber-400">Espera</span></>
            ) : (
              <>Inscreva<span className="text-[#EDAC02]">-se</span></>
            )}
          </h2>
        </div>

        <StepIndicator current={step} total={steps.length} />
        <div className="flex items-center justify-between mt-3">
          <div>
            <h3 className="text-lg font-black text-white">{steps[step].title}</h3>
            <p className="text-xs text-zinc-500">{steps[step].subtitle}</p>
          </div>
          <span className="text-xs text-zinc-600 font-mono">{step + 1}/{steps.length}</span>
        </div>

        {/* STEP 0: Category */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              {categories.map(cat => {
                const localBatch = getActiveBatch(batches, cat.id);
                const relevantBatches = batches.filter(b => !b.category_id || b.category_id === cat.id);
                const soldOut = relevantBatches.length > 0 && !localBatch;
                const price = localBatch ? Number(localBatch.price) : 0;
                
                return (
                  <button key={cat.id} onClick={() => !soldOut && setCategoryId(cat.id)} disabled={soldOut}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${categoryId === cat.id ? 'border-[#EDAC02] bg-[#EDAC02]/5' : (soldOut ? 'border-red-500/20 bg-red-500/5 opacity-50 cursor-not-allowed' : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-zinc-700')}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-bold ${soldOut ? 'text-red-400' : 'text-white'}`}>{cat.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#111] text-zinc-400 border border-[#262626]">{cat.team_size === 1 ? 'Individual' : `${cat.team_size} pessoas`}</span>
                          {cat.gender_requirement !== 'any' && <span className="text-[10px] px-2 py-0.5 rounded bg-[#111] text-zinc-400 border border-[#262626]">{cat.gender_requirement === 'masculino' ? '♂ Masc' : '♀ Fem'}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-black ${soldOut ? 'text-zinc-500' : 'text-[#EDAC02]'}`}>{soldOut ? 'ESGOTADO' : formatCurrency(price)}</p>
                        {localBatch && !soldOut && <p className="text-[10px] text-zinc-500 uppercase">{localBatch.name}</p>}
                      </div>
                    </div>
                    {categoryId === cat.id && <div className="mt-2 flex items-center gap-1.5 text-[#EDAC02]"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg><span className="text-xs font-bold">Selecionada</span></div>}
                  </button>
                );
              })}
            </div>
            {kits.length > 0 && (() => {
              const mandatoryKits = kits.filter(k => k.is_optional === false);
              if (event?.slug === 'selecao') {
                return (
                  <div className="mt-8 border-t border-[#1a1a1a] pt-6">
                    <p className="text-xs font-bold text-[#EDAC02] uppercase tracking-wider mb-3">🎁 O Que Você Recebe</p>
                    <div className="space-y-3">
                      {kits.map(kit => (
                        <div key={kit.id} className="w-full text-left p-4 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase ${kit.is_optional === false ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20' : 'bg-[#EDAC02]/10 text-[#EDAC02] border border-[#EDAC02]/20'}`}>
                                  {kit.is_optional === false ? 'Incluso na Inscrição' : 'Sorteio'}
                                </span>
                              </div>
                              <p className="font-black text-white text-base leading-tight">{kit.name}</p>
                              {kit.description && <p className="text-xs text-zinc-500 mt-1">{kit.description}</p>}
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <span className={`text-xl font-black italic tracking-tighter block ${kit.is_optional === false ? 'text-[#25D366]' : 'text-[#EDAC02]'}`}>
                                {kit.is_optional === false ? 'Grátis' : '🏆'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
              <div className="mt-8 border-t border-[#1a1a1a] pt-6">
                <p className="text-xs font-bold text-[#EDAC02] uppercase tracking-wider mb-3">ESCOLHA SEU KIT</p>
                <div className="space-y-3">
                  {mandatoryKits.length === 0 && (
                    <button onClick={() => setKitId('')} className={`w-full text-left p-3 rounded-xl border transition-all ${!kitId ? 'border-[#EDAC02] bg-[#EDAC02]/5' : 'border-[#1a1a1a] bg-[#0a0a0a]'}`}><span className="text-sm font-bold text-zinc-400">Não Quero Kit</span></button>
                  )}
                  {kits.map(kit => (
                    <button key={kit.id} onClick={() => setKitId(kit.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${kitId === kit.id ? 'border-[#EDAC02] bg-[#EDAC02]/5 shadow-[0_0_20px_rgba(237,172,2,0.1)]' : 'border-[#1a1a1a] bg-[#0a0a0a] opacity-80 hover:opacity-100 hover:border-zinc-700'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                           <div className="flex items-center gap-2 mb-1.5">
                             <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase ${kit.is_optional === false ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20' : 'bg-transparent text-zinc-400 border border-[#262626]'}`}>
                            {kit.is_optional === false ? 'Incluso na Inscrição' : 'Opcional'}
                             </span>
                           </div>
                           <p className="font-black text-white text-base leading-tight">{kit.name}</p>
                           {kit.description && <p className="text-xs text-zinc-500 mt-1">{kit.description}</p>}
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                           <span className={`text-xl font-black italic tracking-tighter block ${kit.is_optional === false ? 'text-[#25D366]' : 'text-[#EDAC02]'}`}>
                             {kit.is_optional === false ? 'Grátis' : `+ ${formatCurrency(Number(kit.price))}`}
                           </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              );
            })()}
          </div>
        )}

        {/* STEP 1: Athlete Data */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Team name (only for teams) */}
            {isTeam && (
              <div className="bg-[#0a0a0a] border border-[#EDAC02]/20 rounded-xl p-5">
                <p className="text-xs font-bold text-[#EDAC02] uppercase tracking-wider mb-3">👥 Equipe ({selectedCategory?.team_size} participantes)</p>
                <div><label className={labelClass}>Nome da Equipe *</label><input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Nome do time" className={inputClass} /></div>
              </div>
            )}

            {/* Athlete blocks */}
            {athletes.map((athlete, idx) => (
              <div key={idx} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
                <p className="text-xs font-bold text-[#EDAC02] uppercase tracking-wider">
                  {isTeam ? `🏃 Atleta ${idx + 1}` : 'Dados Pessoais'}
                </p>
                <div><label className={labelClass}>Nome Completo *</label><input value={athlete.name} onChange={e => updateAthlete(idx, 'name', e.target.value)} placeholder="Nome completo" className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>E-mail *</label><input type="email" value={athlete.email} onChange={e => updateAthlete(idx, 'email', e.target.value)} placeholder="seu@email.com" className={inputClass} /></div>
                  <div><label className={labelClass}>WhatsApp *</label><input value={athlete.phone} onChange={e => updateAthlete(idx, 'phone', e.target.value)} placeholder="(31) 99999-9999" className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Instagram</label><input value={athlete.instagram} onChange={e => updateAthlete(idx, 'instagram', e.target.value)} placeholder="@seuinsta" className={inputClass} /></div>
                  <div><label className={labelClass}>Local de Treino *</label><input value={athlete.gym} onChange={e => updateAthlete(idx, 'gym', e.target.value)} placeholder="Nome do Box / Academia" className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Data de Nascimento *</label><input type="date" value={athlete.birth_date} onChange={e => updateAthlete(idx, 'birth_date', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Gênero *</label><select value={athlete.gender} onChange={e => updateAthlete(idx, 'gender', e.target.value)} className={inputClass}><option value="">Selecione</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option><option value="outro">Outro</option></select></div>
                </div>
                <div>
                  <label className={labelClass}>Tamanho da Camisa *</label>
                  <select value={athlete.shirt_size} onChange={e => updateAthlete(idx, 'shirt_size', e.target.value)} className={inputClass}>
                    <option value="">Selecione o tamanho</option>
                    <option value="PP">PP</option>
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                    <option value="EXG">EXG</option>
                  </select>
                </div>

                {/* Shipping address — selecao event, main athlete only */}
                {event?.slug === 'selecao' && idx === 0 && (
                  <div className="border-t border-[#1a1a1a] pt-4 space-y-3">
                    <p className="text-xs font-bold text-[#EDAC02] uppercase tracking-wider">📦 Endereço de Entrega da Camisa</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>CEP *</label>
                        <input
                          value={shippingAddress.cep}
                          onChange={e => {
                            const val = e.target.value;
                            setShippingAddress(prev => ({ ...prev, cep: val }));
                            const digits = val.replace(/\D/g, '');
                            if (digits.length === 8) handleCepLookup(digits);
                          }}
                          onBlur={() => handleCepLookup(shippingAddress.cep.replace(/\D/g, ''))}
                          placeholder="00000-000"
                          maxLength={9}
                          className={inputClass}
                        />
                        {cepLoading && <p className="text-xs text-zinc-500 mt-1 animate-pulse">Buscando endereço...</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Número *</label>
                        <input
                          value={shippingAddress.numero}
                          onChange={e => setShippingAddress(prev => ({ ...prev, numero: e.target.value }))}
                          placeholder="123"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Rua / Logradouro *</label>
                      <input
                        value={shippingAddress.rua}
                        onChange={e => setShippingAddress(prev => ({ ...prev, rua: e.target.value }))}
                        placeholder="Rua das Flores"
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Complemento</label>
                        <input
                          value={shippingAddress.complemento}
                          onChange={e => setShippingAddress(prev => ({ ...prev, complemento: e.target.value }))}
                          placeholder="Apto 3, Bloco B"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Bairro *</label>
                        <input
                          value={shippingAddress.bairro}
                          onChange={e => setShippingAddress(prev => ({ ...prev, bairro: e.target.value }))}
                          placeholder="Centro"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Cidade *</label>
                        <input
                          value={shippingAddress.cidade}
                          onChange={e => setShippingAddress(prev => ({ ...prev, cidade: e.target.value }))}
                          placeholder="Uberlândia"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Estado *</label>
                        <input
                          value={shippingAddress.estado}
                          onChange={e => setShippingAddress(prev => ({ ...prev, estado: e.target.value }))}
                          placeholder="MG"
                          maxLength={2}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Freight options */}
                    {freightLoading && (
                      <div className="flex items-center gap-2 py-3">
                        <div className="w-4 h-4 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-zinc-400">Calculando frete...</span>
                      </div>
                    )}
                    {!freightLoading && freightOptions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">🚚 Selecione o Frete</p>
                        {freightOptions.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedFreight(opt)}
                            className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${selectedFreight?.id === opt.id ? 'border-[#EDAC02] bg-[#EDAC02]/5' : 'border-[#262626] hover:border-zinc-600'}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedFreight?.id === opt.id ? 'border-[#EDAC02]' : 'border-zinc-600'}`}>
                                {selectedFreight?.id === opt.id && <span className="w-2 h-2 rounded-full bg-[#EDAC02]" />}
                              </span>
                              <div>
                                <p className="text-sm font-bold text-white">{opt.name}</p>
                                <p className="text-xs text-zinc-500">{opt.company} · {opt.delivery_time} dias úteis</p>
                              </div>
                            </div>
                            <span className="text-sm font-black text-[#EDAC02] whitespace-nowrap ml-2">+ {opt.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Training Photo Upload */}
                <div>
                  <label className={labelClass}>Foto Treinando <span className="text-zinc-600 normal-case">(para post CONFIRMED — opcional)</span></label>
                  {athlete.photo_url ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#262626] group mt-1">
                      <img src={athlete.photo_url} alt="Foto treinando" className="w-full h-full object-cover" />
                      <button onClick={() => updateAthlete(idx, 'photo_url', '')} className="absolute top-2 right-2 p-2 bg-black/80 hover:bg-red-500 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 text-xs font-bold">Trocar</button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed ${photoUploading === idx ? 'border-[#EDAC02] opacity-70' : 'border-[#262626] hover:border-[#EDAC02]'} rounded-xl cursor-pointer bg-[#050505] transition-colors mt-1`}>
                      {photoUploading === idx ? (
                        <span className="text-sm font-bold text-[#EDAC02] animate-pulse">Enviando foto...</span>
                      ) : (
                        <>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                          <span className="text-xs font-bold text-zinc-500">Enviar foto JPG/PNG</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={e => handlePhotoUpload(idx, e)} disabled={photoUploading !== null} />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 2: Review */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 space-y-3">
              <p className="text-xs font-bold text-[#EDAC02] uppercase tracking-wider">Resumo</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-400">Categoria</span><span className="text-white font-bold">{selectedCategory?.name}</span></div>
                {isTeam && <div className="flex justify-between"><span className="text-zinc-400">Equipe</span><span className="text-white font-bold">{teamName||'—'}</span></div>}
                {selectedKit && <div className="flex justify-between"><span className="text-zinc-400">Kit</span><span className="text-white">{selectedKit.name}</span></div>}
                <div className="border-t border-[#1a1a1a] my-2" />
                {athletes.map((a, i) => (
                  <div key={i} className="space-y-1">
                    {isTeam && <p className="text-[10px] font-black text-[#EDAC02] uppercase tracking-widest mt-2">Atleta {i + 1}</p>}
                    <div className="flex justify-between"><span className="text-zinc-400">Nome</span><span className="text-white font-bold truncate ml-4">{a.name}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Email</span><span className="text-white truncate ml-4">{a.email}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">WhatsApp</span><span className="text-white">{a.phone}</span></div>
                    {a.instagram && <div className="flex justify-between"><span className="text-zinc-400">Instagram</span><span className="text-white">{a.instagram}</span></div>}
                    <div className="flex justify-between"><span className="text-zinc-400">Local de Treino</span><span className="text-white truncate ml-4">{a.gym}</span></div>
                    {a.shirt_size && <div className="flex justify-between"><span className="text-zinc-400">Camisa</span><span className="text-white">{a.shirt_size}</span></div>}
                    {a.photo_url && <div className="flex justify-between items-center"><span className="text-zinc-400">Foto</span><span className="text-green-400 text-xs">✅ Enviada</span></div>}
                  </div>
                ))}
                {event?.slug === 'selecao' && selectedFreight && (
                  <>
                    <div className="border-t border-[#1a1a1a] my-2" />
                    <div className="flex justify-between items-start"><span className="text-zinc-400 shrink-0">Endereço</span><span className="text-white text-xs text-right ml-4">{shippingAddress.rua}, {shippingAddress.numero}{shippingAddress.complemento ? ` — ${shippingAddress.complemento}` : ''}<br />{shippingAddress.bairro}, {shippingAddress.cidade}/{shippingAddress.estado} · {shippingAddress.cep}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Frete</span><span className="text-white">{selectedFreight.name} · {selectedFreight.delivery_time} dias úteis</span></div>
                  </>
                )}
              </div>
            </div>
            {!isEventFull && paymentType !== 'installments' && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">🏷️ Cupom</p>
                <div className="flex gap-2">
                  <input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="CODIGO" className={`flex-1 ${inputClass} font-mono uppercase`} />
                  <button onClick={handleApplyCoupon} className="px-4 py-3 bg-[#111] border border-[#262626] rounded-lg text-sm font-bold text-white hover:border-[#EDAC02]/50 transition-colors">Aplicar</button>
                </div>
                {couponDiscount && <div className="mt-2 flex items-center gap-2 text-green-400 text-xs"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg><span>Cupom <strong>{couponDiscount.code}</strong> aplicado!</span></div>}
              </div>
            )}
            {!isEventFull && (
              <div className="bg-[#0a0a0a] border border-[#EDAC02]/20 rounded-xl p-5">
                <p className="text-xs font-bold text-[#EDAC02] uppercase tracking-wider mb-3">💰 Valor da Inscrição</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-400">Inscrição ({paymentType === 'installments' ? 'Parcelado' : 'PIX'})</span><span className="text-white">{formatCurrency(basePrice)}</span></div>
                  {kitPrice > 0 && <div className="flex justify-between"><span className="text-zinc-400">Kit</span><span className="text-white">+ {formatCurrency(kitPrice)}</span></div>}
                  {discount > 0 && <div className="flex justify-between"><span className="text-green-400">Desconto</span><span className="text-green-400">- {formatCurrency(discount)}</span></div>}
                  {freightAmount > 0 && selectedFreight && <div className="flex justify-between"><span className="text-zinc-400">Frete ({selectedFreight.name})</span><span className="text-white">+ {formatCurrency(freightAmount)}</span></div>}
                  <div className="border-t border-[#1a1a1a] pt-2 mt-2 flex justify-between"><span className="text-white font-bold">Total</span><span className="text-2xl font-black text-[#EDAC02]">{formatCurrency(totalPrice)}</span></div>
                </div>
              </div>
            )}

            {/* Installment Payment Option */}
            {pixInstallmentsAvailable && totalPrice > 0 && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-5 pt-5 pb-3">💳 Forma de Pagamento</p>
                <div className="px-5 pb-3 space-y-2">
                  <button type="button" onClick={() => setPaymentType('full')}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${paymentType === 'full' ? 'border-[#EDAC02] bg-[#EDAC02]/5' : 'border-[#262626] hover:border-zinc-600'}`}>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentType === 'full' ? 'border-[#EDAC02]' : 'border-zinc-600'}`}>
                      {paymentType === 'full' && <span className="w-2 h-2 rounded-full bg-[#EDAC02]" />}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">PIX À Vista</p>
                      <p className="text-xs text-zinc-500">{formatCurrency(Math.max(0, basePricePix + kitPrice - discount))}</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => { setPaymentType('installments'); setCouponCode(''); setCouponDiscount(null as any); }}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${paymentType === 'installments' ? 'border-[#EDAC02] bg-[#EDAC02]/5' : 'border-[#262626] hover:border-zinc-600'}`}>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentType === 'installments' ? 'border-[#EDAC02]' : 'border-zinc-600'}`}>
                      {paymentType === 'installments' && <span className="w-2 h-2 rounded-full bg-[#EDAC02]" />}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">PIX Parcelado</p>
                      <p className="text-xs text-zinc-500">{formatCurrency(totalPriceInstallmentsNoDiscount)} — 2x de {formatCurrency(calcInstallmentAmounts(totalPriceInstallmentsNoDiscount, 2)[0])} ou 3x de {formatCurrency(calcInstallmentAmounts(totalPriceInstallmentsNoDiscount, 3)[0])}</p>
                      <p className="text-[10px] text-red-400/60 mt-0.5">⚠️ Cupons não se aplicam ao parcelado</p>
                    </div>
                  </button>

                  {/* Cartão option */}
                  {formActiveBatch?.payment_link && (
                    <button type="button" onClick={() => setPaymentType('card')}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${paymentType === 'card' ? 'border-[#EDAC02] bg-[#EDAC02]/5' : 'border-[#262626] hover:border-zinc-600'}`}>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentType === 'card' ? 'border-[#EDAC02]' : 'border-zinc-600'}`}>
                        {paymentType === 'card' && <span className="w-2 h-2 rounded-full bg-[#EDAC02]" />}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">💳 Cartão</p>
                        <p className="text-xs text-zinc-500">{formatCurrency(totalPriceCard)} — via link de pagamento</p>
                      </div>
                    </button>
                  )}
                </div>

                {paymentType === 'installments' && (
                  <div className="px-5 pb-5 pt-2 border-t border-[#1a1a1a] space-y-4">
                    {/* Installment count selector */}
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Nº de Parcelas</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => { setInstallmentCount(2); setInstallmentDate3(''); }}
                          className={`p-3 rounded-lg border text-center transition-all ${installmentCount === 2 ? 'border-[#EDAC02] bg-[#EDAC02]/10 text-white' : 'border-[#262626] text-zinc-400 hover:border-zinc-600'}`}>
                          <p className="text-sm font-black">2x</p>
                          <p className="text-xs text-zinc-500">{formatCurrency(calcInstallmentAmounts(totalPrice, 2)[0])}</p>
                        </button>
                        <button type="button" onClick={() => setInstallmentCount(3)}
                          className={`p-3 rounded-lg border text-center transition-all ${installmentCount === 3 ? 'border-[#EDAC02] bg-[#EDAC02]/10 text-white' : 'border-[#262626] text-zinc-400 hover:border-zinc-600'}`}>
                          <p className="text-sm font-black">3x</p>
                          <p className="text-xs text-zinc-500">{formatCurrency(calcInstallmentAmounts(totalPrice, 3)[0])}</p>
                        </button>
                      </div>
                    </div>

                    {/* Installment schedule */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">📅 Cronograma</p>
                      {/* 1st - today */}
                      <div className="flex items-center gap-3 p-3 bg-[#111] rounded-lg border border-[#262626]">
                        <span className="text-xs font-black text-[#EDAC02] w-6">1ª</span>
                        <span className="text-sm text-white font-bold flex-1">{formatCurrency(installmentAmounts[0] || 0)}</span>
                        <span className="text-xs text-zinc-500 flex items-center gap-1">🔒 Hoje</span>
                      </div>
                      {/* 2nd */}
                      <div className="flex items-center gap-3 p-3 bg-[#050505] rounded-lg border border-[#262626]">
                        <span className="text-xs font-black text-[#EDAC02] w-6">2ª</span>
                        <span className="text-sm text-white font-bold flex-1">{formatCurrency(installmentAmounts[1] || 0)}</span>
                        <input type="date" value={installmentDate2} onChange={e => setInstallmentDate2(e.target.value)} min={tomorrowStr} max={maxInstallmentDateStr}
                          className="bg-[#111] border border-[#262626] rounded-lg px-2 py-1.5 text-xs text-white focus:border-[#EDAC02] focus:outline-none" />
                      </div>
                      {/* 3rd (if 3x) */}
                      {installmentCount === 3 && (
                        <div className="flex items-center gap-3 p-3 bg-[#050505] rounded-lg border border-[#262626]">
                          <span className="text-xs font-black text-[#EDAC02] w-6">3ª</span>
                          <span className="text-sm text-white font-bold flex-1">{formatCurrency(installmentAmounts[2] || 0)}</span>
                          <input type="date" value={installmentDate3} onChange={e => setInstallmentDate3(e.target.value)} min={installmentDate2 || tomorrowStr} max={maxInstallmentDateStr}
                            className="bg-[#111] border border-[#262626] rounded-lg px-2 py-1.5 text-xs text-white focus:border-[#EDAC02] focus:outline-none" />
                        </div>
                      )}
                    </div>

                    {maxInstallmentDate && (
                      <>
                        <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                          <span className="text-amber-400 text-xs mt-0.5">⚠️</span>
                          <p className="text-[11px] text-amber-400/80">Todas as parcelas devem ser quitadas até <strong className="text-amber-400">{maxInstallmentDate.toLocaleDateString('pt-BR')}</strong> (10 dias antes do evento).</p>
                        </div>
                        <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                          <span className="text-red-400 text-xs mt-0.5">🚨</span>
                          <p className="text-[11px] text-red-400/80">Em caso de não quitação das parcelas, será realizada <strong className="text-red-400">devolução de 50%</strong> do valor pago até o momento.</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {isEventFull && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 text-center">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">📋 Lista de Espera</p>
                <p className="text-sm text-zinc-400">Nenhum pagamento é necessário. Você será contatado se uma vaga abrir.</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3.5 border border-[#262626] rounded-xl text-zinc-400 font-bold hover:bg-[#111] transition-colors">← Voltar</button>}
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()} className="flex-1 py-3.5 bg-[#EDAC02] text-black font-black rounded-xl hover:bg-[#d49b02] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Continuar →</button>
          ) : (() => {
            const installmentDatesValid = paymentType !== 'installments' || (
              installmentDate2 && (installmentCount === 2 || installmentDate3)
            );
            const isDisabled = submitting || (paymentType === 'installments' && !installmentDatesValid);
            const btnLabel = isEventFull ? '📋 Entrar na Lista de Espera' : (paymentType === 'installments' ? `💳 Confirmar ${installmentCount}x de ${formatCurrency(installmentAmounts[0] || 0)}` : '✅ Confirmar Inscrição');
            return (
              <button onClick={handleSubmit} disabled={isDisabled} className={`flex-1 py-3.5 font-black rounded-xl transition-colors disabled:opacity-50 ${isEventFull ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-[#EDAC02] text-black hover:bg-[#d49b02]'}`}>
                {submitting ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Processando...</span> : btnLabel}
              </button>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
