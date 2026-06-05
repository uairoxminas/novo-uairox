import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ComprovanteUploadPage() {
  const { registrationId } = useParams();
  const [registration, setRegistration] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!registrationId) return;
    const fetch = async () => {
      const { data: reg } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationId)
        .single();
      if (!reg) { setLoading(false); return; }
      setRegistration(reg);
      if ((reg as any).pix_receipt_url) setDone(true);

      const [evRes, catRes] = await Promise.all([
        supabase.from('events').select('title,image_url').eq('id', reg.event_id).single(),
        supabase.from('categories').select('name').eq('id', reg.category_id).single(),
      ]);
      setEvent(evRes.data);
      setCategory(catRes.data);
      setLoading(false);
    };
    fetch();
  }, [registrationId]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `comprovante-${registrationId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('event-assets').upload(fileName, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('event-assets').getPublicUrl(fileName);
      await supabase.from('registrations').update({ pix_receipt_url: urlData.publicUrl } as any).eq('id', registrationId!);
      setDone(true);
      toast.success('Comprovante enviado! Aguarde a confirmação.');
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + err.message);
    } finally {
      setUploading(false);
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

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#0a0a0a] border-b border-[#1a1a1a] py-4">
        <div className="max-w-xl mx-auto px-4 flex items-center gap-3">
          <span className="text-xl font-black text-white tracking-tighter italic">UAIROX</span>
          <span className="text-[10px] px-2 py-0.5 bg-[#EDAC02]/10 text-[#EDAC02] rounded font-bold border border-[#EDAC02]/20">COMPROVANTE PIX</span>
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
              {category?.name && (
                <p className="text-xs text-[#EDAC02] font-bold mt-1">{category.name}</p>
              )}
              <p className="text-xs text-zinc-400 mt-2">👤 {registration.athlete_name}</p>
            </div>
          </div>
        </div>

        {/* Upload area */}
        {done ? (
          <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-8 text-center">
            <span className="text-5xl block mb-4">✅</span>
            <h2 className="text-xl font-black text-green-400 mb-2">Comprovante recebido!</h2>
            <p className="text-sm text-zinc-400">Nossa equipe vai analisar e confirmar sua inscrição em breve.</p>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-black text-white">Enviar Comprovante PIX</h2>
            <p className="text-sm text-zinc-400">
              Faça o pagamento via PIX e anexe o comprovante abaixo. Sua inscrição será confirmada após a validação.
            </p>

            <label className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? 'opacity-60 cursor-not-allowed' : 'border-[#262626] hover:border-[#EDAC02]/40'}`}>
              {uploading ? (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-zinc-400 font-bold">Enviando...</span>
                </div>
              ) : (
                <>
                  <span className="text-4xl">📎</span>
                  <span className="text-sm text-zinc-300 font-bold">Toque para anexar o comprovante</span>
                  <span className="text-xs text-zinc-600">Imagem (JPG, PNG) ou PDF</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </label>
          </div>
        )}

        <p className="text-center text-[10px] text-zinc-600">
          Código: <span className="text-zinc-400 font-mono">{registrationId?.slice(0, 8)}</span>
        </p>
      </div>
    </div>
  );
}
