import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category { id: string; name: string }
interface Batch    { id: string; name: string; price: number }

interface EventData {
  id: string;
  title: string;
  slug: string;
  date: string;
  location: string;
  categories: Category[];
  batches: Batch[];
}

interface Athlete {
  name: string; email: string; phone: string; cpf: string;
  birth_date: string; gender: string; gym: string;
}

interface ComboSelection {
  catId1: string; batchId1: string; price1: number;
  catId2: string; batchId2: string; price2: number;
}

const SLUGS   = { selecao: 'selecao', experience: '8experience', oficial: '8oficial' };
const DISCOUNT = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loadEvent(slug: string): Promise<EventData | null> {
  const { data: ev } = await (supabase as any)
    .from('events').select('id, title, slug, date, location').eq('slug', slug).maybeSingle();
  if (!ev) return null;
  const [catRes, batchRes] = await Promise.all([
    (supabase as any).from('categories').select('id, name').eq('event_id', ev.id).order('created_at'),
    (supabase as any).from('price_batches').select('id, name, price').eq('event_id', ev.id).eq('active', true).order('order_index'),
  ]);
  return { ...ev, categories: catRes.data || [], batches: batchRes.data || [] };
}

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Event Selector (inside card) ─────────────────────────────────────────────
function EventSelector({ ev, catId, batchId, onCatChange, onBatchChange }: {
  ev: EventData;
  catId: string; batchId: string;
  onCatChange: (v: string) => void;
  onBatchChange: (v: string) => void;
}) {
  // Auto-select batch when there's only one
  useEffect(() => {
    if (ev.batches.length === 1 && !batchId) onBatchChange(ev.batches[0].id);
  }, [ev.batches.length]);

  const selectedBatch = ev.batches.find(b => b.id === batchId);
  const inputClass = 'w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#EDAC02]/50 transition-colors';

  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-white uppercase tracking-tight leading-tight">{ev.title}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {new Date(ev.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} · {ev.location}
          </p>
        </div>
        {selectedBatch ? (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-zinc-600 line-through">{fmt(selectedBatch.price)}</p>
            <p className="text-sm font-black text-[#EDAC02]">{fmt(Math.round(selectedBatch.price * (1 - DISCOUNT / 100) * 100) / 100)}</p>
          </div>
        ) : (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-zinc-600">a partir de</p>
            <p className="text-xs font-bold text-zinc-500">{ev.batches.length ? fmt(Math.min(...ev.batches.map(b => b.price))) : '—'}</p>
          </div>
        )}
      </div>

      <select value={catId} onChange={e => onCatChange(e.target.value)} className={inputClass}>
        <option value="">Selecione a categoria</option>
        {ev.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {ev.batches.length > 1 && (
        <select value={batchId} onChange={e => onBatchChange(e.target.value)} className={inputClass}>
          <option value="">Selecione o lote / valor</option>
          {ev.batches.map(b => (
            <option key={b.id} value={b.id}>{b.name} — {fmt(b.price)}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── Combo Card ───────────────────────────────────────────────────────────────
function ComboCard({ title, badge, ev1, ev2, onSelect }: {
  title: string; badge: string;
  ev1: EventData | null; ev2: EventData | null;
  onSelect: (sel: ComboSelection) => void;
}) {
  const [catId1, setCatId1]   = useState('');
  const [batchId1, setBatchId1] = useState('');
  const [catId2, setCatId2]   = useState('');
  const [batchId2, setBatchId2] = useState('');

  if (!ev1 || !ev2) return (
    <div className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-8 flex items-center justify-center min-h-[340px]">
      <div className="w-6 h-6 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const batch1 = ev1.batches.find(b => b.id === batchId1);
  const batch2 = ev2.batches.find(b => b.id === batchId2);
  const p1    = batch1?.price || 0;
  const p2    = batch2?.price || 0;
  const total  = p1 + p2;
  const combo  = Math.round(total * (1 - DISCOUNT / 100) * 100) / 100;
  const savings = Math.round((total - combo) * 100) / 100;
  const ready  = !!catId1 && !!batchId1 && !!catId2 && !!batchId2;

  return (
    <div className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 flex flex-col gap-5 hover:border-[#EDAC02]/20 transition-colors">
      <div>
        <span className="px-2 py-1 rounded bg-[#EDAC02]/10 text-[#EDAC02] text-[10px] font-black uppercase tracking-widest">{badge}</span>
        <h3 className="text-lg font-black text-white mt-3 uppercase tracking-tight">{title}</h3>
        <p className="text-[10px] text-zinc-500 mt-1">Selecione a categoria e lote para ver o valor exato do combo.</p>
      </div>

      <EventSelector ev={ev1} catId={catId1} batchId={batchId1} onCatChange={setCatId1} onBatchChange={setBatchId1} />
      <EventSelector ev={ev2} catId={catId2} batchId={batchId2} onCatChange={setCatId2} onBatchChange={setBatchId2} />

      {/* Price summary — visible always, dims when incomplete */}
      <div className={`border-t border-[#1a1a1a] pt-4 space-y-1.5 transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-30'}`}>
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Total individual</span>
          <span className={total > 0 ? 'line-through' : ''}>{total > 0 ? fmt(total) : '—'}</span>
        </div>
        <div className="flex justify-between text-xs font-bold text-[#25D366]">
          <span>Desconto combo ({DISCOUNT}%)</span>
          <span>{savings > 0 ? `- ${fmt(savings)}` : '—'}</span>
        </div>
        <div className="flex justify-between text-lg font-black text-white">
          <span>Total combo</span>
          <span className="text-[#EDAC02]">{combo > 0 ? fmt(combo) : '—'}</span>
        </div>
      </div>

      <button
        disabled={!ready}
        onClick={() => onSelect({ catId1, batchId1, price1: p1, catId2, batchId2, price2: p2 })}
        className="w-full py-3.5 rounded-xl bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest hover:bg-[#d49b02] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {ready ? `Garantir Combo — ${fmt(combo)} →` : 'Selecione as categorias acima'}
      </button>
    </div>
  );
}

// ─── Registration Form ────────────────────────────────────────────────────────
function RegistrationForm({ comboType, evSelecao, evOther, selection, onSuccess, onBack }: {
  comboType: 'experience' | 'oficial';
  evSelecao: EventData; evOther: EventData;
  selection: ComboSelection;
  onSuccess: (data: any) => void; onBack: () => void;
}) {
  const [athlete, setAthlete] = useState<Athlete>({ name: '', email: '', phone: '', cpf: '', birth_date: '', gender: '', gym: '' });
  const [submitting, setSubmitting] = useState(false);

  const setField = (k: keyof Athlete, v: string) => setAthlete(prev => ({ ...prev, [k]: v }));

  const disc1    = Math.round(selection.price1 * (1 - DISCOUNT / 100) * 100) / 100;
  const disc2    = Math.round(selection.price2 * (1 - DISCOUNT / 100) * 100) / 100;
  const totalCombo = Math.round((disc1 + disc2) * 100) / 100;
  const cat1Name = evSelecao.categories.find(c => c.id === selection.catId1)?.name || '';
  const cat2Name = evOther.categories.find(c => c.id === selection.catId2)?.name || '';
  const batch1Name = evSelecao.batches.find(b => b.id === selection.batchId1)?.name || '';
  const batch2Name = evOther.batches.find(b => b.id === selection.batchId2)?.name || '';

  const inputClass = 'w-full bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#EDAC02]/40 transition-colors';
  const labelClass = 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block';

  const handleSubmit = async () => {
    if (!athlete.name.trim() || !athlete.email.trim() || !athlete.phone.trim() || !athlete.birth_date || !athlete.gender || !athlete.gym.trim()) {
      toast.error('Preencha todos os campos obrigatórios'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/combo-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athlete, combo_type: comboType,
          category_id_1: selection.catId1, batch_id_1: selection.batchId1,
          category_id_2: selection.catId2, batch_id_2: selection.batchId2,
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm transition-colors">← Voltar</button>
        <div>
          <h2 className="text-lg font-black text-white uppercase">Combo {comboType === 'experience' ? 'Experience' : 'Oficial'}</h2>
          <p className="text-[10px] text-zinc-500">{evSelecao.title} + {evOther.title}</p>
        </div>
      </div>

      {/* Selected categories summary */}
      <div className="bg-[#0a0a0a] border border-[#EDAC02]/20 rounded-2xl p-5 space-y-3">
        <p className="text-[10px] font-black text-[#EDAC02] uppercase tracking-widest">Categorias selecionadas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { ev: evSelecao, catName: cat1Name, batchName: batch1Name, price: selection.price1 },
            { ev: evOther,   catName: cat2Name, batchName: batch2Name, price: selection.price2 },
          ].map(({ ev, catName, batchName, price }) => (
            <div key={ev.id} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-3 space-y-0.5">
              <p className="text-[10px] font-black text-white uppercase tracking-tight">{ev.title}</p>
              <p className="text-xs text-zinc-400">{catName}{batchName ? ` · ${batchName}` : ''}</p>
              <p className="text-xs">
                <span className="text-zinc-600 line-through mr-1">{fmt(price)}</span>
                <span className="text-[#EDAC02] font-bold">{fmt(Math.round(price * (1 - DISCOUNT / 100) * 100) / 100)}</span>
              </p>
            </div>
          ))}
        </div>
        <button onClick={onBack} className="text-[10px] text-zinc-600 hover:text-[#EDAC02] transition-colors">✎ Alterar categorias</button>
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

      {/* Payment summary */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 space-y-3">
        <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Resumo do pagamento</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-500"><span>{evSelecao.title} ({cat1Name})</span><span>{fmt(disc1)}</span></div>
          <div className="flex justify-between text-xs text-zinc-500"><span>{evOther.title} ({cat2Name})</span><span>{fmt(disc2)}</span></div>
          <div className="flex justify-between text-xs font-bold text-[#25D366]">
            <span>Desconto combo ({DISCOUNT}%)</span>
            <span>- {fmt(Math.round((selection.price1 + selection.price2 - totalCombo) * 100) / 100)}</span>
          </div>
          <div className="border-t border-[#1a1a1a] pt-2 flex justify-between text-base font-black text-white">
            <span>Total</span><span className="text-[#EDAC02]">{fmt(totalCombo)}</span>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600 leading-relaxed">Pagamento via PIX. Após o envio, você receberá as instruções no WhatsApp e email informados. A inscrição é confirmada após a confirmação do pagamento pelo organizador.</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 rounded-xl bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest hover:bg-[#d49b02] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Processando...' : `Confirmar Combo — ${fmt(totalCombo)}`}
      </button>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ data }: { data: any }) {
  const { price_breakdown } = data;
  return (
    <div className="max-w-lg mx-auto text-center space-y-8 py-12">
      <div className="w-20 h-20 rounded-full bg-[#25D366]/10 border-2 border-[#25D366]/30 flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Combo garantido!</h2>
        <p className="text-zinc-400 text-sm mt-2">Suas inscrições foram registradas com sucesso.</p>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 text-left space-y-3">
        <p className="text-[10px] font-black text-[#EDAC02] uppercase tracking-widest">Resumo do combo</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-zinc-400"><span>Total sem desconto</span><span className="line-through">{fmt(price_breakdown?.total_original || 0)}</span></div>
          <div className="flex justify-between text-[#25D366] font-bold"><span>Economia total ({DISCOUNT}%)</span><span>- {fmt(price_breakdown?.savings || 0)}</span></div>
          <div className="flex justify-between text-white font-black text-sm pt-1 border-t border-[#1a1a1a]"><span>Total pago</span><span className="text-[#EDAC02]">{fmt(price_breakdown?.total_combo || 0)}</span></div>
        </div>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 text-left space-y-2">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Próximo passo — Pagamento PIX</p>
        <p className="text-xs text-zinc-400 leading-relaxed">Envie o valor de <strong className="text-white">{fmt(price_breakdown?.total_combo || 0)}</strong> via PIX e envie o comprovante para confirmação. Você receberá as instruções no WhatsApp informado em breve.</p>
      </div>

      <a href="/" className="inline-block px-8 py-3 rounded-xl bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest hover:bg-[#d49b02] transition-colors">Voltar ao site</a>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ComboJunhoPage() {
  const [evSelecao, setEvSelecao]     = useState<EventData | null>(null);
  const [evExperience, setEvExperience] = useState<EventData | null>(null);
  const [evOficial, setEvOficial]     = useState<EventData | null>(null);
  const [selected, setSelected]       = useState<{ type: 'experience' | 'oficial'; sel: ComboSelection } | null>(null);
  const [success, setSuccess]         = useState<any>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      loadEvent(SLUGS.selecao),
      loadEvent(SLUGS.experience),
      loadEvent(SLUGS.oficial),
    ]).then(([s, e, o]) => {
      setEvSelecao(s); setEvExperience(e); setEvOficial(o);
      setLoading(false);
    });
  }, []);

  if (success) return (
    <div className="min-h-screen bg-[#050505] px-4 py-16">
      <SuccessScreen data={success} />
    </div>
  );

  if (selected && evSelecao && (selected.type === 'experience' ? evExperience : evOficial)) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <RegistrationForm
            comboType={selected.type}
            evSelecao={evSelecao}
            evOther={(selected.type === 'experience' ? evExperience : evOficial)!}
            selection={selected.sel}
            onSuccess={setSuccess}
            onBack={() => setSelected(null)}
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
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            <ComboCard
              title="Desafio Seleção + Experience"
              badge="Combo A"
              ev1={evSelecao}
              ev2={evExperience}
              onSelect={sel => setSelected({ type: 'experience', sel })}
            />
            <ComboCard
              title="Desafio Seleção + Oficial"
              badge="Combo B"
              ev1={evSelecao}
              ev2={evOficial}
              onSelect={sel => setSelected({ type: 'oficial', sel })}
            />
          </div>
        )}

        {/* Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          {[
            { icon: '💰', title: '10% de desconto', desc: 'Aplicado automaticamente no total do combo' },
            { icon: '📋', title: 'Uma inscrição',   desc: 'Preencha seus dados uma única vez para os dois eventos' },
            { icon: '🏆', title: 'Dois eventos',    desc: 'Desafio Seleção + Experience ou Oficial em junho' },
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
