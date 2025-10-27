@echo off
echo ========================================
echo Starting IFC Viewer Applications
echo ========================================
echo.
echo Starting Main Viewer on port 3000...
echo Starting Introduction Page on port 4000...
echo.
echo Press Ctrl+C to stop both servers
echo ========================================
echo.

start "IFC Viewer (Port 3000)" cmd /k "npm run dev"
timeout /t 3 /nobreak > nul
start "Introduction Page (Port 4000)" cmd /k "cd intro && npm start"

echo.
echo Both servers are starting in separate windows...
echo.
echo Main Viewer: http://localhost:3000
echo Introduction Page: http://localhost:4000
echo.

