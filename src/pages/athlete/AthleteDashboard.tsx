export default function AthleteDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Meu Painel</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-uairox-space-card border border-white/5 rounded-xl">
          <h3 className="text-zinc-400 mb-2">Próximos Eventos</h3>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
      </div>
    </div>
  );
}
