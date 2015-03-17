/*jshint wsh:true */

var
  FSO_ForReading = 1, FSO_ForWriting = 2,

  fso, tty, shell,
  args =// Array.prototype.slice.call(WScript.Arguments),
    (function() {
      var args = [], i, iLen;
      for (i = 0, iLen = WScript.Arguments.length; i < iLen; i++) {
        args.push(WScript.Arguments(i));
      }
      return args;
    })(),
  arg, options = {};

while (typeof(arg = args.shift()) === 'string') {
  if (arg === '--noechoback') {
    options.noEchoBack = true;
  } else if (arg === '--keyin') {
    options.keyIn = true;
  } else if (arg === '--display') {
    options.display = args.shift();
  } else if (arg === '--encoded') {
    options.encoded = true;
  }
}

if (typeof options.display === 'string' && options.display !== '') {
  ttyWrite(options.encoded ? decodeDOS(options.display) : options.display);
}

WScript.StdOut.Write("'" + (options.noEchoBack ? readS() : ttyRead()) + "'");

WScript.Quit();

function ttyRead() {
  var text;
  try {
    text = getFso().OpenTextFile('CONIN$', FSO_ForReading).ReadLine();
  } catch (e) {
    WScript.StdErr.WriteLine('TTY Read Error: ' + e.number +
      '\n' + e.description);
    WScript.Quit(1);
  }
  return text;
}

function ttyWrite(text) {
  try {
    tty = tty || getFso().OpenTextFile('CONOUT$', FSO_ForWriting, true);
    tty.Write(text);
  } catch (e) {
    WScript.StdErr.WriteLine('TTY Write Error: ' + e.number +
      '\n' + e.description);
    WScript.Quit(1);
  }
}

function getFso() {
  if (!fso) { fso = new ActiveXObject('Scripting.FileSystemObject'); }
  return fso;
}

function readS() {
  var pw;
  shellExec('powershell /?', function(exitCode, stdout, stderr, error) {
    if (error || exitCode !== 0) {
      pw = scriptPW();
    } else {
      shellExec('powershell -Command "$text = read-host -AsSecureString;' +
          '$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($text);' +
          '[System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)"',
        function(exitCode, stdout, stderr, error) {
          if (error || exitCode !== 0) {
            WScript.StdErr.WriteLine('Windows PowerShell Error: ' + exitCode +
              (error && error.description ? '\n' + error.description : '') +
              (stderr ? '\n' + stderr : '') +
              (stdout ? '\n' + stdout : ''));
            WScript.Quit(1);
          }
          pw = stdout.replace(/[\r\n]+$/, '');
        });
    }
  });
  return pw;
}

function scriptPW() {
  var pw;
  // exit-code is not returned even if an error is thrown.
  try {
    pw = WScript.CreateObject('ScriptPW.Password').GetPassword()
      // Bug? Illegal data may be returned when user types before initializing.
      .replace(/[\u4000-\u40FF]/g, function(chr) {
        var charCode = chr.charCodeAt(0);
        return charCode >= 0x4020 && charCode <= 0x407F ?
          String.fromCharCode(charCode - 0x4000) : '';
      });
  } catch (e) {
    WScript.StdErr.WriteLine('ScriptPW.Password Error: ' + e.number +
      '\n' + e.description);
    WScript.Quit(1);
  }
  ttyWrite('\n');
  return pw;
}

function shellExec(cmd, callback) { // callback(exitCode, stdout, stderr, error)
  var wsExec, stdout = '', stderr = '', noOutput;

  function getShell() {
    if (!shell) { shell = WScript.CreateObject('WScript.Shell'); }
    return shell;
  }

  try {
    wsExec = getShell().Exec(cmd);
  } catch (e) {
    callback(e.number, stdout, stderr, e);
    return wsExec;
  }

  while (true) {
    noOutput = true;
    if (!wsExec.StdOut.AtEndOfStream) {
      stdout += wsExec.StdOut.ReadAll();
      noOutput = false;
    }
    if (!wsExec.StdErr.AtEndOfStream) {
      stderr += wsExec.StdErr.ReadAll();
      noOutput = false;
    }
    if (noOutput) {
      if (wsExec.Status === 1 /*WshFinished*/) { break; }
      WScript.Sleep(100);
    }
  }

  callback(wsExec.ExitCode, stdout, stderr);
  return wsExec;
}

function decodeDOS(arg) {
  return arg.replace(/#(\d+);/g, function(str, charCode) {
    return String.fromCharCode(+charCode);
  });
}
