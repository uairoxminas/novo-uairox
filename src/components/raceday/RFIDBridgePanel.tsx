import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Usb, Wifi, WifiOff, Radio, CircleDot, ChevronDown, ChevronUp, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface ReadLog {
  id: number;
  tag_epc: string;
  antenna_index: number;
  rssi: number | null;
  raw: string;
  sent_at: string;
  status: 'ok' | 'debounce' | 'unknown_tag' | 'no_running_heat' | 'no_antenna_config' | 'error';
  detail?: string;
}

interface Props {
  eventId: string;
}

const GATEWAY_URL = 'https://dhetcnkvgtuatcchropm.supabase.co/functions/v1/rfid-gateway';

// Parses a raw line from M-ID40 LIGHT serial output.
// The M-ID40 sends ASCII lines. Common formats:
//   E200341400000001,1,-65
//   TAG:E200341400000001 ANT:1 RSSI:-65
//   +READ:EPC=E200341400000001,ANT=1,RSSI=-65
// We extract: EPC (hex string ≥12 chars), antenna index, RSSI
function parseLine(line: string): { tag_epc: string; antenna_index: number; rssi: number | null } | null {
  const clean = line.trim();
  if (!clean) return null;

  // Extract EPC: longest hex run of 12+ chars
  const epcMatch = clean.match(/[0-9A-Fa-f]{12,}/);
  if (!epcMatch) return null;
  const tag_epc = epcMatch[0].toUpperCase();

  // Extract antenna index (ANT=1, ANT:1, ,1, etc.)
  const antMatch = clean.match(/ANT[=:\s]+(\d)/i) || clean.match(/,\s*([12])\s*[,\s]/);
  const antenna_index = antMatch ? parseInt(antMatch[1]) : 1;

  // Extract RSSI
  const rssiMatch = clean.match(/RSSI[=:\s]+(-?\d+)/i) || clean.match(/,\s*(-\d+)\s*$/);
  const rssi = rssiMatch ? parseInt(rssiMatch[1]) : null;

  return { tag_epc, antenna_index, rssi };
}

export default function RFIDBridgePanel({ eventId }: Props) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('rfid_api_key') || '');
  const [readerId, setReaderId] = useState(() => localStorage.getItem('rfid_reader_id') || 'reader-1');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [logs, setLogs] = useState<ReadLog[]>([]);
  const [rawLog, setRawLog] = useState<string[]>([]);
  const [showRaw, setShowRaw] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const logIdRef = useRef(0);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const runningRef = useRef(false);

  const inputClass = 'w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#EDAC02] transition-colors text-sm';

  const addLog = useCallback((log: Omit<ReadLog, 'id'>) => {
    const id = ++logIdRef.current;
    setLogs(prev => [{ ...log, id }, ...prev].slice(0, 50));
  }, []);

  const sendToGateway = useCallback(async (tag_epc: string, antenna_index: number, rssi: number | null, raw: string) => {
    const sent_at = new Date().toISOString();
    try {
      const res = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rfid-api-key': apiKey,
        },
        body: JSON.stringify({ reader_id: readerId, antenna_index, tag_epc, rssi, read_at: sent_at }),
      });
      const json = await res.json();
      const status = res.ok ? (json.status ?? 'ok') : 'error';
      addLog({ tag_epc, antenna_index, rssi, raw, sent_at, status, detail: json.error });
    } catch (err: any) {
      addLog({ tag_epc, antenna_index, rssi, raw, sent_at, status: 'error', detail: err.message });
    }
  }, [apiKey, readerId, addLog]);

  const readLoop = useCallback(async (port: SerialPort) => {
    const decoder = new TextDecoder();
    let buffer = '';
    runningRef.current = true;

    try {
      const reader = port.readable!.getReader();
      readerRef.current = reader;

      while (runningRef.current) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          setRawLog(prev => [`${new Date().toLocaleTimeString('pt-BR')} | ${line}`, ...prev].slice(0, 100));
          const parsed = parseLine(line);
          if (parsed) {
            await sendToGateway(parsed.tag_epc, parsed.antenna_index, parsed.rssi, line);
          }
        }
      }
    } catch (err: any) {
      if (runningRef.current) {
        toast.error('Conexão serial perdida: ' + err.message);
        setConnected(false);
      }
    }
  }, [sendToGateway]);

  const handleConnect = useCallback(async () => {
    if (!apiKey.trim()) { toast.error('Informe a API Key do leitor RFID antes de conectar.'); setShowConfig(true); return; }
    if (!('serial' in navigator)) {
      toast.error('Web Serial API não suportada. Use Chrome ou Edge no desktop.');
      return;
    }
    try {
      setConnecting(true);
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });
      portRef.current = port;
      setConnected(true);
      toast.success('M-ID40 conectado! Aguardando leituras...');
      localStorage.setItem('rfid_api_key', apiKey);
      localStorage.setItem('rfid_reader_id', readerId);
      readLoop(port);
    } catch (err: any) {
      if (!err.message.includes('cancelled')) toast.error('Erro ao conectar: ' + err.message);
    } finally {
      setConnecting(false);
    }
  }, [apiKey, baudRate, readerId, readLoop]);

  const handleDisconnect = useCallback(async () => {
    runningRef.current = false;
    try { await readerRef.current?.cancel(); } catch { /* ignore */ }
    try { await portRef.current?.close(); } catch { /* ignore */ }
    portRef.current = null;
    readerRef.current = null;
    setConnected(false);
    toast.info('Leitor desconectado.');
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { handleDisconnect(); }, [handleDisconnect]);

  const statusColor: Record<ReadLog['status'], string> = {
    ok: 'text-green-400',
    debounce: 'text-zinc-500',
    unknown_tag: 'text-yellow-400',
    no_running_heat: 'text-orange-400',
    no_antenna_config: 'text-red-400',
    error: 'text-red-500',
  };

  const statusLabel: Record<ReadLog['status'], string> = {
    ok: 'REGISTRADO',
    debounce: 'DEBOUNCE',
    unknown_tag: 'TAG DESCONHECIDA',
    no_running_heat: 'SEM BATERIA ATIVA',
    no_antenna_config: 'ANTENA NÃO CONFIG.',
    error: 'ERRO',
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="p-5 border-b border-[#1a1a1a] flex items-center justify-between">
        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Usb className="w-5 h-5 text-[#EDAC02]" /> Bridge M-ID40
          <span className="text-xs font-normal text-zinc-500 normal-case ml-1">Leitura USB em tempo real</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-[#1a1a1a] hover:bg-[#262626] rounded-lg transition-colors"
          >
            Config {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {connected ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-700/30 text-red-400 font-bold rounded-xl transition-colors text-sm"
            >
              <WifiOff className="w-4 h-4" /> Desconectar
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 bg-[#EDAC02] hover:bg-[#EDAC02]/90 disabled:opacity-50 text-black font-black rounded-xl transition-colors text-sm"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
              Conectar Leitor USB
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className={`px-5 py-2.5 flex items-center gap-2 border-b border-[#1a1a1a] ${connected ? 'bg-green-950/20' : 'bg-[#050505]'}`}>
        <CircleDot className={`w-3.5 h-3.5 ${connected ? 'text-green-400 animate-pulse' : 'text-zinc-600'}`} />
        <span className={`text-xs font-bold ${connected ? 'text-green-400' : 'text-zinc-500'}`}>
          {connected ? `ONLINE — ${readerId} · ${baudRate} baud` : 'AGUARDANDO CONEXÃO'}
        </span>
        {connected && (
          <span className="ml-auto text-xs text-zinc-600">{logs.length} leituras nesta sessão</span>
        )}
      </div>

      {/* Config (collapsible) */}
      {showConfig && (
        <div className="p-5 border-b border-[#1a1a1a] bg-[#050505] grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-600 mb-1">API Key (RFID_GATEWAY_KEY)</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className={inputClass}
              placeholder="uairox-rfid-2026"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-600 mb-1">ID do Leitor</label>
            <input
              type="text"
              value={readerId}
              onChange={e => setReaderId(e.target.value)}
              className={inputClass}
              placeholder="reader-1"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-600 mb-1">Baud Rate</label>
            <select value={baudRate} onChange={e => setBaudRate(parseInt(e.target.value))} className={inputClass}>
              <option value={9600}>9600</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={57600}>57600</option>
              <option value={115200}>115200</option>
            </select>
          </div>
        </div>
      )}

      {/* Live feed */}
      <div className="min-h-[180px] max-h-[320px] overflow-y-auto divide-y divide-[#111]">
        {logs.length === 0 ? (
          <div className="p-8 text-center">
            <Radio className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-600">
              {connected ? 'Aguardando tags RFID...' : 'Conecte o M-ID40 para iniciar.'}
            </p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#111] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-400 w-20 shrink-0">Ant {log.antenna_index}</span>
                <span className="text-sm font-mono text-white">{log.tag_epc}</span>
                {log.rssi !== null && (
                  <span className="text-xs text-zinc-600">{log.rssi} dBm</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor[log.status]}`}>
                  {statusLabel[log.status]}
                </span>
                <span className="text-[10px] text-zinc-700">
                  {new Date(log.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Raw data toggle */}
      <div className="border-t border-[#1a1a1a]">
        <button
          onClick={() => setShowRaw(v => !v)}
          className="w-full px-5 py-3 flex items-center justify-between text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <span className="font-bold uppercase tracking-widest">Dados brutos da serial</span>
          {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showRaw && (
          <div className="bg-black px-5 pb-4 max-h-40 overflow-y-auto font-mono text-xs text-green-400 space-y-0.5">
            {rawLog.length === 0
              ? <p className="text-zinc-700 py-2">Sem dados ainda.</p>
              : rawLog.map((line, i) => <p key={i}>{line}</p>)
            }
          </div>
        )}
      </div>

    </div>
  );
}
