import { useState, useEffect } from "react";
import { useSiteConfig, useUpdateSiteConfig } from "@/hooks/useSiteConfig";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Trash2, Play } from 'lucide-react';
export default function AdminLandingConfig() {
  const { data: config, isLoading } = useSiteConfig();
  const updateConfig = useUpdateSiteConfig();

  const [heroConfig, setHeroConfig] = useState(config?.home_hero_new || {
    badge_text: '', title_top: '', title_highlight: '', subtitle: '', description: '', cta_primary_text: '', cta_primary_link: '', background_images: []
  });
  const [experienceConfig, setExperienceConfig] = useState(config?.home_experience_new || {
    badge_text: '', title_top: '', title_highlight: '', description: '', btn_primary_text: '', btn_primary_link: '', btn_secondary_text: '', btn_secondary_link: '', images: []
  });
  const [sponsorsConfig, setSponsorsConfig] = useState(config?.home_sponsors_new || {
    title: 'PARCEIROS E PATROCINADORES', sponsors: []
  });
  const [formatConfig, setFormatConfig] = useState(config?.home_format_new || {
    title_prefix: '', title_highlight: '', description: '', stations: [], race_types: []
  });
  const [eventsConfig, setEventsConfig] = useState(config?.home_events_new || {
    title_prefix: '', title_highlight: '', description: '', season_label: '',
    experience_title: 'Eventos Experience', experience_description: 'Eventos não competitivos que simulam a prova oficial com distância de corrida e cargas reduzidas',
    oficial_title: 'Eventos Oficiais', oficial_description: 'Competições oficiais UAIROX com percurso completo e ranking válido'
  });
  const [predictorConfig, setPredictorConfig] = useState(config?.home_predictor_new || {
    badge_text: '', title_top: '', title_highlight: '', description: ''
  });
  const [footerConfig, setFooterConfig] = useState(config?.home_footer || {
    description: 'Desenhado para atletas de endurance. Prepare-se para a corrida híbrida definitiva de Minas Gerais.',
    ig_link: '#',
    yt_link: '#',
    copyright: '© 2026 UAIROX Hybrid Racing. Todos os direitos reservados.'
  });
  const [whatsappConfig, setWhatsappConfig] = useState(config?.whatsapp_support || {
    whatsapp_link: "https://wa.me/5531999999999"
  });
  const [squadPageConfig, setSquadPageConfig] = useState(config?.squad_page || {
    badge_text: 'Embaixadores Oficiais',
    title: 'O Motor do UAIROX',
    description: 'Conheça os Coaches, Atletas e Influencers que movimentam a nossa comunidade. O SQUAD é o nosso programa de recompensas para quem ajuda o esporte a crescer.',
    cta_button_text: 'Quero fazer parte do Squad',
    benefits_title: "Benefícios & Níveis",
    benefits_subtitle: "Como funciona a mecânica do programa",
    tier_bronze_label: "Bronze",
    tier_bronze_desc: "Acesso VIP + Descontos em Loja.",
    tier_prata_label: "Prata",
    tier_prata_desc: "Isenção de inscrição em 1 evento.",
    tier_ouro_label: "Ouro",
    tier_ouro_desc: "Kits exclusivos e Isenção Total.",
    tier_elite_label: "Elite",
    tier_elite_desc: "Patrocínio Oficial UAIROX e Vagas."
  });

  const [isUploading, setIsUploading] = useState(false);
  const [editingRaceTypeIdx, setEditingRaceTypeIdx] = useState(0);

  useEffect(() => {
    if (config?.home_hero_new) setHeroConfig(config.home_hero_new);
    if (config?.home_experience_new) setExperienceConfig(config.home_experience_new);
    if (config?.home_sponsors_new) setSponsorsConfig(config.home_sponsors_new);
    if (config?.home_format_new) setFormatConfig(config.home_format_new);
    if (config?.home_events_new) setEventsConfig(config.home_events_new);
    if (config?.home_predictor_new) setPredictorConfig(config.home_predictor_new);
    if (config?.home_footer) setFooterConfig(config.home_footer);
    if (config?.squad_page) setSquadPageConfig(config.squad_page);
    if (config?.whatsapp_support) setWhatsappConfig(config.whatsapp_support);
    
    // Migração em tempo de execução para os 3 tipos de prova (Race Types legados)
    if (config?.home_format_new) {
      let fmt = { ...config.home_format_new };
      if (!fmt.race_types || fmt.race_types.length === 0) {
        fmt.race_types = [
          { id: '1', name: 'Open / Principal', stations: fmt.stations || [] }
        ];
      }
      setFormatConfig(fmt);
    }
  }, [config]);

  const handleSaveHero = () => updateConfig.mutate({ key: "home_hero_new", value: heroConfig });
  const handleSaveExperience = () => updateConfig.mutate({ key: "home_experience_new", value: experienceConfig });
  const handleSaveSponsors = () => updateConfig.mutate({ key: "home_sponsors_new", value: sponsorsConfig });
  const handleSaveFormat = () => updateConfig.mutate({ key: "home_format_new", value: formatConfig });
  const handleSaveEvents = () => updateConfig.mutate({ key: "home_events_new", value: eventsConfig });
  const handleSavePredictor = () => updateConfig.mutate({ key: "home_predictor_new", value: predictorConfig });
  const handleSaveFooter = () => updateConfig.mutate({ key: "home_footer", value: footerConfig });
  const handleSaveSquad = () => updateConfig.mutate({ key: "squad_page", value: squadPageConfig });
  const handleSaveWhatsapp = () => updateConfig.mutate({ key: "whatsapp_support", value: whatsappConfig });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Maximum constraint scale
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convertendo magicamente para WEBP 80%
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);

          setHeroConfig(prev => {
            const up = {
              ...(prev || {}),
              background_images: [...(prev?.background_images || []), compressedDataUrl]
            } as any;
            
            // Já manda salvar logo no banco de dados para evitar erro
            setTimeout(() => {
                updateConfig.mutate({ key: "home_hero_new", value: up });
            }, 100);

            return up;
          });

          setIsUploading(false);
          alert("✓ Foto processada, espremida (WebP) e Salva!");
        };
      };
    } catch (error: any) {
      alert("Erro ao processar imagem.");
      setIsUploading(false);
    }
    
    // resetar input
    e.target.value = '';
  };

  const handleSponsorLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, sponsorIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Constraints for sponsor logos (height is more important for marquee)
          const MAX_HEIGHT = 400;

          if (height > MAX_HEIGHT) {
            const ratio = MAX_HEIGHT / height;
            width = width * ratio;
            height = MAX_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // WEBP 80%
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);

          setSponsorsConfig(prev => {
            const up = { ...prev };
            if (!up.sponsors) up.sponsors = [];
            
            if (typeof sponsorIndex === 'number' && sponsorIndex >= 0) {
              // Update existing
              up.sponsors[sponsorIndex].logo_url = compressedDataUrl;
            } else {
              // Add new
              up.sponsors.push({
                id: Date.now().toString(),
                name: 'Novo Patrocinador',
                logo_url: compressedDataUrl,
                link: ''
              });
            }

            // Auto-save
            setTimeout(() => {
              updateConfig.mutate({ key: "home_sponsors_new", value: up });
            }, 100);

            return up as any;
          });

          setIsUploading(false);
          alert("✓ Logo processada e salva com sucesso!");
        };
      };
    } catch (error: any) {
      alert("Erro ao processar logo do patrocinador.");
      setIsUploading(false);
    }
    
    e.target.value = '';
  };

  const handleStationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, rIdx: number, sIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Maximum constraint scale for background station cards
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = width * ratio;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to WEBP agressivo (60%) para manter o banco leve já que a imagem fica embasada atrás
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.6);

          setFormatConfig(prev => {
            const up = { ...prev };
            if (up.race_types) {
              const newRT = [...up.race_types];
              newRT[rIdx].stations[sIdx].image_url = compressedDataUrl;
              up.race_types = newRT;
            }
            return up as any;
          });
        };
      };
    } catch {
      alert("Erro ao processar imagem da estação.");
    }
    
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setHeroConfig(prev => {
      const newImages = [...(prev?.background_images || [])];
      newImages.splice(index, 1);
      return { ...prev, background_images: newImages } as any;
    });
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-8 max-w-4xl font-sans">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Configuração da Landing Page</h1>
        <p className="text-zinc-400">Personalize os textos principais do site.</p>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-brand-500 mb-4">Hero Section (Topo)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Badge Text</label>
            <input 
              type="text" 
              className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white"
              value={heroConfig?.badge_text || ''}
              onChange={(e) => setHeroConfig(prev => ({...(prev || {}), badge_text: e.target.value}) as any)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Título Principal</label>
            <input 
              type="text" 
              className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white"
              value={heroConfig?.title_top || ''}
              onChange={(e) => setHeroConfig(prev => ({...(prev || {}), title_top: e.target.value}) as any)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Subtítulo</label>
            <input 
              type="text" 
              className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white"
              value={heroConfig?.title_highlight || ''}
              onChange={(e) => setHeroConfig(prev => ({...(prev || {}), title_highlight: e.target.value}) as any)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">Descrição Longa</label>
          <textarea 
            className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white h-24"
            value={heroConfig?.description || ''}
            onChange={(e) => setHeroConfig(prev => ({...(prev || {}), description: e.target.value}) as any)}
          ></textarea>
        </div>

        <div className="pt-4 border-t border-dark-border">
          <label className="block text-sm font-bold text-zinc-400 mb-4">Fotos de Fundo do Carrossel (Upload Direto)</label>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {heroConfig?.background_images?.map((url, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden border border-dark-border aspect-video bg-dark-card">
                <img src={url} alt={`Hero ${index}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500/80 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 text-white"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            
            <label className="relative border-2 border-dashed border-dark-border rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-500/5 transition-colors">
              <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={handleFileUpload} />
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-zinc-400 mb-2" />
                  <span className="text-xs text-zinc-500 font-medium">Adicionar Foto</span>
                </>
              )}
            </label>
          </div>
          
          <p className="text-xs text-zinc-500">
            Tamanhos recomendados:<br/>
            - Desktop (Tela Cheia): <strong>1920x1080 pixels (Formato Horizontal 16:9)</strong>.<br/>
            * Como o site é responsivo, ele vai cortar as laterais no celular em vez de amassar a foto. Dica: foque as ações principais no centro da imagem.
          </p>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={handleSaveHero}
            className="bg-brand-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-500 disabled:opacity-50"
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
      

      
      <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-brand-500 mb-4">UAIROX Experience</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Badge Text</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={experienceConfig?.badge_text || ''} onChange={(e) => setExperienceConfig(prev => ({...(prev || {}), badge_text: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Título Topo</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={experienceConfig?.title_top || ''} onChange={(e) => setExperienceConfig(prev => ({...(prev || {}), title_top: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Destaque de Título</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={experienceConfig?.title_highlight || ''} onChange={(e) => setExperienceConfig(prev => ({...(prev || {}), title_highlight: e.target.value}) as any)} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Botão 1 - Texto (Ex: Saber Mais)</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={experienceConfig?.btn_primary_text || ''} onChange={(e) => setExperienceConfig(prev => ({...(prev || {}), btn_primary_text: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Botão 1 - Link</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={experienceConfig?.btn_primary_link || ''} onChange={(e) => setExperienceConfig(prev => ({...(prev || {}), btn_primary_link: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Botão 2 - Texto (Ex: Falar com Consultor)</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={experienceConfig?.btn_secondary_text || ''} onChange={(e) => setExperienceConfig(prev => ({...(prev || {}), btn_secondary_text: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Botão 2 - Link</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={experienceConfig?.btn_secondary_link || ''} onChange={(e) => setExperienceConfig(prev => ({...(prev || {}), btn_secondary_link: e.target.value}) as any)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">Descrição</label>
          <textarea className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white h-24" value={experienceConfig?.description || ''} onChange={(e) => setExperienceConfig(prev => ({...(prev || {}), description: e.target.value}) as any)}></textarea>
        </div>

        <div className="pt-4 border-t border-dark-border">
          <label className="block text-sm font-bold text-zinc-400 mb-4">Fotos do Grid (Até 4 fotos, Upload Direto)</label>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {experienceConfig?.images?.map((url: string, index: number) => (
              <div key={index} className="relative group rounded-lg overflow-hidden border border-dark-border aspect-square bg-dark-card">
                <img src={url} alt={`Exp ${index}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => {
                    setExperienceConfig(prev => {
                      const newImages = [...(prev?.images || [])];
                      newImages.splice(index, 1);
                      return { ...prev, images: newImages } as any;
                    });
                  }}
                  className="absolute top-2 right-2 bg-red-500/80 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 text-white"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            
            {(experienceConfig?.images?.length || 0) < 4 && (
              <label className="relative border-2 border-dashed border-dark-border rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-500/5 transition-colors">
                <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsUploading(true);
                  try {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = (event) => {
                      const img = new Image();
                      img.src = event.target?.result as string;
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
                        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                          width = width * ratio;
                          height = height * ratio;
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);

                        const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);

                        setExperienceConfig(prev => {
                          const up = {
                            ...(prev || {}),
                            images: [...(prev?.images || []), compressedDataUrl]
                          } as any;
                          return up;
                        });
                        setIsUploading(false);
                      };
                    };
                  } catch (error: any) {
                    alert("Erro ao processar imagem.");
                    setIsUploading(false);
                  }
                  e.target.value = '';
                }} />
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-zinc-400 mb-2" />
                    <span className="text-xs text-zinc-500 font-medium text-center">Adicionar<br/>Foto</span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSaveExperience} className="bg-brand-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-500 disabled:opacity-50" disabled={updateConfig.isPending}>Salvar Experience</button>
        </div>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-[#EDAC02] mb-4">Parceiros e Patrocinadores (Marquee Animado)</h2>
        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">Título da Faixa</label>
          <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={sponsorsConfig?.title || ''} onChange={(e) => setSponsorsConfig(prev => ({...(prev || {}), title: e.target.value}) as any)} />
        </div>
        
        <div className="border-t border-dark-border pt-6 mt-6">
          <h3 className="text-lg font-bold text-white mb-4">Logomarcas (Object Contain e Filtro P&B Automático)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {sponsorsConfig?.sponsors?.map((sponsor: any, idx: number) => (
              <div key={sponsor.id || idx} className="bg-dark-card border border-dark-border rounded-lg p-4 flex flex-col gap-3 relative">
                <div className="bg-[#EDAC02] h-20 rounded p-2 flex items-center justify-center relative overflow-hidden group">
                   <img src={sponsor.logo_url} alt="Logo" className="w-full h-full object-contain brightness-0" />
                   <label className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-bold text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      Mudar Logo
                      <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => handleSponsorLogoUpload(e, idx)} />
                   </label>
                </div>
                
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Nome da Empresa</label>
                  <input type="text" className="w-full bg-dark-bg border border-[#262626] rounded p-1.5 text-sm text-white" value={sponsor.name} onChange={(e) => {
                    const newSponsors = [...(sponsorsConfig.sponsors || [])];
                    newSponsors[idx].name = e.target.value;
                    setSponsorsConfig({...sponsorsConfig, sponsors: newSponsors} as any);
                  }} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Link do Site / Insta (Opcional)</label>
                  <input type="text" placeholder="https://" className="w-full bg-dark-bg border border-[#262626] rounded p-1.5 text-sm text-white" value={sponsor.link || ''} onChange={(e) => {
                    const newSponsors = [...(sponsorsConfig.sponsors || [])];
                    newSponsors[idx].link = e.target.value;
                    setSponsorsConfig({...sponsorsConfig, sponsors: newSponsors} as any);
                  }} />
                </div>
                
                <button onClick={() => {
                  const newSponsors = [...(sponsorsConfig.sponsors || [])];
                  newSponsors.splice(idx, 1);
                  setSponsorsConfig({...sponsorsConfig, sponsors: newSponsors} as any);
                }} className="absolute top-2 right-2 bg-red-500 text-white rounded p-1 opacity-50 hover:opacity-100"><Trash2 size={14}/></button>
              </div>
            ))}
            
            <label className="bg-dark-card border-2 border-dashed border-dark-border rounded-lg min-h-[160px] flex flex-col items-center justify-center text-zinc-400 hover:text-brand-500 hover:border-brand-500 cursor-pointer transition-colors p-4">
              <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => handleSponsorLogoUpload(e)} />
              {isUploading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 mb-2" />
                  <span className="font-bold text-sm">Adicionar Logo</span>
                </>
              )}
            </label>
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-dark-border">
          <button onClick={handleSaveSponsors} className="bg-brand-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-500 disabled:opacity-50" disabled={updateConfig.isPending}>Salvar Patrocinadores</button>
        </div>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-brand-500 mb-4">UAIROX Predictor (Gamificação)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Badge Text</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={predictorConfig?.badge_text || ''} onChange={(e) => setPredictorConfig(prev => ({...(prev || {}), badge_text: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Título Topo</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={predictorConfig?.title_top || ''} onChange={(e) => setPredictorConfig(prev => ({...(prev || {}), title_top: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Destaque de Título</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={predictorConfig?.title_highlight || ''} onChange={(e) => setPredictorConfig(prev => ({...(prev || {}), title_highlight: e.target.value}) as any)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">Descrição</label>
          <textarea className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white h-24" value={predictorConfig?.description || ''} onChange={(e) => setPredictorConfig(prev => ({...(prev || {}), description: e.target.value}) as any)}></textarea>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSavePredictor} className="bg-brand-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-500 disabled:opacity-50" disabled={updateConfig.isPending}>Salvar Predictor</button>
        </div>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-brand-500 mb-4">O Formato (Seção 8 Estações)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Prefixo do Título</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={formatConfig?.title_prefix || ''} onChange={(e) => setFormatConfig(prev => ({...(prev || {}), title_prefix: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Destaque Principal</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={formatConfig?.title_highlight || ''} onChange={(e) => setFormatConfig(prev => ({...(prev || {}), title_highlight: e.target.value}) as any)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">Descrição</label>
          <textarea className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white h-24" value={formatConfig?.description || ''} onChange={(e) => setFormatConfig(prev => ({...(prev || {}), description: e.target.value}) as any)}></textarea>
        </div>

        <div className="border-t border-dark-border pt-6 mt-6">
          <h3 className="text-lg font-bold text-white mb-4">Tipos de Prova (Abas de Categorias)</h3>
          
          <div className="flex gap-2 mb-6 flex-wrap">
            {formatConfig.race_types?.map((rt, idx) => (
              <div key={idx} className="flex rounded overflow-hidden">
                <input 
                  className={`px-4 py-2 bg-dark-card border-none outline-none font-bold min-w-[120px] transition-colors ${editingRaceTypeIdx === idx ? 'text-brand-500 bg-black' : 'text-zinc-500'}`}
                  value={rt.name}
                  onChange={(e) => {
                     const newRT = [...(formatConfig.race_types || [])];
                     newRT[idx].name = e.target.value;
                     setFormatConfig({...formatConfig, race_types: newRT} as any);
                  }}
                  onClick={() => setEditingRaceTypeIdx(idx)}
                />
                {formatConfig.race_types && formatConfig.race_types.length > 1 && (
                  <button onClick={() => {
                    const newRT = [...(formatConfig.race_types||[])];
                    newRT.splice(idx, 1);
                    setFormatConfig({...formatConfig, race_types: newRT} as any);
                    setEditingRaceTypeIdx(0);
                  }} className="px-3 bg-red-900/50 text-white hover:bg-red-500 transition-colors">X</button>
                )}
              </div>
            ))}
            <button onClick={() => {
                const newRT = [...(formatConfig.race_types || [])];
                // Criação automática da nova categoria plagiando as estações base
                const baseStations = Object.assign([], formatConfig.race_types?.[0]?.stations || []);
                newRT.push({id: Date.now().toString(), name: 'Nova Prova', stations: JSON.parse(JSON.stringify(baseStations))});
                setFormatConfig({...formatConfig, race_types: newRT} as any);
                setEditingRaceTypeIdx(newRT.length - 1);
            }} className="px-4 py-2 bg-brand-500/10 text-brand-500 hover:bg-brand-500/30 transition-colors font-bold rounded"> + ADD CATEGORIA</button>
          </div>

          {formatConfig.race_types && formatConfig.race_types[editingRaceTypeIdx] && (
            <div className="space-y-4">
               <div className="flex justify-between items-center mb-4">
                 <h4 className="font-bold text-zinc-300">Exercícios da Categoria: <span className="text-brand-500">{formatConfig.race_types[editingRaceTypeIdx].name}</span></h4>
               </div>
               
               <div className="mb-4">
                 <label className="text-[10px] uppercase text-zinc-500 mb-1 block">Texto do Banner (Faixa laranja acima dos exercícios)</label>
                 <input 
                   type="text"
                   placeholder="🔄 Sempre inicie com 1km de Corrida"
                   className="w-full bg-dark-card p-3 text-sm text-brand-400 font-bold border border-brand-500/30 rounded outline-none focus:border-brand-500" 
                   value={formatConfig.race_types[editingRaceTypeIdx].banner_text || ''} 
                   onChange={(e) => {
                     const newRT = [...(formatConfig.race_types || [])];
                     newRT[editingRaceTypeIdx].banner_text = e.target.value;
                     setFormatConfig({...formatConfig, race_types: newRT} as any);
                   }} 
                 />
               </div>
               <div className="grid grid-cols-1 gap-4">
               {formatConfig.race_types[editingRaceTypeIdx].stations.map((station, sIdx) => (
                 <div key={sIdx} className="bg-dark-bg border border-dark-border p-4 rounded-lg relative">
                    <div className="grid grid-cols-4 gap-4 mb-2">
                       <div className="col-span-1 border-r border-dark-border pr-4">
                          <label className="text-[10px] uppercase text-zinc-500">Estação / Ordem</label>
                          <input className="w-full bg-dark-card p-2 text-xl font-black text-center text-brand-500 outline-none" value={station.id} disabled />
                       </div>
                       <div className="col-span-3">
                          <label className="text-[10px] uppercase text-zinc-500">Nome do Workout</label>
                          <input className="w-full bg-dark-card p-2 text-sm text-white border border-[#262626] rounded outline-none focus:border-brand-500" value={station.name} onChange={(e) => {
                             const newRT = [...(formatConfig.race_types || [])];
                             newRT[editingRaceTypeIdx].stations[sIdx].name = e.target.value;
                             setFormatConfig({...formatConfig, race_types: newRT} as any);
                          }} />
                       </div>
                                      <div className="col-span-4 md:col-span-2">
                          <label className="text-[10px] uppercase text-zinc-500">Métrica (Ex: 1000m, 50kg, 100 Reps)</label>
                          <input className="w-full bg-dark-card p-2 text-sm text-white border border-[#262626] rounded outline-none focus:border-brand-500" value={station.metric} onChange={(e) => {
                             const newRT = [...(formatConfig.race_types || [])];
                             newRT[editingRaceTypeIdx].stations[sIdx].metric = e.target.value;
                             setFormatConfig({...formatConfig, race_types: newRT} as any);
                          }} />
                       </div>
                       <div className="col-span-4 md:col-span-2">
                          <label className="text-[10px] uppercase text-zinc-500 text-brand-500">Botão de Regras/Vídeo (Link URL)</label>
                          <input type="url" placeholder="https://youtube.com/..." className="w-full bg-dark-card p-2 text-sm text-white border border-brand-500/50 rounded outline-none focus:border-brand-500" value={station.rules_link || ''} onChange={(e) => {
                             const newRT = [...(formatConfig.race_types || [])];
                             newRT[editingRaceTypeIdx].stations[sIdx].rules_link = e.target.value;
                             setFormatConfig({...formatConfig, race_types: newRT} as any);
                          }} />
                       </div>
                       <div className="col-span-4">
                          <label className="text-[10px] uppercase text-zinc-500">Descrição detalhada</label>
                          <textarea className="w-full bg-dark-card p-2 text-sm text-white border border-[#262626] rounded h-16 outline-none focus:border-brand-500 flex items-center" value={station.desc} onChange={(e) => {
                             const newRT = [...(formatConfig.race_types || [])];
                             newRT[editingRaceTypeIdx].stations[sIdx].desc = e.target.value;
                             setFormatConfig({...formatConfig, race_types: newRT} as any);
                          }} />
                       </div>
                       <div className="col-span-4 border-t border-[#262626] mt-2 pt-4">
                          <label className="text-[10px] uppercase text-zinc-500 mb-2 block">Foto de Fundo Especial da Estação</label>
                          <div className="flex items-center gap-4">
                             {station.image_url && (
                                <img src={station.image_url} alt="Station" className="w-32 h-16 object-cover rounded border border-brand-500" />
                             )}
                             <label className="bg-dark-card border border-dark-border px-4 py-2 rounded text-zinc-300 font-bold text-xs cursor-pointer hover:bg-brand-500 hover:text-white transition-colors">
                                {station.image_url ? 'Substituir Foto' : '+ Fazer Upload de Foto Mágica WebP'}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleStationImageUpload(e, editingRaceTypeIdx, sIdx)} />
                             </label>
                             {station.image_url && (
                                <button onClick={() => {
                                   const newRT = [...(formatConfig.race_types || [])];
                                   newRT[editingRaceTypeIdx].stations[sIdx].image_url = '';
                                   setFormatConfig({...formatConfig, race_types: newRT} as any);
                                }} className="text-red-500 text-xs hover:underline">Remover Foto</button>
                             )}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-2">A foto será comprimida automaticamente e exibida com um sombreamento escuro nas pontas garantindo leitura total do texto!</p>
                       </div>
                    </div>
                 </div>
               ))}
               </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-dark-border mt-4">
          <button onClick={handleSaveFormat} className="bg-brand-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-500 disabled:opacity-50" disabled={updateConfig.isPending}>Salvar Tudo do Formato</button>
        </div>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-brand-500 mb-4">Próximas Etapas (Calendário)</h2>
        <p className="text-xs text-zinc-500 mb-4">⚡ Estes cards serão conectados ao sistema de Eventos (aba lateral) futuramente. Por enquanto, edite manualmente aqui.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Prefixo do Título</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={eventsConfig?.title_prefix || ''} onChange={(e) => setEventsConfig(prev => ({...(prev || {}), title_prefix: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Destaque do Título</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={eventsConfig?.title_highlight || ''} onChange={(e) => setEventsConfig(prev => ({...(prev || {}), title_highlight: e.target.value}) as any)} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Descrição Curta</label>
            <textarea className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white h-16" value={eventsConfig?.description || ''} onChange={(e) => setEventsConfig(prev => ({...(prev || {}), description: e.target.value}) as any)}></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Label da Temporada</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={eventsConfig?.season_label || ''} onChange={(e) => setEventsConfig(prev => ({...(prev || {}), season_label: e.target.value}) as any)} />
          </div>
        </div>

        {/* Experience Subsection */}
        <div className="border-t border-dark-border pt-6 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <Play size={18} className="text-brand-500 fill-brand-500" />
            <h3 className="text-lg font-bold text-white">Linha: Eventos Experience (Simulados)</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2">Título da Linha Experience</label>
              <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" placeholder="Ex: Eventos Experience" value={eventsConfig?.experience_title || ''} onChange={(e) => setEventsConfig(prev => ({...(prev || {}), experience_title: e.target.value}) as any)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2">Descrição da Linha Experience</label>
              <textarea className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white h-16" placeholder="Ex: Eventos não competitivos que simulam a prova oficial com distância de corrida e cargas reduzidas" value={eventsConfig?.experience_description || ''} onChange={(e) => setEventsConfig(prev => ({...(prev || {}), experience_description: e.target.value}) as any)}></textarea>
            </div>
          </div>
        </div>

        {/* Oficial Subsection */}
        <div className="border-t border-dark-border pt-6 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-lg">🏆</span>
            <h3 className="text-lg font-bold text-white">Linha: Eventos Oficiais</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2">Título da Linha Oficial</label>
              <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" placeholder="Ex: Eventos Oficiais" value={eventsConfig?.oficial_title || ''} onChange={(e) => setEventsConfig(prev => ({...(prev || {}), oficial_title: e.target.value}) as any)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2">Descrição da Linha Oficial</label>
              <textarea className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white h-16" placeholder="Ex: Competições oficiais UAIROX com percurso completo e ranking válido" value={eventsConfig?.oficial_description || ''} onChange={(e) => setEventsConfig(prev => ({...(prev || {}), oficial_description: e.target.value}) as any)}></textarea>
            </div>
          </div>
        </div>

        <div className="border-t border-dark-border pt-6 mt-4">
          <p className="text-sm text-zinc-400">
            <strong>Nota:</strong> Os cards individuais das etapas são gerenciados automaticamente através da aba <strong>Eventos</strong> na barra lateral. Aqui você configura apenas o título e descrição desta seção na Home.
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t border-dark-border mt-4">
          <button onClick={handleSaveEvents} className="bg-brand-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-500 disabled:opacity-50" disabled={updateConfig.isPending}>Salvar Etapas</button>
        </div>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-brand-500 mb-4">Rodapé (Footer)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Link do Instagram</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={footerConfig?.ig_link || ''} onChange={(e) => setFooterConfig(prev => ({...(prev || {}), ig_link: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Link do YouTube</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={footerConfig?.yt_link || ''} onChange={(e) => setFooterConfig(prev => ({...(prev || {}), yt_link: e.target.value}) as any)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">Descrição Curta (Abaixo da Logo)</label>
          <textarea className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white h-24" value={footerConfig?.description || ''} onChange={(e) => setFooterConfig(prev => ({...(prev || {}), description: e.target.value}) as any)}></textarea>
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">Texto de Direitos Autorais (Copyright)</label>
          <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={footerConfig?.copyright || ''} onChange={(e) => setFooterConfig(prev => ({...(prev || {}), copyright: e.target.value}) as any)} />
        </div>
        <div className="flex justify-end">
          <button onClick={handleSaveFooter} className="bg-brand-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-500 disabled:opacity-50" disabled={updateConfig.isPending}>Salvar Rodapé</button>
        </div>
      </div>
      
      <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-brand-500 mb-4">Página SQUAD</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Tag/Badge (Ex: Embaixadores Oficiais)</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={squadPageConfig?.badge_text || ''} onChange={(e) => setSquadPageConfig(prev => ({...(prev || {}), badge_text: e.target.value}) as any)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Título Principal (Ex: O Motor do UAIROX)</label>
            <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={squadPageConfig?.title || ''} onChange={(e) => setSquadPageConfig(prev => ({...(prev || {}), title: e.target.value}) as any)} />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">Descrição Curta</label>
          <textarea className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white h-24" value={squadPageConfig?.description || ''} onChange={(e) => setSquadPageConfig(prev => ({...(prev || {}), description: e.target.value}) as any)}></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">Texto do Botão CTA (Ex: Quero fazer parte do Squad)</label>
          <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={squadPageConfig?.cta_button_text || ''} onChange={(e) => setSquadPageConfig(prev => ({...(prev || {}), cta_button_text: e.target.value}) as any)} />
        </div>

        <div className="pt-6 mt-6 border-t border-[#262626]">
          <h3 className="text-lg font-bold text-white mb-4">Benefícios & Níveis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2">Título (Ex: Benefícios & Níveis)</label>
              <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={squadPageConfig?.benefits_title || ''} onChange={(e) => setSquadPageConfig(prev => ({...(prev || {}), benefits_title: e.target.value}) as any)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2">Subtítulo</label>
              <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={squadPageConfig?.benefits_subtitle || ''} onChange={(e) => setSquadPageConfig(prev => ({...(prev || {}), benefits_subtitle: e.target.value}) as any)} />
            </div>
          </div>

          <div className="space-y-4">
            {['bronze', 'prata', 'ouro', 'elite'].map((tier) => (
              <div key={tier} className="bg-[#0a0a0a] border border-[#262626] p-4 rounded-lg flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Nome Nível {tier}</label>
                  <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded p-2 text-white text-sm" 
                    value={(squadPageConfig as any)?.[`tier_${tier}_label`] || ''} 
                    onChange={(e) => setSquadPageConfig(prev => ({...(prev || {}), [`tier_${tier}_label`]: e.target.value}) as any)} 
                  />
                </div>
                <div className="w-full md:w-2/3">
                  <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Descrição Nível {tier}</label>
                  <input type="text" className="w-full bg-[#050505] border border-[#262626] rounded p-2 text-white text-sm" 
                    value={(squadPageConfig as any)?.[`tier_${tier}_desc`] || ''} 
                    onChange={(e) => setSquadPageConfig(prev => ({...(prev || {}), [`tier_${tier}_desc`]: e.target.value}) as any)} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-dark-border mt-4">
          <button onClick={handleSaveSquad} className="bg-brand-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-500 disabled:opacity-50" disabled={updateConfig.isPending}>Salvar SQUAD</button>
        </div>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-brand-500 mb-4">Contato & WhatsApp</h2>
        <div>
          <label className="block text-sm font-bold text-zinc-400 mb-2">Link do WhatsApp (Menu Superior)</label>
          <input type="text" placeholder="https://wa.me/5531999999999" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2 text-white" value={whatsappConfig?.whatsapp_link || ''} onChange={(e) => setWhatsappConfig(prev => ({...(prev || {}), whatsapp_link: e.target.value}) as any)} />
        </div>
        <div className="flex justify-end">
          <button onClick={handleSaveWhatsapp} className="bg-brand-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-500 disabled:opacity-50" disabled={updateConfig.isPending}>Salvar WhatsApp</button>
        </div>
      </div>

    </div>
  );
}
