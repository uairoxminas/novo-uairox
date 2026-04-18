import { useSiteConfig } from '@/hooks/useSiteConfig';

export default function Footer() {
  const { data: config } = useSiteConfig();
  const footerConfig = config?.home_footer || {
    description: 'Desenhado para atletas de endurance. Prepare-se para a corrida híbrida definitiva de Minas Gerais.',
    ig_link: '#',
    yt_link: '#',
    copyright: '© 2026 UAIROX Hybrid Racing. Todos os direitos reservados.'
  };

  const getExternalLink = (url: string) => {
    if (!url || url === '#') return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  return (
    <footer className="bg-dark-bg py-16 px-4 text-center border-t border-dark-border">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
            <img 
                src="/logo-uairox.webp" 
                alt="UAIROX" 
                className="w-[180px] md:w-[240px] h-auto object-contain mb-8"
                loading="lazy"
            />
            <p className="text-dark-muted text-sm max-w-md mx-auto mb-8 font-medium font-inter">
                {footerConfig.description}
            </p>
            <div className="flex gap-4 mb-12">
                <a 
                  href={getExternalLink(footerConfig.ig_link)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-12 h-12 rounded-full border border-dark-border flex items-center justify-center text-dark-muted hover:text-brand-500 hover:border-brand-500 transition-all"
                  aria-label="Instagram"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a 
                  href={getExternalLink(footerConfig.yt_link)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-12 h-12 rounded-full border border-dark-border flex items-center justify-center text-dark-muted hover:text-brand-500 hover:border-brand-500 transition-all"
                  aria-label="YouTube"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                </a>
            </div>
            <p className="text-xs text-dark-border uppercase tracking-widest font-bold">{footerConfig.copyright}</p>
        </div>
    </footer>
  );
}
