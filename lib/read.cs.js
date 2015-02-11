var oExec;
WScript.StdOut.Write(WScript.CreateObject('ScriptPW.Password').GetPassword());
oExec = WScript.CreateObject('WScript.Shell').Exec('cmd /c echo; >CON');
while (oExec.Status === 0) { WScript.Sleep(100); }
