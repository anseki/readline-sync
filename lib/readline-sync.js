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
  useShell = true;

function _readlineShell() {
      // Win isn't supported by sync-exec v0.3.2
  var command = /* require('os').platform() === 'win32' ?
      'cmd "' + __dirname + '\\read.bat' : */
      'sh "' + __dirname + '/read.sh"',
    resExec = require('sync-exec')(command); // instead of execSync (node v0.12+)
  return resExec.status === 0 && !resExec.stderr ? (resExec.stdout + '') : false;
}

function _readlineSync(display) {
  var input = '', rsize, err;

  if (display) { stdout.write(display, encoding); }

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
      if (display) { stdout.write('\n', encoding); } // Return from prompt line.
      throw err || e;
    }

    if (rsize === 0) { break; }
    input += buffer.toString(encoding, 0, rsize);
    if (/[\r\n]$/.test(input)) { break; }
  }
  stdin.pause();

  return input.trim();
}

// for dev
exports.useShellSet = function(use) { useShell = use; };

exports.setPrompt = function(newPrompt) {
  if (typeof newPrompt === 'string') {
    promptText = newPrompt;
  }
};

exports.setEncoding = function(newEncoding) {
  if (typeof newEncoding === 'string') {
    encoding = newEncoding;
  }
};

exports.prompt = function() {
  return _readlineSync(promptText);
};

exports.question = function(query) {
  return _readlineSync(typeof query === 'string' ? query : '');
};
