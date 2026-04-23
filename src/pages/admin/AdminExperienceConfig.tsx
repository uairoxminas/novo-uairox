import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useSiteConfig, useUpdateSiteConfig, ExperiencePageConfig } from '@/hooks/useSiteConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TabType = 'geral' | 'estacoes' | 'valores' | 'galeria';

export default function AdminExperienceConfig() {
  const { data: config, isLoading } = useSiteConfig();
  const updateConfig = useUpdateSiteConfig();
  
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [formData, setFormData] = useState<ExperiencePageConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config?.experience_page) {
      setFormData(config.experience_page);
    }
  }, [config]);

  if (isLoading || !formData) {
    return <div className="flex items-center justify-center py-20 text-brand-500"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({
        key: 'experience_page',
        value: formData
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `experience/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      toast.error('Erro ao fazer upload da imagem');
      return null;
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      setFormData({ ...formData, hero: { ...formData.hero, bg_image: url } });
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    toast.info(`Fazendo upload de ${files.length} imagem(ns)...`);
    
    const newUrls: string[] = [];
    for (const file of files) {
      const url = await uploadImage(file);
      if (url) newUrls.push(url);
    }

    setFormData({
      ...formData,
      gallery: {
        ...formData.gallery,
        images: [...formData.gallery.images, ...newUrls]
      }
    });
  };

  const removeGalleryImage = (index: number) => {
    const newImages = [...formData.gallery.images];
    newImages.splice(index, 1);
    setFormData({ ...formData, gallery: { ...formData.gallery, images: newImages } });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic flex items-center gap-2">
            ⚡ Experience <span className="text-brand-500">Config</span>
          </h1>
          <p className="text-zinc-400">Edite todo o conteúdo da página UAIROX Experience.</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-400 text-black font-black uppercase text-sm transition-colors rounded"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Salvar Alterações
        </button>
      </div>

      <div className="flex bg-[#111] p-1 rounded-lg border border-dark-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('geral')}
          className={`px-6 py-2 text-sm font-bold uppercase tracking-widest rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'geral' ? 'bg-brand-500 text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Textos & Textos
        </button>
        <button
          onClick={() => setActiveTab('estacoes')}
          className={`px-6 py-2 text-sm font-bold uppercase tracking-widest rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'estacoes' ? 'bg-brand-500 text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Formato & Prova
        </button>
        <button
          onClick={() => setActiveTab('valores')}
          className={`px-6 py-2 text-sm font-bold uppercase tracking-widest rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'valores' ? 'bg-brand-500 text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Valores & Negócio
        </button>
        <button
          onClick={() => setActiveTab('galeria')}
          className={`px-6 py-2 text-sm font-bold uppercase tracking-widest rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'galeria' ? 'bg-brand-500 text-black' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Galeria de Fotos
        </button>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        {activeTab === 'geral' && (
          <div className="space-y-8">
            {/* HERO */}
            <div>
              <h3 className="text-xl font-black text-brand-500 uppercase italic mb-4">Header / Hero</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Título Topo</label>
                  <input type="text" value={formData.hero.title_top} onChange={e => setFormData({...formData, hero: {...formData.hero, title_top: e.target.value}})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Título Destaque</label>
                  <input type="text" value={formData.hero.title_highlight} onChange={e => setFormData({...formData, hero: {...formData.hero, title_highlight: e.target.value}})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
                  <textarea value={formData.hero.description} onChange={e => setFormData({...formData, hero: {...formData.hero, description: e.target.value}})} rows={3} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Imagem de Fundo (Background)</label>
                  <div className="flex items-center gap-4">
                    {formData.hero.bg_image && (
                      <img src={formData.hero.bg_image} alt="Hero BG" className="h-16 w-32 object-cover rounded border border-dark-border" />
                    )}
                    <label className="cursor-pointer bg-[#111] border border-dark-border px-4 py-2 text-sm font-bold uppercase text-white hover:border-brand-500 transition-colors">
                      <ImageIcon size={16} className="inline mr-2" /> Alterar Imagem
                      <input type="file" className="hidden" accept="image/*" onChange={handleHeroImageUpload} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-dark-border" />

            {/* CTA */}
            <div>
              <h3 className="text-xl font-black text-brand-500 uppercase italic mb-4">Chamada (CTA Final)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Título</label>
                  <input type="text" value={formData.cta.title} onChange={e => setFormData({...formData, cta: {...formData.cta, title: e.target.value}})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
                  <input type="text" value={formData.cta.description} onChange={e => setFormData({...formData, cta: {...formData.cta, description: e.target.value}})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Texto do Botão</label>
                  <input type="text" value={formData.cta.button_text} onChange={e => setFormData({...formData, cta: {...formData.cta, button_text: e.target.value}})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Link do Botão</label>
                  <input type="text" value={formData.cta.button_link} onChange={e => setFormData({...formData, cta: {...formData.cta, button_link: e.target.value}})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'estacoes' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-brand-500 uppercase italic mb-4">Estações da Prova</h3>
            <p className="text-sm text-zinc-400 mb-4">Modifique o nome e a descrição/distância de cada uma das 8 estações.</p>
            
            {formData.format.stations.map((station, idx) => (
              <div key={idx} className="bg-[#111] border border-dark-border p-4 grid gap-4 md:grid-cols-2 items-center">
                <div className="font-black text-2xl text-brand-500 opacity-50 w-8">{idx + 1}</div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome (Ex: RUN 400 mts + UAIZONE 1)</label>
                  <input type="text" value={station.name} onChange={e => {
                    const newStations = [...formData.format.stations];
                    newStations[idx].name = e.target.value;
                    setFormData({...formData, format: {...formData.format, stations: newStations}});
                  }} className="w-full bg-dark-bg border border-dark-border p-2 text-white focus:border-brand-500 outline-none" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Desafio (Ex: 800 mts SKIERG)</label>
                  <input type="text" value={station.metric} onChange={e => {
                    const newStations = [...formData.format.stations];
                    newStations[idx].metric = e.target.value;
                    setFormData({...formData, format: {...formData.format, stations: newStations}});
                  }} className="w-full bg-dark-bg border border-dark-border p-2 text-white focus:border-brand-500 outline-none" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'valores' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-black text-brand-500 uppercase italic mb-4">Valores da Inscrição</h3>
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Preço Principal</label>
                  <input type="text" value={formData.pricing.default_price} onChange={e => setFormData({...formData, pricing: {...formData.pricing, default_price: e.target.value}})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">O que Inclui</label>
                  <input type="text" value={formData.pricing.includes} onChange={e => setFormData({...formData, pricing: {...formData.pricing, includes: e.target.value}})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">O que Não Inclui</label>
                  <input type="text" value={formData.pricing.excludes} onChange={e => setFormData({...formData, pricing: {...formData.pricing, excludes: e.target.value}})} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Opcional Finisher</label>
                  <textarea value={formData.pricing.optional} onChange={e => setFormData({...formData, pricing: {...formData.pricing, optional: e.target.value}})} rows={2} className="w-full bg-[#111] border border-dark-border p-3 text-white focus:border-brand-500 outline-none" />
                </div>
              </div>
            </div>

            <hr className="border-dark-border" />

            <div>
              <h3 className="text-xl font-black text-brand-500 uppercase italic mb-4">Modelo de Negócio (Repasses)</h3>
              <div className="space-y-4">
                {formData.business_model.tiers.map((tier, idx) => (
                  <div key={idx} className="bg-[#111] p-4 border border-dark-border grid gap-4 md:grid-cols-3 items-center">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Regra (Ex: 1 a 25 inscritos)</label>
                      <input type="text" value={tier.label} onChange={e => {
                        const newTiers = [...formData.business_model.tiers];
                        newTiers[idx].label = e.target.value;
                        setFormData({...formData, business_model: {...formData.business_model, tiers: newTiers}});
                      }} className="w-full bg-dark-bg border border-dark-border p-2 text-white focus:border-brand-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
                      <input type="text" value={tier.description} onChange={e => {
                        const newTiers = [...formData.business_model.tiers];
                        newTiers[idx].description = e.target.value;
                        setFormData({...formData, business_model: {...formData.business_model, tiers: newTiers}});
                      }} className="w-full bg-dark-bg border border-dark-border p-2 text-white focus:border-brand-500 outline-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'galeria' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-brand-500 uppercase italic">Galeria de Fotos</h3>
              <label className="cursor-pointer bg-[#111] border border-dark-border px-4 py-2 text-sm font-bold uppercase text-white hover:border-brand-500 transition-colors flex items-center gap-2">
                <Plus size={16} /> Adicionar Fotos
                <input type="file" className="hidden" multiple accept="image/*" onChange={handleGalleryUpload} />
              </label>
            </div>
            
            {formData.gallery.images.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-dark-border text-zinc-500">
                <ImageIcon className="mx-auto mb-2 opacity-50" size={32} />
                <p>Nenhuma foto na galeria do Experience.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.gallery.images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square bg-[#111] border border-dark-border rounded overflow-hidden">
                    <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeGalleryImage(idx)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
