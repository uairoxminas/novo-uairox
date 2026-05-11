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

  const [search, setSearch] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [filterOptOut, setFilterOptOut] = useState<'all' | 'active' | 'optout'>('active');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (config?.webhook_url) setWebhookUrl(config.webhook_url); }, [config]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const parsed = rows.map((r: any) => {
        const name = String(r['Nome'] || r['name'] || r['NOME'] || '').trim() || undefined;
        const rawPhone = String(r['Telefone'] || r['phone'] || r['TELEFONE'] || r['Celular'] || r['celular'] || '').trim();
        const phone = rawPhone.replace(/\D/g, '');
        const email = String(r['Email'] || r['email'] || r['EMAIL'] || r['E-mail'] || '').trim() || undefined;
        return { name, phone, email };
      }).filter(c => c.phone.length >= 8);
      if (!parsed.length) { toast.error('Nenhum contato válido. Verifique as colunas: Nome, Telefone, Email'); return; }
      const count = await importContacts.mutateAsync(parsed);
      toast.success(`${count} contatos importados`);
    } catch (err: any) { toast.error('Erro ao importar: ' + err.message); }
    finally { e.target.value = ''; }
  };

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
      <div className="flex items-center gap-2 justify-end">
        <button onClick={handleExport} disabled={!contacts?.length} className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-bold hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-40">↓ Exportar XLSX</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={importContacts.isPending} className={btnGold}>
          {importContacts.isPending ? 'Importando...' : '↑ Importar CSV/XLSX'}
        </button>
      </div>

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
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://backend.botconversa.com.br/api/v1/webhooks/..." className={`${inputClass} font-mono text-xs flex-1`} />
          <button onClick={async () => { await saveConfig.mutateAsync(webhookUrl); toast.success('Salvo'); }} disabled={saveConfig.isPending} className={`${btnGold} whitespace-nowrap`}>Salvar</button>
        </div>
        {!webhookUrl && <p className="text-[10px] text-yellow-500 font-bold">⚠ Configure o webhook para habilitar campanhas</p>}
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

// ─── NewCampaignModal ─────────────────────────────────────────────────────────
function NewCampaignModal({ onClose }: { onClose: () => void }) {
  const { data: contacts } = useMarketingContacts();
  const createCampaign = useCreateCampaign();

  const [step, setStep] = useState<'config' | 'variants' | 'contacts'>('config');
  const [name, setName] = useState('');
  const [triggerName, setTriggerName] = useState('marketing');
  const [baseMessage, setBaseMessage] = useState('');
  const [dailyLimit, setDailyLimit] = useState(30);
  const [autoContinue, setAutoContinue] = useState(true);
  const [variants, setVariants] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState('');

  const filteredContacts = (contacts || []).filter((c: any) =>
    !c.opt_out && (!contactSearch || [c.name, c.phone, c.email].some((v: any) => v?.toLowerCase().includes(contactSearch.toLowerCase())))
  );

  const handleGenerateVariants = async () => {
    if (!baseMessage.trim()) { toast.error('Escreva a mensagem base primeiro'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketing-generate-variants', {
        body: { base_message: baseMessage, context: 'Evento de CrossFit/Fitness UAIROX' },
      });
      if (error) throw error;
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
    if (variants.length === 0) { toast.error('Gere as variações de mensagem primeiro'); return; }
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
      });
      toast.success('Campanha criada! Ative-a para iniciar os envios.');
      onClose();
    } catch (err: any) {
      toast.error('Erro ao criar: ' + err.message);
    }
  };

  const steps = [
    { id: 'config', label: '1. Configuração' },
    { id: 'variants', label: '2. Mensagens' },
    { id: 'contacts', label: '3. Contatos' },
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
              <button onClick={() => setStep('variants')} className={`${btnGold} w-full`}>Próximo →</button>
            </div>
          )}

          {/* Step 2: Variants */}
          {step === 'variants' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className={labelClass}>Mensagem base</p>
                  <button
                    onClick={() => setBaseMessage(prev => prev + '{nome}')}
                    className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-[#EDAC02] text-[10px] font-mono font-bold hover:bg-zinc-700 transition-colors"
                  >
                    + inserir {'{nome}'}
                  </button>
                </div>
                <textarea
                  value={baseMessage}
                  onChange={e => setBaseMessage(e.target.value)}
                  placeholder="Ex: Olá {nome}, temos novidades sobre a próxima edição da UAIROX..."
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
                <p className="text-[10px] text-zinc-600">Use <code className="font-mono text-[#EDAC02]">{'{nome}'}</code> para personalizar com o nome de cada contato. O Gemini vai manter o marcador nas variações.</p>
              </div>

              <button onClick={handleGenerateVariants} disabled={generating || !baseMessage.trim()} className={`${btnGold} w-full`}>
                {generating ? '✨ Gerando variações...' : '✨ Gerar 10 variações com Gemini'}
              </button>

              {variants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>{variants.length} variações geradas — revise e edite</p>
                    <span className="text-[10px] text-zinc-600"><code className="font-mono text-[#EDAC02]">{'{nome}'}</code> será substituído automaticamente no envio</span>
                  </div>
                  {variants.map((v, i) => (
                    <div key={i} className={`${cardClass} p-3 space-y-2`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Variação #{i + 1}</span>
                          {v.includes('{nome}') && <span className="px-1.5 py-0.5 rounded bg-[#EDAC02]/10 text-[#EDAC02] text-[9px] font-mono border border-[#EDAC02]/20">personalizada</span>}
                        </div>
                        <button onClick={() => setVariants(prev => prev.filter((_, j) => j !== i))} className="text-zinc-700 hover:text-red-400 text-xs font-bold transition-colors">✕ Remover</button>
                      </div>
                      <div className="relative">
                        <textarea
                          value={v}
                          onChange={e => setVariants(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                          rows={3}
                          className={`${inputClass} resize-none text-xs text-zinc-300`}
                        />
                        <button
                          onClick={() => setVariants(prev => prev.map((x, j) => j === i ? x + '{nome}' : x))}
                          className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[#EDAC02] text-[9px] font-mono hover:bg-zinc-700 transition-colors"
                        >
                          + {'{nome}'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setStep('contacts')} className={`${btnGold} w-full`}>
                    Aprovado — Selecionar Contatos →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Contacts */}
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

      {isLoading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Carregando campanhas...</div>
      ) : !campaigns?.length ? (
        <div className={`${cardClass} p-12 text-center`}>
          <p className="text-zinc-500 text-sm">Nenhuma campanha criada ainda</p>
          <p className="text-zinc-700 text-xs mt-1">Crie sua primeira campanha para disparar mensagens em massa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(campaigns as any[]).map((c: any) => {
            const progress = c.total_contacts > 0 ? Math.round((c.sent_total / c.total_contacts) * 100) : 0;
            const st = STATUS_LABEL[c.status] || STATUS_LABEL.draft;
            return (
              <div key={c.id} className={`${cardClass} p-5`}>
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
                    <button onClick={() => setQueueModal({ id: c.id, name: c.name })} className="px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 text-xs font-bold hover:border-zinc-600 hover:text-white transition-colors">Fila</button>
                    {c.status === 'active' && (
                      <button onClick={() => updateStatus.mutate({ id: c.id, status: 'paused' })} className="px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/10 transition-colors">⏸ Pausar</button>
                    )}
                    {(c.status === 'draft' || c.status === 'paused') && (
                      <button onClick={() => updateStatus.mutate({ id: c.id, status: 'active' })} className="px-3 py-1.5 rounded-lg border border-[#25D366]/30 text-[#25D366] text-xs font-bold hover:bg-[#25D366]/10 transition-colors">▶ Ativar</button>
                    )}
                    {c.status !== 'active' && (
                      <button onClick={() => { if (confirm('Excluir campanha?')) deleteCampaign.mutate(c.id); }} className="px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-600 text-xs font-bold hover:border-red-500/30 hover:text-red-400 transition-colors">✕</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
