import React, { useState } from 'react';
import { Wifi, Tag, UserCheck, Unlock, Plus, Search, Loader2, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { toast } from 'sonner';
import {
  useRFIDTags,
  useRFIDAssignments,
  useRFIDAntennas,
  useSearchRegistrations,
  useRegisterRFIDTag,
  useAssignRFIDTag,
  useReleaseRFIDTag,
  useSaveRFIDAntenna,
  type RegistrationResult,
} from '@/hooks/useRFIDWristbands';

interface Props {
  eventId: string;
  checkpoints: { id: string; name: string; is_finish_line: boolean }[];
}

const inputClass =
  'w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EDAC02] transition-colors text-sm';

export default function RFIDWristbandsPanel({ eventId, checkpoints }: Props) {
  const { data: tags = [] } = useRFIDTags();
  const { data: assignments = [], isLoading: loadingAssignments } = useRFIDAssignments(eventId);
  const { data: antennas = [] } = useRFIDAntennas(eventId);

  const registerTag = useRegisterRFIDTag();
  const assignTag = useAssignRFIDTag();
  const releaseTag = useReleaseRFIDTag();
  const saveAntenna = useSaveRFIDAntenna();

  // — Cadastrar pulseira
  const [showRegister, setShowRegister] = useState(false);
  const [regNumber, setRegNumber] = useState('');
  const [regEpc, setRegEpc] = useState('');

  // — Atribuir pulseira
  const [tagNumber, setTagNumber] = useState('');
  const [athleteQuery, setAthleteQuery] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState<RegistrationResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: searchResults = [], isFetching: searching } = useSearchRegistrations(eventId, athleteQuery);

  // — Configurar antenas
  const [showAntennas, setShowAntennas] = useState(false);
  const [readerId, setReaderId] = useState('reader-1');
  const [ant1Cp, setAnt1Cp] = useState('');
  const [ant1Type, setAnt1Type] = useState('start');
  const [ant2Cp, setAnt2Cp] = useState('');
  const [ant2Type, setAnt2Type] = useState('finish');

  // Populate antenna form from saved data
  React.useEffect(() => {
    const a1 = antennas.find(a => a.antenna_index === 1);
    const a2 = antennas.find(a => a.antenna_index === 2);
    if (a1) { setReaderId(a1.reader_id); setAnt1Cp(a1.checkpoint_id ?? ''); setAnt1Type(a1.entry_type); }
    if (a2) { setAnt2Cp(a2.checkpoint_id ?? ''); setAnt2Type(a2.entry_type); }
  }, [antennas]);

  const handleRegisterTag = () => {
    const num = parseInt(regNumber);
    if (!regEpc.trim() || isNaN(num) || num < 1 || num > 120) {
      toast.error('Informe um número (1-120) e o EPC da pulseira.');
      return;
    }
    registerTag.mutate({ tag_epc: regEpc, number: num }, {
      onSuccess: () => { toast.success(`Pulseira #${num} cadastrada!`); setRegNumber(''); setRegEpc(''); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleAssign = () => {
    const num = parseInt(tagNumber);
    if (isNaN(num) || !selectedAthlete) {
      toast.error('Informe o número da pulseira e selecione um atleta.');
      return;
    }
    assignTag.mutate({ tag_number: num, registration_id: selectedAthlete.id, event_id: eventId }, {
      onSuccess: () => {
        toast.success(`Pulseira #${num} atribuída a ${selectedAthlete.athlete_name}!`);
        setTagNumber('');
        setAthleteQuery('');
        setSelectedAthlete(null);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleRelease = (assignmentId: string, athleteName: string, tagNum: number | undefined) => {
    if (!confirm(`Liberar pulseira #${tagNum ?? '?'} de ${athleteName}?`)) return;
    releaseTag.mutate({ assignment_id: assignmentId, event_id: eventId }, {
      onSuccess: () => toast.success('Pulseira liberada!'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleSaveAntennas = () => {
    if (!readerId.trim()) { toast.error('Informe o ID do leitor.'); return; }
    const base = { event_id: eventId, reader_id: readerId.trim(), is_active: true, debounce_ms: 5000, label: null };

    const mutations = [
      ...(ant1Cp ? [saveAntenna.mutateAsync({ ...base, antenna_index: 1, checkpoint_id: ant1Cp, entry_type: ant1Type, label: 'Antena 1' })] : []),
      ...(ant2Cp ? [saveAntenna.mutateAsync({ ...base, antenna_index: 2, checkpoint_id: ant2Cp, entry_type: ant2Type, label: 'Antena 2' })] : []),
    ];

    Promise.all(mutations)
      .then(() => toast.success('Antenas salvas!'))
      .catch((e: any) => toast.error(e.message));
  };

  // Stats
  const totalTags = tags.length;
  const activeCount = assignments.length;
  const freeCount = totalTags - activeCount;

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Wifi className="w-5 h-5 text-[#EDAC02]" /> Pulseiras RFID
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAntennas(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-[#1a1a1a] hover:bg-[#262626] rounded-lg transition-colors"
          >
            <Radio className="w-3.5 h-3.5" /> Configurar Leitor
            {showAntennas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowRegister(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-[#1a1a1a] hover:bg-[#262626] rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastrar Pulseira
            {showRegister ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 divide-x divide-[#1a1a1a] border-b border-[#1a1a1a]">
        <div className="p-4 text-center">
          <p className="text-2xl font-black text-white">{totalTags}</p>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Cadastradas</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-black text-[#EDAC02]">{activeCount}</p>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Em Uso</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-black text-green-400">{freeCount >= 0 ? freeCount : '--'}</p>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Livres</p>
        </div>
      </div>

      {/* Cadastrar Pulseira (collapsible) */}
      {showRegister && (
        <div className="p-5 border-b border-[#1a1a1a] bg-[#050505] space-y-3">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nova Pulseira</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">Número (1–120)</label>
              <input type="number" value={regNumber} onChange={e => setRegNumber(e.target.value)} className={inputClass} placeholder="Ex: 42" min={1} max={120} />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">EPC da Tag (lido pelo M-ID40)</label>
              <input type="text" value={regEpc} onChange={e => setRegEpc(e.target.value)} className={inputClass} placeholder="Ex: E2003412..." />
            </div>
          </div>
          <button
            onClick={handleRegisterTag}
            disabled={registerTag.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1a1a] hover:bg-[#262626] text-white font-bold rounded-xl transition-colors text-sm"
          >
            {registerTag.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4 text-[#EDAC02]" />}
            Cadastrar
          </button>
        </div>
      )}

      {/* Configurar Antenas (collapsible) */}
      {showAntennas && (
        <div className="p-5 border-b border-[#1a1a1a] bg-[#050505] space-y-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Configuração do M-ID40</p>
          <div>
            <label className="block text-xs text-zinc-600 mb-1">ID do Leitor</label>
            <input type="text" value={readerId} onChange={e => setReaderId(e.target.value)} className={inputClass} placeholder="reader-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{ idx: 1, cp: ant1Cp, setCp: setAnt1Cp, type: ant1Type, setType: setAnt1Type },
              { idx: 2, cp: ant2Cp, setCp: setAnt2Cp, type: ant2Type, setType: setAnt2Type }].map(({ idx, cp, setCp, type, setType }) => (
              <div key={idx} className="space-y-2 p-4 bg-[#0a0a0a] rounded-xl border border-[#1a1a1a]">
                <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Entrada {idx} (Antena {idx})</p>
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">Tapete / Ponto de Controle</label>
                  <select value={cp} onChange={e => setCp(e.target.value)} className={inputClass}>
                    <option value="">— Selecionar —</option>
                    {checkpoints.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.is_finish_line ? ' (Chegada)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">Tipo de Entrada</label>
                  <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
                    <option value="start">Largada</option>
                    <option value="lap">Volta / Passagem</option>
                    <option value="finish">Chegada</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveAntennas}
            disabled={saveAntenna.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1a1a] hover:bg-[#262626] text-white font-bold rounded-xl transition-colors text-sm"
          >
            {saveAntenna.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4 text-[#EDAC02]" />}
            Salvar Configuração do Leitor
          </button>
        </div>
      )}

      {/* Atribuir Pulseira */}
      <div className="p-5 border-b border-[#1a1a1a] bg-[#050505]">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Atribuir Pulseira a Atleta</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-600 mb-1">Nº da Pulseira</label>
            <input type="number" value={tagNumber} onChange={e => setTagNumber(e.target.value)} className={inputClass} placeholder="Ex: 42" min={1} max={120} />
          </div>
          <div className="relative">
            <label className="block text-xs text-zinc-600 mb-1">Atleta (nome ou nº peito)</label>
            {selectedAthlete ? (
              <div className="flex items-center gap-2 px-3 py-3 bg-[#EDAC02]/10 border border-[#EDAC02]/30 rounded-lg">
                <UserCheck className="w-4 h-4 text-[#EDAC02] shrink-0" />
                <span className="text-sm text-white font-bold truncate">{selectedAthlete.athlete_name}</span>
                <button onClick={() => { setSelectedAthlete(null); setAthleteQuery(''); }} className="ml-auto text-zinc-500 hover:text-white text-xs shrink-0">✕</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={athleteQuery}
                    onChange={e => { setAthleteQuery(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-9 pr-4 py-3 text-white focus:outline-none focus:border-[#EDAC02] transition-colors text-sm"
                    placeholder="Buscar por nome ou peito..."
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-500" />}
                </div>
                {showDropdown && searchResults.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full bg-[#1a1a1a] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
                    {searchResults.map(r => (
                      <li
                        key={r.id}
                        onClick={() => { setSelectedAthlete(r); setAthleteQuery(''); setShowDropdown(false); }}
                        className="px-4 py-3 hover:bg-[#262626] cursor-pointer flex items-center justify-between"
                      >
                        <span className="text-sm text-white">{r.athlete_name}</span>
                        <span className="text-xs text-zinc-500 font-mono">#{r.bib_number}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleAssign}
            disabled={assignTag.isPending || !selectedAthlete || !tagNumber}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-[#EDAC02] hover:bg-[#EDAC02]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black rounded-xl transition-colors text-sm"
          >
            {assignTag.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
            Atribuir
          </button>
        </div>
      </div>

      {/* Lista de Pulseiras Ativas */}
      <div className="divide-y divide-[#1a1a1a]">
        {loadingAssignments ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#EDAC02]" /></div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-600">Nenhuma pulseira em uso neste evento.</div>
        ) : (
          assignments.map(a => {
            const tagNum = a.rfid_tags?.number;
            const athlete = a.registrations;
            const minutesAgo = Math.floor((Date.now() - new Date(a.assigned_at).getTime()) / 60000);
            return (
              <div key={a.id} className="px-5 py-4 flex items-center justify-between hover:bg-[#111] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EDAC02]/10 border border-[#EDAC02]/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-[#EDAC02]">#{tagNum ?? '?'}</span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{athlete?.athlete_name ?? '—'}</p>
                    <p className="text-xs text-zinc-500">
                      Peito <span className="font-mono text-zinc-400">#{athlete?.bib_number}</span>
                      {athlete?.team_name && <span className="ml-2 text-zinc-600">· {athlete.team_name}</span>}
                      <span className="ml-2 text-zinc-700">· há {minutesAgo}min</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRelease(a.id, athlete?.athlete_name ?? '?', tagNum)}
                  disabled={releaseTag.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white bg-[#1a1a1a] hover:bg-red-900/40 hover:border-red-700/40 border border-[#262626] rounded-lg transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" /> Liberar
                </button>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
