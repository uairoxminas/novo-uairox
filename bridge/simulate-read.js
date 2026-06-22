/**
 * UAIROX — Simulador de leitura RFID
 *
 * Envia uma leitura FALSA direto ao rfid-gateway, sem precisar de hardware.
 * Serve para validar todo o pipeline do UAIROX (assignment → antena →
 * debounce → race_splits) antes de o leitor M-ID40 estar funcionando.
 *
 * Uso (PowerShell):
 *   $env:RFID_GATEWAY_KEY="sua-key"; $env:TAG_EPC="E2003414..."; node simulate-read.js
 *
 * Variáveis de ambiente:
 *   RFID_GATEWAY_KEY   API key (= RFID_GATEWAY_KEY do Supabase)   [obrigatório]
 *   TAG_EPC            EPC da pulseira a simular                  [obrigatório]
 *   READER_ID          Identificador do leitor (padrão: reader-1)
 *   ANTENNA_INDEX      Porta da antena (padrão: 1)
 *   RSSI               Força do sinal (padrão: -60)
 */

const https = require('https');

// Anon key pública do Supabase (satisfaz a verificação JWT da plataforma).
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZXRjbmt2Z3R1YXRjY2hyb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzAzNzMsImV4cCI6MjA5MTM0NjM3M30.5JA4vx2PN1kePf9L9qMp23ogORXhRnqZmtzw0BMJ8xs';

const CONFIG = {
  gatewayUrl:    'https://dhetcnkvgtuatcchropm.supabase.co/functions/v1/rfid-gateway',
  apiKey:        process.env.RFID_GATEWAY_KEY || '',
  tagEpc:        (process.env.TAG_EPC || '').toUpperCase(),
  readerId:      process.env.READER_ID     || 'reader-1',
  antennaIndex:  parseInt(process.env.ANTENNA_INDEX || '1'),
  rssi:          parseInt(process.env.RSSI || '-60'),
};

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
        'Authorization':  `Bearer ${ANON_KEY}`,
        'apikey':         ANON_KEY,
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

async function main() {
  if (!CONFIG.apiKey) { console.error('[ERRO] Defina RFID_GATEWAY_KEY.'); process.exit(1); }
  if (!CONFIG.tagEpc) { console.error('[ERRO] Defina TAG_EPC (o EPC de uma pulseira cadastrada).'); process.exit(1); }

  const payload = {
    reader_id:     CONFIG.readerId,
    antenna_index: CONFIG.antennaIndex,
    tag_epc:       CONFIG.tagEpc,
    rssi:          CONFIG.rssi,
    read_at:       new Date().toISOString(),
  };

  console.log('→ Enviando leitura simulada:', JSON.stringify(payload));
  try {
    const result = await sendToGateway(payload);
    const status = result.body?.status ?? (result.status === 200 ? 'ok' : 'erro');
    console.log(`← HTTP ${result.status} | status: ${status}`);
    console.log('  resposta:', JSON.stringify(result.body));
    console.log('');
    console.log('Diagnóstico do status:');
    console.log('  ok                → passagem gravada em race_splits ✅');
    console.log('  unknown_tag       → EPC não cadastrado/atribuído a uma inscrição');
    console.log('  no_antenna_config → reader_id + antenna_index não mapeados no evento');
    console.log('  no_heat_assignment→ inscrição não está em nenhuma bateria');
    console.log('  no_running_heat   → a bateria da inscrição não está com status "running"');
    console.log('  debounce          → leitura repetida dentro da janela anti-duplicidade');
  } catch (err) {
    console.error('[ERRO] Falha ao enviar:', err.message);
    process.exit(1);
  }
}

main();
