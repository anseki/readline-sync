/*
 * readlineSync
 * https://github.com/anseki/readline-sync
 *
 * Copyright (c) 2014 anseki
 * Licensed under the MIT license.
 */

'use strict';

var
  BUF_SIZE = 256,
  ALGORITHM_CIPHER = 'aes-256-cbc',
  ALGORITHM_HASH = 'sha256',

  promptText = '> ',
  encoding = 'utf8',
  fs = require('fs'),
  stdin = process.stdin,
  stdout = process.stdout,
  buffer = new Buffer(BUF_SIZE),
  useShell = true, print, tempdir, salt = 0;

function _readlineSync(display, options) {
  var input = '', rsize, err;

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
        rsize = fs.readSync(stdin.fd, buffer, 0, BUF_SIZE);
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

  return input.trim();
}

function _readlineShell(noEchoBack) {
  // piping via files instead of execSync (node v0.12+)
  // https://github.com/joyent/node/blob/master/doc/api/child_process.markdown#child_processexecsynccommand-options
  // see README > Note
  var shellPath, args, shellStdout,
    pathStdout = getTempfile('readline-sync.stdout'),
    pathStatus = getTempfile('readline-sync.status'),
    pathDone   = getTempfile('readline-sync.done'),
    optEchoBack = noEchoBack ? ' noechoback' : '',
    crypto = require('crypto'), shasum, decipher, password;

  shasum = crypto.createHash(ALGORITHM_HASH);
  shasum.update('' + process.pid + (salt++) + Math.random());
  password = shasum.digest('hex');
  decipher = crypto.createDecipher(ALGORITHM_CIPHER, password);

  if (process.platform === 'win32') {
    // The quote (") is escaped by node before parsed by shell. Then use ENV{Q}.
    shellPath = 'cmd.exe';
    args = ['/V:ON', '/S', '/C',
      '%Q%' + __dirname + '\\read.bat%Q%' + optEchoBack +
      ' |%Q%' + process.execPath + '%Q% %Q%' + __dirname + '\\encrypt.js%Q%' +
        ' %Q%' + ALGORITHM_CIPHER + '%Q% %Q%' + password + '%Q%' +
      ' >%Q%' + pathStdout + '%Q%' +
      ' & (echo !ERRORLEVEL!)>%Q%' + pathStatus + '%Q% & (echo 1)>%Q%' + pathDone + '%Q%'];
  } else {
    shellPath = '/bin/sh';
    args = ['-c',
      'DATA=`(' + shellPath + ' "' + __dirname + '/read.sh"' + optEchoBack + ')`; RTN=$?;' +
      ' if [ $RTN -eq 0 ]; then (echo $DATA |' +
      '"' + process.execPath + '" "' + __dirname + '/encrypt.js"' +
        ' "' + ALGORITHM_CIPHER + '" "' + password + '"' +
      ' >"' + pathStdout + '") fi;' +
      ' expr $RTN + $? >"' + pathStatus + '"; echo 1 >"' + pathDone + '"'];
  }

  stdin.pause(); // re-start in child process
  require('child_process').execFile(shellPath, args, {env: {Q: '"'}});

  while (fs.readFileSync(pathDone, {encoding: encoding}).trim() !== '1') {}
  if (fs.readFileSync(pathStatus, {encoding: encoding}).trim() === '0') {
    shellStdout =
      decipher.update(fs.readFileSync(pathStdout, {encoding: 'binary'}), 'hex', encoding) +
      decipher.final(encoding);
  }

  fs.unlinkSync(pathStdout);
  fs.unlinkSync(pathStatus);
  fs.unlinkSync(pathDone);
  return shellStdout;
}

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

// for dev
exports.useShellSet = function(use) { useShell = use; };

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
