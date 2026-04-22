import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, Upload, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  useAdminStoreProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type StoreProduct,
} from '@/hooks/useStore';

const SIZES_OPTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];

// ============ PRODUCT FORM DIALOG ============
function ProductFormDialog({
  product,
  open,
  onClose,
}: {
  product?: StoreProduct | null;
  open: boolean;
  onClose: () => void;
}) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [comparePrice, setComparePrice] = useState(product?.compare_price?.toString() || '');
  const [category, setCategory] = useState(product?.category || '');
  const [sizes, setSizes] = useState<string[]>(product?.sizes || []);
  const [paymentLink, setPaymentLink] = useState(product?.payment_link || '');
  const [pixKey, setPixKey] = useState(product?.pix_key || '');
  const [imageUrl, setImageUrl] = useState(product?.image_url || '');
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity?.toString() || '');
  const [sortOrder, setSortOrder] = useState(product?.sort_order?.toString() || '0');
  const [uploading, setUploading] = useState(false);

  const toggleSize = (size: string) => {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          const MAX = 1200;
          if (w > MAX || h > MAX) {
            const r = Math.min(MAX / w, MAX / h);
            w *= r; h *= r;
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/webp', 0.8);
          setImageUrl(compressed);
          setUploading(false);
        };
      };
    } catch {
      alert('Erro ao processar imagem.');
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    const payload: any = {
      name: name.trim(),
      description: description.trim() || null,
      price: parseFloat(price),
      compare_price: comparePrice ? parseFloat(comparePrice) : null,
      category: category.trim() || 'Geral',
      sizes,
      payment_link: paymentLink.trim() || null,
      pix_key: pixKey.trim() || null,
      image_url: imageUrl || null,
      is_active: isActive,
      is_featured: isFeatured,
      stock_quantity: stockQuantity ? parseInt(stockQuantity) : null,
      sort_order: parseInt(sortOrder) || 0,
    };

    try {
      if (isEdit) {
        await updateProduct.mutateAsync({ id: product!.id, ...payload });
      } else {
        await createProduct.mutateAsync(payload);
      }
      onClose();
    } catch {}
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 pt-8">
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-2xl w-full max-w-2xl relative">
        <div className="flex items-center justify-between p-6 border-b border-[#262626]">
          <h2 className="text-xl font-black text-white">
            {isEdit ? '✏️ Editar Produto' : '➕ Novo Produto'}
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Image Upload */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Imagem do Produto</label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-[#262626] bg-dark-card group">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImageUrl('')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : null}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#262626] rounded-lg w-32 h-32 cursor-pointer hover:border-[#EDAC02] transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                {uploading ? <Loader2 className="w-6 h-6 animate-spin text-[#EDAC02]" /> : (
                  <>
                    <Upload className="w-6 h-6 text-zinc-500 mb-1" />
                    <span className="text-[10px] text-zinc-600 font-bold">Upload</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Nome *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none transition-colors" placeholder="Camiseta UAIROX 2026" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Categoria</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none transition-colors" placeholder="Camiseta, Acessório, Kit..." />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none transition-colors resize-none" placeholder="Descrição detalhada do produto..." />
          </div>

          {/* Price & Compare Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Preço (R$) *</label>
              <input type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none transition-colors" placeholder="149.90" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Preço Anterior (R$)</label>
              <input type="number" step="0.01" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none transition-colors" placeholder="199.90" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Estoque</label>
              <input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none transition-colors" placeholder="Vazio = ilimitado" />
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Tamanhos Disponíveis</label>
            <div className="flex flex-wrap gap-2">
              {SIZES_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    sizes.includes(size)
                      ? 'bg-[#EDAC02]/10 border border-[#EDAC02] text-[#EDAC02]'
                      : 'bg-[#050505] border border-[#262626] text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="border-t border-[#262626] pt-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">💳 Pagamento</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Link de Pagamento</label>
                <input type="url" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none transition-colors" placeholder="https://mpago.la/..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Chave PIX</label>
                <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none transition-colors" placeholder="email@exemplo.com ou CPF/CNPJ" />
                {pixKey && (
                  <p className="mt-1 text-[10px] text-zinc-500">
                    ✅ QR Code será gerado automaticamente na loja a partir desta chave.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#262626] pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-5 bg-[#262626] rounded-full peer-checked:bg-[#EDAC02] transition-colors relative">
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-zinc-400 font-bold">Ativo</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-5 bg-[#262626] rounded-full peer-checked:bg-[#EDAC02] transition-colors relative">
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isFeatured ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-zinc-400 font-bold">Destaque</span>
            </label>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Ordem</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white text-sm focus:border-[#EDAC02] outline-none transition-colors" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
            <button type="button" onClick={onClose} className="px-6 py-3 text-zinc-400 font-bold text-sm hover:text-white transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createProduct.isPending || updateProduct.isPending}
              className="px-8 py-3 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-lg hover:bg-[#ffc832] disabled:opacity-50 transition-colors"
            >
              {(createProduct.isPending || updateProduct.isPending) ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ MAIN ADMIN PAGE ============
export default function AdminStore() {
  const { data: products, isLoading } = useAdminStoreProducts();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);

  const handleCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const handleEdit = (product: StoreProduct) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleToggleActive = (product: StoreProduct) => {
    updateProduct.mutate({ id: product.id, is_active: !product.is_active });
  };

  const handleDelete = (product: StoreProduct) => {
    if (confirm(`Remover "${product.name}" permanentemente?`)) {
      deleteProduct.mutate(product.id);
    }
  };

  const formatPrice = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">🛍️ Loja</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Gerencie os produtos da vitrine UAIROX.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-lg hover:bg-[#ffc832] transition-colors"
        >
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {/* Stats */}
      {products && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: products.length },
            { label: 'Ativos', value: products.filter((p) => p.is_active).length },
            { label: 'Destaques', value: products.filter((p) => p.is_featured).length },
            { label: 'Esgotados', value: products.filter((p) => p.stock_quantity !== null && p.stock_quantity <= 0).length },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Products List */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p className="font-bold">Carregando produtos...</p>
          </div>
        ) : !products || products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-600 font-bold text-lg mb-2">Nenhum produto cadastrado</p>
            <p className="text-zinc-700 text-sm mb-6">Comece adicionando o primeiro produto à loja.</p>
            <button onClick={handleCreate} className="px-6 py-3 bg-[#EDAC02] text-black font-black text-sm uppercase tracking-widest rounded-lg hover:bg-[#ffc832] transition-colors">
              <Plus size={14} className="inline mr-2" /> Criar Primeiro Produto
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {products.map((product) => (
              <div key={product.id} className={`flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors ${!product.is_active ? 'opacity-50' : ''}`}>
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#262626] bg-dark-card flex-shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={20} className="text-zinc-700" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-sm truncate">{product.name}</h3>
                    {product.is_featured && <Star size={12} className="text-[#EDAC02]" fill="currentColor" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-[#EDAC02] font-bold">{formatPrice(product.price)}</span>
                    {product.category && <span className="text-zinc-600">{product.category}</span>}
                    {product.sizes.length > 0 && <span className="text-zinc-600">{product.sizes.join(', ')}</span>}
                    {product.stock_quantity !== null && (
                      <span className={`font-bold ${product.stock_quantity <= 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                        Est: {product.stock_quantity}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(product)}
                    className={`p-2 rounded-lg transition-colors ${product.is_active ? 'text-green-500 hover:bg-green-500/10' : 'text-zinc-600 hover:bg-white/5'}`}
                    title={product.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {product.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    className="p-2 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      {dialogOpen && (
        <ProductFormDialog
          product={editingProduct}
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}
