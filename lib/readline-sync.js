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
  childProc = require('child_process'),

  promptText = '> ',
  encoding = 'utf8',
  bufSize = 1024,
  print,
  tempdir, salt = 0, useShell = false;

function _readlineSync(options) { // options.display is string
  var input = '', fd, buffer, rsize, res, isOpened, fsBind, constBind;

  if (options.display !== '' && typeof print === 'function')
    { print(options.display, encoding); }

  if (useShell || options.noEchoBack || options.keyIn) {
    res = _readlineShell(options);
    if (res.error) { throw res.error; }
    input = res.input;
  } else {

    if (IS_WIN) { // r/w mode not supported
      if (process.stdin.isTTY && process.stdout.isTTY) {
        if (options.display !== '') {
          // process.stdout.write(options.display, encoding);
          fs.writeSync(process.stdout.fd, options.display);
          options.display = '';
        }
        fd = process.stdin.fd;
        isOpened = true;
      } else {

        try {
          if (options.display !== '') {
            fd = fs.openSync('\\\\.\\CON', 'w');
            fs.writeSync(fd, options.display);
            fs.closeSync(fd);
            options.display = '';
          }
          fd = fs.openSync('\\\\.\\CON', 'rs');
          isOpened = true;
        } catch (e) {}

        if (!isOpened || options.display !== '') { // Retry
          try {
            // For raw device path
            // On XP, 2000, 7 (x86), it might fail.
            // And, process.binding('fs') might be no good.
            fsBind = process.binding('fs');
            constBind = process.binding('constants');
            if (options.display !== '') {
              fd = fsBind.open('CONOUT$',
                constBind.O_RDWR | constBind.O_SYNC, parseInt('0666', 8));
              fs.writeSync(fd, options.display);
              fs.closeSync(fd);
              options.display = '';
            }
            fd = fsBind.open('CONIN$',
              constBind.O_RDWR | constBind.O_SYNC, parseInt('0666', 8));
            isOpened = true;
          } catch (e) {}
        }
      }

    } else {
      try {
        fd = fs.openSync('/dev/tty', 'rs+');
        isOpened = true;
        if (options.display !== '') {
          fs.writeSync(fd, options.display);
          options.display = '';
        }
      } catch (e) {}
    }

    if (isOpened && options.display === '') {

      buffer = new Buffer(bufSize);
      while (true) {
        rsize = 0;

        try {
          rsize = fs.readSync(fd, buffer, 0, bufSize);
        } catch (e) {
          if (e.code === 'EOF') { break; }

          res = _readlineShell(options);
          if (res.error) { throw res.error; }
          input += res.input;
          break;
        }

        if (rsize === 0) { break; }
        input += buffer.toString(encoding, 0, rsize);
        if (/[\r\n]$/.test(input)) { break; }
      }

    } else {
      res = _readlineShell(options);
      if (res.error) { throw res.error; }
      input = res.input;
    }

    if (isOpened && !process.stdin.isTTY) { fs.closeSync(fd); }
  }

  return options.noTrim ? input.replace(/[\r\n]+$/, '') : input.trim();
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
