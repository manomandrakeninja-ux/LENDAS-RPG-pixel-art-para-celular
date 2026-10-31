@echo off
title LENDAS - Servidor LAN (multijogador na mesma rede)
cd /d "%~dp0"
echo ============================================
echo  LENDAS - servidor LAN local (sem internet)
echo ============================================
echo  Deixe esta janela aberta enquanto jogar.
echo  Os outros dispositivos entram pelo IP que
echo  aparecer abaixo, no painel 🌐 do jogo.
echo ============================================
node server\lan-server.mjs
pause
