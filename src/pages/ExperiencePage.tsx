import { motion } from 'framer-motion';
import { Target, Heart, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { useSiteConfig } from '@/hooks/useSiteConfig';

export default function ExperiencePage() {
  const { data: config } = useSiteConfig();
  
  if (!config?.experience_page) {
    return <div className="min-h-screen flex items-center justify-center text-white">Carregando...</div>;
  }

  const {
    hero,
    objective,
    format,
    pricing,
    business_model,
    branding,
    responsibilities,
    gallery,
    cta
  } = config.experience_page;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-500 selection:text-black">
      {/* HERO SECTION */}
      <section className="relative pt-24 pb-12 md:pt-48 md:pb-32 overflow-hidden border-b border-dark-border">
        {hero.bg_image && (
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-black/80 z-10" />
            <img src={hero.bg_image} alt="Background" className="w-full h-full object-cover opacity-50 grayscale" />
          </div>
        )}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl"
          >
            <div className="inline-block px-4 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-500 text-sm font-bold uppercase tracking-widest skew-x-[-10deg] mb-6">
              <span className="block skew-x-[10deg]">Para Box & Academias</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-black uppercase italic leading-none mb-4 md:mb-6">
              {hero.title_top} <br className="hidden md:block" />
              <span className="text-brand-500">{hero.title_highlight}</span>
            </h1>
            
            <p className="text-base md:text-lg lg:text-xl text-zinc-400 max-w-2xl leading-relaxed">
              {hero.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* OBJECTIVE SECTION */}
      <section className="py-12 md:py-20 bg-dark-bg relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-brand-500 uppercase tracking-widest mb-2">{objective.subtitle}</h2>
            <h3 className="text-3xl md:text-4xl font-black text-white uppercase italic">{objective.title}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
              {objective.items.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-dark-card border border-dark-border p-8 rounded-2xl relative overflow-hidden group hover:border-brand-500/50 transition-colors"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
                <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center mb-6 text-brand-500 border border-brand-500/20">
                  {item.icon === 'target' ? <Target size={24} /> : <Heart size={24} />}
                </div>
                <h4 className="text-2xl font-black text-white uppercase italic mb-4">{item.title}</h4>
                <p className="text-zinc-400 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
            </div>
            {objective.image_url && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="hidden lg:block h-full min-h-[300px] bg-[#111] rounded-2xl overflow-hidden border border-dark-border"
              >
                <img src={objective.image_url} alt="Objetivo Experience" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* FORMAT & PROVA */}
      <section className="py-20 bg-[#0a0a0a] border-y border-dark-border relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic mb-4">
              {format.title.split(' ')[0]} <span className="text-brand-500">{format.title.substring(format.title.indexOf(' '))}</span>
            </h2>
            <p className="text-zinc-400 max-w-2xl text-lg">{format.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {format.stations.map((station, idx) => (
              <div key={idx} className="bg-[#111] border border-dark-border p-6 relative group overflow-hidden skew-x-[-5deg] hover:border-brand-500/50 transition-colors">
                <div className="skew-x-[5deg]">
                  <div className="text-4xl font-black text-brand-500/20 absolute -right-2 -top-2 select-none group-hover:text-brand-500/40 transition-colors">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <h4 className="text-lg font-bold text-white uppercase mb-2 relative z-10">{station.name}</h4>
                  <p className="text-brand-500 font-bold text-sm uppercase tracking-wider relative z-10">{station.metric}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSCRICOES E VALORES & MODELO DE NEGOCIO */}
      <section className="py-20 bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Valores */}
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic mb-8 flex items-center gap-3">
                <span className="w-8 h-1 bg-brand-500"></span>
                {pricing.title}
              </h3>
              
              <div className="bg-[#111] border border-dark-border p-8 rounded-xl space-y-6">
                <div>
                  <div className="text-sm text-zinc-500 font-bold uppercase mb-1">Valor Padrão</div>
                  <div className="text-3xl font-black text-brand-500 uppercase">{pricing.default_price}</div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-dark-border">
                  <div className="flex gap-3">
                    <CheckCircle2 className="text-brand-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-zinc-300 text-sm">{pricing.includes}</p>
                  </div>
                  <div className="flex gap-3">
                    <XCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-zinc-300 text-sm">{pricing.excludes}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-dark-border bg-brand-500/5 p-4 rounded-lg border border-brand-500/10">
                  <p className="text-sm text-zinc-300"><span className="text-brand-500 font-bold">Pulseira Finisher:</span> {pricing.optional}</p>
                </div>
              </div>
              {pricing.image_url && (
                <div className="mt-6 rounded-xl overflow-hidden border border-dark-border h-48 md:h-64">
                  <img src={pricing.image_url} alt="Valores Experience" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                </div>
              )}
            </div>

            {/* Modelo de Negócio */}
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic mb-8 flex items-center gap-3">
                <span className="w-8 h-1 bg-brand-500"></span>
                {business_model.title}
              </h3>
              
              <p className="text-zinc-400 mb-6">{business_model.description}</p>
              
              <div className="space-y-4">
                {business_model.tiers.map((tier, idx) => (
                  <div key={idx} className="bg-dark-card border border-dark-border p-6 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="bg-[#111] px-4 py-2 rounded font-bold text-brand-500 uppercase text-sm text-center shrink-0 border border-dark-border">
                      {tier.label}
                    </div>
                    <p className="text-zinc-300 text-sm">{tier.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BRANDING E RESPONSABILIDADES */}
      <section className="py-20 bg-[#0a0a0a] border-t border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-16">
            <h3 className="text-2xl font-black text-white uppercase italic mb-8 flex items-center gap-3">
              <span className="w-8 h-1 bg-brand-500"></span>
              {branding.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {branding.rules.map((rule, idx) => (
                <div key={idx} className={`p-6 border rounded-xl ${rule.is_prohibited ? 'bg-red-500/5 border-red-500/20' : 'bg-[#111] border-dark-border'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {rule.is_prohibited ? <AlertTriangle size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-brand-500" />}
                    <h4 className={`font-bold uppercase text-sm ${rule.is_prohibited ? 'text-red-500' : 'text-white'}`}>{rule.title}</h4>
                  </div>
                  <p className="text-zinc-400 text-sm">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black text-white uppercase italic mb-8 flex items-center gap-3">
              <span className="w-8 h-1 bg-brand-500"></span>
              {responsibilities.title}
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* UAIROX */}
              <div className="bg-[#111] border border-dark-border rounded-2xl overflow-hidden">
                <div className="bg-brand-500 text-black font-black uppercase italic p-4 text-center text-lg">
                  Caberá à UAIROX
                </div>
                <div className="p-6 space-y-4">
                  {responsibilities.uairox_tasks.map((task, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0" />
                      <p className="text-zinc-300 text-sm leading-relaxed">{task}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* BOX */}
              <div className="bg-[#111] border border-dark-border rounded-2xl overflow-hidden">
                <div className="bg-zinc-800 text-white font-black uppercase italic p-4 text-center text-lg">
                  Caberá ao Box / CT
                </div>
                <div className="p-6 space-y-4">
                  {responsibilities.box_tasks.map((task, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-2 shrink-0" />
                      <p className="text-zinc-300 text-sm leading-relaxed">{task}</p>
                    </div>
                  ))}
                </div>
              </div>
              </div>
              
              {responsibilities.image_url && (
                <div className="hidden lg:block h-full min-h-[300px] bg-[#111] rounded-2xl overflow-hidden border border-dark-border">
                  <img src={responsibilities.image_url} alt="Responsabilidades Experience" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                </div>
              )}
            </div>
          </div>
          
        </div>
      </section>

      {/* GALLERY */}
      {gallery?.images && gallery.images.length > 0 && (
        <section className="py-20 bg-dark-bg border-t border-dark-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-black text-center text-white uppercase italic mb-12">
              {gallery.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {gallery.images.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-[#111] border border-dark-border group">
                  <img 
                    src={img} 
                    alt={`Experience Gallery ${idx + 1}`} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 grayscale group-hover:grayscale-0"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="py-24 bg-brand-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-black uppercase italic mb-6">
            {cta.title}
          </h2>
          <p className="text-black/80 text-lg md:text-xl font-medium mb-10 max-w-2xl mx-auto">
            {cta.description}
          </p>
          <a
            href={cta.button_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-black text-white px-8 py-5 font-black uppercase tracking-widest text-lg skew-x-[-10deg] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] transition-all"
          >
            <span className="skew-x-[10deg]">{cta.button_text}</span>
            <ArrowRight className="skew-x-[10deg]" />
          </a>
        </div>
      </section>

    </div>
  );
}
