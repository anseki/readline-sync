@echo off
setlocal
if "%1"=="noechoback" (
  call :exprog
) else (
  set /p INPUT=<CON >CON
)
set /p ="'%INPUT%'"<NUL
endlocal
exit /b 0

:exprog

:: where /q powershell
:: Win <Vista and <Server2008 don't have `WHERE`.
powershell /? >NUL 2>&1

:: Win <7 and <Server2008R2 don't have PowerShell as default.
:: Win XP and Server2003 have `ScriptPW` (`scriptpw.dll`).
:: In the systems that don't have both, an error is thrown.
if errorlevel 1 (
  set "EXCOMMAND=cscript //nologo "%~dp0read.cs.js""
) else (
  set "EXCOMMAND=powershell -Command "$text = read-host -AsSecureString; ^
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR^($text^); ^
    [System.Runtime.InteropServices.Marshal]::PtrToStringAuto^($BSTR^)""
)
:: echo %EXCOMMAND%
for /f "usebackq delims=" %%i in (`%EXCOMMAND%`) do set "INPUT=%%i"
exit /b
