@echo off
title LENDAS - liberar celular
rem Libera a porta 5173 no firewall do Windows, so para aparelhos da rede local.
net session >nul 2>&1
if errorlevel 1 (
  echo Pedindo permissao de administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
netsh advfirewall firewall delete rule name="LENDAS (porta 5173)" >nul 2>&1
netsh advfirewall firewall add rule name="LENDAS (porta 5173)" dir=in action=allow protocol=TCP localport=5173 remoteip=localsubnet profile=any
if errorlevel 1 (
  echo Nao foi possivel criar a regra no firewall.
) else (
  echo Pronto! O celular ja pode abrir o jogo pelo endereco "Network".
)
pause
