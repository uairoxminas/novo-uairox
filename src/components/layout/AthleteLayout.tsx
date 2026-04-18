import { Outlet } from 'react-router-dom';

export default function AthleteLayout() {
  return (
    <div className="flex min-h-screen bg-uairox-dark">
      <aside className="w-64 bg-uairox-space border-r border-white/10 hidden md:block">
        <div className="p-6">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-uairox-green to-emerald-400">
            Área do Atleta
          </h2>
        </div>
        <nav className="px-4 space-y-2 text-zinc-400">
          <div className="p-3 rounded-lg bg-white/5 text-white">Meu Painel</div>
          <div className="p-3 rounded-lg hover:bg-white/5 cursor-pointer">Meus Eventos</div>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-white/10 md:hidden flex items-center px-4 bg-uairox-space">
          <span className="font-bold text-white">Área do Atleta</span>
        </header>
        <div className="w-full max-w-7xl p-6 mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
