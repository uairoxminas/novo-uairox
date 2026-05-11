import { Outlet, Link, useLocation } from 'react-router-dom';
import { Timer, Trophy, ShoppingBag, Camera, MapPin } from 'lucide-react';

function NavItem({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to));
  
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-[#EDAC02]/10 text-[#EDAC02] border border-[#EDAC02]/20'
          : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-[#050505]">
      <aside className="w-64 bg-[#0a0a0a] border-r border-[#1a1a1a] hidden md:flex flex-col">
        <div className="p-6 border-b border-[#1a1a1a]">
          <Link to="/" className="block">
            <h2 className="text-xl font-black text-white">
              UAIROX <span className="text-[#EDAC02]">Admin</span>
            </h2>
          </Link>
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          <NavItem
            to="/admin"
            label="Visão Geral"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
          />
          <NavItem
            to="/admin/landing"
            label="Landing Page"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>}
          />
          <NavItem
            to="/admin/experience"
            label="Experience"
            icon={<svg className="w-4 h-4 text-[#EDAC02]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
          <NavItem
            to="/admin/events"
            label="Eventos"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <NavItem
            to="/admin/store"
            label="Loja"
            icon={<ShoppingBag className="w-4 h-4" />}
          />
          <NavItem
            to="/admin/photos"
            label="Fotos"
            icon={<Camera className="w-4 h-4" />}
          />
          <NavItem
            to="/admin/squad"
            label="SQUAD"
            icon={
              <svg className="w-4 h-4 text-[#EDAC02]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
          />
          <NavItem
            to="/admin/locations"
            label="Parceiros/Locais"
            icon={<MapPin className="w-4 h-4" />}
          />
          <NavItem
            to="/admin/raceday"
            label="RACE DAY"
            icon={
              <svg className="w-4 h-4 text-[#EDAC02]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <NavItem
            to="/admin/results"
            label="RESULTADOS"
            icon={<Trophy className="w-4 h-4 text-[#EDAC02]" />}
          />
          <NavItem
            to="/admin/marketing"
            label="Marketing"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
          />
          <NavItem
            to="/admin/users"
            label="Usuários"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          />
        </nav>
        <div className="p-4 border-t border-[#1a1a1a]">
          <Link to="/" className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Voltar ao Site
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="md:hidden">
            <h2 className="text-sm font-black text-white">UAIROX <span className="text-[#EDAC02]">Admin</span></h2>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

