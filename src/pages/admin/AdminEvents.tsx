import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useUpdateEventStatus,
  useDuplicateEvent,
  EVENT_STATUS_MAP,
  type EventWithStats,
  type EventStatus,
  type EventType,
} from '@/hooks/useEvents';

// ============ STATUS BADGE ============
function StatusBadge({ status }: { status: string | null }) {
  const s = (status || 'planning') as EventStatus;
  const info = EVENT_STATUS_MAP[s] || EVENT_STATUS_MAP.planning;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${info.color}`}>
      {info.label}
    </span>
  );
}

const toLocalDatetimeLocal = (isoString?: string | null) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ============ EVENT FORM DIALOG ============
function EventFormDialog({
  event,
  open,
  onClose,
}: {
  event?: EventWithStats | null;
  open: boolean;
  onClose: () => void;
}) {
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const isEdit = !!event;

  const [title, setTitle] = useState(event?.title || '');
  const [date, setDate] = useState(toLocalDatetimeLocal(event?.date));
  const [endDate, setEndDate] = useState(toLocalDatetimeLocal(event?.end_date));
  const [location, setLocation] = useState(event?.location || '');
  const [description, setDescription] = useState(event?.description || '');
  const [status, setStatus] = useState<EventStatus>((event?.status as EventStatus) || 'planning');
  const [imageUrl, setImageUrl] = useState(event?.image_url || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(event?.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState(event?.whatsapp_group_link || '');
  const [slug, setSlug] = useState((event as any)?.slug || '');
  const [requireShirtSize, setRequireShirtSize] = useState((event as any)?.require_shirt_size || false);
  const [eventType, setEventType] = useState<EventType>((event?.event_type as EventType) || 'oficial');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !location.trim()) return;

    let finalImageUrl = imageUrl;

    if (imageFile) {
      setUploading(true);
      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `cover-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-assets')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('event-assets')
          .getPublicUrl(fileName);

        finalImageUrl = urlData.publicUrl;
      } catch (err: any) {
        console.error("Erro no upload da imagem:", err);
        setUploading(false);
        return; // não prossegue se falhar a imagem
      }
    }

    const payload: any = {
      title: title.trim(),
      date: new Date(date).toISOString(),
      location: location.trim(),
      description: description.trim() || null,
      status,
      event_type: eventType,
      image_url: finalImageUrl.trim() || null,
      whatsapp_group_link: whatsappLink.trim() || null,
      slug: slug.trim() || null,
      require_shirt_size: requireShirtSize,
    };
    if (endDate) payload.end_date = new Date(endDate).toISOString();

    if (isEdit) {
      await updateEvent.mutateAsync({ id: event!.id, ...payload });
    } else {
      await createEvent.mutateAsync(payload);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[#1a1a1a]">
          <h2 className="text-xl font-black text-white">{isEdit ? 'Editar Evento' : 'Novo Evento'}</h2>
          <p className="text-sm text-zinc-500 mt-1">{isEdit ? 'Atualize os dados do evento' : 'Preencha os dados para criar um novo evento UAIROX'}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Nome do Evento *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: UAIROX Betim 2026"
              className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white font-bold text-lg placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Date + End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Data de Início *</label>
              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white focus:border-[#EDAC02] focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Data de Término</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white focus:border-[#EDAC02] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Local *</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Ex: Centro Esportivo do Sesi - Betim, MG"
              className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Uma breve descrição sobre este evento..."
              rows={3}
              className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Status</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(EVENT_STATUS_MAP) as [EventStatus, { label: string; color: string }][]).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                    status === key
                      ? 'border-[#EDAC02] bg-[#EDAC02]/10 text-[#EDAC02]'
                      : 'border-[#262626] bg-[#050505] text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Tipo de Evento</label>
            <div className="grid grid-cols-2 gap-2">
              {([['experience', '🏋️ Experience (Simulado)'], ['oficial', '🏆 Oficial']] as [EventType, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEventType(key)}
                  className={`p-3 rounded-lg border text-sm font-bold transition-all ${
                    eventType === key
                      ? 'border-[#EDAC02] bg-[#EDAC02]/10 text-[#EDAC02]'
                      : 'border-[#262626] bg-[#050505] text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Imagem de Capa do Evento</label>
            <p className="text-[10px] text-zinc-500 mb-2">Tamanho recomendado: 1920x1080 pixels (Formato Horizontal 16:9).</p>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-[#262626]">
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview da Capa" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setImageUrl(''); }} className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white rounded-full p-2 hover:bg-red-500 transition-colors shadow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-[#262626] hover:border-[#EDAC02] rounded-lg cursor-pointer bg-[#050505] transition-colors group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-2 group-hover:text-[#EDAC02] transition-colors"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <p className="text-sm text-zinc-400 font-bold">Clique para enviar a foto (Upload)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }} />
                </label>
              )}
            </div>
            {!imageFile && !imagePreview && (
              <div className="mt-4 border-t border-[#1a1a1a] pt-4">
                 <p className="text-xs text-zinc-500 font-bold mb-2 uppercase tracking-widest">Ou insira o Link da Imagem diretamente:</p>
                 <input type="url" value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImagePreview(e.target.value); }} placeholder="https://exemplo.com/minha-imagem.jpg" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none transition-colors" />
              </div>
            )}
          </div>

          {/* WhatsApp Link */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Link do Grupo WhatsApp</label>
            <input
              type="url"
              value={whatsappLink}
              onChange={e => setWhatsappLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none transition-colors"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Slug da URL (Link Amigável)</label>
            <div className="flex items-center gap-0">
              <span className="bg-[#111] border border-r-0 border-[#262626] rounded-l-lg px-3 py-3 text-sm text-zinc-500 whitespace-nowrap select-none">uairox.com.br/evento/</span>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="ex: cfit"
                className="flex-1 bg-[#050505] border border-[#262626] rounded-r-lg p-3 text-white text-sm font-mono placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5">Opcional. Apenas letras minúsculas, números e hífens. Ex: <span className="text-zinc-400 font-mono">cfit</span>, <span className="text-zinc-400 font-mono">uairox-7-edicao</span></p>
          </div>

          {/* Shirt Size Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#050505] border border-[#262626] rounded-lg">
            <div>
              <p className="text-sm font-bold text-white">Solicitar Tamanho de Camisa</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Exibir campo de tamanho de camisa no formulário de inscrição</p>
            </div>
            <button
              type="button"
              onClick={() => setRequireShirtSize(!requireShirtSize)}
              className={`w-11 h-6 rounded-full transition-colors relative ${requireShirtSize ? 'bg-[#EDAC02]' : 'bg-[#262626]'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${requireShirtSize ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#1a1a1a]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-[#262626] rounded-lg text-zinc-400 font-bold hover:bg-[#111] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createEvent.isPending || updateEvent.isPending || uploading}
              className="flex-1 py-3 bg-[#EDAC02] text-black font-black rounded-lg hover:bg-[#d49b02] transition-colors disabled:opacity-50"
            >
              {createEvent.isPending || updateEvent.isPending || uploading ? 'Salvando...' : (isEdit ? 'Salvar Alterações' : 'Criar Evento')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ DELETE CONFIRM DIALOG ============
function DeleteConfirmDialog({
  event,
  open,
  onClose,
}: {
  event: EventWithStats | null;
  open: boolean;
  onClose: () => void;
}) {
  const deleteEvent = useDeleteEvent();

  if (!open || !event) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-red-500/30 rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-black text-white mb-2">Excluir Evento</h3>
          <p className="text-sm text-zinc-400 mb-1">
            Tem certeza que deseja excluir <span className="text-white font-bold">{event.title}</span>?
          </p>
          <p className="text-xs text-red-400 mb-6">
            ⚠️ Todas as inscrições, categorias e baterias serão excluídas permanentemente.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-[#262626] rounded-lg text-zinc-400 font-bold hover:bg-[#111] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              await deleteEvent.mutateAsync(event.id);
              onClose();
            }}
            disabled={deleteEvent.isPending}
            className="flex-1 py-3 bg-red-600 text-white font-black rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleteEvent.isPending ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventCard({
  event,
  onConfig,
  onEditDetails,
  onDelete,
  onDuplicate,
  onStatusChange,
}: {
  event: EventWithStats;
  onConfig: () => void;
  onEditDetails: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStatusChange: (status: EventStatus) => void;
}) {
  const eventDate = new Date(event.date);
  const daysUntil = differenceInDays(eventDate, new Date());
  const isEventPast = isPast(eventDate);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const daysLabel = isEventPast
    ? 'Encerrado'
    : daysUntil === 0
    ? '🔥 HOJE!'
    : `${daysUntil} dias`;

  return (
    <div className="group bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden hover:border-[#EDAC02]/30 transition-all duration-300">
      {/* Cover Image */}
      <div className="aspect-video relative overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#EDAC02]/20 via-[#0a0a0a] to-[#0a0a0a] flex items-center justify-center">
            <span className="text-6xl font-black text-[#EDAC02]/10 select-none">{event.title.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={event.status} />
        </div>

        {/* Days counter & Link */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-lg ${
            isEventPast ? 'bg-zinc-800 text-zinc-500' :
            daysUntil <= 7 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
            daysUntil <= 30 ? 'bg-[#EDAC02]/20 text-[#EDAC02] border border-[#EDAC02]/30' :
            'bg-zinc-800 text-zinc-400'
          }`}>
            {daysLabel}
          </span>
          {((event as any).slug || event.id) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const url = `https://www.uairox.com.br/evento/${(event as any).slug || event.id}`;
                navigator.clipboard.writeText(url);
                toast.success('Link do evento copiado!');
              }}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-[#262626] hover:border-[#EDAC02] hover:text-[#EDAC02] transition-colors shadow-lg flex items-center gap-1.5"
              title="Copiar link público"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Copiar Link
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-black text-white mb-1 line-clamp-1">{event.title}</h3>
        <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {format(eventDate, "dd MMM yyyy", { locale: ptBR })}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {event.location.length > 25 ? event.location.slice(0, 25) + '...' : event.location}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#050505] rounded-lg p-2.5 text-center border border-[#1a1a1a]">
            <p className="text-lg font-black text-white">{event._registrations_count}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Inscritos</p>
          </div>
          <div className="bg-[#050505] rounded-lg p-2.5 text-center border border-[#1a1a1a]">
            <p className="text-lg font-black text-white">{event._categories_count}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Categorias</p>
          </div>
          <div className="bg-[#050505] rounded-lg p-2.5 text-center border border-[#1a1a1a]">
            <p className="text-lg font-black text-[#EDAC02]">
              R${event._revenue > 999 ? (event._revenue / 1000).toFixed(1) + 'k' : event._revenue.toFixed(0)}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Receita</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onConfig}
            className="flex-[2] py-2.5 bg-[#111] border border-[#262626] rounded-lg text-sm font-bold text-white hover:border-[#EDAC02]/50 transition-colors"
          >
            ⚙️ Configurar
          </button>
          <button
            onClick={onEditDetails}
            className="flex-1 py-2.5 bg-[#111] border border-[#262626] rounded-lg text-sm font-bold text-white hover:border-[#EDAC02]/50 transition-colors"
            title="Editar Informações Básicas"
          >
            ✏️
          </button>
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="py-2.5 px-3 bg-[#111] border border-[#262626] rounded-lg text-sm hover:border-zinc-600 transition-colors"
              title="Alterar status"
            >
              ⋮
            </button>
            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                <div className="absolute right-0 bottom-full mb-1 z-50 bg-[#0a0a0a] border border-[#262626] rounded-lg py-1 min-w-[180px] shadow-xl">
                  {(Object.entries(EVENT_STATUS_MAP) as [EventStatus, { label: string }][]).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => {
                        onStatusChange(key);
                        setShowStatusMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[#111] transition-colors ${
                        event.status === key ? 'text-[#EDAC02] font-bold' : 'text-zinc-400'
                      }`}
                    >
                      {event.status === key ? '✓ ' : '  '}{val.label}
                    </button>
                  ))}
                  <div className="border-t border-[#262626] my-1" />
                  <button
                    onClick={() => {
                      onDuplicate();
                      setShowStatusMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#EDAC02] hover:bg-[#EDAC02]/10 transition-colors"
                  >
                    📋 Duplicar Evento
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      setShowStatusMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    🗑️ Excluir Evento
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============
export default function AdminEvents() {
  const { data: events, isLoading } = useEvents();
  const updateStatus = useUpdateEventStatus();
  const duplicateEvent = useDuplicateEvent();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithStats | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventWithStats | null>(null);
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all');

  const filteredEvents = filterStatus === 'all'
    ? events
    : events?.filter(e => e.status === filterStatus);

  // Stats
  const totalEvents = events?.length || 0;
  const openEvents = events?.filter(e => e.status === 'open').length || 0;
  const totalRegistrations = events?.reduce((sum, e) => sum + e._registrations_count, 0) || 0;
  const totalRevenue = events?.reduce((sum, e) => sum + e._revenue, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Eventos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gerencie todos os eventos UAIROX</p>
        </div>
        <button
          onClick={() => { setEditingEvent(null); setShowForm(true); }}
          className="px-5 py-2.5 bg-[#EDAC02] text-black font-black rounded-lg hover:bg-[#d49b02] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Evento
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total</p>
          <p className="text-2xl font-black text-white">{totalEvents}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Abertos</p>
          <p className="text-2xl font-black text-green-400">{openEvents}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Inscrições</p>
          <p className="text-2xl font-black text-white">{totalRegistrations}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Receita</p>
          <p className="text-2xl font-black text-[#EDAC02]">
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {([['all', 'Todos'], ...Object.entries(EVENT_STATUS_MAP).map(([k, v]) => [k, v.label])] as [string, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
              filterStatus === key
                ? 'border-[#EDAC02] bg-[#EDAC02]/10 text-[#EDAC02]'
                : 'border-[#262626] text-zinc-500 hover:border-zinc-600'
            }`}
          >
            {label}
            {key !== 'all' && (
              <span className="ml-1.5 text-zinc-600">
                ({events?.filter(e => e.status === key).length || 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onConfig={() => navigate(`/admin/events/${event.id}`)}
              onEditDetails={() => { setEditingEvent(event); setShowForm(true); }}
              onDelete={() => setDeletingEvent(event)}
              onDuplicate={() => {
                if (confirm('Deseja duplicar este evento? (As categorias e lotes também serão copiados)')) {
                  duplicateEvent.mutate(event);
                }
              }}
              onStatusChange={(status) => updateStatus.mutate({ id: event.id, status })}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
          <div className="w-20 h-20 rounded-full bg-[#EDAC02]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-[#EDAC02]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Nenhum evento encontrado</h3>
          <p className="text-sm text-zinc-500 mb-4">
            {filterStatus !== 'all' ? 'Nenhum evento com esse status.' : 'Crie seu primeiro evento UAIROX!'}
          </p>
          {filterStatus === 'all' && (
            <button
              onClick={() => { setEditingEvent(null); setShowForm(true); }}
              className="px-6 py-2.5 bg-[#EDAC02] text-black font-black rounded-lg hover:bg-[#d49b02] transition-colors"
            >
              + Criar Primeiro Evento
            </button>
          )}
        </div>
      )}

      {/* Form Dialog */}
      {showForm && (
        <EventFormDialog
          event={editingEvent}
          open={showForm}
          onClose={() => { setShowForm(false); setEditingEvent(null); }}
        />
      )}

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        event={deletingEvent}
        open={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
      />
    </div>
  );
}
