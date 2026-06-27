# ============================================================
# UAIROX RFID Bridge — inicializador
# Lê config.local.ps1, prepara o ambiente e inicia o bridge.
# Use o atalho INICIAR-BRIDGE.bat (duplo clique) para rodar isto.
# ============================================================
Set-Location $PSScriptRoot

$cfg = Join-Path $PSScriptRoot 'config.local.ps1'
if (-not (Test-Path $cfg)) {
  Write-Host ""
  Write-Host "ERRO: arquivo 'config.local.ps1' nao encontrado." -ForegroundColor Red
  Write-Host "Copie 'config.local.ps1.example' para 'config.local.ps1' e preencha a sua chave." -ForegroundColor Yellow
  Write-Host ""
  Read-Host "Pressione Enter para sair"
  exit 1
}

. $cfg

if (-not $RFID_GATEWAY_KEY -or $RFID_GATEWAY_KEY -eq 'COLE_AQUI_SUA_CHAVE') {
  Write-Host ""
  Write-Host "ERRO: defina a sua RFID_GATEWAY_KEY dentro de config.local.ps1." -ForegroundColor Red
  Write-Host ""
  Read-Host "Pressione Enter para sair"
  exit 1
}

# Modo fixo: TCP client + protocolo binário do M-ID40
$env:CONNECTION_MODE  = 'tcp'
$env:RFID_PROTOCOL    = 'mid40'
$env:RFID_GATEWAY_KEY = $RFID_GATEWAY_KEY
$env:READER_ID        = if ($READER_ID) { $READER_ID } else { 'reader-1' }
$env:RFID_IP          = if ($RFID_IP)   { $RFID_IP }   else { '192.168.0.10' }
$env:RFID_PORT        = if ($RFID_PORT)   { $RFID_PORT }   else { '5000' }
$env:VERBOSE          = if ($VERBOSE)     { $VERBOSE }     else { '0' }
# Debounce e RSSI: só define se preenchidos (override manual).
# Vazios = bridge lê automaticamente dos campos da tela ("Zona Cega" / "Sinal mínimo").
if ($DEBOUNCE_MS) { $env:DEBOUNCE_MS = $DEBOUNCE_MS } else { Remove-Item Env:DEBOUNCE_MS -ErrorAction SilentlyContinue }
if ($RSSI_MIN -ne $null -and $RSSI_MIN -ne '') { $env:RSSI_MIN = $RSSI_MIN } else { Remove-Item Env:RSSI_MIN -ErrorAction SilentlyContinue }

# Ajustes opcionais de leitor (potência e antenas) — exporta só os que estiverem preenchidos.
foreach ($v in 'RF_POWER','POWER_SET_HEX','POWER_CMD','ANT_MASK','ANT_SET','ANT_SET_HEX') {
  $val = Get-Variable -Name $v -ValueOnly -ErrorAction SilentlyContinue
  if ($null -ne $val -and '' -ne $val) { Set-Item "Env:$v" $val } else { Remove-Item "Env:$v" -ErrorAction SilentlyContinue }
}

Write-Host "Iniciando bridge UAIROX (Ctrl+C para parar)..." -ForegroundColor Cyan
node rfid-bridge.js
