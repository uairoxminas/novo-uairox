import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============ TYPES ============
export interface Installment {
  id: string;
  registration_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
}

// ============ QUERIES ============

/** Get all installments for a specific registration */
export function useInstallments(registrationId?: string) {
  return useQuery({
    queryKey: ['installments', registrationId],
    queryFn: async () => {
      if (!registrationId) return [];
      const { data, error } = await (supabase as any)
        .from('registration_installments')
        .select('*')
        .eq('registration_id', registrationId)
        .order('installment_number');
      if (error) throw error;
      return (data || []) as Installment[];
    },
    enabled: !!registrationId,
  });
}

/** Get all installments for an entire event (for admin panel) */
export function useEventInstallments(eventId?: string) {
  return useQuery({
    queryKey: ['event-installments', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      // Get all registrations for this event, then their installments
      const { data, error } = await (supabase as any)
        .from('registration_installments')
        .select('*, registrations!inner(id, event_id, athlete_name, athlete_email, athlete_phone, status, payment_type)')
        .eq('registrations.event_id', eventId)
        .order('due_date');
      if (error) throw error;
      return (data || []) as (Installment & { registrations: any })[];
    },
    enabled: !!eventId,
  });
}

// ============ MUTATIONS ============

/** Create installments for a registration */
export function useCreateInstallments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (installments: Omit<Installment, 'id' | 'created_at' | 'paid_at' | 'notes'>[]) => {
      const { data, error } = await (supabase as any)
        .from('registration_installments')
        .insert(installments)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      if (vars.length > 0) {
        qc.invalidateQueries({ queryKey: ['installments', vars[0].registration_id] });
      }
      qc.invalidateQueries({ queryKey: ['event-installments'] });
    },
    onError: (err: any) => toast.error('Erro ao criar parcelas: ' + err.message),
  });
}

/** Update a single installment (mark as paid, add receipt, etc) */
export function useUpdateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await (supabase as any)
        .from('registration_installments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Installment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['installments', data.registration_id] });
      qc.invalidateQueries({ queryKey: ['event-installments'] });
    },
    onError: (err: any) => toast.error('Erro ao atualizar parcela: ' + err.message),
  });
}

/** Mark an installment as paid */
export function useMarkInstallmentPaid() {
  const updateInstallment = useUpdateInstallment();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, registrationId }: { id: string; registrationId: string }) => {
      // Mark installment as paid
      const { error } = await (supabase as any)
        .from('registration_installments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      // Check if ALL installments for this registration are now paid
      const { data: allInstallments } = await (supabase as any)
        .from('registration_installments')
        .select('status')
        .eq('registration_id', registrationId);

      const allPaid = allInstallments?.every((i: any) => i.status === 'paid');
      
      if (allPaid) {
        // Update registration status to confirmed + calculate total_paid
        const { data: installments } = await (supabase as any)
          .from('registration_installments')
          .select('amount')
          .eq('registration_id', registrationId);
        
        const totalPaid = installments?.reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
        
        await supabase
          .from('registrations')
          .update({ status: 'confirmed', total_paid: totalPaid } as any)
          .eq('id', registrationId);
      }

      return { allPaid };
    },
    onSuccess: (result) => {
      if (result.allPaid) {
        toast.success('Todas parcelas pagas! Inscrição confirmada ✅');
      } else {
        toast.success('Parcela marcada como paga!');
      }
      qc.invalidateQueries({ queryKey: ['installments'] });
      qc.invalidateQueries({ queryKey: ['event-installments'] });
      qc.invalidateQueries({ queryKey: ['event-registrations'] });
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}

// ============ HELPERS ============

/** Calculate installment amounts with rounding */
export function calcInstallmentAmounts(total: number, count: 2 | 3): number[] {
  const base = Math.floor((total / count) * 100) / 100;
  const last = +(total - base * (count - 1)).toFixed(2);
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? last : base));
}

/** Calculate the max allowed date for installments (event date - 10 days) */
export function calcMaxInstallmentDate(eventDate: string): Date {
  const d = new Date(eventDate);
  d.setDate(d.getDate() - 10);
  return d;
}

/** Generate WhatsApp link with pre-filled message */
export function generateWhatsAppLink(
  phone: string,
  athleteName: string,
  amount: number,
  installmentNumber: number,
  dueDate: string,
  portalUrl: string
): string {
  const formattedDate = new Date(dueDate).toLocaleDateString('pt-BR');
  const msg = encodeURIComponent(
    `Olá ${athleteName}! 🏃\n\n` +
    `Lembrete UAIROX: sua ${installmentNumber}ª parcela de R$ ${amount.toFixed(2)} ` +
    `vence em ${formattedDate}.\n\n` +
    `💰 Pague via PIX e envie o comprovante pelo portal:\n` +
    `👉 ${portalUrl}\n\n` +
    `Qualquer dúvida, estamos à disposição! 💪`
  );
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${fullPhone}?text=${msg}`;
}
