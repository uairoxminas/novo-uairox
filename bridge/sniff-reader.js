/**
 * UAIROX — Sniffer do leitor M-ID40 (diagnóstico de protocolo)
 *
 * Abre uma conexão TCP crua com o leitor e despeja TUDO que ele enviar,
 * em hexadecimal + ASCII. NÃO interpreta nada. Serve para descobrir
 * empiricamente o formato de saída do M-ID40 LIGHT (texto vs. binário SDK)
 * sem depender do SDK da Via Onda.
 *
 * Uso (PowerShell):
 *   $env:RFID_IP="192.168.0.10"; $env:RFID_PORT="5000"; node sniff-reader.js
 *
 * O que observar:
 *   - Se aparecer o EPC em ASCII legível  → o bridge atual (modo tcp) parseia.
 *   - Se for binário/sem padrão           → é o protocolo SDK; precisamos implementá-lo.
 *   - Se NADA chegar ao passar a pulseira  → o leitor provavelmente exige um
 *     comando de "start inventory" ou um modo "auto-upload" ligado na página web.
 *
 * Variáveis de ambiente:
 *   RFID_IP     IP do leitor (padrão de fábrica: 192.168.0.10)
 *   RFID_PORT   Porta TCP (padrão SDK: 5000)
 */

const net = require('net');

const HOST = process.env.RFID_IP   || '192.168.0.10';
const PORT = parseInt(process.env.RFID_PORT || '5000');

function hexDump(buf) {
  const lines = [];
  for (let i = 0; i < buf.length; i += 16) {
    const slice = buf.subarray(i, i + 16);
    const hex   = [...slice].map(b => b.toString(16).padStart(2, '0')).join(' ').padEnd(47, ' ');
    const ascii = [...slice].map(b => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.').join('');
    lines.push(`  ${i.toString(16).padStart(4, '0')}  ${hex}  |${ascii}|`);
  }
  return lines.join('\n');
}

console.log('╔══════════════════════════════════════╗');
console.log('║   UAIROX — Sniffer TCP do M-ID40      ║');
console.log('╚══════════════════════════════════════╝');
console.log(`  Alvo: ${HOST}:${PORT}`);
console.log('  Conectando... (Ctrl+C para sair)\n');

const socket = new net.Socket();
socket.connect(PORT, HOST, () => {
  console.log(`[OK] Conectado a ${HOST}:${PORT}. Passe uma pulseira na antena e observe abaixo.\n`);
});

socket.on('data', (buf) => {
  console.log(`── ${new Date().toLocaleTimeString('pt-BR')}  (${buf.length} bytes) ──`);
  console.log(hexDump(buf));
  console.log('');
});

socket.on('error', e => console.error('[ERRO TCP]', e.message,
  '\n      Verifique: leitor ligado, mesma faixa de IP, antena conectada, porta correta.'));
socket.on('close', () => console.log('[INFO] Conexão encerrada pelo leitor.'));
