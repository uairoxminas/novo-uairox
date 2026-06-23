# UAIROX — RFID M-ID40 LIGHT · Guia de Operação

Leitor: **M-ID40 LIGHT Ethernet** (Via Onda / UHFReader288, firmware UHF7182M).
Fluxo: pulseira → antena → leitor → **bridge** (este notebook) → **gateway Supabase** → cronometragem.

---

## PARTE A — CONFIGURAÇÃO ÚNICA (faz uma vez só)

### A1. Notebook — IP fixo na placa de rede
O leitor vive na rede `192.168.0.x`. O notebook precisa ter IP fixo nessa faixa.
1. `Windows + R` → `ncpa.cpl` → Enter.
2. Botão direito na placa **Ethernet** → **Propriedades** → **Protocolo IP Versão 4 (TCP/IPv4)** → **Propriedades**.
3. **Usar o seguinte endereço IP:**
   - IP: `192.168.0.20`
   - Máscara: `255.255.255.0`
   - Gateway e DNS: em branco
4. OK → OK.
> Isso fica salvo. Só precisa refazer se trocar de placa/rede. Para voltar a usar internet normal nessa placa, marque "Obter um endereço IP automaticamente".

### A2. Notebook — Node.js e a chave
- **Node.js** já está instalado (v24). ✅
- Copie o arquivo **`config.local.ps1.example`** para **`config.local.ps1`** (mesma pasta) e preencha:
  - `RFID_GATEWAY_KEY` = a chave do Supabase (mesmo valor do campo "API Key" do painel).
  - `READER_ID` = `reader-1` (igual ao cadastro no painel de Antenas).
  - `RSSI_MIN` = `0` por enquanto (ajusta na calibração, ver Parte D).
> Esse arquivo guarda a sua chave e **não vai para o git**.

### A3. Leitor — modo de envio automático + potência  ✅ CONFIGURADO
O leitor já está salvo em **Real-time-inventory mode** (empurra as leituras sozinho ao ligar)
e **Potência 10 dBm** (zona apertada: pega a passagem rápida e ignora quem está a 3m+).
Tudo isso persiste na memória do leitor — no dia, **basta ligar**.

⚠️ **Cuidado:** se você abrir o **M-ID40-Light-Demo** e usar o modo "Answer" (ex: testar potência),
o leitor sai do modo automático em runtime. **Religue o leitor (12V off/on)** depois pra ele voltar
ao modo automático. No dia da prova, o ideal é **não abrir o Demo** — só ligar o leitor e rodar o bridge.

Para reconfigurar (se um dia perder): Demo → Reader Setting → Real-time-inventory setting →
Mode Select = "Real-time-inventory mode" → marcar "Save" → "Set". Ajustar potência em Power → Set.

### A4. App UAIROX (painel Race Day) — por evento
- **Tapetes e Leitores**: criar os pontos de controle (ex: Largada, Chegada).
- **Antenas RFID**: mapear `reader-1` + `antenna_index` → ponto de controle.
- **Pulseiras RFID**: cadastrar os EPCs e atribuir às inscrições.

---

## PARTE B — CHECKLIST DO DIA DA PROVA  ✅ (rápido)

1. **Montar o hardware** (nesta ordem):
   - Rosquear as antenas. ⚠️ **Nunca ligar sem antena.**
   - Ligar a **fonte 12V**.
   - Conectar o **cabo de rede** no notebook.
2. **Conferir a conexão** — abrir PowerShell e rodar:
   ```
   ping 192.168.0.10
   ```
   Tem que responder. (Se não responder → ver Parte C.)
3. **Iniciar o bridge** — duplo clique em **`INICIAR-BRIDGE.bat`**.
   - Deve aparecer `[OK] Conectado ao M-ID40 em 192.168.0.10:5000`.
4. **Testar** — passar uma pulseira → ver no terminal `✅ Gateway: ok`.
5. **No app UAIROX** — largar as baterias. As passagens entram automaticamente.

Para **parar** o bridge: `Ctrl + C` na janela dele.

---

## PARTE C — SE ALGO DER ERRADO (rápido)

| Sintoma | Causa provável | Solução |
|---|---|---|
| `ping` não responde | Cabo solto / leitor desligado / IP do notebook errado | Conferir cabo, fonte 12V, e o IP fixo (Parte A1) |
| Bridge não conecta (porta 5000) | Conexão TCP "presa" de uma sessão anterior | **Desligar a fonte 12V, esperar 5s, religar** e tentar de novo |
| Conecta mas não chega leitura | Demo aberto ocupando a conexão / leitor não está em modo automático | Fechar o app Demo; confirmar a config A3 |
| Lê pulseira parada/longe | Alcance grande demais | Baixar potência e/ou subir o `RSSI_MIN` (Parte D) |
| `TAG DESCONHECIDA` | Pulseira não cadastrada/atribuída | Cadastrar o EPC e atribuir à inscrição (A4) |

> **Achar a porta** (se um dia mudar): no PowerShell, varrer portas comuns —
> `5000` é a atual. Em caso de dúvida, usar o "Software Configuração Placa Ethernet" (Search Device).

---

## PARTE D — ZONA DE LEITURA / RSSI (ajuste na tela)

Objetivo: registrar **só quem passa perto** da antena e ignorar pulseiras paradas a alguns metros.
Dois controles:
- **Potência de RF** (no leitor, via Demo): tamanho físico do campo. ~18–30 dBm. Ajuste grosso.
- **Sinal mínimo (RSSI)** — campo na tela Race Day ("Parâmetros da Etapa"). Ajuste fino:
  quanto **maior**, mais perto o atleta precisa estar. **0 = lê tudo**.

Calibração:
1. Com `VERBOSE=1` no `config.local.ps1`, rode o bridge e observe o RSSI no terminal.
2. Anote o RSSI **na passagem** (forte, ex: 80) e **parado/longe** (fraco, ex: 56).
3. Coloque um corte no meio (ex: **70**) no campo **"Sinal mínimo (RSSI)"** da tela e **Salvar Parâmetros**.
   O bridge e o gateway passam a usar esse valor automaticamente (bridge re-sincroniza em até 60s).

Valores de referência do teste de bancada: passagem ~80, parado ~56–58.

## PARTE E — Anti-duplicidade (debounce POR ATLETA, 40s)

Regra: após um atleta confirmar uma passagem em **qualquer** antena, ele fica
**bloqueado por 40s** — nenhuma nova passagem é confirmada nesse intervalo, nem
na mesma nem em outra antena. Isso vale **por pulseira (atleta)**, não por antena.

Onde é aplicado:
- **Gateway (servidor):** usa o campo `debounce_seconds` do evento (campo "Zona Cega"
  na tela Race Day, padrão **40**). É a **regra real** dos 40s e só vale **durante a prova**
  (após a largada e a 1ª passagem confirmada). No **cadastro/conferência NÃO há bloqueio**.
  Para mudar a janela, altere esse campo na tela e salve.
- **Bridge (local):** apenas um **anti-flood curto** (`DEBOUNCE_MS`, padrão **3000ms**) que
  colapsa a rajada de leituras de uma mesma passagem. NÃO é a regra dos 40s.

> Trade-off: voltas/repasses em **menos de 40s** não são contadas na prova. É o esperado pela regra.
> Na conferência de pulseiras, dá pra reler a mesma pulseira na hora (após ~3s).

Para **calibrar/depurar**, ligue `$VERBOSE = "1"` no `config.local.ps1` — mostra toda
leitura crua e os motivos de cada descarte (RSSI baixo / debounce). Na prova, deixe `"0"`.
