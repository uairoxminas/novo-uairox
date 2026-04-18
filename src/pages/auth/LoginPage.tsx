import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@uairox.com.br');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { signIn, signUp, user, isAdmin, isJudge } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Se o usuário logou, direciona direto pra casa corretar
    if (user) {
      const from = (location.state as any)?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
        return;
      }
      
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isJudge) {
        navigate('/judge', { replace: true });
      } else {
        navigate('/athlete', { replace: true });
      }
    }
  }, [user, isAdmin, isJudge, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha os campos', { description: 'Informe e-mail e senha.' });
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        const { error } = await signUp(email, password, "Admin UAIROX");
        if (error) {
          toast.error('Erro no cadastro', { description: error.message });
        } else {
          toast.success('Cadastro concluído!', { description: 'Você já pode logar.' });
          // Force login attempt right after registration if email confirmation is disabled
          await signIn(email, password);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error('Erro de autenticação', { description: 'E-mail ou senha incorretos.' });
        }
      }
    } catch (err) {
      toast.error('Erro inesperado', { description: 'Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      {/* Background styling elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-uairox-green/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Decoração Adicional do Fundo */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#dbdbdb12_1px,transparent_1px),linear-gradient(to_bottom,#dbdbdb12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-20" />
      
      <div className="w-full max-w-md p-8 rounded-2xl bg-uairox-space-card/80 backdrop-blur-xl border border-white/10 text-center relative z-10 shadow-2xl">
        <div className="w-16 h-16 bg-uairox-green/10 flex items-center justify-center rounded-xl mx-auto mb-4 border border-uairox-green/20">
            <span className="text-3xl font-black text-uairox-green">U</span>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-white tracking-tight">Login Seguro</h1>
        <p className="text-zinc-400 mb-8 max-w-[280px] mx-auto leading-relaxed">
          Acesse sua conta na <span className="text-uairox-green font-semibold">UAIROX</span> para realizar ações
        </p>
        
        <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
                <input 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Seu E-mail"
                  className="w-full h-12 bg-white/5 rounded-xl border border-white/10 px-4 text-white focus:outline-none focus:border-uairox-green focus:ring-1 focus:ring-uairox-green transition-all"
                />
            </div>
            <div className="space-y-1">
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua Senha"
                  className="w-full h-12 bg-white/5 rounded-xl border border-white/10 px-4 text-white focus:outline-none focus:border-uairox-green focus:ring-1 focus:ring-uairox-green transition-all"
                />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 mt-4 bg-uairox-green hover:bg-emerald-400 text-black font-bold rounded-xl transition-all flex items-center justify-center disabled:opacity-50 active:scale-[0.98] mt-8"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5 text-black" /> : (isRegistering ? 'Criar Conta' : 'Entrar na Plataforma')}
            </button>
        </form>
        
        <div className="mt-8 text-sm text-zinc-500">
            {isRegistering ? 'Já possui conta? ' : 'Não sabe a senha ou não tem conta? '}
            <button 
              onClick={() => setIsRegistering(!isRegistering)} 
              className="text-uairox-green hover:underline">
              {isRegistering ? 'Voltar para o Login' : 'Criar Nova Senha / Cadastrar'}
            </button>
        </div>
      </div>
    </div>
  );
}
