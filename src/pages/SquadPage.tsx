import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SquadMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  bio: string | null;
  instagram: string | null;
}

export default function SquadPage() {
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSquad() {
      setLoading(true);
      const { data } = await supabase
        .from('partner_profiles')
        .select('id, full_name, avatar_url, role, bio, instagram_handle')
        .eq('is_public', true)
        .order('display_order', { ascending: true });

      if (data) {
        setMembers(data.map((m: any) => ({
          id: m.id,
          full_name: m.full_name || 'Squad Member',
          avatar_url: m.avatar_url,
          role: m.role || 'Athlete',
          bio: m.bio,
          instagram: m.instagram_handle,
        })));
      }
      setLoading(false);
    }
    fetchSquad();
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'elite_athlete':
      case 'elite athlete':
        return { label: 'Elite Athlete', color: 'var(--uairox-gold)' };
      case 'head_coach':
      case 'head coach':
        return { label: 'Head Coach', color: 'var(--status-success)' };
      case 'coach':
        return { label: 'Coach', color: '#60a5fa' };
      default:
        return { label: role, color: 'var(--uairox-zinc-light)' };
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-16 md:py-24 text-center">
        <div className="container-uairox max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--uairox-gold)]/30 bg-[var(--uairox-gold)]/5 text-[var(--uairox-gold)] text-xs font-semibold uppercase tracking-wider mb-6">
              <Crown size={14} />
              Programa Oficial
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white">
              Squad UAIROX
            </h1>
            <p className="mt-4 text-[var(--uairox-zinc-light)] text-base md:text-lg max-w-xl mx-auto">
              Conheça nossos embaixadores e treinadores oficiais.{' '}
              <strong className="text-white">Atletas de elite</strong> que representam a comunidade UAIROX.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Squad Grid */}
      <section className="pb-20">
        <div className="container-uairox">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-uairox h-72 animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-20">
              <Crown className="mx-auto mb-4 text-[var(--uairox-zinc)]" size={48} />
              <h3 className="font-heading text-lg text-white">Squad em formação</h3>
              <p className="mt-2 text-sm text-[var(--uairox-zinc-light)]">
                Em breve nossos embaixadores estarão aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((member, index) => {
                const badge = getRoleBadge(member.role);
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card-uairox p-6 text-center"
                  >
                    {/* Avatar */}
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-[var(--uairox-gold)]/40">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[var(--uairox-space-surface)] flex items-center justify-center text-[var(--uairox-zinc)]">
                            <Crown size={32} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="font-heading text-base text-white">{member.full_name}</h3>

                    {/* Role Badge */}
                    <span
                      className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        color: badge.color,
                        border: `1px solid ${badge.color}`,
                        backgroundColor: `${badge.color}15`,
                      }}
                    >
                      {badge.label}
                    </span>

                    {/* Bio */}
                    {member.bio && (
                      <p className="mt-4 text-sm text-[var(--uairox-zinc-light)] leading-relaxed line-clamp-3">
                        {member.bio}
                      </p>
                    )}

                    {/* Instagram */}
                    {member.instagram && (
                      <a
                        href={`https://instagram.com/${member.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 btn-outline w-full py-2.5 text-xs"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                        Seguir no Instagram
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
