import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, AtSign, Globe, MessageCircle, X, Upload, Loader2, Star, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrainingLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  logo_url: string | null;
  photos: string[];
  instagram: string | null;
  whatsapp: string | null;
  website: string | null;
  is_featured: boolean;
  status: string;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<TrainingLocation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    setLoading(true);
    // Fetch approved or active locations
    const { data } = await supabase
      .from('training_locations')
      .select('*')
      .or('status.eq.approved,is_active.eq.true')
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true });

    if (data) {
      setLocations(data.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address || '',
        city: loc.city || '',
        state: loc.state || 'MG',
        logo_url: loc.logo_url,
        photos: loc.photos || [],
        instagram: loc.instagram,
        whatsapp: loc.whatsapp,
        website: loc.website,
        is_featured: loc.is_featured || false,
        status: loc.status
      })));
    }
    setLoading(false);
  }

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(search.toLowerCase()) ||
    loc.city.toLowerCase().includes(search.toLowerCase())
  );

  const featuredLocations = filteredLocations.filter(loc => loc.is_featured);
  const regularLocations = filteredLocations.filter(loc => !loc.is_featured);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-500 selection:text-black">
      
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 border-b border-dark-border overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 grayscale" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block px-4 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-500 text-sm font-bold uppercase tracking-widest skew-x-[-10deg] mb-6">
              <span className="block skew-x-[10deg]">Comunidade Híbrida</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black uppercase italic leading-none mb-6">
              Onde <span className="text-brand-500">Treinar</span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed mb-10">
              Encontre CTs, Academias e Boxes parceiros da UAIROX perto de você e prepare-se para o próximo desafio com quem entende de Corrida Híbrida.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 skew-x-[5deg]" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou cidade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#111] border border-dark-border text-white placeholder:text-zinc-500 focus:border-brand-500 outline-none skew-x-[-5deg] font-bold"
                />
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-brand-500 text-black px-8 py-4 font-black uppercase italic skew-x-[-5deg] hover:bg-brand-400 transition-colors shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] whitespace-nowrap"
              >
                <span className="skew-x-[5deg] block">Cadastrar meu CT</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* LOCATIONS LIST */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-20 bg-[#111] border border-dark-border skew-x-[-2deg]">
              <div className="skew-x-[2deg]">
                <MapPin className="mx-auto mb-4 text-zinc-600" size={48} />
                <h3 className="font-black text-2xl text-white uppercase italic mb-2">Nenhum local encontrado</h3>
                <p className="text-zinc-400">Tente uma busca diferente ou cadastre o seu local.</p>
              </div>
            </div>
          ) : (
            <>
              {/* FEATURED LOCATIONS */}
              {featuredLocations.length > 0 && (
                <div className="mb-20">
                  <h2 className="text-2xl font-black text-white uppercase italic mb-8 flex items-center gap-3">
                    <span className="w-8 h-1 bg-brand-500"></span>
                    <Star className="text-brand-500 fill-brand-500" size={24} />
                    UAIROX Experience
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {featuredLocations.map((loc, idx) => (
                      <LocationCard key={loc.id} location={loc} index={idx} isFeatured={true} />
                    ))}
                  </div>
                </div>
              )}

              {/* REGULAR LOCATIONS */}
              {regularLocations.length > 0 && (
                <div>
                  <h2 className="text-2xl font-black text-white uppercase italic mb-8 flex items-center gap-3">
                    <span className="w-8 h-1 bg-zinc-700"></span>
                    Parceiros Oficiais
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularLocations.map((loc, idx) => (
                      <LocationCard key={loc.id} location={loc} index={idx} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </section>

      {/* REGISTRATION MODAL */}
      <RegistrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
    </div>
  );
}

// --- SUBCOMPONENTS ---

function LocationCard({ location, index, isFeatured }: { location: TrainingLocation, index: number, isFeatured?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-[#111] flex flex-col group relative overflow-hidden skew-x-[-2deg] transition-all hover:border-zinc-500 ${isFeatured ? 'border border-brand-500/50 shadow-[0_0_30px_-10px_rgba(237,172,2,0.2)]' : 'border border-dark-border'}`}
    >
      <div className="skew-x-[2deg] relative z-10 flex flex-col h-full">
        {/* Photo Square */}
        <div className="w-full aspect-square bg-dark-bg relative overflow-hidden border-b border-dark-border">
           {location.photos && location.photos.length > 0 ? (
             <img src={location.photos[0]} alt={location.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
           ) : (
             <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
               <ImageIcon size={48} className="text-zinc-800" />
             </div>
           )}

           {/* Logo Overlay Top Left */}
           <div className="absolute top-4 left-4 w-20 h-20 bg-dark-bg border border-dark-border flex items-center justify-center p-2 shadow-xl">
             {location.logo_url ? (
               <img src={location.logo_url} alt="Logo" className="w-full h-full object-contain" />
             ) : (
               <MapPin size={24} className="text-zinc-600" />
             )}
           </div>

           {/* Feature Badge if isFeatured */}
           {isFeatured && (
             <div className="absolute top-4 right-4 bg-brand-500 text-black text-xs font-black uppercase italic px-3 py-1.5 skew-x-[-10deg]">
               <span className="skew-x-[10deg] block flex items-center gap-1"><Star size={12} className="fill-black" /> Experience</span>
             </div>
           )}
        </div>

        {/* Info Area */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-black text-xl text-white uppercase italic leading-tight mb-1 truncate">{location.name}</h3>
          <p className="text-xs font-bold text-brand-500 uppercase tracking-widest flex items-center gap-1 mb-2">
            <MapPin size={12} /> {location.city} - {location.state}
          </p>
          <p className="text-sm text-zinc-400 line-clamp-2 flex-1">{location.address}</p>

          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-dark-border">
            {location.whatsapp && (
              <a href={`https://wa.me/55${location.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-brand-500 transition-colors">
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
            {location.instagram && (
              <a href={`https://instagram.com/${location.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-brand-500 transition-colors">
                <AtSign size={14} /> Insta
              </a>
            )}
            {location.website && (
              <a href={location.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-brand-500 transition-colors">
                <Globe size={14} /> Site
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- REGISTRATION MODAL ---

function RegistrationModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    whatsapp: '',
    instagram: '',
    website: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (photoFiles.length + newFiles.length > 3) {
        toast.error('Máximo de 3 fotos permitidas');
        return;
      }
      setPhotoFiles([...photoFiles, ...newFiles]);
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error } = await supabase.storage
      .from('training-locations')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('training-locations')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.city || !formData.state || !formData.address || !formData.whatsapp || !logoFile) {
      toast.error('Preencha todos os campos obrigatórios e envie a logo.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload Logo
      const logo_url = await uploadFile(logoFile, 'logos');

      // 2. Upload Photos
      const photos_urls = [];
      for (const file of photoFiles) {
        const url = await uploadFile(file, 'photos');
        photos_urls.push(url);
      }

      // 3. Insert DB
      const { error } = await supabase.from('training_locations').insert({
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        whatsapp: formData.whatsapp,
        instagram: formData.instagram,
        website: formData.website,
        logo_url: logo_url,
        photos: photos_urls,
        status: 'pending',
        is_featured: false,
        is_active: false
      } as any);

      if (error) throw error;

      toast.success('Cadastro enviado com sucesso! Aguarde nossa aprovação.');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao enviar cadastro: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-dark-bg border border-dark-border w-full max-w-2xl my-8 relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white z-10">
          <X size={24} />
        </button>
        
        <div className="p-8">
          <h2 className="text-3xl font-black text-white uppercase italic mb-2">Cadastre seu <span className="text-brand-500">Local</span></h2>
          <p className="text-zinc-400 mb-8">Junte-se à comunidade oficial UAIROX. Preencha os dados abaixo para análise.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nome do Local *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Logo do Local *</label>
                <label className="flex items-center justify-center gap-2 w-full bg-[#111] border border-dark-border border-dashed p-4 cursor-pointer hover:border-brand-500 transition-colors text-zinc-400 text-sm">
                  <Upload size={18} /> {logoFile ? logoFile.name : 'Escolher Arquivo'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Fotos do Local (Até 3)</label>
                <label className="flex items-center justify-center gap-2 w-full bg-[#111] border border-dark-border border-dashed p-4 cursor-pointer hover:border-brand-500 transition-colors text-zinc-400 text-sm">
                  <ImageIcon size={18} /> {photoFiles.length > 0 ? `${photoFiles.length} foto(s) selecionada(s)` : 'Adicionar Fotos'}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Endereço Completo *</label>
                <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Cidade *</label>
                <input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Estado (UF) *</label>
                <input required type="text" maxLength={2} value={formData.state} onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">WhatsApp *</label>
                <input required type="text" placeholder="(DD) 99999-9999" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Instagram</label>
                <input type="text" placeholder="@seu_box" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Website (Opcional)</label>
                <input type="url" placeholder="https://" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-brand-500 text-black px-8 py-4 font-black uppercase italic skew-x-[-10deg] hover:bg-brand-400 transition-colors disabled:opacity-50"
              >
                <span className="skew-x-[10deg] block flex items-center gap-2">
                  {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Enviando...</> : 'Enviar para Análise'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
