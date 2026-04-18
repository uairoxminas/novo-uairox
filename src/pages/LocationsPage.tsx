import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ExternalLink, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TrainingLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  category: string;
  logo_url: string | null;
  maps_url: string | null;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<TrainingLocation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLocations() {
      setLoading(true);
      const { data } = await supabase
        .from('training_locations')
        .select('*')
        .eq('is_active' as any, true)
        .order('name', { ascending: true });

      if (data) {
        setLocations(data.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          address: loc.address || '',
          city: loc.city || '',
          state: loc.state || 'MG',
          category: loc.category || 'Box',
          logo_url: loc.logo_url,
          maps_url: loc.maps_url,
        })));
      }
      setLoading(false);
    }
    fetchLocations();
  }, []);

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(search.toLowerCase()) ||
    loc.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-16 md:py-24">
        <div className="container-uairox">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-white">
              Onde <span className="text-gradient-gold">Treinar</span>
            </h1>
            <p className="mt-4 text-[var(--uairox-zinc-light)] max-w-xl">
              Encontre boxes e academias parceiras da UAIROX perto de você.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search */}
      <section className="pb-8">
        <div className="container-uairox">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--uairox-zinc)]" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[var(--uairox-space-card)] border border-white/10 rounded-xl text-white placeholder:text-[var(--uairox-zinc)] focus:border-[var(--uairox-gold)]/50 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Locations Grid */}
      <section className="pb-20">
        <div className="container-uairox">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-uairox h-40 animate-pulse" />
              ))}
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-20">
              <MapPin className="mx-auto mb-4 text-[var(--uairox-zinc)]" size={48} />
              <h3 className="font-heading text-lg text-white">Nenhum local encontrado</h3>
              <p className="mt-2 text-sm text-[var(--uairox-zinc-light)]">
                Tente uma busca diferente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLocations.map((loc, index) => (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card-uairox p-5 flex items-start gap-4"
                >
                  {/* Logo */}
                  <div className="w-14 h-14 rounded-xl bg-[var(--uairox-space-surface)] border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                    {loc.logo_url ? (
                      <img src={loc.logo_url} alt={loc.name} className="w-full h-full object-cover" />
                    ) : (
                      <MapPin size={20} className="text-[var(--uairox-gold)]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-sm text-white truncate">{loc.name}</h3>
                    <p className="text-xs text-[var(--uairox-zinc-light)] mt-1">
                      {loc.city}/{loc.state}
                    </p>
                    {loc.address && (
                      <p className="text-xs text-[var(--uairox-zinc)] mt-0.5 truncate">{loc.address}</p>
                    )}
                    {loc.maps_url && (
                      <a
                        href={loc.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-[var(--uairox-gold)] hover:underline"
                      >
                        Ver no mapa <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
