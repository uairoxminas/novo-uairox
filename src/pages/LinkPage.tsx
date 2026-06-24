import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePublicEvents } from '@/hooks/useEvents';

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
function EventCard({ event, index }: { event: any; index: number }) {
  const slug = event.slug || event.id;
  const href = `/evento/${slug}`;
  const eventDate = new Date(event.date);
  const registered = event._registrations_count || 0;
  const capacity = event.max_capacity || null;
  const isFull = capacity !== null && registered >= capacity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="flex flex-col border border-[#EDAC02]/20 bg-[#0d0d0d] rounded-2xl overflow-hidden"
    >
      {/* Cover Image */}
      {event.image_url ? (
        <div className="relative aspect-video overflow-hidden">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/30 to-transparent" />
          {/* Status pill */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Inscrições Abertas
            </span>
          </div>
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-base font-black text-white uppercase italic leading-tight drop-shadow-lg">
              {event.title}
            </h3>
          </div>
        </div>
      ) : (
        <div className="relative aspect-video bg-gradient-to-br from-[#EDAC02]/15 via-[#0a0a0a] to-[#0a0a0a] flex items-center justify-center overflow-hidden">
          <span className="text-7xl font-black text-[#EDAC02]/8 select-none uppercase">{event.title.slice(0, 2)}</span>
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Inscrições Abertas
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-base font-black text-white uppercase italic leading-tight">{event.title}</h3>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
        {/* Info */}
        {event.description && (
          <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">{event.description}</p>
        )}

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <Calendar size={11} className="text-[#EDAC02] flex-shrink-0" />
            <span>{format(eventDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <MapPin size={11} className="text-[#EDAC02] flex-shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>

        {/* Capacity */}
        {capacity && <CapacityBar registered={registered} capacity={capacity} />}

        {/* CTA */}
        <a
          href={href}
          className={`flex items-center justify-center gap-2 w-full py-3.5 font-black text-sm uppercase tracking-widest text-center rounded-xl transition-all ${
            isFull
              ? 'bg-zinc-800 text-zinc-400'
              : 'bg-[#EDAC02] text-black hover:bg-[#d49b02] active:scale-[0.98]'
          }`}
        >
          {isFull ? 'LISTA DE ESPERA' : 'GARANTIR VAGA'}
          {!isFull && <ChevronRight size={16} />}
        </a>
      </div>
    </motion.div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d] rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-[#1a1a1a]" />
      <div className="px-4 pt-3 pb-4 space-y-3">
        <div className="space-y-1.5">
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center py-16 px-4"
    >
      <div className="w-20 h-20 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/20 flex items-center justify-center mx-auto mb-5">
        <span className="text-3xl">🏆</span>
      </div>
      <h2 className="text-xl font-black text-white uppercase italic mb-2">
        Próxima edição<br /><span className="text-[#EDAC02]">Em breve</span>
      </h2>
      <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-6 leading-relaxed">
        Nenhuma prova oficial com inscrições abertas no momento. Fique de olho!
      </p>
      <a
        href="https://instagram.com/uairox.hybridrun"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#EDAC02] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#d49b02] transition-colors"
      >
        Seguir no Instagram
      </a>
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
      document.title = 'UAIROX | Em Breve';
    } else {
      document.title = `UAIROX | ${openEvents.length} Prova${openEvents.length > 1 ? 's' : ''} com Inscrições Abertas`;
    }
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description',
      openEvents.length === 0
        ? 'Aguarde! A próxima prova oficial UAIROX está chegando.'
        : `Garanta sua vaga na maior corrida híbrida de MG. ${openEvents.map((e: any) => e.title).join(' • ')}.`
    );
    return () => { document.title = 'UAIROX - Hybrid RUN'; };
  }, [isLoading, openEvents.length]);

  return (
    <div className="min-h-screen bg-[#050505] text-white antialiased font-sans selection:bg-[#EDAC02] selection:text-black">
      <div className="max-w-md mx-auto px-4 pt-10 pb-28">

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center mb-8"
        >
          {/* Logo */}
          <img src="/logo-uairox.webp" alt="UAIROX" className="w-28 mb-5 object-contain" />

          {/* Badge */}
          {!isLoading && openEvents.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-[#EDAC02] border border-[#EDAC02]/30 bg-[#EDAC02]/10 px-3 py-1 mb-4 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EDAC02] animate-pulse" />
              Inscrições Abertas
            </span>
          )}

          {/* Title */}
          {isLoading ? (
            <div className="space-y-2 w-full flex flex-col items-center">
              <div className="h-8 w-52 bg-[#1a1a1a] rounded-lg animate-pulse" />
              <div className="h-8 w-40 bg-[#1a1a1a] rounded-lg animate-pulse" />
            </div>
          ) : openEvents.length > 0 ? (
            <h1 className="text-4xl font-black uppercase italic tracking-tight leading-none text-white">
              {openEvents.length} Prova{openEvents.length > 1 ? 's' : ''}<br />
              <span className="text-[#EDAC02]">
                {openEvents.length > 1 ? 'Disponíveis.' : 'Disponível.'}
              </span>
            </h1>
          ) : (
            <h1 className="text-4xl font-black uppercase italic tracking-tight leading-none text-white">
              Em<br /><span className="text-[#EDAC02]">Breve.</span>
            </h1>
          )}
        </motion.div>

        {/* ── CARDS ───────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {isLoading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {!isLoading && openEvents.length > 0 && openEvents.map((event: any, i: number) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}

          {!isLoading && openEvents.length === 0 && <EmptyState />}
        </div>

        {/* ── FOOTER MINIMAL ──────────────────────────────────────────── */}
        {!isLoading && (
          <div className="mt-8 text-center">
            <a
              href="https://instagram.com/uairox.hybridrun"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              @uairox.hybridrun
            </a>
          </div>
        )}
      </div>

      {/* ── STICKY BOTTOM BAR ───────────────────────────────────────────── */}
      {!isLoading && openEvents.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-[#050505]/95 backdrop-blur-sm border-t border-[#1a1a1a]">
          {openEvents.length === 1 ? (
            <a
              href={`/evento/${(openEvents[0] as any).slug || openEvents[0].id}`}
              className="block w-full py-4 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-xl hover:bg-[#d49b02] transition-colors text-center"
            >
              GARANTIR MINHA VAGA →
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <span className="text-white font-black text-sm uppercase tracking-widest">
                VER {openEvents.length} PROVAS ABERTAS →
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
