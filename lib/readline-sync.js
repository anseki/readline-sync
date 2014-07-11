/*
 * readlineSync
 * https://github.com/anseki/readline-sync
 *
 * Copyright (c) 2014 anseki
 * Licensed under the MIT license.
 */

'use strict';

var promptText = '> ',
  encoding = 'utf8',
  BUF_SIZE = 256,
  fs = require('fs'),
  stdin = process.stdin,
  stdout = process.stdout,
  buffer = new Buffer(BUF_SIZE),
  useShell = true, print, tempdir;

function _readlineSync(display, options) {
  var input = '', rsize, err;

  if (display !== '') {
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
  var shellPath, args, shellStdout,
    pathStdout = getTempfile('readline-sync.stdout'),
    pathStatus = getTempfile('readline-sync.status'),
    pathDone   = getTempfile('readline-sync.done'),
    optEchoBack = noEchoBack ? ' noechoback' : '';

  if (process.platform === 'win32') {
    // The quote (") is escaped by node before parsed by shell. Then use ENV{Q}.
    shellPath = 'cmd.exe';
    args = ['/V:ON', '/S', '/C',
      '%Q%' + __dirname + '\\read.bat%Q%' + optEchoBack + ' >%Q%' + pathStdout +
      '%Q% & (echo !ERRORLEVEL!)>%Q%' + pathStatus + '%Q% & (echo 1)>%Q%' + pathDone + '%Q%'];
  } else {
    shellPath = '/bin/sh';
    args = ['-c', '(' + shellPath + ' "' + __dirname + '/read.sh"' + optEchoBack + ') >"' + pathStdout +
      '"; echo $? >"' + pathStatus + '"; echo 1 >"' + pathDone + '"'];
  }

  stdin.pause(); // re-start in child process
  require('child_process').execFile(shellPath, args, {env: {Q: '"'}});

  while (true) {
    if (fs.readFileSync(pathDone, {encoding: encoding}).trim() === '1') { break; }
  }
  if (fs.readFileSync(pathStatus, {encoding: encoding}).trim() === '0') {
    shellStdout = fs.readFileSync(pathStdout, {encoding: encoding});
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
  promptText = newPrompt != null ? newPrompt : '';
/* jshint eqnull:false */
};

exports.setEncoding = function(newEncoding) {
  if (typeof newEncoding === 'string') {
    encoding = newEncoding;
  }
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
