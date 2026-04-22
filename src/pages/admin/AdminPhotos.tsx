import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Camera, Image, X, Loader2, ChevronLeft, CheckCircle, Clock, Package } from 'lucide-react';
import {
  useAdminGalleries,
  useAdminGalleryPhotos,
  useAdminPurchases,
  useCreateGallery,
  useUpdateGallery,
  useDeleteGallery,
  useBulkAddPhotos,
  useDeletePhoto,
  useUpdatePurchaseStatus,
  extractDriveFileId,
  getDriveThumbnailUrl,
  type PhotoGallery,
  type GalleryPhoto,
} from '@/hooks/usePhotoGallery';
import { useEvents } from '@/hooks/useEvents';

// ============ GALLERY FORM ============
function GalleryForm({ gallery, onClose }: { gallery?: PhotoGallery | null; onClose: () => void }) {
  const createGallery = useCreateGallery();
  const updateGallery = useUpdateGallery();
  const { data: events } = useEvents();
  const isEdit = !!gallery;

  const [title, setTitle] = useState(gallery?.title || '');
  const [description, setDescription] = useState(gallery?.description || '');
  const [eventId, setEventId] = useState(gallery?.event_id || '');
  const [coverUrl, setCoverUrl] = useState(gallery?.cover_image_url || '');
  const [priceSingle, setPriceSingle] = useState(gallery?.price_single?.toString() || '29.90');
  const [pricePack5, setPricePack5] = useState(gallery?.price_pack_5?.toString() || '99.90');
  const [priceAll, setPriceAll] = useState(gallery?.price_all?.toString() || '149.90');
  const [pixKey, setPixKey] = useState(gallery?.pix_key || '');
  const [paymentLink, setPaymentLink] = useState(gallery?.payment_link || '');
  const [isActive, setIsActive] = useState(gallery?.is_active ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload: any = {
      title: title.trim(),
      description: description.trim() || null,
      event_id: eventId || null,
      cover_image_url: coverUrl.trim() ? extractDriveFileId(coverUrl.trim()) : null,
      price_single: parseFloat(priceSingle) || 29.90,
      price_pack_5: parseFloat(pricePack5) || 99.90,
      price_all: parseFloat(priceAll) || 149.90,
      pix_key: pixKey.trim() || null,
      payment_link: paymentLink.trim() || null,
      is_active: isActive,
    };
    try {
      if (isEdit) {
        await updateGallery.mutateAsync({ id: gallery!.id, ...payload });
      } else {
        await createGallery.mutateAsync(payload);
      }
      onClose();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 pt-8">
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl w-full max-w-2xl relative">
        <div className="flex items-center justify-between p-6 border-b border-[#262626]">
          <h2 className="text-xl font-black text-white">{isEdit ? '✏️ Editar Galeria' : '📸 Nova Galeria'}</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Título *</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none" placeholder="UAIROX Betim 2026" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Evento Vinculado</label>
              <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none">
                <option value="">Nenhum</option>
                {events?.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Link Google Drive da Capa</label>
            <input type="text" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none" placeholder="https://drive.google.com/file/d/.../view" />
          </div>

          <div className="border-t border-[#262626] pt-5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">💰 Preços</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">1 Foto (R$)</label>
                <input type="number" step="0.01" value={priceSingle} onChange={(e) => setPriceSingle(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">5 Fotos (R$)</label>
                <input type="number" step="0.01" value={pricePack5} onChange={(e) => setPricePack5(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Todas (R$)</label>
                <input type="number" step="0.01" value={priceAll} onChange={(e) => setPriceAll(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none" />
              </div>
            </div>
          </div>

          <div className="border-t border-[#262626] pt-5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">💳 Pagamento</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Chave PIX</label>
                <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Link de Pagamento</label>
                <input type="url" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none" placeholder="https://..." />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer pt-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="sr-only peer" />
            <div className="w-10 h-5 bg-[#262626] rounded-full peer-checked:bg-[#EDAC02] transition-colors relative">
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm text-zinc-400 font-bold">Galeria Ativa</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
            <button type="button" onClick={onClose} className="px-6 py-3 text-zinc-400 font-bold text-sm hover:text-white">Cancelar</button>
            <button type="submit" disabled={createGallery.isPending || updateGallery.isPending} className="px-8 py-3 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-lg hover:bg-[#ffc832] disabled:opacity-50">
              {isEdit ? 'Salvar' : 'Criar Galeria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ PHOTO BULK ADD ============
function BulkAddPhotos({ galleryId, onClose }: { galleryId: string; onClose: () => void }) {
  const bulkAdd = useBulkAddPhotos();
  const [rawText, setRawText] = useState('');
  const [defaultBib, setDefaultBib] = useState('');
  const [photographer, setPhotographer] = useState('');

  const handleAdd = async () => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const photos = lines.map((line) => {
      // Support format: URL | BIB or just URL
      const parts = line.split('|').map(p => p.trim());
      const url = parts[0];
      const bib = parts[1] || defaultBib || undefined;
      return {
        gallery_id: galleryId,
        drive_file_id: extractDriveFileId(url),
        bib_number: bib || undefined,
        photographer: photographer.trim() || undefined,
      };
    });

    await bulkAdd.mutateAsync(photos as any);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 pt-8">
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl w-full max-w-2xl relative">
        <div className="flex items-center justify-between p-6 border-b border-[#262626]">
          <h2 className="text-xl font-black text-white">📸 Adicionar Fotos em Massa</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-[#050505] border border-[#262626] rounded-lg p-4">
            <p className="text-xs text-zinc-400 mb-2 font-bold">Cole os links do Google Drive, um por linha.</p>
            <p className="text-xs text-zinc-600 mb-1">Formato: <code className="text-brand-400">link_do_drive | numero_bib</code></p>
            <p className="text-xs text-zinc-600">Ou apenas o link (usará o BIB padrão abaixo)</p>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm font-mono focus:border-[#EDAC02] outline-none resize-none"
            placeholder={`https://drive.google.com/file/d/abc123/view | 42\nhttps://drive.google.com/file/d/def456/view | 42\nhttps://drive.google.com/file/d/ghi789/view | 15`}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">BIB Padrão (opcional)</label>
              <input type="text" value={defaultBib} onChange={(e) => setDefaultBib(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none" placeholder="42" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Fotógrafo</label>
              <input type="text" value={photographer} onChange={(e) => setPhotographer(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none" placeholder="Nome do fotógrafo" />
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-[#262626]">
            <p className="text-xs text-zinc-500">{rawText.split('\n').filter(l => l.trim()).length} link(s) detectados</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-6 py-3 text-zinc-400 font-bold text-sm hover:text-white">Cancelar</button>
              <button onClick={handleAdd} disabled={bulkAdd.isPending || !rawText.trim()} className="px-8 py-3 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-lg hover:bg-[#ffc832] disabled:opacity-50">
                {bulkAdd.isPending ? 'Adicionando...' : 'Adicionar Fotos'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ GALLERY DETAIL VIEW ============
function GalleryDetail({ gallery, onBack }: { gallery: PhotoGallery; onBack: () => void }) {
  const { data: photos, isLoading } = useAdminGalleryPhotos(gallery.id);
  const { data: purchases } = useAdminPurchases(gallery.id);
  const deletePhoto = useDeletePhoto();
  const updateStatus = useUpdatePurchaseStatus();
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [tab, setTab] = useState<'photos' | 'purchases'>('photos');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-zinc-500 hover:text-white"><ChevronLeft size={20} /></button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-white">{gallery.title}</h2>
          <p className="text-zinc-500 text-sm">{photos?.length || 0} fotos • {purchases?.length || 0} pedidos</p>
        </div>
        <button onClick={() => setShowBulkAdd(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-lg hover:bg-[#ffc832]">
          <Plus size={14} /> Adicionar Fotos
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1a1a1a]">
        {(['photos', 'purchases'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-6 py-3 text-sm font-bold uppercase tracking-widest border-b-2 transition-all ${tab === t ? 'border-[#EDAC02] text-[#EDAC02]' : 'border-transparent text-zinc-500 hover:text-white'}`}>
            {t === 'photos' ? `📸 Fotos (${photos?.length || 0})` : `💳 Pedidos (${purchases?.length || 0})`}
          </button>
        ))}
      </div>

      {tab === 'photos' && (
        <div>
          {isLoading ? (
            <div className="p-12 text-center text-zinc-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
          ) : !photos || photos.length === 0 ? (
            <div className="p-12 text-center">
              <Camera className="mx-auto mb-4 text-zinc-700" size={40} />
              <p className="text-zinc-600 font-bold mb-4">Nenhuma foto adicionada</p>
              <button onClick={() => setShowBulkAdd(true)} className="px-6 py-3 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-lg hover:bg-[#ffc832]">
                Adicionar Fotos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square bg-dark-card border border-[#1a1a1a] overflow-hidden">
                  <img src={getDriveThumbnailUrl(photo.drive_file_id, 300)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {photo.bib_number && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-brand-500 text-white text-[9px] font-black">{photo.bib_number}</span>
                  )}
                  <button
                    onClick={() => { if (confirm('Remover esta foto?')) deletePhoto.mutate(photo.id); }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'purchases' && (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
          {!purchases || purchases.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-bold">Nenhum pedido ainda.</div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.status === 'paid' ? 'bg-green-500/10 text-green-500' : p.status === 'delivered' ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                    {p.status === 'paid' ? <CheckCircle size={16} /> : p.status === 'delivered' ? <Package size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold">{p.buyer_name}</p>
                    <p className="text-zinc-500 text-xs">{p.buyer_phone || p.buyer_email || '—'} • BIB {p.bib_number || '—'} • {p.package_type}</p>
                  </div>
                  <span className="text-brand-500 font-black text-sm">{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <select
                    value={p.status}
                    onChange={(e) => updateStatus.mutate({ id: p.id, status: e.target.value })}
                    className="bg-[#050505] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white font-bold focus:border-[#EDAC02] outline-none"
                  >
                    <option value="pending">⏳ Pendente</option>
                    <option value="paid">✅ Pago</option>
                    <option value="delivered">📦 Entregue</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showBulkAdd && <BulkAddPhotos galleryId={gallery.id} onClose={() => setShowBulkAdd(false)} />}
    </div>
  );
}

// ============ MAIN ADMIN PAGE ============
export default function AdminPhotos() {
  const { data: galleries, isLoading } = useAdminGalleries();
  const deleteGallery = useDeleteGallery();
  const updateGallery = useUpdateGallery();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<PhotoGallery | null>(null);
  const [selectedGallery, setSelectedGallery] = useState<PhotoGallery | null>(null);

  if (selectedGallery) {
    return <GalleryDetail gallery={selectedGallery} onBack={() => setSelectedGallery(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">📸 Fotos</h1>
          <p className="text-zinc-500 text-sm mt-1">Gerencie galerias de fotos dos eventos para venda.</p>
        </div>
        <button onClick={() => { setEditingGallery(null); setFormOpen(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-lg hover:bg-[#ffc832]">
          <Plus size={16} /> Nova Galeria
        </button>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" /><p className="font-bold">Carregando...</p></div>
        ) : !galleries || galleries.length === 0 ? (
          <div className="p-12 text-center">
            <Camera className="mx-auto mb-4 text-zinc-700" size={40} />
            <p className="text-zinc-600 font-bold text-lg mb-2">Nenhuma galeria</p>
            <p className="text-zinc-700 text-sm mb-6">Crie a primeira galeria para começar a vender fotos.</p>
            <button onClick={() => { setEditingGallery(null); setFormOpen(true); }} className="px-6 py-3 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-lg hover:bg-[#ffc832]">
              <Plus size={14} className="inline mr-2" /> Criar Galeria
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {galleries.map((g) => (
              <div key={g.id} className={`flex items-center gap-4 p-4 hover:bg-white/[0.02] cursor-pointer transition-colors ${!g.is_active ? 'opacity-50' : ''}`}
                onClick={() => setSelectedGallery(g)}>
                <div className="w-16 h-12 rounded-lg overflow-hidden border border-[#262626] bg-dark-card flex-shrink-0">
                  {g.cover_image_url ? (
                    <img src={getDriveThumbnailUrl(g.cover_image_url, 200)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Camera size={16} className="text-zinc-700" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm">{g.title}</h3>
                  <p className="text-zinc-600 text-xs">{g.photo_count || 0} fotos</p>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => updateGallery.mutate({ id: g.id, is_active: !g.is_active })}
                    className={`p-2 rounded-lg ${g.is_active ? 'text-green-500 hover:bg-green-500/10' : 'text-zinc-600 hover:bg-white/5'}`}>
                    {g.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => { setEditingGallery(g); setFormOpen(true); }}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"><Pencil size={16} /></button>
                  <button onClick={() => { if (confirm(`Remover "${g.title}"?`)) deleteGallery.mutate(g.id); }}
                    className="p-2 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && <GalleryForm gallery={editingGallery} onClose={() => { setFormOpen(false); setEditingGallery(null); }} />}
    </div>
  );
}
