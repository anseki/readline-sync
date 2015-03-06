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
  SHELL_PATH = IS_WIN ? 'cmd.exe' : '/bin/sh',
  SHELL_CMD = __dirname + (IS_WIN ? '\\read.bat' : '/read.sh'),
  ALGORITHM_CIPHER = 'aes-256-cbc',
  ALGORITHM_HASH = 'sha256',
  DEFAULT_ERR_MSG = 'The platform doesn\'t support interactive reading',

  fs = require('fs'),
  childProc = require('child_process'),
  stdin = process.stdin,
  stdout = process.stdout,

  promptText = '> ',
  encoding = 'utf8',
  bufSize = 1024,
  useShell = false, print, tempdir, salt = 0;

function _readlineSync(display, options) {
  var input = '', res, buffer = new Buffer(bufSize), rsize;
  options = options || {};

  if (display !== '') { // null and undefined were excluded.
    if (typeof print === 'function') { print(display, encoding); }
    stdout.write(display + '', encoding);
  }

  if (useShell || options.noEchoBack) { // Try reading via shell

    res = _readlineShell(options);
    if (res.error) {
      if (display !== '') { stdout.write('\n', encoding); } // Return from prompt line.
      throw res.error;
    }
    input = res.input;

  } else {

    stdin.resume();
    while (true) {
      rsize = 0;

      try {
        rsize = fs.readSync(stdin.fd, buffer, 0, bufSize);
      } catch (e) {
        if (e.code === 'EOF') { break; }

        // Try reading via shell
        res = _readlineShell(options);
        if (res.error) {
          if (display !== '') { stdout.write('\n', encoding); } // Return from prompt line.
          throw res.error;
        }
        input += res.input;
        break;
      }

      if (rsize === 0) { break; }
      input += buffer.toString(encoding, 0, rsize);
      if (/[\r\n]$/.test(input)) { break; }
    }
    stdin.pause();

  }

  return options.noTrim ? input.replace(/[\r\n]+$/, '') : input.trim();
}

function _readlineShell(options) {
  var args = [], res = {},
    execOptions = {
      env: process.env,
      stdio: [stdin], // ScriptPW needs piped stdin
      encoding: encoding
    };

  if (options.noEchoBack) {
    args.push('noechoback');
  }

  stdin.pause(); // re-start in child process
  if (childProc.execFileSync) {
    try {
      res.input = childProc.execFileSync(SHELL_PATH,
        (IS_WIN ? ['/C', SHELL_CMD] : [SHELL_CMD]).concat(args), execOptions);
    } catch (e) { // non-zero exit code
      res.error = new Error(DEFAULT_ERR_MSG);
      res.error.method = 'execFileSync';
      res.error.command = SHELL_CMD;
      res.error.args = args;
      res.error.shellMessage = e.stderr.trim();
    }
  } else {
    res = _execSyncByFile(args, execOptions);
  }
  if (!res.error) { res.input = res.input.replace(/^'|'$/g, ''); }

  return res;
}

// piping via files (node v0.10-)
function _execSyncByFile(args, execOptions) {

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

  var cmdArgs, res = {},
    pathStdout = getTempfile('readline-sync.stdout'),
    pathStderr = getTempfile('readline-sync.stderr'),
    pathStatus = getTempfile('readline-sync.status'),
    pathDone   = getTempfile('readline-sync.done'),
    crypto = require('crypto'), shasum, decipher, password;

  shasum = crypto.createHash(ALGORITHM_HASH);
  shasum.update('' + process.pid + (salt++) + Math.random());
  password = shasum.digest('hex');
  decipher = crypto.createDecipher(ALGORITHM_CIPHER, password);

  if (IS_WIN) {
    // The quote (") is escaped by node before parsed by shell. Then use ENV{Q}.
    process.env.Q = '"';
    // `()` for ignore space by echo
    cmdArgs = ['/V:ON', '/S', '/C',
      '(' + SHELL_PATH + ' /V:ON /S /C %Q%%Q%' + SHELL_CMD + '%Q% ' + args.join(' ') +
        ' & (echo !ERRORLEVEL!)>%Q%' + pathStatus + '%Q%%Q%) 2>%Q%' + pathStderr + '%Q%' +
      ' |%Q%' + process.execPath + '%Q% %Q%' + __dirname + '\\encrypt.js%Q%' +
        ' %Q%' + ALGORITHM_CIPHER + '%Q% %Q%' + password + '%Q%' +
        ' >%Q%' + pathStdout + '%Q%' +
      ' & (echo 1)>%Q%' + pathDone + '%Q%'];
  } else {
    cmdArgs = ['-c',
      // Use `()`, not `{}` for `-c` (text param)
      '(' + SHELL_PATH + ' "' + SHELL_CMD + '" ' + args.join(' ') +
        '; echo $?>"' + pathStatus + '") 2>"' + pathStderr + '"' +
      ' |"' + process.execPath + '" "' + __dirname + '/encrypt.js"' +
        ' "' + ALGORITHM_CIPHER + '" "' + password + '"' +
        ' >"' + pathStdout + '"' +
      '; echo 1 >"' + pathDone + '"'];
  }
  childProc.spawn(SHELL_PATH, cmdArgs, execOptions);

  while (fs.readFileSync(pathDone, {encoding: encoding}).trim() !== '1') {}
  if (fs.readFileSync(pathStatus, {encoding: encoding}).trim() === '0') {
    res.input =
      decipher.update(fs.readFileSync(pathStdout, {encoding: 'binary'}), 'hex', encoding) +
      decipher.final(encoding);
  } else {
    res.error = new Error(DEFAULT_ERR_MSG);
    res.error.method = '_execSyncByFile';
    res.error.command = SHELL_CMD;
    res.error.args = args;
    res.error.shellMessage = fs.readFileSync(pathStderr, {encoding: encoding}).trim();
  }

  fs.unlinkSync(pathStdout);
  fs.unlinkSync(pathStderr);
  fs.unlinkSync(pathStatus);
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
  if (typeof newBufSize === 'number') {
    bufSize = newBufSize;
  }
  return bufSize;
};

exports.prompt = function(options) {
  return _readlineSync(promptText, options);
};

exports.question = function(query, options) {
  return _readlineSync(
/* jshint eqnull:true */
    query != null ? query : '',
/* jshint eqnull:false */
    options);
};

exports.keyIn = function(query) {
  return _readlineSync(
/* jshint eqnull:true */
    query != null ? query : '',
/* jshint eqnull:false */
    {keyIn: true});
};
