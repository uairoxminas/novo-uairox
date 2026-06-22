@echo off
REM Atalho de 1 clique para iniciar o bridge RFID do UAIROX.
REM Abre o PowerShell, carrega a config e roda o bridge.
powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start.ps1"
