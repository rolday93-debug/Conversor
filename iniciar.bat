@echo off
echo 🚀 Iniciando servidor rust365...
echo 📂 Carpeta: %CD%

REM Iniciar el servidor Node.js en segundo plano
start /B cmd /c "npm start"

REM Esperar 3 segundos para que el servidor arranque
timeout /t 3 /nobreak > nul

REM Abrir el navegador
echo 🌐 Abriendo aplicación en el navegador...
start http://localhost:3000

echo ✅ Servidor iniciado correctamente
echo 📌 La aplicación se abrirá en tu navegador
echo ⚠️ No cierres esta ventana mientras uses la aplicación
pause