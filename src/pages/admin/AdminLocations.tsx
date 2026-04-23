import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Search, MapPin, CheckCircle, XCircle, Loader2, Star, Edit, Save, Trash2, X, Plus } from 'lucide-react';

interface TrainingLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  logo_url: string | null;
  photos: string[];
  instagram: string | null;
  whatsapp: string | null;
  website: string | null;
  is_featured: boolean;
  status: string;
  created_at?: string;
}

export default function AdminLocations() {
  const [locations, setLocations] = useState<TrainingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [editingLocation, setEditingLocation] = useState<TrainingLocation | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    setLoading(true);
    const { data, error } = await supabase
      .from('training_locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch Locations Error:", error);
      toast.error('Erro ao buscar parceiros: ' + error.message);
    } else {
      console.log("Fetched locations from DB:", data);
      setLocations((data as any) || []);
    }
    setLoading(false);
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('training_locations')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(`Parceiro ${newStatus === 'approved' ? 'Aprovado' : 'Rejeitado'} com sucesso!`);
      fetchLocations();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cadastro?')) return;
    
    const { error } = await supabase
      .from('training_locations')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir parceiro');
    } else {
      toast.success('Excluído com sucesso');
      fetchLocations();
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLocation) return;

    const { error } = await supabase
      .from('training_locations')
      .update({
        name: editingLocation.name,
        address: editingLocation.address,
        city: editingLocation.city,
        state: editingLocation.state,
        whatsapp: editingLocation.whatsapp,
        instagram: editingLocation.instagram,
        website: editingLocation.website,
        is_featured: editingLocation.is_featured,
      } as any)
      .eq('id', editingLocation.id);

    if (error) {
      toast.error('Erro ao salvar edições');
    } else {
      toast.success('Alterações salvas com sucesso');
      setEditingLocation(null);
      fetchLocations();
    }
  };

  const filtered = locations.filter(loc => 
    loc.status === activeTab &&
    (loc.name.toLowerCase().includes(search.toLowerCase()) || loc.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic">Onde Treinar <span className="text-brand-500">Admin</span></h1>
          <p className="text-zinc-400 mt-1">Gerencie os Boxes e Academias parceiras</p>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#111] p-2 border border-dark-border rounded-xl">
        <div className="flex w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold uppercase transition-colors rounded-lg ${activeTab === 'pending' ? 'bg-brand-500 text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            Pendentes ({locations.filter(l => l.status === 'pending').length})
          </button>
          <button 
            onClick={() => setActiveTab('approved')}
            className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold uppercase transition-colors rounded-lg ${activeTab === 'approved' ? 'bg-brand-500 text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            Aprovados
          </button>
          <button 
            onClick={() => setActiveTab('rejected')}
            className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold uppercase transition-colors rounded-lg ${activeTab === 'rejected' ? 'bg-brand-500 text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            Rejeitados
          </button>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar parceiro..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-white text-sm focus:border-brand-500 outline-none"
          />
        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#111] border border-dark-border rounded-xl">
          <MapPin className="mx-auto mb-4 text-zinc-600" size={32} />
          <p className="text-zinc-400">Nenhum parceiro encontrado nesta aba.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(loc => (
            <motion.div 
              key={loc.id} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className={`bg-[#111] border p-5 flex flex-col md:flex-row gap-6 items-start md:items-center ${loc.is_featured ? 'border-brand-500/50' : 'border-dark-border'}`}
            >
              {/* Logo */}
              <div className="w-16 h-16 bg-dark-bg border border-dark-border flex items-center justify-center shrink-0">
                {loc.logo_url ? <img src={loc.logo_url} alt="Logo" className="w-full h-full object-contain p-1" /> : <MapPin className="text-zinc-600" />}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-black text-white uppercase italic">{loc.name}</h3>
                  {loc.is_featured && <Star size={16} className="text-brand-500 fill-brand-500" />}
                </div>
                <p className="text-sm text-zinc-400 flex items-center gap-1 mb-2"><MapPin size={14} /> {loc.city} - {loc.state}</p>
                <div className="flex gap-4 text-xs text-zinc-500">
                  {loc.whatsapp && <span>WhatsApp: {loc.whatsapp}</span>}
                  {loc.instagram && <span>Instagram: {loc.instagram}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                {activeTab === 'pending' && (
                  <>
                    <button onClick={() => handleUpdateStatus(loc.id, 'approved')} className="flex items-center gap-1 bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-2 text-xs font-bold uppercase hover:bg-green-500 hover:text-black transition-colors">
                      <CheckCircle size={16} /> Aprovar
                    </button>
                    <button onClick={() => handleUpdateStatus(loc.id, 'rejected')} className="flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-2 text-xs font-bold uppercase hover:bg-red-500 hover:text-black transition-colors">
                      <XCircle size={16} /> Rejeitar
                    </button>
                  </>
                )}
                
                {activeTab !== 'pending' && (
                  <button onClick={() => setEditingLocation(loc)} className="flex items-center gap-1 bg-zinc-800 text-white border border-dark-border px-3 py-2 text-xs font-bold uppercase hover:border-zinc-500 transition-colors">
                    <Edit size={16} /> Editar
                  </button>
                )}

                <button onClick={() => handleDelete(loc.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors border border-dark-border hover:border-red-500 bg-dark-bg">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-dark-bg border border-dark-border w-full max-w-2xl p-6 relative my-8">
            <button onClick={() => setEditingLocation(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={24} /></button>
            <h2 className="text-2xl font-black text-white uppercase italic mb-6">Editar Parceiro</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center gap-3 p-4 bg-[#111] border border-brand-500/30 rounded-lg">
                <input 
                  type="checkbox" 
                  checked={editingLocation.is_featured}
                  onChange={e => setEditingLocation({...editingLocation, is_featured: e.target.checked})}
                  className="w-5 h-5 accent-brand-500"
                  id="featured"
                />
                <label htmlFor="featured" className="text-white font-bold cursor-pointer flex items-center gap-2">
                  <Star className={editingLocation.is_featured ? "text-brand-500 fill-brand-500" : "text-zinc-500"} size={20} />
                  Destacar como UAIROX Experience
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome</label>
                <input type="text" value={editingLocation.name} onChange={e => setEditingLocation({...editingLocation, name: e.target.value})} className="w-full bg-[#111] border border-dark-border p-2.5 text-white focus:border-brand-500 outline-none" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Endereço</label>
                <input type="text" value={editingLocation.address} onChange={e => setEditingLocation({...editingLocation, address: e.target.value})} className="w-full bg-[#111] border border-dark-border p-2.5 text-white focus:border-brand-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cidade</label>
                <input type="text" value={editingLocation.city} onChange={e => setEditingLocation({...editingLocation, city: e.target.value})} className="w-full bg-[#111] border border-dark-border p-2.5 text-white focus:border-brand-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Estado</label>
                <input type="text" value={editingLocation.state} onChange={e => setEditingLocation({...editingLocation, state: e.target.value})} className="w-full bg-[#111] border border-dark-border p-2.5 text-white focus:border-brand-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">WhatsApp</label>
                <input type="text" value={editingLocation.whatsapp || ''} onChange={e => setEditingLocation({...editingLocation, whatsapp: e.target.value})} className="w-full bg-[#111] border border-dark-border p-2.5 text-white focus:border-brand-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Instagram</label>
                <input type="text" value={editingLocation.instagram || ''} onChange={e => setEditingLocation({...editingLocation, instagram: e.target.value})} className="w-full bg-[#111] border border-dark-border p-2.5 text-white focus:border-brand-500 outline-none" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Website</label>
                <input type="text" value={editingLocation.website || ''} onChange={e => setEditingLocation({...editingLocation, website: e.target.value})} className="w-full bg-[#111] border border-dark-border p-2.5 text-white focus:border-brand-500 outline-none" />
              </div>
            </div>

            <div className="flex justify-between items-center mt-8 pt-6 border-t border-dark-border">
              <button 
                onClick={() => handleUpdateStatus(editingLocation.id, editingLocation.status === 'approved' ? 'rejected' : 'approved')}
                className={`text-sm font-bold uppercase underline ${editingLocation.status === 'approved' ? 'text-red-500' : 'text-green-500'}`}
              >
                {editingLocation.status === 'approved' ? 'Mover para Rejeitados' : 'Mover para Aprovados'}
              </button>

              <div className="flex gap-3">
                <button onClick={() => setEditingLocation(null)} className="px-6 py-2 text-sm font-bold text-white uppercase hover:bg-zinc-800">Cancelar</button>
                <button onClick={handleSaveEdit} className="bg-brand-500 text-black px-6 py-2 text-sm font-bold uppercase flex items-center gap-2 hover:bg-brand-400">
                  <Save size={16} /> Salvar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
