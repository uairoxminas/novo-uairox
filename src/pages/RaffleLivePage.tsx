import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type DrawPhase = "idle" | "countdown" | "rolling";

export default function RaffleLivePage() {
  const { slug } = useParams<{ slug: string }>();

  const [event, setEvent] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [latestWinner, setLatestWinner] = useState<any>(null);
  const [showLatest, setShowLatest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawPhase, setDrawPhase] = useState<DrawPhase>("idle");
  const [drawCountdown, setDrawCountdown] = useState(5);
  const [drawPrize, setDrawPrize] = useState("");
  const [rollingNum, setRollingNum] = useState(1);
  const rollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Realtime subscription
  useEffect(() => {
    if (!event?.id) return;
    const channel = db
      .channel(`raffle-live-${event.id}`)
      // Live draw broadcast from admin
      .on("broadcast", { event: "draw" }, ({ payload }: any) => {
        if (payload.type === "COUNTDOWN") {
          setDrawPhase("countdown");
          setDrawCountdown(payload.count);
          setDrawPrize(payload.prize ?? "");
        } else if (payload.type === "ROLLING") {
          setDrawPhase("rolling");
          setDrawPrize(payload.prize ?? "");
          if (rollingRef.current) clearInterval(rollingRef.current);
          rollingRef.current = setInterval(() => {
            setRollingNum(n => Math.floor(Math.random() * 999) + 1);
          }, 80);
        } else if (payload.type === "DONE") {
          if (rollingRef.current) { clearInterval(rollingRef.current); rollingRef.current = null; }
          setDrawPhase("idle");
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "raffle_winners",
        filter: `event_id=eq.${event.id}`,
      }, async (payload: any) => {
        const { data } = await db
          .from("raffle_winners")
          .select("*, raffle_tickets(*)")
          .eq("id", payload.new.id)
          .single();
        if (data) {
          setWinners(prev => [...prev, data].sort((a, b) => a.draw_order - b.draw_order));
          setLatestWinner(data);
          setShowLatest(true);
          setDrawPhase("idle");
          setTimeout(() => setShowLatest(false), 12000);
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

    return () => {
      if (rollingRef.current) clearInterval(rollingRef.current);
      db.removeChannel(channel);
    };
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

      {/* ── Live draw overlays ─────────────────────────────── */}
      <AnimatePresence>
        {drawPhase === "countdown" && (
          <motion.div
            key="countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/97 flex flex-col items-center justify-center"
          >
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-6">SORTEIO EM</p>
            <AnimatePresence mode="wait">
              <motion.span
                key={drawCountdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-[14rem] font-black text-[#EDAC02] leading-none tabular-nums"
              >
                {drawCountdown}
              </motion.span>
            </AnimatePresence>
            <p className="text-xl font-bold text-white mt-4">{drawPrize}</p>
          </motion.div>
        )}

        {drawPhase === "rolling" && (
          <motion.div
            key="rolling-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/97 flex flex-col items-center justify-center gap-8"
          >
            <p className="text-xs text-zinc-500 uppercase tracking-widest">SORTEANDO</p>
            <div className="relative">
              <div className="w-64 h-64 rounded-3xl bg-[#0a0a0a] border-2 border-[#EDAC02]/30 flex items-center justify-center shadow-[0_0_80px_rgba(237,172,2,0.2)]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={rollingNum}
                    initial={{ opacity: 0, y: -20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    transition={{ duration: 0.05 }}
                    className="font-black text-8xl text-[#EDAC02] tabular-nums"
                  >
                    {String(rollingNum).padStart(3, "0")}
                  </motion.span>
                </AnimatePresence>
              </div>
              <motion.div
                className="absolute inset-0 rounded-3xl border-2 border-[#EDAC02]"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            </div>
            <p className="text-lg font-bold text-zinc-400">{drawPrize}</p>
          </motion.div>
        )}

        {showLatest && latestWinner && drawPhase === "idle" && (
          <motion.div
            key="winner-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/97 flex flex-col items-center justify-center gap-6 px-6"
            onClick={() => setShowLatest(false)}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="text-8xl"
            >
              🎉
            </motion.span>
            <p className="text-xs text-zinc-400 uppercase tracking-widest">VENCEDOR!</p>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-44 h-44 rounded-3xl bg-[#EDAC02] flex items-center justify-center shadow-[0_0_80px_rgba(237,172,2,0.6)]"
            >
              <span className="font-black text-7xl text-black tabular-nums">
                {String(latestWinner.raffle_tickets.ticket_number).padStart(3, "0")}
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-center space-y-2"
            >
              <p className="text-xs text-zinc-500">
                {typeIcon(latestWinner.raffle_tickets.participant_type)} {typeLabel(latestWinner.raffle_tickets.participant_type)}
              </p>
              <p className="text-4xl font-black text-white">{latestWinner.raffle_tickets.participant_name}</p>
              {latestWinner.prize_description && (
                <p className="text-base text-[#EDAC02] font-bold">🏆 {latestWinner.prize_description}</p>
              )}
            </motion.div>
            <p className="text-[10px] text-zinc-600 mt-4">Toque para fechar</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-8">

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
