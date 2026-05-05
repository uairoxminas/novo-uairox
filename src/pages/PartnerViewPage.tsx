import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const cardClass = "bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl";

export default function PartnerViewPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [linkLabel, setLinkLabel] = useState('Parceiro');
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    // 1. Validate token
    const { data: link, error: linkErr } = await (supabase as any)
      .from('event_partner_links')
      .select('*')
      .eq('token', token)
      .is('revoked_at', null)
      .single();

    if (linkErr || !link) {
      setError('Link inválido ou revogado.');
      setLoading(false);
      return;
    }

    setLinkLabel(link.label || 'Parceiro');

    // 2. Fetch event
    const { data: ev } = await supabase.from('events').select('*').eq('id', link.event_id).single();
    if (!ev) {
      setError('Evento não encontrado.');
      setLoading(false);
      return;
    }
    setEvent(ev);

    // 3. Fetch registrations + categories
    const [regRes, catRes] = await Promise.all([
      supabase
        .from('registrations')
        .select('*, categories(name, team_size), heats(title, start_time)')
        .eq('event_id', link.event_id)
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('event_id', link.event_id).order('created_at'),
    ]);

    setRegistrations(regRes.data || []);
    setCategories(catRes.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
        <div className="bg-[#0a0a0a] border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
          <span className="text-4xl mb-4 block">🔒</span>
          <h2 className="text-xl font-black text-white mb-2">Acesso Negado</h2>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    confirmed: { label: 'Confirmado', color: 'bg-green-500/20 text-green-400' },
    pending: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400' },
    waitlist: { label: 'Lista de Espera', color: 'bg-amber-500/20 text-amber-400' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
  };

  const filtered = filter
    ? registrations.filter(r => r.status === filter)
    : registrations;

  const confirmed = registrations.filter(r => r.status === 'confirmed').length;
  const pending = registrations.filter(r => r.status === 'pending').length;
  const waitlist = registrations.filter(r => r.status === 'waitlist').length;

  // Category breakdown
  const catMap: Record<string, { name: string; count: number }> = {};
  registrations.forEach(r => {
    const catName = (r.categories as any)?.name || 'Sem Categoria';
    const catId = r.category_id;
    if (!catMap[catId]) catMap[catId] = { name: catName, count: 0 };
    catMap[catId].count++;
  });

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="bg-[#0a0a0a] border-b border-[#1a1a1a] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-white tracking-tighter italic">UAIROX</span>
            <span className="text-[10px] px-2 py-0.5 bg-[#EDAC02]/10 text-[#EDAC02] rounded font-bold border border-[#EDAC02]/20 uppercase tracking-widest">
              Parceiro
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-1 bg-[#111] border border-[#262626] rounded-lg text-zinc-500 font-bold uppercase tracking-wider">
              👁️ Somente Visualização
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Event Info */}
        <div className={`${cardClass} p-5`}>
          <div className="flex items-center gap-4">
            {event.image_url && (
              <img src={event.image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black text-white uppercase tracking-tight">{event.title}</h1>
                <span className="text-[10px] px-2 py-0.5 bg-[#EDAC02]/10 text-[#EDAC02] rounded font-bold border border-[#EDAC02]/20">
                  {linkLabel}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                <span>📅 {format(new Date(event.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                <span>📍 {event.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Inscritos', value: registrations.length, color: 'text-white' },
            { label: 'Confirmados', value: confirmed, color: 'text-green-400' },
            { label: 'Pendentes', value: pending, color: 'text-yellow-400' },
            { label: 'Lista de Espera', value: waitlist, color: 'text-amber-400' },
          ].map((kpi, i) => (
            <div key={i} className={`${cardClass} p-4`}>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{kpi.label}</p>
              <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Categories Breakdown */}
        {Object.keys(catMap).length > 0 && (
          <div className={`${cardClass} p-5`}>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Por Categoria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(catMap).map(([id, data]) => (
                <div key={id} className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-white font-bold">{data.name}</span>
                  <span className="text-xs text-zinc-400">{data.count} inscritos</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            ['all', `Todos (${registrations.length})`],
            ['confirmed', `Confirmados (${confirmed})`],
            ['pending', `Pendentes (${pending})`],
            ['waitlist', `Lista de Espera (${waitlist})`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key === 'all' ? null : key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                (key === 'all' && !filter) || filter === key
                  ? 'border-[#EDAC02] bg-[#EDAC02]/10 text-[#EDAC02]'
                  : 'border-[#262626] text-zinc-500 hover:border-zinc-600'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-[#111] border border-[#262626] text-zinc-300 text-xs font-bold rounded-lg hover:border-[#EDAC02] hover:text-[#EDAC02] transition-all"
          >
            🔄 Atualizar
          </button>
        </div>

        {/* Registrations Table */}
        <div className={`${cardClass} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Nº</th>
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Equipe / Atleta</th>
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Categoria</th>
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Bateria</th>
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Status</th>
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Email</th>
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Telefone</th>
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Instagram</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg: any) => {
                  const st = statusConfig[reg.status] || statusConfig.pending;
                  const isTeamCat = ((reg.categories as any)?.team_size || 1) > 1;
                  const displayName = isTeamCat ? (reg.team_name || reg.athlete_name || '—') : (reg.athlete_name || '—');

                  return (
                    <tr key={reg.id} className="border-b border-[#0f0f0f] hover:bg-[#0a0a0a] transition-colors">
                      <td className="py-3 px-3 font-mono text-zinc-400">{reg.bib_number || '—'}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-white">{displayName}</div>
                        {isTeamCat && reg.team_members && (
                          <div className="text-[10px] text-zinc-600 mt-0.5">
                            {(reg.team_members as any[]).map((m: any) => m.name).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-zinc-400">{(reg.categories as any)?.name || '—'}</td>
                      <td className="py-3 px-3 text-zinc-400">{(reg.heats as any)?.title || '—'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400 text-xs">{reg.athlete_email || '—'}</td>
                      <td className="py-3 px-3 text-zinc-400 text-xs">{reg.athlete_phone || '—'}</td>
                      <td className="py-3 px-3 text-zinc-400 text-xs">{reg.athlete_instagram || '—'}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-zinc-600 text-sm">Nenhuma inscrição encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-[#1a1a1a] text-center mt-8">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">UAIROX • Painel do Parceiro • Somente Visualização</p>
      </footer>
    </div>
  );
}
