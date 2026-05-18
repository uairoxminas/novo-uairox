import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export default function RaffleLivePage() {
  const { slug } = useParams<{ slug: string }>();

  const [event, setEvent] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [latestWinner, setLatestWinner] = useState<any>(null);
  const [showLatest, setShowLatest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initial data load
  useEffect(() => {
    if (!slug) return;
    async function load() {
      setLoading(true);
      const isUUID = /^[0-9a-f-]{36}$/i.test(slug!);
      const evRes = isUUID
        ? await db.from("events").select("*").eq("id", slug).single()
        : await db.from("events").select("*").eq("slug", slug).single();

      if (!evRes.data) { setLoading(false); return; }
      const ev = evRes.data;
      setEvent(ev);

      const [cfgRes, tickRes, winRes] = await Promise.all([
        db.from("raffle_configs").select("*").eq("event_id", ev.id).maybeSingle(),
        db.from("raffle_tickets").select("*").eq("event_id", ev.id).order("ticket_number"),
        db.from("raffle_winners").select("*, raffle_tickets(*)").eq("event_id", ev.id).order("draw_order"),
      ]);

      setConfig(cfgRes.data);
      setTickets(tickRes.data ?? []);
      setWinners(winRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [slug]);

  // Realtime subscription on raffle_winners
  useEffect(() => {
    if (!event?.id) return;
    const channel = db
      .channel(`raffle-live-${event.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "raffle_winners",
        filter: `event_id=eq.${event.id}`,
      }, async (payload: any) => {
        // Fetch full winner with ticket info
        const { data } = await db
          .from("raffle_winners")
          .select("*, raffle_tickets(*)")
          .eq("id", payload.new.id)
          .single();
        if (data) {
          setWinners(prev => [...prev, data].sort((a, b) => a.draw_order - b.draw_order));
          setLatestWinner(data);
          setShowLatest(true);
          setTimeout(() => setShowLatest(false), 8000);
        }
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "raffle_winners",
        filter: `event_id=eq.${event.id}`,
      }, (payload: any) => {
        setWinners(prev => prev.filter(w => w.id !== payload.old.id));
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "raffle_configs",
        filter: `event_id=eq.${event.id}`,
      }, (payload: any) => {
        setConfig(payload.new);
      })
      .subscribe();

    return () => db.removeChannel(channel);
  }, [event?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event || !config?.is_live) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center p-6">
        <span className="text-6xl">🎰</span>
        <h1 className="text-2xl font-black text-white">Sorteio não disponível</h1>
        <p className="text-zinc-500 text-sm">Este sorteio ainda não foi ativado ou o evento não existe.</p>
      </div>
    );
  }

  const drawnIds = new Set(winners.map(w => w.raffle_ticket_id));
  const athleteTickets = tickets.filter(t => t.participant_type === "athlete");
  const squadTickets = tickets.filter(t => t.participant_type === "squad");
  const locationTickets = tickets.filter(t => t.participant_type === "location");
  const prizes: { description: string }[] = config.prizes ?? [];

  const typeIcon = (type: string) =>
    type === "athlete" ? "🏃" : type === "squad" ? "👤" : "📍";

  const typeLabel = (type: string) =>
    type === "athlete" ? "Atleta" : type === "squad" ? "Squad UAIROX" : "Parceiro";

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#EDAC02]/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#EDAC02] uppercase tracking-widest font-bold">Sorteio ao Vivo</p>
          <h1 className="text-lg font-black text-white">{event.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-400 font-bold uppercase tracking-wide">AO VIVO</span>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Atletas", count: athleteTickets.length, color: "text-blue-400" },
            { label: "Squad", count: squadTickets.length, color: "text-purple-400" },
            { label: "Parceiros", count: locationTickets.length, color: "text-cyan-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label} tickets</p>
            </div>
          ))}
        </div>

        {/* Latest winner overlay */}
        <AnimatePresence>
          {showLatest && latestWinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-[#0a0a0a] border-2 border-[#EDAC02] rounded-2xl p-8 text-center shadow-[0_0_60px_rgba(237,172,2,0.3)]"
            >
              <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">🎉 NOVO VENCEDOR!</p>
              <p className="text-5xl font-black text-[#EDAC02] mb-3">
                #{String(latestWinner.raffle_tickets.ticket_number).padStart(3, "0")}
              </p>
              <p className="text-xs text-zinc-500 mb-1">
                {typeIcon(latestWinner.raffle_tickets.participant_type)} {typeLabel(latestWinner.raffle_tickets.participant_type)}
              </p>
              <p className="text-3xl font-black text-white">{latestWinner.raffle_tickets.participant_name}</p>
              {latestWinner.prize_description && (
                <p className="text-sm text-[#EDAC02] mt-3 font-bold">🏆 {latestWinner.prize_description}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prizes list */}
        {prizes.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Prêmios</h2>
            <div className="space-y-2">
              {prizes.map((p, i) => {
                const w = winners[i];
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${w ? "border-[#EDAC02]/20 bg-[#EDAC02]/5" : "border-white/5 bg-white/3"}`}>
                    <span className={`text-lg font-black w-6 ${w ? "text-[#EDAC02]" : "text-zinc-600"}`}>{i + 1}°</span>
                    <span className={`flex-1 text-sm ${w ? "text-white font-bold" : "text-zinc-500"}`}>{p.description}</span>
                    {w && (
                      <span className="text-xs text-[#EDAC02] font-bold">
                        {typeIcon(w.raffle_tickets.participant_type)} {w.raffle_tickets.participant_name}
                      </span>
                    )}
                    {!w && <span className="text-[10px] text-zinc-600 italic">Aguardando...</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Winners board */}
        {winners.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Sorteados</h2>
            <div className="space-y-2">
              {winners.map(w => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 bg-[#0a0a0a] border border-[#EDAC02]/20 rounded-xl px-4 py-3"
                >
                  <span className="text-xl font-black text-[#EDAC02] w-8">#{w.draw_order}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">
                      {typeIcon(w.raffle_tickets.participant_type)} {w.raffle_tickets.participant_name}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Ticket #{String(w.raffle_tickets.ticket_number).padStart(3, "0")}
                      {w.prize_description && ` · ${w.prize_description}`}
                    </p>
                  </div>
                  <span className="text-lg">🏆</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Ticket list (optional) */}
        {config.show_ticket_list && tickets.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
              Todos os Tickets ({tickets.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
              {tickets.map(t => {
                const won = drawnIds.has(t.id);
                return (
                  <div key={t.id} className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${won ? "border-[#EDAC02]/30 bg-[#EDAC02]/5" : "border-white/5 bg-white/3"}`}>
                    <span className={`font-black ${won ? "text-[#EDAC02]" : "text-zinc-600"}`}>
                      #{String(t.ticket_number).padStart(3, "0")}
                    </span>
                    <span className={`truncate ${won ? "text-white" : "text-zinc-500"}`}>{t.participant_name}</span>
                    {won && <span className="ml-auto">🏆</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-4 text-center">
        <p className="text-[10px] text-zinc-700 font-bold tracking-widest">UAIROX · SORTEIO OFICIAL</p>
      </footer>
    </div>
  );
}
