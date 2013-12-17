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
  var input = '', rsize;

  if (display) { stdout.write(display, encoding); }

  stdin.resume();
  while (true) {
    rsize = 0;
    try {
      rsize = fs.readSync(stdin.fd, buffer, 0, BUF_SIZE);
    } catch (e) {
      if (e.code === 'EAGAIN') {
        // Error: EAGAIN, resource temporarily unavailable
        if (display) { stdout.write('\n', encoding); } // Next of prompt line.
        console.error('Error: This machine don\'t support interactively reading from stdin.');
        process.exit(1);
      } else if (e.code === 'EOF') {
        break;
      }
      throw e;
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
