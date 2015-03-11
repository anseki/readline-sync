@echo off
setlocal ENABLEDELAYEDEXPANSION

:args_loop
if "%~1"=="" (
  goto args_end

) else if "%~1"=="--noechoback" (
  set noechoback=1

) else if "%~1"=="--keyin" (
  set keyin=1

) else if "%~1"=="--display" (
  set "display=%~2"
  shift /1

)
shift /1
goto args_loop
:args_end

:: type tmpfile.txt >CON
if "%display%" NEQ "" if "%NODE_EXEC_PATH%" NEQ "" (
  "%NODE_EXEC_PATH%" "%~dp0decodedos.js" "%display%" >CON
  if ERRORLEVEL 1 exit /b 1
)

if "%noechoback%"=="1" (
  call :read_s
  if ERRORLEVEL 1 exit /b 1
) else (
  set /p input=<CON >CON
)
set /p ="'%input%'"<NUL

endlocal
exit /b 0

:: Silent Read
:read_s

:: where /q powershell
:: Win <Vista and <Server2008 don't have `where`.
powershell /? >NUL 2>&1
:: Win <7 and <Server2008R2 don't have PowerShell as default.
:: Win XP and Server2003 have `ScriptPW` (`scriptpw.dll`).
:: In the systems that don't have both, an error is thrown.
if ERRORLEVEL 1 (
  set "exec_line=cscript //nologo "%~dp0read.cs.js""
) else (
  set "exec_line=powershell -Command "$text = read-host -AsSecureString; ^
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR^($text^); ^
    [System.Runtime.InteropServices.Marshal]::PtrToStringAuto^($BSTR^)""
)

:: Can't get `ERRORLEVEL` from sub-shell.
:: 2 `%ERRCODE%` lines are returned if an error is thrown.
set ERRCODE=ERR
set "exec_line=%exec_line% ^& if ERRORLEVEL 1 ^(echo %ERRCODE%^& echo %ERRCODE%^)"
:: echo %exec_line%

for /f "usebackq delims=" %%i in (`%exec_line%`) do (
  if "%%i"=="%ERRCODE%" if "!input!"=="%ERRCODE%" exit /b 1
  set "input=%%i"
)

exit /b 0
