/* global WScript:false */

var oExec;

// exit-code is not returned even if an error is thrown.
try {
  WScript.StdOut.Write(WScript.CreateObject('ScriptPW.Password').GetPassword()
    // Bug? Illegal data may be returned when user types before initializing.
    .replace(/[\u4000-\u40FF]/g, function(chr) {
      var charCode = chr.charCodeAt(0);
      return charCode >= 0x4020 && charCode <= 0x407F ?
        String.fromCharCode(charCode - 0x4000) : '';
    }));
} catch (e) {
  WScript.StdErr.Write(e.description);
  WScript.Quit(1);
}

oExec = WScript.CreateObject('WScript.Shell').Exec('cmd /c echo; >CON');
while (oExec.Status === 0) { WScript.Sleep(100); }
