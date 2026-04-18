import React from 'react';
import { useEvents } from '@/hooks/useEvents';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminRaceDayPage() {
  const { data: events, isLoading } = useEvents();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#EDAC02] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* HEADER TOWER */}
      <div className="flex items-center justify-between bg-[#EDAC02]/10 border border-[#EDAC02]/30 p-6 rounded-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="text-4xl">🏁</span>
            Torre de Controle <span className="text-[#EDAC02]">Race Day</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-sm max-w-xl">
            Selecione um evento abaixo para acessar o Painel do Árbitro Geral. Apenas Heats e Baterias que existem na agenda do evento vão aparecer na Mesa Operacional.
          </p>
        </div>
        
        {/* Background Effects */}
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[#EDAC02]/20 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -right-8 -bottom-8 opacity-10">
          <svg className="w-48 h-48 text-[#EDAC02]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm3.3 14.71L11 12.41V7h2v4.59l3.71 3.71-1.41 1.41z"/></svg>
        </div>
      </div>

      {/* EVENT SELECTION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events?.map((event: any) => (
          <div 
            key={event.id}
            onClick={() => navigate(`/admin/raceday/${event.id}`)}
            className="group relative bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#EDAC02]/50 p-5 rounded-2xl transition-all cursor-pointer overflow-hidden flex flex-col"
          >
            {/* Visual Indicator of Live Status */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#EDAC02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="mb-4">
              <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-[#1a1a1a] text-xs font-bold text-zinc-400 mb-3">
                {new Date(event.date).toLocaleDateString('pt-BR')}
              </span>
              <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight group-hover:text-[#EDAC02] transition-colors line-clamp-2">
                {event.title}
              </h3>
            </div>
            
            <div className="mt-auto pt-4 border-t border-[#1a1a1a] flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span>Acessar Mesa</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#1a1a1a] group-hover:bg-[#EDAC02] flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-zinc-500 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          </div>
        ))}

        {events?.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-[#262626] rounded-2xl bg-[#0a0a0a]">
            Nenhum evento ativo encontrado para arbitragem.
          </div>
        )}
      </div>
    </div>
  );
}
