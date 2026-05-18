import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const db = supabase as any;

const LEVELS = [
  { name: 'Iniciante', min: 0,   emoji: '⭐', color: 'text-zinc-400' },
  { name: 'Bronze',    min: 10,  emoji: '🥉', color: 'text-orange-400' },
  { name: 'Prata',     min: 25,  emoji: '🥈', color: 'text-slate-300' },
  { name: 'Ouro',      min: 50,  emoji: '🥇', color: 'text-yellow-400' },
  { name: 'Elite',     min: 100, emoji: '🔥', color: 'text-red-400' },
];

function getLevel(n: number) {
  return [...LEVELS].reverse().find(l => n >= l.min) ?? LEVELS[0];
}

type RankEntry = {
  id: string;
  name: string;
  type: 'squad' | 'location';
  avatar: string | null;
  coupon_code: string | null;
  portal_token: string | null;
  total: number;
  role?: string;
  city?: string;
};

export default function SquadRankingPage() {
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'squad' | 'location'>('all');
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [logsRes, membersRes, locRes, evRes] = await Promise.all([
      db.from('coupon_benefit_logs').select('squad_member_id, location_id, event_id'),
      db.from('squad_members').select('id, full_name, avatar_url, coupon_code, portal_token, role').eq('is_active', true),
      db.from('training_locations').select('id, name, logo_url, coupon_code, portal_token, city').eq('status', 'approved'),
      db.from('events').select('id, title').order('date', { ascending: false }).limit(20),
    ]);

    const logs: any[] = logsRes.data ?? [];
    const members: any[] = membersRes.data ?? [];
    const locations: any[] = locRes.data ?? [];
    setEvents(evRes.data ?? []);

    // Count per owner
    const squadCount: Record<string, number> = {};
    const locCount: Record<string, number> = {};

    for (const l of logs) {
      if (l.squad_member_id) squadCount[l.squad_member_id] = (squadCount[l.squad_member_id] ?? 0) + 1;
      if (l.location_id)     locCount[l.location_id]     = (locCount[l.location_id] ?? 0) + 1;
    }

    const squadEntries: RankEntry[] = members
      .filter(m => (squadCount[m.id] ?? 0) > 0)
      .map(m => ({
        id: m.id, name: m.full_name, type: 'squad',
        avatar: m.avatar_url, coupon_code: m.coupon_code,
        portal_token: m.portal_token, total: squadCount[m.id] ?? 0,
        role: m.role,
      }));

    const locEntries: RankEntry[] = locations
      .filter(l => (locCount[l.id] ?? 0) > 0)
      .map(l => ({
        id: l.id, name: l.name, type: 'location',
        avatar: l.logo_url, coupon_code: l.coupon_code,
        portal_token: l.portal_token, total: locCount[l.id] ?? 0,
        city: l.city,
      }));

    const all = [...squadEntries, ...locEntries].sort((a, b) => b.total - a.total);
    setEntries(all);
    setLoading(false);
  };

  const loadByEvent = async (eventId: string) => {
    if (eventId === 'all') { loadData(); return; }
    setLoading(true);

    const [logsRes, membersRes, locRes] = await Promise.all([
      db.from('coupon_benefit_logs').select('squad_member_id, location_id').eq('event_id', eventId),
      db.from('squad_members').select('id, full_name, avatar_url, coupon_code, portal_token, role').eq('is_active', true),
      db.from('training_locations').select('id, name, logo_url, coupon_code, portal_token, city').eq('status', 'approved'),
    ]);

    const logs: any[] = logsRes.data ?? [];
    const members: any[] = membersRes.data ?? [];
    const locations: any[] = locRes.data ?? [];

    const squadCount: Record<string, number> = {};
    const locCount: Record<string, number> = {};
    for (const l of logs) {
      if (l.squad_member_id) squadCount[l.squad_member_id] = (squadCount[l.squad_member_id] ?? 0) + 1;
      if (l.location_id)     locCount[l.location_id]       = (locCount[l.location_id] ?? 0) + 1;
    }

    const all: RankEntry[] = [
      ...members.filter(m => (squadCount[m.id] ?? 0) > 0).map(m => ({
        id: m.id, name: m.full_name, type: 'squad' as const,
        avatar: m.avatar_url, coupon_code: m.coupon_code,
        portal_token: m.portal_token, total: squadCount[m.id] ?? 0, role: m.role,
      })),
      ...locations.filter(l => (locCount[l.id] ?? 0) > 0).map(l => ({
        id: l.id, name: l.name, type: 'location' as const,
        avatar: l.logo_url, coupon_code: l.coupon_code,
        portal_token: l.portal_token, total: locCount[l.id] ?? 0, city: l.city,
      })),
    ].sort((a, b) => b.total - a.total);

    setEntries(all);
    setLoading(false);
  };

  const handleEventChange = (eid: string) => {
    setSelectedEvent(eid);
    loadByEvent(eid);
  };

  const visible = entries.filter(e => filter === 'all' || e.type === filter);

  const podium = visible.slice(0, 3);
  const rest   = visible.slice(3);

  const podiumOrder = podium.length >= 3 ? [podium[1], podium[0], podium[2]] : podium;
  const podiumHeights = ['h-24', 'h-36', 'h-20'];
  const podiumPositions = ['2nd', '1st', '3rd'];

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EDAC02]/8 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 py-10 text-center">
          <p className="text-[10px] text-[#EDAC02] uppercase tracking-widest font-bold mb-2">UAIROX</p>
          <h1 className="text-3xl font-black text-white uppercase italic">Ranking de Indicadores</h1>
          <p className="text-zinc-500 text-sm mt-2">Squad members e parceiros com mais indicações confirmadas</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            {(['all', 'squad', 'location'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${filter === f ? 'bg-[#EDAC02]/10 border-[#EDAC02]/40 text-[#EDAC02]' : 'border-[#262626] text-zinc-500 hover:border-zinc-500'}`}
              >
                {f === 'all' ? '🏆 Todos' : f === 'squad' ? '👤 Squad' : '📍 Parceiros'}
              </button>
            ))}
          </div>
          <select
            value={selectedEvent}
            onChange={e => handleEventChange(e.target.value)}
            className="flex-1 bg-[#050505] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[#EDAC02] focus:outline-none"
          >
            <option value="all">Todos os eventos</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <p className="text-4xl mb-3">🏅</p>
            <p className="text-sm">Nenhuma indicação registrada ainda.</p>
          </div>
        )}

        {/* Podium (top 3) */}
        {!loading && podium.length > 0 && (
          <div className="flex items-end justify-center gap-4 pt-4 pb-2">
            {podiumOrder.map((e, idx) => {
              if (!e) return <div key={idx} className="flex-1" />;
              const level = getLevel(e.total);
              const realPos = podium.indexOf(e);
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  {e.avatar ? (
                    <img src={e.avatar} alt={e.name} className="w-14 h-14 rounded-full object-cover border-2 border-[#EDAC02]/40" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#111] border-2 border-[#EDAC02]/20 flex items-center justify-center text-2xl">
                      {e.type === 'squad' ? '👤' : '📍'}
                    </div>
                  )}
                  <p className="text-xs font-bold text-white text-center leading-tight">{e.name.split(' ')[0]}</p>
                  <p className={`text-xs font-black ${level.color}`}>{e.total} tickets</p>
                  <div className={`w-full ${podiumHeights[idx]} rounded-t-xl flex items-end justify-center pb-2 ${
                    realPos === 0 ? 'bg-[#EDAC02]/20 border-t-2 border-x-2 border-[#EDAC02]/40' :
                    realPos === 1 ? 'bg-zinc-800/60 border-t-2 border-x-2 border-zinc-600/40' :
                    'bg-orange-900/20 border-t-2 border-x-2 border-orange-700/30'
                  }`}>
                    <span className="text-2xl">{medals[realPos]}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        {!loading && visible.length > 0 && (
          <div className="space-y-2">
            {visible.map((e, i) => {
              const level = getLevel(e.total);
              const portalSlug = e.coupon_code || e.portal_token;
              const portalUrl = portalSlug ? `${window.location.origin}/squad/${portalSlug}` : null;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 hover:border-[#EDAC02]/20 transition-colors"
                >
                  <span className="w-8 text-center font-black text-zinc-600 text-sm">#{i + 1}</span>
                  {e.avatar ? (
                    <img src={e.avatar} alt={e.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#111] border border-[#262626] flex items-center justify-center text-lg flex-shrink-0">
                      {e.type === 'squad' ? '👤' : '📍'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white truncate">{e.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        e.type === 'squad'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      } font-bold`}>
                        {e.type === 'squad' ? `Squad · ${e.role ?? ''}` : `Parceiro · ${e.city ?? ''}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs ${level.color}`}>{level.emoji} {level.name}</span>
                      {e.coupon_code && (
                        <span className="text-[10px] text-zinc-600 font-mono">{e.coupon_code}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black text-[#EDAC02]">{e.total}</p>
                    <p className="text-[10px] text-zinc-600">tickets</p>
                  </div>
                  {portalUrl && (
                    <a
                      href={portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] px-2 py-1 rounded border border-[#262626] text-zinc-500 hover:border-[#EDAC02]/40 hover:text-[#EDAC02] transition-colors flex-shrink-0"
                    >
                      Painel
                    </a>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
