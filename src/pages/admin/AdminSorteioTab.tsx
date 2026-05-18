import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  useRaffleConfig, useUpsertRaffleConfig,
  useRaffleTickets, useGenerateTickets,
  useRaffleWinners, useDrawWinner, useDeleteRaffleWinner,
  type RaffleTicket, type RaffleWinner,
} from "@/hooks/useRaffle";
import { useEvent } from "@/hooks/useEvents";
import { toast } from "sonner";

const cardClass = "bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl";
const inputClass = "w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none transition-colors text-sm";
const labelClass = "block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5";
const btnGold = "px-4 py-2.5 bg-[#EDAC02] text-black font-black rounded-lg hover:bg-[#d49b02] transition-colors text-sm";
const btnOutline = "px-4 py-2.5 border border-[#262626] rounded-lg text-zinc-400 font-bold hover:bg-[#111] hover:border-zinc-500 transition-colors text-sm";

type ParticipantGroup = {
  name: string;
  type: "athlete" | "squad" | "location";
  tickets: RaffleTicket[];
};

function groupTickets(tickets: RaffleTicket[]): ParticipantGroup[] {
  const map = new Map<string, ParticipantGroup>();
  for (const t of tickets) {
    const key = `${t.participant_type}:${t.participant_name}`;
    if (!map.has(key)) {
      map.set(key, { name: t.participant_name || "—", type: t.participant_type, tickets: [] });
    }
    map.get(key)!.tickets.push(t);
  }
  return [...map.values()].sort((a, b) => b.tickets.length - a.tickets.length);
}

// ============ DRAW ANIMATION MODAL ============
function DrawModal({
  totalTickets,
  onDraw,
  onClose,
  prizeName,
}: {
  totalTickets: number;
  onDraw: () => Promise<RaffleWinner | undefined>;
  onClose: () => void;
  prizeName: string;
}) {
  const [phase, setPhase] = useState<"idle" | "rolling" | "winner">("idle");
  const [displayNum, setDisplayNum] = useState(1);
  const [winner, setWinner] = useState<RaffleWinner | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDraw = async () => {
    setPhase("rolling");
    let speed = 50;
    let elapsed = 0;
    const totalMs = 4000;

    intervalRef.current = setInterval(() => {
      elapsed += speed;
      setDisplayNum(Math.floor(Math.random() * totalTickets) + 1);
      if (elapsed > totalMs * 0.6) speed = 120;
      if (elapsed > totalMs * 0.85) speed = 260;
      if (elapsed >= totalMs) {
        clearInterval(intervalRef.current!);
        finalize();
      }
    }, speed);
  };

  const finalize = async () => {
    try {
      const result = await onDraw();
      if (result) {
        setWinner(result);
        setDisplayNum(result.raffle_tickets.ticket_number);
        setPhase("winner");
      }
    } catch {
      setPhase("idle");
    }
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const typeLabel = winner
    ? winner.raffle_tickets.participant_type === "athlete" ? "🏃 Atleta"
      : winner.raffle_tickets.participant_type === "squad" ? "👤 Squad UAIROX"
      : "📍 Parceiro"
    : "";

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-6" onClick={phase === "winner" ? onClose : undefined}>
      <div className="w-full max-w-lg flex flex-col items-center gap-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="text-center">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">SORTEIO AO VIVO</p>
          <h2 className="text-2xl font-black text-white">{prizeName || "Prêmio"}</h2>
        </div>

        {/* Ticket counter */}
        <div className="relative">
          <div className="w-64 h-64 rounded-3xl bg-[#0a0a0a] border-2 border-[#EDAC02]/30 flex items-center justify-center shadow-[0_0_60px_rgba(237,172,2,0.15)]">
            <AnimatePresence mode="wait">
              <motion.span
                key={displayNum}
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ duration: phase === "rolling" ? 0.05 : 0.3 }}
                className="font-black text-7xl text-[#EDAC02] tabular-nums"
              >
                {String(displayNum).padStart(3, "0")}
              </motion.span>
            </AnimatePresence>
          </div>
          {phase === "rolling" && (
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-[#EDAC02]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
          {phase === "winner" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-3 -right-3 w-10 h-10 bg-[#EDAC02] rounded-full flex items-center justify-center text-xl shadow-lg"
            >
              🏆
            </motion.div>
          )}
        </div>

        {/* Winner info */}
        <AnimatePresence>
          {phase === "winner" && winner && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center space-y-2"
            >
              <p className="text-xs text-zinc-500">{typeLabel}</p>
              <p className="text-3xl font-black text-white">{winner.raffle_tickets.participant_name}</p>
              {winner.raffle_tickets.participant_email && (
                <p className="text-sm text-zinc-400">{winner.raffle_tickets.participant_email}</p>
              )}
              <p className="text-xs text-[#EDAC02] font-bold mt-2">TICKET #{String(winner.raffle_tickets.ticket_number).padStart(3, "0")}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3">
          {phase === "idle" && (
            <>
              <button onClick={onClose} className={btnOutline}>Cancelar</button>
              <button onClick={startDraw} className={btnGold}>🎰 Iniciar Sorteio</button>
            </>
          )}
          {phase === "rolling" && (
            <p className="text-zinc-400 text-sm animate-pulse">Sorteando...</p>
          )}
          {phase === "winner" && (
            <button onClick={onClose} className={btnGold}>✓ Confirmar</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ MAIN TAB ============
export default function AdminSorteioTab({ eventId }: { eventId: string }) {
  const { data: event } = useEvent(eventId);
  const { data: config } = useRaffleConfig(eventId);
  const { data: tickets = [], isLoading: loadingTickets } = useRaffleTickets(eventId);
  const { data: winners = [], isLoading: loadingWinners } = useRaffleWinners(eventId);

  const upsertConfig = useUpsertRaffleConfig();
  const generateTickets = useGenerateTickets();
  const drawWinner = useDrawWinner();
  const deleteWinner = useDeleteRaffleWinner();

  // Prizes
  const [prizes, setPrizes] = useState<string[]>([]);
  const [newPrize, setNewPrize] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [showTicketList, setShowTicketList] = useState(true);
  const [configDirty, setConfigDirty] = useState(false);

  // Realtime for public page coordination
  useEffect(() => {
    if (!config) return;
    setPrizes((config.prizes || []).map((p: any) => p.description));
    setIsLive(config.is_live ?? false);
    setShowTicketList(config.show_ticket_list ?? true);
    setConfigDirty(false);
  }, [config]);

  // Drawing
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [selectedPrizeIdx, setSelectedPrizeIdx] = useState(0);

  // Supabase Realtime subscription (just for the admin to see updates)
  useEffect(() => {
    const channel = (supabase as any)
      .channel(`raffle-admin-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "raffle_winners", filter: `event_id=eq.${eventId}` }, () => {})
      .subscribe();
    return () => (supabase as any).removeChannel(channel);
  }, [eventId]);

  const handleSaveConfig = async () => {
    await upsertConfig.mutateAsync({
      event_id: eventId,
      prizes: prizes.map(p => ({ description: p })),
      is_live: isLive,
      show_ticket_list: showTicketList,
    });
    setConfigDirty(false);
    toast.success("Configuração salva!");
  };

  const addPrize = () => {
    if (!newPrize.trim()) return;
    setPrizes(prev => [...prev, newPrize.trim()]);
    setNewPrize("");
    setConfigDirty(true);
  };

  const removePrize = (i: number) => { setPrizes(prev => prev.filter((_, j) => j !== i)); setConfigDirty(true); };

  const handleDraw = async () => {
    const prize = prizes[selectedPrizeIdx] ?? "";
    const result = await drawWinner.mutateAsync({ eventId, prizeDescription: prize });
    return result;
  };

  const publicUrl = `${window.location.origin}/sorteio/${(event as any)?.slug || eventId}`;

  // Summary
  const athleteTickets = tickets.filter(t => t.participant_type === "athlete");
  const squadTickets = tickets.filter(t => t.participant_type === "squad");
  const locationTickets = tickets.filter(t => t.participant_type === "location");
  const drawnIds = new Set(winners.map(w => w.raffle_ticket_id));
  const remaining = tickets.filter(t => !drawnIds.has(t.id)).length;
  const groups = groupTickets(tickets);

  const nextPrize = prizes.find((_, i) => !winners.find(w => w.prize_description === prizes[i])) ?? prizes[0] ?? "Prêmio";

  return (
    <div className="space-y-6">
      {/* ── Configuração ──────────────────────────────── */}
      <div className={`${cardClass} p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Configuração do Sorteio</h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-zinc-400">Página pública ao vivo</span>
              <button
                onClick={() => { setIsLive(v => !v); setConfigDirty(true); }}
                className={`w-10 h-6 rounded-full transition-colors ${isLive ? "bg-green-500" : "bg-zinc-700"} relative`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isLive ? "left-5" : "left-1"}`} />
              </button>
            </label>
            {isLive && (
              <button
                onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado!"); }}
                className="text-[10px] px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/20 transition-colors"
              >
                🔗 Copiar Link
              </button>
            )}
          </div>
        </div>

        {/* Prizes */}
        <div>
          <label className={labelClass}>Prêmios (em ordem de sorteio)</label>
          <div className="space-y-2 mb-2">
            {prizes.map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2">
                <span className="text-xs text-[#EDAC02] font-black w-5">{i + 1}°</span>
                <span className="flex-1 text-sm text-white">{p}</span>
                {winners[i] && <span className="text-[10px] text-green-400 font-bold">✓ Sorteado</span>}
                {!winners[i] && <button onClick={() => removePrize(i)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>}
              </div>
            ))}
            {prizes.length === 0 && <p className="text-xs text-zinc-600 italic">Nenhum prêmio adicionado.</p>}
          </div>
          <div className="flex gap-2">
            <input
              value={newPrize}
              onChange={e => setNewPrize(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPrize()}
              placeholder="Ex: Camiseta UAIROX Exclusiva"
              className={`${inputClass} flex-1`}
            />
            <button onClick={addPrize} className={btnGold}>+ Adicionar</button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={showTicketList} onChange={e => { setShowTicketList(e.target.checked); setConfigDirty(true); }} className="accent-[#EDAC02]" />
            <span className="text-xs text-zinc-400">Mostrar lista de participantes na página pública</span>
          </label>
        </div>

        {configDirty && (
          <button onClick={handleSaveConfig} disabled={upsertConfig.isPending} className={`${btnGold} w-full`}>
            {upsertConfig.isPending ? "Salvando..." : "Salvar Configuração"}
          </button>
        )}
      </div>

      {/* ── Tickets ──────────────────────────────────── */}
      <div className={`${cardClass} p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Tickets do Sorteio</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Gerados a partir de inscrições confirmadas + usos de cupons</p>
          </div>
          <button
            onClick={() => generateTickets.mutate(eventId)}
            disabled={generateTickets.isPending}
            className={btnGold}
          >
            {generateTickets.isPending ? "Gerando..." : tickets.length > 0 ? "🔄 Re-gerar Tickets" : "⚡ Gerar Tickets"}
          </button>
        </div>

        {/* Summary cards */}
        {tickets.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Atletas", count: athleteTickets.length, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
              { label: "Squad", count: squadTickets.length, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
              { label: "Parceiros", count: locationTickets.length, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
              { label: "Restantes", count: remaining, color: "text-[#EDAC02]", bg: "bg-[#EDAC02]/10 border-[#EDAC02]/20" },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
                <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Participant groups */}
        {loadingTickets && <p className="text-xs text-zinc-500 text-center py-4">Carregando tickets...</p>}
        {!loadingTickets && tickets.length === 0 && (
          <div className="text-center py-8 text-zinc-600">
            <p className="text-4xl mb-2">🎟️</p>
            <p className="text-sm">Nenhum ticket gerado. Clique em "Gerar Tickets" para começar.</p>
          </div>
        )}
        {groups.length > 0 && (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {groups.map(g => {
              const drawnCount = g.tickets.filter(t => drawnIds.has(t.id)).length;
              const typeColor = g.type === "athlete" ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
                : g.type === "squad" ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
                : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
              const typeIcon = g.type === "athlete" ? "🏃" : g.type === "squad" ? "👤" : "📍";
              return (
                <div key={`${g.type}:${g.name}`} className="flex items-center justify-between bg-[#050505] border border-[#1a1a1a] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{typeIcon}</span>
                    <span className="text-sm text-white">{g.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${typeColor}`}>
                      {g.type === "athlete" ? "Atleta" : g.type === "squad" ? "Squad" : "Parceiro"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {drawnCount > 0 && <span className="text-[10px] text-green-400">{drawnCount} sorteado{drawnCount > 1 ? "s" : ""}</span>}
                    <span className="text-sm font-black text-[#EDAC02]">{g.tickets.length} ticket{g.tickets.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Realizar Sorteio ─────────────────────────── */}
      {tickets.length > 0 && remaining > 0 && prizes.length > 0 && (
        <div className={`${cardClass} p-5 space-y-4`}>
          <h3 className="text-sm font-bold text-white">Realizar Sorteio</h3>
          <div>
            <label className={labelClass}>Próximo prêmio a sortear</label>
            <select
              value={selectedPrizeIdx}
              onChange={e => setSelectedPrizeIdx(Number(e.target.value))}
              className={inputClass}
            >
              {prizes.map((p, i) => (
                <option key={i} value={i}>{i + 1}° — {p}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowDrawModal(true)}
            className="w-full py-4 bg-[#EDAC02] text-black font-black text-lg rounded-xl hover:bg-[#d49b02] transition-colors shadow-[0_0_30px_rgba(237,172,2,0.3)]"
          >
            🎰 REALIZAR SORTEIO
          </button>
        </div>
      )}

      {/* ── Vencedores ───────────────────────────────── */}
      {winners.length > 0 && (
        <div className={`${cardClass} p-5 space-y-3`}>
          <h3 className="text-sm font-bold text-white">Vencedores</h3>
          {loadingWinners && <p className="text-xs text-zinc-500">Carregando...</p>}
          <div className="space-y-2">
            {winners.map(w => {
              const t = w.raffle_tickets;
              const typeIcon = t.participant_type === "athlete" ? "🏃" : t.participant_type === "squad" ? "👤" : "📍";
              return (
                <div key={w.id} className="flex items-center justify-between bg-[#050505] border border-[#EDAC02]/20 rounded-xl px-4 py-3 group">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-[#EDAC02] w-8">#{w.draw_order}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{typeIcon} {t.participant_name}</p>
                      <p className="text-[10px] text-zinc-500">Ticket #{String(t.ticket_number).padStart(3, "0")} · {w.prize_description || "—"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteWinner.mutate({ id: w.id, eventId })}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs transition-all"
                    title="Anular sorteio"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Draw Modal ───────────────────────────────── */}
      {showDrawModal && (
        <DrawModal
          totalTickets={tickets.length}
          prizeName={prizes[selectedPrizeIdx] || "Prêmio"}
          onDraw={handleDraw}
          onClose={() => setShowDrawModal(false)}
        />
      )}
    </div>
  );
}
