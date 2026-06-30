import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const brl = (n: number) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

export default function PartnerFinancialReport() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'invalid' | 'ok'>('loading');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      // 1. Valida o token (tipo financeiro, não revogado)
      const { data: link } = await (supabase as any)
        .from('event_partner_links').select('event_id, label, type, revoked_at')
        .eq('token', token).eq('type', 'financeiro').is('revoked_at', null).maybeSingle();
      if (!link) { setState('invalid'); return; }
      const eid = link.event_id;

      // 2. Dados do evento + finanças
      const [{ data: ev }, { data: regs }, { data: exps }, { data: cats }, { data: partners }] = await Promise.all([
        supabase.from('events' as any).select('title').eq('id', eid).maybeSingle(),
        supabase.from('registrations' as any).select('bib_number, athlete_name, team_name, total_paid, categories(name, team_size)').eq('event_id', eid).order('bib_number'),
        supabase.from('event_expenses' as any).select('*, event_expense_categories(name)').eq('event_id', eid).order('expense_date'),
        supabase.from('event_expense_categories' as any).select('planned_amount').eq('event_id', eid),
        supabase.from('event_partners' as any).select('name, percent').eq('event_id', eid).order('created_at'),
      ]);

      const revenue = (regs ?? []).reduce((s: number, r: any) => s + Number(r.total_paid || 0), 0);
      const expenses = (exps ?? []) as any[];
      const totalExecuted = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      const totalPaid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount || 0), 0);
      const totalPlanned = (cats ?? []).reduce((s: number, c: any) => s + Number(c.planned_amount || 0), 0);
      const netProfit = revenue - totalPaid;

      setData({ title: ev?.title || 'Evento', revenue, totalExecuted, totalPaid, totalPlanned, netProfit, expenses, partners: partners ?? [], registrations: regs ?? [] });
      setState('ok');
    })();
  }, [token]);

  if (state === 'loading') return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-10 h-10 border-3 border-[#EDAC02] border-t-transparent rounded-full animate-spin" /></div>;
  if (state === 'invalid') return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-center px-4">
      <div><h1 className="text-2xl font-black text-white uppercase italic">Link inválido ou revogado</h1>
      <p className="text-zinc-500 mt-2">Solicite um novo link ao organizador.</p></div>
    </div>
  );

  const d = data;
  const totalPct = d.partners.reduce((s: number, p: any) => s + Number(p.percent || 0), 0);
  const norm = (s: string) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
  const reembolsoFor = (name: string) => {
    const pn = norm(name); if (!pn) return 0;
    return d.expenses.filter((e: any) => { const pb = norm(e.paid_by); return pb && (pb === pn || pb.includes(pn)); }).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  };
  const lucroFor = (p: any) => d.netProfit * Number(p.percent) / 100;
  const totReembolso = d.partners.reduce((s: number, p: any) => s + reembolsoFor(p.name), 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Relatório Financeiro</h1>
        <p className="text-zinc-400 mb-6">{d.title} · gerado em {new Date().toLocaleDateString('pt-BR')}</p>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Box label="Receita (inscrições)" value={brl(d.revenue)} />
          <Box label="Orçamento previsto" value={brl(d.totalPlanned)} />
          <Box label="Despesas pagas" value={brl(d.totalPaid)} />
          <Box label="Lucro líquido" value={brl(d.netProfit)} accent={d.netProfit >= 0 ? 'pos' : 'neg'} />
        </div>

        {/* Divisão */}
        <h2 className="text-lg font-black uppercase italic text-[#EDAC02] border-b border-[#EDAC02]/30 pb-1 mb-3">Acerto entre Sócios</h2>
        <p className="text-xs text-zinc-500 mb-2">Cada sócio recebe a parte do lucro + o reembolso do que pagou do bolso.</p>
        <div className="rounded-xl border border-[#1a1a1a] overflow-x-auto mb-2">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0a0a] text-zinc-500 uppercase text-xs"><tr><th className="text-left p-3">Sócio</th><th className="text-right p-3">%</th><th className="text-right p-3">Lucro</th><th className="text-right p-3">Reembolso</th><th className="text-right p-3">A receber</th></tr></thead>
            <tbody className="divide-y divide-[#111]">
              {d.partners.length === 0 ? <tr><td colSpan={5} className="p-3 text-zinc-600 text-center">Sem sócios cadastrados.</td></tr>
              : d.partners.map((p: any, i: number) => (
                <tr key={i}>
                  <td className="p-3 font-bold">{p.name}</td>
                  <td className="p-3 text-right text-zinc-400">{Number(p.percent)}%</td>
                  <td className={`p-3 text-right ${lucroFor(p) >= 0 ? 'text-zinc-300' : 'text-red-400'}`}>{brl(lucroFor(p))}</td>
                  <td className="p-3 text-right text-blue-300">{brl(reembolsoFor(p.name))}</td>
                  <td className="p-3 text-right font-black text-emerald-400">{brl(lucroFor(p) + reembolsoFor(p.name))}</td>
                </tr>
              ))}
              {d.partners.length > 0 && <tr className="bg-[#0a0a0a] font-black"><td className="p-3">TOTAL</td><td className="p-3 text-right">{totalPct}%</td><td className="p-3 text-right">{brl(d.netProfit)}</td><td className="p-3 text-right">{brl(totReembolso)}</td><td className="p-3 text-right">{brl(d.netProfit + totReembolso)}</td></tr>}
            </tbody>
          </table>
        </div>
        {(d.totalExecuted - totReembolso) > 0.009 && <p className="text-[11px] text-zinc-500 mb-8">Despesas do caixa comum (sem sócio atribuído): {brl(d.totalExecuted - totReembolso)}</p>}

        {/* Inscrições / Receita */}
        <h2 className="text-lg font-black uppercase italic text-[#EDAC02] border-b border-[#EDAC02]/30 pb-1 mb-3">Inscrições / Receita ({brl(d.revenue)})</h2>
        <div className="rounded-xl border border-[#1a1a1a] overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0a0a] text-zinc-500 uppercase text-xs"><tr><th className="text-left p-3">Nº</th><th className="text-left p-3">Nome / Equipe</th><th className="text-left p-3">Categoria</th><th className="text-right p-3">Valor pago</th></tr></thead>
            <tbody className="divide-y divide-[#111]">
              {d.registrations.length === 0 ? <tr><td colSpan={4} className="p-3 text-zinc-600 text-center">Sem inscrições.</td></tr>
              : d.registrations.map((r: any, i: number) => {
                const isTeam = (r.categories?.team_size ?? 1) > 1;
                const nome = (isTeam ? (r.team_name || r.athlete_name) : (r.athlete_name || r.team_name)) || '—';
                return (
                  <tr key={i}>
                    <td className="p-3 text-zinc-400">{r.bib_number ?? '—'}</td>
                    <td className="p-3 font-bold">{nome}</td>
                    <td className="p-3 text-zinc-400">{r.categories?.name || '—'}</td>
                    <td className="p-3 text-right font-bold">{brl(r.total_paid)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Despesas */}
        <h2 className="text-lg font-black uppercase italic text-[#EDAC02] border-b border-[#EDAC02]/30 pb-1 mb-3">Despesas ({brl(d.totalExecuted)})</h2>
        <div className="rounded-xl border border-[#1a1a1a] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0a0a] text-zinc-500 uppercase text-xs"><tr><th className="text-left p-3">Data</th><th className="text-left p-3">Área</th><th className="text-left p-3">Descrição</th><th className="text-left p-3">Status</th><th className="text-right p-3">Valor</th></tr></thead>
            <tbody className="divide-y divide-[#111]">
              {d.expenses.length === 0 ? <tr><td colSpan={5} className="p-3 text-zinc-600 text-center">Sem despesas.</td></tr>
              : d.expenses.map((e: any) => (
                <tr key={e.id}>
                  <td className="p-3 text-zinc-400">{new Date(e.expense_date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3 text-zinc-400">{e.event_expense_categories?.name || '—'}</td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3"><span className={e.status === 'paid' ? 'text-emerald-400' : 'text-orange-400'}>{e.status === 'paid' ? 'Pago' : 'Pendente'}</span></td>
                  <td className="p-3 text-right font-bold">{brl(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-8 uppercase tracking-widest">UAIROX · Relatório confidencial</p>
      </div>
    </div>
  );
}

function Box({ label, value, accent }: { label: string; value: string; accent?: 'pos' | 'neg' }) {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-black ${accent === 'pos' ? 'text-emerald-400' : accent === 'neg' ? 'text-red-500' : 'text-white'}`}>{value}</p>
    </div>
  );
}
