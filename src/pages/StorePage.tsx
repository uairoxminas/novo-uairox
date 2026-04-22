import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ExternalLink, Copy, Check, Tag, Star, PackageX } from 'lucide-react';
import { useStoreProducts, type StoreProduct } from '@/hooks/useStore';

// QR Code via free API
const getPixQrCodeUrl = (pixKey: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixKey)}&bgcolor=0a0a0a&color=EDAC02`;

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============ PRODUCT CARD ============
function ProductCard({ product, onClick }: { product: StoreProduct; onClick: () => void }) {
  const isOutOfStock = product.stock_quantity !== null && product.stock_quantity <= 0;
  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative bg-dark-card border border-dark-border overflow-hidden cursor-pointer transition-all duration-300 hover:border-brand-500 hover:-translate-y-1 ${isOutOfStock ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#0a0a0a]">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-16 h-16 text-zinc-800" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.is_featured && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest">
              <Star size={10} fill="white" /> Destaque
            </span>
          )}
          {hasDiscount && (
            <span className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest">
              -{discountPercent}%
            </span>
          )}
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="px-4 py-2 bg-dark-bg/80 border border-dark-border text-dark-muted font-black uppercase tracking-widest text-xs">
              Esgotado
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        {product.category && (
          <span className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mb-2 block">
            {product.category}
          </span>
        )}
        <h3 className="text-white font-black text-lg uppercase italic leading-tight mb-3 group-hover:text-brand-500 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-black text-white">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-sm text-dark-muted line-through">{formatPrice(product.compare_price!)}</span>
          )}
        </div>
        {product.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {product.sizes.map((size) => (
              <span key={size} className="px-2 py-0.5 text-[10px] font-bold text-zinc-400 border border-dark-border bg-dark-bg uppercase">
                {size}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============ PRODUCT MODAL ============
function ProductModal({ product, onClose }: { product: StoreProduct; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [showPix, setShowPix] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(product.sizes[0] || null);
  const isOutOfStock = product.stock_quantity !== null && product.stock_quantity <= 0;
  const hasDiscount = product.compare_price && product.compare_price > product.price;

  const handleCopyPix = () => {
    if (product.pix_key) {
      navigator.clipboard.writeText(product.pix_key);
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
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-[#0a0a0a] border border-dark-border w-full max-w-3xl max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-dark-bg/80 border border-dark-border text-zinc-400 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="md:flex">
          {/* Image Side */}
          <div className="md:w-1/2 relative aspect-square md:aspect-auto bg-[#050505]">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full min-h-[300px] flex items-center justify-center">
                <ShoppingBag className="w-24 h-24 text-zinc-800" />
              </div>
            )}
          </div>

          {/* Details Side */}
          <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
            {product.category && (
              <span className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mb-3">
                {product.category}
              </span>
            )}
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic leading-tight mb-4">
              {product.name}
            </h2>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-black text-brand-500">{formatPrice(product.price)}</span>
              {hasDiscount && (
                <span className="text-lg text-dark-muted line-through">{formatPrice(product.compare_price!)}</span>
              )}
            </div>

            {product.description && (
              <p className="text-dark-muted text-sm leading-relaxed mb-6 font-inter">
                {product.description}
              </p>
            )}

            {/* Size selector */}
            {product.sizes.length > 0 && (
              <div className="mb-6">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 block">Tamanho</label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 text-sm font-black uppercase transition-all ${
                        selectedSize === size
                          ? 'bg-brand-500 text-white border border-brand-500'
                          : 'bg-dark-bg border border-dark-border text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto space-y-3">
              {/* Payment Link Button */}
              {product.payment_link && !isOutOfStock && (
                <a
                  href={product.payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm skew-x-[-10deg] hover:bg-brand-500 hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-2 skew-x-[10deg]">
                    <ExternalLink size={16} /> Comprar Agora
                  </span>
                </a>
              )}

              {/* PIX Button */}
              {product.pix_key && !isOutOfStock && (
                <button
                  onClick={() => setShowPix(!showPix)}
                  className="flex items-center justify-center gap-3 w-full py-4 border-2 border-dark-border text-white font-black uppercase tracking-widest text-sm skew-x-[-10deg] hover:border-brand-500 transition-colors"
                >
                  <span className="inline-flex items-center gap-2 skew-x-[10deg]">
                    <Tag size={16} /> Pagar com PIX
                  </span>
                </button>
              )}

              {/* PIX Panel */}
              <AnimatePresence>
                {showPix && product.pix_key && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-dark-bg border border-dark-border p-6 mt-2">
                      <div className="flex flex-col items-center gap-4">
                        {/* Auto-generated QR Code */}
                        <div className="bg-white p-3 rounded-lg">
                          <img
                            src={getPixQrCodeUrl(product.pix_key)}
                            alt="QR Code PIX"
                            className="w-[180px] h-[180px]"
                          />
                        </div>

                        <div className="w-full">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block text-center">
                            Chave PIX
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={product.pix_key}
                              className="flex-1 bg-[#050505] border border-dark-border px-3 py-2 text-sm text-white font-mono truncate"
                            />
                            <button
                              onClick={handleCopyPix}
                              className={`px-4 py-2 font-bold text-sm transition-all ${
                                copied
                                  ? 'bg-green-500 text-white'
                                  : 'bg-brand-500 text-white hover:bg-brand-400'
                              }`}
                            >
                              {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>

                        <p className="text-zinc-500 text-xs text-center font-inter">
                          Escaneie o QR Code ou copie a chave PIX para realizar o pagamento.
                          Envie o comprovante pelo WhatsApp.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isOutOfStock && (
                <div className="flex items-center justify-center gap-2 py-4 bg-dark-bg border border-dark-border text-dark-muted font-black uppercase tracking-widest text-sm">
                  <PackageX size={16} /> Produto Esgotado
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ MAIN PAGE ============
export default function StorePage() {
  const { data: products, isLoading } = useStoreProducts();
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState('Todos');

  // Extract unique categories
  const categories = useMemo(() => {
    if (!products) return ['Todos'];
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return ['Todos', ...cats];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === 'Todos') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  const featuredProducts = filteredProducts.filter((p) => p.is_featured);
  const regularProducts = filteredProducts.filter((p) => !p.is_featured);

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20 border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <ShoppingBag className="text-brand-500" size={28} />
              <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/30 text-brand-400 font-black uppercase tracking-widest text-[10px]">
                Oficial
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic mb-4">
              Loja <span className="text-brand-500">UAIROX</span>
            </h1>
            <p className="text-dark-muted text-lg max-w-xl font-inter">
              Equipe-se com os produtos oficiais UAIROX. Camisetas, acessórios e kits exclusivos para atletas de verdade.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories Filter */}
      {categories.length > 1 && (
        <section className="border-b border-dark-border sticky top-24 z-20 bg-[#050505]/95 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 py-4 overflow-x-auto scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 font-black text-sm uppercase tracking-widest whitespace-nowrap transition-all skew-x-[-6deg] ${
                    activeCategory === cat
                      ? 'bg-brand-500 text-white'
                      : 'bg-dark-card border border-dark-border text-zinc-500 hover:text-white hover:border-zinc-500'
                  }`}
                >
                  <span className="inline-block skew-x-[6deg]">{cat}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Grid */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[3/4] bg-dark-card border border-dark-border animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-32">
              <PackageX className="mx-auto mb-6 text-zinc-700" size={64} />
              <h3 className="text-2xl font-black text-white uppercase italic mb-2">Loja Vazia</h3>
              <p className="text-dark-muted font-inter">Novos produtos serão adicionados em breve.</p>
            </div>
          ) : (
            <div className="space-y-16">
              {/* Featured Products */}
              {featuredProducts.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <Star className="text-brand-500" size={20} fill="currentColor" />
                    <h2 className="text-xl font-black text-white uppercase tracking-widest italic">Destaques</h2>
                    <div className="flex-1 h-px bg-dark-border" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredProducts.map((p) => (
                      <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Products */}
              {regularProducts.length > 0 && (
                <div>
                  {featuredProducts.length > 0 && (
                    <div className="flex items-center gap-4 mb-8">
                      <ShoppingBag className="text-zinc-500" size={20} />
                      <h2 className="text-xl font-black text-white uppercase tracking-widest italic">Todos os Produtos</h2>
                      <div className="flex-1 h-px bg-dark-border" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularProducts.map((p) => (
                      <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Product Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
