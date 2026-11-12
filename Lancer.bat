@echo off
rem Lance le site "A ta portee" sur cet ordinateur et l'ouvre dans le navigateur.
title A ta portee - laisse cette fenetre ouverte pendant que tu joues
cd /d "%~dp0"
echo.
echo   A ta portee - solfege au piano
echo   ------------------------------
echo   Le site s'ouvre dans ton navigateur : http://localhost:8765/
echo   Laisse cette fenetre ouverte pendant que tu joues.
echo   Pour arreter : ferme simplement cette fenetre.
echo.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8765/"
python -m http.server 8765 --bind 127.0.0.1
if errorlevel 1 (
  echo.
  echo   Impossible de demarrer : Python est introuvable, ou le port 8765 est deja utilise.
  pause
)
