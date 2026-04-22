import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Crown, MessageCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type SquadRole = 'coach' | 'athlete' | 'influencer';
type SquadTier = 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'elite';

interface Application {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  instagram_handle: string;
  role: SquadRole;
  location: string;
  why_join: string;
  status: string;
}

interface SquadMember {
  id: string;
  full_name: string;
  role: SquadRole;
  tier: SquadTier;
  location: string;
  bio: string | null;
  instagram_handle: string | null;
  avatar_url: string | null;
  is_active: boolean;
  coupon_code: string | null;
  coupon_usage_count: number;
}

export default function AdminSquad() {
  const [activeTab, setActiveTab] = useState<'pendentes' | 'membros'>('pendentes');
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, membersRes] = await Promise.all([
        (supabase.from('squad_applications' as any) as any).select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        (supabase.from('squad_members' as any) as any).select('*').order('created_at', { ascending: false })
      ]);

      if (appsRes.data) setApplications(appsRes.data);
      if (membersRes.data) setMembers(membersRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados. As tabelas já foram criadas?");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app: Application) => {
    const couponPrefix = app.role === 'coach' ? 'COACH' : 'SQUAD';
    const cleanName = app.full_name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
    const generatedCoupon = `${couponPrefix}${cleanName}`;

    try {
      // 1. Mark as approved
      await (supabase.from('squad_applications' as any) as any)
        .update({ status: 'approved' })
        .eq('id', app.id);

      // 2. Insert into members
      await (supabase.from('squad_members' as any) as any)
        .insert([{
          full_name: app.full_name,
          role: app.role,
          tier: 'iniciante',
          location: app.location,
          instagram_handle: app.instagram_handle,
          bio: app.why_join.substring(0, 100),
          coupon_code: generatedCoupon,
          coupon_usage_count: 0,
          is_active: true
        }]);

      // 3. (Optional but recommended) Create the actual discount coupon if the table exists
      // await supabase.from('discount_coupons').insert([{ code: generatedCoupon, value: 10, discount_type: 'percentage' }]);

      toast.success("Membro aprovado com sucesso!");
      fetchData();

      // Send WhatsApp
      const msg = `Olá ${app.full_name}! 🎉 Parabéns, sua inscrição no SQUAD UAIROX foi APROVADA!\n\nSeu cupom oficial de desconto para divulgar é: *${generatedCoupon}*\n\nBora movimentar a comunidade! 🚀`;
      const phoneClean = app.phone.replace(/\D/g, '');
      window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aprovar membro.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await (supabase.from('squad_applications' as any) as any).update({ status: 'rejected' }).eq('id', id);
      toast.success("Inscrição recusada.");
      fetchData();
    } catch (err) {
      toast.error("Erro ao recusar.");
    }
  };

  const calculateTiers = async () => {
    toast.info("Em breve: Cálculo automático de Tiers baseado no uso real de cupons.");
    // Logic to query registrations -> count usage of coupon -> update tier
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic flex items-center gap-2">
            <Crown className="text-brand-500" /> SQUAD Admin
          </h1>
          <p className="text-zinc-400">Gerencie solicitações e embaixadores oficiais.</p>
        </div>
        
        <div className="flex bg-[#111] p-1 rounded-lg border border-dark-border">
          <button
            onClick={() => setActiveTab('pendentes')}
            className={`px-6 py-2 text-sm font-bold uppercase tracking-widest rounded-md transition-colors ${
              activeTab === 'pendentes' ? 'bg-brand-500 text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pendentes ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('membros')}
            className={`px-6 py-2 text-sm font-bold uppercase tracking-widest rounded-md transition-colors ${
              activeTab === 'membros' ? 'bg-brand-500 text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Membros ({members.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : activeTab === 'pendentes' ? (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="text-center py-20 bg-dark-card border border-dark-border rounded-xl">
              <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg">Nenhuma solicitação pendente</h3>
            </div>
          ) : (
            applications.map(app => (
              <div key={app.id} className="bg-dark-card border border-dark-border p-6 rounded-xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white uppercase">{app.full_name}</h3>
                    <span className="px-2 py-0.5 bg-[#111] text-brand-500 text-xs font-bold rounded uppercase border border-dark-border">
                      {app.role}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-zinc-400">
                    <p>📱 {app.phone}</p>
                    <p>📷 {app.instagram_handle}</p>
                    <p>📍 {app.location}</p>
                  </div>
                  <div className="mt-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#222]">
                    <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Por que quer entrar?</p>
                    <p className="text-zinc-300 italic">"{app.why_join}"</p>
                  </div>
                </div>
                
                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                  <button onClick={() => handleApprove(app)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-400 text-black font-black uppercase text-sm rounded transition-colors">
                    <Check size={16} /> Aprovar
                  </button>
                  <button onClick={() => handleReject(app.id)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black uppercase text-sm rounded border border-red-500/20 transition-colors">
                    <X size={16} /> Recusar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={calculateTiers} className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-brand-500/30 text-brand-500 hover:bg-brand-500/10 font-bold text-xs uppercase rounded transition-colors">
              <RefreshCw size={14} /> Atualizar Níveis (Auto)
            </button>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0a0a0a] border-b border-dark-border text-xs uppercase font-bold text-zinc-500">
                    <th className="p-4">Membro</th>
                    <th className="p-4">Nível (Tier)</th>
                    <th className="p-4">Cupom</th>
                    <th className="p-4">Usos</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="border-b border-dark-border/50 hover:bg-white/5">
                      <td className="p-4">
                        <p className="font-bold text-white uppercase">{member.full_name}</p>
                        <p className="text-xs text-zinc-500">{member.instagram_handle}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${
                          member.tier === 'elite' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          member.tier === 'ouro' ? 'bg-brand-500/10 text-brand-500 border-brand-500/20' :
                          member.tier === 'prata' ? 'bg-gray-400/10 text-gray-400 border-gray-400/20' :
                          'bg-orange-800/10 text-orange-600 border-orange-800/20'
                        }`}>
                          {member.tier}
                        </span>
                      </td>
                      <td className="p-4">
                        <code className="text-brand-500 bg-brand-500/10 px-2 py-1 rounded font-mono text-sm border border-brand-500/20">
                          {member.coupon_code || 'S/ CUPOM'}
                        </code>
                      </td>
                      <td className="p-4 font-black text-white text-lg">
                        {member.coupon_usage_count || 0}
                      </td>
                      <td className="p-4">
                        {member.is_active ? (
                          <span className="text-green-500 text-xs font-bold uppercase">Ativo</span>
                        ) : (
                          <span className="text-red-500 text-xs font-bold uppercase">Inativo</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button className="p-2 text-zinc-500 hover:text-brand-500 transition-colors" title="Contato via WhatsApp">
                          <MessageCircle size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">Nenhum membro aprovado ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
