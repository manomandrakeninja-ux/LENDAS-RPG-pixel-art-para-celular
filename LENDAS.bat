@echo off
title LENDAS
cd /d "%~dp0"
set "URL=http://127.0.0.1:5173/"

rem Se o jogo ja estiver ligado, so abre o navegador.
netstat -ano | findstr /r /c:":5173 .*LISTENING" >nul
if not errorlevel 1 (
  start "" "%URL%"
  exit /b 0
)

where npm >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao foi encontrado. Instale em https://nodejs.org e tente de novo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Primeira vez: instalando as dependencias do jogo...
  call npm install
)

echo.
echo  LENDAS esta ligando...
echo  - No PC: %URL%  (abre sozinho)
echo  - No celular (mesmo Wi-Fi): use o endereco "Network" que aparece abaixo.
echo    Se o celular nao abrir, rode uma vez o LIBERAR-CELULAR.bat.
echo  Deixe esta janela aberta enquanto joga. Para desligar o jogo, feche esta janela.
echo.
rem Abre o navegador sempre em 127.0.0.1 (o save fica guardado por endereco).
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process '%URL%'"
call npx vite --host 0.0.0.0 --port 5173 --strictPort
pause
