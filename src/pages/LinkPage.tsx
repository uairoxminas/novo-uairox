import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Wind, Dumbbell, Trophy, X, MapPin, Calendar, ChevronRight, AlertTriangle } from 'lucide-react';

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

// ── SEO ──────────────────────────────────────────────────────────────────────
function useSEO() {
  useEffect(() => {
    document.title = 'UAIROX | 8ª Edição — 27/06 Nova Lima';
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Garanta sua vaga na maior corrida híbrida de MG. 27 de junho em Nova Lima. Vagas limitadas.');
    return () => { document.title = 'UAIROX - Hybrid RUN'; };
  }, []);
}

// ── Animated Progress Bar ─────────────────────────────────────────────────────
function ProgressBar({ pct, color = '#EDAC02' }: { pct: number; color?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <div ref={ref} className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: inView ? `${pct}%` : 0 }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
      />
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({
  badge, title, distance, pct, includes, href,
}: {
  badge: string; title: string; distance: string; pct: number; includes: string[]; href: string;
}) {
  return (
    <div className="flex flex-col border border-[#EDAC02]/20 bg-[#0d0d0d] rounded-2xl overflow-hidden hover:border-[#EDAC02]/50 transition-colors">
      <div className="px-5 pt-5 pb-4 flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="inline-block text-[10px] font-black uppercase tracking-widest text-[#EDAC02] bg-[#EDAC02]/10 px-2 py-0.5 rounded mb-2">
              {badge}
            </span>
            <h3 className="text-xl font-black text-white uppercase italic leading-tight">{title}</h3>
            <p className="text-[#EDAC02] font-bold text-sm mt-0.5">{distance}</p>
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <Calendar size={12} className="text-[#EDAC02]" />
            <span>27/06/2026</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <MapPin size={12} className="text-[#EDAC02]" />
            <span>Club 415, Nova Lima — MG</span>
          </div>
        </div>

        <ul className="space-y-1 mb-4">
          {includes.map(item => (
            <li key={item} className="flex items-start gap-2 text-zinc-400 text-xs">
              <span className="text-[#EDAC02] mt-0.5 flex-shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <div className="mb-1.5">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Vagas preenchidas</span>
            <span className="text-[#EDAC02] font-bold">{pct}%</span>
          </div>
          <ProgressBar pct={pct} />
        </div>
      </div>

      <div className="px-5 pb-5">
        <a
          href={href}
          className="block w-full py-3.5 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest text-center hover:bg-[#d49b02] transition-colors rounded-xl skew-x-[-4deg]"
        >
          <span className="block skew-x-[4deg]">GARANTIR VAGA →</span>
        </a>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function InscricaoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 22 }}
        className="w-full max-w-sm bg-[#0d0d0d] border border-[#EDAC02]/30 rounded-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-black text-white uppercase tracking-widest text-sm">Escolha seu formato</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>
        <a
          href="/evento/8experience"
          className="flex items-center justify-between w-full px-4 py-4 border border-[#EDAC02]/30 bg-[#EDAC02]/5 hover:bg-[#EDAC02]/15 rounded-xl transition-colors group"
        >
          <div>
            <p className="font-black text-white text-sm uppercase">Experience</p>
            <p className="text-zinc-500 text-xs">500m por volta • Para quem está começando</p>
          </div>
          <ChevronRight size={18} className="text-[#EDAC02] group-hover:translate-x-1 transition-transform" />
        </a>
        <a
          href="/evento/8oficial"
          className="flex items-center justify-between w-full px-4 py-4 bg-[#EDAC02] hover:bg-[#d49b02] rounded-xl transition-colors group"
        >
          <div>
            <p className="font-black text-black text-sm uppercase">Oficial</p>
            <p className="text-black/60 text-xs">1km por volta • Distância oficial completa</p>
          </div>
          <ChevronRight size={18} className="text-black group-hover:translate-x-1 transition-transform" />
        </a>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LinkPage() {
  useSEO();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-white antialiased font-sans selection:bg-[#EDAC02] selection:text-black">

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-14 pb-10 min-h-[100svh] overflow-hidden">
        {/* Glow */}
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
          <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none text-white mb-2">
            8ª Edição<br /><span className="text-[#EDAC02]">UAIROX</span>
          </h1>

          {/* Subtitle */}
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest mt-3 mb-8">
            27 de junho • Nova Lima, MG
          </p>

          {/* Primary CTAs */}
          <div className="grid grid-cols-2 gap-3 w-full mb-3">
            <a
              href="/evento/8experience"
              className="flex flex-col items-center justify-center py-4 px-3 border-2 border-[#EDAC02] text-[#EDAC02] font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#EDAC02]/10 transition-colors text-center leading-tight"
            >
              <span className="text-[9px] text-[#EDAC02]/60 font-bold mb-0.5">Inscrição</span>
              EXPERIENCE<br />500m
            </a>
            <a
              href="/evento/8oficial"
              className="flex flex-col items-center justify-center py-4 px-3 bg-[#EDAC02] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#d49b02] transition-colors text-center leading-tight"
            >
              <span className="text-[9px] text-black/50 font-bold mb-0.5">Inscrição</span>
              OFICIAL<br />1km
            </a>
          </div>

          {/* Secondary link */}
          <a href="/#etapas" className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors">
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

      {/* ── 2. URGÊNCIA ─────────────────────────────────────────────────── */}
      <div className="bg-[#EDAC02] py-3 px-4 text-center">
        <p className="text-black font-black text-xs md:text-sm uppercase tracking-wide flex items-center justify-center gap-2 flex-wrap">
          <AlertTriangle size={14} className="flex-shrink-0" />
          Últimas vagas! Experience: 74% preenchida&nbsp;•&nbsp;Oficial: 76% preenchida
        </p>
      </div>

      {/* ── 3. O QUE É A UAIROX ─────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EDAC02] text-center mb-2">O que é</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase italic text-center text-white mb-10 leading-tight">
            Corrida + Força.<br />Um desafio completo.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: <Wind size={28} className="text-[#EDAC02]" />,
                title: 'Corra',
                desc: '8 km intercalados em 8 voltas de 1km',
              },
              {
                icon: <Dumbbell size={28} className="text-[#EDAC02]" />,
                title: 'Force',
                desc: '8 estações funcionais: Ski Erg, Sled, Rowing e mais',
              },
              {
                icon: <Trophy size={28} className="text-[#EDAC02]" />,
                title: 'Vença',
                desc: 'Medalha para todos os finishers',
              },
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

      {/* ── 4. FORMATOS ─────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-[#080808] border-y border-[#1a1a1a]">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EDAC02] text-center mb-2">Escolha seu formato</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase italic text-center text-white mb-10 leading-tight">
            Dois formatos.<br />Mesma adrenalina.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <EventCard
              badge="Para quem está começando"
              title="8ª Edição — Experience"
              distance="500m por volta"
              pct={74}
              href="/evento/8experience"
              includes={[
                'Medalha finisher',
                'Cronômetro oficial',
                'Estações oficiais em 500m',
              ]}
            />
            <EventCard
              badge="Distância oficial completa"
              title="8ª Edição — Oficial"
              distance="1km por volta"
              pct={76}
              href="/evento/8oficial"
              includes={[
                'Medalha finisher',
                'UAIROX Flag para top 3 de cada categoria',
                'Cronômetro oficial',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── 5. PROVA SOCIAL ─────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#EDAC02] text-center mb-2">Histórico</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase italic text-center text-white mb-10 leading-tight">
            8 edições.<br />Vagas que esgotam.
          </h2>

          {/* Números */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { num: '8ª', label: 'Edição' },
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

          {/* Galeria */}
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

      {/* ── STICKY CTA (mobile only) ─────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] p-3 bg-[#050505]/95 backdrop-blur-sm border-t border-[#1a1a1a]">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-4 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-xl hover:bg-[#d49b02] transition-colors"
        >
          GARANTIR MINHA VAGA →
        </button>
      </div>

      {/* Add bottom padding on mobile so sticky bar doesn't cover content */}
      <div className="md:hidden h-20" />

      {/* ── MODAL ─────────────────────────────────────────────────────────── */}
      {modalOpen && <InscricaoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
