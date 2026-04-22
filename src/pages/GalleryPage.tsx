import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Camera, X, ChevronLeft, Copy, Check, ExternalLink, Tag, Download, Image as ImageIcon } from 'lucide-react';
import {
  usePublicGalleries,
  useGalleryPhotos,
  useCreatePurchase,
  getDriveThumbnailUrl,
  type PhotoGallery,
  type GalleryPhoto,
} from '@/hooks/usePhotoGallery';

const getPixQrCodeUrl = (pixKey: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixKey)}&bgcolor=0a0a0a&color=EDAC02`;

function formatPrice(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============ WATERMARKED PHOTO ============
function WatermarkedPhoto({ photo, onClick }: { photo: GalleryPhoto; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative overflow-hidden cursor-pointer bg-[#0a0a0a] border border-dark-border"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3]">
        <img
          src={getDriveThumbnailUrl(photo.drive_file_id, 600)}
          alt={photo.caption || 'Foto UAIROX'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
        {/* Watermark Overlay */}
        <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden"
          style={{
            background: 'repeating-linear-gradient(-45deg, transparent, transparent 80px, rgba(237,172,2,0.08) 80px, rgba(237,172,2,0.08) 82px)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/[0.12] font-black text-4xl md:text-5xl uppercase tracking-[0.3em] italic rotate-[-25deg] whitespace-nowrap select-none">
              UAIROX
            </span>
          </div>
          <div className="absolute top-4 right-4">
            <span className="text-white/[0.08] font-black text-lg uppercase tracking-widest italic select-none">
              UAIROX
            </span>
          </div>
          <div className="absolute bottom-4 left-4">
            <span className="text-white/[0.08] font-black text-lg uppercase tracking-widest italic select-none">
              UAIROX
            </span>
          </div>
        </div>
        {/* Hover effect */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Camera className="text-white" size={32} />
        </div>
      </div>
      {photo.bib_number && (
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest">
            BIB {photo.bib_number}
          </span>
        </div>
      )}
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
        <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center">
          <span className="text-white/[0.10] font-black text-6xl md:text-8xl uppercase tracking-[0.3em] italic rotate-[-25deg] whitespace-nowrap select-none">
            UAIROX
          </span>
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
function PurchaseModal({ gallery, photos, bibFilter, onClose }: {
  gallery: PhotoGallery;
  photos: GalleryPhoto[];
  bibFilter: string;
  onClose: () => void;
}) {
  const createPurchase = useCreatePurchase();
  const [packageType, setPackageType] = useState<'single' | 'pack_5' | 'all'>('all');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bib, setBib] = useState(bibFilter);
  const [showPix, setShowPix] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const price = packageType === 'single' ? gallery.price_single : packageType === 'pack_5' ? gallery.price_pack_5 : gallery.price_all;
  const bibPhotos = bib ? photos.filter((p) => p.bib_number === bib) : photos;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await createPurchase.mutateAsync({
      gallery_id: gallery.id,
      buyer_name: name.trim(),
      buyer_email: email.trim() || null,
      buyer_phone: phone.trim() || null,
      bib_number: bib || null,
      package_type: packageType,
      amount: price,
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
              {/* Package Selection */}
              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pacote</label>
                {[
                  { key: 'single' as const, label: '1 Foto', price: gallery.price_single },
                  { key: 'pack_5' as const, label: 'Pacote 5 Fotos', price: gallery.price_pack_5 },
                  { key: 'all' as const, label: `Todas as Fotos${bib ? ` (BIB ${bib})` : ''}`, price: gallery.price_all },
                ].map((pkg) => (
                  <button
                    key={pkg.key}
                    onClick={() => setPackageType(pkg.key)}
                    className={`w-full flex items-center justify-between p-4 transition-all ${
                      packageType === pkg.key
                        ? 'bg-brand-500/10 border border-brand-500 text-white'
                        : 'bg-dark-card border border-dark-border text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    <span className="font-bold text-sm">{pkg.label}</span>
                    <span className="font-black text-lg">{formatPrice(pkg.price)}</span>
                  </button>
                ))}
              </div>

              {/* Buyer Info */}
              <div className="space-y-3 mb-6">
                <input type="text" placeholder="Seu nome *" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm placeholder:text-zinc-600 focus:border-brand-500 outline-none" />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm placeholder:text-zinc-600 focus:border-brand-500 outline-none" />
                <input type="tel" placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm placeholder:text-zinc-600 focus:border-brand-500 outline-none" />
                <input type="text" placeholder="Número do peito (BIB)" value={bib} onChange={(e) => setBib(e.target.value)}
                  className="w-full bg-[#050505] border border-dark-border p-3 text-white text-sm placeholder:text-zinc-600 focus:border-brand-500 outline-none" />
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {gallery.payment_link && (
                  <a href={gallery.payment_link} target="_blank" rel="noopener noreferrer" onClick={handleSubmit}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm skew-x-[-10deg] hover:bg-brand-500 hover:text-white transition-colors">
                    <span className="inline-flex items-center gap-2 skew-x-[10deg]">
                      <ExternalLink size={16} /> Pagar {formatPrice(price)}
                    </span>
                  </a>
                )}
                {gallery.pix_key && (
                  <>
                    <button onClick={() => setShowPix(!showPix)}
                      className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dark-border text-white font-black uppercase tracking-widest text-sm skew-x-[-10deg] hover:border-brand-500 transition-colors">
                      <span className="inline-flex items-center gap-2 skew-x-[10deg]">
                        <Tag size={16} /> Pagar com PIX — {formatPrice(price)}
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
  const [bibSearch, setBibSearch] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);
  const [showPurchase, setShowPurchase] = useState(false);

  const filteredPhotos = useMemo(() => {
    if (!photos) return [];
    if (!bibSearch.trim()) return photos;
    return photos.filter((p) => p.bib_number && p.bib_number.includes(bibSearch.trim()));
  }, [photos, bibSearch]);

  const uniqueBibs = useMemo(() => {
    if (!photos) return [];
    return [...new Set(photos.map((p) => p.bib_number).filter(Boolean))].sort();
  }, [photos]);

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

            {/* Search + Buy */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por número do peito (BIB)..."
                  value={bibSearch}
                  onChange={(e) => setBibSearch(e.target.value)}
                  className="w-full bg-dark-card border border-dark-border pl-12 pr-4 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:border-brand-500 outline-none transition-colors"
                />
                {bibSearch && (
                  <button onClick={() => setBibSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowPurchase(true)}
                className="px-8 py-3.5 bg-brand-500 text-white font-black uppercase tracking-widest text-sm skew-x-[-10deg] hover:bg-brand-400 transition-colors"
              >
                <span className="inline-flex items-center gap-2 skew-x-[10deg]">
                  <Download size={16} /> Comprar Fotos
                </span>
              </button>
            </div>

            {/* Bib pills */}
            {uniqueBibs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setBibSearch('')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all ${!bibSearch ? 'bg-brand-500 text-white' : 'bg-dark-card border border-dark-border text-zinc-500 hover:text-white'}`}
                >
                  Todas ({photos?.length || 0})
                </button>
                {uniqueBibs.map((bib) => (
                  <button
                    key={bib}
                    onClick={() => setBibSearch(bib!)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all ${bibSearch === bib ? 'bg-brand-500 text-white' : 'bg-dark-card border border-dark-border text-zinc-500 hover:text-white'}`}
                  >
                    BIB {bib}
                  </button>
                ))}
              </div>
            )}

            {/* Price Bar */}
            <div className="flex flex-wrap gap-4 mt-6 py-4 border-t border-dark-border">
              {[
                { label: '1 Foto', price: gallery.price_single },
                { label: '5 Fotos', price: gallery.price_pack_5 },
                { label: 'Todas', price: gallery.price_all },
              ].map((pkg) => (
                <div key={pkg.label} className="flex items-baseline gap-2">
                  <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{pkg.label}:</span>
                  <span className="text-brand-500 font-black">{formatPrice(pkg.price)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Photos Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1,2,3,4,5,6,7,8].map((i) => (
                <div key={i} className="aspect-[4/3] bg-dark-card border border-dark-border animate-pulse" />
              ))}
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-20">
              <Camera className="mx-auto mb-4 text-zinc-700" size={48} />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm italic">
                {bibSearch ? `Nenhuma foto encontrada para BIB ${bibSearch}` : 'Nenhuma foto nesta galeria ainda.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-zinc-500 text-sm mb-6 font-inter">
                {filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''} {bibSearch ? `para BIB ${bibSearch}` : 'disponíveis'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredPhotos.map((photo) => (
                  <WatermarkedPhoto key={photo.id} photo={photo} onClick={() => setLightboxPhoto(photo)} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && <PhotoLightbox photo={lightboxPhoto} gallery={gallery} onClose={() => setLightboxPhoto(null)} />}
      </AnimatePresence>

      {/* Purchase Modal */}
      <AnimatePresence>
        {showPurchase && photos && (
          <PurchaseModal gallery={gallery} photos={photos} bibFilter={bibSearch} onClose={() => setShowPurchase(false)} />
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
                        src={getDriveThumbnailUrl(gallery.cover_image_url, 800)}
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
