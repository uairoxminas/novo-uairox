/**
 * UAIROX RFID Bridge — M-ID40 LIGHT
 *
 * Suporta três modos de conexão com o leitor:
 *
 *   serial  — USB serial (cabo USB direto no notebook)
 *   tcp     — TCP socket (M-ID40 na rede local via IP)
 *   server  — TCP server local (M-ID40 se conecta ao notebook)
 *
 * Uso:
 *   npm install
 *   CONNECTION_MODE=serial  RFID_GATEWAY_KEY=xxx node rfid-bridge.js
 *   CONNECTION_MODE=tcp     RFID_IP=192.168.1.50 RFID_GATEWAY_KEY=xxx node rfid-bridge.js
 *   CONNECTION_MODE=server  RFID_GATEWAY_KEY=xxx node rfid-bridge.js
 *
 * Variáveis de ambiente:
 *   CONNECTION_MODE    serial | tcp | server (padrão: serial)
 *   SERIAL_PORT        Porta COM, ex: COM3 ou /dev/ttyUSB0 (modo serial)
 *   BAUD_RATE          Padrão: 9600 (modo serial)
 *   RFID_IP            IP do M-ID40, ex: 192.168.1.50 (modo tcp)
 *   RFID_PORT          Porta TCP do M-ID40, ex: 5000 (modos tcp/server, padrão: 5000)
 *   READER_ID          Identificador deste leitor, ex: reader-1
 *   RFID_GATEWAY_KEY   API key configurada no Supabase (obrigatório)
 */

const https = require('https');
const net   = require('net');

const MODE = process.env.CONNECTION_MODE || 'serial';

const CONFIG = {
  mode:       MODE,
  // Serial
  portName:   process.env.SERIAL_PORT       || 'COM3',
  baudRate:   parseInt(process.env.BAUD_RATE || '9600'),
  // TCP
  tcpHost:    process.env.RFID_IP            || '192.168.1.50',
  tcpPort:    parseInt(process.env.RFID_PORT || '5000'),
  // Comum
  readerId:   process.env.READER_ID          || 'reader-1',
  gatewayUrl: 'https://dhetcnkvgtuatcchropm.supabase.co/functions/v1/rfid-gateway',
  apiKey:     process.env.RFID_GATEWAY_KEY   || '',
};

// ── Parser ───────────────────────────────────────────────────────────────────
// Aceita as linhas ASCII enviadas pelo M-ID40 nos formatos:
//   E200341400000001,1,-65
//   TAG:E200341400000001 ANT:1 RSSI:-65
//   +READ:EPC=E200341400000001,ANT=1,RSSI=-65

function parseLine(line) {
  const clean = line.trim();
  if (!clean) return null;
  const epcMatch = clean.match(/[0-9A-Fa-f]{12,}/);
  if (!epcMatch) return null;
  const tag_epc      = epcMatch[0].toUpperCase();
  const antMatch     = clean.match(/ANT[=:\s]+(\d)/i) || clean.match(/,\s*([12])\s*[,\s]/);
  const antenna_index = antMatch ? parseInt(antMatch[1]) : 1;
  const rssiMatch    = clean.match(/RSSI[=:\s]+(-?\d+)/i) || clean.match(/,\s*(-\d+)\s*$/);
  const rssi         = rssiMatch ? parseInt(rssiMatch[1]) : null;
  return { tag_epc, antenna_index, rssi };
}

// ── Gateway ───────────────────────────────────────────────────────────────────
function sendToGateway(payload) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify(payload);
    const url     = new URL(CONFIG.gatewayUrl);
    const options = {
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-rfid-api-key': CONFIG.apiKey,
      },
    };
    const req = https.request(options, (res) => {
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

// ── Handler de linha ──────────────────────────────────────────────────────────
async function handleLine(line) {
  const ts = new Date().toISOString();
  console.log(`[RAW] ${line}`);
  const parsed = parseLine(line);
  if (!parsed) { console.log('      → ignorado (sem EPC)\n'); return; }
  console.log(`      → EPC: ${parsed.tag_epc}  ANT: ${parsed.antenna_index}  RSSI: ${parsed.rssi ?? 'n/a'}`);
  try {
    const result = await sendToGateway({
      reader_id:     CONFIG.readerId,
      antenna_index: parsed.antenna_index,
      tag_epc:       parsed.tag_epc,
      rssi:          parsed.rssi,
      read_at:       ts,
    });
    const status = result.body?.status ?? (result.status === 200 ? 'ok' : 'erro');
    const icon   = { ok: '✅', debounce: '⏱️', unknown_tag: '❓', no_running_heat: '⚠️' }[status] ?? '⚠️';
    console.log(`      ${icon} Gateway: ${status}\n`);
  } catch (err) {
    console.error(`      ❌ Falha ao enviar: ${err.message}\n`);
  }
}

// ── Buffer de linhas (compartilhado) ─────────────────────────────────────────
function makeLineProcessor() {
  let buf = '';
  return (chunk) => {
    buf += chunk.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? '';
    lines.forEach(l => { if (l.trim()) handleLine(l); });
  };
}

// ── Modo SERIAL ───────────────────────────────────────────────────────────────
function startSerial() {
  const { SerialPort }    = require('serialport');
  const { ReadlineParser } = require('@serialport/parser-readline');
  console.log(`[Modo USB/Serial] Porta: ${CONFIG.portName}  Baud: ${CONFIG.baudRate}\n`);
  const port   = new SerialPort({ path: CONFIG.portName, baudRate: CONFIG.baudRate });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
  port.on('open',  () => console.log('[OK] Porta serial aberta. Aguardando tags...\n'));
  port.on('error', e  => console.error('[ERRO serial]', e.message));
  parser.on('data', handleLine);
}

// ── Modo TCP CLIENT (notebook conecta ao M-ID40) ─────────────────────────────
function startTcpClient() {
  const processChunk = makeLineProcessor();
  console.log(`[Modo TCP Client] Conectando a ${CONFIG.tcpHost}:${CONFIG.tcpPort}...\n`);

  function connect() {
    const socket = new net.Socket();
    socket.connect(CONFIG.tcpPort, CONFIG.tcpHost, () => {
      console.log(`[OK] Conectado ao M-ID40 em ${CONFIG.tcpHost}:${CONFIG.tcpPort}\n`);
    });
    socket.on('data',  processChunk);
    socket.on('error', e => console.error('[ERRO TCP]', e.message));
    socket.on('close', () => {
      console.warn('[AVISO] Conexão TCP encerrada. Reconectando em 5s...');
      setTimeout(connect, 5000);
    });
  }
  connect();
}

// ── Modo TCP SERVER (M-ID40 se conecta ao notebook) ──────────────────────────
function startTcpServer() {
  console.log(`[Modo TCP Server] Aguardando M-ID40 na porta ${CONFIG.tcpPort}...\n`);
  const server = net.createServer((socket) => {
    console.log(`[OK] M-ID40 conectado de ${socket.remoteAddress}\n`);
    const processChunk = makeLineProcessor();
    socket.on('data',  processChunk);
    socket.on('error', e => console.error('[ERRO conexão]', e.message));
    socket.on('close', () => console.log('[INFO] M-ID40 desconectou.\n'));
  });
  server.listen(CONFIG.tcpPort, '0.0.0.0', () => {
    console.log(`[OK] Servidor TCP ouvindo em 0.0.0.0:${CONFIG.tcpPort}`);
    console.log(`     Configure o M-ID40 para conectar ao IP deste notebook na porta ${CONFIG.tcpPort}\n`);
  });
  server.on('error', e => console.error('[ERRO servidor]', e.message));
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  if (!CONFIG.apiKey) {
    console.error('[ERRO] RFID_GATEWAY_KEY não definida. Defina antes de iniciar.');
    process.exit(1);
  }
  console.log('╔══════════════════════════════════════╗');
  console.log('║   UAIROX RFID Bridge — M-ID40 LIGHT  ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  Modo       : ${CONFIG.mode}`);
  console.log(`  Reader ID  : ${CONFIG.readerId}`);
  console.log(`  Gateway    : ${CONFIG.gatewayUrl}`);
  console.log('');

  switch (CONFIG.mode) {
    case 'serial': startSerial();    break;
    case 'tcp':    startTcpClient(); break;
    case 'server': startTcpServer(); break;
    default:
      console.error(`[ERRO] Modo desconhecido: "${CONFIG.mode}". Use: serial | tcp | server`);
      process.exit(1);
  }
}

main();
