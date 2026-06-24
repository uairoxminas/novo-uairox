import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wind, Dumbbell, Trophy, MapPin, Calendar, Users, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePublicEvents } from '@/hooks/useEvents';

// ── Instagram Icon ─────────────────────────────────────────────────────────────
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

// ── Capacity Bar ──────────────────────────────────────────────────────────────
function CapacityBar({ registered, capacity }: { registered: number; capacity: number | null }) {
  if (!capacity) return null;
  const pct = Math.min(100, Math.round((registered / capacity) * 100));
  const spotsLeft = Math.max(0, capacity - registered);
  const isCritical = pct >= 85;
  const isHigh = pct >= 60;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500 flex items-center gap-1">
          <Users size={11} className="text-zinc-600" />
          {registered} / {capacity} inscritos
        </span>
        <span className={`font-black ${isCritical ? 'text-red-400' : isHigh ? 'text-amber-400' : 'text-[#EDAC02]'}`}>
          {spotsLeft === 0 ? 'LOTADO' : `${spotsLeft} vagas`}
        </span>
      </div>
      <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isCritical ? 'bg-red-500' : isHigh ? 'bg-amber-400' : 'bg-[#EDAC02]'}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, pct)}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ event }: { event: any }) {
  const slug = event.slug || event.id;
  const href = `/evento/${slug}`;
  const eventDate = new Date(event.date);
  const registered = event._registrations_count || 0;
  const capacity = event.max_capacity || null;
  const isFull = capacity !== null && registered >= capacity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
      className="flex flex-col border border-[#EDAC02]/20 bg-[#0d0d0d] rounded-2xl overflow-hidden hover:border-[#EDAC02]/50 transition-all duration-300 group"
    >
      {/* Cover Image */}
      {event.image_url ? (
        <div className="relative aspect-video overflow-hidden">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent" />
          {/* Status pill */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Inscrições Abertas
            </span>
          </div>
        </div>
      ) : (
        <div className="relative aspect-video bg-gradient-to-br from-[#EDAC02]/15 via-[#0a0a0a] to-[#0a0a0a] flex items-center justify-center overflow-hidden">
          <span className="text-7xl font-black text-[#EDAC02]/8 select-none uppercase">
            {event.title.slice(0, 2)}
          </span>
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Inscrições Abertas
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-5 pt-4 pb-5 flex flex-col flex-1 gap-4">
        {/* Title */}
        <div>
          <h3 className="text-lg font-black text-white uppercase italic leading-tight">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-zinc-500 text-xs mt-1 line-clamp-2 leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        {/* Info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <Calendar size={12} className="text-[#EDAC02] flex-shrink-0" />
            <span>{format(eventDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <MapPin size={12} className="text-[#EDAC02] flex-shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>

        {/* Capacity Bar */}
        {capacity && (
          <CapacityBar registered={registered} capacity={capacity} />
        )}

        {/* CTA */}
        <a
          href={isFull ? href : href}
          className={`block w-full py-3.5 font-black text-sm uppercase tracking-widest text-center transition-all rounded-xl skew-x-[-3deg] ${
            isFull
              ? 'bg-zinc-700 text-zinc-400 cursor-default'
              : 'bg-[#EDAC02] text-black hover:bg-[#d49b02] hover:scale-[1.01] active:scale-[0.99]'
          }`}
        >
          <span className="block skew-x-[3deg] flex items-center justify-center gap-2">
            {isFull ? 'LISTA DE ESPERA' : 'GARANTIR VAGA'}
            {!isFull && <ChevronRight size={16} />}
          </span>
        </a>
      </div>
    </motion.div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex flex-col border border-[#1a1a1a] bg-[#0d0d0d] rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-[#1a1a1a]" />
      <div className="px-5 pt-4 pb-5 space-y-4">
        <div className="space-y-2">
          <div className="h-5 bg-[#1a1a1a] rounded w-3/4" />
          <div className="h-3 bg-[#1a1a1a] rounded w-1/2" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-[#1a1a1a] rounded w-2/3" />
          <div className="h-3 bg-[#1a1a1a] rounded w-1/2" />
        </div>
        <div className="h-12 bg-[#1a1a1a] rounded-xl" />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center py-20 px-6"
    >
      {/* Animated icon */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-[#EDAC02]/10 animate-ping" style={{ animationDuration: '2.5s' }} />
        <div className="relative w-24 h-24 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/20 flex items-center justify-center">
          <Trophy size={36} className="text-[#EDAC02]/60" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-white uppercase italic mb-2">
        Próxima edição<br />
        <span className="text-[#EDAC02]">Em breve</span>
      </h2>
      <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
        No momento não há provas oficiais com inscrições abertas. Fique de olho nas nossas redes para não perder o lançamento!
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href="https://instagram.com/uairox.hybridrun"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#EDAC02] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#d49b02] transition-colors"
        >
          <InstagramIcon size={14} />
          Seguir no Instagram
        </a>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 border border-[#262626] text-zinc-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:border-zinc-500 hover:text-white transition-colors"
        >
          Ver todos os eventos →
        </a>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LinkPage() {
  const { data: allEvents, isLoading } = usePublicEvents();

  // Filter: only official events with open registrations
  const openEvents = (allEvents || []).filter(
    (e: any) => e.event_type === 'oficial' && e.status === 'open'
  );

  // Dynamic SEO
  useEffect(() => {
    if (isLoading) return;
    if (openEvents.length === 0) {
      document.title = 'UAIROX | Em Breve — Próxima Prova Oficial';
    } else if (openEvents.length === 1) {
      const ev = openEvents[0];
      const d = new Date(ev.date);
      document.title = `UAIROX | ${ev.title} — ${format(d, "dd/MM", { locale: ptBR })}`;
    } else {
      document.title = `UAIROX | ${openEvents.length} Provas Oficiais com Inscrições Abertas`;
    }

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description',
      openEvents.length === 0
        ? 'Aguarde! A próxima prova oficial UAIROX está chegando. Fique de olho.'
        : `Garanta sua vaga na maior corrida híbrida de MG. ${openEvents.map((e: any) => e.title).join(' • ')}.`
    );
    return () => { document.title = 'UAIROX - Hybrid RUN'; };
  }, [isLoading, openEvents.length]);

  const heroTitle = openEvents.length === 0
    ? 'Em Breve'
    : openEvents.length === 1
    ? openEvents[0].title
    : `${openEvents.length} Provas Abertas`;

  const heroSubtitle = openEvents.length === 0
    ? 'Próxima edição chegando em breve'
    : openEvents.length === 1
    ? `${format(new Date(openEvents[0].date), "dd 'de' MMMM", { locale: ptBR })} · ${openEvents[0].location}`
    : 'Escolha a prova e garanta sua vaga';

  return (
    <div className="min-h-screen bg-[#050505] text-white antialiased font-sans selection:bg-[#EDAC02] selection:text-black">

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-14 pb-10 min-h-[100svh] overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(237,172,2,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[size:40px_40px] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col items-center max-w-sm mx-auto w-full"
        >
          {/* Logo */}
          <img src="/logo-uairox.webp" alt="UAIROX" className="w-36 mb-6 object-contain" />

          {/* Badge */}
          <span className="inline-block text-[10px] font-black uppercase tracking-[0.25em] text-[#EDAC02] border border-[#EDAC02]/30 bg-[#EDAC02]/10 px-3 py-1 mb-5">
            A maior corrida híbrida de MG
          </span>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-black uppercase italic tracking-tighter leading-none text-white mb-2">
            {isLoading ? (
              <span className="block h-12 w-64 bg-[#1a1a1a] rounded-lg animate-pulse" />
            ) : (
              <>
                {heroTitle.includes('UAIROX') || heroTitle.includes('Em Breve') || heroTitle.includes('Provas')
                  ? <><span className="text-[#EDAC02]">UAIROX</span><br />{heroTitle.replace('UAIROX', '').trim() || ''}</>
                  : heroTitle
                }
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest mt-3 mb-8">
            {isLoading ? (
              <span className="block h-4 w-48 bg-[#1a1a1a] rounded animate-pulse mx-auto" />
            ) : heroSubtitle}
          </p>

          {/* Quick CTAs — only when there are events */}
          {!isLoading && openEvents.length > 0 && (
            <div className={`grid gap-3 w-full mb-3 ${openEvents.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {openEvents.slice(0, 2).map((ev: any) => {
                const slug = (ev as any).slug || ev.id;
                return (
                  <a
                    key={ev.id}
                    href={`/evento/${slug}`}
                    className="flex flex-col items-center justify-center py-4 px-3 bg-[#EDAC02] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#d49b02] transition-colors text-center leading-tight"
                  >
                    <span className="text-[9px] text-black/50 font-bold mb-0.5">Inscrição</span>
                    {ev.title.replace(/UAIROX\s*/i, '').trim() || ev.title}
                  </a>
                );
              })}
            </div>
          )}

          {/* Link to homepage */}
          <a href="/" className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors">
            Ver todos os eventos →
          </a>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          <div className="w-px h-10 bg-gradient-to-b from-[#EDAC02]/40 to-transparent mx-auto" />
        </motion.div>
      </section>

      {/* ── 2. URGENCY BAR — only if there are events ───────────────────── */}
      {!isLoading && openEvents.length > 0 && (
        <div className="bg-[#EDAC02] py-3 px-4 text-center">
          <p className="text-black font-black text-xs md:text-sm uppercase tracking-wide">
            🔥 {openEvents.length === 1
              ? `${openEvents[0].title} — Vagas limitadas, inscreva-se agora!`
              : `${openEvents.length} provas com inscrições abertas — Vagas limitadas!`
            }
          </p>
        </div>
      )}

      {/* ── 3. O QUE É ──────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EDAC02] text-center mb-2">O que é</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase italic text-center text-white mb-10 leading-tight">
            Corrida + Força.<br />Um desafio completo.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: <Wind size={28} className="text-[#EDAC02]" />, title: 'Corra', desc: 'Voltas de corrida intercaladas em percurso cronometrado' },
              { icon: <Dumbbell size={28} className="text-[#EDAC02]" />, title: 'Force', desc: 'Estações funcionais: Ski Erg, Sled, Rowing e mais' },
              { icon: <Trophy size={28} className="text-[#EDAC02]" />, title: 'Vença', desc: 'Medalha para todos os finishers e pódio por categoria' },
            ].map(card => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center text-center p-6 border border-[#1a1a1a] bg-[#0a0a0a] rounded-xl"
              >
                <div className="mb-3">{card.icon}</div>
                <p className="font-black text-white uppercase tracking-widest text-sm mb-1">{card.title}</p>
                <p className="text-zinc-500 text-xs leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. PROVAS COM INSCRIÇÕES ABERTAS ─────────────────────────────── */}
      <section className="py-14 px-4 bg-[#080808] border-y border-[#1a1a1a]">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EDAC02] text-center mb-2">
            {isLoading ? 'Carregando...' : openEvents.length > 0 ? 'Inscrições Abertas' : 'Próximas Edições'}
          </p>
          <h2 className="text-3xl md:text-4xl font-black uppercase italic text-center text-white mb-10 leading-tight">
            {isLoading
              ? 'Buscando provas...'
              : openEvents.length > 0
              ? openEvents.length === 1
                ? 'Garanta sua vaga agora.'
                : `${openEvents.length} provas disponíveis.`
              : 'Em breve.'}
          </h2>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Events Grid */}
          {!isLoading && openEvents.length > 0 && (
            <div className={`grid grid-cols-1 gap-5 ${openEvents.length > 1 ? 'md:grid-cols-2' : 'max-w-md mx-auto'}`}>
              {openEvents.map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && openEvents.length === 0 && <EmptyState />}
        </div>
      </section>

      {/* ── 5. STATS ─────────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EDAC02] text-center mb-2">Histórico</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase italic text-center text-white mb-10 leading-tight">
            Edições que esgotam.
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { num: '8+', label: 'Edições realizadas' },
              { num: '+500', label: 'Atletas por edição' },
              { num: '3×', label: 'Últimas edições esgotadas' },
            ].map(stat => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center text-center p-4 border border-[#1a1a1a] rounded-xl"
              >
                <p className="text-3xl md:text-4xl font-black text-[#EDAC02] italic leading-none mb-1">{stat.num}</p>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider leading-tight">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Gallery */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { src: '/pica-pau-arco.png', alt: 'UAIROX — Pórtico de chegada' },
              { src: '/portico-uairox.png', alt: 'UAIROX — Estrutura do evento' },
              { src: '/pica-pau.png', alt: 'UAIROX — Mascote oficial' },
              { src: '/og-regulamento.png', alt: 'UAIROX — Regulamento' },
            ].map((img, i) => (
              <motion.div
                key={img.src}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="aspect-square rounded-xl overflow-hidden bg-[#0d0d0d] border border-[#1a1a1a]"
              >
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1a1a1a] py-8 px-4 text-center">
        <img src="/logo-uairox.webp" alt="UAIROX" className="w-24 mx-auto mb-4 opacity-80 object-contain" />
        <a
          href="https://instagram.com/uairox.hybridrun"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-[#EDAC02] transition-colors text-xs mb-4"
        >
          <InstagramIcon size={16} />
          @uairox.hybridrun
        </a>
        <p className="text-zinc-700 text-[10px]">© 2026 UAIROX Hybrid RUN</p>
      </footer>

      {/* ── STICKY CTA — only when there are events ──────────────────────── */}
      {!isLoading && openEvents.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] p-3 bg-[#050505]/95 backdrop-blur-sm border-t border-[#1a1a1a]">
          {openEvents.length === 1 ? (
            <a
              href={`/evento/${(openEvents[0] as any).slug || openEvents[0].id}`}
              className="block w-full py-4 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-xl hover:bg-[#d49b02] transition-colors text-center"
            >
              GARANTIR MINHA VAGA →
            </a>
          ) : (
            <a
              href="#eventos"
              className="block w-full py-4 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-xl hover:bg-[#d49b02] transition-colors text-center"
            >
              VER {openEvents.length} PROVAS ABERTAS →
            </a>
          )}
        </div>
      )}

      {/* Bottom padding for sticky bar */}
      {!isLoading && openEvents.length > 0 && <div className="md:hidden h-20" />}
    </div>
  );
}
