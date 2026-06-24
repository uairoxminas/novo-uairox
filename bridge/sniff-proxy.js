/**
 * sniff-proxy.js — proxy TCP pra capturar os comandos que o Demo envia ao leitor.
 *
 * Uso (quando o comando de antena 0x3F do bridge não funcionar):
 *   1. PARE o bridge (a conexão com o leitor tem que estar livre).
 *   2. Rode:  node sniff-proxy.js
 *   3. No M-ID40-Light-Demo, mude o "IP Addr" para o IP DESTE notebook (ex: 192.168.0.20)
 *      e a porta para 6000 (a porta do proxy). Conecte.
 *   4. Clique em "Set" na seção "Antenna config" (com ANT1+ANT2 marcados).
 *   5. Copie a linha [CLIENT→READER] com Cmd=0x3F e me mande — esse é o frame exato.
 *      (use no bridge com  $env:ANT_SET_HEX = "..."  ou no config.local.ps1)
 *
 * Variáveis: PROXY_PORT (padrão 6000), RFID_IP (192.168.0.10), RFID_PORT (5000).
 */
const net = require('net');

const PROXY_PORT = parseInt(process.env.PROXY_PORT || '6000');
const READER_IP  = process.env.RFID_IP   || '192.168.0.10';
const READER_PORT= parseInt(process.env.RFID_PORT || '5000');

function decode(buf) {
  // [Len][Adr][Cmd][Data...][CRC_L][CRC_H]  (Len = bytes após si mesmo)
  if (buf.length < 4) return '';
  const len = buf[0], adr = buf[1], cmd = buf[2];
  return `Len=0x${len.toString(16)} Adr=0x${adr.toString(16).padStart(2,'0')} Cmd=0x${cmd.toString(16).padStart(2,'0')}`;
}

const server = net.createServer((client) => {
  console.log(`\n[PROXY] Demo conectou. Ligando ao leitor ${READER_IP}:${READER_PORT}...`);
  const reader = net.connect(READER_PORT, READER_IP, () => console.log('[PROXY] Conectado ao leitor.\n'));

  client.on('data', (d) => {
    // Comandos do Demo → leitor (é o que queremos capturar)
    console.log(`[CLIENT→READER] ${decode(d)}  | ${d.toString('hex').toUpperCase()}`);
    reader.write(d);
  });
  // Leituras do leitor → Demo (barulhento; só repassa)
  reader.on('data', (d) => client.write(d));

  const close = () => { client.destroy(); reader.destroy(); };
  client.on('close', close); reader.on('close', close);
  client.on('error', e => console.error('[CLIENT err]', e.message));
  reader.on('error', e => console.error('[READER err]', e.message));
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[PROXY] Ouvindo em 0.0.0.0:${PROXY_PORT} → encaminha pra ${READER_IP}:${READER_PORT}`);
  console.log('[PROXY] Aponte o Demo para o IP deste notebook na porta acima e clique em "Set" nas antenas.');
});
