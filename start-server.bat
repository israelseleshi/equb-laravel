@echo off
cd /d "C:\Users\Hp\Documents\equb\backend"
title Equb Laravel Server
cls
echo ============================================
echo    Equb Backend Server - Laravel
echo ============================================
echo.
echo  Your IP: 172.16.200.207
echo  Port:    8000
echo.
echo  In the app on your phone:
echo    1. Tap "Server" on the login screen
echo    2. Enter: 172.16.200.207
echo    3. Tap Save
echo.
echo  Press Ctrl+C to stop the server.
echo ============================================
echo.
php artisan serve --host=0.0.0.0 --port=8000
pause
