import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image_url: string | null;
  status: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (!error && data) {
        setEvents(data as unknown as Event[]);
      }
      setLoading(false);
    }
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="py-16 md:py-24">
        <div className="container-uairox">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white">
              Próximos <span className="text-gradient-gold">Eventos</span>
            </h1>
            <p className="mt-4 text-[var(--uairox-zinc-light)] text-base md:text-lg max-w-xl">
              Encontre a competição mais perto de você e inscreva-se para testar seus limites.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="pb-8">
        <div className="container-uairox">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--uairox-zinc)]" size={18} />
              <input
                type="text"
                placeholder="Buscar eventos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[var(--uairox-space-card)] border border-white/10 rounded-xl text-white placeholder:text-[var(--uairox-zinc)] focus:border-[var(--uairox-gold)]/50 focus:outline-none transition-colors"
              />
            </div>
            <button className="btn-outline py-3 px-6 text-xs">
              <SlidersHorizontal size={16} />
              Filtros
            </button>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="pb-20">
        <div className="container-uairox">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-uairox h-80 animate-pulse">
                  <div className="h-48 bg-white/5 rounded-t-[var(--radius)]" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="mx-auto mb-4 text-[var(--uairox-zinc)]" size={48} />
              <h3 className="font-heading text-lg text-white">Nenhum evento encontrado</h3>
              <p className="mt-2 text-sm text-[var(--uairox-zinc-light)]">
                Novos eventos serão anunciados em breve.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={`/events/${event.id}`} className="block">
                    <div className="card-uairox overflow-hidden group">
                      {/* Banner */}
                      <div className="relative h-48 bg-[var(--uairox-space-surface)] overflow-hidden">
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <img src="/logo-uairox.png" alt="UAIROX" className="h-12 opacity-30" />
                          </div>
                        )}
                        {/* Status badge */}
                        {event.status === 'open' && (
                          <span className="absolute top-3 right-3 badge-status badge-open text-xs">
                            Inscrições Abertas
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-5 space-y-3">
                        <h3 className="font-heading text-base text-white group-hover:text-[var(--uairox-gold)] transition-colors line-clamp-2">
                          {event.title}
                        </h3>
                        <div className="space-y-1.5 text-sm text-[var(--uairox-zinc-light)]">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-[var(--uairox-gold)]" />
                            {new Date(event.date).toLocaleDateString('pt-BR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-[var(--uairox-gold)]" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
