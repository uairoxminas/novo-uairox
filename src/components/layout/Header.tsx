import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <nav className="fixed w-full bg-dark-bg/90 backdrop-blur-xl z-50 border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex justify-between h-24 items-center">
                <div className="flex-shrink-0 flex items-center">
                    <Link to="/" className="flex items-center">
                        <img 
                            src="/logo-uairox.webp" 
                            alt="UAIROX" 
                            className="w-[180px] md:w-[280px] h-auto object-contain"
                            loading="eager"
                            decoding="async"
                        />
                    </Link>
                </div>
                <div className="hidden md:flex space-x-8 items-center">
                    <Link to="/#etapas" className="text-sm font-bold uppercase tracking-widest text-dark-muted hover:text-white transition-colors">Eventos</Link>
                    <Link to="/leaderboard" className="text-sm font-bold uppercase tracking-widest text-dark-muted hover:text-white transition-colors">Resultados</Link>
                    <Link to="/store" className="text-sm font-bold uppercase tracking-widest text-dark-muted hover:text-white transition-colors">Loja</Link>
                    <Link to="/gallery" className="text-sm font-bold uppercase tracking-widest text-dark-muted hover:text-white transition-colors">Fotos</Link>
                    <Link to="/squad" className="text-sm font-bold uppercase tracking-widest text-dark-muted hover:text-white transition-colors">Squad</Link>
                    <Link to="/locations" className="text-sm font-bold uppercase tracking-widest text-dark-muted hover:text-white transition-colors">Onde Treinar</Link>
                    <Link to="/#etapas" className="bg-brand-600 text-white px-8 py-3 font-black text-sm hover:bg-brand-500 transition-all uppercase tracking-widest skew-x-[-10deg] shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
                        <span className="inline-block skew-x-[10deg]">Inscreva-se</span>
                    </Link>
                </div>
            </div>
        </div>
    </nav>
  );
}
