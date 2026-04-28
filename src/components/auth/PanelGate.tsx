import { useState, type ReactNode } from 'react';
import { usePanelAuth, type PanelType } from '@/hooks/usePanelAuth';
import { Loader2, Lock, LogOut } from 'lucide-react';

interface PanelGateProps {
  panel: PanelType;
  title: string;
  subtitle: string;
  accentColor: string;
  children: ReactNode;
}

export default function PanelGate({ panel, title, subtitle, accentColor, children }: PanelGateProps) {
  const { isAuthenticated, isLoading, error, authenticate, logout } = usePanelAuth(panel);
  const [password, setPassword] = useState('');
  const [shake, setShake] = useState(false);

  if (isAuthenticated) {
    return (
      <div className="relative">
        {/* Floating logout button */}
        <button
          onClick={logout}
          title="Sair do painel"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
          style={{
            background: `${accentColor}15`,
            border: `1px solid ${accentColor}30`,
            color: accentColor,
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
        {children}
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    const success = await authenticate(password);
    if (!success) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      {/* Background effects */}
      <div
        className="absolute top-[-10%] left-[-10%] w-96 h-96 blur-[120px] rounded-full pointer-events-none opacity-30"
        style={{ background: accentColor }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-96 h-96 blur-[150px] rounded-full pointer-events-none opacity-15"
        style={{ background: accentColor }}
      />

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#dbdbdb08_1px,transparent_1px),linear-gradient(to_bottom,#dbdbdb08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div
        className={`w-full max-w-sm relative z-10 transition-transform ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
      >
        {/* Card */}
        <div className="p-8 rounded-2xl bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
          {/* Icon */}
          <div
            className="w-16 h-16 flex items-center justify-center rounded-xl mx-auto mb-5"
            style={{
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}30`,
            }}
          >
            <Lock className="w-7 h-7" style={{ color: accentColor }} />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black text-white text-center uppercase tracking-tight mb-1">
            {title}
          </h1>
          <p className="text-zinc-500 text-sm text-center mb-8">{subtitle}</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                autoFocus
                autoComplete="off"
                className="w-full h-14 bg-white/5 rounded-xl border px-5 text-white text-lg text-center tracking-[0.3em] font-bold focus:outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                style={{
                  borderColor: error ? '#ef4444' : 'rgba(255,255,255,0.1)',
                  ...(password ? {
                    borderColor: `${accentColor}50`,
                    boxShadow: `0 0 0 1px ${accentColor}30`,
                  } : {}),
                }}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center font-medium animate-[fadeIn_0.3s_ease-in]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full h-14 font-black text-sm uppercase tracking-wider rounded-xl transition-all flex items-center justify-center disabled:opacity-40 active:scale-[0.98]"
              style={{
                background: accentColor,
                color: '#000',
              }}
            >
              {isLoading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Branding */}
          <p className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
            UAIROX • {title}
          </p>
        </div>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
