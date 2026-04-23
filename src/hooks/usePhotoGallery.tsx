import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ TYPES ============
export interface PhotoGallery {
  id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  price_single?: number;
  price_pack_5?: number;
  price_all?: number;
  price_tier_1_4: number;
  price_tier_5_9: number;
  price_tier_10_19: number;
  price_tier_20_29: number;
  price_tier_30_plus: number;
  pix_key: string | null;
  payment_link: string | null;
  is_active: boolean;
  created_at: string;
  photo_count?: number;
}

export interface GalleryPhoto {
  id: string;
  gallery_id: string;
  bib_number: string | null;
  drive_file_id: string;
  caption: string | null;
  photographer: string | null;
  sort_order: number;
  created_at: string;
}

export interface PhotoPurchase {
  id: string;
  gallery_id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  bib_number: string | null;
  package_type: string;
  selected_photo_ids: string[];
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

// ============ GOOGLE DRIVE HELPERS ============
const GOOGLE_API_KEY = 'AIzaSyCmEeA9TkNF9zQng1GToxHryrd6Li9UpsM';

export function extractDriveFileId(url: string): string {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return url.trim();
}

export function extractDriveFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function isDriveFolderUrl(url: string): boolean {
  return /drive\.google\.com\/drive\/folders\//.test(url) || /\/folders\//.test(url);
}

export function getDriveThumbnailUrl(fileId: string, width = 800): string {
  // Use the thumbnail endpoint - works for publicly shared files
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

export function getDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/** Scan a Google Drive folder and return all image file IDs */
export async function scanDriveFolder(folderId: string): Promise<Array<{ id: string; name: string }>> {
  const allFiles: Array<{ id: string; name: string }> = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false and mimeType contains 'image'`,
      fields: 'nextPageToken,files(id,name)',
      key: GOOGLE_API_KEY,
      pageSize: '1000',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Google Drive API error: ${err}`);
    }
    const data = await resp.json();
    allFiles.push(...(data.files || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return allFiles;
}

// ============ PUBLIC HOOKS ============

export function usePublicGalleries() {
  return useQuery({
    queryKey: ['photo-galleries-public'],
    queryFn: async (): Promise<PhotoGallery[]> => {
      const { data, error } = await (supabase as any)
        .from('photo_galleries')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get photo counts
      const galleries = (data || []) as any[];
      const withCounts = await Promise.all(
        galleries.map(async (g) => {
          const { count } = await (supabase as any)
            .from('gallery_photos')
            .select('*', { count: 'exact', head: true })
            .eq('gallery_id', g.id);
          return { ...g, photo_count: count || 0 };
        })
      );
      return withCounts;
    },
  });
}

export function useGalleryPhotos(galleryId: string | null) {
  return useQuery({
    queryKey: ['gallery-photos', galleryId],
    enabled: !!galleryId,
    queryFn: async (): Promise<GalleryPhoto[]> => {
      const { data, error } = await (supabase as any)
        .from('gallery_photos')
        .select('*')
        .eq('gallery_id', galleryId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

// ============ ADMIN HOOKS ============

export function useAdminGalleries() {
  return useQuery({
    queryKey: ['photo-galleries-admin'],
    queryFn: async (): Promise<PhotoGallery[]> => {
      const { data, error } = await (supabase as any)
        .from('photo_galleries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const galleries = (data || []) as any[];
      const withCounts = await Promise.all(
        galleries.map(async (g) => {
          const { count } = await (supabase as any)
            .from('gallery_photos')
            .select('*', { count: 'exact', head: true })
            .eq('gallery_id', g.id);
          return { ...g, photo_count: count || 0 };
        })
      );
      return withCounts;
    },
  });
}

export function useAdminGalleryPhotos(galleryId: string | null) {
  return useQuery({
    queryKey: ['admin-gallery-photos', galleryId],
    enabled: !!galleryId,
    queryFn: async (): Promise<GalleryPhoto[]> => {
      const { data, error } = await (supabase as any)
        .from('gallery_photos')
        .select('*')
        .eq('gallery_id', galleryId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useAdminPurchases(galleryId?: string) {
  return useQuery({
    queryKey: ['photo-purchases-admin', galleryId],
    queryFn: async (): Promise<PhotoPurchase[]> => {
      let q = (supabase as any).from('photo_purchases').select('*').order('created_at', { ascending: false });
      if (galleryId) q = q.eq('gallery_id', galleryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        selected_photo_ids: Array.isArray(p.selected_photo_ids) ? p.selected_photo_ids : [],
      }));
    },
  });
}

// ============ MUTATIONS ============

export function useCreateGallery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (gallery: Partial<PhotoGallery>) => {
      const { data, error } = await (supabase as any).from('photo_galleries').insert(gallery as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photo-galleries-admin'] });
      qc.invalidateQueries({ queryKey: ['photo-galleries-public'] });
      toast.success('Galeria criada!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdateGallery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PhotoGallery> & { id: string }) => {
      const { error } = await (supabase as any).from('photo_galleries').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photo-galleries-admin'] });
      qc.invalidateQueries({ queryKey: ['photo-galleries-public'] });
      toast.success('Galeria atualizada!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteGallery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('photo_galleries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photo-galleries-admin'] });
      qc.invalidateQueries({ queryKey: ['photo-galleries-public'] });
      toast.success('Galeria removida!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useBulkAddPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photos: Array<{ gallery_id: string; drive_file_id: string; bib_number?: string; photographer?: string }>) => {
      const { error } = await (supabase as any).from('gallery_photos').insert(photos as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-gallery-photos'] });
      qc.invalidateQueries({ queryKey: ['gallery-photos'] });
      qc.invalidateQueries({ queryKey: ['photo-galleries-admin'] });
      toast.success(`${vars.length} foto(s) adicionadas!`);
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('gallery_photos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-gallery-photos'] });
      qc.invalidateQueries({ queryKey: ['gallery-photos'] });
      toast.success('Foto removida!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (purchase: Partial<PhotoPurchase>) => {
      const { data, error } = await (supabase as any).from('photo_purchases').insert(purchase as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photo-purchases-admin'] });
      toast.success('Pedido registrado! Aguarde confirmação do pagamento.');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdatePurchaseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from('photo_purchases').update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photo-purchases-admin'] });
      toast.success('Status atualizado!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}
