/*
 * readlineSync
 * https://github.com/anseki/readline-sync
 *
 * Copyright (c) 2015 anseki
 * Licensed under the MIT license.
 */

'use strict';

var
  IS_WIN = process.platform === 'win32',
  SHELL_PATH = IS_WIN ? 'cscript.exe' : '/bin/sh',
  SHELL_CMD = __dirname + (IS_WIN ? '\\read.cs.js' : '/read.sh'),
  ALGORITHM_CIPHER = 'aes-256-cbc',
  ALGORITHM_HASH = 'sha256',
  DEFAULT_ERR_MSG = 'The platform doesn\'t support interactive reading',

  fs = require('fs'),
  TTY = process.binding('tty_wrap').TTY,
  childProc = require('child_process'),

  promptText = '> ',
  encoding = 'utf8',
  bufSize = 1024,
  print,
  mask = '*',
  useShell = false,

  fdR = 'none', fdW, ttyR, isRawMode = false,
  tempdir, salt = 0;

function _readlineSync(options) { // options.display is string
  var input = '', isEditable, displayInput;

  function tryShell() {
    var res = _readlineShell(options);
    if (res.error) { throw res.error; }
    return res.input;
  }

  // Node v0.10- returns an error if same mode is set.
  function setRawMode(mode) {
    if (mode === isRawMode) { return true; }
    if (ttyR.setRawMode(mode) !== 0) { return false; }
    isRawMode = mode;
    return true;
  }

  (function() {
    var fsB, constants;

    function getFsB() {
      if (!fsB) {
        fsB = process.binding('fs'); // For raw device path
        constants = process.binding('constants');
      }
      return fsB;
    }

    if (typeof fdR !== 'string') { return; }
    fdR = null;

    if (IS_WIN) {
      if (process.stdin.isTTY) {
        fdR = process.stdin.fd;
        ttyR = process.stdin._handle;
      } else {
        try {
          // The stream by fs.openSync('\\\\.\\CON', 'r') can't switch to raw mode.
          // 'CONIN$' might fail on XP, 2000, 7 (x86).
          fdR = getFsB().open('CONIN$', constants.O_RDWR, parseInt('0666', 8));
          ttyR = new TTY(fdR, true);
        } catch (e) {}
      }

      if (process.stdout.isTTY) {
        fdW = process.stdout.fd;
      } else {
        try {
          fdW = fs.openSync('\\\\.\\CON', 'w');
        } catch (e) {}
        if (typeof fdW !== 'number') { // Retry
          try {
            fdW = getFsB().open('CONOUT$', constants.O_RDWR, parseInt('0666', 8));
          } catch (e) {}
        }
      }

    } else {
      if (process.stdin.isTTY) {
        try {
          fdR = fs.openSync('/dev/tty', 'r'); // device file, not process.stdin
          ttyR = process.stdin._handle;
        } catch (e) {}
      } else {
        // Node v0.12 read() fails.
        try {
          fdR = fs.openSync('/dev/tty', 'r');
          ttyR = new TTY(fdR, false);
        } catch (e) {}
      }

      if (process.stdout.isTTY) {
        fdW = process.stdout.fd;
      } else {
        try {
          fdW = fs.openSync('/dev/tty', 'w');
        } catch (e) {}
      }
    }
  })();

  // Call before tryShell()
  if (options.display !== '' && typeof print === 'function')
    { print(options.display, encoding); }

  isEditable = !options.noEchoBack && !options.keyIn;

  (function() { // try read
    var buffer, reqSize, readSize, chunk;

    if (useShell || !ttyR ||
        typeof fdW !== 'number' && (options.display !== '' || !isEditable)) {
      input = tryShell();
      return;
    }

    if (options.display !== '') {
      fs.writeSync(fdW, options.display);
      options.display = '';
    }

    if (!setRawMode(!isEditable)) {
      input = tryShell();
      return;
    }
    buffer = new Buffer((reqSize = options.keyIn ? 1 : bufSize));

    while (true) {
      readSize = 0;

      try {
        readSize = fs.readSync(fdR, buffer, 0, reqSize);
      } catch (e) {
        if (e.code === 'EOF') { break; }
        setRawMode(false);
        input += tryShell();
        return;
      }

      if (readSize === 0) { break; }
      chunk = buffer.toString(encoding, 0, readSize);
      // other ctrl-chars
      if ((chunk = chunk.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')) === '')
        { continue; }

      if (!isEditable) {
        displayInput = chunk.replace(/[\r\n]/g, '');
        if (options.noEchoBack) { displayInput = displayInput.replace(/./g, mask); }
        if (displayInput !== '') { fs.writeSync(fdW, displayInput); }
      }

      input += chunk;
      if (/[\r\n]$/.test(input) ||
        options.keyIn && input.length >= reqSize) { break; }
    }

    if (!isEditable) { fs.writeSync(fdW, '\n'); }
    setRawMode(false);
  })();

  if (typeof print === 'function') {
    displayInput = input.replace(/[\r\n]/g, '');
    print((options.noEchoBack ?
      displayInput.replace(/./g, mask) : displayInput) + '\n', encoding);
  }

  return options.noTrim || options.keyIn ?
    input.replace(/[\r\n]+$/, '') : input.trim();
}

function _readlineShell(options) {
  var cmdArgs = [], execArgs, res = {},
    execOptions = {
      env: process.env,
      // ScriptPW (Win XP and Server2003) needs TTY stream as STDIN.
      // In this case, If STDIN isn't TTY, an error is thrown.
      stdio: [process.stdin],
      encoding: encoding
    };

  // To send any text to crazy Windows shell safely.
  function encodeDOS(arg) {
    return arg.replace(/[^\w\u0080-\uFFFF]/g, function(chr) {
      return '#' + chr.charCodeAt(0) + ';';
    });
  }

  if (options.noEchoBack) { cmdArgs.push('--noechoback'); }
  if (options.keyIn) { cmdArgs.push('--keyin'); }
  if (options.display !== '') {
    cmdArgs = cmdArgs.concat('--display', IS_WIN ?
      [encodeDOS(options.display), '--encoded'] : options.display);
  }

  if (childProc.execFileSync) {
    execArgs = (IS_WIN ? ['//nologo', SHELL_CMD] : [SHELL_CMD]).concat(cmdArgs);
    try {
      res.input = childProc.execFileSync(SHELL_PATH, execArgs, execOptions);
    } catch (e) { // non-zero exit code
      res.error = new Error(DEFAULT_ERR_MSG);
      res.error.method = 'execFileSync';
      res.error.command = SHELL_CMD;
      res.error.args = cmdArgs;
      res.error.shellMessage = e.stderr.trim();
      res.error.code = e.code;
      res.error.signal = e.signal;
      res.error.exitCode = e.status;
    }
  } else {
    res = _execSyncByFile(cmdArgs, execOptions);
  }
  if (!res.error) {
    res.input = res.input.replace(/^'|'$/g, '');
    options.display = '';
  }

  return res;
}

// piping via files (node v0.10-)
function _execSyncByFile(cmdArgs, execOptions) {

  function getTempfile(name) {
    var path = require('path'), filepath, suffix = '', fd;
    tempdir = tempdir || require('os').tmpdir();

    while (true) {
      filepath = path.join(tempdir, name + suffix);
      try {
        fd = fs.openSync(filepath, 'wx');
      } catch (e) {
        if (e.code === 'EEXIST') {
          suffix++;
          continue;
        } else {
          throw e;
        }
      }
      fs.closeSync(fd);
      break;
    }
    return filepath;
  }

  var execArgs, interpreter, res = {}, exitCode,
    pathStdout  = getTempfile('readline-sync.stdout'),
    pathStderr  = getTempfile('readline-sync.stderr'),
    pathExit    = getTempfile('readline-sync.exit'),
    pathDone    = getTempfile('readline-sync.done'),
    crypto = require('crypto'), shasum, decipher, password;

  shasum = crypto.createHash(ALGORITHM_HASH);
  shasum.update('' + process.pid + (salt++) + Math.random());
  password = shasum.digest('hex');
  decipher = crypto.createDecipher(ALGORITHM_CIPHER, password);

  if (IS_WIN) {
    interpreter = process.env.ComSpec || 'cmd.exe';
    process.env.Q = '"'; // The quote (") that isn't escaped.
    // `()` for ignore space by echo
    execArgs = ['/V:ON', '/S', '/C',
      '(%Q%' + interpreter + '%Q% /V:ON /S /C %Q%' +
        '%Q%' + SHELL_PATH + '%Q% //nologo %Q%' + SHELL_CMD + '%Q%' +
          cmdArgs.map(function(arg) { return ' %Q%' + arg + '%Q%'; }).join('') +
        ' & (echo !ERRORLEVEL!)>%Q%' + pathExit + '%Q%%Q%) 2>%Q%' + pathStderr + '%Q%' +
      ' |%Q%' + process.execPath + '%Q% %Q%' + __dirname + '\\encrypt.js%Q%' +
        ' %Q%' + ALGORITHM_CIPHER + '%Q% %Q%' + password + '%Q%' +
        ' >%Q%' + pathStdout + '%Q%' +
      ' & (echo 1)>%Q%' + pathDone + '%Q%'];
  } else {
    interpreter = SHELL_PATH;
    execArgs = ['-c',
      // Use `()`, not `{}` for `-c` (text param)
      '("' + SHELL_PATH + '" "' + SHELL_CMD + '"' +
          cmdArgs.map(function(arg)
            { return " '" + arg.replace(/'/g, "'\\''") + "'"; }).join('') +
        '; echo $?>"' + pathExit + '") 2>"' + pathStderr + '"' +
      ' |"' + process.execPath + '" "' + __dirname + '/encrypt.js"' +
        ' "' + ALGORITHM_CIPHER + '" "' + password + '"' +
        ' >"' + pathStdout + '"' +
      '; echo 1 >"' + pathDone + '"'];
  }
  try {
    childProc.spawn(interpreter, execArgs, execOptions);
  } catch (e) {
    res.error = new Error(e.message);
    res.error.method = '_execSyncByFile - spawn';
    res.error.interpreter = interpreter;
  }

  while (fs.readFileSync(pathDone, {encoding: encoding}).trim() !== '1') {}
  if ((exitCode = fs.readFileSync(pathExit, {encoding: encoding}).trim()) === '0') {
    res.input =
      decipher.update(fs.readFileSync(pathStdout, {encoding: 'binary'}), 'hex', encoding) +
      decipher.final(encoding);
  } else {
    res.error = new Error(DEFAULT_ERR_MSG);
    res.error.method = '_execSyncByFile';
    res.error.command = SHELL_CMD;
    res.error.args = cmdArgs;
    res.error.shellMessage = fs.readFileSync(pathStderr, {encoding: encoding}).trim();
    res.error.exitCode = +exitCode;
  }

  fs.unlinkSync(pathStdout);
  fs.unlinkSync(pathStderr);
  fs.unlinkSync(pathExit);
  fs.unlinkSync(pathDone);

  return res;
}

// for dev
exports._useShellSet = function(use) { useShell = use; };

exports.setPrint = function(fnc) { print = fnc; };

exports.setPrompt = function(newPrompt) {
/* jshint eqnull:true */
  if (newPrompt != null) {
/* jshint eqnull:false */
    promptText = newPrompt;
  }
  return promptText;
};

exports.setEncoding = function(newEncoding) {
  if (typeof newEncoding === 'string') {
    encoding = newEncoding;
  }
  return encoding;
};

exports.setMask = function(newMask) {
  if (typeof newMask === 'string') {
    mask = newMask;
  }
  return mask;
};

exports.setBufferSize = function(newBufSize) {
  newBufSize = parseInt(newBufSize, 10);
  if (!isNaN(newBufSize) && typeof newBufSize === 'number') {
    bufSize = newBufSize;
  }
  return bufSize;
};

exports.prompt = function(options) {
  var readOptions = {
    display:    promptText + '',
    noEchoBack: !!(options && options.noEchoBack),
    keyIn:      false,
    noTrim:     !!(options && options.noTrim)
  };
  return _readlineSync(readOptions);
};

exports.question = function(query, options) {
  var readOptions = {
/* jshint eqnull:true */
    display:    query != null ? query + '' : '',
/* jshint eqnull:false */
    noEchoBack: !!(options && options.noEchoBack),
    keyIn:      false,
    noTrim:     !!(options && options.noTrim)
  };
  return _readlineSync(readOptions);
};

exports.keyIn = function(query, options) {
  var readOptions = {
/* jshint eqnull:true */
    display:    query != null ? query + '' : '',
/* jshint eqnull:false */
    noEchoBack: !!(options && options.noEchoBack),
    keyIn:      true,
    noTrim:     true
  };
  return _readlineSync(readOptions);
};
