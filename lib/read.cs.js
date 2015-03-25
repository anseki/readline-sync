/*jshint wsh:true */

var
  FSO_ForReading = 1, FSO_ForWriting = 2,

  fso, tty,
  args =// Array.prototype.slice.call(WScript.Arguments),
    (function() {
      var args = [], i, iLen;
      for (i = 0, iLen = WScript.Arguments.length; i < iLen; i++)
        { args.push(WScript.Arguments(i)); }
      return args;
    })(),
  arg, options = {};

while (typeof(arg = args.shift()) === 'string') {
  arg = arg.toLowerCase();
  if (arg === '--display') {
    options.display = args.shift();
  } else if (arg === '--noechoback') {
    options.noEchoBack = true;
  } else if (arg === '--mask') {
    options.mask = args.shift();
  } else if (arg === '--keyin') {
    options.keyIn = true;
  } else if (arg === '--encoded') {
    options.encoded = true;
  }
}

if (options.encoded) {
  if (typeof options.display === 'string')
    { options.display = decodeDOS(options.display); }
  if (typeof options.mask === 'string')
    { options.mask = decodeDOS(options.mask); }
}

if (typeof options.display === 'string' && options.display !== '')
  { writeTTY(options.display); }

WScript.StdOut.Write("'" + readTTY() + "'");

WScript.Quit();

function writeTTY(text) {
  try {
    tty = tty || getFso().OpenTextFile('CONOUT$', FSO_ForWriting, true);
    tty.Write(text);
  } catch (e) {
    WScript.StdErr.WriteLine('TTY Write Error: ' + e.number +
      '\n' + e.description);
    WScript.Quit(1);
  }
}

function readTTY() {

  // function psExists() {
  //   var envPs = getShell().Environment('System')('PSModulePath');
  //   return typeof envPs === 'string' && envPs !== '';
  // }

  if (!options.noEchoBack && !options.keyIn) {
    return readByCS();
  // } else if (psExists()) {
  //   return readByPS();
  } else if (options.noEchoBack && !options.keyIn && options.mask === '*') {
    return readByPW();
  } else {
    WScript.StdErr.WriteLine('Microsoft Windows PowerShell is required.\n' +
      'https://technet.microsoft.com/ja-jp/library/hh847837.aspx');
    WScript.Quit(1);
  }
}

function readByCS() {
  WScript.StdErr.Write('<<readByCS>>'); //_DBG_
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

function readByPW() {
  WScript.StdErr.Write('<<readByPW>>'); //_DBG_
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
  writeTTY('\n');
  return pw;
}

function getFso() {
  if (!fso) { fso = new ActiveXObject('Scripting.FileSystemObject'); }
  return fso;
}

function decodeDOS(arg) {
  return arg.replace(/#(\d+);/g, function(str, charCode) {
    return String.fromCharCode(+charCode);
  });
}

