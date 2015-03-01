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

  ALGORITHM_CIPHER = 'aes-256-cbc',
  ALGORITHM_HASH = 'sha256',

  fs = require('fs'),
  childProc = require('child_process'),
  stdin = process.stdin,
  stdout = process.stdout,

  promptText = '> ',
  encoding = 'utf8',
  bufSize = 1024,
  useShell = true, print, tempdir, salt = 0;

function _readlineSync(display, options) {
  var input = '', buffer = new Buffer(bufSize),
    rsize, err;

  if (display !== '') { // null and undefined were excluded.
    if (typeof print === 'function') { print(display, encoding); }
    stdout.write(display + '', encoding);
  }

  if (options && options.noEchoBack) { // Try reading via shell

    input = _readlineShell(true);
    if (typeof input !== 'string') {
      if (display !== '') { stdout.write('\n', encoding); } // Return from prompt line.
      throw new Error('Can\'t read via shell');
    }

  } else {

    stdin.resume();
    while (true) {
      rsize = 0;

      try {
        rsize = fs.readSync(stdin.fd, buffer, 0, bufSize);
      } catch (e) {
        if (e.code === 'EOF') { break; } // pipe

        if (useShell) {
          // Try reading via shell
          input = _readlineShell();
          if (typeof input === 'string') { break; }
        }

        // Give up...
        if (e.code === 'EAGAIN') { // EAGAIN, resource temporarily unavailable
          // util can't inherit Error.
          err = new Error('The platform doesn\'t support interactive reading from stdin');
          err.errno = e.errno;
          err.code = e.code;
        }
        if (display !== '') { stdout.write('\n', encoding); } // Return from prompt line.
        throw err || e;
      }

      if (rsize === 0) { break; }
      input += buffer.toString(encoding, 0, rsize);
      if (/[\r\n]$/.test(input)) { break; }
    }
    stdin.pause();

  }

  return options && options.noTrim ? input.replace(/[\r\n]+$/, '') : input.trim();
}

function _readlineShell(noEchoBack) {
  var shellStdout, command,
    options = {
      env: process.env,
      stdio: [stdin], // ScriptPW needs piped stdin
      encoding: encoding
    },
    optEchoBack = noEchoBack ? ' noechoback' : '';

  if (IS_WIN) {
    // The quote (") is escaped by node before parsed by shell. Then use ENV{Q}.
    process.env.Q = '"';
    command = '%Q%' + __dirname + '\\read.bat%Q%' + optEchoBack;
  } else {
    command = '"' + __dirname + '/read.sh"' + optEchoBack;
  }

  stdin.pause(); // re-start in child process
  if (childProc.execFileSync) {
    shellStdout = childProc.execFileSync(SHELL_PATH,
      IS_WIN ? ['/S', '/C', command] : ['-c', command], options);
    shellStdout = shellStdout.replace(/^'|'$/g, '');
  } else {
    shellStdout = _execSyncByFile(command, options);
  }

  return shellStdout;
}

// piping via files (node v0.10-)
function _execSyncByFile(command, options) {

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

  var shellStdout,
    pathStdout = getTempfile('readline-sync.stdout'),
    pathStatus = getTempfile('readline-sync.status'),
    pathDone   = getTempfile('readline-sync.done'),
    crypto = require('crypto'), shasum, decipher, password;

  shasum = crypto.createHash(ALGORITHM_HASH);
  shasum.update('' + process.pid + (salt++) + Math.random());
  password = shasum.digest('hex');
  decipher = crypto.createDecipher(ALGORITHM_CIPHER, password);

  childProc.spawn(SHELL_PATH,
    IS_WIN ? ['/V:ON', '/S', '/C',
        command + ' |%Q%' + process.execPath + '%Q% %Q%' + __dirname + '\\encrypt.js%Q%' +
          ' %Q%' + ALGORITHM_CIPHER + '%Q% %Q%' + password + '%Q%' +
        ' >%Q%' + pathStdout + '%Q%' +
        ' & (echo !ERRORLEVEL!)>%Q%' + pathStatus + '%Q% & (echo 1)>%Q%' + pathDone + '%Q%'] :
      ['-c',
        'DATA=`(' + SHELL_PATH + ' ' + command + ')`; RTN=$?;' +
        ' if [ $RTN -eq 0 ]; then (printf \'%s\' "$DATA" |' +
        '"' + process.execPath + '" "' + __dirname + '/encrypt.js"' +
          ' "' + ALGORITHM_CIPHER + '" "' + password + '"' +
        ' >"' + pathStdout + '") fi;' +
        ' expr $RTN + $? >"' + pathStatus + '"; echo 1 >"' + pathDone + '"'],
    options);

  while (fs.readFileSync(pathDone, {encoding: encoding}).trim() !== '1') {}
  if (fs.readFileSync(pathStatus, {encoding: encoding}).trim() === '0') {
    shellStdout =
      decipher.update(fs.readFileSync(pathStdout, {encoding: 'binary'}), 'hex', encoding) +
      decipher.final(encoding);
    shellStdout = shellStdout.replace(/^'|'$/g, '');
  }

  fs.unlinkSync(pathStdout);
  fs.unlinkSync(pathStatus);
  fs.unlinkSync(pathDone);

  return shellStdout;
}

// for dev
//exports.useShellSet = function(use) { useShell = use; };

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

exports.keyIn = function(message) {
  return _readlineSync(
/* jshint eqnull:true */
    message != null ? message : '',
/* jshint eqnull:false */
    {keyIn: true});
};

