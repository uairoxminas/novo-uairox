import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

// ── Level system ──────────────────────────────────────────────
const LEVELS = [
  { name: 'Iniciante', min: 0,   max: 9,        next: 10,  emoji: '⭐', color: 'text-zinc-300',   ring: 'ring-zinc-600',   bar: 'bg-zinc-500' },
  { name: 'Bronze',    min: 10,  max: 24,        next: 25,  emoji: '🥉', color: 'text-orange-400', ring: 'ring-orange-500', bar: 'bg-orange-400' },
  { name: 'Prata',     min: 25,  max: 49,        next: 50,  emoji: '🥈', color: 'text-slate-300',  ring: 'ring-slate-400',  bar: 'bg-slate-400' },
  { name: 'Ouro',      min: 50,  max: 99,        next: 100, emoji: '🥇', color: 'text-yellow-400', ring: 'ring-yellow-400', bar: 'bg-yellow-400' },
  { name: 'Elite',     min: 100, max: Infinity,  next: null, emoji: '🔥', color: 'text-red-400',    ring: 'ring-red-500',    bar: 'bg-red-500' },
];

function getLevel(total: number) {
  return LEVELS.find(l => total >= l.min && (l.max === Infinity || total <= l.max)) ?? LEVELS[0];
}

function xpProgress(total: number, level: typeof LEVELS[0]) {
  if (!level.next) return 100;
  const base = level.min;
  const range = level.next - base;
  return Math.min(100, ((total - base) / range) * 100);
}

// ── Kit do Promotor ───────────────────────────────────────────
const kitTemplates = (code: string) => [
  {
    platform: '📸 Instagram Stories',
    tip: 'Grave um vídeo treinando e adicione o texto por cima. Use a enquete "Vai se inscrever?" para engajar.',
    caption: `Ei, atleta! 🏆 Se você vai se inscrever no próximo evento UAIROX, usa meu cupom *${code}* e já garante desconto na inscrição!\n\n👉 uairox.com.br\n\n#UAIROX #CrossFit #Funcional`,
  },
  {
    platform: '📷 Feed Instagram',
    tip: 'Poste uma foto no treino ou em uma competição. Quanto mais autêntico, maior o alcance.',
    caption: `Treine, compita e evolua. 🏋️\n\nFaço parte do SQUAD UAIROX e tenho um cupom exclusivo pra vocês: *${code}*\n\nUse na sua inscrição em uairox.com.br e economize! Cada indicação me ajuda a conquistar prêmios exclusivos. Bora junto? 💪\n\n#UAIROX #SquadUAIROX #AtletaUAIROX #Desafio #Funcional`,
  },
  {
    platform: '💬 WhatsApp / Grupo',
    tip: 'Mande direto no grupo da academia ou no status. Mensagem curta converte mais.',
    caption: `Pessoal! 🎯 Quem for se inscrever em um evento UAIROX usa meu cupom: *${code}*\n\nColoca na inscrição em uairox.com.br e já desconta! 🔥`,
  },
  {
    platform: '🎵 TikTok / Reels',
    tip: 'Faça um "unboxing" do kit do evento ou mostre o treino. Na legenda, mencione o cupom.',
    caption: `POV: você treina no @uairox e tem cupom de desconto 👀\n\nUsem: *${code}* em uairox.com.br\n\n#UAIROX #CrossFit #POV #Treino #Funcional`,
  },
];

const promotionTips = [
  { icon: '📅', tip: 'Poste na semana que antecede cada evento — a demanda por inscrições é maior.' },
  { icon: '🎯', tip: 'Marque @uairox nos stories para aumentar a chance de ser repostado.' },
  { icon: '💡', tip: 'Mostre você treinando: conteúdo autêntico gera muito mais cliques que arte gráfica.' },
  { icon: '🤝', tip: 'Indique diretamente para amigos no privado — conversas pessoais têm alta conversão.' },
  { icon: '🔄', tip: 'Poste ao menos 1x por semana. Consistência bate viralização.' },
];

// ── Main page ─────────────────────────────────────────────────
export default function SquadPortalPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState<any>(null);
  const [ownerType, setOwnerType] = useState<'squad' | 'location' | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [byEvent, setByEvent] = useState<{ eventTitle: string; count: number; date: string }[]>([]);
  const [activeKit, setActiveKit] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [arts, setArts] = useState<{ id: string; title: string; description: string | null; image_url: string }[]>([]);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token]);

  const load = async () => {
    setLoading(true);

    // Load promo arts (fire-and-forget alongside owner lookup)
    db.from('squad_promo_arts').select('id, title, description, image_url').order('created_at', { ascending: false })
      .then(({ data }: any) => setArts(data ?? []));

    // Try squad_members by coupon_code slug first, then by portal_token UUID
    const smByCoupon = await db.from('squad_members').select('*').ilike('coupon_code', token!).maybeSingle();
    const smRes = smByCoupon.data
      ? smByCoupon
      : await db.from('squad_members').select('*').eq('portal_token', token).maybeSingle();
    if (smRes.data) {
      setOwner(smRes.data);
      setOwnerType('squad');
      await loadLogs('squad_member_id', smRes.data.id);
      setLoading(false);
      return;
    }

    // Try training_locations by coupon_code slug first, then by portal_token UUID
    const locByCoupon = await db.from('training_locations').select('*').ilike('coupon_code', token!).maybeSingle();
    const locRes = locByCoupon.data
      ? locByCoupon
      : await db.from('training_locations').select('*').eq('portal_token', token).maybeSingle();
    if (locRes.data) {
      setOwner(locRes.data);
      setOwnerType('location');
      await loadLogs('location_id', locRes.data.id);
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  const loadLogs = async (field: string, id: string) => {
    const { data } = await db
      .from('coupon_benefit_logs')
      .select('*, events(title, date)')
      .eq(field, id)
      .order('created_at', { ascending: false });

    const entries = data ?? [];
    setLogs(entries);

    // Group by event
    const map = new Map<string, { eventTitle: string; count: number; date: string }>();
    for (const l of entries) {
      const eid = l.event_id;
      if (!map.has(eid)) {
        map.set(eid, { eventTitle: l.events?.title ?? '—', count: 0, date: l.events?.date ?? '' });
      }
      map.get(eid)!.count++;
    }
    setByEvent([...map.values()].sort((a, b) => b.count - a.count));
  };

  const copyCaption = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    toast.success('Legenda copiada!');
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-center p-6">
        <span className="text-6xl">🔐</span>
        <h1 className="text-xl font-black text-white">Link inválido</h1>
        <p className="text-zinc-500 text-sm">Este link de portal não existe ou foi revogado.</p>
      </div>
    );
  }

  const total = logs.length;
  const level = getLevel(total);
  const xp = xpProgress(total, level);
  const couponCode = owner.coupon_code ?? '—';
  const name = ownerType === 'squad' ? owner.full_name : owner.name;
  const avatar = ownerType === 'squad' ? owner.avatar_url : owner.logo_url;
  const instagram = ownerType === 'squad' ? owner.instagram_handle : owner.instagram;
  const templates = kitTemplates(couponCode);

  const nextMilestone = level.next;
  const remaining = nextMilestone ? nextMilestone - total : 0;

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EDAC02]/10 to-transparent pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 pt-10 pb-8 flex flex-col items-center text-center gap-4">
          {avatar ? (
            <img src={avatar} alt={name} className={`w-24 h-24 rounded-full object-cover ring-4 ${level.ring} shadow-xl`} />
          ) : (
            <div className={`w-24 h-24 rounded-full bg-[#111] border-4 ${level.ring} flex items-center justify-center text-4xl`}>
              {ownerType === 'squad' ? '👤' : '📍'}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-white">{name}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {ownerType === 'squad' ? `Squad UAIROX · ${owner.role ?? ''}` : `Parceiro UAIROX · ${owner.city ?? ''}`}
            </p>
            {instagram && (
              <p className="text-xs text-[#EDAC02] mt-0.5">@{instagram.replace('@', '')}</p>
            )}
          </div>

          {/* Level badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10`}>
            <span className="text-xl">{level.emoji}</span>
            <span className={`font-black text-sm ${level.color}`}>{level.name}</span>
          </div>

          {/* Coupon code */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Seu cupom:</span>
            <span className="px-3 py-1 rounded-lg bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] font-mono font-black tracking-widest text-sm">
              {couponCode}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Indicações', value: total, color: 'text-[#EDAC02]' },
            { label: 'Eventos', value: byEvent.length, color: 'text-blue-400' },
            { label: 'Nível', value: level.name, color: level.color },
          ].map(s => (
            <div key={s.label} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── XP Bar ── */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Progresso de Nível</p>
            {nextMilestone ? (
              <p className="text-xs text-zinc-500">{total} / {nextMilestone} indicações</p>
            ) : (
              <p className="text-xs text-red-400 font-bold">🔥 Nível Máximo!</p>
            )}
          </div>
          <div className="w-full h-3 bg-[#111] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xp}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full ${level.bar} rounded-full`}
            />
          </div>
          {nextMilestone && remaining > 0 && (
            <p className="text-xs text-center text-zinc-500">
              Faltam <span className="text-white font-bold">{remaining}</span> indicações para {LEVELS[LEVELS.indexOf(level) + 1]?.name ?? ''} {LEVELS[LEVELS.indexOf(level) + 1]?.emoji ?? ''}
            </p>
          )}
        </div>

        {/* ── Milestones ── */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Marcos & Recompensas</p>
          <div className="space-y-2">
            {[
              { at: 10,  label: 'Bronze 🥉', reward: 'Reconhecimento + badge exclusivo' },
              { at: 25,  label: 'Prata 🥈',  reward: 'Prêmio especial no próximo evento' },
              { at: 50,  label: 'Ouro 🥇',   reward: 'Inscrição gratuita em um evento' },
              { at: 100, label: 'Elite 🔥',  reward: 'Kit completo UAIROX + inscrição free' },
            ].map(m => {
              const done = total >= m.at;
              return (
                <div key={m.at} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${done ? 'border-[#EDAC02]/20 bg-[#EDAC02]/5' : 'border-white/5'}`}>
                  <span className={`text-lg w-6 text-center ${done ? '' : 'grayscale opacity-30'}`}>{done ? '✅' : '🔒'}</span>
                  <div className="flex-1">
                    <p className={`text-xs font-bold ${done ? 'text-white' : 'text-zinc-600'}`}>{m.at} indicações — {m.label}</p>
                    <p className={`text-[10px] ${done ? 'text-zinc-400' : 'text-zinc-700'}`}>{m.reward}</p>
                  </div>
                  {done && <span className="text-[10px] text-[#EDAC02] font-bold">Conquistado!</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Histórico por evento ── */}
        {byEvent.length > 0 && (
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Indicações por Evento</p>
            <div className="space-y-2">
              {byEvent.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#050505] border border-[#1a1a1a] rounded-lg">
                  <p className="text-sm text-white">{e.eventTitle}</p>
                  <span className="text-sm font-black text-[#EDAC02]">{e.count} ticket{e.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Últimas indicações ── */}
        {logs.length > 0 && (
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Últimas Indicações</p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {logs.slice(0, 20).map((l, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border border-[#1a1a1a] rounded-lg">
                  <div>
                    <p className="text-xs text-white font-medium">{l.athlete_name || '—'}</p>
                    <p className="text-[10px] text-zinc-600">{l.events?.title ?? '—'}</p>
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    {l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Kit do Promotor ── */}
        <div className="bg-[#0a0a0a] border border-[#EDAC02]/20 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#EDAC02]/5 border-b border-[#EDAC02]/10">
            <p className="text-sm font-black text-[#EDAC02]">📣 Kit do Promotor</p>
            <p className="text-xs text-zinc-500 mt-0.5">Legendas prontas para copiar e postar agora mesmo</p>
          </div>

          {/* Artes para download */}
          {arts.length > 0 && (
            <div className="p-4 border-b border-[#1a1a1a] space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">🎨 Artes do Evento</p>
              <div className="grid grid-cols-2 gap-3">
                {arts.map(art => (
                  <div key={art.id} className="rounded-xl overflow-hidden border border-[#1a1a1a] bg-[#050505]">
                    <div className="aspect-square overflow-hidden bg-[#111]">
                      <img src={art.image_url} alt={art.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2.5 space-y-1.5">
                      <p className="text-xs font-bold text-white truncate">{art.title}</p>
                      {art.description && <p className="text-[10px] text-zinc-500 truncate">{art.description}</p>}
                      <a
                        href={art.image_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-[#EDAC02] text-black text-xs font-black hover:bg-[#d49b02] transition-colors"
                      >
                        ⬇ Baixar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 space-y-3">
            {templates.map((t, i) => (
              <div key={i} className="border border-[#1a1a1a] rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveKit(activeKit === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#050505] hover:bg-[#0f0f0f] transition-colors text-left"
                >
                  <span className="text-sm font-bold text-white">{t.platform}</span>
                  <span className="text-zinc-600 text-xs">{activeKit === i ? '▲' : '▼'}</span>
                </button>
                {activeKit === i && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-2 text-xs text-zinc-400 bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2">
                      <span>💡</span>
                      <span>{t.tip}</span>
                    </div>
                    <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                      {t.caption}
                    </pre>
                    <button
                      onClick={() => copyCaption(i, t.caption)}
                      className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${copied === i ? 'bg-green-500 text-white' : 'bg-[#EDAC02] text-black hover:bg-[#d49b02]'}`}
                    >
                      {copied === i ? '✓ Copiado!' : 'Copiar Legenda'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tips gerais */}
          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Dicas Gerais</p>
            {promotionTips.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                <span>{t.icon}</span>
                <span>{t.tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-zinc-700 font-bold tracking-widest pt-2">
          UAIROX · PAINEL DE INDICAÇÕES OFICIAL
        </p>
      </div>
    </div>
  );
}
