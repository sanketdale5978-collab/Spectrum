@echo off
REM Spectra Lens Startup Script (Windows)

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║               SPECTRA LENS — Startup Script                 ║
echo ║          Spectral Imaging Platform (Production Ready)        ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Check Python
echo [1/3] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Python not found. Please install Python 3.8+
    echo   https://www.python.org/downloads/
    pause
    exit /b 1
)
echo ✓ Python found

REM Install dependencies
echo [2/3] Installing dependencies...
python -m pip install --upgrade pip >nul 2>&1
python -m pip install Flask numpy pandas pillow openpyxl >nul 2>&1
if errorlevel 1 (
    echo ✗ Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed

REM Start server
echo [3/3] Starting Flask server...
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  🚀 Server starting on http://localhost:5000                 ║
echo ║  Press Ctrl+C to stop                                        ║
echo ║                                                               ║
echo ║  📂 Model weights: %cd%\weights\                              ║
echo ║  📁 Upload folder: %cd%\uploads\                              ║
echo ║  📥 Export folder: %cd%\exports\                              ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

python "app (1).py"

if errorlevel 1 (
    echo.
    echo ✗ Server crashed. Check error message above.
    pause
    exit /b 1
)
