@echo off
setlocal
setlocal ENABLEDELAYEDEXPANSION

if "%1"=="noechoback" (
  call :exprog
  if ERRORLEVEL 1 exit /b 1
) else (
  set /p INPUT=<CON >CON
  if ERRORLEVEL 1 exit /b 1
)
set /p ="'%INPUT%'"<NUL
endlocal
exit /b 0

:exprog

:: where /q powershell
:: Win <Vista and <Server2008 don't have `where`.
powershell /? >NUL 2>&1
:: Win <7 and <Server2008R2 don't have PowerShell as default.
:: Win XP and Server2003 have `ScriptPW` (`scriptpw.dll`).
:: In the systems that don't have both, an error is thrown.
if ERRORLEVEL 1 (
  set "EXECOMMAND=cscript //nologo "%~dp0read.cs.js""
) else (
  set "EXECOMMAND=powershell -Command "$text = read-host -AsSecureString; ^
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR^($text^); ^
    [System.Runtime.InteropServices.Marshal]::PtrToStringAuto^($BSTR^)""
)

:: Can't get `ERRORLEVEL` from sub-shell (`for`).
:: 2 `%ERRCODE%` lines are returned if an error is thrown.
set ERRCODE=ERR
set "EXECOMMAND=%EXECOMMAND% ^& if ERRORLEVEL 1 ^(echo %ERRCODE%^& echo %ERRCODE%^)"
:: echo %EXECOMMAND%

for /f "usebackq delims=" %%i in (`%EXECOMMAND%`) do (
  if "%%i"=="%ERRCODE%" if "!INPUT!"=="%ERRCODE%" exit /b 1
  set "INPUT=%%i"
)
exit /b 0
