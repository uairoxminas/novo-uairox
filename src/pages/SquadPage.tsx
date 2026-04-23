import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Star, MapPin, Users, Check, X, Award, Medal, Trophy, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSiteConfig } from '@/hooks/useSiteConfig';

type SquadRole = 'coach' | 'athlete' | 'influencer';
type SquadTier = 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'elite';

interface SquadMember {
  id: string;
  full_name: string;
  role: SquadRole;
  tier: SquadTier;
  location: string;
  bio: string | null;
  instagram_handle: string | null;
  avatar_url: string | null;
}

const TIER_COLORS = {
  iniciante: 'var(--uairox-zinc)',
  bronze: '#cd7f32',
  prata: '#c0c0c0',
  ouro: '#ffd700',
  elite: '#e11d48', // Red for Elite/Blood
};

const TIER_ICONS = {
  iniciante: Star,
  bronze: Medal,
  prata: Medal,
  ouro: Trophy,
  elite: Crown,
};

// ============ APPLICATION MODAL ============
function ApplicationModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    instagram_handle: '',
    role: 'coach' as SquadRole,
    location: '',
    why_join: '',
    avatar_url: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let finalAvatarUrl = '';

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `squad_avatars/${fileName}`;

        // Using the same bucket structure as site-assets or a generic public one. We'll use 'kits' or 'site-assets'
        // Trying site-assets since it's the default for site configs
        const { error: uploadError } = await supabase.storage
          .from('site-assets')
          .upload(filePath, avatarFile);

        if (uploadError) {
          console.error("Upload error (fallback to no avatar):", uploadError);
        } else {
          const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
          finalAvatarUrl = data.publicUrl;
        }
      }

      const applicationData = {
        ...formData,
        avatar_url: finalAvatarUrl
      };

      const { error } = await (supabase.from('squad_applications' as any) as any).insert([applicationData]);
      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Erro ao enviar solicitação. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-dark-border w-full max-w-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white">
          <X size={20} />
        </button>

        <div className="p-6 md:p-8">
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-brand-500/10 border border-brand-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="text-brand-500" size={32} />
              </div>
              <h2 className="text-2xl font-black text-white uppercase italic mb-2">Solicitação Enviada!</h2>
              <p className="text-zinc-400 font-inter">
                Nossa equipe vai analisar seu perfil e entrará em contato pelo WhatsApp ou Instagram em breve.
              </p>
              <button
                onClick={onClose}
                className="mt-8 px-8 py-3 bg-brand-500 text-white font-black uppercase tracking-widest text-sm skew-x-[-10deg] hover:bg-brand-400 transition-colors"
              >
                <span className="inline-block skew-x-[10deg]">Fechar</span>
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black text-white uppercase italic mb-1">Junte-se ao Esquadrão</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Preencha o formulário abaixo para se candidatar como embaixador oficial.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group cursor-pointer mb-2">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dark-border bg-[#111] flex items-center justify-center">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="text-zinc-500 group-hover:text-brand-500 transition-colors" />
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </div>
                  <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Sua Foto (Opcional)</p>
                </div>

                <input
                  required
                  type="text"
                  placeholder="Nome Completo"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    required
                    type="email"
                    placeholder="E-mail"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none"
                  />
                  <input
                    required
                    type="tel"
                    placeholder="WhatsApp"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    required
                    type="text"
                    placeholder="@ do Instagram"
                    value={formData.instagram_handle}
                    onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                    className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none"
                  />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as SquadRole })}
                    className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none appearance-none"
                  >
                    <option value="coach">Coach (Treinador)</option>
                    <option value="athlete">Atleta</option>
                    <option value="influencer">Influenciador</option>
                  </select>
                </div>
                <input
                  required
                  type="text"
                  placeholder="Local de Treino / Box (Ex: Belo Horizonte, MG)"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none"
                />
                <textarea
                  required
                  rows={4}
                  placeholder="Por que você quer ser um embaixador UAIROX? Como você pode ajudar a comunidade a crescer?"
                  value={formData.why_join}
                  onChange={(e) => setFormData({ ...formData, why_join: e.target.value })}
                  className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none resize-none"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 py-4 bg-brand-500 text-black font-black uppercase tracking-widest text-sm skew-x-[-10deg] hover:bg-brand-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="inline-block skew-x-[10deg]">
                    {loading ? 'Enviando...' : 'Enviar Solicitação'}
                  </span>
                  {loading && <Loader2 size={16} className="animate-spin skew-x-[10deg]" />}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ MAIN SQUAD PAGE ============
export default function SquadPage() {
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: config } = useSiteConfig();
  
  const squadConfig = config?.squad_page || {
    badge_text: 'Embaixadores Oficiais',
    title: 'O Motor do UAIROX',
    description: 'Conheça os Coaches, Atletas e Influencers que movimentam a nossa comunidade. O SQUAD é o nosso programa de recompensas para quem ajuda o esporte a crescer.',
    cta_button_text: 'Quero fazer parte do Squad'
  };

  useEffect(() => {
    async function fetchSquad() {
      setLoading(true);
        try {
        const { data, error } = await (supabase.from('squad_members' as any) as any)
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        if (data) setMembers(data as SquadMember[]);
      } catch (err) {
        console.error('Error fetching squad:', err);
        // Supress error locally if table doesn't exist yet during setup
      } finally {
        setLoading(false);
      }
    }
    fetchSquad();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 text-center border-b border-dark-border">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/5 text-brand-500 text-xs font-bold uppercase tracking-widest mb-6">
              <Crown size={14} /> {squadConfig.badge_text}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic mb-4">
              {squadConfig.title}
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl font-inter max-w-2xl mx-auto mb-8">
              {squadConfig.description}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-4 bg-brand-500 text-black font-black uppercase tracking-widest text-sm skew-x-[-10deg] hover:bg-brand-400 transition-transform hover:scale-105"
            >
              <span className="inline-block skew-x-[10deg]">{squadConfig.cta_button_text}</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-16 md:py-24 border-b border-dark-border bg-dark-bg/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-white uppercase italic">{squadConfig.benefits_title || 'Benefícios & Níveis'}</h2>
            <p className="text-zinc-500 mt-2">{squadConfig.benefits_subtitle || 'Como funciona a mecânica do programa'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { id: 'bronze', label: squadConfig.tier_bronze_label || 'Bronze', desc: squadConfig.tier_bronze_desc || 'Acesso VIP + Descontos em Loja.', color: TIER_COLORS.bronze },
              { id: 'prata', label: squadConfig.tier_prata_label || 'Prata', desc: squadConfig.tier_prata_desc || 'Isenção de inscrição em 1 evento.', color: TIER_COLORS.prata },
              { id: 'ouro', label: squadConfig.tier_ouro_label || 'Ouro', desc: squadConfig.tier_ouro_desc || 'Kits exclusivos e Isenção Total.', color: TIER_COLORS.ouro },
              { id: 'elite', label: squadConfig.tier_elite_label || 'Elite', desc: squadConfig.tier_elite_desc || 'Patrocínio Oficial UAIROX e Vagas.', color: TIER_COLORS.elite },
            ].map((tier) => (
              <div key={tier.id} className="bg-[#050505] border border-dark-border p-6 text-center hover:border-brand-500 transition-colors">
                <div 
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 border-2"
                  style={{ borderColor: tier.color, backgroundColor: `${tier.color}10`, color: tier.color }}
                >
                  <Award size={28} />
                </div>
                <h3 className="text-white font-black uppercase text-xl mb-2" style={{ color: tier.color }}>{tier.label}</h3>
                <p className="text-zinc-400 text-sm font-inter">{tier.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roster Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-white uppercase italic">O Esquadrão</h2>
            <p className="text-zinc-500 mt-2">Nossos parceiros oficiais divididos por nível</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 bg-dark-card border border-dark-border animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-20 bg-dark-card border border-dark-border">
              <Users className="mx-auto mb-4 text-zinc-700" size={48} />
              <h3 className="text-white font-black uppercase italic text-xl">Squad em formação</h3>
              <p className="mt-2 text-zinc-500 text-sm">
                Seja um dos primeiros a entrar para o nosso time de embaixadores oficiais!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {members.map((member, index) => {
                const TierIcon = TIER_ICONS[member.tier] || Star;
                const tierColor = TIER_COLORS[member.tier] || TIER_COLORS.iniciante;

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative bg-[#0a0a0a] border border-dark-border hover:border-brand-500 transition-all overflow-hidden flex flex-col"
                  >
                    {/* Top Tier Bar */}
                    <div className="h-1.5 w-full" style={{ backgroundColor: tierColor }} />

                    <div className="p-6 flex-1 flex flex-col items-center text-center">
                      {/* Avatar */}
                      <div className="relative w-28 h-28 mb-4">
                        <div 
                          className="w-full h-full rounded-full overflow-hidden border-[3px]"
                          style={{ borderColor: tierColor }}
                        >
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#111] flex items-center justify-center text-zinc-600">
                              <Users size={32} />
                            </div>
                          )}
                        </div>
                        {/* Tier Badge */}
                        <div 
                          className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: tierColor, color: '#000' }}
                          title={`Nível: ${member.tier.toUpperCase()}`}
                        >
                          <TierIcon size={16} />
                        </div>
                      </div>

                      {/* Name & Role */}
                      <h3 className="font-black text-white text-lg uppercase leading-tight mb-1">{member.full_name}</h3>
                      <span className="text-brand-500 text-xs font-bold uppercase tracking-widest mb-3">
                        {member.role === 'coach' ? 'Coach' : member.role === 'athlete' ? 'Atleta' : 'Influencer'}
                      </span>

                      {/* Location */}
                      {member.location && (
                        <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-4">
                          <MapPin size={12} /> {member.location}
                        </div>
                      )}

                      {/* Bio */}
                      {member.bio && (
                        <p className="text-zinc-500 text-sm font-inter line-clamp-3 mb-6">
                          "{member.bio}"
                        </p>
                      )}

                      <div className="mt-auto w-full pt-4 border-t border-dark-border/50">
                        {/* Instagram Link */}
                        {member.instagram_handle ? (
                          <a
                            href={`https://instagram.com/${member.instagram_handle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 bg-[#111] hover:bg-brand-500 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg> Seguir
                          </a>
                        ) : (
                          <div className="py-2 text-zinc-600 text-xs font-bold uppercase tracking-widest">
                            SQUAD UAIROX
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Application Modal */}
      <AnimatePresence>
        {isModalOpen && <ApplicationModal onClose={() => setIsModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
