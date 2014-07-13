var algorithmCipher = 'aes-256-cbc',
  cipher = require('crypto').createCipher(algorithmCipher, process.argv[2]),
  stdin = process.stdin,
  stdout = process.stdout,
  crypted = '';

stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', function(d) {
  crypted += cipher.update(d, 'utf8', 'hex');
});
stdin.on('end', function() {
  stdout.write(crypted + cipher.final('hex'), 'binary', function() {
    process.exit(0);
  });
});
