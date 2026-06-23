# UAIROX — Manual de Cronometragem RFID (M-ID40 LIGHT)

Manual completo do sistema de cronometragem por RFID: hardware, configuração,
fluxo do dia da prova, regras de tempo, arbitragem, premiação e solução de problemas.

> Para o passo a passo enxuto do dia, veja também `bridge/SETUP-DIA-DA-PROVA.md`.

---

## 1. Visão geral

O sistema cronometra a passagem dos atletas por antenas RFID. O caminho do dado:

```
Pulseira (chip) → Antena → Leitor M-ID40 → Bridge (notebook) → Gateway (Supabase) → App Race Day
```

- **Leitor M-ID40 LIGHT Ethernet**: lê os chips das pulseiras (4 portas de antena).
- **Bridge** (programa no notebook): conecta no leitor por rede, decodifica as leituras e envia pra nuvem. Roda sozinho ao ligar o notebook.
- **Gateway** (função na nuvem Supabase): identifica o atleta, aplica as regras (debounce, RSSI, finalização) e grava a passagem.
- **App Race Day**: configura a prova, monitora ao vivo, arbitra e premia.

**Requisito-chave:** o notebook precisa de **internet (Wi-Fi/4G) + a rede do leitor (cabo Ethernet) ao mesmo tempo**.

---

## 2. Hardware

| Item | Detalhe |
|---|---|
| Leitor | M-ID40 LIGHT Ethernet (Via Onda), fonte **12V** original |
| Antenas | UHF, cabo SMA. Até **4 portas** (ANT1–ANT4) |
| Rede | Cabo RJ45 do leitor ao notebook (ou switch) |
| Pulseiras | Chip UHF; **o EPC termina no número impresso** (ex: pulseira 112 → EPC `...0112`) |

**Montagem (sempre nesta ordem):**
1. Rosquear a(s) antena(s). ⚠️ **Nunca ligar o leitor sem antena** (pode queimar o RF).
2. Ligar a **fonte 12V**.
3. Conectar o **cabo de rede**.

---

## 3. Configuração ÚNICA (feita uma vez)

### 3.1 Leitor (no app M-ID40-Light-Demo)
- **IP de fábrica:** `192.168.0.10` · **Porta TCP:** `5000` · login `admin`/`admin`.
- **Potência:** ~**10 dBm** (zona apertada: pega quem passa perto, ignora quem está a 3m+). Ajuste fino conforme o local.
- **Modo:** `Real-time-inventory mode` com **"Save"** marcado → o leitor empurra as leituras sozinho ao ligar.
- ⚠️ Se abrir o Demo e usar "Answer mode", **religue o leitor (12V off/on)** depois pra voltar ao modo automático.

### 3.2 Notebook
- **IP fixo** na placa Ethernet: `192.168.0.20` / máscara `255.255.255.0` / gateway e DNS vazios.
- **Node.js** instalado.
- **`bridge/config.local.ps1`** (copiar de `config.local.ps1.example`) com a chave `RFID_GATEWAY_KEY` e `READER_ID = reader-1`.
- **Auto-start:** rodar `bridge/instalar-autostart.ps1` uma vez → o bridge abre sozinho ao ligar o notebook.

### 3.3 Supabase
- Secret **`RFID_GATEWAY_KEY`** (Edge Functions → Secrets) = a mesma chave do `config.local.ps1`.

---

## 4. Configuração POR EVENTO (na aba Race Day → Configuração & Largada)

1. **Tapetes e Leitores:** crie cada ponto com **Nome + Tipo (Largada/Passagem/Chegada) + Antena (1–4)** → "Criar ponto + mapear antena" (cria o tapete E configura a antena num passo).
2. **Parâmetros da Etapa:**
   - **Volume Total de Leituras** = quantas passagens completam a prova (ex: 4).
   - **Zona Cega (debounce)** = tempo que o atleta fica ignorado após uma passagem, em **qualquer** antena (padrão **40s**).
   - **Sinal mínimo (RSSI)** = quanto maior, mais perto o atleta precisa estar (0 = lê tudo).
3. **Atletas:** cada inscrito precisa ter **bib** = o número da pulseira que vai usar.
4. **Baterias:** crie as baterias com os atletas alocados.

> Os 3 parâmetros (Volume, Zona Cega, RSSI) são lidos **automaticamente** pelo bridge (re-sincroniza em até 60s) e pelo gateway (instantâneo). **Mude na tela e já vale**, sem reiniciar nada.

---

## 5. Fluxo do DIA DA PROVA

1. **Ligar o notebook** → o bridge abre sozinho (auto-start). Buffer offline ativo.
2. **Montar hardware** (antena → fonte 12V → cabo de rede).
3. **Conferir rede:** terminal → `ping 192.168.0.10` (tem que responder).
4. **Abrir o Race Day** do evento → o **Checklist de Prontidão** mostra o que falta.
5. **Conferência de Pulseiras:** cada atleta encosta a pulseira na antena → fica verde.
6. Quando o checklist fica **tudo verde**, o **"Largar Bateria" destrava**.
7. **Largar a bateria** → os atletas correm; as passagens entram automaticamente.
8. Após a prova → aba **Arbitragem** (corrigir/validar) → aba **Premiação**.

---

## 6. Como funciona a cronometragem

- **Vínculo automático:** o EPC da pulseira **é** o número = bib. O sistema acha o atleta sozinho — **sem cadastrar pulseira nem atribuir** por evento. (Vínculo manual existe como exceção, em Pulseiras → "Avançado".)
- **Início do tempo:** o cronômetro de cada atleta começa na **1ª passagem dele** (largada rolante), **não** na largada manual da bateria.
- **Tempo final = última passagem − 1ª passagem** (+ penalidades). A 1ª passagem conta como marcação 1.
- **Finalização:** a prova completa na **N-ésima passagem** (Volume). Passagens extras viram `race_complete` e são ignoradas (o tempo trava na N-ésima).
- **Anti-duplicidade (debounce):** após uma passagem, o atleta fica bloqueado por **X segundos** (Zona Cega) em **qualquer** antena.
- **Zona de leitura (RSSI):** potência do leitor + corte de RSSI definem quem é lido (só quem passa perto).
- **À prova de internet:** se a conexão cair, o bridge **guarda as leituras** e **reenvia sozinho** quando voltar (sem perder passagem, com o horário original).

---

## 7. Arbitragem (aba Arbitragem) — situações pós-prova

| Situação | O que fazer |
|---|---|
| Faltou marcar passagem | Botão **"+"** no atleta → adiciona a passagem faltante |
| Passagem fantasma (marcou demais) | Expandir **X/Y passagens** → **🗑** remover a leitura errada (vê o horário) |
| Desistência | Botão **🏳 DNF** |
| Desclassificado | Botão **⊘ DSQ** + **motivo** (sugerido quando passagens < alvo) |
| Tempo errado | Clicar no **tempo (lápis)** → editar min:seg |
| Confirmar resultado | Botão **Validar** → grava o tempo oficial |

Estados: **em prova · completo · incompleto (sugere DSQ) · validado · DNF · DSQ**.

---

## 8. Premiação (aba Premiação)

- Pódio **por categoria** (🥇🥈🥉), ordenado pelo tempo final. DNF/DSQ listados à parte.
- Botão **"Liberar premiação"** só habilita quando **todos os atletas da categoria estão finalizados** (validado/DNF/DSQ). Até lá mostra "faltam X atletas finalizar".

---

## 9. Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| `ping 192.168.0.10` não responde | Cabo solto / leitor desligado / IP do notebook errado | Conferir cabo, fonte 12V, IP fixo `192.168.0.20` |
| Bridge conecta mas não lê | Demo aberto / leitor saiu do modo automático | Fechar o Demo; **religar o leitor** (12V off/on) |
| Bridge: `unknown_tag` | Antena mapeada no evento errado, ou atleta sem bib correspondente | Mapear a antena **neste** evento; conferir o bib |
| Bridge: `getaddrinfo ENOTFOUND` | Sem internet | Ligar Wi-Fi/4G (o buffer reenvia ao voltar) |
| Bridge: `no_running_heat` | Bateria não largada | Largar a bateria (normal antes da largada) |
| Lê de longe / pega parado | Potência alta / RSSI baixo | Baixar potência no Demo e/ou subir o "Sinal mínimo" |
| Passagem rápida não pega | Zona pequena demais | Subir a potência um pouco; manter RSSI baixo |
| "Largar Bateria" bloqueado | Checklist com item vermelho | Resolver os itens (leitor, antena, conferência, etc.) |

---

## 10. Referência rápida — os 3 parâmetros da tela

| Campo | Controla | Valor típico |
|---|---|---|
| **Volume Total de Leituras** | Quantas passagens completam a prova (e travam o tempo) | 4 |
| **Zona Cega (debounce)** | Tempo de bloqueio por atleta entre passagens (qualquer antena) | 40s |
| **Sinal mínimo (RSSI)** | Corte de proximidade (maior = mais perto) | 0 (potência define a zona) |

## 11. Scripts do bridge (pasta `bridge/`)

| Arquivo | Função |
|---|---|
| `INICIAR-BRIDGE.bat` | Inicia o bridge (1 clique / auto-start) |
| `instalar-autostart.ps1` | Configura o bridge pra abrir com o Windows |
| `config.local.ps1` | Sua chave + reader-id (não vai pro git) |
| `scan-tags.js` | Inspeciona EPCs das pulseiras (descobrir números) |
| `sniff-reader.js` | Diagnóstico bruto da conexão TCP |
| `simulate-read.js` | Testa o gateway sem hardware |
| `SETUP-DIA-DA-PROVA.md` | Runbook enxuto do dia |
