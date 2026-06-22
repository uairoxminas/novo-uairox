# ============================================================
# UAIROX — Instala o bridge para iniciar junto com o Windows
# Cria um atalho do INICIAR-BRIDGE.bat na pasta "Inicializar" do usuário.
# Rode UMA vez (duplo clique > Executar com PowerShell, ou no terminal).
# Para DESATIVAR: apague o atalho da pasta Inicializar (instruções no fim).
# ============================================================

$bat     = Join-Path $PSScriptRoot 'INICIAR-BRIDGE.bat'
$startup = [Environment]::GetFolderPath('Startup')
$lnk     = Join-Path $startup 'UAIROX RFID Bridge.lnk'

if (-not (Test-Path $bat)) {
  Write-Host "ERRO: INICIAR-BRIDGE.bat nao encontrado em $PSScriptRoot" -ForegroundColor Red
  Read-Host "Enter para sair"; exit 1
}

$ws = New-Object -ComObject WScript.Shell
$s  = $ws.CreateShortcut($lnk)
$s.TargetPath       = $bat
$s.WorkingDirectory = $PSScriptRoot
$s.WindowStyle      = 7            # inicia minimizado
$s.Description      = 'UAIROX RFID Bridge'
$s.Save()

Write-Host ""
Write-Host "OK! O bridge vai iniciar automaticamente quando voce ligar o notebook." -ForegroundColor Green
Write-Host "Atalho criado em:" -ForegroundColor Cyan
Write-Host "  $lnk"
Write-Host ""
Write-Host "Para DESATIVAR depois: apague esse atalho." -ForegroundColor Yellow
Write-Host "  (Win+R -> shell:startup -> apague 'UAIROX RFID Bridge')"
Write-Host ""
Read-Host "Enter para sair"
