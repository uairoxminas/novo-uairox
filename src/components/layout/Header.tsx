import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_LINKS = [
  { to: '/#etapas', label: 'Eventos' },
  { to: '/experience', label: 'Experience', highlight: true },
  { to: '/leaderboard', label: 'Resultados' },
  { to: '/store', label: 'Loja' },
  { to: '/gallery', label: 'Fotos' },
  { to: '/squad', label: 'Squad' },
  { to: '/locations', label: 'Onde Treinar' },
];

export default function Header() {
  const { data: config } = useSiteConfig();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const whatsappLink = config?.whatsapp_support?.whatsapp_link || 'https://wa.me/5531999999999';

  // Close mobile menu on navigation
  const handleNavClick = () => setMobileOpen(false);

  return (
    <nav className="fixed w-full bg-dark-bg/90 backdrop-blur-xl z-50 border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex justify-between h-20 md:h-24 items-center">
                <div className="flex-shrink-0 flex items-center">
                    <Link to="/" className="flex items-center" onClick={handleNavClick}>
                        <img 
                            src="/logo-uairox.webp" 
                            alt="UAIROX" 
                            className="w-[140px] md:w-[280px] h-auto object-contain"
                            loading="eager"
                            decoding="async"
                        />
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex space-x-8 items-center">
                    {NAV_LINKS.map(link => (
                      <Link 
                        key={link.to} 
                        to={link.to} 
                        className={`text-sm font-bold uppercase tracking-widest transition-colors ${link.highlight ? 'text-brand-500 hover:text-white' : 'text-dark-muted hover:text-white'}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white px-6 py-3 font-black text-sm hover:bg-[#128C7E] transition-all uppercase tracking-widest skew-x-[-10deg] shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
                        <span className="flex flex-row items-center justify-center gap-2 skew-x-[10deg]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                            Contato
                        </span>
                    </a>
                </div>

                {/* Mobile Hamburger Button */}
                <button 
                  onClick={() => setMobileOpen(!mobileOpen)} 
                  className="md:hidden p-2 text-white hover:text-brand-500 transition-colors z-60"
                  aria-label="Menu"
                >
                  {mobileOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setMobileOpen(false)}
              />

              {/* Drawer Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                className="fixed top-0 right-0 w-[80vw] max-w-[320px] h-full bg-[#0a0a0a] border-l border-dark-border z-50 md:hidden flex flex-col"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-5 border-b border-dark-border">
                  <img src="/logo-uairox.webp" alt="UAIROX" className="w-[100px] h-auto" />
                  <button onClick={() => setMobileOpen(false)} className="p-1 text-zinc-400 hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                {/* Nav Links */}
                <div className="flex-1 overflow-y-auto py-4">
                  {NAV_LINKS.map((link, i) => (
                    <motion.div
                      key={link.to}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        to={link.to}
                        onClick={handleNavClick}
                        className={`block px-6 py-4 text-base font-black uppercase tracking-widest border-b border-dark-border/50 transition-colors ${
                          link.highlight 
                            ? 'text-brand-500 hover:bg-brand-500/10' 
                            : (location.pathname === link.to ? 'text-white bg-white/5' : 'text-zinc-400 hover:text-white hover:bg-white/5')
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* WhatsApp CTA */}
                <div className="p-5 border-t border-dark-border">
                  <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={handleNavClick}
                    className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-4 font-black text-sm uppercase tracking-widest hover:bg-[#128C7E] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                    Contato WhatsApp
                  </a>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
    </nav>
  );
}
