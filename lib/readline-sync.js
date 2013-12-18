/*
 * readlineSync
 * https://github.com/anseki/readline-sync
 *
 * Copyright (c) 2013 anseki
 * Licensed under the MIT license.
 */

'use strict';

var promptText = '> ',
  encoding = 'utf8',
  BUF_SIZE = 256,
  fs = require('fs'),
  stdin = process.stdin,
  stdout = process.stdout,
  buffer = new Buffer(BUF_SIZE);

var _readlineSync = function(display) {
  var input = '', rsize, err;

  if (display) { stdout.write(display, encoding); }

  stdin.resume();
  while (true) {
    rsize = 0;

    try {
      rsize = fs.readSync(stdin.fd, buffer, 0, BUF_SIZE);
    } catch (e) {
      if (e.code === 'EOF') { break; } // pipe
      if (e.code === 'EAGAIN') { // EAGAIN, resource temporarily unavailable
        // util can't inherit Error.
        err = new Error('The platform don\'t support interactively reading from stdin');
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
};

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
