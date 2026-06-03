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
  const [mode, setMode]           = useState<Mode>('usb');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [apiKey, setApiKey]       = useState(() => localStorage.getItem('rfid_api_key')   || '');
  const [readerId, setReaderId]   = useState(() => localStorage.getItem('rfid_reader_id') || 'reader-1');
  const [rfidIp, setRfidIp]       = useState(() => localStorage.getItem('rfid_ip')        || '192.168.1.50');
  const [showHelpUsb, setShowHelpUsb]       = useState(false);
  const [showHelpTcp, setShowHelpTcp]       = useState(false);
  const [showHelpDirect, setShowHelpDirect] = useState(false);
  const [rfidPort, setRfidPort] = useState(() => localStorage.getItem('rfid_port')       || '5000');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [logs, setLogs]         = useState<ReadLog[]>([]);
  const [rawLog, setRawLog]     = useState<string[]>([]);
  const [showRaw, setShowRaw]         = useState(false);
  const [showConfig, setShowConfig]   = useState(false);

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
          <span className="text-xs font-normal text-zinc-500 normal-case ml-1">Conexão com o leitor RFID</span>
        </h2>
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
          <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#050505] flex justify-end">
            <button onClick={() => setShowHelpUsb(v => !v)} className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
              <HelpCircle className="w-3.5 h-3.5" /> Como conectar via USB {showHelpUsb ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          {showHelpUsb && (
            <div className="p-5 border-b border-[#1a1a1a] bg-[#050505] space-y-4">
              <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Guia — Conexão USB Serial</p>

              <div className="p-3 bg-[#0a0a0a] rounded-xl border border-[#262626] text-xs text-zinc-500 space-y-1">
                <p className="font-bold text-zinc-400">Requisitos:</p>
                <p>• Navegador <strong className="text-white">Chrome ou Edge versão 89+</strong> (Web Serial API não funciona em Firefox ou Safari)</p>
                <p>• Cabo USB conectado ao M-ID40</p>
                <p>• Driver USB do M-ID40 instalado no Windows (disponível no site <strong className="text-white">viaondarfid.com.br</strong> ou no CD do equipamento)</p>
              </div>

              <ol className="space-y-3 text-sm text-zinc-300">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">1</span>
                  <span><strong className="text-white">Instale o driver USB</strong> do M-ID40 no notebook. Após instalar, conecte o cabo USB. No Gerenciador de Dispositivos do Windows, confirme que aparece uma porta <strong className="text-white">COM</strong> (ex: COM3, COM4) em "Portas (COM e LPT)".</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">2</span>
                  <span>Clique em <strong className="text-white">Config</strong> (abaixo) e preencha os três campos: <strong className="text-white">API Key</strong> (valor de <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">RFID_GATEWAY_KEY</code> configurado no Supabase), <strong className="text-white">ID do Leitor</strong> (ex: reader-1 — deve ser idêntico ao valor configurado no painel de Antenas RFID) e <strong className="text-white">Baud Rate</strong> conforme o manual do M-ID40 (normalmente <strong className="text-white">9600</strong>).</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">3</span>
                  <span>Clique em <strong className="text-white">Conectar Leitor USB</strong>. O Chrome abrirá uma janela nativa para selecionar a porta serial — escolha a porta COM do M-ID40 (ex: COM3) e confirme.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">4</span>
                  <span>O indicador na barra de status ficará <strong className="text-green-400">verde — ONLINE</strong>. O sistema está lendo a porta serial em tempo real.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">5</span>
                  <span>Passe uma pulseira pela antena. A leitura deve aparecer no feed abaixo com status <strong className="text-green-400">REGISTRADO</strong>. Se aparecer <strong className="text-yellow-400">TAG DESCONHECIDA</strong>, a pulseira precisa ser cadastrada e atribuída no painel Pulseiras RFID.</span>
                </li>
              </ol>

              <div className="p-3 bg-[#0a0a0a] rounded-xl border border-[#262626] text-xs text-zinc-500 space-y-1.5">
                <p className="font-bold text-zinc-400">Diagnóstico de status:</p>
                <p><span className="text-green-400 font-bold">REGISTRADO</span> — passagem gravada no sistema com sucesso.</p>
                <p><span className="text-zinc-500 font-bold">DEBOUNCE</span> — mesma pulseira lida na mesma antena em menos de 5 segundos (ignorada).</p>
                <p><span className="text-yellow-400 font-bold">TAG DESCONHECIDA</span> — pulseira não atribuída a nenhum atleta.</p>
                <p><span className="text-orange-400 font-bold">SEM BATERIA ATIVA</span> — atleta não tem bateria com status "running".</p>
                <p><span className="text-red-400 font-bold">ANTENA NÃO CONFIG.</span> — a entrada RFID não foi mapeada para nenhum tapete.</p>
                <p className="pt-1">Use <strong className="text-zinc-300">Dados brutos</strong> (no final) para ver exatamente o que o M-ID40 está enviando e ajustar o parser se o formato for diferente.</p>
              </div>

              <div className="p-3 bg-[#0a0a0a] rounded-xl border border-[#262626] text-xs text-zinc-500">
                <p className="font-bold text-zinc-400 mb-1.5">Alternativa — rodar sem browser (Node.js):</p>
                <CodeBlock>{`CONNECTION_MODE=serial SERIAL_PORT=COM3 READER_ID=reader-1 RFID_GATEWAY_KEY=sua-key node rfid-bridge.js`}</CodeBlock>
                <p className="mt-2">Útil para rodar em background sem manter o navegador aberto.</p>
              </div>
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
        <div className="p-6 space-y-5">

          {/* Help TCP */}
          <div className="flex justify-between items-center">
            <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Configuração do bridge Node.js</p>
            <button onClick={() => setShowHelpTcp(v => !v)} className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
              <HelpCircle className="w-3.5 h-3.5" /> Como conectar via rede {showHelpTcp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          {showHelpTcp && (
            <div className="space-y-4 p-5 bg-[#050505] rounded-xl border border-[#1a1a1a]">
              <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Guia — Conexão TCP / Rede</p>

              <div className="p-3 bg-[#0a0a0a] rounded-xl border border-[#262626] text-xs text-zinc-500 space-y-1">
                <p className="font-bold text-zinc-400">Quando usar este modo:</p>
                <p>• Cabo USB tem limite de ~5m. Para distâncias maiores, use a rede.</p>
                <p>• O M-ID40 deve estar conectado à rede local (cabo Ethernet ou Wi-Fi) e o notebook na mesma rede.</p>
                <p>• Requisito: <strong className="text-white">Node.js instalado</strong> no notebook (download em nodejs.org).</p>
              </div>

              <div className="space-y-3 text-sm text-zinc-300">
                <p className="text-xs font-black text-white uppercase tracking-widest">Preparação (faça uma vez)</p>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">1</span>
                    <span>Descubra o <strong className="text-white">IP do M-ID40</strong> acessando a interface web do leitor pelo navegador (ex: http://192.168.1.50 — verifique o IP no roteador ou no display do leitor). Informe esse IP no campo abaixo.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">2</span>
                    <span>Abra um terminal na pasta <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">bridge/</code> do projeto e rode: <CodeBlock>{'npm install'}</CodeBlock></span>
                  </li>
                </ol>
              </div>

              <div className="space-y-3 text-sm text-zinc-300">
                <p className="text-xs font-black text-white uppercase tracking-widest">Modo TCP Client — notebook conecta ao M-ID40</p>
                <p className="text-xs text-zinc-500">Use quando o M-ID40 está configurado como servidor TCP (você sabe o IP do leitor). O notebook inicia a conexão.</p>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">1</span>
                    <span>Na interface web do M-ID40, configure-o para atuar como <strong className="text-white">servidor TCP</strong> na porta informada abaixo (padrão: 5000).</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">2</span>
                    <span>Preencha o IP e porta abaixo, copie o comando gerado e execute no terminal. Substitua <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">&lt;sua-key&gt;</code> pelo valor de <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">RFID_GATEWAY_KEY</code>.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">3</span>
                    <span>Deixe o terminal aberto durante toda a prova. Se a conexão cair, o script reconecta automaticamente em 5 segundos.</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-3 text-sm text-zinc-300">
                <p className="text-xs font-black text-white uppercase tracking-widest">Modo TCP Server — M-ID40 conecta ao notebook</p>
                <p className="text-xs text-zinc-500">Use quando você quer configurar o M-ID40 para se conectar ao notebook (útil se o IP do leitor muda). O notebook abre a porta e aguarda.</p>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">1</span>
                    <span>Execute o comando gerado abaixo com <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">CONNECTION_MODE=server</code>. O terminal exibirá "Aguardando M-ID40 na porta X".</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">2</span>
                    <span>Na interface web do M-ID40, configure-o para conectar ao <strong className="text-white">IP deste notebook</strong> na porta configurada (padrão: 5000). Descubra o IP do notebook com <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">ipconfig</code> no terminal.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">3</span>
                    <span>Salve e reinicie o leitor. O terminal do bridge exibirá "M-ID40 conectado de X.X.X.X" quando a conexão for estabelecida.</span>
                  </li>
                </ol>
              </div>
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
        <div className="p-6 space-y-5">

          {/* Help Direto */}
          <div className="flex justify-between items-center">
            <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Configuração do M-ID40</p>
            <button onClick={() => setShowHelpDirect(v => !v)} className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
              <HelpCircle className="w-3.5 h-3.5" /> Como configurar modo direto {showHelpDirect ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          {showHelpDirect && (
            <div className="space-y-4 p-5 bg-[#050505] rounded-xl border border-[#1a1a1a]">
              <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">Guia — M-ID40 postando direto ao Supabase</p>

              <div className="p-3 bg-[#0a0a0a] rounded-xl border border-[#262626] text-xs text-zinc-500 space-y-1">
                <p className="font-bold text-zinc-400">Quando usar este modo:</p>
                <p>• Sem notebook na pista — o leitor opera de forma totalmente autônoma.</p>
                <p>• O M-ID40 precisa de <strong className="text-white">acesso à internet</strong> (conectado ao roteador com saída para internet).</p>
                <p>• O firmware do M-ID40 deve suportar <strong className="text-white">HTTP POST com HTTPS e headers customizados</strong>. Consulte o manual Via Onda para confirmar.</p>
              </div>

              <ol className="space-y-3 text-sm text-zinc-300">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">1</span>
                  <span>Conecte o M-ID40 à rede (cabo Ethernet ou Wi-Fi). Descubra o IP do leitor pelo roteador ou display e acesse a <strong className="text-white">interface web</strong> pelo navegador: <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">http://IP_DO_LEITOR</code></span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">2</span>
                  <span>Localize a seção de <strong className="text-white">integração HTTP, Webhook ou Output</strong> no painel do leitor. Configure:</span>
                </li>
              </ol>

              <div className="space-y-2 pl-9">
                {[
                  { label: 'URL',          value: GATEWAY_URL },
                  { label: 'Método',       value: 'POST' },
                  { label: 'Header',       value: 'x-rfid-api-key: SEU_RFID_GATEWAY_KEY' },
                  { label: 'Content-Type', value: 'application/json' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-zinc-600 mb-1">{label}</p>
                    <CodeBlock>{value}</CodeBlock>
                  </div>
                ))}
              </div>

              <ol className="space-y-3 text-sm text-zinc-300" start={3}>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">3</span>
                  <span>Configure o <strong className="text-white">formato do body JSON</strong> que o M-ID40 enviará. O gateway aceita vários nomes de campo — use o formato abaixo ou adapte conforme o que seu firmware suporta:</span>
                </li>
              </ol>

              <div className="pl-9 space-y-2">
                <p className="text-xs text-zinc-600">Formato padrão:</p>
                <CodeBlock>{`{"reader_id":"reader-1","antenna_index":1,"tag_epc":"E200341400...","rssi":-65}`}</CodeBlock>
                <p className="text-xs text-zinc-600 mt-2">Formatos alternativos aceitos (campos equivalentes):</p>
                <div className="p-3 bg-[#0a0a0a] rounded-xl border border-[#262626] text-xs text-zinc-400 space-y-1 font-mono">
                  <p><span className="text-zinc-600">reader_id   =</span> reader_id <span className="text-zinc-700">|</span> readerid <span className="text-zinc-700">|</span> reader <span className="text-zinc-700">|</span> ReaderID</p>
                  <p><span className="text-zinc-600">antenna_index =</span> antenna_index <span className="text-zinc-700">|</span> antennaid <span className="text-zinc-700">|</span> antenna <span className="text-zinc-700">|</span> AntennaID</p>
                  <p><span className="text-zinc-600">tag_epc     =</span> tag_epc <span className="text-zinc-700">|</span> epc <span className="text-zinc-700">|</span> tagid <span className="text-zinc-700">|</span> EPC</p>
                  <p><span className="text-zinc-600">rssi        =</span> rssi <span className="text-zinc-700">|</span> signal <span className="text-zinc-700">|</span> RSSI</p>
                </div>
              </div>

              <ol className="space-y-3 text-sm text-zinc-300" start={4}>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">4</span>
                  <span><strong className="text-white">Salve as configurações</strong> e reinicie o leitor. A partir deste momento, cada passagem de pulseira gera um POST automático ao gateway.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-black flex items-center justify-center shrink-0">5</span>
                  <span><strong className="text-white">Teste:</strong> passe uma pulseira e verifique no Supabase → SQL Editor: <code className="bg-[#1a1a1a] px-1 rounded text-[#EDAC02]">SELECT * FROM rfid_reads ORDER BY read_at DESC LIMIT 5;</code> — a leitura deve aparecer. Neste modo não há feed ao vivo no browser.</span>
                </li>
              </ol>
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
