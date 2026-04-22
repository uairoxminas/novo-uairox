import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ TYPES ============
export interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compare_price: number | null;
  image_url: string | null;
  images: string[];
  category: string;
  sizes: string[];
  payment_link: string | null;
  pix_key: string | null;
  is_active: boolean;
  is_featured: boolean;
  stock_quantity: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type ProductInsert = Omit<StoreProduct, 'id' | 'created_at' | 'updated_at'>;
type ProductUpdate = Partial<ProductInsert> & { id: string };

// ============ PUBLIC HOOKS ============

/** Fetch active products for the public storefront */
export function useStoreProducts() {
  return useQuery({
    queryKey: ['store-products-public'],
    queryFn: async (): Promise<StoreProduct[]> => {
      const { data, error } = await (supabase as any)
        .from('store_products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapProduct);
    },
  });
}

// ============ ADMIN HOOKS ============

/** Fetch ALL products (including inactive) for admin */
export function useAdminStoreProducts() {
  return useQuery({
    queryKey: ['store-products-admin'],
    queryFn: async (): Promise<StoreProduct[]> => {
      const { data, error } = await (supabase as any)
        .from('store_products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapProduct);
    },
  });
}

/** Create a new product */
export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Omit<ProductInsert, 'is_active' | 'is_featured' | 'sort_order'> & Partial<Pick<ProductInsert, 'is_active' | 'is_featured' | 'sort_order'>>) => {
      const { data, error } = await (supabase as any)
        .from('store_products')
        .insert(product as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-products-admin'] });
      qc.invalidateQueries({ queryKey: ['store-products-public'] });
      toast.success('Produto criado com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao criar produto: ' + err.message);
    },
  });
}

/** Update an existing product */
export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ProductUpdate) => {
      const { data, error } = await (supabase as any)
        .from('store_products')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-products-admin'] });
      qc.invalidateQueries({ queryKey: ['store-products-public'] });
      toast.success('Produto atualizado!');
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar: ' + err.message);
    },
  });
}

/** Delete a product */
export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('store_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-products-admin'] });
      qc.invalidateQueries({ queryKey: ['store-products-public'] });
      toast.success('Produto removido!');
    },
    onError: (err: any) => {
      toast.error('Erro ao remover: ' + err.message);
    },
  });
}

// ============ HELPERS ============

function mapProduct(row: any): StoreProduct {
  return {
    ...row,
    images: Array.isArray(row.images) ? row.images : [],
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
  };
}
