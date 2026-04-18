export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Visão Geral do Sistema</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white/5 rounded-xl border border-white/10">
          <h3 className="text-zinc-400 text-sm">Total de Eventos</h3>
          <p className="text-3xl font-bold text-white mt-2">--</p>
        </div>
      </div>
    </div>
  );
}
