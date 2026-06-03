/**
 * UAIROX RFID Bridge — M-ID40 LIGHT
 *
 * Reads serial data from the M-ID40 LIGHT RFID reader via USB and
 * forwards each tag read to the rfid-gateway Supabase Edge Function.
 *
 * Usage:
 *   node rfid-bridge.js
 *
 * Requirements:
 *   npm install serialport
 *
 * Config via environment variables (or edit the CONFIG block below):
 *   SERIAL_PORT      COM port name, e.g. COM3 (Windows) or /dev/ttyUSB0 (Linux)
 *   BAUD_RATE        Default: 9600
 *   READER_ID        Identifies this reader unit, e.g. reader-1
 *   RFID_GATEWAY_KEY API key set in Supabase secrets
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const https = require('https');

// ── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  portName:   process.env.SERIAL_PORT      || 'COM3',
  baudRate:   parseInt(process.env.BAUD_RATE || '9600'),
  readerId:   process.env.READER_ID         || 'reader-1',
  gatewayUrl: 'https://dhetcnkvgtuatcchropm.supabase.co/functions/v1/rfid-gateway',
  apiKey:     process.env.RFID_GATEWAY_KEY  || '',
};

// ── Protocol Parser ───────────────────────────────────────────────────────────
// Parses a raw ASCII line from the M-ID40.
// Common formats sent by the reader:
//   E200341400000001,1,-65
//   TAG:E200341400000001 ANT:1 RSSI:-65
//   +READ:EPC=E200341400000001,ANT=1,RSSI=-65
//
// Returns { tag_epc, antenna_index, rssi } or null if unparseable.

function parseLine(line) {
  const clean = line.trim();
  if (!clean) return null;

  const epcMatch = clean.match(/[0-9A-Fa-f]{12,}/);
  if (!epcMatch) return null;

  const tag_epc = epcMatch[0].toUpperCase();
  const antMatch = clean.match(/ANT[=:\s]+(\d)/i) || clean.match(/,\s*([12])\s*[,\s]/);
  const antenna_index = antMatch ? parseInt(antMatch[1]) : 1;
  const rssiMatch = clean.match(/RSSI[=:\s]+(-?\d+)/i) || clean.match(/,\s*(-\d+)\s*$/);
  const rssi = rssiMatch ? parseInt(rssiMatch[1]) : null;

  return { tag_epc, antenna_index, rssi };
}

// ── HTTP POST to rfid-gateway ────────────────────────────────────────────────

function sendToGateway(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(CONFIG.gatewayUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-rfid-api-key': CONFIG.apiKey,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
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

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  if (!CONFIG.apiKey) {
    console.error('[ERRO] RFID_GATEWAY_KEY não definida. Defina a variável de ambiente antes de iniciar.');
    process.exit(1);
  }

  console.log(`[UAIROX RFID Bridge]`);
  console.log(`  Porta serial : ${CONFIG.portName}`);
  console.log(`  Baud rate    : ${CONFIG.baudRate}`);
  console.log(`  Reader ID    : ${CONFIG.readerId}`);
  console.log(`  Gateway      : ${CONFIG.gatewayUrl}`);
  console.log('');

  const port = new SerialPort({ path: CONFIG.portName, baudRate: CONFIG.baudRate });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  port.on('open', () => console.log('[OK] Porta serial aberta. Aguardando tags RFID...\n'));
  port.on('error', err => console.error('[ERRO serial]', err.message));

  parser.on('data', async (line) => {
    const ts = new Date().toISOString();
    console.log(`[RAW] ${line}`);

    const parsed = parseLine(line);
    if (!parsed) {
      console.log(`      → linha ignorada (formato não reconhecido)\n`);
      return;
    }

    console.log(`      → EPC: ${parsed.tag_epc}  ANT: ${parsed.antenna_index}  RSSI: ${parsed.rssi ?? 'n/a'}`);

    try {
      const result = await sendToGateway({
        reader_id: CONFIG.readerId,
        antenna_index: parsed.antenna_index,
        tag_epc: parsed.tag_epc,
        rssi: parsed.rssi,
        read_at: ts,
      });

      const status = result.body?.status ?? (result.status === 200 ? 'ok' : 'erro');
      const icon = status === 'ok' ? '✅' : status === 'debounce' ? '⏱️' : status === 'unknown_tag' ? '❓' : '⚠️';
      console.log(`      ${icon} Gateway: ${status}\n`);
    } catch (err) {
      console.error(`      ❌ Falha ao enviar ao gateway: ${err.message}\n`);
    }
  });
}

main();
