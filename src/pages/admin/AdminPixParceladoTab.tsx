import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEventInstallments, useMarkInstallmentPaid, generateWhatsAppLink } from "@/hooks/useInstallments";

const cardClass = "bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl shadow-xl";

export default function AdminPixParceladoTab({ eventId }: { eventId: string }) {
  const { data: installments = [], isLoading } = useEventInstallments(eventId);
  const markPaid = useMarkInstallmentPaid();
  const [expandedRegId, setExpandedRegId] = useState<string | null>(null);

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Carregando parcelas...</div>;

  // Group by registration
  const grouped = installments.reduce((acc, curr) => {
    if (!acc[curr.registration_id]) {
      acc[curr.registration_id] = {
        reg: curr.registrations,
        installments: []
      };
    }
    acc[curr.registration_id].installments.push(curr);
    return acc;
  }, {} as Record<string, { reg: any, installments: any[] }>);

  const athletes = Object.values(grouped).sort((a, b) => a.reg.athlete_name.localeCompare(b.reg.athlete_name));

  if (athletes.length === 0) {
    return (
      <div className={`${cardClass} p-12 text-center`}>
        <span className="text-4xl mb-4 block">💰</span>
        <h3 className="text-lg font-bold text-white">Nenhum PIX Parcelado</h3>
        <p className="text-zinc-500 text-sm mt-1">Nenhum atleta se inscreveu com parcelamento neste evento ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {athletes.map(({ reg, installments }) => {
        const total = installments.reduce((sum, i) => sum + Number(i.amount), 0);
        const paid = installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);
        const isExpanded = expandedRegId === reg.id;
        const allPaid = paid >= total;

        return (
          <div key={reg.id} className={`${cardClass} overflow-hidden`}>
            <div 
              className={`p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-zinc-900/50 ${isExpanded ? 'bg-zinc-900' : ''}`}
              onClick={() => setExpandedRegId(isExpanded ? null : reg.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${allPaid ? 'bg-green-500/20 text-green-500' : 'bg-[#EDAC02]/20 text-[#EDAC02]'}`}>
                  {allPaid ? '✓' : '!'}
                </div>
                <div>
                  <p className="text-sm font-bold text-white uppercase">{reg.athlete_name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{reg.athlete_phone} • {reg.athlete_email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Progresso</p>
                  <p className="text-sm font-bold text-white">
                    R$ {paid.toFixed(2)} <span className="text-zinc-600 font-normal">/ R$ {total.toFixed(2)}</span>
                  </p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${allPaid ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-[#EDAC02]/30 text-[#EDAC02] bg-[#EDAC02]/10'}`}>
                  {allPaid ? 'QUITADO' : 'EM ABERTO'}
                </div>
                <span className="text-zinc-600">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-[#1a1a1a] p-4 bg-zinc-900/20 overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="text-zinc-500 border-b border-[#1a1a1a]">
                      <th className="pb-2 font-bold uppercase tracking-wider">Parcela</th>
                      <th className="pb-2 font-bold uppercase tracking-wider">Vencimento</th>
                      <th className="pb-2 font-bold uppercase tracking-wider">Valor</th>
                      <th className="pb-2 font-bold uppercase tracking-wider">Status</th>
                      <th className="pb-2 font-bold uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((inst) => {
                      const isPaid = inst.status === 'paid';
                      const isOverdue = inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.due_date + 'T12:00:00') < new Date());
                      
                      return (
                        <tr key={inst.id} className="border-b border-[#1a1a1a]/50 last:border-0">
                          <td className="py-3 font-medium text-zinc-300">{inst.installment_number}ª Parcela</td>
                          <td className="py-3 text-zinc-400">{format(new Date(inst.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                          <td className="py-3 text-zinc-300 font-mono">R$ {Number(inst.amount).toFixed(2)}</td>
                          <td className="py-3">
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">PAGO</span>
                            ) : isOverdue ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">ATRASADA</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">PENDENTE</span>
                            )}
                          </td>
                          <td className="py-3 text-right space-x-2">
                            {!isPaid && (
                              <>
                                <a 
                                  href={generateWhatsAppLink(reg.athlete_phone, reg.athlete_name, Number(inst.amount), inst.installment_number, inst.due_date, 'https://uairox.com.br')} 
                                  target="_blank" rel="noreferrer"
                                  className="inline-flex items-center px-2 py-1 rounded bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors border border-[#25D366]/20 font-bold"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  WhatsApp
                                </a>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if(confirm('Confirmar baixa manual desta parcela?')) {
                                      markPaid.mutate({ id: inst.id, registrationId: reg.id });
                                    }
                                  }}
                                  disabled={markPaid.isPending}
                                  className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors border border-zinc-700 font-bold disabled:opacity-50"
                                >
                                  {markPaid.isPending ? '...' : 'Dar Baixa'}
                                </button>
                              </>
                            )}
                            {isPaid && inst.paid_at && (
                              <span className="text-zinc-600 text-[10px]">Pago em {format(new Date(inst.paid_at), 'dd/MM/yyyy')}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
