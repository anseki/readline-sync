@echo off
setlocal
if "%1"=="noechoback" (
  set /p LINE=<CON >NUL
  echo; >CON
) else (
  set /p LINE=<CON >CON
)
set /p ="'%LINE%'"<NUL
endlocal
exit /b 0
