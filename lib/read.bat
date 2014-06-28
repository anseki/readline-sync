@echo off
setlocal
set /p LINE=<CON >CON
set /p DUM="%LINE%"<NUL
endlocal
exit /b 0
