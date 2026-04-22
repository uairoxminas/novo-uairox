import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Camera, X, ChevronLeft, Copy, Check, ExternalLink, Tag, Download, Image as ImageIcon } from 'lucide-react';
import {
  usePublicGalleries,
  useGalleryPhotos,
  useCreatePurchase,
  getDriveThumbnailUrl,
  extractDriveFileId,
  type PhotoGallery,
  type GalleryPhoto,
} from '@/hooks/usePhotoGallery';

const getPixQrCodeUrl = (pixKey: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixKey)}&bgcolor=0a0a0a&color=EDAC02`;

function formatPrice(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============ PRICE CALCULATOR ============
function calculateCustomPrice(count: number): number {
  const getExactPrice = (n: number) => {
    let rem = n;
    let t = 0;
    t += Math.floor(rem / 30) * 250; rem %= 30;
    t += Math.floor(rem / 20) * 200; rem %= 20;
    t += Math.floor(rem / 10) * 120; rem %= 10;
    t += Math.floor(rem / 5) * 80; rem %= 5;
    t += rem * 20;
    return t;
  };

  return Math.min(
    getExactPrice(count),
    getExactPrice(Math.ceil(count / 5) * 5),
    getExactPrice(Math.ceil(count / 10) * 10),
    getExactPrice(Math.ceil(count / 20) * 20),
    getExactPrice(Math.ceil(count / 30) * 30)
  );
}

// ============ WATERMARKED PHOTO ============
function WatermarkedPhoto({ photo, isSelected, onToggleSelect, onEnlarge }: { photo: GalleryPhoto; isSelected: boolean; onToggleSelect: () => void; onEnlarge: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative overflow-hidden cursor-pointer bg-[#0a0a0a] border transition-all ${isSelected ? 'border-brand-500 ring-2 ring-brand-500 ring-offset-2 ring-offset-[#0a0a0a]' : 'border-dark-border'}`}
      onClick={onToggleSelect}
    >
      <div className="relative aspect-[4/3]">
        <img
          src={getDriveThumbnailUrl(photo.drive_file_id, 600)}
          alt={photo.caption || 'Foto UAIROX'}
          className={`w-full h-full object-cover transition-transform duration-700 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
          loading="lazy"
        />
        {/* Watermark Overlay */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden bg-black/10 flex items-center justify-center">
          <div 
            className="absolute w-[200%] h-[200%]"
            style={{
              backgroundImage: `url('/logo-uairox.webp')`,
              backgroundSize: '160px',
              backgroundRepeat: 'repeat',
              backgroundPosition: 'center',
              opacity: 0.4,
              transform: 'rotate(-25deg)',
            }}
          />
        </div>
        
        {/* Selection Checkmark */}
        <div className={`absolute top-3 left-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-500 border-brand-500' : 'bg-black/50 border-white/50 group-hover:border-white'}`}>
          {isSelected && <Check size={14} className="text-black font-black" />}
        </div>
        
        {/* Hover Enlarge */}
        <button 
          onClick={(e) => { e.stopPropagation(); onEnlarge(); }}
          className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Search size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// ============ PHOTO LIGHTBOX ============
function PhotoLightbox({ photo, gallery, onClose }: { photo: GalleryPhoto; gallery: PhotoGallery; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/60 hover:text-white z-10">
        <X size={28} />
      </button>
      <div className="relative max-w-4xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <img
          src={getDriveThumbnailUrl(photo.drive_file_id, 1200)}
          alt={photo.caption || 'Foto UAIROX'}
          className="max-w-full max-h-[85vh] object-contain"
        />
        {/* Watermark on lightbox */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center">
          <div 
            className="absolute w-[200%] h-[200%]"
            style={{
              backgroundImage: `url('/logo-uairox.webp')`,
              backgroundSize: '250px',
              backgroundRepeat: 'repeat',
              backgroundPosition: 'center',
              opacity: 0.4,
              transform: 'rotate(-25deg)',
            }}
          />
        </div>
        {photo.photographer && (
          <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 text-zinc-400 text-xs">
            📷 {photo.photographer}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============ PURCHASE MODAL ============
function PurchaseModal({ gallery, selectedPhotos, totalPrice, onClose }: {
  gallery: PhotoGallery;
  selectedPhotos: Set<string>;
  totalPrice: number;
  onClose: () => void;
}) {
  const createPurchase = useCreatePurchase();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showPix, setShowPix] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await createPurchase.mutateAsync({
      gallery_id: gallery.id,
      buyer_name: name.trim(),
      buyer_email: email.trim() || null,
      buyer_phone: phone.trim() || null,
      bib_number: null,
      package_type: `${selectedPhotos.size} foto(s)`,
      amount: totalPrice,
      payment_method: showPix ? 'pix' : 'link',
      status: 'pending',
    } as any);
    setSubmitted(true);
  };

  const handleCopy = () => {
    if (gallery.pix_key) {
      navigator.clipboard.writeText(gallery.pix_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-dark-border w-full max-w-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white">
          <X size={20} />
        </button>

        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-black text-white uppercase italic mb-1">Comprar Fotos</h2>
          <p className="text-dark-muted text-sm mb-6">{gallery.title}</p>

          {!submitted ? (
            <>
              {/* Purchase Summary */}
              <div className="bg-brand-500/10 border border-brand-500 p-4 mb-6 text-center">
                <p className="text-white font-bold mb-1">
                  {selectedPhotos.size} foto{selectedPhotos.size !== 1 ? 's' : ''} selecionada{selectedPhotos.size !== 1 ? 's' : ''}
                </p>
                <p className="text-brand-500 font-black text-2xl uppercase tracking-tighter">
                  Total: {formatPrice(totalPrice)}
                </p>
              </div>

              {/* Buyer Info */}
              <div className="space-y-3 mb-6">
                <input type="text" placeholder="Seu nome *" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm placeholder:text-zinc-600 focus:border-brand-500 outline-none" />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm placeholder:text-zinc-600 focus:border-brand-500 outline-none" />
                <input type="tel" placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm placeholder:text-zinc-600 focus:border-brand-500 outline-none" />
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {gallery.payment_link && (
                  <a href={gallery.payment_link} target="_blank" rel="noopener noreferrer" onClick={handleSubmit}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm skew-x-[-10deg] hover:bg-brand-500 hover:text-white transition-colors">
                    <span className="inline-flex items-center gap-2 skew-x-[10deg]">
                      <ExternalLink size={16} /> Pagar {formatPrice(totalPrice)}
                    </span>
                  </a>
                )}
                {gallery.pix_key && (
                  <>
                    <button onClick={() => setShowPix(!showPix)}
                      className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dark-border text-white font-black uppercase tracking-widest text-sm skew-x-[-10deg] hover:border-brand-500 transition-colors">
                      <span className="inline-flex items-center gap-2 skew-x-[10deg]">
                        <Tag size={16} /> Pagar com PIX — {formatPrice(totalPrice)}
                      </span>
                    </button>
                    <AnimatePresence>
                      {showPix && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="bg-dark-bg border border-dark-border p-6">
                            <div className="flex flex-col items-center gap-4">
                              <div className="bg-white p-3 rounded-lg">
                                <img src={getPixQrCodeUrl(gallery.pix_key)} alt="QR Code PIX" className="w-[180px] h-[180px]" />
                              </div>
                              <div className="w-full flex items-center gap-2">
                                <input type="text" readOnly value={gallery.pix_key} className="flex-1 bg-[#050505] border border-dark-border px-3 py-2 text-sm text-white font-mono truncate" />
                                <button onClick={handleCopy} className={`px-4 py-2 font-bold text-sm ${copied ? 'bg-green-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-400'}`}>
                                  {copied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                              </div>
                              <button onClick={handleSubmit} disabled={!name.trim() || createPurchase.isPending}
                                className="w-full py-3 bg-brand-500 text-white font-black uppercase tracking-widest text-sm hover:bg-brand-400 disabled:opacity-50 transition-colors">
                                {createPurchase.isPending ? 'Enviando...' : 'Confirmar Pedido'}
                              </button>
                              <p className="text-zinc-500 text-xs text-center">Envie o comprovante pelo WhatsApp após o pagamento.</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic mb-2">Pedido Registrado!</h3>
              <p className="text-dark-muted text-sm mb-1">Assim que confirmarmos o pagamento, suas fotos em alta resolução serão liberadas.</p>
              <p className="text-dark-muted text-xs">Você receberá acesso por email ou WhatsApp.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ GALLERY VIEW ============
function GalleryView({ gallery, onBack }: { gallery: PhotoGallery; onBack: () => void }) {
  const { data: photos, isLoading } = useGalleryPhotos(gallery.id);
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  const togglePhoto = (id: string) => {
    const newSet = new Set(selectedPhotos);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedPhotos(newSet);
  };

  const currentTotal = useMemo(() => calculateCustomPrice(selectedPhotos.size), [selectedPhotos.size]);

  return (
    <>
      {/* Gallery Header */}
      <section className="pt-32 pb-8 md:pt-40 md:pb-12 border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm font-bold mb-6 transition-colors">
            <ChevronLeft size={16} /> Voltar às Galerias
          </button>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter italic mb-3">
              {gallery.title}
            </h1>
            {gallery.description && <p className="text-dark-muted max-w-xl font-inter mb-6">{gallery.description}</p>}
          </motion.div>
        </div>
      </section>

      {/* Photos Grid */}
      <section className="py-12 md:py-16 mb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1,2,3,4,5,6,7,8].map((i) => (
                <div key={i} className="aspect-[4/3] bg-dark-card border border-dark-border animate-pulse" />
              ))}
            </div>
          ) : !photos || photos.length === 0 ? (
            <div className="text-center py-20">
              <Camera className="mx-auto mb-4 text-zinc-700" size={48} />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm italic">
                Nenhuma foto nesta galeria ainda.
              </p>
            </div>
          ) : (
            <>
              <p className="text-zinc-500 text-sm mb-6 font-inter">
                {photos.length} foto{photos.length !== 1 ? 's' : ''} disponíveis. Clique nas fotos para selecionar.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <WatermarkedPhoto 
                    key={photo.id} 
                    photo={photo} 
                    isSelected={selectedPhotos.has(photo.id)}
                    onToggleSelect={() => togglePhoto(photo.id)}
                    onEnlarge={() => setLightboxPhoto(photo)} 
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedPhotos.size > 0 && !showPurchase && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none"
          >
            <div className="max-w-3xl mx-auto bg-brand-500 rounded-2xl shadow-[0_0_40px_rgba(237,172,2,0.3)] pointer-events-auto flex items-center justify-between p-4 px-6">
              <div>
                <p className="text-black font-black uppercase tracking-widest text-sm mb-0.5">
                  {selectedPhotos.size} foto{selectedPhotos.size > 1 ? 's' : ''}
                </p>
                <p className="text-black/70 text-xs font-bold">
                  Total: {formatPrice(currentTotal)}
                </p>
              </div>
              <button
                onClick={() => setShowPurchase(true)}
                className="bg-black text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-zinc-900 transition-colors"
              >
                Comprar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && <PhotoLightbox photo={lightboxPhoto} gallery={gallery} onClose={() => setLightboxPhoto(null)} />}
      </AnimatePresence>

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchase && photos && (
          <PurchaseModal 
            gallery={gallery} 
            selectedPhotos={selectedPhotos} 
            totalPrice={currentTotal} 
            onClose={() => setShowPurchase(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ============ MAIN PAGE ============
export default function GalleryPage() {
  const { data: galleries, isLoading } = usePublicGalleries();
  const [selectedGallery, setSelectedGallery] = useState<PhotoGallery | null>(null);

  if (selectedGallery) {
    return <GalleryView gallery={selectedGallery} onBack={() => setSelectedGallery(null)} />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20 border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <Camera className="text-brand-500" size={28} />
              <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/30 text-brand-400 font-black uppercase tracking-widest text-[10px]">
                Galeria Oficial
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic mb-4">
              Fotos <span className="text-brand-500">UAIROX</span>
            </h1>
            <p className="text-dark-muted text-lg max-w-xl font-inter">
              Encontre suas fotos dos eventos UAIROX. Busque pelo número do peito e adquira suas melhores imagens em alta resolução.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Galleries Grid */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map((i) => (
                <div key={i} className="aspect-[16/9] bg-dark-card border border-dark-border animate-pulse" />
              ))}
            </div>
          ) : !galleries || galleries.length === 0 ? (
            <div className="text-center py-32">
              <ImageIcon className="mx-auto mb-6 text-zinc-700" size={64} />
              <h3 className="text-2xl font-black text-white uppercase italic mb-2">Em Breve</h3>
              <p className="text-dark-muted font-inter">As fotos dos próximos eventos serão publicadas aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleries.map((gallery, index) => (
                <motion.div
                  key={gallery.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative overflow-hidden cursor-pointer bg-dark-card border border-dark-border hover:border-brand-500 transition-all duration-300 hover:-translate-y-1"
                  onClick={() => setSelectedGallery(gallery)}
                >
                  <div className="relative aspect-[16/9] bg-[#0a0a0a]">
                    {gallery.cover_image_url ? (
                      <img
                        src={getDriveThumbnailUrl(extractDriveFileId(gallery.cover_image_url), 800)}
                        alt={gallery.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-16 h-16 text-zinc-800" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-black text-xl uppercase italic leading-tight mb-1">{gallery.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Camera size={12} /> {gallery.photo_count || 0} fotos
                        </span>
                        <span className="text-brand-400 font-bold">a partir de {formatPrice(gallery.price_single)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
