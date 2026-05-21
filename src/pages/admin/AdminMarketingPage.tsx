import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useMarketingContacts,
  useImportMarketingContacts,
  useToggleOptOut,
  useDeleteMarketingContact,
  useMarketingConfig,
  useSaveMarketingConfig,
  useMarketingCampaigns,
  useCreateCampaign,
  useUpdateCampaignStatus,
  useDeleteCampaign,
  useCampaignQueue,
  useCampaignMetrics,
  useSyncRegistrationsToMarketing,
} from '@/hooks/useMarketing';

// ─── Styles ──────────────────────────────────────────────────────────────────
const inputClass = 'w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#EDAC02]/40 transition-colors';
const cardClass = 'bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl';
const btnGold = 'px-4 py-2 rounded-lg bg-[#EDAC02] text-black text-xs font-black uppercase tracking-widest hover:bg-[#EDAC02]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const labelClass = 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Rascunho',  color: 'text-zinc-400 bg-zinc-800' },
  active:    { label: 'Ativa',     color: 'text-[#25D366] bg-[#25D366]/10' },
  paused:    { label: 'Pausada',   color: 'text-yellow-400 bg-yellow-400/10' },
  completed: { label: 'Concluída', color: 'text-blue-400 bg-blue-400/10' },
};

// ─── ContactsTab ─────────────────────────────────────────────────────────────
function ContactsTab() {
  const { data: contacts, isLoading } = useMarketingContacts();
  const { data: config } = useMarketingConfig();
  const importContacts = useImportMarketingContacts();
  const toggleOptOut = useToggleOptOut();
  const deleteContact = useDeleteMarketingContact();
  const saveConfig = useSaveMarketingConfig();
  const syncRegistrations = useSyncRegistrationsToMarketing();

  const [search, setSearch] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookTestState, setWebhookTestState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [filterOptOut, setFilterOptOut] = useState<'all' | 'active' | 'optout'>('active');
  const fileRef = useRef<HTMLInputElement>(null);

  // Column mapping state
  const [mappingData, setMappingData] = useState<{ headers: string[]; rows: any[]; fileName: string } | null>(null);
  const [colName, setColName] = useState('');
  const [colPhone, setColPhone] = useState('');
  const [colEmail, setColEmail] = useState('');

  useEffect(() => { if (config?.webhook_url) setWebhookUrl(config.webhook_url); }, [config]);

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) { toast.error('Cole a URL do webhook antes de testar'); return; }
    setWebhookTestState('loading');
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: 'marketing_test',
          nome: 'Teste UAIROX',
          telefone: '5531999999999',
          mensagem: '✅ Webhook configurado com sucesso! Esta é uma mensagem de teste do sistema UAIROX Marketing.',
        }),
      });
      if (res.ok) {
        setWebhookTestState('ok');
        toast.success('Webhook respondeu com sucesso!');
      } else {
        setWebhookTestState('error');
        toast.error(`Webhook retornou erro: ${res.status} ${res.statusText}`);
      }
    } catch {
      setWebhookTestState('error');
      toast.error('Falha ao conectar. Verifique a URL e tente novamente.');
    } finally {
      setTimeout(() => setWebhookTestState('idle'), 5000);
    }
  };

  // Step 1: parse file and show mapping modal
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) { toast.error('Arquivo vazio'); return; }
      const headers = Object.keys(rows[0]);
      if (!headers.length) { toast.error('Nenhuma coluna encontrada'); return; }

      // Auto-detect best guesses
      const guess = (patterns: string[]) => headers.find(h => patterns.some(p => h.toLowerCase().includes(p))) || '';
      setColName(guess(['nome', 'name']));
      setColPhone(guess(['telefone', 'phone', 'celular', 'fone', 'whatsapp', 'tel']));
      setColEmail(guess(['email', 'e-mail', 'mail']));
      setMappingData({ headers, rows, fileName: file.name });
    } catch (err: any) { toast.error('Erro ao ler arquivo: ' + err.message); }
    finally { e.target.value = ''; }
  };

  // Step 2: confirm mapping and import
  const handleConfirmImport = async () => {
    if (!mappingData || !colPhone) { toast.error('Selecione pelo menos a coluna de Telefone'); return; }
    try {
      const parsed = mappingData.rows.map((r: any) => {
        const name = colName ? String(r[colName] || '').trim() || undefined : undefined;
        const rawPhone = String(r[colPhone] || '').trim();
        const phone = rawPhone.replace(/\D/g, '');
        const email = colEmail ? String(r[colEmail] || '').trim() || undefined : undefined;
        return { name, phone, email };
      }).filter(c => c.phone.length >= 8);
      if (!parsed.length) { toast.error('Nenhum contato com telefone válido encontrado'); return; }
      const count = await importContacts.mutateAsync(parsed);
      toast.success(`${count} contatos importados`);
      setMappingData(null);
    } catch (err: any) { toast.error('Erro ao importar: ' + err.message); }
  };

  // Preview of mapped data
  const mappedPreview = mappingData ? mappingData.rows.slice(0, 5).map((r: any) => ({
    name: colName ? String(r[colName] || '').trim() : '—',
    phone: colPhone ? String(r[colPhone] || '').trim() : '—',
    email: colEmail ? String(r[colEmail] || '').trim() : '—',
  })) : [];

  const handleExport = () => {
    if (!contacts?.length) return;
    const rows = (contacts as any[]).map(c => ({
      Nome: c.name || '', Telefone: c.phone, Email: c.email || '',
      Fonte: c.source || 'manual', 'Opt-out': c.opt_out ? 'Sim' : 'Não',
      'Data': new Date(c.created_at).toLocaleDateString('pt-BR'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos');
    XLSX.writeFile(wb, 'contatos_marketing.xlsx');
  };

  const handleExportMetaAds = () => {
    const active = (contacts || []).filter((c: any) => !c.opt_out);
    if (!active.length) { toast.error('Nenhum contato ativo para exportar'); return; }

    const toE164 = (phone: string) => {
      const digits = phone.replace(/\D/g, '');
      if (digits.startsWith('55') && digits.length >= 12) return '+' + digits;
      if (digits.length === 11 || digits.length === 10) return '+55' + digits;
      return '+55' + digits;
    };

    const firstName = (name: string) => (name || '').trim().split(/\s+/)[0] || '';

    const rows = active.map((c: any) => ({
      phone: toE164(c.phone),
      email: c.email || '',
      fn: firstName(c.name),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MetaAds');
    XLSX.writeFile(wb, 'meta_ads_audience.csv', { bookType: 'csv' });
    toast.success(`${rows.length} contatos exportados para Meta Ads`);
  };

  const filtered = (contacts || []).filter((c: any) => {
    const matchSearch = !search || [c.name, c.phone, c.email].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filterOptOut === 'all' || (filterOptOut === 'active' ? !c.opt_out : c.opt_out);
    return matchSearch && matchFilter;
  });

  const activeCount = (contacts || []).filter((c: any) => !c.opt_out).length;
  const optOutCount = (contacts || []).filter((c: any) => c.opt_out).length;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center gap-2 justify-end flex-wrap">
        <button
          onClick={async () => {
            try {
              const count = await syncRegistrations.mutateAsync();
              toast.success(`${count} contato(s) sincronizados das inscrições`);
            } catch (err: any) {
              toast.error('Erro ao sincronizar: ' + err.message);
            }
          }}
          disabled={syncRegistrations.isPending}
          className="px-3 py-2 rounded-lg border border-[#25D366]/40 text-[#25D366] text-xs font-bold hover:bg-[#25D366]/10 hover:border-[#25D366]/60 transition-colors disabled:opacity-40"
        >
          {syncRegistrations.isPending ? '⏳ Sincronizando...' : '🔄 Sincronizar Inscritos'}
        </button>
        <button onClick={handleExport} disabled={!contacts?.length} className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-bold hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-40">↓ Exportar XLSX</button>
        <button onClick={handleExportMetaAds} disabled={!activeCount} className="px-3 py-2 rounded-lg border border-blue-500/40 text-blue-400 text-xs font-bold hover:bg-blue-500/10 hover:border-blue-500/60 transition-colors disabled:opacity-40">
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Exportar para Meta Ads
          </span>
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={importContacts.isPending} className={btnGold}>
          {importContacts.isPending ? 'Importando...' : '↑ Importar CSV/XLSX'}
        </button>
      </div>

      {/* Column Mapping Modal */}
      {mappingData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setMappingData(null)}>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
              <div>
                <h3 className="text-sm font-black text-white">Mapear Colunas</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">📄 {mappingData.fileName} — {mappingData.rows.length} linhas · {mappingData.headers.length} colunas</p>
              </div>
              <button onClick={() => setMappingData(null)} className="text-zinc-500 hover:text-white text-lg font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Column selectors */}
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: 'Nome', value: colName, setter: setColName, icon: '👤', required: false },
                  { label: 'Telefone', value: colPhone, setter: setColPhone, icon: '📱', required: true },
                  { label: 'Email', value: colEmail, setter: setColEmail, icon: '📧', required: false },
                ] as const).map(col => (
                  <div key={col.label} className="space-y-1.5">
                    <p className={`${labelClass} flex items-center gap-1`}>
                      {col.icon} {col.label}
                      {col.required && <span className="text-red-400">*</span>}
                    </p>
                    <select
                      value={col.label === 'Nome' ? colName : col.label === 'Telefone' ? colPhone : colEmail}
                      onChange={e => col.setter(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="">— Não mapear —</option>
                      {mappingData.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {colPhone && (
                <div className="space-y-2">
                  <p className={labelClass}>📋 Preview (primeiros 5 contatos)</p>
                  <div className={`${cardClass} overflow-hidden`}>
                    <table className="w-full text-xs">
                      <thead className="bg-[#111] border-b border-[#1a1a1a]">
                        <tr>
                          {['Nome', 'Telefone', 'Email'].map(h => (
                            <th key={h} className="text-left px-4 py-2 text-zinc-500 font-bold uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0f0f0f]">
                        {mappedPreview.map((row, i) => (
                          <tr key={i} className="hover:bg-[#0f0f0f]">
                            <td className="px-4 py-2 text-zinc-200">{row.name || <span className="text-zinc-600">—</span>}</td>
                            <td className="px-4 py-2 text-zinc-400 font-mono">{row.phone || <span className="text-zinc-600">—</span>}</td>
                            <td className="px-4 py-2 text-zinc-500">{row.email || <span className="text-zinc-600">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-zinc-600">Telefones com menos de 8 dígitos serão ignorados. Duplicatas por telefone serão mescladas automaticamente.</p>
                </div>
              )}

              {!colPhone && (
                <div className="p-6 text-center rounded-xl border border-red-500/20 bg-red-500/5">
                  <p className="text-sm text-red-400 font-bold">Selecione pelo menos a coluna de Telefone</p>
                  <p className="text-xs text-zinc-500 mt-1">O telefone é obrigatório para identificar cada contato</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[#1a1a1a] flex items-center justify-between">
              <button onClick={() => setMappingData(null)} className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-bold hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!colPhone || importContacts.isPending}
                className={`${btnGold} px-6 py-2.5`}
              >
                {importContacts.isPending ? '⏳ Importando...' : `✓ Importar ${mappingData.rows.length} contatos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: contacts?.length ?? 0, color: 'text-white' },
          { label: 'Ativos', value: activeCount, color: 'text-[#25D366]' },
          { label: 'Opt-out', value: optOutCount, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className={`${cardClass} p-4`}>
            <p className={labelClass}>{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Webhook */}
      <div className={`${cardClass} p-4 space-y-3`}>
        <p className={labelClass}>🔗 Webhook BotConversa</p>
        <div className="flex gap-3">
          <input value={webhookUrl} onChange={e => { setWebhookUrl(e.target.value); setWebhookTestState('idle'); }} placeholder="https://backend.botconversa.com.br/api/v1/webhooks/..." className={`${inputClass} font-mono text-xs flex-1`} />
          <button
            onClick={handleTestWebhook}
            disabled={webhookTestState === 'loading' || !webhookUrl.trim()}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              webhookTestState === 'ok'    ? 'bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366]' :
              webhookTestState === 'error' ? 'bg-red-500/20 border border-red-500/40 text-red-400' :
              'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
            }`}
          >
            {webhookTestState === 'loading' ? '...' :
             webhookTestState === 'ok'      ? '✓ OK' :
             webhookTestState === 'error'   ? '✕ Erro' : 'Testar'}
          </button>
          <button onClick={async () => { await saveConfig.mutateAsync({ webhook_url: webhookUrl }); toast.success('Salvo'); }} disabled={saveConfig.isPending} className={`${btnGold} whitespace-nowrap`}>Salvar</button>
        </div>
        {!webhookUrl && <p className="text-[10px] text-yellow-500 font-bold">⚠ Configure o webhook para habilitar campanhas</p>}
        {webhookTestState === 'ok' && (
          <p className="text-[10px] text-[#25D366] font-bold">✓ BotConversa recebeu a requisição de teste. Verifique se a mensagem chegou no WhatsApp configurado.</p>
        )}
        {webhookTestState === 'error' && (
          <p className="text-[10px] text-red-400 font-bold">✕ O webhook não respondeu. Verifique se a URL está correta e o BotConversa está ativo.</p>
        )}
      </div>

      {/* Meta Ads instructions */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-blue-400 flex-shrink-0 mt-0.5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        <div className="text-[10px] text-blue-300 leading-relaxed space-y-1">
          <p className="font-bold text-blue-200">Como usar no Meta Ads (Instagram + Facebook):</p>
          <ol className="space-y-0.5 list-decimal list-inside text-blue-300/80">
            <li>Clique em <strong className="text-blue-200">Exportar para Meta Ads</strong> — gera um CSV com telefone (E.164), email e nome</li>
            <li>No <strong className="text-blue-200">Gerenciador de Anúncios</strong> → Públicos → Criar Público → Lista de Clientes</li>
            <li>Faça upload do arquivo <code className="font-mono bg-blue-500/10 px-1 rounded">meta_ads_audience.csv</code></li>
            <li>O Meta cruza com perfis do Facebook/Instagram e cria o público para anúncios</li>
          </ol>
          <p className="text-blue-400/60 pt-0.5">Apenas contatos ativos (sem opt-out) são exportados. O Meta não permite DM proativo via API.</p>
        </div>
      </div>

      {/* Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou email..." className={`${inputClass} max-w-xs`} />
          <div className="flex gap-1">
            {(['all', 'active', 'optout'] as const).map(f => (
              <button key={f} onClick={() => setFilterOptOut(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filterOptOut === f ? 'border-[#EDAC02] bg-[#EDAC02]/10 text-[#EDAC02]' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                {f === 'all' ? 'Todos' : f === 'active' ? '✅ Ativos' : '🚫 Opt-out'}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-zinc-500 font-bold">{filtered.length} contatos</span>
        </div>
        <div className={`${cardClass} overflow-hidden`}>
          {isLoading ? <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
            : filtered.length === 0 ? <div className="p-8 text-center text-zinc-500 text-sm">Nenhum contato encontrado</div>
            : (
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#111] border-b border-[#1a1a1a]">
                    <tr>
                      {['Nome', 'Telefone', 'Email', 'Fonte', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-zinc-500 font-bold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0f0f0f]">
                    {filtered.map((c: any) => (
                      <tr key={c.id} className={`hover:bg-[#0f0f0f] ${c.opt_out ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2.5 text-zinc-200 font-medium">{c.name || <span className="text-zinc-600">—</span>}</td>
                        <td className="px-4 py-2.5 text-zinc-400 font-mono">{c.phone}</td>
                        <td className="px-4 py-2.5 text-zinc-500">{c.email || <span className="text-zinc-700">—</span>}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${c.source === 'registration' ? 'bg-blue-500/10 text-blue-400' : c.source === 'csv' ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-800 text-zinc-500'}`}>{c.source || 'manual'}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => toggleOptOut.mutate({ id: c.id, opt_out: !c.opt_out })} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${c.opt_out ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20'}`}>
                            {c.opt_out ? '🚫 Opt-out' : '✅ Ativo'}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => { if (confirm('Remover?')) deleteContact.mutate(c.id); }} className="text-zinc-700 hover:text-red-400 transition-colors font-bold">✕</button>
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

// ─── CampaignQueueModal ───────────────────────────────────────────────────────
function CampaignQueueModal({ campaignId, name, onClose }: { campaignId: string; name: string; onClose: () => void }) {
  const { data: queue } = useCampaignQueue(campaignId);

  const counts = (queue || []).reduce((acc: any, q: any) => {
    acc[q.status] = (acc[q.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
          <div>
            <h3 className="text-sm font-black text-white">{name}</h3>
            <div className="flex gap-3 mt-1 text-[10px] font-bold">
              <span className="text-[#25D366]">✓ {counts.sent || 0} enviados</span>
              <span className="text-yellow-400">⏳ {counts.pending || 0} pendentes</span>
              <span className="text-red-400">✗ {counts.failed || 0} falharam</span>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg font-bold">✕</button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#111] border-b border-[#1a1a1a]">
              <tr>
                {['Nome', 'Telefone', 'Variação', 'Status', 'Enviado em'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-zinc-500 font-bold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0f0f0f]">
              {(queue || []).map((q: any) => (
                <tr key={q.id} className="hover:bg-[#0f0f0f]">
                  <td className="px-4 py-2 text-zinc-300">{q.name || '—'}</td>
                  <td className="px-4 py-2 text-zinc-500 font-mono">{q.phone}</td>
                  <td className="px-4 py-2 text-zinc-600">#{q.variant_index + 1}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${q.status === 'sent' ? 'bg-[#25D366]/10 text-[#25D366]' : q.status === 'failed' ? 'bg-red-500/10 text-red-400' : q.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-zinc-800 text-zinc-500'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">{q.sent_at ? new Date(q.sent_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── EmailPreview ─────────────────────────────────────────────────────────────
function EmailPreview({ imageUrl, title, body, ctaText, ctaUrl }: { imageUrl: string; title: string; body: string; ctaText: string; ctaUrl: string }) {
  return (
    <div className="bg-[#f4f4f4] rounded-xl overflow-hidden border border-zinc-700 text-left" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="bg-white rounded-xl overflow-hidden max-w-full">
        {imageUrl && <img src={imageUrl} alt="" className="w-full object-cover max-h-48" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        <div className="p-6 space-y-3">
          {title && <h2 className="text-lg font-black text-gray-900 leading-tight">{title.replace(/\{nome\}/gi, 'João')}</h2>}
          {body && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{body.replace(/\{nome\}/gi, 'João')}</p>}
          {ctaText && ctaUrl && (
            <div className="pt-2">
              <span className="inline-block bg-[#EDAC02] text-black font-black text-xs px-6 py-3 rounded-lg uppercase tracking-wider">{ctaText}</span>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">Para não receber mais emails, responda com "SAIR".</p>
        </div>
      </div>
    </div>
  );
}

// ─── NewCampaignModal ─────────────────────────────────────────────────────────
function NewCampaignModal({ onClose }: { onClose: () => void }) {
  const { data: contacts } = useMarketingContacts();
  const createCampaign = useCreateCampaign();

  const [step, setStep] = useState<'config' | 'whatsapp' | 'invite' | 'email' | 'contacts'>('config');
  const [name, setName] = useState('');
  const [triggerName, setTriggerName] = useState('marketing');
  const [baseMessage, setBaseMessage] = useState('');
  const [dailyLimit, setDailyLimit] = useState(30);
  const [autoContinue, setAutoContinue] = useState(true);
  const [variants, setVariants] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  // Step 2 — Convite state
  const [step2Enabled, setStep2Enabled] = useState(false);
  const [step2Message, setStep2Message] = useState('');
  const [step2EventIds, setStep2EventIds] = useState<string[]>([]);
  const [responseTimeoutDays, setResponseTimeoutDays] = useState(5);
  const [generatingStep2, setGeneratingStep2] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('events' as any)
      .select('id, title, date, location, status')
      .in('status', ['open', 'planning'])
      .order('date', { ascending: true })
      .then(({ data }: any) => setAvailableEvents(data || []));
  }, []);

  const handleGenerateStep2 = async () => {
    if (!step2EventIds.length) { toast.error('Selecione ao menos um evento'); return; }
    setGeneratingStep2(true);
    try {
      const res = await fetch('/api/marketing-generate-step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_ids: step2EventIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na API');
      setStep2Message(data.message);
      toast.success('Convite gerado!');
    } catch (err: any) {
      toast.error('Erro ao gerar convite: ' + err.message);
    } finally {
      setGeneratingStep2(false);
    }
  };

  // Email state
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailImageUrl, setEmailImageUrl] = useState('');
  const [emailImageUploading, setEmailImageUploading] = useState(false);
  const [emailTitle, setEmailTitle] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailCtaText, setEmailCtaText] = useState('');
  const [emailCtaUrl, setEmailCtaUrl] = useState('');
  const [emailPreview, setEmailPreview] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const emailImageRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem (JPG, PNG, etc.)'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 5MB'); return; }
    setEmailImageUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload');
      setEmailImageUrl(data.url);
      toast.success('Imagem carregada!');
    } catch (err: any) {
      toast.error('Erro ao enviar imagem: ' + err.message);
    } finally {
      setEmailImageUploading(false);
      e.target.value = '';
    }
  };

  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState('');

  const filteredContacts = (contacts || []).filter((c: any) =>
    !c.opt_out && (!contactSearch || [c.name, c.phone, c.email].some((v: any) => v?.toLowerCase().includes(contactSearch.toLowerCase())))
  );

  const handleGenerateVariants = async () => {
    if (!baseMessage.trim()) { toast.error('Escreva a mensagem base primeiro'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/marketing-generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_message: baseMessage, context: 'Evento de CrossFit/Fitness UAIROX' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na API');
      if (!data?.variants?.length) throw new Error('Nenhuma variação gerada');
      setVariants(data.variants);
      toast.success(`${data.variants.length} variações geradas!`);
    } catch (err: any) {
      toast.error('Erro ao gerar variações: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map((c: any) => c.id)));
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Nome da campanha obrigatório'); return; }
    if (variants.length === 0) { toast.error('Gere as variações de WhatsApp primeiro'); return; }
    if (emailEnabled && !emailSubject.trim()) { toast.error('Assunto do email é obrigatório quando email está ativo'); return; }
    if (selectedContacts.size === 0) { toast.error('Selecione ao menos um contato'); return; }
    try {
      await createCampaign.mutateAsync({
        name,
        trigger_name: triggerName,
        base_message: baseMessage,
        variants,
        daily_limit: dailyLimit,
        auto_continue: autoContinue,
        contact_ids: Array.from(selectedContacts),
        email_enabled: emailEnabled,
        email_subject: emailEnabled ? emailSubject : undefined,
        email_template: emailEnabled ? { image_url: emailImageUrl, title: emailTitle, body: emailBody, cta_text: emailCtaText, cta_url: emailCtaUrl } : undefined,
        step2_enabled: step2Enabled,
        step2_message: step2Enabled ? step2Message : undefined,
        step2_event_ids: step2Enabled ? step2EventIds : undefined,
        response_timeout_days: responseTimeoutDays,
      });
      toast.success('Campanha criada! Ative-a para iniciar os envios.');
      onClose();
    } catch (err: any) {
      toast.error('Erro ao criar: ' + err.message);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailTo.trim()) { toast.error('Informe o email de destino'); return; }
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke('marketing-test-email', {
        body: {
          to: testEmailTo.trim(),
          subject: emailSubject || 'Teste de Email — UAIROX',
          template: { image_url: emailImageUrl, title: emailTitle, body: emailBody, cta_text: emailCtaText, cta_url: emailCtaUrl },
        },
      });
      if (error) throw error;
      toast.success('Email de teste enviado para ' + testEmailTo.trim());
    } catch (err: any) {
      toast.error('Erro ao enviar teste: ' + err.message);
    } finally {
      setSendingTest(false);
    }
  };

  const insertNome = (val: string, set: (v: string) => void) => set(val + '{nome}');

  const steps = [
    { id: 'config',   label: '1. Config' },
    { id: 'whatsapp', label: '2. Saudação' },
    { id: 'invite',   label: '3. Convite' },
    { id: 'email',    label: '4. Email' },
    { id: 'contacts', label: '5. Contatos' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
          <h3 className="text-sm font-black text-white">Nova Campanha</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg font-bold">✕</button>
        </div>

        {/* Step nav */}
        <div className="flex border-b border-[#1a1a1a]">
          {steps.map(s => (
            <button key={s.id} onClick={() => setStep(s.id as any)} className={`flex-1 py-3 text-xs font-bold transition-colors ${step === s.id ? 'text-[#EDAC02] border-b-2 border-[#EDAC02]' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Config */}
          {step === 'config' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className={labelClass}>Nome da campanha</p>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: UAIROX 4ª Edição — Convite" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className={labelClass}>Trigger BotConversa</p>
                  <input value={triggerName} onChange={e => setTriggerName(e.target.value)} placeholder="marketing" className={`${inputClass} font-mono text-xs`} />
                  <p className="text-[10px] text-zinc-600">Valor do campo <code className="font-mono">trigger</code> enviado</p>
                </div>
                <div className="space-y-1">
                  <p className={labelClass}>Limite diário de envios</p>
                  <input type="number" min={1} max={200} value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))} className={inputClass} />
                  <p className="text-[10px] text-zinc-600">Máximo de mensagens por dia</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-[#1a1a1a]">
                <button onClick={() => setAutoContinue(!autoContinue)} className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${autoContinue ? 'bg-[#EDAC02]' : 'bg-zinc-700'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${autoContinue ? 'left-5' : 'left-0.5'}`} />
                </button>
                <div>
                  <p className="text-xs font-bold text-white">Continuar automaticamente no próximo dia</p>
                  <p className="text-[10px] text-zinc-500">Se desativado, a campanha pausa ao fim de cada janela e precisa ser reativada manualmente</p>
                </div>
              </div>
              <button onClick={() => setStep('whatsapp')} className={`${btnGold} w-full`}>Próximo →</button>
            </div>
          )}

          {/* Step 2: WhatsApp */}
          {step === 'whatsapp' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className={labelClass}>Mensagem base</p>
                  <button onClick={() => setBaseMessage(prev => prev + '{nome}')} className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-[#EDAC02] text-[10px] font-mono font-bold hover:bg-zinc-700 transition-colors">
                    + inserir {'{nome}'}
                  </button>
                </div>
                <textarea value={baseMessage} onChange={e => setBaseMessage(e.target.value)} placeholder="Ex: Olá {nome}, temos novidades sobre a próxima edição da UAIROX..." rows={4} className={`${inputClass} resize-none`} />
                <p className="text-[10px] text-zinc-600">Use <code className="font-mono text-[#EDAC02]">{'{nome}'}</code> para personalizar. O Gemini vai manter o marcador nas variações.</p>
              </div>
              <button onClick={handleGenerateVariants} disabled={generating || !baseMessage.trim()} className={`${btnGold} w-full`}>
                {generating ? '✨ Gerando variações...' : '✨ Gerar 10 variações com Gemini'}
              </button>
              {variants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>{variants.length} variações — revise e edite</p>
                    <span className="text-[10px] text-zinc-600"><code className="font-mono text-[#EDAC02]">{'{nome}'}</code> substituído no envio</span>
                  </div>
                  {variants.map((v, i) => (
                    <div key={i} className={`${cardClass} p-3 space-y-2`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">#{i + 1}</span>
                          {v.includes('{nome}') && <span className="px-1.5 py-0.5 rounded bg-[#EDAC02]/10 text-[#EDAC02] text-[9px] font-mono border border-[#EDAC02]/20">personalizada</span>}
                        </div>
                        <button onClick={() => setVariants(prev => prev.filter((_, j) => j !== i))} className="text-zinc-700 hover:text-red-400 text-xs font-bold transition-colors">✕</button>
                      </div>
                      <div className="relative">
                        <textarea value={v} onChange={e => setVariants(prev => prev.map((x, j) => j === i ? e.target.value : x))} rows={3} className={`${inputClass} resize-none text-xs text-zinc-300`} />
                        <button onClick={() => setVariants(prev => prev.map((x, j) => j === i ? x + '{nome}' : x))} className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[#EDAC02] text-[9px] font-mono hover:bg-zinc-700 transition-colors">
                          + {'{nome}'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setStep('invite')} className={`${btnGold} w-full`}>Aprovado — Configurar Convite →</button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Convite */}
          {step === 'invite' && (
            <div className="space-y-4">
              {/* Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-[#1a1a1a]">
                <button onClick={() => setStep2Enabled(!step2Enabled)} className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${step2Enabled ? 'bg-[#EDAC02]' : 'bg-zinc-700'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${step2Enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
                <div>
                  <p className="text-xs font-bold text-white">Enviar convite quando o contato responder</p>
                  <p className="text-[10px] text-zinc-500">Quem não responder entra em opt-out automaticamente após os dias configurados</p>
                </div>
              </div>

              {!step2Enabled && (
                <button onClick={() => setStep('email')} className={`${btnGold} w-full`}>Pular — Configurar Email →</button>
              )}

              {step2Enabled && (
                <div className="space-y-4">
                  {/* Timeout */}
                  <div className="space-y-1">
                    <p className={labelClass}>Dias sem resposta → opt-out automático</p>
                    <input type="number" min={1} max={30} value={responseTimeoutDays} onChange={e => setResponseTimeoutDays(Number(e.target.value))} className={inputClass} />
                    <p className="text-[10px] text-zinc-600">Contatos que não responderem em <strong className="text-zinc-400">{responseTimeoutDays} dias</strong> serão movidos para opt-out automaticamente pelo worker</p>
                  </div>

                  {/* Event selector */}
                  <div className="space-y-2">
                    <p className={labelClass}>Eventos a divulgar no convite</p>
                    {availableEvents.length === 0 ? (
                      <div className="p-4 text-center text-zinc-600 text-xs border border-[#1a1a1a] rounded-xl">Nenhum evento aberto ou em planejamento encontrado</div>
                    ) : (
                      <div className={`${cardClass} divide-y divide-[#0f0f0f] overflow-hidden`}>
                        {availableEvents.map((ev: any) => (
                          <label key={ev.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#0f0f0f] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step2EventIds.includes(ev.id)}
                              onChange={e => setStep2EventIds(prev => e.target.checked ? [...prev, ev.id] : prev.filter(id => id !== ev.id))}
                              className="accent-[#EDAC02] flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{ev.title}</p>
                              <p className="text-[10px] text-zinc-500">{new Date(ev.date).toLocaleDateString('pt-BR')} · {ev.location}</p>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${ev.status === 'open' ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-zinc-800 text-zinc-500'}`}>
                              {ev.status === 'open' ? 'Aberto' : 'Planejamento'}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={handleGenerateStep2}
                    disabled={generatingStep2 || !step2EventIds.length}
                    className={`${btnGold} w-full`}
                  >
                    {generatingStep2 ? '✨ Gerando convite...' : '✨ Gerar mensagem de convite com Gemini'}
                  </button>

                  {/* Message editor */}
                  {step2Message && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className={labelClass}>Mensagem de convite — revise e edite</p>
                        <div className="flex gap-1">
                          <button onClick={() => setStep2Message(prev => prev + '{nome}')} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[#EDAC02] text-[9px] font-mono hover:bg-zinc-700 transition-colors">+ {'{nome}'}</button>
                          <button onClick={() => setStep2Message(prev => prev + '{link}')} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-blue-400 text-[9px] font-mono hover:bg-zinc-700 transition-colors">+ {'{link}'}</button>
                        </div>
                      </div>
                      <textarea
                        value={step2Message}
                        onChange={e => setStep2Message(e.target.value)}
                        rows={6}
                        className={`${inputClass} resize-none`}
                      />
                      <p className="text-[10px] text-zinc-600">
                        Enviada via BotConversa com trigger <code className="font-mono text-[#EDAC02] bg-[#EDAC02]/10 px-1 rounded">{triggerName}_step2</code> quando o contato responder a saudação.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setStep('email')}
                    disabled={!step2Message.trim()}
                    className={`${btnGold} w-full`}
                  >
                    Próximo — Configurar Email →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Email */}
          {step === 'email' && (
            <div className="space-y-4">
              {/* Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-[#1a1a1a]">
                <button onClick={() => setEmailEnabled(!emailEnabled)} className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${emailEnabled ? 'bg-[#EDAC02]' : 'bg-zinc-700'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${emailEnabled ? 'left-5' : 'left-0.5'}`} />
                </button>
                <div>
                  <p className="text-xs font-bold text-white">Enviar email junto com o WhatsApp</p>
                  <p className="text-[10px] text-zinc-500">Requer RESEND_API_KEY configurada no Supabase</p>
                </div>
                {emailEnabled && (
                  <button onClick={() => setStep('contacts')} className="ml-auto px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-bold hover:text-white transition-colors">Pular →</button>
                )}
              </div>

              {!emailEnabled && (
                <button onClick={() => setStep('contacts')} className={`${btnGold} w-full`}>Pular — Ir para Contatos →</button>
              )}

              {emailEnabled && (
                <div className="space-y-4">
                  {/* Subject */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={labelClass}>Assunto do email</p>
                      <button onClick={() => insertNome(emailSubject, setEmailSubject)} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[#EDAC02] text-[9px] font-mono hover:bg-zinc-700 transition-colors">+ {'{nome}'}</button>
                    </div>
                    <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Ex: {nome}, a UAIROX está chegando! 🏆" className={inputClass} />
                  </div>

                  {/* Template editor / preview toggle */}
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>Template</p>
                    <button onClick={() => setEmailPreview(!emailPreview)} className={`px-3 py-1 rounded-lg border text-xs font-bold transition-colors ${emailPreview ? 'border-[#EDAC02] text-[#EDAC02] bg-[#EDAC02]/10' : 'border-zinc-700 text-zinc-400 hover:text-white'}`}>
                      {emailPreview ? '✏ Editar' : '👁 Preview'}
                    </button>
                  </div>

                  {emailPreview ? (
                    <EmailPreview imageUrl={emailImageUrl} title={emailTitle} body={emailBody} ctaText={emailCtaText} ctaUrl={emailCtaUrl} />
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <p className={labelClass}>Imagem do topo</p>
                        <input ref={emailImageRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        {emailImageUrl ? (
                          <div className="relative rounded-xl overflow-hidden border border-zinc-700 group">
                            <img src={emailImageUrl} alt="Header" className="w-full max-h-40 object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button onClick={() => emailImageRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-white text-xs font-bold hover:bg-zinc-700 transition-colors">🔄 Trocar</button>
                              <button onClick={() => setEmailImageUrl('')} className="px-3 py-1.5 rounded-lg bg-red-900/60 border border-red-600/40 text-red-300 text-xs font-bold hover:bg-red-900 transition-colors">✕ Remover</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => emailImageRef.current?.click()}
                            disabled={emailImageUploading}
                            className="w-full py-6 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-500 text-xs font-bold hover:border-[#EDAC02]/40 hover:text-[#EDAC02] transition-colors disabled:opacity-40"
                          >
                            {emailImageUploading ? '⏳ Enviando imagem...' : '📷 Clique para enviar imagem JPG/PNG (máx 5MB)'}
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className={labelClass}>Título</p>
                          <button onClick={() => insertNome(emailTitle, setEmailTitle)} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[#EDAC02] text-[9px] font-mono hover:bg-zinc-700 transition-colors">+ {'{nome}'}</button>
                        </div>
                        <input value={emailTitle} onChange={e => setEmailTitle(e.target.value)} placeholder="Ex: {nome}, chegou sua hora de competir!" className={inputClass} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className={labelClass}>Corpo do email</p>
                          <button onClick={() => insertNome(emailBody, setEmailBody)} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[#EDAC02] text-[9px] font-mono hover:bg-zinc-700 transition-colors">+ {'{nome}'}</button>
                        </div>
                        <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Escreva o conteúdo principal do email..." rows={5} className={`${inputClass} resize-none`} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className={labelClass}>Texto do botão CTA</p>
                          <input value={emailCtaText} onChange={e => setEmailCtaText(e.target.value)} placeholder="Ex: Garantir minha vaga" className={inputClass} />
                        </div>
                        <div className="space-y-1">
                          <p className={labelClass}>Link do botão CTA</p>
                          <input value={emailCtaUrl} onChange={e => setEmailCtaUrl(e.target.value)} placeholder="https://uairox.com.br/evento/..." className={`${inputClass} font-mono text-xs`} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test email */}
                  <div className="flex gap-2 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
                    <input
                      value={testEmailTo}
                      onChange={e => setTestEmailTo(e.target.value)}
                      placeholder="seu@email.com — ver layout"
                      className={`${inputClass} flex-1 text-xs`}
                    />
                    <button onClick={handleTestEmail} disabled={sendingTest || !testEmailTo.trim()} className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-bold whitespace-nowrap hover:border-[#EDAC02]/40 hover:text-[#EDAC02] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {sendingTest ? 'Enviando...' : '📧 Testar'}
                    </button>
                  </div>

                  <button onClick={() => setStep('contacts')} disabled={!emailSubject.trim()} className={`${btnGold} w-full`}>
                    Próximo — Selecionar Contatos →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Contacts */}
          {step === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={labelClass}>Selecionar destinatários</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Apenas contatos ativos (sem opt-out)</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#EDAC02] font-bold">{selectedContacts.size} selecionados</span>
                  <button onClick={handleSelectAll} className="px-3 py-1 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-bold hover:border-zinc-500 hover:text-white transition-colors">
                    {selectedContacts.size === filteredContacts.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>
              </div>
              <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Buscar contato..." className={inputClass} />
              <div className={`${cardClass} overflow-hidden max-h-64 overflow-y-auto`}>
                {filteredContacts.length === 0
                  ? <div className="p-6 text-center text-zinc-500 text-xs">Nenhum contato ativo</div>
                  : filteredContacts.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#0f0f0f] last:border-0 hover:bg-[#111] cursor-pointer">
                      <input type="checkbox" checked={selectedContacts.has(c.id)} onChange={e => {
                        setSelectedContacts(prev => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(c.id) : next.delete(c.id);
                          return next;
                        });
                      }} className="accent-[#EDAC02]" />
                      <span className="text-xs text-zinc-300 font-medium flex-1">{c.name || c.phone}</span>
                      <span className="text-[10px] text-zinc-600 font-mono">{c.phone}</span>
                    </label>
                  ))
                }
              </div>
              <button onClick={handleCreate} disabled={createCampaign.isPending || selectedContacts.size === 0} className={`${btnGold} w-full py-3`}>
                {createCampaign.isPending ? 'Criando...' : `Criar campanha para ${selectedContacts.size} contatos`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CampaignHowItWorks ───────────────────────────────────────────────────────
function CampaignHowItWorks() {
  const [open, setOpen] = useState(false);

  const steps = [
    {
      num: '1',
      title: 'Config',
      color: 'text-[#EDAC02]',
      border: 'border-[#EDAC02]/30',
      bg: 'bg-[#EDAC02]/5',
      items: [
        { label: 'Nome da campanha', desc: 'Identificação interna da campanha.' },
        { label: 'Trigger BotConversa', desc: 'Valor do campo "trigger" enviado no payload ao webhook. Deve corresponder ao gatilho configurado no fluxo do BotConversa (padrão: "marketing").' },
        { label: 'Limite diário', desc: 'Máximo de mensagens enviadas por dia. Recomendado: 30–50 para evitar bloqueios.' },
        { label: 'Continuar automaticamente', desc: 'Se ativo, retoma no dia seguinte automaticamente. Se desligado, pausa ao fim do dia e exige reativação manual.' },
      ],
    },
    {
      num: '2',
      title: 'WhatsApp',
      color: 'text-[#25D366]',
      border: 'border-[#25D366]/30',
      bg: 'bg-[#25D366]/5',
      items: [
        { label: 'Mensagem base', desc: 'Texto principal da campanha. Use {nome} para personalizar por contato.' },
        { label: 'Gerar 10 variações com Gemini', desc: 'Chama a Edge Function "marketing-generate-variants" que usa a API Gemini para criar 10 versões diferentes da mensagem (anti-spam do WhatsApp). Ao menos 6 das 10 terão {nome}.' },
        { label: 'Revisar e editar variações', desc: 'Você pode editar cada variação ou deletar as que não aprovar antes de avançar.' },
      ],
    },
    {
      num: '3',
      title: 'Email (opcional)',
      color: 'text-blue-400',
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/5',
      items: [
        { label: 'Toggle de ativação', desc: 'Quando ativo, envia email junto com o WhatsApp para cada contato. Requer RESEND_API_KEY configurada nas secrets do Supabase.' },
        { label: 'Template', desc: 'Imagem de topo, título, corpo do texto e botão CTA (texto + link). Todos os campos aceitam {nome} para personalização.' },
        { label: 'Email de teste', desc: 'Envia um preview do template para qualquer email antes de criar a campanha. Usa a Edge Function "marketing-test-email". {nome} é substituído por "João".' },
      ],
    },
    {
      num: '4',
      title: 'Contatos',
      color: 'text-purple-400',
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/5',
      items: [
        { label: 'Seleção de destinatários', desc: 'Apenas contatos ativos (sem opt-out) são listados. Use "Selecionar todos" ou busca individual.' },
        { label: 'Criação da campanha', desc: 'A campanha é criada em status Rascunho. Para iniciar os envios, clique em "▶ Ativar" na lista de campanhas.' },
      ],
    },
  ];

  return (
    <div className={`${cardClass} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#0f0f0f] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white">Como funciona?</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold border border-zinc-700">Guia rápido</span>
        </div>
        <span className={`text-zinc-500 text-xs font-bold transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-[#1a1a1a] p-5 space-y-4">
          {/* Steps */}
          <div className="grid grid-cols-1 gap-4">
            {steps.map(step => (
              <div key={step.num} className={`rounded-xl border ${step.border} ${step.bg} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${step.border} ${step.color}`}>{step.num}</span>
                  <p className={`text-xs font-black ${step.color}`}>Passo {step.num} — {step.title}</p>
                </div>
                <div className="space-y-2">
                  {step.items.map(item => (
                    <div key={item.label} className="flex gap-2">
                      <span className="text-zinc-600 text-[10px] mt-0.5 flex-shrink-0">›</span>
                      <div>
                        <span className="text-[10px] font-black text-zinc-300">{item.label}: </span>
                        <span className="text-[10px] text-zinc-500 leading-relaxed">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Worker section */}
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
            <p className="text-xs font-black text-orange-400 mb-3">Worker de Disparo — marketing-worker</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                { icon: '🕐', text: 'Executa a cada minuto via cron SQL no Supabase' },
                { icon: '📅', text: 'Só dispara seg–sex, 8h–18h BRT' },
                { icon: '⏱', text: 'Delay aleatório de 1–30 min entre cada mensagem (anti-bloqueio WhatsApp)' },
                { icon: '🔀', text: 'Rotaciona as variações de mensagem por contato' },
                { icon: '📊', text: 'Respeita o limite diário configurado por campanha' },
                { icon: '✅', text: 'Marca cada envio como: sent / failed / pending na fila' },
              ].map(item => (
                <div key={item.icon} className="flex gap-2 items-start">
                  <span className="text-xs flex-shrink-0">{item.icon}</span>
                  <span className="text-[10px] text-zinc-400 leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-orange-500/20">
              <p className="text-[10px] text-orange-400/60">
                Payload enviado ao BotConversa: <code className="font-mono bg-orange-500/10 px-1 rounded">{'{ trigger, nome, telefone, email, mensagem }'}</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TestCampaignModal ────────────────────────────────────────────────────────
function TestCampaignModal({ campaign, onClose }: { campaign: any; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [sentMessage, setSentMessage] = useState('');

  const handleSend = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { toast.error('Informe um número de WhatsApp válido'); return; }
    setState('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/marketing-test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id, phone: digits, name: name || 'Teste' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      setSentMessage(data.message || '');
      setState('ok');
    } catch (err: any) {
      setErrorMsg(err.message);
      setState('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${cardClass} w-full max-w-md p-6 space-y-5`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-white">Testar Campanha</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg leading-none">✕</button>
        </div>

        {state !== 'ok' ? (
          <>
            <div className="space-y-3">
              <div>
                <p className={labelClass}>Número WhatsApp</p>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="31999999999 (com DDD)"
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <p className={labelClass}>Nome (substitui {'{nome}'} na mensagem)</p>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Léo"
                  className={`${inputClass} mt-1`}
                />
              </div>
            </div>

            {state === 'error' && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] text-red-400 font-bold">✕ {errorMsg}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-zinc-800 text-zinc-400 text-xs font-bold hover:border-zinc-600 transition-colors">Cancelar</button>
              <button
                onClick={handleSend}
                disabled={state === 'sending' || !phone.trim()}
                className={`flex-1 ${btnGold}`}
              >
                {state === 'sending' ? 'Enviando...' : 'Enviar teste →'}
              </button>
            </div>

            <p className="text-[10px] text-zinc-600 leading-relaxed">
              Envia o step 1 da campanha imediatamente para o número informado via BotConversa. Nenhum registro é criado na fila — é apenas um teste.
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 space-y-2">
              <p className="text-[10px] font-black text-[#25D366] uppercase tracking-widest">✓ Mensagem enviada!</p>
              <p className="text-[10px] text-zinc-400">Verifique se chegou no WhatsApp <span className="text-white font-bold">{phone}</span>. Depois responda a mensagem para testar o fluxo completo do BotConversa.</p>
            </div>

            {sentMessage && (
              <div className="space-y-1">
                <p className={labelClass}>Mensagem enviada:</p>
                <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{sentMessage}</p>
                </div>
              </div>
            )}

            <button onClick={onClose} className={`${btnGold} w-full`}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CampaignCard ─────────────────────────────────────────────────────────────
function CampaignCard({
  c,
  onQueue,
  onToggleStatus,
  onDelete,
}: {
  c: any;
  onQueue: () => void;
  onToggleStatus: (status: 'active' | 'paused') => void;
  onDelete: () => void;
}) {
  const { data: metrics } = useCampaignMetrics(c.id);
  const [showTest, setShowTest] = useState(false);
  const progress = c.total_contacts > 0 ? Math.round((c.sent_total / c.total_contacts) * 100) : 0;
  const st = STATUS_LABEL[c.status] || STATUS_LABEL.draft;

  return (
    <>
    <div className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-black text-white truncate">{c.name}</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${st.color}`}>{st.label}</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 text-[10px] font-mono border border-zinc-800">{c.trigger_name}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500 font-bold">
            <span>📨 {c.sent_total} / {c.total_contacts} enviados</span>
            <span>📅 Hoje: {c.sent_today} / {c.daily_limit}</span>
            <span>🔁 {c.auto_continue ? 'Auto-continua' : 'Pausa ao fim do dia'}</span>
          </div>

          {/* Tracking metrics row */}
          {c.step2_enabled && (
            <div className="flex items-center gap-3 mt-2 text-[10px] font-bold flex-wrap">
              <span className="text-zinc-500">💬 {metrics?.responded ?? '—'} responderam</span>
              <span className="text-blue-400">🔗 {metrics?.clicks ?? '—'} cliques</span>
              <span className="text-[#25D366]">✅ {metrics?.conversions ?? '—'} conversões</span>
              {(metrics?.clicks ?? 0) > 0 && (
                <span className="text-zinc-600">
                  ({Math.round(((metrics?.conversions ?? 0) / (metrics?.clicks ?? 1)) * 100)}% conv.)
                </span>
              )}
            </div>
          )}

          {c.total_contacts > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-600 mb-1">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#EDAC02] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowTest(true)} className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-bold hover:border-[#EDAC02]/40 hover:text-[#EDAC02] transition-colors">🧪 Testar</button>
          <button onClick={onQueue} className="px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 text-xs font-bold hover:border-zinc-600 hover:text-white transition-colors">Fila</button>
          {c.status === 'active' && (
            <button onClick={() => onToggleStatus('paused')} className="px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/10 transition-colors">⏸ Pausar</button>
          )}
          {(c.status === 'draft' || c.status === 'paused') && (
            <button onClick={() => onToggleStatus('active')} className="px-3 py-1.5 rounded-lg border border-[#25D366]/30 text-[#25D366] text-xs font-bold hover:bg-[#25D366]/10 transition-colors">▶ Ativar</button>
          )}
          {c.status !== 'active' && (
            <button onClick={onDelete} className="px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-600 text-xs font-bold hover:border-red-500/30 hover:text-red-400 transition-colors">✕</button>
          )}
        </div>
      </div>
    </div>
    {showTest && <TestCampaignModal campaign={c} onClose={() => setShowTest(false)} />}
    </>
  );
}

// ─── CampaignsTab ─────────────────────────────────────────────────────────────
function CampaignsTab() {
  const { data: campaigns, isLoading } = useMarketingCampaigns();
  const updateStatus = useUpdateCampaignStatus();
  const deleteCampaign = useDeleteCampaign();

  const [showNew, setShowNew] = useState(false);
  const [queueModal, setQueueModal] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)} className={btnGold}>+ Nova Campanha</button>
      </div>

      <CampaignHowItWorks />

      {isLoading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Carregando campanhas...</div>
      ) : !campaigns?.length ? (
        <div className={`${cardClass} p-12 text-center`}>
          <p className="text-zinc-500 text-sm">Nenhuma campanha criada ainda</p>
          <p className="text-zinc-700 text-xs mt-1">Crie sua primeira campanha para disparar mensagens em massa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(campaigns as any[]).map((c: any) => (
            <CampaignCard
              key={c.id}
              c={c}
              onQueue={() => setQueueModal({ id: c.id, name: c.name })}
              onToggleStatus={(status) => updateStatus.mutate({ id: c.id, status })}
              onDelete={() => { if (confirm('Excluir campanha?')) deleteCampaign.mutate(c.id); }}
            />
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <span className="text-blue-400 text-xs mt-0.5 flex-shrink-0">ℹ</span>
        <div className="text-[10px] text-blue-400 leading-relaxed space-y-0.5">
          <p>Envios automáticos de <strong>seg–sex, 8h–18h BRT</strong> com delay aleatório de <strong>1–30 minutos</strong> entre cada mensagem.</p>
          <p>Worker executa a cada minuto via <code className="font-mono bg-blue-500/10 px-1 rounded">marketing-worker</code>. Configure o cron via SQL Editor.</p>
        </div>
      </div>

      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} />}
      {queueModal && <CampaignQueueModal campaignId={queueModal.id} name={queueModal.name} onClose={() => setQueueModal(null)} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminMarketingPage() {
  const [tab, setTab] = useState<'contacts' | 'campaigns'>('contacts');

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Marketing</h1>
        <p className="text-sm text-zinc-500 mt-1">Base de contatos e campanhas de disparo via BotConversa</p>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-[#1a1a1a] gap-1">
        {([
          { id: 'contacts', label: '👥 Contatos' },
          { id: 'campaigns', label: '📢 Campanhas' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-5 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-[#EDAC02] text-[#EDAC02]' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'contacts' ? <ContactsTab /> : <CampaignsTab />}
    </div>
  );
}
