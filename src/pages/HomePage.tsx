import { useState, useEffect } from 'react';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { usePublicEvents } from '@/hooks/useEvents';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const { data: config, isLoading } = useSiteConfig();
  const [activeStation, setActiveStation] = useState(1);
  const [activeRaceTypeIndex, setActiveRaceTypeIndex] = useState(0);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);

  const hero = config?.home_hero_new;
  const formato = config?.home_format_new;
  const events = config?.home_events_new;
  const experience = config?.home_experience_new;
  const stats = config?.home_stats_new;
  const predictor = config?.home_predictor_new || {
    badge_text: 'Desafio Estratégico', title_top: 'UAIROX', title_highlight: 'Predictor', description: 'Simule o seu tempo de prova. Os cálculos adaptam-se automaticamente à distância e exigência de cada formato.'
  };

  const bgImages = hero?.background_images || [];

  useEffect(() => {
    if (bgImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroImage(prev => (prev + 1) % bgImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [bgImages.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const raceTypes = formato?.race_types?.length ? formato.race_types : (formato?.stations ? [{id: 'default', name: 'Open', stations: formato.stations}] : []);
  const currentRaceType = raceTypes[activeRaceTypeIndex] || raceTypes[0];
  
  const stations = currentRaceType?.stations || [];
  const currentStation = stations.find(s => s.id === activeStation) || stations[0];

  return (
    <div className="relative z-10 antialiased font-sans selection:bg-brand-500 selection:text-white">
      {/* Hero Banner */}
      <header className="relative min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center text-center px-4 pt-20 md:pt-24 border-b border-dark-border overflow-hidden">
          {/* Images Carousel */}
          {bgImages.length > 0 && (
            <div className="absolute inset-0 z-0 bg-dark-bg">
              {bgImages.map((img, i) => (
                <div 
                  key={i} 
                  className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${i === currentHeroImage ? 'opacity-100' : 'opacity-0'}`} 
                >
                  <img src={img} className="w-full h-full object-cover" alt="Hero background" />
                  <div className="absolute inset-0 bg-black/70"></div>
                </div>
              ))}
            </div>
          )}

          <div className="absolute inset-0 bg-[size:40px_40px] bg-grid-pattern opacity-20 z-0 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-dark-bg z-0 pointer-events-none"></div>
          
          <div className="relative z-10 max-w-6xl mx-auto w-full">
              {hero?.badge_text && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 border border-brand-500/30 text-brand-400 text-[10px] md:text-xs font-black tracking-[0.2em] uppercase mb-6 md:mb-8 bg-brand-500/10 backdrop-blur-sm">
                      {hero.badge_text}
                  </div>
              )}
              
              <h1 className="text-4xl md:text-[4rem] lg:text-[5rem] font-black tracking-tighter text-white leading-[0.8] uppercase italic mb-2">
                  {hero?.title_top}
              </h1>
              <h2 className="text-2xl md:text-[2rem] lg:text-[2.5rem] font-black tracking-tighter text-brand-500 mb-12 uppercase italic">
                  {hero?.title_highlight}
              </h2>
              
              <p className="text-lg md:text-xl text-dark-muted mb-12 max-w-3xl mx-auto font-medium font-inter">
                  {hero?.description}
              </p>
              
              <div className="flex justify-center">
                  <a href={hero?.cta_primary_link || "#etapas"} className="inline-block bg-white text-dark-bg px-4 py-2.5 md:px-10 md:py-5 font-black text-xs md:text-lg hover:bg-brand-500 hover:text-white transition-colors uppercase tracking-widest skew-x-[-10deg]">
                      <span className="inline-block skew-x-[10deg]">{hero?.cta_primary_text && hero.cta_primary_text !== 'Ver Calendário' ? hero.cta_primary_text : "Próximos Eventos"}</span>
                  </a>
              </div>
          </div>
      </header>

      {/* A Prova: O Formato */}
      <section id="formato" className="py-12 md:py-24 bg-dark-bg border-b border-dark-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-dark-card/50 transform skew-x-12 translate-x-1/4"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="mb-16">
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter italic">{formato?.title_prefix} <span className="text-brand-500">{formato?.title_highlight}</span></h2>
                  <p className="text-dark-muted text-lg max-w-2xl font-inter mb-10">{formato?.description}</p>
                  
                  {raceTypes.length > 1 && (
                    <div className="flex flex-wrap gap-4 mb-8">
                      {raceTypes.map((rt, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setActiveRaceTypeIndex(idx); setActiveStation(1); }}
                          className={`px-4 py-2 md:px-8 md:py-3 text-xs md:text-sm font-black tracking-widest uppercase italic transition-colors 
                            ${activeRaceTypeIndex === idx ? 'bg-brand-500 text-white' : 'bg-dark-card border border-dark-border text-dark-muted hover:text-white'}`}
                        >
                          {rt.name}
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              <div className="flex flex-col lg:flex-row gap-12">
                  {/* Station List - Hidden on mobile, visible on desktop */}
                  <div className="hidden lg:flex w-full lg:w-1/3 flex-col">
                      <div className="mb-6 p-4 border border-brand-500/20 bg-brand-500/5 text-center font-bold text-brand-400 tracking-widest uppercase italic">
                          {currentRaceType?.banner_text || '🔄 Sempre inicie com 1km de Corrida'}
                      </div>
                      <div className="flex flex-col gap-2">
                          {stations.map((station) => (
                              <button 
                                key={station.id}
                                onClick={() => setActiveStation(station.id)}
                                className={`station-btn text-left p-4 border-l-4 text-dark-muted hover:bg-dark-card transition-all flex items-center gap-4 uppercase font-bold tracking-widest text-sm ${activeStation === station.id ? 'active border-brand-500' : 'border-dark-border'}`}
                              >
                                  <span className="station-number w-8 h-8 flex items-center justify-center bg-dark-bg border border-dark-border text-xs font-black rounded-sm transition-colors">{station.id}</span>
                                  {station.name}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Mobile-only banner */}
                  <div className="lg:hidden mb-4 p-4 border border-brand-500/20 bg-brand-500/5 text-center font-bold text-brand-400 tracking-widest uppercase italic text-sm">
                      {currentRaceType?.banner_text || '🔄 Sempre inicie com 1km de Corrida'}
                  </div>

                  {currentStation && (
                      <div className="w-full lg:w-2/3">
                          <div className="bg-dark-card border border-dark-border p-5 md:p-8 lg:p-12 h-full flex flex-col justify-center relative overflow-hidden group">
                              
                              {/* Station Dynamic Background */}
                              {currentStation.image_url && (
                                <div className="absolute inset-0 z-0">
                                  <img 
                                    src={currentStation.image_url} 
                                    alt={currentStation.name} 
                                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700 ease-out" 
                                  />
                                  {/* Overlays Dark Gradient to maintain exact readability */}
                                  <div className="absolute inset-0 bg-black/50"></div>
                                  <div className="absolute inset-0 bg-gradient-to-r from-dark-card/95 via-dark-card/70 to-transparent"></div>
                                </div>
                              )}

                              <div className="absolute -right-10 -bottom-10 text-[10rem] md:text-[20rem] font-black text-white/5 leading-none italic pointer-events-none transition-all z-0">{currentStation.id}</div>
                              
                              <div className="relative z-10 transition-opacity duration-300">
                                  <div className="inline-block px-3 py-1 bg-white text-black font-black uppercase tracking-widest text-sm mb-6 shadow-xl">UAIZONE {currentStation.id}</div>
                                  <h3 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 md:mb-6 uppercase tracking-tighter italic drop-shadow-md">{currentStation.name}</h3>
                                  
                                  <div className="grid grid-cols-2 gap-6 mb-8">
                                      <div className="border-l-2 border-brand-500 pl-4 bg-dark-bg/30 backdrop-blur-sm p-3 rounded-r-lg">
                                          <p className="text-brand-500/80 text-xs font-bold uppercase tracking-widest mb-1">Distância/Reps</p>
                                          <p className="text-xl md:text-2xl lg:text-3xl font-black text-white drop-shadow-sm">{currentStation.metric}</p>
                                      </div>
                                      <div className="flex items-center">
                                          {currentStation.rules_link ? (
                                              <a href={currentStation.rules_link} target="_blank" rel="noopener noreferrer" className="bg-brand-500 hover:bg-brand-400 text-dark-bg w-full py-4 px-4 rounded font-black uppercase tracking-widest text-center transition-colors shadow-lg flex items-center justify-center gap-2 italic skew-x-[-10deg]">
                                                  <span className="skew-x-[10deg] text-sm truncate">▶ Vídeo</span>
                                              </a>
                                          ) : (
                                              <div className="border-l-2 border-zinc-700 pl-4 bg-dark-bg/30 backdrop-blur-sm p-3 rounded-r-lg w-full">
                                                  <p className="text-zinc-400/80 text-xs font-bold uppercase tracking-widest mb-1">Músculos Foco</p>
                                                  <p className="text-lg md:text-xl font-bold text-white uppercase drop-shadow-sm truncate">{currentStation.muscle}</p>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  
                                  <p className="text-zinc-300 text-lg md:text-xl leading-relaxed font-inter font-medium bg-dark-bg/40 backdrop-blur-md p-4 rounded-lg border border-white/5 shadow-2xl">
                                      {currentStation.desc}
                                  </p>
                              </div>

                              {/* Mobile Carousel Arrows */}
                              <div className="flex lg:hidden items-center justify-between absolute bottom-4 left-4 right-4 z-20">
                                <button
                                  onClick={() => {
                                    const idx = stations.findIndex(s => s.id === activeStation);
                                    const prev = idx > 0 ? stations[idx - 1].id : stations[stations.length - 1].id;
                                    setActiveStation(prev);
                                  }}
                                  className="bg-dark-bg/80 hover:bg-brand-500 hover:text-black text-white p-2 border border-dark-border transition-colors shadow-lg"
                                >
                                  <ChevronLeft size={20} />
                                </button>
                                <div className="bg-dark-bg/80 text-white text-xs font-black px-3 py-1.5 border border-dark-border shadow-lg uppercase tracking-widest">
                                  {stations.findIndex(s => s.id === activeStation) + 1} / {stations.length}
                                </div>
                                <button
                                  onClick={() => {
                                    const idx = stations.findIndex(s => s.id === activeStation);
                                    const next = idx < stations.length - 1 ? stations[idx + 1].id : stations[0].id;
                                    setActiveStation(next);
                                  }}
                                  className="bg-dark-bg/80 hover:bg-brand-500 hover:text-black text-white p-2 border border-dark-border transition-colors shadow-lg"
                                >
                                  <ChevronRight size={20} />
                                </button>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </section>

      {/* Etapas / Inscrições Abertas */}
      <UpcomingEventsSection events={events} />

      {/* UAIROX EXPERIENCE */}
      <section id="experience" className="py-12 md:py-24 bg-dark-bg relative overflow-hidden">
          <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-brand-600/10 blur-[120px] rounded-full -translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-dark-card border border-dark-border text-dark-muted font-bold uppercase tracking-widest text-xs mb-6">
                          {experience?.badge_text}
                      </div>
                      <h2 className="text-3xl md:text-5xl lg:text-7xl font-black text-white mb-4 md:mb-6 uppercase tracking-tighter italic">
                          {experience?.title_top}<br /> <span className="text-brand-500">{experience?.title_highlight}</span>
                      </h2>
                      <p className="text-dark-muted text-base md:text-xl mb-6 md:mb-10 leading-relaxed font-inter">
                          {experience?.description}
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                          <a href={experience?.btn_primary_link} className="bg-brand-600 text-white px-8 py-4 font-black uppercase tracking-widest skew-x-[-10deg] hover:bg-brand-500 transition-colors text-center shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
                              <span className="inline-block skew-x-[10deg]">{experience?.btn_primary_text}</span>
                          </a>
                          <a href={experience?.btn_secondary_link} className="bg-transparent border-2 border-dark-border text-white px-8 py-4 font-black uppercase tracking-widest skew-x-[-10deg] hover:border-brand-500 hover:text-brand-500 transition-all text-center">
                              <span className="inline-block skew-x-[10deg]">{experience?.btn_secondary_text}</span>
                          </a>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 relative">
                      <div className="absolute -inset-4 border border-dark-border/40 transform rotate-2 -z-10 bg-dark-bg/50"></div>
                      
                      <div className="space-y-4 pt-12">
                          <div className={`img-placeholder-bg border border-dark-border h-40 md:h-64 relative group overflow-hidden shadow-lg ${experience?.images?.[0] ? '!bg-none' : ''}`}>
                            {experience?.images?.[0] && <img src={experience.images[0]} alt="Experience 1" className="w-full h-full object-cover" />}
                          </div>
                          <div className={`img-placeholder-bg border border-dark-border h-32 md:h-48 relative group overflow-hidden shadow-lg ${experience?.images?.[1] ? '!bg-none' : ''}`}>
                            {experience?.images?.[1] && <img src={experience.images[1]} alt="Experience 2" className="w-full h-full object-cover" />}
                          </div>
                      </div>
                      
                      <div className="space-y-4">
                          <div className={`img-placeholder-bg border border-brand-500/50 h-36 md:h-56 relative group overflow-hidden shadow-[0_0_30px_rgba(237,172,2,0.15)] ${experience?.images?.[2] ? '!bg-none' : ''}`}>
                            {experience?.images?.[2] && <img src={experience.images[2]} alt="Experience 3" className="w-full h-full object-cover" />}
                          </div>
                          <div className={`img-placeholder-bg border border-dark-border h-40 md:h-64 relative group overflow-hidden shadow-lg ${experience?.images?.[3] ? '!bg-none' : ''}`}>
                            {experience?.images?.[3] && <img src={experience.images[3]} alt="Experience 4" className="w-full h-full object-cover" />}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* UAIROX PREDICTOR */}
      <UairoxPredictor config={predictor} />

      {/* Parceiros e Patrocinadores */}
      <section className="py-10 md:py-16 bg-[#EDAC02] px-4 border-y border-[#EDAC02] relative z-10 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
              <p className="text-black font-black uppercase tracking-widest text-xs md:text-sm mb-8">
                {config?.home_sponsors_new?.title || 'PARCEIROS E PATROCINADORES'}
              </p>
              
              {/* Marquee Container */}
              <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
                {/* 
                  O truque para animação infinita perfeita: duas listas idênticas deslizando.
                  Se houver poucos patrocinadores, precisamos duplicar para preencher a tela.
                */}
                {(() => {
                  const baseSponsors = config?.home_sponsors_new?.sponsors?.length 
                    ? config.home_sponsors_new.sponsors 
                    : [1, 2, 3, 4, 5, 6];
                  
                  // Multiplicar o array se for muito pequeno para o marquee não quebrar
                  let displaySponsors = [...baseSponsors];
                  while (displaySponsors.length < 8) {
                    displaySponsors = [...displaySponsors, ...baseSponsors];
                  }

                  return (
                    <>
                      <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 [&_img]:max-w-none animate-marquee">
                        {displaySponsors.map((sponsor: any, idx: number) => (
                          <li key={`a-${sponsor?.id || idx}-${idx}`} className="flex-shrink-0">
                            {sponsor?.link ? (
                              <a href={sponsor.link} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={sponsor?.logo_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40'%3E%3Crect width='120' height='40' fill='rgba(0,0,0,0.1)' rx='4'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' fill='%23000' font-family='sans-serif' font-weight='bold' font-size='12'%3ELOGO%3C/text%3E%3C/svg%3E"} 
                                  alt={sponsor?.name || `Sponsor ${idx}`} 
                                  className="h-12 md:h-16 object-contain" 
                                />
                              </a>
                            ) : (
                              <img 
                                src={sponsor?.logo_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40'%3E%3Crect width='120' height='40' fill='rgba(0,0,0,0.1)' rx='4'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' fill='%23000' font-family='sans-serif' font-weight='bold' font-size='12'%3ELOGO%3C/text%3E%3C/svg%3E"} 
                                alt={sponsor?.name || `Sponsor ${idx}`} 
                                className="h-12 md:h-16 object-contain" 
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                      <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 [&_img]:max-w-none animate-marquee" aria-hidden="true">
                        {displaySponsors.map((sponsor: any, idx: number) => (
                          <li key={`b-${sponsor?.id || idx}-${idx}`} className="flex-shrink-0">
                            {sponsor?.link ? (
                              <a href={sponsor.link} target="_blank" rel="noopener noreferrer" tabIndex={-1}>
                                <img 
                                  src={sponsor?.logo_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40'%3E%3Crect width='120' height='40' fill='rgba(0,0,0,0.1)' rx='4'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' fill='%23000' font-family='sans-serif' font-weight='bold' font-size='12'%3ELOGO%3C/text%3E%3C/svg%3E"} 
                                  alt={sponsor?.name || `Sponsor ${idx}`} 
                                  className="h-12 md:h-16 object-contain" 
                                />
                              </a>
                            ) : (
                              <img 
                                src={sponsor?.logo_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40'%3E%3Crect width='120' height='40' fill='rgba(0,0,0,0.1)' rx='4'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' fill='%23000' font-family='sans-serif' font-weight='bold' font-size='12'%3ELOGO%3C/text%3E%3C/svg%3E"} 
                                alt={sponsor?.name || `Sponsor ${idx}`} 
                                className="h-12 md:h-16 object-contain" 
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  );
                })()}
              </div>
          </div>
          <style>{`
            @keyframes marquee {
              from { transform: translateX(0); }
              to { transform: translateX(-100%); }
            }
            .animate-marquee {
              animation: marquee 25s linear infinite;
            }
            .animate-marquee:hover {
              animation-play-state: paused;
            }
          `}</style>
      </section>
    </div>
  );
}

// ============ UAIROX PREDICTOR ============
function UairoxPredictor({ config }: { config: any }) {
  const [activeModel, setActiveModel] = useState<'simulado' | 'experience' | 'oficial'>('simulado');
  const [activeStrength, setActiveStrength] = useState<'iniciante' | 'intermed' | 'monstro'>('iniciante');
  const [paceSeconds, setPaceSeconds] = useState(330);

  const raceData = {
    simulado: { title: 'Simulado Experience', runKm: 3.2, timeMult: 0.8, ranks: [2100, 2700, 3300] },
    experience: { title: 'UAIROX Experience', runKm: 4.0, timeMult: 0.8, ranks: [2400, 3000, 3600] },
    oficial: { title: 'UAIROX Oficial', runKm: 8.0, timeMult: 1.0, ranks: [3600, 4500, 5400] },
  };
  const baseStrengthTimes = { iniciante: 3000, intermed: 2400, monstro: 1800 };

  const formatPace = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const model = raceData[activeModel];
  const runTime = paceSeconds * model.runKm;
  const strengthTime = baseStrengthTimes[activeStrength] * model.timeMult;
  const total = runTime + strengthTime;

  const getRank = () => {
    const [t1, t2, t3] = model.ranks;
    if (total < t1) return { label: 'UAIROX MUTANTE', color: 'text-[#EDAC02]', msg: `Ritmo insano. Um tempo digno de pódio no ${model.title}.` };
    if (total < t2) return { label: 'UAIROX ELITE', color: 'text-white', msg: 'Performance muito acima da média. Está pronto para a arena.' };
    if (total < t3) return { label: 'UAIROX COMPETITOR', color: 'text-zinc-300', msg: 'Ritmo constante. Mantenha as transições rápidas para garantir este tempo.' };
    return { label: 'UAIROX CHALLENGER', color: 'text-zinc-500', msg: 'O foco agora é não desistir. Terminar já te torna um vencedor.' };
  };
  const rank = getRank();

  const modelBtns = [
    { key: 'simulado' as const, label: 'Simulado', sub: '3.2km' },
    { key: 'experience' as const, label: 'Experience', sub: '4.0km' },
    { key: 'oficial' as const, label: 'Oficial', sub: '8.0km' },
  ];
  const strengthBtns = [
    { key: 'iniciante' as const, label: 'Iniciante' },
    { key: 'intermed' as const, label: 'Intermediário' },
    { key: 'monstro' as const, label: 'Bruto(a)' },
  ];

  const btnActive = 'bg-[#EDAC02] text-black border-[#EDAC02]';
  const btnInactive = 'bg-transparent text-zinc-500 border-[#262626] hover:border-[#EDAC02]/50 hover:text-zinc-300';

  return (
    <section id="predictor" className="py-24 bg-[#0a0a0a] border-y border-[#EDAC02]/20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#EDAC02]/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] font-black uppercase tracking-widest text-xs mb-4">
            {config?.badge_text || 'Desafio Estratégico'}
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter italic">
            {config?.title_top || 'UAIROX'} <span className="text-[#EDAC02]">{config?.title_highlight || 'Predictor'}</span>
          </h2>
          <p className="text-zinc-500 text-lg font-inter max-w-xl mx-auto">
            {config?.description || 'Simule o seu tempo de prova. Os cálculos adaptam-se automaticamente à distância e exigência de cada formato.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] p-4 md:p-8 lg:p-10 relative">
          {/* Corner decorations */}
          <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-[#EDAC02]/30" />
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-[#EDAC02]/30" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* ---- LEFT: Controls ---- */}
            <div className="space-y-8">

              {/* Model selector */}
              <div>
                <label className="block font-black text-white uppercase tracking-widest text-xs mb-4">Modelo de Prova</label>
                <div className="grid grid-cols-3 gap-2">
                  {modelBtns.map(b => (
                    <button key={b.key} onClick={() => setActiveModel(b.key)}
                      className={`border py-3 px-2 text-xs font-black uppercase tracking-wider transition-all skew-x-[-6deg] ${activeModel === b.key ? btnActive : btnInactive}`}>
                      <span className="inline-block skew-x-[6deg]">
                        <span className="block">{b.label}</span>
                        <span className="block text-[10px] font-bold opacity-70 normal-case tracking-normal mt-0.5">{b.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pace slider */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="font-black text-white uppercase tracking-widest text-xs">Seu Pace de Corrida</label>
                  <span className="text-3xl font-black text-[#EDAC02] italic tracking-tighter">{formatPace(paceSeconds)}<span className="text-sm text-zinc-500 font-bold ml-1">/km</span></span>
                </div>
                <div className="relative">
                  <input
                    type="range" min={210} max={480} step={5} value={paceSeconds}
                    onChange={e => setPaceSeconds(Number(e.target.value))}
                    className="w-full h-2 rounded-none appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #EDAC02 ${((paceSeconds - 210) / (480 - 210)) * 100}%, #262626 ${((paceSeconds - 210) / (480 - 210)) * 100}%)`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  <span>3:30/km</span>
                  <span>8:00/km</span>
                </div>
              </div>

              {/* Strength level */}
              <div>
                <label className="block font-black text-white uppercase tracking-widest text-xs mb-4">Força nas UaiZones</label>
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  {strengthBtns.map(b => (
                    <button key={b.key} onClick={() => setActiveStrength(b.key)}
                      className={`border py-3 px-0.5 sm:px-2 text-[9px] sm:text-xs font-black uppercase tracking-tighter sm:tracking-wider transition-all skew-x-[-6deg] ${activeStrength === b.key ? btnActive : btnInactive}`}>
                      <span className="inline-block skew-x-[6deg] truncate w-full">{b.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-600 mt-3">A velocidade de execução dos movimentos influencia o tempo final.</p>
              </div>
            </div>

            {/* ---- RIGHT: Result ---- */}
            <div className="flex flex-col justify-center items-center p-8 bg-[#050505] border border-[#1a1a1a] text-center relative overflow-hidden">
              {/* BG acronym */}
              <div className="absolute -right-4 -bottom-8 text-[10rem] font-black text-white/[0.02] italic leading-none pointer-events-none select-none hidden md:block">⏱</div>

              <p className="font-bold text-zinc-600 uppercase tracking-widest text-xs mb-3">Estimativa de Conclusão</p>
              <div className="text-4xl md:text-6xl lg:text-7xl font-black text-white italic tracking-tighter mb-4 md:mb-6 tabular-nums">
                {formatTime(total)}
              </div>

              <div className="w-full h-px bg-[#1a1a1a] mb-6" />

              <p className="font-bold text-zinc-600 uppercase tracking-widest text-[10px] mb-2">Patente Prevista</p>
              <div className={`text-2xl font-black uppercase tracking-widest mb-3 transition-all ${rank.color}`}>
                {rank.label}
              </div>
              <p className="text-sm text-zinc-500 font-inter max-w-xs leading-relaxed">{rank.msg}</p>

              {/* Breakdown mini */}
              <div className="mt-6 w-full grid grid-cols-2 gap-3">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">🏃 Corrida</p>
                  <p className="text-lg font-black text-white">{formatTime(runTime)}</p>
                  <p className="text-[10px] text-zinc-600">{model.runKm}km total</p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">💪 UaiZones</p>
                  <p className="text-lg font-black text-white">{formatTime(strengthTime)}</p>
                  <p className="text-[10px] text-zinc-600">8 estações</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slider thumb style */}
      <style>{`
        #predictor input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 22px;
          width: 14px;
          background: #EDAC02;
          cursor: pointer;
          transform: skewX(-10deg);
          margin-top: -7px;
          box-shadow: 0 0 12px rgba(237,172,2,0.5);
        }
        #predictor input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 8px;
          cursor: pointer;
          border-radius: 0;
        }
        #predictor input[type=range] { -webkit-appearance: none; }
        #predictor input[type=range]:focus { outline: none; }
      `}</style>
    </section>
  );
}

// ============ UPCOMING EVENTS SECTION (Dynamic from Supabase) ============
function UpcomingEventsSection({ events: eventsConfig }: { events: any }) {
  const { data: dbEvents } = usePublicEvents();

  // Generate acronym from location (e.g. "Centro Esportivo Sesi - Betim MG" → "BTM")
  const getAcronym = (location: string) => {
    if (!location) return "UAI";
    const city = location.split('-').pop()?.trim().split(' ')[0] || location;
    return city.slice(0, 3).toUpperCase();
  };

  // Format date for display
  const formatDateLabel = (dateStr: string, endDateStr?: string | null) => {
    if (!dateStr) return "DATA A DEFINIR";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "DATA INVÁLIDA";
      
      const day = d.getDate();
      const month = d.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
      const year = d.getFullYear();

      if (endDateStr) {
        const end = new Date(endDateStr);
        if (!isNaN(end.getTime())) {
          return `${day} - ${end.getDate()} ${month}, ${year}`;
        }
      }
      return `${day} ${month}, ${year}`;
    } catch (e) {
      return "DATA A DEFINIR";
    }
  };

  // Extract city from location
  const getCity = (location: string) => {
    if (!location) return "Local a definir";
    const parts = location.split('-');
    return parts.length > 1 ? parts[parts.length - 1].trim() : location;
  };

  // Map event status to card style
  const getCardProps = (ev: any) => {
    const isOpen = ev.status === 'open';
    const isPlanning = ev.status === 'planning';
    const isClosed = ev.status === 'closed';
    const batchName = ev._active_batch?.name;

    return {
      is_badge_active: isOpen,
      badge_text: isOpen ? (batchName || 'Inscrições Abertas') : isPlanning ? 'Pré-Venda' : isClosed ? 'Encerrado' : 'Em Breve',
      is_disabled: isClosed,
      btn_text: isOpen ? 'Garantir Vaga' : isPlanning ? 'Lista VIP' : 'Aguarde',
      btn_link: isOpen ? `/evento/${ev.id}` : isPlanning ? `/evento/${ev.id}` : null,
    };
  };

  // Split events by type
  const experienceEvents = dbEvents?.filter((ev: any) => ev.event_type === 'experience') || [];
  const oficialEvents = dbEvents?.filter((ev: any) => ev.event_type !== 'experience') || [];

  const renderEventCard = (ev: any) => {
    const card = getCardProps(ev);
    const city = getCity(ev.location);
    const acronym = getAcronym(ev.location);
    const dateLabel = formatDateLabel(ev.date, ev.end_date);

    return (
      <div
        key={ev.id}
        className={`event-card relative bg-dark-card border ${card.is_badge_active ? 'border-brand-500' : 'border-dark-border'} ${card.is_disabled ? 'border-dark-border/50 opacity-70 hover:opacity-100' : 'hover:border-brand-500 cursor-pointer'} p-5 md:p-8 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-2 group h-[360px] md:h-[450px]`}
      >
        {ev.image_url ? (
          <>
            <div className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 group-hover:scale-110 opacity-60" style={{ backgroundImage: `url(${ev.image_url})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent z-0" />
          </>
        ) : (
          <div className="event-bg-text absolute -right-6 -top-12 text-[12rem] font-black text-white/5 leading-none italic pointer-events-none transition-all duration-500 z-0">
            {acronym}
          </div>
        )}

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            {card.is_badge_active ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500 text-white font-black uppercase tracking-widest text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                {card.badge_text}
              </span>
            ) : (
              <span className={`inline-block px-3 py-1 ${card.is_disabled ? 'bg-dark-border text-dark-muted' : 'bg-white text-black'} font-black uppercase tracking-widest text-xs`}>
                {card.badge_text}
              </span>
            )}
          </div>
          <h3 className={`text-2xl md:text-4xl font-black uppercase italic mb-1 ${card.is_disabled ? 'text-dark-muted' : 'text-white'}`}>
            {city}
          </h3>
          <p className={`${card.is_disabled ? 'text-dark-muted/60' : card.is_badge_active ? 'text-brand-400' : 'text-white/60'} font-black tracking-widest uppercase text-sm mb-6`}>
            {dateLabel}
          </p>
          <p className="text-dark-muted text-sm mb-6 line-clamp-3 font-inter">
            {ev.description}
          </p>
        </div>

        <div className="relative z-10 mt-auto">
          {card.btn_link && !card.is_disabled ? (
            <a
              href={card.btn_link}
              className={`block w-full py-4 font-black uppercase tracking-widest skew-x-[-10deg] transition-colors text-center ${
                card.is_badge_active
                  ? 'bg-white text-black group-hover:bg-brand-500 group-hover:text-white'
                  : 'border-2 border-dark-border text-white group-hover:border-white'
              }`}
            >
              <span className="inline-block skew-x-[10deg]">{card.btn_text}</span>
            </a>
          ) : (
            <button
              className={`w-full py-4 font-black uppercase tracking-widest skew-x-[-10deg] transition-colors ${
                card.is_disabled
                  ? 'bg-dark-bg border border-dark-border text-dark-muted'
                  : card.is_badge_active
                    ? 'bg-white text-black group-hover:bg-brand-500 group-hover:text-white'
                    : 'border-2 border-dark-border text-white group-hover:border-white'
              }`}
            >
              <span className="inline-block skew-x-[10deg]">{card.btn_text}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const hasAnyEvents = (dbEvents && dbEvents.length > 0);

  return (
    <section id="etapas" className="py-12 md:py-24 bg-[#080808] border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-dark-border pb-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-2 uppercase tracking-tighter italic">
              {eventsConfig?.title_prefix} <span className="text-brand-500">{eventsConfig?.title_highlight}</span>
            </h2>
            <p className="text-dark-muted text-lg max-w-xl font-inter">{eventsConfig?.description}</p>
          </div>
          <div className="hidden md:block">
            <span className="px-4 py-2 bg-dark-border text-dark-muted font-bold text-sm uppercase tracking-widest">
              {eventsConfig?.season_label}
            </span>
          </div>
        </div>

        {!hasAnyEvents ? (
          <div className="col-span-full py-20 text-center bg-dark-card/50 border border-dark-border rounded-xl">
            <p className="text-zinc-500 font-bold uppercase tracking-widest italic text-lg">Em breve novas etapas serão anunciadas.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* EVENTOS EXPERIENCE (SIMULADOS) */}
            <div>
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <Play size={24} className="text-brand-500 fill-brand-500" />
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic">
                      {eventsConfig?.experience_title || 'Eventos Experience'}
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/30 text-brand-400 font-black uppercase tracking-widest text-[10px]">
                    Simulados
                  </span>
                  <div className="flex-1 h-px bg-dark-border ml-4"></div>
                </div>
                {eventsConfig?.experience_description && (
                  <p className="text-dark-muted text-sm md:text-base font-inter ml-11">
                    {eventsConfig.experience_description}
                  </p>
                )}
              </div>

              {experienceEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {experienceEvents.map(renderEventCard)}
                </div>
              ) : (
                <div className="py-12 text-center bg-dark-card/30 border border-dark-border/50 rounded-xl">
                  <p className="text-zinc-600 font-bold uppercase tracking-widest text-sm italic">Nenhum evento experience programado no momento.</p>
                </div>
              )}
            </div>

            {/* EVENTOS OFICIAIS */}
            <div>
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic">
                      {eventsConfig?.oficial_title || 'Eventos Oficiais'}
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-white/5 border border-white/10 text-zinc-400 font-black uppercase tracking-widest text-[10px]">
                    Competição
                  </span>
                  <div className="flex-1 h-px bg-dark-border ml-4"></div>
                </div>
                {eventsConfig?.oficial_description && (
                  <p className="text-dark-muted text-sm md:text-base font-inter ml-11">
                    {eventsConfig.oficial_description}
                  </p>
                )}
              </div>

              {oficialEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {oficialEvents.map(renderEventCard)}
                </div>
              ) : (
                <div className="py-12 text-center bg-dark-card/30 border border-dark-border/50 rounded-xl">
                  <p className="text-zinc-600 font-bold uppercase tracking-widest text-sm italic">Nenhum evento oficial programado no momento.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

