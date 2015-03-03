/* global WScript:false */

var oExec;

// exit-code is not returned even if an error is thrown.
try {
  WScript.StdOut.Write(WScript.CreateObject('ScriptPW.Password').GetPassword());
} catch (e) {
  WScript.StdErr.Write(e.description);
  WScript.Quit(1);
}

oExec = WScript.CreateObject('WScript.Shell').Exec('cmd /c echo; >CON');
while (oExec.Status === 0) { WScript.Sleep(100); }
