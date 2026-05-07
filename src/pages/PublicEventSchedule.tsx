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

  const { data: heats, isLoading: heatsLoading } = useHeats(resolvedId || undefined);
  const { data: stages } = useEventStages(resolvedId || undefined);

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
  const timelineItems = (heats || []).map((h: any) => ({
    id: h.id,
    time: h.start_time,
    title: h.title,
    category: (h.categories as any)?.name || '',
    status: h.status,
    lanes: h.lane_count,
  })).sort((a: any, b: any) => a.time.localeCompare(b.time));

  const timeGroups: Record<string, typeof timelineItems> = {};
  timelineItems.forEach((item: any) => {
    if (!timeGroups[item.time]) timeGroups[item.time] = [];
    timeGroups[item.time].push(item);
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
          <p className="text-zinc-400 text-lg">{event.title}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        


        {/* Legend */}
        <div className="flex gap-6 flex-wrap mb-10 pb-6 border-b border-[#1a1a1a]">
          {Object.entries(statusLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${statusColors[key]}`} />
              <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">{label}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        {Object.keys(timeGroups).length > 0 ? (
          <div className="space-y-12 pl-2">
              {Object.entries(timeGroups).map(([time, items]) => (
                <div key={time} className="relative">
                  <div className="mb-4">
                    <span className="text-xl md:text-2xl font-black text-white font-mono tracking-tight bg-[#111] px-3 py-1 rounded border border-[#262626] inline-block">{time}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(items as any).map((item: any) => (
                      <div key={item.id} className="bg-[#0a0a0a] border border-[#EDAC02]/40 p-5 rounded-xl">
                        <div className="flex flex-col">
                          <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight">{item.title}</h3>
                          
                          <PublicHeatLanes heatId={item.id} laneCount={item.lanes} />
                        </div>
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

function PublicHeatLanes({ heatId, laneCount }: { heatId: string; laneCount: number }) {
  const { data: lanes, isLoading } = useLaneAssignments(heatId);

  if (isLoading) return <div className="pt-4 mt-4 border-t border-[#1a1a1a] text-center"><div className="w-5 h-5 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="pt-4 mt-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(lanes && lanes.length > 0) ? lanes.map((lane: any) => {
          const hasAthlete = !!lane.registration_id;
          const reg = lane.registrations as any;
          const displayName = reg?.team_name || reg?.athlete_name || '?';
          return (
            <div key={lane.id} className={`rounded p-2 text-center border ${
              hasAthlete
                ? 'bg-[#EDAC02]/10 border-[#EDAC02]/20'
                : 'bg-[#111] border-[#262626]'
            }`}>
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Raia {lane.lane_number}</p>
              {hasAthlete ? (
                <>
                  <p className="text-[11px] font-black text-[#EDAC02] leading-none mb-0.5">#{reg?.bib_number || '?'}</p>
                  <p className="text-[10px] text-white uppercase font-bold px-1 break-words leading-tight" title={displayName}>
                    {displayName}
                  </p>
                </>
              ) : (
                <p className="text-xs font-bold text-zinc-600">—</p>
              )}
            </div>
          );
        }) : (
          Array.from({ length: laneCount }, (_, i) => (
            <div key={i} className="rounded p-2 text-center border border-[#262626] bg-[#111]">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Raia {i + 1}</p>
              <p className="text-xs font-bold text-zinc-600">—</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
