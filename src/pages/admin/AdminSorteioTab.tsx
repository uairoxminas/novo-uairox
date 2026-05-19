import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  useRaffleConfig, useUpsertRaffleConfig,
  useRaffleTickets, useGenerateTickets,
  useRaffleWinners, useDrawWinner, useDeleteRaffleWinner,
  type RafflePrize, type RaffleTicket, type RaffleWinner,
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

async function uploadToStorage(file: File, path: string): Promise<string> {
  const { error } = await (supabase as any).storage.from("site-assets").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = (supabase as any).storage.from("site-assets").getPublicUrl(path);
  return data.publicUrl;
}

// ============ DRAW ANIMATION MODAL ============
function DrawModal({
  totalTickets,
  onDraw,
  onClose,
  prize,
  celebrationImageUrl,
  broadcastDraw,
}: {
  totalTickets: number;
  onDraw: () => Promise<RaffleWinner | undefined>;
  onClose: () => void;
  prize: RafflePrize;
  celebrationImageUrl?: string;
  broadcastDraw: (payload: object) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "countdown" | "rolling" | "winner">("idle");
  const [countdown, setCountdown] = useState(5);
  const [displayNum, setDisplayNum] = useState(1);
  const [winner, setWinner] = useState<RaffleWinner | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = () => {
    setPhase("countdown");
    setCountdown(5);
    broadcastDraw({ type: "COUNTDOWN", count: 5, prize: prize.description });
    let count = 5;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      broadcastDraw({ type: "COUNTDOWN", count, prize: prize.description });
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        startRolling();
      }
    }, 1000);
  };

  const startRolling = () => {
    setPhase("rolling");
    broadcastDraw({ type: "ROLLING", prize: prize.description });
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
        broadcastDraw({ type: "DONE" });
    } catch {
      setPhase("idle");
    }
  };

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const typeLabel = winner
    ? winner.raffle_tickets.participant_type === "athlete" ? "🏃 Atleta"
      : winner.raffle_tickets.participant_type === "squad" ? "👤 Squad UAIROX"
      : "📍 Parceiro"
    : "";

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/97 flex flex-col items-center justify-center p-6"
      onClick={phase === "winner" ? onClose : undefined}
    >
      <div className="w-full max-w-lg flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>

        {/* ── COUNTDOWN PHASE ── */}
        <AnimatePresence mode="wait">
          {phase === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/98"
            >
              {prize.photo_url && (
                <img
                  src={prize.photo_url}
                  alt={prize.description}
                  className="absolute inset-0 w-full h-full object-contain opacity-10 pointer-events-none"
                />
              )}
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-6 z-10">SORTEIO EM</p>
              <motion.span
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-[14rem] font-black text-[#EDAC02] leading-none z-10 tabular-nums"
              >
                {countdown}
              </motion.span>
              <p className="text-xl font-bold text-white mt-4 z-10">{prize.description}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── IDLE / ROLLING / WINNER ── */}
        {phase !== "countdown" && (
          <>
            {/* Header */}
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">SORTEIO AO VIVO</p>
              <h2 className="text-2xl font-black text-white">{prize.description || "Prêmio"}</h2>
            </div>

            {/* Prize photo */}
            {prize.photo_url && phase !== "winner" && (
              <motion.img
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                src={prize.photo_url}
                alt={prize.description}
                className="w-48 h-48 object-contain rounded-2xl border border-[#262626] bg-[#0a0a0a]"
              />
            )}

            {/* Winner: PicaPau celebration */}
            {phase === "winner" && celebrationImageUrl && (
              <motion.img
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                src={celebrationImageUrl}
                alt="Celebração"
                className="w-52 h-52 object-contain drop-shadow-2xl"
              />
            )}
            {phase === "winner" && !celebrationImageUrl && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="text-8xl"
              >
                🎉
              </motion.span>
            )}

            {/* Ticket counter */}
            {phase !== "winner" && (
              <div className="relative">
                <div className="w-56 h-56 rounded-3xl bg-[#0a0a0a] border-2 border-[#EDAC02]/30 flex items-center justify-center shadow-[0_0_60px_rgba(237,172,2,0.15)]">
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
              </div>
            )}

            {/* Winner ticket number */}
            {phase === "winner" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-40 h-40 rounded-3xl bg-[#EDAC02] flex items-center justify-center shadow-[0_0_60px_rgba(237,172,2,0.5)]"
              >
                <span className="font-black text-6xl text-black tabular-nums">
                  {String(winner?.raffle_tickets.ticket_number ?? displayNum).padStart(3, "0")}
                </span>
              </motion.div>
            )}

            {/* Winner info */}
            <AnimatePresence>
              {phase === "winner" && winner && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center space-y-1"
                >
                  <p className="text-xs text-zinc-500">{typeLabel}</p>
                  <p className="text-3xl font-black text-white">{winner.raffle_tickets.participant_name}</p>
                  {winner.raffle_tickets.participant_email && (
                    <p className="text-sm text-zinc-400">{winner.raffle_tickets.participant_email}</p>
                  )}
                  <p className="text-xs text-[#EDAC02] font-bold mt-2">
                    TICKET #{String(winner.raffle_tickets.ticket_number).padStart(3, "0")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3">
              {phase === "idle" && (
                <>
                  <button onClick={onClose} className={btnOutline}>Cancelar</button>
                  <button onClick={startCountdown} className={btnGold}>🎰 Iniciar Sorteio</button>
                </>
              )}
              {phase === "rolling" && (
                <p className="text-zinc-400 text-sm animate-pulse">Sorteando...</p>
              )}
              {phase === "winner" && (
                <button onClick={onClose} className={btnGold}>✓ Confirmar</button>
              )}
            </div>
          </>
        )}
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

  const [prizes, setPrizes] = useState<RafflePrize[]>([]);
  const [newPrizeName, setNewPrizeName] = useState("");
  const [newPrizePhoto, setNewPrizePhoto] = useState<string>("");
  const [newPrizeUploading, setNewPrizeUploading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [showTicketList, setShowTicketList] = useState(true);
  const [celebrationImageUrl, setCelebrationImageUrl] = useState("");
  const [celebUploading, setCelebUploading] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);

  useEffect(() => {
    if (!config) return;
    setPrizes((config.prizes || []).map((p: any) => ({
      description: p.description || p,
      photo_url: p.photo_url || "",
    })));
    setIsLive(config.is_live ?? false);
    setShowTicketList(config.show_ticket_list ?? true);
    setCelebrationImageUrl(config.celebration_image_url ?? "");
    setConfigDirty(false);
  }, [config]);

  const [showDrawModal, setShowDrawModal] = useState(false);
  const [selectedPrizeIdx, setSelectedPrizeIdx] = useState(0);

  const broadcastChannelRef = useRef<any>(null);

  useEffect(() => {
    const channel = (supabase as any)
      .channel(`raffle-live-${eventId}`)
      .subscribe();
    broadcastChannelRef.current = channel;
    return () => { (supabase as any).removeChannel(channel); };
  }, [eventId]);

  const broadcastDraw = (payload: object) => {
    broadcastChannelRef.current?.send({ type: "broadcast", event: "draw", payload });
  };

  const handleSaveConfig = async () => {
    await upsertConfig.mutateAsync({
      event_id: eventId,
      prizes,
      is_live: isLive,
      show_ticket_list: showTicketList,
      celebration_image_url: celebrationImageUrl || null,
    } as any);
    setConfigDirty(false);
    toast.success("Configuração salva!");
  };

  const handleNewPrizePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPrizeUploading(true);
    try {
      const path = `raffle/prize-${Date.now()}.${file.name.split(".").pop()}`;
      const url = await uploadToStorage(file, path);
      setNewPrizePhoto(url);
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setNewPrizeUploading(false);
    }
  };

  const handlePrizePhotoUpdate = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const path = `raffle/prize-${Date.now()}.${file.name.split(".").pop()}`;
      const url = await uploadToStorage(file, path);
      setPrizes(prev => prev.map((p, i) => i === idx ? { ...p, photo_url: url } : p));
      setConfigDirty(true);
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    }
  };

  const handleCelebrationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCelebUploading(true);
    try {
      const path = `raffle/celebration-${Date.now()}.${file.name.split(".").pop()}`;
      const url = await uploadToStorage(file, path);
      setCelebrationImageUrl(url);
      setConfigDirty(true);
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setCelebUploading(false);
    }
  };

  const addPrize = () => {
    if (!newPrizeName.trim()) return;
    setPrizes(prev => [...prev, { description: newPrizeName.trim(), photo_url: newPrizePhoto }]);
    setNewPrizeName("");
    setNewPrizePhoto("");
    setConfigDirty(true);
  };

  const removePrize = (i: number) => {
    setPrizes(prev => prev.filter((_, j) => j !== i));
    setConfigDirty(true);
  };

  const handleDraw = async () => {
    const prize = prizes[selectedPrizeIdx]?.description ?? "";
    return await drawWinner.mutateAsync({ eventId, prizeDescription: prize });
  };

  const publicUrl = `${window.location.origin}/sorteio/${(event as any)?.slug || eventId}`;

  const athleteTickets = tickets.filter(t => t.participant_type === "athlete");
  const squadTickets = tickets.filter(t => t.participant_type === "squad");
  const locationTickets = tickets.filter(t => t.participant_type === "location");
  const drawnIds = new Set(winners.map(w => w.raffle_ticket_id));
  const remaining = tickets.filter(t => !drawnIds.has(t.id)).length;
  const groups = groupTickets(tickets);

  return (
    <div className="space-y-6">
      {/* ── Configuração ──────────────────────────────── */}
      <div className={`${cardClass} p-5 space-y-5`}>
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

        {/* Prizes list */}
        <div>
          <label className={labelClass}>Prêmios (em ordem de sorteio)</label>
          <div className="space-y-2 mb-3">
            {prizes.map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#050505] border border-[#1a1a1a] rounded-xl px-3 py-2.5">
                <span className="text-xs text-[#EDAC02] font-black w-5 shrink-0">{i + 1}°</span>
                {/* Prize thumbnail */}
                <label className="relative cursor-pointer shrink-0">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.description} className="w-10 h-10 rounded-lg object-cover border border-[#262626]" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg border border-dashed border-[#262626] flex items-center justify-center text-zinc-600 hover:border-[#EDAC02] transition-colors text-lg">
                      📷
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handlePrizePhotoUpdate(i, e)} disabled={!!winners[i]} />
                </label>
                <span className="flex-1 text-sm text-white">{p.description}</span>
                {winners[i] && <span className="text-[10px] text-green-400 font-bold shrink-0">✓ Sorteado</span>}
                {!winners[i] && (
                  <button onClick={() => removePrize(i)} className="text-zinc-600 hover:text-red-400 text-xs shrink-0">✕</button>
                )}
              </div>
            ))}
            {prizes.length === 0 && <p className="text-xs text-zinc-600 italic">Nenhum prêmio adicionado.</p>}
          </div>

          {/* Add prize form */}
          <div className="border border-[#1a1a1a] rounded-xl p-3 space-y-2 bg-[#050505]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Novo Prêmio</p>
            <div className="flex gap-2">
              {/* Photo upload for new prize */}
              <label className="relative cursor-pointer shrink-0">
                {newPrizePhoto ? (
                  <img src={newPrizePhoto} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-[#EDAC02]/30" />
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-dashed border-[#262626] flex flex-col items-center justify-center text-zinc-600 hover:border-[#EDAC02] transition-colors">
                    {newPrizeUploading ? <span className="text-[9px] text-[#EDAC02] animate-pulse text-center">...</span> : <span className="text-xl">📷</span>}
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleNewPrizePhoto} disabled={newPrizeUploading} />
              </label>
              <input
                value={newPrizeName}
                onChange={e => setNewPrizeName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addPrize()}
                placeholder="Nome do prêmio"
                className={`${inputClass} flex-1`}
              />
              <button onClick={addPrize} className={btnGold}>+ Adicionar</button>
            </div>
          </div>
        </div>

        {/* Celebration image */}
        <div>
          <label className={labelClass}>🎉 Imagem de Celebração (aparece ao revelar o vencedor)</label>
          <div className="flex items-center gap-4">
            {celebrationImageUrl ? (
              <div className="relative">
                <img src={celebrationImageUrl} alt="celebração" className="w-20 h-20 object-contain rounded-xl border border-[#EDAC02]/30 bg-[#050505]" />
                <button
                  onClick={() => { setCelebrationImageUrl(""); setConfigDirty(true); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center hover:bg-red-600"
                >✕</button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-[#262626] hover:border-[#EDAC02] rounded-xl text-zinc-600 transition-colors bg-[#0a0a0a]">
                {celebUploading ? (
                  <span className="text-[10px] text-[#EDAC02] animate-pulse text-center">Enviando...</span>
                ) : (
                  <>
                    <span className="text-2xl">🦜</span>
                    <span className="text-[9px] text-center mt-1">Upload</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleCelebrationUpload} disabled={celebUploading} />
              </label>
            )}
            <p className="text-xs text-zinc-500">
              Faça upload da imagem que vai aparecer na tela<br />quando o vencedor for revelado.<br />
              <span className="text-zinc-600">(Ex: Pica Pau UAIROX comemorando)</span>
            </p>
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
            {upsertConfig.isPending ? "Salvando..." : "💾 Salvar Configuração"}
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
      <div className={`${cardClass} p-5 space-y-4`}>
        <h3 className="text-sm font-bold text-white">🎰 Realizar Sorteio</h3>

        {/* Checklist de pré-requisitos */}
        {(prizes.length === 0 || tickets.length === 0 || remaining === 0) && (
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-500 mb-2">Complete os passos abaixo para liberar o sorteio:</p>
            <div className={`flex items-center gap-2 text-xs ${prizes.length > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
              <span>{prizes.length > 0 ? '✓' : '○'}</span>
              <span>Adicionar pelo menos 1 prêmio (clique "+ Adicionar" acima)</span>
            </div>
            <div className={`flex items-center gap-2 text-xs ${tickets.length > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
              <span>{tickets.length > 0 ? '✓' : '○'}</span>
              <span>Gerar tickets (botão "Re-gerar Tickets" na seção acima)</span>
            </div>
            <div className={`flex items-center gap-2 text-xs ${remaining > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
              <span>{remaining > 0 ? '✓' : '○'}</span>
              <span>Ter tickets disponíveis (não sorteados)</span>
            </div>
          </div>
        )}

        {prizes.length > 0 && tickets.length > 0 && remaining > 0 && (
          <div>
            <label className={labelClass}>Próximo prêmio a sortear</label>
            <div className="space-y-2">
              {prizes.map((p, i) => {
                const alreadyDrawn = !!winners.find(w => w.prize_description === p.description);
                return (
                  <button
                    key={i}
                    onClick={() => !alreadyDrawn && setSelectedPrizeIdx(i)}
                    disabled={alreadyDrawn}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedPrizeIdx === i && !alreadyDrawn
                        ? "border-[#EDAC02] bg-[#EDAC02]/5"
                        : alreadyDrawn
                        ? "border-[#1a1a1a] opacity-40 cursor-not-allowed"
                        : "border-[#1a1a1a] hover:border-zinc-600"
                    }`}
                  >
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.description} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#111] flex items-center justify-center text-xl shrink-0">🏆</div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{i + 1}° — {p.description}</p>
                      {alreadyDrawn && <p className="text-[10px] text-green-400">✓ Já sorteado</p>}
                    </div>
                    {selectedPrizeIdx === i && !alreadyDrawn && (
                      <span className="w-3 h-3 rounded-full bg-[#EDAC02] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowDrawModal(true)}
          disabled={prizes.length === 0 || tickets.length === 0 || remaining === 0}
          className="w-full py-4 bg-[#EDAC02] text-black font-black text-lg rounded-xl hover:bg-[#d49b02] transition-colors shadow-[0_0_30px_rgba(237,172,2,0.3)] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          🎰 REALIZAR SORTEIO
        </button>
      </div>

      {/* ── Vencedores ───────────────────────────────── */}
      {winners.length > 0 && (
        <div className={`${cardClass} p-5 space-y-3`}>
          <h3 className="text-sm font-bold text-white">Vencedores</h3>
          {loadingWinners && <p className="text-xs text-zinc-500">Carregando...</p>}
          <div className="space-y-2">
            {winners.map(w => {
              const t = w.raffle_tickets;
              const typeIcon = t.participant_type === "athlete" ? "🏃" : t.participant_type === "squad" ? "👤" : "📍";
              const prize = prizes.find(p => p.description === w.prize_description);
              return (
                <div key={w.id} className="flex items-center justify-between bg-[#050505] border border-[#EDAC02]/20 rounded-xl px-4 py-3 group">
                  <div className="flex items-center gap-3">
                    {prize?.photo_url ? (
                      <img src={prize.photo_url} alt={prize.description} className="w-8 h-8 rounded object-cover shrink-0" />
                    ) : (
                      <span className="text-2xl font-black text-[#EDAC02] w-8">#{w.draw_order}</span>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">{typeIcon} {t.participant_name}</p>
                      <p className="text-[10px] text-zinc-500">Ticket #{String(t.ticket_number).padStart(3, "0")} · {w.prize_description || "—"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteWinner.mutate({ id: w.id, eventId })}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs transition-all"
                    title="Anular sorteio"
                  >🗑️</button>
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
          prize={prizes[selectedPrizeIdx] || { description: "Prêmio" }}
          celebrationImageUrl={celebrationImageUrl}
          onDraw={handleDraw}
          onClose={() => setShowDrawModal(false)}
          broadcastDraw={broadcastDraw}
        />
      )}
    </div>
  );
}
