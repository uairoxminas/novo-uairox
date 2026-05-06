import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, CheckCircle, Loader2 } from 'lucide-react';

interface WaitlistModalProps {
  eventId: string;
  onClose: () => void;
}

export default function WaitlistModal({ eventId, onClose }: WaitlistModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from('event_waitlist' as any)
        .insert([{ event_id: eventId, name, phone }]);

      if (submitError) throw submitError;

      setSuccess(true);
    } catch (err: any) {
      console.error('Error submitting to waitlist:', err);
      setError(err.message || 'Ocorreu um erro. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-dark-card border border-dark-border w-full max-w-md relative overflow-hidden shadow-2xl">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[50px] pointer-events-none rounded-full" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="p-8">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle size={64} className="text-brand-500 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">
                Entrou na Lista!
              </h3>
              <p className="text-zinc-400 font-inter mb-8">
                Registramos seu interesse. Assim que surgir uma vaga, entraremos em contato com você pelo telefone informado.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-brand-500 text-black py-4 font-black uppercase tracking-widest skew-x-[-10deg] hover:bg-brand-400 transition-colors"
              >
                <span className="inline-block skew-x-[10deg]">Fechar</span>
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <span className="inline-block px-3 py-1 bg-brand-500/10 text-brand-500 font-black uppercase tracking-widest text-[10px] mb-4">
                  Lista de Espera
                </span>
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">
                  Vagas Esgotadas
                </h3>
                <p className="text-zinc-400 font-inter text-sm">
                  Deixe seu nome e telefone. Se houver alguma desistência ou abertura de lote extra, avisaremos você!
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 mb-6 text-sm font-bold uppercase tracking-widest text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                    Seu Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                    placeholder="Ex: João Silva"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                    Seu WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !name || !phone}
                  className="w-full mt-4 bg-brand-500 text-black py-4 font-black uppercase tracking-widest skew-x-[-10deg] hover:bg-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="inline-block skew-x-[10deg] flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Aguarde...
                      </>
                    ) : (
                      'Entrar na Lista de Espera'
                    )}
                  </span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
