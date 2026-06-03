import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Usb, WifiOff, Wifi, Radio, CircleDot, ChevronDown, ChevronUp, Loader2, HelpCircle, Network, Copy, Check } from 'lucide-react';
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

interface Props { eventId: string; }

const GATEWAY_URL = 'https://dhetcnkvgtuatcchropm.supabase.co/functions/v1/rfid-gateway';

function parseLine(line: string): { tag_epc: string; antenna_index: number; rssi: number | null } | null {
  const clean = line.trim();
  if (!clean) return null;
  const epcMatch = clean.match(/[0-9A-Fa-f]{12,}/);
  if (!epcMatch) return null;
  const tag_epc       = epcMatch[0].toUpperCase();
  const antMatch      = clean.match(/ANT[=:\s]+(\d)/i) || clean.match(/,\s*([12])\s*[,\s]/);
  const antenna_index = antMatch ? parseInt(antMatch[1]) : 1;
  const rssiMatch     = clean.match(/RSSI[=:\s]+(-?\d+)/i) || clean.match(/,\s*(-\d+)\s*$/);
  const rssi          = rssiMatch ? parseInt(rssiMatch[1]) : null;
  return { tag_epc, antenna_index, rssi };
}

const statusColor: Record<ReadLog['status'], string> = {
  ok: 'text-green-400', debounce: 'text-zinc-500', unknown_tag: 'text-yellow-400',
  no_running_heat: 'text-orange-400', no_antenna_config: 'text-red-400', error: 'text-red-500',
};
const statusLabel: Record<ReadLog['status'], string> = {
  ok: 'REGISTRADO', debounce: 'DEBOUNCE', unknown_tag: 'TAG DESCONHECIDA',
  no_running_heat: 'SEM BATERIA ATIVA', no_antenna_config: 'ANTENA NÃO CONFIG.', error: 'ERRO',
};

type Mode = 'usb' | 'tcp' | 'direct';

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-white bg-[#262626] hover:bg-[#333] rounded transition-colors shrink-0">
      {done ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {done ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-black rounded-xl border border-[#262626] font-mono text-xs text-green-400 break-all">
      <span className="flex-1">{children}</span>
      <CopyButton text={children} />
    </div>
  );
}

export default function RFIDBridgePanel({ eventId: _eventId }: Props) {
  const [mode, setMode]         = useState<Mode>('usb');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [apiKey, setApiKey]     = useState(() => localStorage.getItem('rfid_api_key')    || '');
  const [readerId, setReaderId] = useState(() => localStorage.getItem('rfid_reader_id')  || 'reader-1');
  const [rfidIp, setRfidIp]     = useState(() => localStorage.getItem('rfid_ip')         || '192.168.1.50');
  const [rfidPort, setRfidPort] = useState(() => localStorage.getItem('rfid_port')       || '5000');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [logs, setLogs]         = useState<ReadLog[]>([]);
  const [rawLog, setRawLog]     = useState<string[]>([]);
  const [showRaw, setShowRaw]   = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const logIdRef   = useRef(0);
  const portRef    = useRef<any>(null);
  const readerRef  = useRef<ReadableStreamDefaultReader | null>(null);
  const runningRef = useRef(false);

  const inputClass = 'w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#EDAC02] transition-colors text-sm';

  const addLog = useCallback((log: Omit<ReadLog, 'id'>) => {
    setLogs(prev => [{ ...log, id: ++logIdRef.current }, ...prev].slice(0, 50));
  }, []);

  const sendToGateway = useCallback(async (tag_epc: string, antenna_index: number, rssi: number | null, raw: string) => {
    const sent_at = new Date().toISOString();
    try {
      const res  = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rfid-api-key': apiKey },
        body: JSON.stringify({ reader_id: readerId, antenna_index, tag_epc, rssi, read_at: sent_at }),
      });
      const json = await res.json();
      addLog({ tag_epc, antenna_index, rssi, raw, sent_at, status: res.ok ? (json.status ?? 'ok') : 'error', detail: json.error });
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
          if (parsed) await sendToGateway(parsed.tag_epc, parsed.antenna_index, parsed.rssi, line);
        }
      }
    } catch (err: any) {
      if (runningRef.current) { toast.error('Conexão serial perdida: ' + err.message); setConnected(false); }
    }
  }, [sendToGateway]);

  const handleConnect = useCallback(async () => {
    if (!apiKey.trim()) { toast.error('Informe a API Key antes de conectar.'); setShowConfig(true); return; }
    if (!('serial' in navigator)) { toast.error('Web Serial não suportada. Use Chrome ou Edge no desktop.'); return; }
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
    try { await readerRef.current?.cancel(); } catch { /**/ }
    try { await portRef.current?.close(); } catch { /**/ }
    portRef.current = null; readerRef.current = null;
    setConnected(false);
    toast.info('Leitor desconectado.');
  }, []);

  useEffect(() => () => { handleDisconnect(); }, [handleDisconnect]);

  const cmdTcp    = `CONNECTION_MODE=tcp RFID_IP=${rfidIp} RFID_PORT=${rfidPort} READER_ID=${readerId} RFID_GATEWAY_KEY=<sua-key> node rfid-bridge.js`;
  const cmdServer = `CONNECTION_MODE=server RFID_PORT=${rfidPort} READER_ID=${readerId} RFID_GATEWAY_KEY=<sua-key> node rfid-bridge.js`;
  const cmdInstall = `cd bridge && npm install && CONNECTION_MODE=tcp RFID_IP=${rfidIp} RFID_GATEWAY_KEY=sua-key node rfid-bridge.js`;

  const tabs: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: 'usb',    label: 'USB / Serial',   icon: <Usb className="w-3.5 h-3.5" /> },
    { id: 'tcp',    label: 'Rede / TCP',      icon: <Wifi className="w-3.5 h-3.5" /> },
    { id: 'direct', label: 'Direto (M-ID40)', icon: <Network className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="p-5 border-b border-[#1a1a1a] flex items-center justify-between">
        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Radio className="w-5 h-5 text-[#EDAC02]" /> Bridge M-ID40
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-[#1a1a1a] hover:bg-[#262626] rounded-lg transition-colors">
            <HelpCircle className="w-3.5 h-3.5" /> Ajuda {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-[#1a1a1a]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wide transition-colors
              ${mode === t.id
                ? 'text-[#EDAC02] border-b-2 border-[#EDAC02] bg-[#EDAC02]/5'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#111]'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── ABA USB ───────────────────────────────────────────────────── */}
      {mode === 'usb' && (
        <>
          {/* Help USB */}
          {showHelp && (
            <div className="p-5 border-b border-[#1a1a1a] bg-[#050505] space-y-3">
              <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Como conectar via USB</p>
              <ol className="space-y-2.5 text-sm text-zinc-300">
                {[
                  'Conecte o M-ID40 ao notebook via cabo USB. O Windows reconhecerá como porta COM (ex: COM3).',
                  'Clique em Config, informe a API Key e o ID do Leitor (deve ser igual ao configurado nas antenas).',
                  'Selecione o Baud Rate conforme o manual Via Onda (normalmente 9600).',
                  'Clique Conectar Leitor USB, selecione a porta COM e aguarde o indicador verde.',
                  'Passe uma pulseira pela antena — a leitura aparecerá no feed abaixo.',
                ].map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-zinc-600">Alternativa sem browser: rode o script Node.js com <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">CONNECTION_MODE=serial</code> — veja a aba USB na seção de comandos abaixo.</p>
            </div>
          )}

          {/* Status bar */}
          <div className={`px-5 py-2.5 flex items-center gap-2 border-b border-[#1a1a1a] ${connected ? 'bg-green-950/20' : 'bg-[#050505]'}`}>
            <CircleDot className={`w-3.5 h-3.5 ${connected ? 'text-green-400 animate-pulse' : 'text-zinc-600'}`} />
            <span className={`text-xs font-bold ${connected ? 'text-green-400' : 'text-zinc-500'}`}>
              {connected ? `ONLINE — ${readerId} · ${baudRate} baud` : 'AGUARDANDO CONEXÃO USB'}
            </span>
            {connected && <span className="ml-auto text-xs text-zinc-600">{logs.length} leituras nesta sessão</span>}
          </div>

          {/* Config */}
          <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#050505] flex items-end gap-3">
            <button onClick={() => setShowConfig(v => !v)} className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
              Config {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {!connected ? (
              <button onClick={handleConnect} disabled={connecting} className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#EDAC02] hover:bg-[#EDAC02]/90 disabled:opacity-50 text-black font-black rounded-xl transition-colors text-sm">
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />} Conectar Leitor USB
              </button>
            ) : (
              <button onClick={handleDisconnect} className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-700/30 text-red-400 font-bold rounded-xl transition-colors text-sm">
                <WifiOff className="w-4 h-4" /> Desconectar
              </button>
            )}
          </div>
          {showConfig && (
            <div className="p-5 border-b border-[#1a1a1a] bg-[#050505] grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-zinc-600 mb-1">API Key</label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className={inputClass} placeholder="uairox-rfid-2026" />
              </div>
              <div>
                <label className="block text-xs text-zinc-600 mb-1">ID do Leitor</label>
                <input type="text" value={readerId} onChange={e => setReaderId(e.target.value)} className={inputClass} placeholder="reader-1" />
              </div>
              <div>
                <label className="block text-xs text-zinc-600 mb-1">Baud Rate</label>
                <select value={baudRate} onChange={e => setBaudRate(parseInt(e.target.value))} className={inputClass}>
                  {[9600, 19200, 38400, 57600, 115200].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Live feed */}
          <div className="min-h-[160px] max-h-[280px] overflow-y-auto divide-y divide-[#111]">
            {logs.length === 0 ? (
              <div className="p-8 text-center">
                <Radio className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-600">{connected ? 'Aguardando tags RFID...' : 'Conecte o M-ID40 via USB para iniciar.'}</p>
              </div>
            ) : logs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#111] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-400 w-16 shrink-0">Ant {log.antenna_index}</span>
                  <span className="text-sm font-mono text-white">{log.tag_epc}</span>
                  {log.rssi !== null && <span className="text-xs text-zinc-600">{log.rssi} dBm</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor[log.status]}`}>{statusLabel[log.status]}</span>
                  <span className="text-[10px] text-zinc-700">{new Date(log.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Raw data */}
          <div className="border-t border-[#1a1a1a]">
            <button onClick={() => setShowRaw(v => !v)} className="w-full px-5 py-3 flex items-center justify-between text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              <span className="font-bold uppercase tracking-widest">Dados brutos da serial</span>
              {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showRaw && (
              <div className="bg-black px-5 pb-4 max-h-40 overflow-y-auto font-mono text-xs text-green-400 space-y-0.5">
                {rawLog.length === 0 ? <p className="text-zinc-700 py-2">Sem dados ainda.</p> : rawLog.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ABA TCP / REDE ─────────────────────────────────────────────── */}
      {mode === 'tcp' && (
        <div className="p-6 space-y-6">
          {showHelp && (
            <div className="p-4 bg-[#050505] rounded-xl border border-[#1a1a1a] text-sm text-zinc-400 space-y-2">
              <p className="font-black text-white text-xs uppercase tracking-widest text-[#EDAC02]">Quando usar rede / TCP?</p>
              <p>Ideal quando o M-ID40 está <strong className="text-white">longe do notebook</strong> (cabos USB têm limite de ~5m). O leitor fica conectado ao Wi-Fi da arena e se comunica via TCP/IP.</p>
              <p>Use <strong className="text-white">Modo TCP Client</strong> se o notebook conecta ao M-ID40 (você sabe o IP do leitor). Use <strong className="text-white">Modo TCP Server</strong> se o M-ID40 se conecta ao notebook (configure o IP do notebook no leitor).</p>
            </div>
          )}

          {/* Config TCP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">IP do M-ID40</label>
              <input type="text" value={rfidIp} onChange={e => { setRfidIp(e.target.value); localStorage.setItem('rfid_ip', e.target.value); }} className={inputClass} placeholder="192.168.1.50" />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">Porta TCP</label>
              <input type="text" value={rfidPort} onChange={e => { setRfidPort(e.target.value); localStorage.setItem('rfid_port', e.target.value); }} className={inputClass} placeholder="5000" />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">ID do Leitor</label>
              <input type="text" value={readerId} onChange={e => { setReaderId(e.target.value); localStorage.setItem('rfid_reader_id', e.target.value); }} className={inputClass} placeholder="reader-1" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-black text-white uppercase tracking-widest">Modo TCP Client</p>
              <p className="text-xs text-zinc-500">Notebook conecta ao M-ID40. Saiba o IP do leitor na rede.</p>
              <CodeBlock>{cmdTcp}</CodeBlock>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black text-white uppercase tracking-widest">Modo TCP Server</p>
              <p className="text-xs text-zinc-500">Notebook abre porta TCP e aguarda o M-ID40 se conectar. Configure o IP deste notebook na interface web do leitor.</p>
              <CodeBlock>{cmdServer}</CodeBlock>
            </div>
          </div>

          <div className="p-4 bg-[#050505] rounded-xl border border-[#1a1a1a] text-xs text-zinc-500 space-y-1.5">
            <p className="font-bold text-zinc-400">Para rodar o bridge Node.js:</p>
            <CodeBlock>{cmdInstall}</CodeBlock>
            <p className="pt-1">O script ficará em execução no terminal monitorando as leituras e enviando ao Supabase. Substitua <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">sua-key</code> pelo valor de RFID_GATEWAY_KEY.</p>
          </div>
        </div>
      )}

      {/* ── ABA DIRETO ─────────────────────────────────────────────────── */}
      {mode === 'direct' && (
        <div className="p-6 space-y-6">
          {showHelp && (
            <div className="p-4 bg-[#050505] rounded-xl border border-[#1a1a1a] text-sm text-zinc-400 space-y-2">
              <p className="font-black text-white text-xs uppercase tracking-widest text-[#EDAC02]">Modo Direto — sem bridge</p>
              <p>O M-ID40 é configurado para fazer HTTP POST <strong className="text-white">diretamente ao Supabase</strong>, sem nenhum software intermediário no notebook. O leitor precisa ter acesso à internet.</p>
              <p>Verifique se o firmware do seu M-ID40 suporta <strong className="text-white">HTTP POST com HTTPS</strong> e headers customizados. Consulte o manual Via Onda ou acesse a interface web do leitor via IP.</p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Configurações para a interface web do M-ID40</p>

            <div className="space-y-3">
              {[
                { label: 'URL (endpoint)', value: GATEWAY_URL },
                { label: 'Método',         value: 'POST' },
                { label: 'Header',         value: 'x-rfid-api-key: <RFID_GATEWAY_KEY>' },
                { label: 'Content-Type',   value: 'application/json' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-zinc-600 mb-1">{label}</p>
                  <CodeBlock>{value}</CodeBlock>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-600 mb-1">Body JSON esperado pelo gateway</p>
              <CodeBlock>{`{"reader_id":"reader-1","antenna_index":1,"tag_epc":"E200341400...","rssi":-65}`}</CodeBlock>
            </div>

            <div className="p-4 bg-[#050505] rounded-xl border border-[#262626] text-xs text-zinc-400 space-y-2">
              <p className="font-bold text-white">Observações importantes:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>O campo <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">reader_id</code> deve ser igual ao configurado no painel de Antenas.</li>
                <li>O gateway aceita <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">antenna_index</code> como 1 ou 2.</li>
                <li>Se o M-ID40 usar um formato JSON diferente, será necessário um gateway intermediário ou atualização da edge function.</li>
                <li>O live feed não aparece nesta aba — para monitorar as leituras, acesse o Supabase → Table Editor → <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">rfid_reads</code>.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
