import React from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Trophy } from 'lucide-react';

export default function AdminResultsEventsPage() {
  const { data: events, isLoading } = useEvents();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-500">Carregando Eventos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#0a0a0a] p-6 rounded-2xl border border-[#1a1a1a]">
        <div>
           <h1 className="text-3xl font-black text-white uppercase tracking-tight">🏆 Central de Resultados</h1>
           <p className="text-zinc-500 mt-1">Selecione um evento para gerenciar o Leaderboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events?.map((event: any) => (
          <div 
            key={event.id}
            onClick={() => navigate(`/admin/results/${event.id}`)}
            className="group bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 cursor-pointer hover:bg-[#111] hover:border-[#333] transition-all"
          >
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#EDAC02] transition-colors">{event.title}</h3>
            <div className="space-y-2 text-sm text-zinc-400">
              <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(event.date).toLocaleDateString('pt-BR')}</p>
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.location}</p>
            </div>
            
            <div className="mt-6 flex items-center justify-between text-[#EDAC02] font-black uppercase text-xs tracking-widest">
               <span>Abrir Leaderboard</span>
               <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
