import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EventData {
  id: string;
  title: string;
  slug: string;
  date: string;
  location: string;
  categories: { id: string; name: string }[];
  activeBatch: { id: string; price: number; name: string } | null;
}

interface Athlete {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birth_date: string;
  gender: string;
  gym: string;
}

const SLUGS = { selecao: 'selecao', experience: '8experience', oficial: '8oficial' };
const DISCOUNT = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loadEvent(slug: string): Promise<EventData | null> {
  const { data: ev } = await (supabase as any).from('events').select('id, title, slug, date, location').eq('slug', slug).maybeSingle();
  if (!ev) return null;
  const [catRes, batchRes] = await Promise.all([
    (supabase as any).from('categories').select('id, name').eq('event_id', ev.id).order('created_at'),
    (supabase as any).from('price_batches').select('id, name, price').eq('event_id', ev.id).eq('active', true).order('order_index').limit(1),
  ]);
  return {
    ...ev,
    categories: catRes.data || [],
    activeBatch: batchRes.data?.[0] || null,
  };
}

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Combo Card ───────────────────────────────────────────────────────────────
function ComboCard({ title, badge, events, onSelect }: {
  title: string;
  badge: string;
  events: [EventData, EventData] | null;
  onSelect: () => void;
}) {
  if (!events) return (
    <div className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const [ev1, ev2] = events;
  const p1 = ev1.activeBatch?.price || 0;
  const p2 = ev2.activeBatch?.price || 0;
  const total = p1 + p2;
  const combo = Math.round(total * (1 - DISCOUNT / 100) * 100) / 100;
  const savings = Math.round((total - combo) * 100) / 100;

  return (
    <div className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-8 flex flex-col gap-6 hover:border-[#EDAC02]/30 transition-colors group">
      <div>
        <span className="px-2 py-1 rounded bg-[#EDAC02]/10 text-[#EDAC02] text-[10px] font-black uppercase tracking-widest">{badge}</span>
        <h3 className="text-xl font-black text-white mt-3 uppercase tracking-tight">{title}</h3>
      </div>

      <div className="space-y-3">
        {[ev1, ev2].map(ev => (
          <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#111] border border-[#1a1a1a]">
            <span className="text-[#EDAC02] text-lg mt-0.5">◆</span>
            <div className="flex-1">
              <p className="text-xs font-black text-white uppercase tracking-tight">{ev.title}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {new Date(ev.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} · {ev.location}
              </p>
            </div>
            <p className="text-xs font-bold text-zinc-400">{fmt(ev.activeBatch?.price || 0)}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-[#1a1a1a] pt-4 space-y-1.5">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Total individual</span>
          <span className="line-through">{fmt(total)}</span>
        </div>
        <div className="flex justify-between text-xs text-[#25D366] font-bold">
          <span>Desconto combo ({DISCOUNT}%)</span>
          <span>- {fmt(savings)}</span>
        </div>
        <div className="flex justify-between text-lg font-black text-white">
          <span>Total combo</span>
          <span className="text-[#EDAC02]">{fmt(combo)}</span>
        </div>
      </div>

      <button
        onClick={onSelect}
        className="w-full py-3 rounded-xl bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest hover:bg-[#EDAC02]/90 transition-colors"
      >
        Garantir Combo →
      </button>
    </div>
  );
}

// ─── Registration Form ────────────────────────────────────────────────────────
function RegistrationForm({
  comboType,
  evSelecao,
  evOther,
  onSuccess,
  onBack,
}: {
  comboType: 'experience' | 'oficial';
  evSelecao: EventData;
  evOther: EventData;
  onSuccess: (data: any) => void;
  onBack: () => void;
}) {
  const [athlete, setAthlete] = useState<Athlete>({ name: '', email: '', phone: '', cpf: '', birth_date: '', gender: '', gym: '' });
  const [catId1, setCatId1] = useState('');
  const [catId2, setCatId2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (k: keyof Athlete, v: string) => setAthlete(prev => ({ ...prev, [k]: v }));

  const p1 = evSelecao.activeBatch?.price || 0;
  const p2 = evOther.activeBatch?.price || 0;
  const disc1 = Math.round(p1 * 0.9 * 100) / 100;
  const disc2 = Math.round(p2 * 0.9 * 100) / 100;
  const totalCombo = Math.round((disc1 + disc2) * 100) / 100;

  const inputClass = 'w-full bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#EDAC02]/40 transition-colors';
  const labelClass = 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block';

  const handleSubmit = async () => {
    if (!athlete.name.trim() || !athlete.email.trim() || !athlete.phone.trim() || !athlete.birth_date || !athlete.gender || !athlete.gym.trim()) {
      toast.error('Preencha todos os campos obrigatórios'); return;
    }
    if (!catId1) { toast.error('Selecione a categoria para o Desafio Seleção'); return; }
    if (!catId2) { toast.error('Selecione a categoria para o ' + evOther.title); return; }
    if (!evSelecao.activeBatch || !evOther.activeBatch) { toast.error('Lote não encontrado'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/combo-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athlete,
          combo_type: comboType,
          category_id_1: catId1,
          batch_id_1: evSelecao.activeBatch.id,
          category_id_2: catId2,
          batch_id_2: evOther.activeBatch.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar inscrição');
      onSuccess(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm transition-colors">← Voltar</button>
        <div>
          <h2 className="text-lg font-black text-white uppercase">Combo {comboType === 'experience' ? 'Experience' : 'Oficial'}</h2>
          <p className="text-[10px] text-zinc-500">{evSelecao.title} + {evOther.title}</p>
        </div>
      </div>

      {/* Athlete info */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 space-y-4">
        <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Dados do atleta</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className={labelClass}>Nome completo *</label><input value={athlete.name} onChange={e => setField('name', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Email *</label><input type="email" value={athlete.email} onChange={e => setField('email', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>WhatsApp *</label><input value={athlete.phone} onChange={e => setField('phone', e.target.value)} placeholder="31999999999" className={inputClass} /></div>
          <div><label className={labelClass}>CPF</label><input value={athlete.cpf} onChange={e => setField('cpf', e.target.value)} placeholder="000.000.000-00" className={inputClass} /></div>
          <div><label className={labelClass}>Data de nascimento *</label><input type="date" value={athlete.birth_date} onChange={e => setField('birth_date', e.target.value)} className={inputClass} /></div>
          <div>
            <label className={labelClass}>Gênero *</label>
            <select value={athlete.gender} onChange={e => setField('gender', e.target.value)} className={inputClass}>
              <option value="">Selecione</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>
          <div><label className={labelClass}>Box / Academia *</label><input value={athlete.gym} onChange={e => setField('gym', e.target.value)} className={inputClass} /></div>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[{ ev: evSelecao, catId: catId1, setCat: setCatId1, label: 'Desafio Seleção' }, { ev: evOther, catId: catId2, setCat: setCatId2, label: evOther.title }].map(({ ev, catId, setCat, label }) => (
          <div key={ev.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 space-y-3">
            <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">{label}</p>
            <div>
              <label className={labelClass}>Categoria *</label>
              <select value={catId} onChange={e => setCat(e.target.value)} className={inputClass}>
                <option value="">Selecione</option>
                {ev.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <p className="text-[10px] text-zinc-600">{fmt(ev.activeBatch?.price || 0)} → <span className="text-[#EDAC02] font-bold">{fmt(Math.round((ev.activeBatch?.price || 0) * 0.9 * 100) / 100)}</span> com combo</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-[#0a0a0a] border border-[#EDAC02]/20 rounded-2xl p-6 space-y-3">
        <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Resumo do pagamento</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-500"><span>{evSelecao.title}</span><span>{fmt(disc1)}</span></div>
          <div className="flex justify-between text-xs text-zinc-500"><span>{evOther.title}</span><span>{fmt(disc2)}</span></div>
          <div className="flex justify-between text-xs text-[#25D366] font-bold"><span>Desconto combo ({DISCOUNT}%)</span><span>- {fmt(Math.round((p1 + p2 - totalCombo) * 100) / 100)}</span></div>
          <div className="border-t border-[#1a1a1a] pt-2 flex justify-between text-base font-black text-white"><span>Total</span><span className="text-[#EDAC02]">{fmt(totalCombo)}</span></div>
        </div>
        <p className="text-[10px] text-zinc-600 leading-relaxed">Pagamento via PIX. Após o envio, você receberá as instruções de pagamento no WhatsApp e email informados. A inscrição é confirmada após a confirmação do pagamento pelo organizador.</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 rounded-xl bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest hover:bg-[#EDAC02]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Processando...' : `Confirmar Combo — ${fmt(totalCombo)}`}
      </button>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ data, comboType }: { data: any; comboType: string }) {
  const { price_breakdown } = data;
  return (
    <div className="max-w-lg mx-auto text-center space-y-8 py-12">
      <div className="w-20 h-20 rounded-full bg-[#25D366]/10 border-2 border-[#25D366]/30 flex items-center justify-center mx-auto text-4xl">✓</div>
      <div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Combo garantido!</h2>
        <p className="text-zinc-400 text-sm mt-2">Suas inscrições foram registradas com sucesso.</p>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 text-left space-y-3">
        <p className="text-[10px] font-black text-[#EDAC02] uppercase tracking-widest">Resumo do combo</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-zinc-400"><span>Economia total</span><span className="text-[#25D366] font-bold">{(price_breakdown?.savings || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
          <div className="flex justify-between text-zinc-400"><span>Total pago</span><span className="text-white font-bold">{(price_breakdown?.total_combo || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
        </div>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 text-left space-y-2">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Próximo passo — Pagamento PIX</p>
        <p className="text-xs text-zinc-400 leading-relaxed">Envie o valor de <strong className="text-white">{(price_breakdown?.total_combo || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> via PIX e envie o comprovante para confirmação. Você receberá as instruções no WhatsApp informado em breve.</p>
      </div>

      <a href="/" className="inline-block px-8 py-3 rounded-xl bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest hover:bg-[#EDAC02]/90 transition-colors">Voltar ao site</a>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ComboJunhoPage() {
  const [evSelecao, setEvSelecao] = useState<EventData | null>(null);
  const [evExperience, setEvExperience] = useState<EventData | null>(null);
  const [evOficial, setEvOficial] = useState<EventData | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<'experience' | 'oficial' | null>(null);
  const [success, setSuccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      loadEvent(SLUGS.selecao),
      loadEvent(SLUGS.experience),
      loadEvent(SLUGS.oficial),
    ]).then(([s, e, o]) => {
      setEvSelecao(s);
      setEvExperience(e);
      setEvOficial(o);
      setLoading(false);
    });
  }, []);

  if (success) return (
    <div className="min-h-screen bg-[#050505] px-4 py-16">
      <SuccessScreen data={success} comboType={selectedCombo!} />
    </div>
  );

  if (selectedCombo && evSelecao && (selectedCombo === 'experience' ? evExperience : evOficial)) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <RegistrationForm
            comboType={selectedCombo}
            evSelecao={evSelecao}
            evOther={(selectedCombo === 'experience' ? evExperience : evOficial)!}
            onSuccess={setSuccess}
            onBack={() => setSelectedCombo(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[#1a1a1a]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#EDAC02]/5 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-[#EDAC02]/10 text-[#EDAC02] text-[10px] font-black uppercase tracking-widest mb-4">Junho 2026 · Oferta exclusiva</span>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight leading-none">
            COMBO<br /><span className="text-[#EDAC02]">JUNHO</span>
          </h1>
          <p className="text-zinc-400 text-base mt-6 max-w-xl mx-auto leading-relaxed">
            Inscreva-se em dois eventos UAIROX e economize <strong className="text-white">10%</strong> no total. Uma inscrição, dois eventos, muito mais treino.
          </p>
        </div>
      </div>

      {/* Combo cards */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <p className="text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-8">Escolha seu combo</p>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            <ComboCard
              title="Desafio Seleção + Experience"
              badge="Combo A"
              events={evSelecao && evExperience ? [evSelecao, evExperience] : null}
              onSelect={() => setSelectedCombo('experience')}
            />
            <ComboCard
              title="Desafio Seleção + Oficial"
              badge="Combo B"
              events={evSelecao && evOficial ? [evSelecao, evOficial] : null}
              onSelect={() => setSelectedCombo('oficial')}
            />
          </div>
        )}

        {/* Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {[
            { icon: '💰', title: '10% de desconto', desc: 'Aplicado automaticamente no total do combo' },
            { icon: '📋', title: 'Uma inscrição', desc: 'Preencha seus dados uma única vez para os dois eventos' },
            { icon: '🏆', title: 'Dois eventos', desc: 'Desafio Seleção + Experience ou Oficial em junho' },
          ].map(item => (
            <div key={item.title} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5">
              <p className="text-2xl mb-2">{item.icon}</p>
              <p className="text-xs font-black text-white">{item.title}</p>
              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
