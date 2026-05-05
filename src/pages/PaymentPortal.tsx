import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PaymentPortal() {
  const { registrationId } = useParams();
  const [registration, setRegistration] = useState<any>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);

  const fetchData = async () => {
    if (!registrationId) return;
    setLoading(true);

    const { data: reg } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (!reg) { setLoading(false); return; }
    setRegistration(reg);

    const [evRes, catRes, instRes, batchRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', reg.event_id).single(),
      supabase.from('categories').select('*').eq('id', reg.category_id).single(),
      (supabase as any).from('registration_installments').select('*').eq('registration_id', registrationId).order('installment_number'),
      reg.batch_id ? supabase.from('price_batches').select('*').eq('id', reg.batch_id).single() : { data: null },
    ]);

    setEvent(evRes.data);
    setCategory(catRes.data);
    setInstallments(instRes.data || []);
    setBatch(batchRes.data);

    // Count confirmed registrations for PIX switch logic
    const { count: confCount } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', reg.event_id)
      .eq('status', 'confirmed');
    setConfirmedCount(confCount || 0);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [registrationId]);

  const handleUploadReceipt = async (installmentId: string, installmentNumber: number, file: File) => {
    setUploading(installmentNumber);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `receipt-${registrationId}-parcela${installmentNumber}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('event-assets').upload(fileName, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('event-assets').getPublicUrl(fileName);
      
      await (supabase as any).from('registration_installments')
        .update({ receipt_url: urlData.publicUrl })
        .eq('id', installmentId);

      toast.success(`Comprovante da ${installmentNumber}ª parcela enviado!`);
      fetchData();
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + err.message);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!registration || !event) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
        <div className="bg-[#0a0a0a] border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
          <span className="text-4xl mb-4 block">❌</span>
          <h2 className="text-xl font-black text-white mb-2">Inscrição não encontrada</h2>
          <p className="text-sm text-zinc-400">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  const totalAmount = installments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const paidAmount = installments.filter((i: any) => i.status === 'paid').reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const paidCount = installments.filter((i: any) => i.status === 'paid').length;
  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const getStatusBadge = (inst: any) => {
    if (inst.status === 'paid') return { text: `✅ Pago${inst.paid_at ? ' em ' + new Date(inst.paid_at).toLocaleDateString('pt-BR') : ''}`, color: 'text-green-400 bg-green-500/10 border-green-500/20' };
    const today = new Date().toISOString().split('T')[0];
    if (inst.due_date < today) return { text: `❌ Vencida (${Math.ceil((Date.now() - new Date(inst.due_date).getTime()) / 86400000)} dias)`, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    const daysLeft = Math.ceil((new Date(inst.due_date).getTime() - Date.now()) / 86400000);
    if (inst.due_date === today) return { text: '⚡ Vence HOJE', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { text: `⏳ Vence em ${new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')} (${daysLeft} dias)`, color: 'text-zinc-400 bg-[#111] border-[#262626]' };
  };

  // Determine which is the current pending installment (the one that should be paid next)
  const currentPendingIdx = installments.findIndex((i: any) => i.status !== 'paid');

  // PIX Switch: override pix_key if event has secondary key and threshold is reached
  const effectivePixKey = (() => {
    const batchKey = batch?.pix_key || null;
    const secondaryKey = (event as any)?.pix_key_secondary;
    const switchAt = (event as any)?.pix_switch_at;
    if (secondaryKey && switchAt && confirmedCount >= switchAt) {
      return secondaryKey;
    }
    return batchKey;
  })();

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="bg-[#0a0a0a] border-b border-[#1a1a1a] py-4">
        <div className="max-w-xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-white tracking-tighter italic">UAIROX</span>
            <span className="text-[10px] px-2 py-0.5 bg-[#EDAC02]/10 text-[#EDAC02] rounded font-bold border border-[#EDAC02]/20">PORTAL DE PAGAMENTO</span>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Event + Athlete Info */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6">
          <div className="flex items-start gap-4">
            {event.image_url && (
              <img src={event.image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black text-white uppercase tracking-tight leading-tight">{event.title}</h1>
              <p className="text-xs text-zinc-500 mt-1">
                {category?.name && <span className="text-[#EDAC02] font-bold">{category.name}</span>}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                <span>👤 {(registration as any).athlete_name}</span>
              </div>
            </div>
          </div>

          {/* Total + Progress */}
          <div className="mt-5 pt-4 border-t border-[#1a1a1a]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">💰 PIX Parcelado ({installments.length}x)</span>
              <span className="text-sm font-black text-[#EDAC02]">{formatCurrency(paidAmount)} / {formatCurrency(totalAmount)}</span>
            </div>
            <div className="w-full bg-[#1a1a1a] rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-green-500' : progressPercent >= 50 ? 'bg-[#EDAC02]' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5 text-right">{paidCount}/{installments.length} parcelas pagas</p>
          </div>
        </div>

        {/* Installments */}
        {installments.map((inst: any, idx: number) => {
          const status = getStatusBadge(inst);
          const isPaid = inst.status === 'paid';
          const isCurrentPending = idx === currentPendingIdx;
          const isLocked = !isPaid && idx > currentPendingIdx && currentPendingIdx >= 0;

          return (
            <div key={inst.id} className={`bg-[#0a0a0a] border rounded-2xl overflow-hidden ${isPaid ? 'border-green-500/20' : isCurrentPending ? 'border-[#EDAC02]/30' : 'border-[#1a1a1a]'}`}>
              {/* Installment Header */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black ${isPaid ? 'text-green-400' : 'text-[#EDAC02]'}`}>{inst.installment_number}ª</span>
                    <span className="text-xl font-black text-white">{formatCurrency(Number(inst.amount))}</span>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${status.color}`}>
                  {status.text}
                </div>

                {/* Receipt status */}
                {inst.receipt_url && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-green-400 font-bold">📎 Comprovante enviado</span>
                    <a href={inst.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#EDAC02] underline hover:text-white transition-colors">Ver</a>
                  </div>
                )}
              </div>

              {/* Action area for current pending */}
              {isCurrentPending && !isPaid && (
                <div className="border-t border-[#1a1a1a] p-5 bg-[#080808] space-y-4">
                  {/* PIX Key */}
                  {effectivePixKey && (
                    <div>
                      <p className="text-xs text-zinc-500 font-bold mb-1.5">CHAVE PIX:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-[#111] px-3 py-2.5 rounded-lg text-sm text-[#EDAC02] font-mono border border-[#262626] select-all">{effectivePixKey}</code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(effectivePixKey); toast.success('PIX copiado!'); }}
                          className="px-4 py-2.5 bg-[#EDAC02] text-black font-black rounded-lg text-sm hover:bg-[#d49b02] transition-colors"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload receipt */}
                  <label className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${inst.receipt_url ? 'border-green-500/30 bg-green-500/5' : 'border-[#262626] hover:border-[#EDAC02]/30'}`}>
                    {uploading === inst.installment_number ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-zinc-400">Enviando...</span>
                      </div>
                    ) : inst.receipt_url ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        <span className="text-sm font-bold">Comprovante enviado! Clique para substituir</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-2xl">📎</span>
                        <span className="text-sm text-zinc-400 font-bold">Anexar Comprovante da {inst.installment_number}ª Parcela</span>
                        <span className="text-[10px] text-zinc-600">Imagem ou PDF</span>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadReceipt(inst.id, inst.installment_number, file);
                      }}
                      disabled={uploading !== null}
                    />
                  </label>
                </div>
              )}

              {/* Locked state */}
              {isLocked && (
                <div className="border-t border-[#1a1a1a] p-4 bg-[#080808] text-center">
                  <p className="text-xs text-zinc-600 flex items-center justify-center gap-1.5">
                    🔒 Disponível após pagamento da {inst.installment_number - 1}ª parcela
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* All paid celebration */}
        {paidCount === installments.length && installments.length > 0 && (
          <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 text-center">
            <span className="text-4xl block mb-3">🎉</span>
            <h3 className="text-lg font-black text-green-400 mb-1">Todas as parcelas pagas!</h3>
            <p className="text-sm text-zinc-400">Sua inscrição está confirmada. Nos vemos no evento! 💪</p>
          </div>
        )}

        {/* WhatsApp link */}
        {event.whatsapp_group_link && (
          <a
            href={event.whatsapp_group_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#25D366] text-black font-black rounded-xl hover:bg-[#128C7E] hover:text-white transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            Grupo de Atletas
          </a>
        )}

        {/* Help text */}
        <p className="text-center text-[10px] text-zinc-600">
          Código da inscrição: <span className="text-zinc-400 font-mono">{registrationId?.slice(0, 8)}</span>
        </p>
      </div>
    </div>
  );
}
