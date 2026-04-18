import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvent, useUpdateEvent, EVENT_STATUS_MAP, type EventStatus } from '@/hooks/useEvents';
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useEventStages, useCreateEventStage, useUpdateEventStage, useDeleteEventStage,
  usePriceBatches, useCreatePriceBatch, useUpdatePriceBatch, useDeletePriceBatch,
  useDiscountCoupons, useCreateDiscountCoupon, useUpdateDiscountCoupon, useDeleteDiscountCoupon,
  useAthleteKits, useCreateAthleteKit, useUpdateAthleteKit, useDeleteAthleteKit,
  useEventRegistrations, useEventStats,
  useHeats, useCreateHeat, useUpdateHeat, useDeleteHeat,
  useLaneAssignments, useAutoGenerateHeats, useCategoryRegCounts,
} from '@/hooks/useEventConfig';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ============ Shared Components / Styles ============
const GOLD = '#EDAC02';
const inputClass = "w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none transition-colors";
const labelClass = "block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2";
const cardClass = "bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl";
const btnGold = "px-4 py-2.5 bg-[#EDAC02] text-black font-black rounded-lg hover:bg-[#d49b02] transition-colors text-sm";
const btnOutline = "px-4 py-2.5 border border-[#262626] rounded-lg text-zinc-400 font-bold hover:bg-[#111] hover:border-zinc-500 transition-colors text-sm";
const emptyState = (text: string) => (
  <div className="text-center py-12 text-zinc-600">
    <p className="text-sm">{text}</p>
  </div>
);

// ============ Generic Modal ============
function Modal({ open, onClose, title, subtitle, children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-[#1a1a1a]">
          <h3 className="text-lg font-black text-white">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ============ TAB: OVERVIEW ============
function OverviewTab({ eventId }: { eventId: string }) {
  const { data: stats } = useEventStats(eventId);
  const { data: stages } = useEventStages(eventId);
  const { data: categories } = useCategories(eventId);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* KPIs */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Indicadores</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Inscritos', value: stats?.total || 0, color: 'text-white' },
            { label: 'Confirmados', value: stats?.confirmed || 0, color: 'text-green-400' },
            { label: 'Pendentes', value: stats?.pending || 0, color: 'text-yellow-400' },
            { label: 'Receita', value: `R$ ${(stats?.revenue || 0).toFixed(2)}`, color: `text-[${GOLD}]` },
          ].map((kpi, i) => (
            <div key={i} className={`${cardClass} p-4`}>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Categories breakdown */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Por Categoria</h3>
        <div className="space-y-2">
          {stats?.byCategory?.map(cat => (
            <div key={cat.id} className={`${cardClass} p-3 flex items-center justify-between`}>
              <span className="text-sm text-white">{cat.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400">{cat.count} inscritos</span>
                <span className="text-xs text-[#EDAC02] font-bold">R$ {cat.revenue.toFixed(2)}</span>
              </div>
            </div>
          ))}
          {(!stats?.byCategory || stats.byCategory.length === 0) && emptyState('Nenhuma inscrição ainda')}
        </div>
      </div>
    </div>
  );
}

// ============ TAB: PROVAS (EVENT STAGES) ============
function ProvasTab({ eventId }: { eventId: string }) {
  const { data: stages } = useEventStages(eventId);
  const createStage = useCreateEventStage();
  const updateStage = useUpdateEventStage();
  const deleteStage = useDeleteEventStage();

  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weightLoad, setWeightLoad] = useState('');
  const [metricText, setMetricText] = useState('');
  const [distance, setDistance] = useState('');
  const [lapCount, setLapCount] = useState('1');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('stages').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('stages').getPublicUrl(fileName);
      setImageUrl(data.publicUrl);
    } catch (err: any) {
      toast.error('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const openForm = (stage?: any) => {
    if (stage) {
      setEditing(stage);
      setName(stage.name);
      setDescription(stage.description || '');
      setWeightLoad(stage.weight_load || '');
      setMetricText(stage.metric_text || '');
      setDistance(String(stage.distance_meters || ''));
      setLapCount(String(stage.lap_count || 1));
      setImageUrl(stage.image_url || '');
    } else {
      setEditing(null);
      setName('');
      setDescription('');
      setWeightLoad('');
      setMetricText('');
      setDistance('');
      setLapCount('1');
      setImageUrl('');
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const data: any = {
      event_id: eventId,
      name: name.trim(),
      description: description.trim() || null,
      weight_load: weightLoad.trim() || null,
      metric_text: metricText.trim() || null,
      distance_meters: distance ? parseInt(distance) : null,
      lap_count: parseInt(lapCount) || 1,
      image_url: imageUrl || null,
    };
    if (editing) {
      await updateStage.mutateAsync({ id: editing.id, ...data });
    } else {
      data.order_index = (stages?.length || 0) + 1;
      await createStage.mutateAsync(data);
    }
    setShowForm(false);
  };

  // Imagens Oficiais convertidas da Homepage pelo Supabase Storage
  const defaultImages = [
    'https://dhetcnkvgtuatcchropm.supabase.co/storage/v1/object/public/stages/preset_skierg.webp', 
    'https://dhetcnkvgtuatcchropm.supabase.co/storage/v1/object/public/stages/preset_sledpush.webp', 
    'https://dhetcnkvgtuatcchropm.supabase.co/storage/v1/object/public/stages/preset_sledpull.webp', 
    'https://dhetcnkvgtuatcchropm.supabase.co/storage/v1/object/public/stages/preset_burpeebroadjumps.webp', 
    'https://dhetcnkvgtuatcchropm.supabase.co/storage/v1/object/public/stages/preset_rowing.webp', 
    'https://dhetcnkvgtuatcchropm.supabase.co/storage/v1/object/public/stages/preset_farmerscarry.webp', 
    'https://dhetcnkvgtuatcchropm.supabase.co/storage/v1/object/public/stages/preset_sandbaglunges.webp', 
    'https://dhetcnkvgtuatcchropm.supabase.co/storage/v1/object/public/stages/preset_wallballs.webp'  
  ];

  const TEMPLATES = [
    {
      id: 'simulado',
      name: 'Simulado Experience',
      icon: '🟡',
      runDistance: 400,
      description: 'Formato reduzido. Corrida de 400m entre cada zona funcional.',
      color: 'border-yellow-500/40 bg-yellow-500/5',
      badgeColor: 'bg-yellow-500/20 text-yellow-400',
      zones: [
        { zone: 1, name: 'SKIERG', distance_meters: 800, weight_load: 'Carga Livre (Início)', image_url: defaultImages[0] },
        { zone: 2, name: 'SLED PUSH', distance_meters: 50, weight_load: '70 Kg / 50 Kg', image_url: defaultImages[1] },
        { zone: 3, name: 'SLED PULL', distance_meters: 50, weight_load: '60 Kg / 40 Kg', image_url: defaultImages[2] },
        { zone: 4, name: 'BURPEE BROAD JUMP', distance_meters: 80, weight_load: '', image_url: defaultImages[3] },
        { zone: 5, name: 'ROWERG', distance_meters: 800, weight_load: 'Carga Livre (Início)', image_url: defaultImages[4] },
        { zone: 6, name: 'FARMER CARRY', distance_meters: 200, weight_load: '24 Kg x 2 / 16 Kg x 2', image_url: defaultImages[5] },
        { zone: 7, name: 'SANDBAG LUNGES', distance_meters: 100, weight_load: '20 Kg / 10 Kg', image_url: defaultImages[6] },
        { zone: 8, name: 'WALL BALLS', distance_meters: null, metric_text: '80 REPS', weight_load: '14 LB / 10 LB', image_url: defaultImages[7] },
      ],
    },
    {
      id: 'experience',
      name: 'UAIROX Experience',
      icon: '🟠',
      runDistance: 500,
      description: 'Formato intermediário. Corrida de 500m entre cada zona funcional.',
      color: 'border-orange-500/40 bg-orange-500/5',
      badgeColor: 'bg-orange-500/20 text-orange-400',
      zones: [
        { zone: 1, name: 'SKIERG', distance_meters: 800, weight_load: 'Carga Livre (Início)', image_url: defaultImages[0] },
        { zone: 2, name: 'SLED PUSH', distance_meters: 50, weight_load: '90 Kg / 60 Kg', image_url: defaultImages[1] },
        { zone: 3, name: 'SLED PULL', distance_meters: 50, weight_load: '70 Kg / 40 Kg', image_url: defaultImages[2] },
        { zone: 4, name: 'BURPEE BROAD JUMP', distance_meters: 80, weight_load: '', image_url: defaultImages[3] },
        { zone: 5, name: 'ROWERG', distance_meters: 800, weight_load: 'Carga Livre (Início)', image_url: defaultImages[4] },
        { zone: 6, name: 'FARMER CARRY', distance_meters: 200, weight_load: '24 Kg x 2 / 16 Kg x 2', image_url: defaultImages[5] },
        { zone: 7, name: 'SANDBAG LUNGES', distance_meters: 100, weight_load: '20 Kg / 10 Kg', image_url: defaultImages[6] },
        { zone: 8, name: 'WALL BALLS', distance_meters: null, metric_text: '80 REPS', weight_load: '14 LB / 10 LB', image_url: defaultImages[7] },
      ],
    },
    {
      id: 'oficial',
      name: 'UAIROX Oficial',
      icon: '🏆',
      runDistance: 1000,
      description: 'Formato oficial completo. Corrida de 1km entre cada zona funcional.',
      color: 'border-[#EDAC02]/40 bg-[#EDAC02]/5',
      badgeColor: 'bg-[#EDAC02]/20 text-[#EDAC02]',
      zones: [
        { zone: 1, name: 'SKIERG', distance_meters: 1000, weight_load: 'Carga Livre (Início)', image_url: defaultImages[0] },
        { zone: 2, name: 'SLED PUSH', distance_meters: 50, weight_load: '120 Kg / 70 Kg', image_url: defaultImages[1] },
        { zone: 3, name: 'SLED PULL', distance_meters: 50, weight_load: '90 Kg / 50 Kg', image_url: defaultImages[2] },
        { zone: 4, name: 'BURPEE BROAD JUMP', distance_meters: 80, weight_load: '', image_url: defaultImages[3] },
        { zone: 5, name: 'ROWERG', distance_meters: 1000, weight_load: 'Carga Livre (Início)', image_url: defaultImages[4] },
        { zone: 6, name: 'FARMER CARRY', distance_meters: 200, weight_load: '24 Kg x 2 / 16 Kg x 2', image_url: defaultImages[5] },
        { zone: 7, name: 'SANDBAG LUNGES', distance_meters: 100, weight_load: '20 Kg / 10 Kg', image_url: defaultImages[6] },
        { zone: 8, name: 'WALL BALLS', distance_meters: null, metric_text: '100 REPS', weight_load: '14 LB / 10 LB', image_url: defaultImages[7] },
      ],
    },
  ];

  const applyTemplate = async (template: typeof TEMPLATES[0]) => {
    const hasStages = stages && stages.length > 0;
    if (hasStages && !confirm(`Isso vai substituir as ${stages.length} prova(s) existente(s) com o modelo "${template.name}". Continuar?`)) return;

    // Delete existing stages first
    if (hasStages) {
      for (const s of stages) {
        await deleteStage.mutateAsync({ id: s.id, event_id: eventId });
      }
    }

    // Build sequence: RUN → UAIZONE → RUN → UAIZONE → ... (8x)
    const stagesToCreate: any[] = [];
    template.zones.forEach((zone, idx) => {
      stagesToCreate.push({
        event_id: eventId,
        name: `🏃 RUN ${template.runDistance}m`,
        description: `Corrida de ${template.runDistance} metros`,
        distance_meters: template.runDistance,
        lap_count: 1,
        order_index: idx * 2 + 1,
      });
      stagesToCreate.push({
        event_id: eventId,
        name: `UAIZONE ${zone.zone} – ${zone.name}`,
        description: `Instrução padrão.`,
        weight_load: zone.weight_load,
        metric_text: zone.metric_text,
        distance_meters: zone.distance_meters,
        image_url: zone.image_url,
        lap_count: 1,
        order_index: idx * 2 + 2,
      });
    });

    for (const s of stagesToCreate) {
      await createStage.mutateAsync(s);
    }
    setShowTemplates(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Provas do Evento</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Defina as provas/etapas que os atletas vão realizar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(true)} className={btnOutline}>
            📋 Usar Modelo
          </button>
          <button onClick={() => openForm()} className={btnGold}>+ Nova Prova</button>
        </div>
      </div>

      {/* Stages List */}
      <div className="space-y-1.5">
        {stages?.map((stage: any, idx: number) => {
          const isRun = stage.name.startsWith('🏃') || stage.name.toUpperCase().startsWith('RUN ');
          const zoneMatch = stage.name.match(/UAIZONE\s+(\d+)/i);
          const zoneNum = zoneMatch ? parseInt(zoneMatch[1]) : null;
          return (
            <div key={stage.id} className={`${cardClass} p-3.5 flex items-center justify-between group ${isRun ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-lg font-black flex items-center justify-center text-sm flex-shrink-0 ${
                  isRun ? 'bg-zinc-800/50 text-zinc-500' : 'bg-[#EDAC02]/10 text-[#EDAC02]'
                }`}>
                  {isRun ? '🏃' : zoneNum || Math.ceil((idx + 1) / 2)}
                </span>
                <div>
                  <p className={`font-bold text-sm ${isRun ? 'text-zinc-500' : 'text-white'}`}>{stage.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {stage.description && <span className="text-[11px] text-zinc-600">{stage.description}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openForm(stage)} className="p-1.5 rounded-lg hover:bg-[#111] text-zinc-500 hover:text-white transition-colors text-sm">✏️</button>
                <button onClick={() => deleteStage.mutate({ id: stage.id, event_id: eventId })} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors text-sm">🗑️</button>
              </div>
            </div>
          );
        })}
        {(!stages || stages.length === 0) && (
          <div className="text-center py-10 space-y-4">
            <p className="text-zinc-600 text-sm">Nenhuma prova cadastrada ainda.</p>
            <button onClick={() => setShowTemplates(true)} className={btnGold}>
              📋 Escolher um Modelo Pronto
            </button>
          </div>
        )}
      </div>

      {/* ===== TEMPLATE SELECTOR MODAL ===== */}
      <Modal open={showTemplates} onClose={() => setShowTemplates(false)} title="Modelos de Prova UAIROX" subtitle="Selecione um formato para preencher automaticamente as 8 UaiZones + corridas">
        <div className="space-y-4">
          {TEMPLATES.map(tpl => (
            <div key={tpl.id} className={`border rounded-xl p-4 transition-all ${tpl.color}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{tpl.icon}</span>
                    <h4 className="font-black text-white text-sm">{tpl.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tpl.badgeColor}`}>
                      RUN {tpl.runDistance}m
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{tpl.description}</p>
                </div>
                <button
                  onClick={() => applyTemplate(tpl)}
                  disabled={createStage.isPending || deleteStage.isPending}
                  className={`${btnGold} flex-shrink-0 disabled:opacity-50`}
                >
                  {(createStage.isPending || deleteStage.isPending) ? '...' : 'Aplicar'}
                </button>
              </div>
              {/* Zone preview grid */}
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                {tpl.zones.map(zone => (
                  <div key={zone.zone} className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-2 text-center">
                    <p className="text-[10px] font-black text-[#EDAC02]">UZ {zone.zone}</p>
                    <p className="text-[9px] text-zinc-400 font-bold leading-tight mt-0.5">{zone.name}</p>
                    <p className="text-[9px] text-zinc-600 mt-0.5">{zone.metric_text || (zone.distance_meters ? `${zone.distance_meters}m` : zone.weight_load)}</p>
                  </div>
                ))}
              </div>
              {/* Run info */}
              <div className="mt-2 flex items-center gap-1.5 text-zinc-600">
                <span className="text-[10px]">🏃 {tpl.runDistance}m entre cada zona •</span>
                <span className="text-[10px]">Total: {tpl.zones.length * 2} etapas (corridas + funcionais)</span>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* ===== STAGE FORM MODAL ===== */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Prova' : 'Nova Prova'} subtitle="Defina os detalhes desta etapa">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nome da Prova *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: UAIZONE 1 – SKIERG" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Carga do Movimento (Ex: 2x 24KG)</label>
            <input value={weightLoad} onChange={e => setWeightLoad(e.target.value)} placeholder="Livres, 24kg, 80 reps..." className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Distância Opcional (metros)</label>
              <input type="number" value={distance} onChange={e => setDistance(e.target.value)} placeholder="1000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Ou Texto Customizado (Ex: 80 REPS)</label>
              <input type="text" value={metricText} onChange={e => setMetricText(e.target.value)} placeholder="80 REPS" className={inputClass} />
            </div>
          </div>
          {(name.toUpperCase().includes('RUN') || name.startsWith('🏃')) && (
            <div>
              <label className={labelClass}>Nº de Voltas</label>
              <select value={lapCount} onChange={e => setLapCount(e.target.value)} className={inputClass}>
                 {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} volta{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Imagem da Prova (Estilo HYROX)</label>
            {imageUrl ? (
              <div className="relative w-full h-32 mt-2 rounded-xl overflow-hidden border border-[#262626] group">
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 p-2 bg-black/80 hover:bg-red-500 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100">Trocar</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#262626] hover:border-[#EDAC02] rounded-xl text-zinc-500 cursor-pointer mt-2 transition-colors bg-[#0a0a0a]">
                {uploading ? (
                  <span className="text-sm font-bold text-[#EDAC02] animate-pulse">Enviando imagem...</span>
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span className="text-sm font-bold">Fazer Upload de Foto JPG/PNG</span>
                  </>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
              </label>
            )}
          </div>
          <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
            <button onClick={() => setShowForm(false)} className={`flex-1 ${btnOutline}`}>Cancelar</button>
            <button onClick={handleSave} disabled={createStage.isPending || updateStage.isPending || uploading} className={`flex-1 ${btnGold}`}>
              {editing ? 'Salvar' : 'Criar Prova'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============ TAB: CATEGORIAS ============
function CategoriasTab({ eventId }: { eventId: string }) {
  const { data: categories } = useCategories(eventId);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [teamSize, setTeamSize] = useState('1');
  const [gender, setGender] = useState('any');
  const [ageType, setAgeType] = useState('livre');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [price, setPrice] = useState('0');

  const genderLabels: Record<string, string> = {
    any: 'Qualquer',
    masculino: 'Masculino',
    feminino: 'Feminino',
    mixed_1m1f: 'Mista 1M+1F',
    mixed_2m2f: 'Mista 2M+2F',
  };

  const openForm = (cat?: any) => {
    if (cat) {
      setEditing(cat);
      setName(cat.name);
      setTeamSize(String(cat.team_size || 1));
      setGender(cat.gender_requirement || 'any');
      setAgeType(cat.age_type || 'livre');
      setMinAge(String(cat.min_age || ''));
      setMaxAge(String(cat.max_age || ''));
      setPrice(String(cat.price || 0));
    } else {
      setEditing(null);
      setName('');
      setTeamSize('1');
      setGender('any');
      setAgeType('livre');
      setMinAge('');
      setMaxAge('');
      setPrice('0');
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const data: any = {
      event_id: eventId,
      name: name.trim(),
      team_size: parseInt(teamSize) || 1,
      gender_requirement: gender,
      age_type: ageType,
      min_age: ageType === 'custom' ? parseInt(minAge) || null : null,
      max_age: ageType === 'custom' ? parseInt(maxAge) || null : null,
      price: parseFloat(price) || 0,
    };
    if (editing) {
      await updateCategory.mutateAsync({ id: editing.id, ...data });
    } else {
      await createCategory.mutateAsync(data);
    }
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Categorias</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Configure as categorias de inscrição</p>
        </div>
        <button onClick={() => openForm()} className={btnGold}>+ Nova Categoria</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories?.map((cat: any) => (
          <div key={cat.id} className={`${cardClass} p-4 group`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-white text-sm">{cat.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="px-2 py-0.5 rounded bg-[#EDAC02]/10 text-[10px] text-[#EDAC02] font-bold border border-[#EDAC02]/20">
                    {cat.team_size === 1 ? 'Individual' : `${cat.team_size} participantes`}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#111] text-[10px] text-zinc-400 border border-[#262626]">
                    {genderLabels[cat.gender_requirement] || cat.gender_requirement}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#111] text-[10px] text-zinc-400 border border-[#262626]">
                    {cat.age_type === 'livre' ? 'Idade Livre' : `${cat.min_age || 0}-${cat.max_age || '+'} anos`}
                  </span>
                </div>
                {cat.price > 0 && (
                  <p className="text-xs text-[#EDAC02] font-bold mt-2">R$ {Number(cat.price).toFixed(2)}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openForm(cat)} className="p-1.5 rounded hover:bg-[#111] text-zinc-500 text-xs">✏️</button>
                <button onClick={() => deleteCategory.mutate({ id: cat.id, event_id: eventId })} className="p-1.5 rounded hover:bg-red-500/10 text-zinc-500 text-xs">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {(!categories || categories.length === 0) && emptyState('Crie sua primeira categoria de inscrição!')}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Categoria' : 'Nova Categoria'}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Individual Masculino PRO" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Participantes</label>
              <select value={teamSize} onChange={e => setTeamSize(e.target.value)} className={inputClass}>
                <option value="1">Individual</option>
                <option value="2">Dupla</option>
                <option value="3">Trio</option>
                <option value="4">Quarteto</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Gênero</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className={inputClass}>
                {Object.entries(genderLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Faixa Etária</label>
            <select value={ageType} onChange={e => setAgeType(e.target.value)} className={inputClass}>
              <option value="livre">Idade Livre</option>
              <option value="custom">Personalizada</option>
            </select>
          </div>
          {ageType === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Idade Mín.</label><input type="number" value={minAge} onChange={e => setMinAge(e.target.value)} placeholder="18" className={inputClass} /></div>
              <div><label className={labelClass}>Idade Máx.</label><input type="number" value={maxAge} onChange={e => setMaxAge(e.target.value)} placeholder="35" className={inputClass} /></div>
            </div>
          )}
          <div>
            <label className={labelClass}>Preço Base (R$)</label>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={inputClass} />
          </div>
          <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
            <button onClick={() => setShowForm(false)} className={`flex-1 ${btnOutline}`}>Cancelar</button>
            <button onClick={handleSave} disabled={createCategory.isPending || updateCategory.isPending} className={`flex-1 ${btnGold}`}>
              {editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============ TAB: LOTES ============
function LotesTab({ eventId }: { eventId: string }) {
  const { data: batches } = usePriceBatches(eventId);
  const createBatch = useCreatePriceBatch();
  const updateBatch = useUpdatePriceBatch();
  const deleteBatch = useDeletePriceBatch();

  const { data: categories } = useCategories(eventId);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxRegs, setMaxRegs] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [orderIndex, setOrderIndex] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const openForm = (b?: any) => {
    if (b) {
      setEditing(b);
      setName(b.name);
      setPrice(String(b.price));
      setStartDate(b.start_date ? b.start_date.slice(0, 16) : '');
      setEndDate(b.end_date ? b.end_date.slice(0, 16) : '');
      setMaxRegs(String(b.max_registrations || ''));
      setPixKey(b.pix_key || '');
      setPaymentLink(b.payment_link || '');
      setOrderIndex(String(b.order_index || ''));
      setCategoryId(b.category_id || '');
    } else {
      setEditing(null);
      setName('');
      setPrice('');
      setStartDate('');
      setEndDate('');
      setMaxRegs('');
      setPixKey('');
      setPaymentLink('');
      setOrderIndex(String((batches?.length || 0) + 1));
      setCategoryId('');
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    const data: any = {
      event_id: eventId,
      name: name.trim(),
      price: parseFloat(price),
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      max_registrations: maxRegs ? parseInt(maxRegs) : null,
      pix_key: pixKey.trim() || null,
      payment_link: paymentLink.trim() || null,
      order_index: orderIndex ? parseInt(orderIndex) : 1,
      category_id: categoryId || null,
    };
    if (editing) {
      await updateBatch.mutateAsync({ id: editing.id, ...data });
    } else {
      await createBatch.mutateAsync(data);
    }
    setShowForm(false);
  };

  const isActive = (b: any) => {
    const now = new Date();
    const start = b.start_date ? new Date(b.start_date) : null;
    const end = b.end_date ? new Date(b.end_date) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return b.active !== false;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Lotes de Preço</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Configure os lotes de inscrição com valores e datas</p>
        </div>
        <button onClick={() => openForm()} className={btnGold}>+ Novo Lote</button>
      </div>

      <div className="space-y-2">
        {batches?.map((batch: any, idx: number) => (
          <div key={batch.id} className={`${cardClass} p-4 flex items-center justify-between group`}>
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${isActive(batch) ? 'bg-green-500' : 'bg-zinc-600'}`} title={isActive(batch) ? 'Ativo' : 'Inativo'} />
              <div>
                <p className="font-bold text-white text-sm">
                  {batch.name}
                  {batch.category_id && 
                    <span className="ml-2 px-2 py-0.5 rounded bg-[#EDAC02]/10 text-[#EDAC02] text-[10px] font-bold border border-[#EDAC02]/20 uppercase">
                      Lote Específico: {categories?.find(c => c.id === batch.category_id)?.name}
                    </span>
                  }
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-lg font-black text-[#EDAC02]">R$ {Number(batch.price).toFixed(2)}</span>
                  {batch.start_date && <span className="text-[10px] text-zinc-500">{format(new Date(batch.start_date), 'dd/MM/yy', { locale: ptBR })} → {batch.end_date ? format(new Date(batch.end_date), 'dd/MM/yy', { locale: ptBR }) : '∞'}</span>}
                  {batch.max_registrations && <span className="px-2 py-0.5 rounded bg-[#111] text-[10px] text-zinc-400 border border-[#262626]">Máx: {batch.max_registrations}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openForm(batch)} className="p-2 rounded-lg hover:bg-[#111] text-zinc-400 text-xs">✏️</button>
              <button onClick={() => deleteBatch.mutate({ id: batch.id, event_id: eventId })} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 text-xs">🗑️</button>
            </div>
          </div>
        ))}
        {(!batches || batches.length === 0) && emptyState('Nenhum lote de preço. Crie o primeiro!')}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Lote' : 'Novo Lote'}>
        <div className="space-y-4">
          <div><label className={labelClass}>Aplicar Lote À Categoria</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">Todas as Categorias do Evento (Lote Global)</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3"><label className={labelClass}>Nome *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: 1º Lote - Earlybird" className={inputClass} /></div>
            <div className="col-span-1"><label className={labelClass}>Ordem</label><input type="number" value={orderIndex} onChange={e => setOrderIndex(e.target.value)} placeholder="1" className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Preço (R$) *</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="150.00" className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Início</label><input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Término</label><input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Máx. Inscrições</label><input type="number" value={maxRegs} onChange={e => setMaxRegs(e.target.value)} placeholder="Ilimitado" className={inputClass} /></div>
          <div><label className={labelClass}>Chave PIX</label><input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, email ou telefone" className={inputClass} /></div>
          <div><label className={labelClass}>Link de Pagamento</label><input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} placeholder="https://..." className={inputClass} /></div>
          <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
            <button onClick={() => setShowForm(false)} className={`flex-1 ${btnOutline}`}>Cancelar</button>
            <button onClick={handleSave} className={`flex-1 ${btnGold}`}>{editing ? 'Salvar' : 'Criar Lote'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============ TAB: CUPONS ============
function CuponsTab({ eventId }: { eventId: string }) {
  const { data: coupons } = useDiscountCoupons(eventId);
  const { data: categories } = useCategories(eventId);
  const createCoupon = useCreateDiscountCoupon();
  const deleteCoupon = useDeleteDiscountCoupon();

  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const handleSave = async () => {
    if (!code.trim() || !discountValue) return;
    await createCoupon.mutateAsync({
      event_id: eventId,
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      max_uses: maxUses ? parseInt(maxUses) : undefined,
      payment_link: paymentLink.trim() || undefined,
      category_id: categoryId || undefined,
    });
    setShowForm(false);
    setCode('');
    setDiscountValue('');
    setMaxUses('');
    setPaymentLink('');
    setCategoryId('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Cupons de Desconto</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Crie cupons promocionais para inscrições</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnGold}>+ Novo Cupom</button>
      </div>

      <div className="space-y-4">
        {coupons?.map((c: any) => {
          const u = c.current_uses || 0;
          let pText = "";
          let pColor = "bg-[#EDAC02]";
          let pPercent = 0;
          
          if (u < 10) {
            pPercent = (u / 10) * 100;
            pText = `🏆 Próxima Recompensa: Inscrição Free (Faltam ${10 - u})`;
          } else if (u < 20) {
            pPercent = ((u - 10) / 10) * 100;
            pText = `🌟 Destravou Inscrição! Próxima Recompensa: Camisa (Faltam ${20 - u})`;
            pColor = "bg-[#25D366]";
          } else {
            pPercent = 100;
            pText = `🔥 SUPER VIP: Ganhou Inscrição + Camisa Exclusiva!`;
            pColor = "bg-[#ef4444]";
          }

          return (
            <div key={c.id} className={`${cardClass} p-5 flex flex-col group`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <span className="px-4 py-2 rounded-lg bg-[#EDAC02]/10 border border-[#EDAC02]/20 text-[#EDAC02] font-mono font-black text-lg tracking-widest">{c.code}</span>
                  <div>
                    <h4 className="font-bold text-white text-base">
                      {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `R$ ${Number(c.discount_value).toFixed(2)} OFF`}
                      {c.category_id && 
                        <span className="ml-2 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold border border-zinc-700 uppercase">
                          Apenas: {categories?.find(cat => cat.id === c.category_id)?.name}
                        </span>
                      }
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">
                      {c.current_uses || 0}{c.max_uses ? ` / ${c.max_uses}` : ''} usos confirmados
                      {!c.active && ' • Inativo'}
                    </p>
                  </div>
                </div>
                <button onClick={() => deleteCoupon.mutate({ id: c.id, event_id: eventId })} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
              </div>

              {/* Progress Gamification */}
              <div className="mt-5 pt-5 border-t border-[#1a1a1a]">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-zinc-400">{pText}</span>
                  <span className="text-white">{u} Vendas</span>
                </div>
                <div className="w-full bg-[#111] border border-[#262626] rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${pColor} transition-all duration-1000`} style={{ width: `${Math.max(2, pPercent)}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
        {(!coupons || coupons.length === 0) && emptyState('Nenhum cupom criado')}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Cupom">
        <div className="space-y-4">
          <div><label className={labelClass}>Aplicar Cupom à Categoria</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">Todas as Categorias do Evento (Cupom Global)</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Código *</label><input value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: EARLYBIRD" className={`${inputClass} uppercase font-mono tracking-widest`} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tipo</label>
              <select value={discountType} onChange={e => setDiscountType(e.target.value)} className={inputClass}>
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
            <div><label className={labelClass}>Valor *</label><input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'percentage' ? '10' : '50.00'} className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Máx. Usos</label><input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Ilimitado" className={inputClass} /></div>
          <div><label className={labelClass}>Link de Pagamento</label><input value={paymentLink} onChange={e => setPaymentLink(e.target.value)} placeholder="https://..." className={inputClass} /></div>
          <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
            <button onClick={() => setShowForm(false)} className={`flex-1 ${btnOutline}`}>Cancelar</button>
            <button onClick={handleSave} className={`flex-1 ${btnGold}`}>Criar Cupom</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============ TAB: KITS ============
function KitsTab({ eventId }: { eventId: string }) {
  const { data: kits } = useAthleteKits(eventId);
  const createKit = useCreateAthleteKit();
  const deleteKit = useDeleteAthleteKit();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isOptional, setIsOptional] = useState(true);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('kits').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('kits').getPublicUrl(fileName);
      setImageUrl(data.publicUrl);
    } catch (err: any) {
      toast.error('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || (!isOptional && price === '') || (isOptional && price === '')) return;
    await createKit.mutateAsync({
      event_id: eventId,
      name: name.trim(),
      description: description.trim() || undefined,
      price: parseFloat(price) || 0,
      image_url: imageUrl.trim() || undefined,
      is_optional: isOptional,
    });
    setShowForm(false);
    setName('');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setIsOptional(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Kits de Atleta</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Configure os kits disponíveis para inscrição</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnGold}>+ Novo Kit</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {kits?.map((kit: any) => (
          <div key={kit.id} className={`${cardClass} overflow-hidden group`}>
            {kit.image_url ? (
              <img src={kit.image_url} alt={kit.name} className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-[#EDAC02]/10 to-transparent flex items-center justify-center">
                <span className="text-3xl">🎽</span>
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-widest uppercase ${kit.is_optional === false ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20' : 'bg-[#111] text-zinc-400 border border-[#262626]'}`}>
                      {kit.is_optional === false ? 'Incluso na Inscrição' : 'Kit Opcional'}
                    </span>
                  </div>
                  <p className="font-bold text-white text-sm">{kit.name}</p>
                  {kit.description && <p className="text-xs text-zinc-500 mt-1">{kit.description}</p>}
                </div>
                <button onClick={() => deleteKit.mutate({ id: kit.id, event_id: eventId })} className="p-1 rounded text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs">🗑️</button>
              </div>
              <p className={`text-lg font-black mt-2 ${kit.is_optional === false ? 'text-[#25D366]' : 'text-[#EDAC02]'}`}>
                {kit.is_optional === false ? 'Cortesia' : `+ R$ ${Number(kit.price).toFixed(2)}`}
              </p>
            </div>
          </div>
        ))}
      </div>
      {(!kits || kits.length === 0) && emptyState('Nenhum kit cadastrado')}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Kit">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Tipo do Kit</label>
            <div className="flex gap-4 mt-2">
              <button 
                onClick={() => { setIsOptional(false); setPrice('0'); }} 
                className={`flex-1 py-3 text-xs font-bold border rounded-lg transition-all uppercase tracking-widest ${!isOptional ? 'border-[#25D366] bg-[#25D366]/10 text-[#25D366]' : 'border-[#262626] bg-[#0a0a0a] text-zinc-500 hover:text-white'}`}>
                Obrigatório (Incluso)
              </button>
              <button 
                onClick={() => setIsOptional(true)} 
                className={`flex-1 py-3 text-xs font-bold border rounded-lg transition-all uppercase tracking-widest ${isOptional ? 'border-[#EDAC02] bg-[#EDAC02]/10 text-[#EDAC02]' : 'border-[#262626] bg-[#0a0a0a] text-zinc-500 hover:text-white'}`}>
                Opcional (Upgrade)
              </button>
            </div>
          </div>
          <div><label className={labelClass}>Nome *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Kit Premium (Camiseta + Medalha)" className={inputClass} /></div>
          <div><label className={labelClass}>Descrição</label><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="O que está incluso..." rows={2} className={`${inputClass} resize-none`} /></div>
          {isOptional && <div><label className={labelClass}>Preço Adicional (R$) *</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="79.90" className={inputClass} /></div>}
          
          <div>
            <label className={labelClass}>Imagem do Kit</label>
            {imageUrl ? (
              <div className="relative w-full h-40 mt-2 rounded-xl overflow-hidden border border-[#262626] group">
                <img src={imageUrl} alt="preview" className="w-full h-full object-contain bg-[#050505]" />
                <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 p-2 bg-black/80 hover:bg-red-500 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100">Trocar</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#262626] hover:border-[#EDAC02] rounded-xl text-zinc-500 cursor-pointer mt-2 transition-colors bg-[#0a0a0a]">
                {uploading ? (
                  <span className="text-sm font-bold text-[#EDAC02] animate-pulse">Enviando imagem...</span>
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span className="text-sm font-bold">Fazer Upload de Foto JPG/PNG</span>
                  </>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
              </label>
            )}
          </div>
          <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
            <button onClick={() => setShowForm(false)} className={`flex-1 ${btnOutline}`}>Cancelar</button>
            <button onClick={handleSave} className={`flex-1 ${btnGold}`}>Criar Kit</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============ TAB: INSCRIÇÕES ============
function InscricoesTab({ eventId }: { eventId: string }) {
  const { data: registrations, refetch } = useEventRegistrations(eventId);
  const { data: categories } = useCategories(eventId);
  const [filter, setFilter] = useState<string | null>(null);
  
  const [editingReg, setEditingReg] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editBibNumber, setEditBibNumber] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkBibs, setBulkBibs] = useState<Record<string, string>>({});
  const [bulkStartNumber, setBulkStartNumber] = useState<number>(1);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  useEffect(() => {
    if (!bulkCategory || !registrations || !showBulkModal) return;
    const initial: Record<string, string> = {};
    registrations.filter((r: any) => r.category_id === bulkCategory).forEach((r: any) => {
      initial[r.id] = r.bib_number || '';
    });
    setBulkBibs(initial);
  }, [bulkCategory, registrations, showBulkModal]);

  const handleSaveBulk = async () => {
    setIsBulkSaving(true);
    const { supabase } = await import('@/integrations/supabase/client');
    await Promise.all(Object.entries(bulkBibs).map(([id, bib]) => 
      supabase.from('registrations').update({ bib_number: bib || null } as any).eq('id', id)
    ));
    setIsBulkSaving(false);
    setShowBulkModal(false);
    refetch();
  };

  const filtered = filter
    ? registrations?.filter((r: any) => r.status === filter)
    : registrations;

  const statusConfig: Record<string, { label: string; color: string }> = {
    confirmed: { label: 'Confirmado', color: 'bg-green-500/20 text-green-400' },
    pending: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
  };

  const handleSaveEdit = async () => {
    if (!editingReg) return;
    setIsSaving(true);
    // Dinamicamente importar o supabase para evitar problemas se não estiver no topo
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase
      .from('registrations')
      .update({ athlete_name: editName, athlete_phone: editPhone, status: editStatus, bib_number: editBibNumber || null } as any)
      .eq('id', editingReg.id);
      
    setIsSaving(false);
    if (!error) {
      setEditingReg(null);
      refetch();
    } else {
      alert("Erro ao salvar: " + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[
          ['all', `Todos (${registrations?.length || 0})`],
          ['confirmed', `Confirmados (${registrations?.filter((r: any) => r.status === 'confirmed').length || 0})`],
          ['pending', `Pendentes (${registrations?.filter((r: any) => r.status === 'pending').length || 0})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key === 'all' ? null : key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              (key === 'all' && !filter) || filter === key
                ? 'border-[#EDAC02] bg-[#EDAC02]/10 text-[#EDAC02]'
                : 'border-[#262626] text-zinc-500 hover:border-zinc-600'
            }`}
          >
            {label}
          </button>
        ))}
        
        <div className="flex-1" />
        <button onClick={() => setShowBulkModal(true)} className="px-4 py-1.5 bg-[#111] border border-[#262626] text-zinc-300 text-xs font-bold rounded-lg hover:border-[#EDAC02] hover:text-[#EDAC02] transition-all flex items-center gap-2 shadow-sm">
          🔢 Lote de Numeração
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Nº</th>
              <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Atleta</th>
              <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Categoria</th>
              <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Bateria</th>
              <th className="text-left py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Status</th>
              <th className="text-right py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold">Valor</th>
              <th className="text-right py-3 px-3 text-xs text-zinc-500 uppercase tracking-wider font-bold flex-1">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((reg: any) => {
              const st = statusConfig[reg.status] || statusConfig.pending;
              const waLink = reg.athlete_phone ? `https://wa.me/55${reg.athlete_phone.replace(/\D/g, '')}` : null;
              
              return (
                <tr key={reg.id} className="border-b border-[#0f0f0f] hover:bg-[#0a0a0a] transition-colors">
                  <td className="py-3 px-3 font-mono text-zinc-400">{reg.bib_number || '—'}</td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-white">{reg.athlete_name || reg.user_id?.slice(0, 8) || 'Anônimo'}</div>
                    {reg.athlete_phone && <div className="text-[10px] text-zinc-500 mt-0.5">{reg.athlete_phone}</div>}
                  </td>
                  <td className="py-3 px-3 text-zinc-400">{(reg.categories as any)?.name || '—'}</td>
                  <td className="py-3 px-3 text-zinc-400">{(reg.heats as any)?.title || '—'}</td>
                  <td className="py-3 px-3"><span className={`px-2 py-1 rounded text-[10px] font-bold ${st.color}`}>{st.label}</span></td>
                  <td className="py-3 px-3 text-right text-[#EDAC02] font-bold">R$ {(reg.total_paid || 0).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {waLink && (
                         <a href={waLink} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded transition-colors" title="Chamar no WhatsApp">
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                         </a>
                       )}
                       {reg.pix_receipt_url && (
                         <a href={reg.pix_receipt_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded transition-colors" title="Ver Comprovante">
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                         </a>
                       )}
                       <button onClick={() => { setEditingReg(reg); setEditName(reg.athlete_name || ''); setEditPhone(reg.athlete_phone || ''); setEditBibNumber(reg.bib_number || ''); setEditStatus(reg.status); }} className="p-1.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white rounded transition-colors" title="Editar">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                       </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!filtered || filtered.length === 0) && (
              <tr><td colSpan={7} className="text-center py-12 text-zinc-600 text-sm">Nenhuma inscrição encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!editingReg} onClose={() => setEditingReg(null)} title="Editar Inscrição">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Nome do Atleta</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white focus:border-[#EDAC02] outline-none" /></div>

            <div className="col-span-1"><label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Nº (Peito)</label>
            <input value={editBibNumber} onChange={e => setEditBibNumber(e.target.value)} placeholder="001" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white focus:border-[#EDAC02] outline-none font-mono" /></div>
          </div>

          <div><label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">WhatsApp</label>
          <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="(31) 99999-9999" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white focus:border-[#EDAC02] outline-none" /></div>
          
          <div><label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Status da Inscrição</label>
          <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white focus:border-[#EDAC02] outline-none">
            <option value="pending">Pendente (Aguardando Pagamento)</option>
            <option value="confirmed">Confirmado (Aprovado)</option>
            <option value="cancelled">Cancelado</option>
          </select></div>

          <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
            <button onClick={() => setEditingReg(null)} className="flex-1 px-4 py-2.5 border border-[#262626] rounded-lg text-zinc-400 font-bold hover:bg-[#111]">Cancelar</button>
            <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 px-4 py-2.5 bg-[#EDAC02] text-black font-black rounded-lg hover:bg-[#d49b02]">{isSaving ? 'Salvando...' : 'Salvar Alterações'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)} title="Numeração em Lote (BIB)">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Filtre por Categoria</label>
            <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-3 text-white focus:border-[#EDAC02] outline-none">
              <option value="">Selecione a categoria para listar...</option>
              {categories?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {bulkCategory && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 mb-2 bg-[#111] p-3 rounded-lg border border-[#262626] gap-3">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-zinc-400">Iniciar nº em:</p>
                  <input type="number" min="1" value={bulkStartNumber} onChange={e => setBulkStartNumber(Number(e.target.value) || 1)} className="w-16 bg-[#050505] border border-[#262626] rounded px-2 py-1 text-white font-mono text-center text-xs focus:border-[#EDAC02] outline-none" />
                </div>
                <button 
                  onClick={() => {
                    const regs = registrations?.filter((r: any) => r.category_id === bulkCategory)
                      // Sort ascending by creation date
                      .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) || [];
                    
                    const newBibs: Record<string, string> = { ...bulkBibs };
                    regs.forEach((r: any, idx: number) => {
                      newBibs[r.id] = String(bulkStartNumber + idx);
                    });
                    setBulkBibs(newBibs);
                  }}
                  className="text-xs bg-[#EDAC02]/10 text-[#EDAC02] font-black border border-[#EDAC02]/30 px-3 py-1.5 rounded hover:bg-[#EDAC02] hover:text-black transition-colors whitespace-nowrap"
                >
                  ⚡ Auto-Numerar
                </button>
              </div>
              
              <div className="max-h-[45vh] overflow-y-auto pr-2 space-y-2">
              {registrations?.filter((r: any) => r.category_id === bulkCategory).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between bg-[#111] border border-[#262626] rounded-lg p-3 hover:border-zinc-700 transition-colors">
                  <div className="w-[65%] truncate pr-2">
                    <p className="text-sm text-white font-bold truncate">{r.athlete_name || r.user_id?.slice(0, 8) || 'Anônimo'}</p>
                    {r.athlete_phone && <p className="text-[10px] text-zinc-500 truncate">{r.athlete_phone}</p>}
                  </div>
                  <div className="w-[35%] shrink-0">
                    <input 
                      value={bulkBibs[r.id] || ''} 
                      onChange={e => setBulkBibs(prev => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Nº"
                      className="w-full bg-[#050505] border border-[#333] rounded px-3 py-2 text-white font-mono text-center focus:border-[#EDAC02] outline-none shadow-inner"
                    />
                  </div>
                </div>
              ))}
              {registrations?.filter((r: any) => r.category_id === bulkCategory).length === 0 && (
                <p className="text-center text-sm text-zinc-500 py-6 border border-dashed border-[#262626] rounded-lg">Nenhum atleta listado nesta categoria.</p>
              )}
            </div>
            </>
          )}

          <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
            <button onClick={() => setShowBulkModal(false)} className="flex-1 px-4 py-2.5 border border-[#262626] rounded-lg text-zinc-400 font-bold hover:bg-[#111]">Sair</button>
            <button onClick={handleSaveBulk} disabled={!bulkCategory || isBulkSaving} className="flex-1 px-4 py-2.5 bg-[#EDAC02] text-black font-black rounded-lg hover:bg-[#d49b02] disabled:opacity-30 transition-all">{isBulkSaving ? 'Salvando...' : 'Salvar Todos'}</button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

// ============ TAB: BATERIAS ============
function BateriasTab({ eventId }: { eventId: string }) {
  const { data: heats } = useHeats(eventId);
  const { data: categories } = useCategories(eventId);
  const { data: regCounts } = useCategoryRegCounts(eventId);
  const createHeat = useCreateHeat();
  const updateHeat = useUpdateHeat();
  const deleteHeat = useDeleteHeat();
  const autoGenerate = useAutoGenerateHeats();

  const [showForm, setShowForm] = useState(false);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [expandedHeat, setExpandedHeat] = useState<string | null>(null);

  // Manual form
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [laneCount, setLaneCount] = useState('8');

  // Auto-gen form
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]);
  const [allowMixing, setAllowMixing] = useState(false);
  const [autoStartTime, setAutoStartTime] = useState('08:00');
  const [autoLanes, setAutoLanes] = useState('8');
  const [autoInterval, setAutoInterval] = useState('10');

  const handleManualSave = async () => {
    if (!title.trim() || !categoryId || !startTime) return;
    await createHeat.mutateAsync({
      event_id: eventId,
      category_id: categoryId,
      title: title.trim(),
      start_time: startTime,
      lane_count: parseInt(laneCount) || 8,
    });
    setShowForm(false);
    setTitle(''); setCategoryId(''); setStartTime(''); setLaneCount('8');
  };

  const handleAutoGenerate = async () => {
    if (orderedCategories.length === 0) return;
    await autoGenerate.mutateAsync({
      event_id: eventId,
      ordered_category_ids: orderedCategories,
      allow_mixing: allowMixing,
      lane_count: parseInt(autoLanes) || 8,
      start_time: `2026-01-01T${autoStartTime}:00`,
      interval_minutes: parseInt(autoInterval) || 10,
    });
    setShowAutoGen(false);
  };

  const heatStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
    pending: { label: 'Aguardando', color: 'bg-zinc-500/20 text-zinc-400', dot: 'bg-zinc-500' },
    ready: { label: 'Pronta', color: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-500' },
    running: { label: 'Em Andamento', color: 'bg-green-500/20 text-green-400 animate-pulse', dot: 'bg-green-500' },
    completed: { label: 'Finalizada', color: 'bg-[#EDAC02]/20 text-[#EDAC02]', dot: 'bg-[#EDAC02]' },
  };

  // Group heats by category
  const groupedHeats: Record<string, any[]> = {};
  (heats || []).forEach((h: any) => {
    const catName = (h.categories as any)?.name || 'Sem Categoria';
    if (!groupedHeats[catName]) groupedHeats[catName] = [];
    groupedHeats[catName].push(h);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Baterias</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Organize as baterias de corrida por categoria</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAutoGen(true)} className={btnOutline}>⚡ Auto-Gerar</button>
          <button onClick={() => setShowForm(true)} className={btnGold}>+ Nova Bateria</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${cardClass} p-3 text-center`}>
          <p className="text-xl font-black text-white">{heats?.length || 0}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Baterias</p>
        </div>
        <div className={`${cardClass} p-3 text-center`}>
          <p className="text-xl font-black text-green-400">{heats?.filter((h: any) => h.status === 'completed').length || 0}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Finalizadas</p>
        </div>
        <div className={`${cardClass} p-3 text-center`}>
          <p className="text-xl font-black text-[#EDAC02]">{Object.keys(groupedHeats).length}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Categorias</p>
        </div>
      </div>

      {/* Grouped Heats */}
      {Object.entries(groupedHeats).map(([catName, catHeats]) => (
        <div key={catName} className="space-y-2">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#EDAC02]"></span>
            {catName}
            <span className="text-zinc-600">({catHeats.length} baterias)</span>
          </h4>
          {catHeats.map((heat: any) => {
            const stConfig = heatStatusConfig[heat.status] || heatStatusConfig.pending;
            const isExpanded = expandedHeat === heat.id;
            return (
              <div key={heat.id} className={`${cardClass} overflow-hidden`}>
                <div className="p-4 flex items-center justify-between group cursor-pointer" onClick={() => setExpandedHeat(isExpanded ? null : heat.id)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${stConfig.dot}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm">{heat.title}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${stConfig.color}`}>{stConfig.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-zinc-500">🕐 {heat.start_time}</span>
                        <span className="text-xs text-zinc-500">🏁 {heat.lane_count} raias</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); deleteHeat.mutate({ id: heat.id, event_id: eventId }); }} className="p-1.5 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 text-xs">🗑️</button>
                    </div>
                    <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                {isExpanded && <HeatLanesDetail heatId={heat.id} laneCount={heat.lane_count} />}
              </div>
            );
          })}
        </div>
      ))}
      {(!heats || heats.length === 0) && emptyState('Nenhuma bateria criada. Use Auto-Gerar ou crie manualmente!')}

      {/* Manual Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Bateria">
        <div className="space-y-4">
          <div><label className={labelClass}>Título *</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Individual Masc - Bateria 1" className={inputClass} /></div>
          <div>
            <label className={labelClass}>Categoria *</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">Selecione...</option>
              {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Horário *</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Nº de Raias</label><input type="number" value={laneCount} onChange={e => setLaneCount(e.target.value)} placeholder="8" className={inputClass} /></div>
          </div>
          <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
            <button onClick={() => setShowForm(false)} className={`flex-1 ${btnOutline}`}>Cancelar</button>
            <button onClick={handleManualSave} disabled={createHeat.isPending} className={`flex-1 ${btnGold}`}>Criar Bateria</button>
          </div>
        </div>
      </Modal>

      {/* Auto Generate Modal */}
      <Modal open={showAutoGen} onClose={() => setShowAutoGen(false)} title="⚡ Auto-Gerar Baterias" subtitle="Distribui automaticamente os inscritos em baterias">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Modo de Otimização</label>
            <label className="flex items-center gap-2 bg-[#0a0a0a] border border-[#262626] p-3 rounded mt-1 cursor-pointer hover:border-[#EDAC02]/50 transition-colors">
              <input type="checkbox" checked={allowMixing} onChange={e => setAllowMixing(e.target.checked)} className="w-4 h-4 rounded appearance-none border border-zinc-500 checked:bg-[#EDAC02] checked:border-[#EDAC02]" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">Misturar categorias incompletas</span>
                <span className="text-[10px] text-zinc-500">Se uma bateria não fechar {autoLanes} raias, preencherá buracos chamando os próximos inscritos.</span>
              </div>
            </label>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className={labelClass}>Ordem Cronológica das Categorias *</label>
              <button onClick={() => setOrderedCategories([])} className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold tracking-wider">Limpar TUDO</button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {categories?.map((c: any) => {
                const isSelected = orderedCategories.includes(c.id);
                const orderNum = orderedCategories.indexOf(c.id) + 1;
                return (
                  <label key={c.id} className={`flex items-center justify-between p-2.5 rounded cursor-pointer border transition-colors ${isSelected ? 'border-[#EDAC02]/50 bg-[#EDAC02]/5' : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-zinc-700'}`}>
                    <div className="flex items-center gap-3">
                      <input 
                         type="checkbox" 
                         checked={isSelected} 
                         onChange={e => {
                            if (e.target.checked) setOrderedCategories([...orderedCategories, c.id]);
                            else setOrderedCategories(orderedCategories.filter(id => id !== c.id));
                         }} 
                         className="w-4 h-4 rounded appearance-none border border-zinc-500 checked:bg-[#EDAC02] checked:border-[#EDAC02]"
                      />
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-zinc-400'}`}>{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">({regCounts?.[c.id] || 0} inscritos)</span>
                      {isSelected ? (
                        <span className="w-5 h-5 flex items-center justify-center rounded bg-[#EDAC02] text-black text-xs font-black">{orderNum}º</span>
                      ) : (
                        <span className="w-5 h-5 flex items-center justify-center rounded bg-[#111] text-zinc-600 text-xs font-bold">+</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelClass}>Início (Hora)</label><input type="time" value={autoStartTime} onChange={e => setAutoStartTime(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Qtd Raias</label><input type="number" value={autoLanes} onChange={e => setAutoLanes(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Intervalo (min)</label><input type="number" value={autoInterval} onChange={e => setAutoInterval(e.target.value)} className={inputClass} /></div>
          </div>

          {orderedCategories.length > 0 && (
            <div className="bg-[#EDAC02]/5 border border-[#EDAC02]/20 rounded p-3 text-center">
              <p className="text-xs text-zinc-400">Geração de <span className="text-[#EDAC02] font-black">{Math.max(1, Math.ceil((orderedCategories.reduce((acc, catId) => acc + (regCounts?.[catId] || 0), 0)) / (parseInt(autoLanes) || 8)))} baterias previstas</span> para alojar <span className="text-white font-bold">{orderedCategories.reduce((acc, catId) => acc + (regCounts?.[catId] || 0), 0)} inscritos</span> baseando-se por lógica de {allowMixing ? 'Mixagem Máxima' : 'Separação Rígida'}.</p>
            </div>
          )}
          <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
            <button onClick={() => setShowAutoGen(false)} className={`flex-1 ${btnOutline}`}>Cancelar</button>
            <button onClick={handleAutoGenerate} disabled={autoGenerate.isPending} className={`flex-1 ${btnGold}`}>
              {autoGenerate.isPending ? 'Gerando...' : '⚡ Gerar Baterias'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============ HEAT LANES DETAIL ============
function HeatLanesDetail({ heatId, laneCount }: { heatId: string; laneCount: number }) {
  const { data: lanes, isLoading } = useLaneAssignments(heatId);

  if (isLoading) return <div className="p-4 border-t border-[#1a1a1a] text-center"><div className="w-5 h-5 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="border-t border-[#1a1a1a] p-4 bg-[#050505]">
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {(lanes && lanes.length > 0) ? lanes.map((lane: any) => {
          const hasAthlete = !!lane.registration_id;
          const reg = lane.registrations as any;
          const displayName = reg?.team_name || reg?.athlete_name || '?';
          return (
            <div key={lane.id} className={`rounded-lg p-2 text-center border transition-all ${
              hasAthlete
                ? 'bg-[#EDAC02]/10 border-[#EDAC02]/20'
                : 'bg-[#0a0a0a] border-[#262626]'
            }`}>
              <p className="text-[10px] text-zinc-500 uppercase">Raia {lane.lane_number}</p>
              <div className="mt-0.5 flex flex-col items-center">
                 <p className={`text-[11px] font-black leading-tight ${hasAthlete ? 'text-[#EDAC02]' : 'text-zinc-600'}`}>
                   {hasAthlete ? `#${reg?.bib_number || '?'}` : '—'}
                 </p>
                 {hasAthlete && (
                   <p className="text-[9px] text-white/70 uppercase truncate mt-0.5 w-full font-bold" title={displayName}>
                     {displayName}
                   </p>
                 )}
              </div>
            </div>
          );
        }) : (
          Array.from({ length: laneCount }, (_, i) => (
            <div key={i} className="rounded-lg p-2 text-center border border-[#262626] bg-[#0a0a0a]">
              <p className="text-[10px] text-zinc-500 uppercase">Raia {i + 1}</p>
              <p className="text-xs font-bold mt-0.5 text-zinc-600">—</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============ TAB: CRONOGRAMA ============
function CronogramaTab({ eventId }: { eventId: string }) {
  const { data: heats } = useHeats(eventId);
  const { data: stages } = useEventStages(eventId);

  // Build combined timeline from heats
  const timelineItems = (heats || []).map((h: any) => ({
    id: h.id,
    type: 'heat' as const,
    time: h.start_time,
    title: h.title,
    category: (h.categories as any)?.name || '',
    status: h.status,
    lanes: h.lane_count,
  })).sort((a, b) => a.time.localeCompare(b.time));

  // Group by time
  const timeGroups: Record<string, typeof timelineItems> = {};
  timelineItems.forEach(item => {
    if (!timeGroups[item.time]) timeGroups[item.time] = [];
    timeGroups[item.time].push(item);
  });

  const statusColors: Record<string, string> = {
    pending: 'border-zinc-600 bg-zinc-600',
    ready: 'border-blue-500 bg-blue-500',
    running: 'border-green-500 bg-green-500 animate-pulse',
    completed: 'border-[#EDAC02] bg-[#EDAC02]',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Aguardando',
    ready: 'Pronta',
    running: 'Em Andamento',
    completed: 'Finalizada',
  };

  const handlePrint = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      toast.loading("Gerando relatório...", { id: "print-sched" });
      
      const supabaseAny = supabase as any;
      const { data: fullHeats, error } = await supabaseAny
        .from('heats')
        .select(`
          *,
          categories(name),
          heat_lane_assignments (
            lane_number,
            registrations (
              bib_number,
              athlete_name,
              team_name
            )
          )
        `)
        .eq('event_id', eventId)
        .order('start_time');

      if (error) throw error;
      toast.success("Relatório pronto para impressão!", { id: "print-sched" });

      const win = window.open('', '_blank');
      if (!win) return;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cronograma de Provas - UAIROX</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; background: #fff; color: #000; margin: 0; padding: 30px; }
            .header { text-align: center; border-bottom: 3px solid #EDAC02; padding-bottom: 20px; margin-bottom: 30px; }
            .header p { color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; margin-top: 15px; }
            .heat { margin-bottom: 40px; page-break-inside: avoid; border: 2px solid #000; border-radius: 12px; overflow: hidden; }
            .heat-header { background: #000; color: #fff; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; }
            .heat-title { font-weight: 900; font-size: 18px; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
            .heat-time { font-family: monospace; font-size: 22px; color: #EDAC02; font-weight: bold; margin: 0; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; background: #fff; }
            .lane { border-right: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5; padding: 15px 10px; text-align: center; }
            .lane:nth-child(4n) { border-right: none; }
            .lane-num { font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold; margin: 0 0 8px 0; letter-spacing: 1px; }
            .bib { font-size: 20px; font-weight: 900; color: #000; margin: 0 0 4px 0; }
            .name { font-size: 13px; font-weight: bold; margin: 0; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; color: #333; }
            @media print {
              body { padding: 0; }
              .heat { border-color: #000; }
              .heat-header { background: #e5e5e5 !important; color: #000 !important; -webkit-print-color-adjust: exact; border-bottom-color: #000; }
              .heat-title { color: #000 !important; }
              .heat-time { color: #000 !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${window.location.origin}/logo-uairox-print.jpg" style="height: 50px; object-fit: contain;" alt="UAIROX" />
            <p>CRONOGRAMA DE PROVAS - BATERIAS & ATLETAS</p>
          </div>
          
          ${(() => {
             let rows = '';
             for (const heat of fullHeats || []) {
                const lanesConfig = Array.from({ length: heat.lane_count || 8 }, (_, i) => {
                    const match = (heat.heat_lane_assignments || []).find((a: any) => a.lane_number === i + 1);
                    return match || { lane_number: i + 1, registrations: null };
                });
                
                let lanesHtml = '';
                for (const l of lanesConfig) {
                  const r = l.registrations;
                  const hasAthlete = !!r;
                  const bib = hasAthlete ? '#' + (r.bib_number || '?') : '—';
                  const name = hasAthlete ? (r.team_name || r.athlete_name || '?') : '';
                  lanesHtml += `
                    <div class="lane">
                      <p class="lane-num">Raia ${l.lane_number}</p>
                      <p class="bib">${bib}</p>
                      ${hasAthlete ? `<p class="name">${name}</p>` : ''}
                    </div>
                  `;
                }
                
                rows += `
                  <div class="heat">
                    <div class="heat-header">
                      <p class="heat-title">${heat.title}</p>
                      <p class="heat-time">${heat.start_time}</p>
                    </div>
                    <div class="grid">
                      ${lanesHtml}
                    </div>
                  </div>
                `;
             }
             return rows;
          })()}
          <script>
            window.onload = () => { setTimeout(() => window.print(), 800); };
          </script>
        </body>
        </html>
      `;
      win.document.write(html);
      win.document.close();
    } catch (e: any) {
      toast.error("Erro ao gerar impressão: " + e.message, { id: "print-sched" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Cronograma do Evento</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Visão do dia do evento por ordem de horário</p>
        </div>
        <button onClick={handlePrint} className="px-4 py-2 border border-[#EDAC02] text-[#EDAC02] font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 hover:bg-[#EDAC02]/10 transition-colors">
          🖨️ Imprimir
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${statusColors[key]}`} />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {Object.keys(timeGroups).length > 0 ? (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[52px] top-0 bottom-0 w-px bg-[#1a1a1a]" />

          <div className="space-y-1">
            {Object.entries(timeGroups).map(([time, items]) => (
              <div key={time} className="flex gap-4">
                {/* Time label */}
                <div className="w-[44px] flex-shrink-0 text-right">
                  <span className="text-sm font-mono font-bold text-white">{time}</span>
                </div>

                {/* Dot */}
                <div className="flex-shrink-0 flex items-start pt-1.5 relative z-10">
                  <div className={`w-3 h-3 rounded-full border-2 ${statusColors[items[0].status] || 'border-zinc-600 bg-zinc-600'}`} />
                </div>

                {/* Items */}
                <div className="flex-1 space-y-1 pb-4">
                  {items.map(item => (
                    <div key={item.id} className={`${cardClass} p-3 hover:border-[#EDAC02]/20 transition-colors`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#EDAC02]">{item.category}</span>
                            <span className="text-[10px] text-zinc-600">•</span>
                            <span className="text-[10px] text-zinc-500">{item.lanes} raias</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'completed' ? 'bg-[#EDAC02]/20 text-[#EDAC02]' :
                          item.status === 'running' ? 'bg-green-500/20 text-green-400' :
                          'bg-zinc-800 text-zinc-500'
                        }`}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        emptyState('Nenhuma bateria criada. Crie baterias primeiro para ver o cronograma!')
      )}

      {/* Stages summary */}
      {stages && stages.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Provas do Evento</h4>
          <div className="flex gap-2 flex-wrap">
            {stages.map((s: any, i: number) => (
              <div key={s.id} className="px-3 py-2 rounded-lg bg-[#111] border border-[#262626] flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#EDAC02]/10 text-[#EDAC02] font-black flex items-center justify-center text-[10px]">{i + 1}</span>
                <span className="text-xs text-white font-medium">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ MAIN PAGE ============
const TABS = [
  { key: 'overview', label: '📊 Visão Geral' },
  { key: 'provas', label: '🏃 Provas' },
  { key: 'categorias', label: '👥 Categorias' },
  { key: 'baterias', label: '🏁 Baterias' },
  { key: 'cronograma', label: '📅 Cronograma' },
  { key: 'inscricoes', label: '📋 Inscrições' },
  { key: 'lotes', label: '🎫 Lotes' },
  { key: 'cupons', label: '🏷️ Cupons' },
  { key: 'kits', label: '🎽 Kits' },
];

export default function AdminEventConfig() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(id);
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Evento não encontrado</p>
        <button onClick={() => navigate('/admin/events')} className={`mt-4 ${btnGold}`}>← Voltar</button>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const daysUntil = differenceInDays(eventDate, new Date());
  const statusInfo = EVENT_STATUS_MAP[(event.status as EventStatus) || 'planning'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${cardClass} p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/events')} className="p-2 rounded-lg hover:bg-[#111] text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black text-white">{event.title}</h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}>{statusInfo.label}</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                <span>📅 {format(eventDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                <span>📍 {event.location}</span>
                <span>{daysUntil > 0 ? `⏱️ ${daysUntil} dias` : daysUntil === 0 ? '🔥 HOJE!' : '✅ Encerrado'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-[#1a1a1a] pb-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-bold rounded-t-lg border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-[#EDAC02] text-[#EDAC02] bg-[#EDAC02]/5'
                : 'border-transparent text-zinc-500 hover:text-white hover:bg-[#0a0a0a]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab eventId={id!} />}
        {activeTab === 'provas' && <ProvasTab eventId={id!} />}
        {activeTab === 'categorias' && <CategoriasTab eventId={id!} />}
        {activeTab === 'baterias' && <BateriasTab eventId={id!} />}
        {activeTab === 'cronograma' && <CronogramaTab eventId={id!} />}
        {activeTab === 'inscricoes' && <InscricoesTab eventId={id!} />}
        {activeTab === 'lotes' && <LotesTab eventId={id!} />}
        {activeTab === 'cupons' && <CuponsTab eventId={id!} />}
        {activeTab === 'kits' && <KitsTab eventId={id!} />}
      </div>
    </div>
  );
}
