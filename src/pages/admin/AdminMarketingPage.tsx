import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  useMarketingContacts,
  useImportMarketingContacts,
  useToggleOptOut,
  useDeleteMarketingContact,
  useMarketingConfig,
  useSaveMarketingConfig,
} from '@/hooks/useMarketing';
import { sendWebhook } from '@/lib/botconversa';

const inputClass = 'w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#EDAC02]/40 transition-colors';
const cardClass = 'bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl';
const btnGold = 'px-4 py-2 rounded-lg bg-[#EDAC02] text-black text-xs font-black uppercase tracking-widest hover:bg-[#EDAC02]/90 transition-colors';
const labelClass = 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest';

export default function AdminMarketingPage() {
  const { data: contacts, isLoading } = useMarketingContacts();
  const { data: config } = useMarketingConfig();
  const importContacts = useImportMarketingContacts();
  const toggleOptOut = useToggleOptOut();
  const deleteContact = useDeleteMarketingContact();
  const saveConfig = useSaveMarketingConfig();

  const [search, setSearch] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [broadcastTrigger, setBroadcastTrigger] = useState('marketing');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [filterOptOut, setFilterOptOut] = useState<'all' | 'active' | 'optout'>('active');
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync webhook URL from config
  useState(() => { if (config?.webhook_url) setWebhookUrl(config.webhook_url); });

  // Also update when config loads
  if (config?.webhook_url && !webhookUrl) setWebhookUrl(config.webhook_url);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const contacts = rows.map((r: any) => {
        // Accept common column name variants
        const name = String(r['Nome'] || r['name'] || r['NOME'] || '').trim() || undefined;
        const rawPhone = String(r['Telefone'] || r['phone'] || r['TELEFONE'] || r['Celular'] || r['celular'] || '').trim();
        const phone = rawPhone.replace(/\D/g, '');
        const email = String(r['Email'] || r['email'] || r['EMAIL'] || r['E-mail'] || '').trim() || undefined;
        return { name, phone, email };
      }).filter(c => c.phone.length >= 8);

      if (contacts.length === 0) {
        toast.error('Nenhum contato válido encontrado. Verifique as colunas: Nome, Telefone, Email');
        return;
      }

      const count = await importContacts.mutateAsync(contacts);
      toast.success(`${count} contatos importados com sucesso`);
    } catch (err: any) {
      toast.error('Erro ao importar: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveConfig = async () => {
    await saveConfig.mutateAsync(webhookUrl);
    toast.success('Configuração salva');
  };

  const handleBroadcast = async () => {
    if (!webhookUrl) { toast.error('Configure a URL do webhook'); return; }
    const targets = filtered.filter(c => !c.opt_out);
    if (targets.length === 0) { toast.error('Nenhum contato ativo para envio'); return; }
    setSending(true);
    let sent = 0, failed = 0;
    for (const c of targets) {
      const payload: Record<string, any> = {
        trigger: broadcastTrigger,
        nome: c.name || '',
        telefone: c.phone,
        email: c.email || '',
      };
      if (broadcastMessage.trim()) payload.mensagem = broadcastMessage.trim();
      const { ok } = await sendWebhook(webhookUrl, payload, { maxAttempts: 2, retryDelay: 500 });
      if (ok) sent++; else failed++;
      await new Promise(r => setTimeout(r, 350));
    }
    setSending(false);
    toast.success(`Broadcast: ${sent} enviados${failed ? `, ${failed} falharam` : ''}`);
  };

  const handleExport = () => {
    if (!contacts?.length) return;
    const rows = (contacts as any[]).map(c => ({
      Nome: c.name || '',
      Telefone: c.phone,
      Email: c.email || '',
      Fonte: c.source || 'manual',
      'Opt-out': c.opt_out ? 'Sim' : 'Não',
      'Data de Entrada': new Date(c.created_at).toLocaleDateString('pt-BR'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos');
    XLSX.writeFile(wb, 'contatos_marketing.xlsx');
  };

  const filtered = (contacts || []).filter((c: any) => {
    const matchSearch = !search || [c.name, c.phone, c.email].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filterOptOut === 'all' || (filterOptOut === 'active' ? !c.opt_out : c.opt_out);
    return matchSearch && matchFilter;
  });

  const activeCount = (contacts || []).filter((c: any) => !c.opt_out).length;
  const optOutCount = (contacts || []).filter((c: any) => c.opt_out).length;

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Marketing</h1>
          <p className="text-sm text-zinc-500 mt-1">Base de contatos e disparo de campanhas via BotConversa</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={!contacts?.length} className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-bold hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-40">
            ↓ Exportar XLSX
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={importContacts.isPending} className={btnGold}>
            {importContacts.isPending ? 'Importando...' : '↑ Importar CSV/XLSX'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de contatos', value: contacts?.length ?? 0, color: 'text-white' },
          { label: 'Ativos', value: activeCount, color: 'text-[#25D366]' },
          { label: 'Opt-out', value: optOutCount, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className={`${cardClass} p-4`}>
            <p className={labelClass}>{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Webhook Config */}
      <div className={`${cardClass} p-5 space-y-4`}>
        <p className={labelClass}>🔗 Webhook BotConversa</p>
        <div className="flex gap-3">
          <input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://backend.botconversa.com.br/api/v1/webhooks/..."
            className={`${inputClass} font-mono text-xs flex-1`}
          />
          <button onClick={handleSaveConfig} disabled={saveConfig.isPending} className={`${btnGold} whitespace-nowrap`}>
            {saveConfig.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
        {!webhookUrl && (
          <p className="text-[10px] text-yellow-500 font-bold">⚠ Configure o webhook para habilitar os broadcasts</p>
        )}
      </div>

      {/* Broadcast */}
      <div className={`${cardClass} p-5 space-y-4`}>
        <p className={labelClass}>📢 Broadcast</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Trigger</p>
            <input
              value={broadcastTrigger}
              onChange={e => setBroadcastTrigger(e.target.value)}
              placeholder="marketing"
              className={`${inputClass} font-mono text-xs`}
            />
            <p className="text-[10px] text-zinc-600">Valor do campo <code className="font-mono">trigger</code> enviado ao BotConversa</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Mensagem extra (opcional)</p>
            <input
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
              placeholder="Texto adicional para o fluxo..."
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={handleBroadcast}
          disabled={sending || !webhookUrl || activeCount === 0}
          className="w-full py-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all border border-[#EDAC02]/20 bg-[#EDAC02]/10 text-[#EDAC02] hover:bg-[#EDAC02]/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? 'Enviando... aguarde' : `📢 Disparar para ${activeCount} contato${activeCount !== 1 ? 's' : ''} ativos`}
        </button>
      </div>

      {/* Contacts table */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou email..."
            className={`${inputClass} max-w-xs`}
          />
          <div className="flex items-center gap-1">
            {(['all', 'active', 'optout'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterOptOut(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filterOptOut === f ? 'border-[#EDAC02] bg-[#EDAC02]/10 text-[#EDAC02]' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? '✅ Ativos' : '🚫 Opt-out'}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-zinc-500 font-bold">{filtered.length} contato{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className={`${cardClass} overflow-hidden`}>
          {isLoading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Nenhum contato encontrado</div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#111] border-b border-[#1a1a1a]">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-zinc-500 font-bold uppercase tracking-wider">Nome</th>
                    <th className="text-left px-4 py-2.5 text-zinc-500 font-bold uppercase tracking-wider">Telefone</th>
                    <th className="text-left px-4 py-2.5 text-zinc-500 font-bold uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-2.5 text-zinc-500 font-bold uppercase tracking-wider">Fonte</th>
                    <th className="text-left px-4 py-2.5 text-zinc-500 font-bold uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f0f0f]">
                  {filtered.map((c: any) => (
                    <tr key={c.id} className={`hover:bg-[#0f0f0f] ${c.opt_out ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5 text-zinc-200 font-medium">{c.name || <span className="text-zinc-600">—</span>}</td>
                      <td className="px-4 py-2.5 text-zinc-400 font-mono">{c.phone}</td>
                      <td className="px-4 py-2.5 text-zinc-500">{c.email || <span className="text-zinc-700">—</span>}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${c.source === 'registration' ? 'bg-blue-500/10 text-blue-400' : c.source === 'csv' ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-800 text-zinc-500'}`}>
                          {c.source || 'manual'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => toggleOptOut.mutate({ id: c.id, opt_out: !c.opt_out })}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${c.opt_out ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20'}`}
                        >
                          {c.opt_out ? '🚫 Opt-out' : '✅ Ativo'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => { if (confirm('Remover contato?')) deleteContact.mutate(c.id); }}
                          className="text-zinc-700 hover:text-red-400 transition-colors text-xs font-bold"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
