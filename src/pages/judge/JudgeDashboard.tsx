export default function JudgeDashboard() {
  return (
    <div className="space-y-4">
      <div className="bg-white/5 rounded-xl border border-white/10 p-5 text-center">
        <div className="w-16 h-16 bg-uairox-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-uairox-green text-2xl font-bold">J</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Área do Juiz</h2>
        <p className="text-zinc-400 text-sm">Selecione uma bateria ou prova para iniciar a marcação.</p>
      </div>
      
      <div className="space-y-3 mt-6">
        {/* Lista de Baterias Dummy */}
        <button className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-uairox-green/50 transition-colors">
          <div className="flex justify-between items-center text-white">
            <span className="font-bold">Bateria 1 - Rx</span>
            <span className="text-xs bg-uairox-green/20 text-uairox-green px-2 py-1 rounded">10:00</span>
          </div>
        </button>
      </div>
    </div>
  );
}
