import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  eventId: string;
  revenue: number;
  totalExecuted: number;
  totalPaid: number;
  totalPlanned: number;
  netProfit: number;
  expenses: any[];
}

const brl = (n: number) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

export default function EventPartnerReport(props: Props) {
  const { eventId, revenue, totalExecuted, totalPaid, totalPlanned, netProfit, expenses } = props;
  const qc = useQueryClient();
  const { data: ev } = useQuery({
    queryKey: ['event-title', eventId],
    queryFn: async () => (await supabase.from('events' as any).select('title').eq('id', eventId).maybeSingle()).data as any,
  });
  const eventTitle = ev?.title || 'Evento';
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: partners = [] } = useQuery({
    queryKey: ['event-partners', eventId],
    queryFn: async () => {
      const { data } = await supabase.from('event_partners' as any).select('*').eq('event_id', eventId).order('created_at');
      return (data ?? []) as any[];
    },
  });

  const totalPct = partners.reduce((s, p) => s + Number(p.percent || 0), 0);

  const addPartner = async () => {
    const pct = parseFloat(percent);
    if (!name.trim() || isNaN(pct)) { toast.error('Informe nome e %.'); return; }
    setBusy(true);
    const { error } = await supabase.from('event_partners' as any).insert({ event_id: eventId, name: name.trim(), percent: pct });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setName(''); setPercent('');
    qc.invalidateQueries({ queryKey: ['event-partners', eventId] });
  };
  const delPartner = async (id: string) => {
    await supabase.from('event_partners' as any).delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['event-partners', eventId] });
  };

  // ── Excel (abas: Resumo, Inscrições, Despesas, Divisão) ──────────────────────
  const exportExcel = async () => {
    try {
      toast.loading('Gerando Excel...', { id: 'rep' });
      const XLSX = await import('xlsx');
      const { data: regs } = await supabase.from('registrations' as any)
        .select('bib_number, athlete_name, team_name, status, total_paid, categories(name, team_size)')
        .eq('event_id', eventId).order('bib_number');

      const resumo = [
        ['RELATÓRIO FINANCEIRO', eventTitle],
        [],
        ['Receita (inscrições)', revenue],
        ['Orçamento previsto', totalPlanned],
        ['Despesas lançadas', totalExecuted],
        ['Despesas pagas', totalPaid],
        ['Lucro líquido', netProfit],
      ];
      const insc: any[][] = [['Nº', 'Nome / Equipe', 'Categoria', 'Status', 'Valor (R$)']];
      (regs ?? []).forEach((r: any) => {
        const isTeam = (r.categories?.team_size ?? 1) > 1;
        const nome = isTeam ? (r.team_name || r.athlete_name || '') : (r.athlete_name || r.team_name || '');
        insc.push([r.bib_number ?? '', nome, r.categories?.name ?? '', r.status ?? '', Number(r.total_paid || 0)]);
      });
      const desp: any[][] = [['Data', 'Área', 'Descrição', 'Status', 'Quem pagou', 'Valor (R$)']];
      expenses.forEach((e: any) => desp.push([
        new Date(e.expense_date).toLocaleDateString('pt-BR'),
        e.event_expense_categories?.name || '', e.description || '',
        e.status === 'paid' ? 'Pago' : 'Pendente', e.paid_by || '', Number(e.amount || 0),
      ]));
      const div: any[][] = [['Sócio', '%', 'Valor a receber (R$)']];
      partners.forEach((p: any) => div.push([p.name, Number(p.percent), netProfit * Number(p.percent) / 100]));
      div.push([], ['TOTAL', totalPct, netProfit * totalPct / 100]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), 'Resumo');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(insc), 'Inscrições');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(desp), 'Despesas');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(div), 'Divisão');
      XLSX.writeFile(wb, `relatorio-${(eventTitle || 'evento').toLowerCase().replace(/\s+/g, '-')}.xlsx`);
      toast.success('Excel gerado!', { id: 'rep' });
    } catch (e: any) {
      toast.error('Erro: ' + e.message, { id: 'rep' });
    }
  };

  // ── PDF (janela de impressão → "Salvar como PDF") ────────────────────────────
  const exportPDF = () => {
    const despRows = expenses.map((e: any) => `<tr><td>${new Date(e.expense_date).toLocaleDateString('pt-BR')}</td><td>${e.event_expense_categories?.name || ''}</td><td>${(e.description || '').replace(/</g, '&lt;')}</td><td>${e.status === 'paid' ? 'Pago' : 'Pendente'}</td><td class="r">${brl(e.amount)}</td></tr>`).join('');
    const divRows = partners.map((p: any) => `<tr><td>${(p.name || '').replace(/</g, '&lt;')}</td><td>${p.percent}%</td><td class="r">${brl(netProfit * Number(p.percent) / 100)}</td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Relatório ${eventTitle}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:32px;max-width:800px;margin:auto}
        h1{font-size:22px;margin:0 0 2px} .sub{color:#666;margin:0 0 20px;font-size:13px}
        h2{font-size:15px;border-bottom:2px solid #EDAC02;padding-bottom:4px;margin:24px 0 10px}
        table{width:100%;border-collapse:collapse;font-size:13px} th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f3f3f3} .r{text-align:right} .big{font-size:18px;font-weight:bold}
        .grid{display:flex;gap:16px;flex-wrap:wrap} .box{flex:1;min-width:160px;border:1px solid #ddd;border-radius:8px;padding:12px}
        .box .lbl{color:#666;font-size:11px;text-transform:uppercase} .pos{color:#0a0} .neg{color:#c00}
      </style></head><body>
      <h1>Relatório Financeiro</h1><p class="sub">${eventTitle} — gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
      <div class="grid">
        <div class="box"><div class="lbl">Receita (inscrições)</div><div class="big">${brl(revenue)}</div></div>
        <div class="box"><div class="lbl">Despesas pagas</div><div class="big">${brl(totalPaid)}</div></div>
        <div class="box"><div class="lbl">Lucro líquido</div><div class="big ${netProfit >= 0 ? 'pos' : 'neg'}">${brl(netProfit)}</div></div>
      </div>
      <h2>Divisão entre Sócios</h2>
      <table><thead><tr><th>Sócio</th><th>%</th><th class="r">Valor a receber</th></tr></thead><tbody>${divRows || '<tr><td colspan="3">Sem sócios cadastrados</td></tr>'}</tbody></table>
      <h2>Despesas (${brl(totalExecuted)} lançadas)</h2>
      <table><thead><tr><th>Data</th><th>Área</th><th>Descrição</th><th>Status</th><th class="r">Valor</th></tr></thead><tbody>${despRows || '<tr><td colspan="5">Sem despesas</td></tr>'}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) { toast.error('Permita pop-ups para gerar o PDF.'); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="text-lg font-black text-white">📑 Relatório para Sócios</h3>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="px-4 py-2 border border-green-600 text-green-400 font-bold text-xs uppercase tracking-wider rounded hover:bg-green-600/10">📊 Excel</button>
          <button onClick={exportPDF} className="px-4 py-2 border border-[#EDAC02] text-[#EDAC02] font-bold text-xs uppercase tracking-wider rounded hover:bg-[#EDAC02]/10">🖨 PDF</button>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-3">Divisão do <b className="text-white">lucro líquido ({brl(netProfit)})</b> entre os sócios. Cadastre cada sócio com seu %.</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do sócio"
          className="flex-1 min-w-[160px] bg-[#111] border border-[#262626] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#EDAC02]" />
        <input value={percent} onChange={e => setPercent(e.target.value)} placeholder="%" type="number" step="0.01"
          className="w-24 bg-[#111] border border-[#262626] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#EDAC02]" />
        <button onClick={addPartner} disabled={busy} className="px-4 py-2 bg-[#EDAC02] text-black font-black text-sm rounded-lg hover:bg-[#EDAC02]/90 disabled:opacity-50">+ Adicionar</button>
      </div>

      {partners.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-3">Nenhum sócio cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {partners.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between bg-[#111] border border-[#262626] rounded-lg px-4 py-2.5">
              <span className="text-sm font-bold text-white">{p.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400">{Number(p.percent)}%</span>
                <span className="text-sm font-black text-emerald-400 w-28 text-right">{brl(netProfit * Number(p.percent) / 100)}</span>
                <button onClick={() => delPartner(p.id)} className="text-zinc-500 hover:text-red-500 text-xs">🗑</button>
              </div>
            </div>
          ))}
          <div className={`flex justify-between px-4 py-2 text-sm font-bold ${Math.abs(totalPct - 100) < 0.01 ? 'text-zinc-400' : 'text-orange-400'}`}>
            <span>Total</span>
            <span>{totalPct}% {Math.abs(totalPct - 100) < 0.01 ? '✓' : '⚠ (deve somar 100%)'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
