/*
 * readlineSync
 * https://github.com/anseki/readline-sync
 *
 * Copyright (c) 2013 anseki
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(prompt, encoding) {
  var input = '', BUF_SIZE = 256, rsize,
    fs = require('fs'),
    stdin = process.stdin,
    buffer = new Buffer(BUF_SIZE);
  encoding = encoding || 'utf8';

  if (prompt) { process.stdout.write(prompt, encoding); }

  stdin.resume();
  while ((rsize = fs.readSync(stdin.fd, buffer, 0, BUF_SIZE)) > 0) {
    input += buffer.toString(encoding, 0, rsize);
    if (/[\r\n]$/.test(input)) { break; }
  }
  stdin.pause();

  return input.trim();
};
