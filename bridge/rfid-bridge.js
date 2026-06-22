/**
 * UAIROX RFID Bridge — M-ID40 LIGHT (Via Onda / UHFReader288)
 *
 * Conecta ao leitor, decodifica os frames de leitura e envia ao rfid-gateway.
 *
 * Modos de conexão:
 *   tcp     — TCP client: o notebook conecta ao leitor (M-ID40 = servidor TCP)  ← padrão p/ M-ID40 LIGHT
 *   server  — TCP server local: o M-ID40 se conecta ao notebook
 *   serial  — USB serial (cabo USB Type B direto)
 *
 * Protocolo de dados (RFID_PROTOCOL):
 *   mid40   — frames binários do M-ID40 em modo ativo/tempo-real (padrão)
 *   ascii   — linhas de texto "EPC,ANT,RSSI" (caso o leitor seja configurado assim)
 *
 * IMPORTANTE: o leitor precisa estar configurado em MODO ATIVO / TEMPO-REAL
 * (real-time upload) na sua configuração — assim ele transmite cada leitura
 * sozinha pela porta TCP. O app demo (M-ID40-Light-Demo) liga esse modo.
 *
 * Uso:
 *   CONNECTION_MODE=tcp RFID_IP=192.168.0.10 RFID_PORT=5000 \
 *     READER_ID=reader-1 RFID_GATEWAY_KEY=xxx node rfid-bridge.js
 *
 * Variáveis de ambiente:
 *   CONNECTION_MODE    tcp | server | serial          (padrão: tcp)
 *   RFID_PROTOCOL      mid40 | ascii                   (padrão: mid40)
 *   RFID_IP            IP do M-ID40                     (padrão: 192.168.0.10)
 *   RFID_PORT          Porta TCP do M-ID40             (padrão: 5000)
 *   SERIAL_PORT        Porta COM, ex: COM3             (modo serial)
 *   BAUD_RATE          Padrão: 57600                   (modo serial)
 *   ANT_MODE           bitmask | index                 (decodificação da antena, padrão: bitmask)
 *   RSSI_MIN           Corte de RSSI: ignora leituras com sinal abaixo deste valor.
 *                      Serve para só registrar quem PASSA perto da antena e ignorar
 *                      pulseiras paradas a alguns metros. 0 = desligado (padrão).
 *   READER_ID          Identificador deste leitor      (padrão: reader-1)
 *   RFID_GATEWAY_KEY   API key do Supabase             (obrigatório)
 */

const https = require('https');
const net   = require('net');

// Anon key pública do Supabase (mesma do frontend) — satisfaz a verificação JWT
// da plataforma. A segurança real é o header x-rfid-api-key.
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZXRjbmt2Z3R1YXRjY2hyb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzAzNzMsImV4cCI6MjA5MTM0NjM3M30.5JA4vx2PN1kePf9L9qMp23ogORXhRnqZmtzw0BMJ8xs';
const SUPABASE_URL = 'https://dhetcnkvgtuatcchropm.supabase.co';

const CONFIG = {
  mode:       process.env.CONNECTION_MODE || 'tcp',
  protocol:   process.env.RFID_PROTOCOL   || 'mid40',
  // TCP
  tcpHost:    process.env.RFID_IP          || '192.168.0.10',
  tcpPort:    parseInt(process.env.RFID_PORT || '5000'),
  // Serial
  portName:   process.env.SERIAL_PORT      || 'COM3',
  baudRate:   parseInt(process.env.BAUD_RATE || '57600'),
  // Antena
  antMode:    process.env.ANT_MODE         || 'bitmask',
  // Corte de RSSI (0 = desligado). Se RSSI_MIN for definido, usa fixo (manual);
  // senão, sincroniza automaticamente com o campo "Sinal mínimo (RSSI)" do evento.
  rssiMin:    parseInt(process.env.RSSI_MIN || '0'),
  rssiManual: process.env.RSSI_MIN !== undefined && process.env.RSSI_MIN !== '',
  // Anti-duplicidade local POR ATLETA (em qualquer antena). Se DEBOUNCE_MS for
  // definido no ambiente, usa esse valor fixo (override manual). Senão, o bridge
  // sincroniza automaticamente com o campo "Zona Cega" do evento (knob único).
  debounceMs:     parseInt(process.env.DEBOUNCE_MS || '40000'),
  debounceManual: process.env.DEBOUNCE_MS !== undefined && process.env.DEBOUNCE_MS !== '',
  // Verboso: loga TODA leitura crua (útil pra calibrar; deixe desligado na prova)
  verbose:    process.env.VERBOSE === '1' || process.env.VERBOSE === 'true',
  // Comum
  readerId:   process.env.READER_ID        || 'reader-1',
  gatewayUrl: 'https://dhetcnkvgtuatcchropm.supabase.co/functions/v1/rfid-gateway',
  apiKey:     process.env.RFID_GATEWAY_KEY || '',
};

// ── CRC-16 (poly 0x8408, init 0xFFFF) ─────────────────────────────────────────
// Calculado sobre o frame inteiro INCLUINDO os 2 bytes de CRC finais.
// Frame válido → resultado 0. (Idêntico ao CheckCRC do SDK Via Onda.)
function crcOk(buf) {
  let crc = 0xFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? ((crc >> 1) ^ 0x8408) : (crc >> 1);
    }
  }
  return (crc & 0xFFFF) === 0;
}

// ── Decodifica o byte de antena ───────────────────────────────────────────────
function decodeAnt(b) {
  if (CONFIG.antMode === 'index') return b + 1;        // 0→1, 1→2, ...
  // bitmask: 0x01→1, 0x02→2, 0x04→3, 0x08→4
  if (b === 1 || b === 2 || b === 4 || b === 8) return Math.log2(b) + 1;
  return b + 1; // fallback
}

// ── Parser de frame M-ID40 (modo ativo / tempo-real) ──────────────────────────
// Layout (hex), após sincronizar em ...EE 00:
//   tempo-real: Len ComAdr EE 00 Ant(1) LenByte(1) EPC(n) RSSI(1) [Phase(4)] CRC(2)
//               EPC bytes = LenByte & 0x3F ; bit 0x40 = tem dados de phase
//   ativo/ts  : Len ComAdr EE 00 Time(4) Time(4) Count(2) Ant(1) EPC(n) CRC(2)  (sem RSSI)
function parseMid40Frame(frame) {
  const frameLen = frame.length;          // = Len + 1
  const lenByte  = frame[5];
  const epcBytes = lenByte & 0x3F;
  const phase    = (lenByte & 0x40) ? 4 : 0;
  const expectedRealtime = 6 + epcBytes + 1 + phase + 2;

  if (expectedRealtime === frameLen && epcBytes >= 4) {
    return {
      tag_epc:       frame.subarray(6, 6 + epcBytes).toString('hex').toUpperCase(),
      antenna_index: decodeAnt(frame[4]),
      rssi:          frame[6 + epcBytes],   // byte cru (0–255)
      antRaw:        frame[4],
    };
  }
  // formato ativo com timestamps (sem RSSI)
  if (frameLen >= 17) {
    return {
      tag_epc:       frame.subarray(15, frameLen - 2).toString('hex').toUpperCase(),
      antenna_index: decodeAnt(frame[14]),
      rssi:          null,
      antRaw:        frame[14],
    };
  }
  return null;
}

// Acumula bytes, sincroniza em EE 00 e extrai frames validados por CRC.
function makeMid40Processor() {
  let buf = Buffer.alloc(0);
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 8) {
      // procura o cabeçalho EE 00 (precisa de Len e ComAdr antes dele)
      let idx = -1;
      for (let i = 2; i + 1 < buf.length; i++) {
        if (buf[i] === 0xEE && buf[i + 1] === 0x00) { idx = i; break; }
      }
      if (idx < 0) { buf = buf.subarray(buf.length - 1); break; } // mantém 1 byte (EE pode estar partido)

      const start    = idx - 2;            // posição do byte Len
      const frameLen = buf[start] + 1;     // Len conta os bytes após si mesmo
      if (frameLen < 8 || frameLen > 1024) { buf = buf.subarray(idx); continue; }
      if (buf.length - start < frameLen) { buf = buf.subarray(start); break; } // incompleto

      const frame = buf.subarray(start, start + frameLen);
      if (!crcOk(frame)) { buf = buf.subarray(idx); continue; }   // CRC ruim → ressincroniza

      const parsed = parseMid40Frame(frame);
      if (parsed) handleRead(parsed, frame.toString('hex').toUpperCase());
      buf = buf.subarray(start + frameLen);
    }
  };
}

// ── Parser ASCII (fallback) ───────────────────────────────────────────────────
function parseAsciiLine(line) {
  const clean = line.trim();
  if (!clean) return null;
  const epcMatch = clean.match(/[0-9A-Fa-f]{12,}/);
  if (!epcMatch) return null;
  const antMatch  = clean.match(/ANT[=:\s]+(\d)/i) || clean.match(/,\s*([1-4])\s*[,\s]/);
  const rssiMatch = clean.match(/RSSI[=:\s]+(-?\d+)/i) || clean.match(/,\s*(-?\d+)\s*$/);
  return {
    tag_epc:       epcMatch[0].toUpperCase(),
    antenna_index: antMatch ? parseInt(antMatch[1]) : 1,
    rssi:          rssiMatch ? parseInt(rssiMatch[1]) : null,
  };
}
function makeAsciiProcessor() {
  let buf = '';
  return (chunk) => {
    buf += chunk.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? '';
    lines.forEach(l => { const p = parseAsciiLine(l); if (p) handleRead(p, l.trim()); });
  };
}

const makeProcessor = () => CONFIG.protocol === 'ascii' ? makeAsciiProcessor() : makeMid40Processor();

// ── Gateway ───────────────────────────────────────────────────────────────────
function sendToGateway(payload) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify(payload);
    const url     = new URL(CONFIG.gatewayUrl);
    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-rfid-api-key': CONFIG.apiKey,
        'Authorization':  `Bearer ${ANON_KEY}`,
        'apikey':         ANON_KEY,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Sincronização do debounce com o evento (campo "Zona Cega") ───────────────
// GET simples ao PostgREST do Supabase (usa a anon key).
function restGet(path) {
  return new Promise((resolve) => {
    const url = new URL(SUPABASE_URL + path);
    const req = https.get({
      hostname: url.hostname,
      path:     url.pathname + url.search,
      headers:  { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

// Descobre o evento que este leitor cobre e lê debounce_seconds + rfid_rssi_min.
async function syncConfigFromServer() {
  // 1) evento com antena ativa para este reader_id (mais recente)
  const ants = await restGet(
    `/rest/v1/rfid_antennas?reader_id=eq.${encodeURIComponent(CONFIG.readerId)}` +
    `&is_active=eq.true&select=event_id,created_at&order=created_at.desc&limit=1`);
  if (!Array.isArray(ants) || !ants.length) return;
  // 2) parâmetros do evento
  const evs = await restGet(
    `/rest/v1/events?id=eq.${ants[0].event_id}&select=debounce_seconds,rfid_rssi_min`);
  if (!Array.isArray(evs) || !evs.length) return;
  const ev = evs[0];

  // Debounce (se não for override manual)
  if (!CONFIG.debounceManual && typeof ev.debounce_seconds === 'number' && ev.debounce_seconds > 0) {
    const ms = ev.debounce_seconds * 1000;
    if (ms !== CONFIG.debounceMs) {
      CONFIG.debounceMs = ms;
      console.log(`[config] Debounce sincronizado do evento: ${ev.debounce_seconds}s`);
    }
  }

  // Corte de RSSI (se não for override manual)
  if (!CONFIG.rssiManual && typeof ev.rfid_rssi_min === 'number') {
    if (ev.rfid_rssi_min !== CONFIG.rssiMin) {
      CONFIG.rssiMin = ev.rfid_rssi_min;
      console.log(`[config] Corte de RSSI sincronizado do evento: ${ev.rfid_rssi_min || 'desligado'}`);
    }
  }
}

// ── Anti-duplicidade local ────────────────────────────────────────────────────
// Última vez (ms) que cada tag+antena foi ACEITA. Colapsa a enxurrada de
// leituras de uma mesma passagem numa única marcação.
const lastSeen = new Map();

// ── Handler de leitura ──────────────────────────────────────────────────────
async function handleRead(parsed, raw) {
  const hora = new Date().toLocaleTimeString('pt-BR');

  if (CONFIG.verbose) {
    console.log(`[RAW] ${raw}`);
    console.log(`      EPC ${parsed.tag_epc}  ANT ${parsed.antenna_index}` +
                (parsed.antRaw !== undefined ? ` (0x${parsed.antRaw.toString(16).padStart(2,'0')})` : '') +
                `  RSSI ${parsed.rssi ?? 'n/a'}`);
  }

  // 1) Corte de RSSI: ignora sinal fraco (pulseira longe/parada)
  if (CONFIG.rssiMin > 0 && parsed.rssi !== null && parsed.rssi < CONFIG.rssiMin) {
    if (CONFIG.verbose) console.log(`      ⤵️  ignorado (RSSI ${parsed.rssi} < ${CONFIG.rssiMin})`);
    return;
  }

  // 2) Debounce local POR ATLETA (pulseira), independente da antena.
  //    Após registrar, a mesma pulseira fica ignorada por DEBOUNCE_MS em
  //    QUALQUER antena. Atualiza o timestamp ANTES do await → frames
  //    concorrentes do mesmo burst são descartados sem envios duplicados.
  const key   = parsed.tag_epc;
  const nowMs = Date.now();
  const last  = lastSeen.get(key);
  if (last !== undefined && (nowMs - last) < CONFIG.debounceMs) {
    if (CONFIG.verbose) console.log(`      ⏱️  debounce local (${nowMs - last}ms)`);
    return;
  }
  lastSeen.set(key, nowMs);

  // 3) Envia ao gateway
  try {
    const result = await sendToGateway({
      reader_id:     CONFIG.readerId,
      antenna_index: parsed.antenna_index,
      tag_epc:       parsed.tag_epc,
      rssi:          parsed.rssi,
      read_at:       new Date().toISOString(),
    });
    const status = result.body?.status ?? (result.status === 200 ? 'ok' : 'erro');
    const icon   = { ok: '✅', debounce: '⏱️', unknown_tag: '❓', no_running_heat: '⚠️',
                     no_antenna_config: '🚧', no_heat_assignment: '⚠️', weak_signal: '🔉',
                     race_complete: '🏁' }[status] ?? '⚠️';
    console.log(`[${hora}] ${icon} ${parsed.tag_epc}  ANT ${parsed.antenna_index}  RSSI ${parsed.rssi ?? 'n/a'}  →  ${status}`);
  } catch (err) {
    console.error(`[${hora}] ❌ ${parsed.tag_epc}  falha ao enviar: ${err.message}`);
  }
}

// ── Modo TCP CLIENT (notebook conecta ao M-ID40) ─────────────────────────────
function startTcpClient() {
  console.log(`[Modo TCP Client] Conectando a ${CONFIG.tcpHost}:${CONFIG.tcpPort}...\n`);
  function connect() {
    const processChunk = makeProcessor();
    const socket = new net.Socket();
    socket.connect(CONFIG.tcpPort, CONFIG.tcpHost, () =>
      console.log(`[OK] Conectado ao M-ID40 em ${CONFIG.tcpHost}:${CONFIG.tcpPort}. Aguardando leituras...\n`));
    socket.on('data',  processChunk);
    socket.on('error', e => console.error('[ERRO TCP]', e.message));
    socket.on('close', () => { console.warn('[AVISO] Conexão encerrada. Reconectando em 5s...'); setTimeout(connect, 5000); });
  }
  connect();
}

// ── Modo TCP SERVER (M-ID40 se conecta ao notebook) ──────────────────────────
function startTcpServer() {
  console.log(`[Modo TCP Server] Aguardando M-ID40 na porta ${CONFIG.tcpPort}...\n`);
  const server = net.createServer((socket) => {
    console.log(`[OK] M-ID40 conectado de ${socket.remoteAddress}\n`);
    const processChunk = makeProcessor();
    socket.on('data',  processChunk);
    socket.on('error', e => console.error('[ERRO conexão]', e.message));
    socket.on('close', () => console.log('[INFO] M-ID40 desconectou.\n'));
  });
  server.listen(CONFIG.tcpPort, '0.0.0.0', () =>
    console.log(`[OK] Servidor TCP ouvindo em 0.0.0.0:${CONFIG.tcpPort}\n`));
  server.on('error', e => console.error('[ERRO servidor]', e.message));
}

// ── Modo SERIAL (USB) ─────────────────────────────────────────────────────────
function startSerial() {
  const { SerialPort } = require('serialport');
  console.log(`[Modo USB/Serial] Porta: ${CONFIG.portName}  Baud: ${CONFIG.baudRate}\n`);
  const port = new SerialPort({ path: CONFIG.portName, baudRate: CONFIG.baudRate });
  const processChunk = makeProcessor();
  port.on('open',  () => console.log('[OK] Porta serial aberta. Aguardando leituras...\n'));
  port.on('error', e  => console.error('[ERRO serial]', e.message));
  port.on('data',  processChunk);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!CONFIG.apiKey) {
    console.error('[ERRO] RFID_GATEWAY_KEY não definida. Defina antes de iniciar.');
    process.exit(1);
  }
  console.log('╔══════════════════════════════════════╗');
  console.log('║   UAIROX RFID Bridge — M-ID40 LIGHT  ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  Modo       : ${CONFIG.mode}`);
  console.log(`  Protocolo  : ${CONFIG.protocol}`);
  console.log(`  Reader ID  : ${CONFIG.readerId}`);
  console.log(`  Antena     : ${CONFIG.antMode}`);
  console.log(`  RSSI mín.  : ${CONFIG.rssiManual ? (CONFIG.rssiMin > 0 ? CONFIG.rssiMin + ' (fixo)' : 'desligado (fixo)') : 'auto — campo "Sinal mínimo" do evento'}`);
  console.log(`  Debounce   : ${CONFIG.debounceManual ? CONFIG.debounceMs + 'ms (fixo)' : 'auto — campo "Zona Cega" do evento'}`);
  console.log(`  Verboso    : ${CONFIG.verbose ? 'sim' : 'não'}`);
  console.log(`  Gateway    : ${CONFIG.gatewayUrl}`);
  console.log('');

  // Sincroniza debounce + corte de RSSI com o evento (campos da tela Race Day).
  // Pula só se AMBOS forem override manual. ESPERA o 1º sync antes de ler,
  // pra nenhuma leitura escapar do filtro no arranque.
  if (!CONFIG.debounceManual || !CONFIG.rssiManual) {
    await syncConfigFromServer();
    setInterval(syncConfigFromServer, 60000);
  }

  switch (CONFIG.mode) {
    case 'tcp':    startTcpClient(); break;
    case 'server': startTcpServer(); break;
    case 'serial': startSerial();    break;
    default:
      console.error(`[ERRO] Modo desconhecido: "${CONFIG.mode}". Use: tcp | server | serial`);
      process.exit(1);
  }
}

main();
