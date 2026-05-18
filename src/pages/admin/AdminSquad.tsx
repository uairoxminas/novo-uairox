import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Crown, MessageCircle, AlertCircle, RefreshCw, Trash2, Pencil, Upload } from 'lucide-react';
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
  avatar_url?: string;
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
  portal_token: string | null;
}

// ── Promo Arts Tab ────────────────────────────────────────────
interface PromoArt { id: string; title: string; description: string | null; image_url: string; created_at: string; }

function ArtsTab() {
  const db = supabase as any;
  const [arts, setArts] = useState<PromoArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => { fetchArts(); }, []);

  const fetchArts = async () => {
    setLoading(true);
    const { data } = await db.from('squad_promo_arts').select('*').order('created_at', { ascending: false });
    setArts(data ?? []);
    setLoading(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) { toast.error('Título e imagem são obrigatórios'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `arts/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('squad-arts').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('squad-arts').getPublicUrl(path);
      await db.from('squad_promo_arts').insert({ title: title.trim(), description: description.trim() || null, image_url: publicUrl });
      toast.success('Arte adicionada!');
      setTitle(''); setDescription(''); setFile(null); setPreview(null);
      fetchArts();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (art: PromoArt) => {
    if (!window.confirm(`Excluir "${art.title}"?`)) return;
    await db.from('squad_promo_arts').delete().eq('id', art.id);
    toast.success('Arte removida');
    fetchArts();
  };

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5">
        <p className="text-sm font-black text-white uppercase tracking-wider mb-4">🎨 Adicionar Nova Arte</p>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Título *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Story — Evento Janeiro" className="w-full bg-[#111] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição (opcional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Use nos Stories 9:16" className="w-full bg-[#111] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Imagem *</label>
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-dark-border group-hover:border-brand-500 bg-[#111] flex items-center justify-center overflow-hidden transition-colors flex-shrink-0">
                {preview
                  ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  : <Upload size={24} className="text-zinc-600 group-hover:text-brand-500 transition-colors" />
                }
              </div>
              <div className="text-xs text-zinc-500 leading-relaxed">
                <p className="text-zinc-300 font-bold mb-0.5">Clique para selecionar</p>
                <p>PNG, JPG, WebP recomendados</p>
                <p>Stories: 1080×1920 · Feed: 1080×1080</p>
              </div>
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
          </div>
          <button type="submit" disabled={uploading} className="px-6 py-2.5 bg-brand-500 text-black text-sm font-black uppercase rounded-lg hover:bg-brand-400 disabled:opacity-50 transition-colors">
            {uploading ? 'Enviando...' : '+ Adicionar Arte'}
          </button>
        </form>
      </div>

      {/* Arts grid */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-brand-500 animate-spin" /></div>
      ) : arts.length === 0 ? (
        <div className="text-center py-16 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
          <p className="text-4xl mb-3">🎨</p>
          <p className="text-zinc-500 text-sm">Nenhuma arte publicada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {arts.map(art => (
            <div key={art.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden group">
              <div className="aspect-square relative overflow-hidden bg-[#111]">
                <img src={art.image_url} alt={art.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a href={art.image_url} target="_blank" rel="noreferrer" download className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-white text-xs font-bold">⬇ Ver</a>
                  <button onClick={() => handleDelete(art)} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-white truncate">{art.title}</p>
                {art.description && <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{art.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSquad() {
  const [activeTab, setActiveTab] = useState<'pendentes' | 'membros' | 'artes'>('pendentes');
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<SquadMember | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
          is_active: true,
          avatar_url: app.avatar_url || null
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

  const handleDeleteMember = async (id: string) => {
    if (window.confirm("Tem certeza que deseja deletar este membro do squad? Esta ação não pode ser desfeita.")) {
      try {
        const { error } = await (supabase.from('squad_members' as any) as any).delete().eq('id', id);
        if (error) throw error;
        toast.success("Membro deletado com sucesso.");
        fetchData();
      } catch (err) {
        toast.error("Erro ao deletar membro.");
      }
    }
  };

  const handleSaveMember = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    
    try {
      let finalAvatarUrl = editingMember.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `squad_avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('squad-avatars')
          .upload(filePath, avatarFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("Erro ao fazer upload da imagem");
          return;
        } else {
          const { data } = supabase.storage.from('squad-avatars').getPublicUrl(filePath);
          finalAvatarUrl = data.publicUrl;
        }
      }

      const { error } = await (supabase.from('squad_members' as any) as any)
        .update({
          full_name: editingMember.full_name,
          role: editingMember.role,
          tier: editingMember.tier,
          location: editingMember.location,
          bio: editingMember.bio,
          instagram_handle: editingMember.instagram_handle,
          avatar_url: finalAvatarUrl,
          coupon_code: editingMember.coupon_code,
          coupon_usage_count: editingMember.coupon_usage_count,
          is_active: editingMember.is_active
        })
        .eq('id', editingMember.id);
        
      if (error) throw error;
      toast.success("Membro atualizado com sucesso!");
      setEditingMember(null);
      setAvatarFile(null);
      setAvatarPreview(null);
      fetchData();
    } catch (err) {
      toast.error("Erro ao atualizar membro.");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
          <button
            onClick={() => setActiveTab('artes')}
            className={`px-6 py-2 text-sm font-bold uppercase tracking-widest rounded-md transition-colors ${
              activeTab === 'artes' ? 'bg-brand-500 text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🎨 Artes
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
      ) : activeTab === 'membros' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <a
                href="/ranking-squad"
                target="_blank"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] hover:bg-[#EDAC02]/20 font-bold text-xs uppercase rounded transition-colors"
              >
                🏆 Ver Ranking
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/ranking-squad`); toast.success('Link do ranking copiado!'); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#111] border border-[#EDAC02]/20 text-zinc-400 hover:text-[#EDAC02] font-bold text-xs uppercase rounded transition-colors"
              >
                📋 Copiar Link Ranking
              </button>
            </div>
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
                        <div className="flex justify-end gap-1">
                          {(member.coupon_code || member.portal_token) && (
                            <button
                              onClick={() => {
                                const slug = member.coupon_code || member.portal_token;
                                navigator.clipboard.writeText(`${window.location.origin}/squad/${slug}`);
                                toast.success('Link do portal copiado!');
                              }}
                              className="p-2 text-zinc-500 hover:text-brand-500 transition-colors text-xs font-bold"
                              title="Copiar link do portal pessoal"
                            >
                              🔗
                            </button>
                          )}
                          <button className="p-2 text-zinc-500 hover:text-brand-500 transition-colors" title="Contato via WhatsApp">
                            <MessageCircle size={18} />
                          </button>
                          <button onClick={() => {
                            setEditingMember(member);
                            setAvatarPreview(member.avatar_url);
                            setAvatarFile(null);
                          }} className="p-2 text-zinc-500 hover:text-brand-500 transition-colors" title="Editar">
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDeleteMember(member.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors" title="Deletar">
                            <Trash2 size={18} />
                          </button>
                        </div>
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
      ) : activeTab === 'artes' ? (
        <ArtsTab />
      ) : null}

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-dark-border w-full max-w-2xl p-6 rounded-xl relative my-8">
            <button onClick={() => {
              setEditingMember(null);
              setAvatarFile(null);
              setAvatarPreview(null);
            }} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black text-white uppercase italic mb-6">Editar Membro</h2>
            
            <form onSubmit={handleSaveMember} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome Completo</label>
                  <input type="text" value={editingMember.full_name} onChange={e => setEditingMember({...editingMember, full_name: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Instagram</label>
                  <input type="text" value={editingMember.instagram_handle || ''} onChange={e => setEditingMember({...editingMember, instagram_handle: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Role</label>
                  <select value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value as SquadRole})} className="w-full bg-[#111] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none">
                    <option value="coach">Coach</option>
                    <option value="athlete">Atleta</option>
                    <option value="influencer">Influencer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tier</label>
                  <select value={editingMember.tier} onChange={e => setEditingMember({...editingMember, tier: e.target.value as SquadTier})} className="w-full bg-[#111] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none">
                    <option value="iniciante">Iniciante</option>
                    <option value="bronze">Bronze</option>
                    <option value="prata">Prata</option>
                    <option value="ouro">Ouro</option>
                    <option value="elite">Elite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Localização</label>
                  <input type="text" value={editingMember.location || ''} onChange={e => setEditingMember({...editingMember, location: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cupom</label>
                  <input type="text" value={editingMember.coupon_code || ''} onChange={e => setEditingMember({...editingMember, coupon_code: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Usos do Cupom</label>
                  <input type="number" value={editingMember.coupon_usage_count} onChange={e => setEditingMember({...editingMember, coupon_usage_count: parseInt(e.target.value) || 0})} className="w-full bg-[#111] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Foto / Avatar</label>
                  <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer w-12 h-12 rounded-full overflow-hidden border border-dark-border bg-[#111] flex items-center justify-center shrink-0">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="text-zinc-500 group-hover:text-brand-500 transition-colors" size={16} />
                      )}
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                    <div className="text-xs text-zinc-500 leading-tight">
                      Clique na imagem para enviar uma nova foto do seu dispositivo.
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Bio / Por que quer entrar?</label>
                  <textarea value={editingMember.bio || ''} onChange={e => setEditingMember({...editingMember, bio: e.target.value})} className="w-full bg-[#111] border border-dark-border p-3 text-white text-sm focus:border-brand-500 outline-none resize-none" rows={3} />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={editingMember.is_active} onChange={e => setEditingMember({...editingMember, is_active: e.target.checked})} className="w-4 h-4 accent-brand-500" />
                  <label htmlFor="isActive" className="text-sm font-bold text-white uppercase cursor-pointer">Membro Ativo (Mostra no site)</label>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => {
                  setEditingMember(null);
                  setAvatarFile(null);
                  setAvatarPreview(null);
                }} className="px-6 py-3 bg-[#111] text-zinc-400 font-black uppercase text-sm hover:text-white transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-brand-500 text-black font-black uppercase text-sm hover:bg-brand-400 transition-colors">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
