import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useHeats, useEventStages, useLaneAssignments } from '@/hooks/useEventConfig';

export default function PublicEventSchedule() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function resolveEvent() {
      setLoading(true);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id!);
      let evData: any = null;
      if (isUUID) {
        const { data } = await supabase.from('events').select('*').eq('id', id!).single();
        evData = data;
      } else {
        const { data } = await (supabase as any).from('events').select('*').eq('slug', id!).single();
        evData = data;
      }
      setEvent(evData);
      setResolvedId(evData?.id || null);
      setLoading(false);
    }
    resolveEvent();
  }, [id]);

  const { data: heats, isLoading: heatsLoading } = useHeats(resolvedId || undefined, { refetchInterval: 30000 });
  const { data: stages } = useEventStages(resolvedId || undefined);

  const [catStats, setCatStats] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    if (!resolvedId) return;
    async function fetchCatStats() {
      const { data } = await (supabase as any)
        .from('heats')
        .select('categories(name), heat_lane_assignments(registration_id, registrations(status))')
        .eq('event_id', resolvedId);
      const acc: Record<string, number> = {};
      for (const h of data || []) {
        const cat = (h.categories as any)?.name || 'Sem categoria';
        const count = (h.heat_lane_assignments || []).filter((a: any) => a.registration_id && a.registrations?.status !== 'cancelled').length;
        acc[cat] = (acc[cat] || 0) + count;
      }
      setCatStats(Object.entries(acc).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    }
    fetchCatStats();
  }, [resolvedId]);

  if (loading || (resolvedId && heatsLoading)) {
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
          <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">Evento não encontrado</h1>
          <Link to="/" className="inline-block mt-6 px-6 py-3 bg-[#EDAC02] text-black font-black uppercase tracking-widest text-sm">← Voltar</Link>
        </div>
      </div>
    );
  }

  // Build timeline items
  const formatTime = (iso: string | null | undefined): string => {
    if (!iso) return '??:??';
    try {
      return new Date(iso).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });
    } catch {
      return iso;
    }
  };

  const timelineItems = (heats || []).map((h: any) => ({
    id: h.id,
    time: h.start_time,
    timeLabel: formatTime(h.start_time),
    title: h.title,
    category: (h.categories as any)?.name || '',
    status: h.status,
    lanes: h.lane_count,
  })).sort((a: any, b: any) => (a.time ?? '').localeCompare(b.time ?? ''));

  const timeGroups: Record<string, typeof timelineItems> = {};
  timelineItems.forEach((item: any) => {
    const key = item.timeLabel;
    if (!timeGroups[key]) timeGroups[key] = [];
    timeGroups[key].push(item);
  });



  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="relative bg-[#0a0a0a] border-b border-[#1a1a1a] py-12 px-4 overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#EDAC02] opacity-5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <Link to={`/evento/${id}`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Voltar ao Evento
          </Link>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-2">
            Cronograma de <span className="text-[#EDAC02]">Provas</span>
          </h1>
          <p className="text-zinc-400 text-lg mb-4">{event.title}</p>
          {catStats.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {catStats.map(s => (
                <span key={s.name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111] border border-[#2a2a2a] text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  <span className="text-[#EDAC02] font-black text-sm">{s.count}</span>
                  {s.name}
                </span>
              ))}
              <span className="text-xs text-zinc-600 font-bold uppercase tracking-wider pl-1">
                · Total: {catStats.reduce((s, c) => s + c.count, 0)} inscritos
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        




        {/* Timeline */}
        {Object.keys(timeGroups).length > 0 ? (
          <div className="space-y-12 pl-2">
              {Object.entries(timeGroups).map(([time, items]) => (
                <div key={time} className="relative">
                  <div className="mb-5">
                    <span className="inline-block text-3xl md:text-5xl font-black text-white font-mono tracking-tight bg-[#0f0f0f] px-5 py-3 rounded-2xl border border-[#262626]">{time}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {(items as any).map((item: any) => (
                      <div key={item.id} className="bg-[#0a0a0a] border border-[#EDAC02]/40 p-6 md:p-8 rounded-2xl">
                        <h3 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tight mb-6">{item.title}</h3>
                        <PublicHeatLanes heatId={item.id} laneCount={item.lanes} category={item.category} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl">
            <p className="text-4xl mb-4">⏱️</p>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Cronograma em Breve</h3>
            <p className="text-zinc-500">As baterias ainda não foram publicadas pelo organizador.</p>
          </div>
        )}
      </main>
      
      <footer className="py-8 border-t border-[#1a1a1a] text-center bg-[#050505] mt-12">
        <Link to="/" className="inline-block mb-4">
          <img 
            src="/logo-uairox.webp" 
            alt="UAIROX" 
            className="w-[120px] h-auto object-contain mx-auto"
            loading="lazy"
          />
        </Link>
        <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">UAIROX © {new Date().getFullYear()} • Cronograma Oficial</p>
      </footer>
    </div>
  );
}

function PublicHeatLanes({ heatId, laneCount, category }: { heatId: string; laneCount: number; category?: string }) {
  const { data: lanes, isLoading } = useLaneAssignments(heatId, { refetchInterval: 30000 });

  if (isLoading) return <div className="text-center py-6"><div className="w-6 h-6 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  // Usa as raias reais; se ainda não houver, mostra raias vazias pelo lane_count.
  const cells = (lanes && lanes.length > 0)
    ? lanes
    : Array.from({ length: laneCount || 0 }, (_, i) => ({ id: `empty-${i}`, lane_number: i + 1, registration_id: null }));

  const n = cells.length;
  const cols = n <= 2 ? 'grid-cols-2'
    : n === 3 ? 'grid-cols-3'
    : n <= 4 ? 'grid-cols-2 sm:grid-cols-4'
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={`grid ${cols} gap-3 md:gap-4`}>
      {cells.map((lane: any) => {
        const reg = lane.registrations as any;
        // Cancelado/excluído some: a raia fica vazia ("—").
        const hasAthlete = !!lane.registration_id && !!reg && reg.status !== 'cancelled';
        // Categoria e nome vêm da PRÓPRIA inscrição (a bateria pode misturar categorias).
        const regCat = reg?.categories?.name || category;
        const isTeam = (reg?.categories?.team_size ?? 1) > 1;
        const displayName = isTeam ? (reg?.team_name || 'Sem Equipe') : (reg?.athlete_name || '?');
        return (
          <div key={lane.id} className={`rounded-xl px-3 py-5 text-center border ${
            hasAthlete ? 'bg-[#16130b] border-[#EDAC02]/20' : 'bg-[#111] border-[#262626]'
          }`}>
            <p className="text-sm md:text-base text-zinc-500 uppercase font-bold tracking-wide">Raia {lane.lane_number}</p>
            {hasAthlete ? (
              <>
                {regCat && <p className="text-xs md:text-sm text-white uppercase font-bold mt-1 leading-tight break-words">{regCat}</p>}
                <p className="text-2xl md:text-3xl font-black text-[#EDAC02] mt-4 leading-none">#{reg?.bib_number || '?'}</p>
                <p className="text-base md:text-xl text-white uppercase font-black mt-1.5 break-words leading-tight" title={displayName}>
                  {displayName}
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-zinc-600 mt-6">—</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
