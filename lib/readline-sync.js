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

  ALGORITHM_CIPHER = 'aes-256-cbc',
  ALGORITHM_HASH = 'sha256',
  DEFAULT_ERR_MSG = 'The platform doesn\'t support interactive reading',

  fs = require('fs'),
  TTY = process.binding('tty_wrap').TTY,
  childProc = require('child_process'),

  defaultOptions = {
    prompt:         '> ',       // for API
    noEchoBack:     false,
    mask:           '*',
    limit:          '',
    caseSensitive:  false,
    noTrim:         false,
    encoding:       'utf8',
    bufSize:        1024,
    print:          null
  },
  useExt = false,

  fdR = 'none', fdW, ttyR, isRawMode = false,
  extHostPath, extHostArgs, tempdir, salt = 0;

/*
  display:        string
  keyIn:          boolean
  noEchoBack:     boolean
  mask:           string
  limit:          string (pattern)
  caseSensitive:  boolean
  noTrim:         boolean
  encoding, bufSize, print
*/
function readlineSync(options) {
  var input = '', displaySave = options.display,
    silent = !options.display && options.keyIn && options.noEchoBack && !options.mask;

  function tryExt() {
    var res = readlineExt(options);
    if (res.error) { throw res.error; }
    return res.input;
  }

  (function() { // open TTY
    var fsB, constants;

    function getFsB() {
      if (!fsB) {
        fsB = process.binding('fs'); // For raw device path
        constants = process.binding('constants');
      }
      return fsB;
    }

    if (typeof fdR !== 'string') { return; }
    fdR = null;

    if (IS_WIN) {
      if (process.stdin.isTTY) {
        fdR = process.stdin.fd;
        ttyR = process.stdin._handle;
      } else {
        try {
          // The stream by fs.openSync('\\\\.\\CON', 'r') can't switch to raw mode.
          // 'CONIN$' might fail on XP, 2000, 7 (x86).
          fdR = getFsB().open('CONIN$', constants.O_RDWR, parseInt('0666', 8));
          ttyR = new TTY(fdR, true);
        } catch (e) {}
      }

      if (process.stdout.isTTY) {
        fdW = process.stdout.fd;
      } else {
        try {
          fdW = fs.openSync('\\\\.\\CON', 'w');
        } catch (e) {}
        if (typeof fdW !== 'number') { // Retry
          try {
            fdW = getFsB().open('CONOUT$', constants.O_RDWR, parseInt('0666', 8));
          } catch (e) {}
        }
      }

    } else {
      if (process.stdin.isTTY) {
        try {
          fdR = fs.openSync('/dev/tty', 'r'); // device file, not process.stdin
          ttyR = process.stdin._handle;
        } catch (e) {}
      } else {
        // Node v0.12 read() fails.
        try {
          fdR = fs.openSync('/dev/tty', 'r');
          ttyR = new TTY(fdR, false);
        } catch (e) {}
      }

      if (process.stdout.isTTY) {
        fdW = process.stdout.fd;
      } else {
        try {
          fdW = fs.openSync('/dev/tty', 'w');
        } catch (e) {}
      }
    }
  })();

  (function() { // try read
    var atEol, limit,
      isCooked = !options.noEchoBack && !options.keyIn,
      buffer, reqSize, readSize, chunk, line;

    // Node v0.10- returns an error if same mode is set.
    function setRawMode(mode) {
      if (mode === isRawMode) { return true; }
      if (ttyR.setRawMode(mode) !== 0) { return false; }
      isRawMode = mode;
      return true;
    }

    if (useExt || !ttyR ||
        typeof fdW !== 'number' && (options.display || !isCooked)) {
      input = tryExt();
      return;
    }

    if (options.display) {
      fs.writeSync(fdW, options.display);
      options.display = '';
    }

    if (!setRawMode(!isCooked)) {
      input = tryExt();
      return;
    }
    buffer = new Buffer((reqSize = options.keyIn ? 1 : options.bufSize));

    if (options.keyIn && options.limit) {
      limit = new RegExp('[^' + options.limit + ']',
        'g' + (options.caseSensitive ? '' : 'i'));
    }

    while (true) {
      readSize = 0;
      try {
        readSize = fs.readSync(fdR, buffer, 0, reqSize);
      } catch (e) {
        if (e.code !== 'EOF') {
          setRawMode(false);
          input += tryExt();
          return;
        }
      }
      chunk = readSize > 0 ? buffer.toString(options.encoding, 0, readSize) : '\n';

      if (chunk &&
          typeof(line = (chunk.match(/^(.*?)[\r\n]/) || [])[1]) === 'string') {
        chunk = line;
        atEol = true;
      }

      // other ctrl-chars
      if (chunk) { chunk = chunk.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, ''); }
      if (chunk && limit) { chunk = chunk.replace(limit, ''); }

      if (chunk) {
        if (!isCooked) {
          if (!options.noEchoBack) {
            fs.writeSync(fdW, chunk);
          } else if (options.mask) {
            fs.writeSync(fdW, (new Array(chunk.length + 1)).join(options.mask));
          }
        }
        input += chunk;
      }

      if (!options.keyIn && atEol ||
        options.keyIn && input.length >= reqSize) { break; }
    }

    if (!isCooked && !silent) { fs.writeSync(fdW, '\n'); }
    setRawMode(false);
  })();

  if (typeof options.print === 'function' && !silent) { // must at least write '\n'
    options.print(displaySave + (options.noEchoBack ?
      (new Array(input.length + 1)).join(options.mask) : input) + '\n',
      options.encoding);
  }

  return options.noTrim || options.keyIn ? input : input.trim();
}

function readlineExt(options) {
  var hostArgs, res = {},
    execOptions = {env: process.env, encoding: options.encoding};

  if (!extHostPath) {
    if (IS_WIN) {
      if (process.env.PSModulePath) { // Windows PowerShell
        extHostPath = 'powershell.exe';
        extHostArgs = ['-ExecutionPolicy', 'Bypass', '-File', __dirname + '\\read.ps1'];
      } else {                        // Windows Script Host
        extHostPath = 'cscript.exe';
        extHostArgs = ['//nologo', __dirname + '\\read.cs.js'];
      }
    } else {
      extHostPath = '/bin/sh';
      extHostArgs = [__dirname + '/read.sh'];
    }
  }
  if (IS_WIN && !process.env.PSModulePath) { // Windows Script Host
    options.encoded = true; // Parsing args is DOS?
    // ScriptPW (Win XP and Server2003) needs TTY stream as STDIN.
    // In this case, If STDIN isn't TTY, an error is thrown.
    execOptions.stdio = [process.stdin];
  }

  if (childProc.execFileSync) {
    hostArgs = getHostArgs(options);
    try {
      res.input = childProc.execFileSync(extHostPath, hostArgs, execOptions);
    } catch (e) { // non-zero exit code
      res.error = new Error(DEFAULT_ERR_MSG);
      res.error.method = 'execFileSync';
      res.error.program = extHostPath;
      res.error.args = hostArgs;
      res.error.extMessage = e.stderr.trim();
      res.error.exitCode = e.status;
      res.error.code = e.code;
      res.error.signal = e.signal;
    }
  } else {
    res = _execFileSync(options, execOptions);
  }
  if (!res.error) {
    res.input = res.input.replace(/^\s*'|'\s*$/g, '');
    options.display = '';
  }

  return res;
}

// piping via files (node v0.10-)
function _execFileSync(options, execOptions) {

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

  var hostArgs, shellPath, shellArgs, res = {}, exitCode,
    pathStdout  = getTempfile('readline-sync.stdout'),
    pathStderr  = getTempfile('readline-sync.stderr'),
    pathExit    = getTempfile('readline-sync.exit'),
    pathDone    = getTempfile('readline-sync.done'),
    crypto = require('crypto'), shasum, decipher, password;

  shasum = crypto.createHash(ALGORITHM_HASH);
  shasum.update('' + process.pid + (salt++) + Math.random());
  password = shasum.digest('hex');
  decipher = crypto.createDecipher(ALGORITHM_CIPHER, password);

  if (IS_WIN) { options.encoded = true; }
  hostArgs = getHostArgs(options);
  if (IS_WIN) {
    shellPath = process.env.ComSpec || 'cmd.exe';
    process.env.Q = '"'; // The quote (") that isn't escaped.
    // `()` for ignore space by echo
    shellArgs = ['/V:ON', '/S', '/C',
      '(%Q%' + shellPath + '%Q% /V:ON /S /C %Q%' +
        '%Q%' + extHostPath + '%Q%' +
          hostArgs.map(function(arg) { return ' %Q%' + arg + '%Q%'; }).join('') +
        ' & (echo !ERRORLEVEL!)>%Q%' + pathExit + '%Q%%Q%) 2>%Q%' + pathStderr + '%Q%' +
      ' |%Q%' + process.execPath + '%Q% %Q%' + __dirname + '\\encrypt.js%Q%' +
        ' %Q%' + ALGORITHM_CIPHER + '%Q% %Q%' + password + '%Q%' +
        ' >%Q%' + pathStdout + '%Q%' +
      ' & (echo 1)>%Q%' + pathDone + '%Q%'];
  } else {
    shellPath = '/bin/sh';
    shellArgs = ['-c',
      // Use `()`, not `{}` for `-c` (text param)
      '("' + extHostPath + '"' +
          hostArgs.map(function(arg)
            { return " '" + arg.replace(/'/g, "'\\''") + "'"; }).join('') +
        '; echo $?>"' + pathExit + '") 2>"' + pathStderr + '"' +
      ' |"' + process.execPath + '" "' + __dirname + '/encrypt.js"' +
        ' "' + ALGORITHM_CIPHER + '" "' + password + '"' +
        ' >"' + pathStdout + '"' +
      '; echo 1 >"' + pathDone + '"'];
  }
  try {
    childProc.spawn(shellPath, shellArgs, execOptions);
  } catch (e) {
    res.error = new Error(e.message);
    res.error.method = '_execFileSync - spawn';
    res.error.program = shellPath;
    res.error.args = shellArgs;
  }

  while (fs.readFileSync(pathDone, {encoding: options.encoding}).trim() !== '1') {}
  if ((exitCode =
      fs.readFileSync(pathExit, {encoding: options.encoding}).trim()) === '0') {
    res.input =
      decipher.update(fs.readFileSync(pathStdout, {encoding: 'binary'}),
        'hex', options.encoding) +
      decipher.final(options.encoding);
  } else {
    res.error = new Error(DEFAULT_ERR_MSG);
    res.error.method = '_execFileSync';
    res.error.program = shellPath;
    res.error.args = shellArgs;
    res.error.extMessage =
      fs.readFileSync(pathStderr, {encoding: options.encoding}).trim();
    res.error.exitCode = +exitCode;
  }

  fs.unlinkSync(pathStdout);
  fs.unlinkSync(pathStderr);
  fs.unlinkSync(pathExit);
  fs.unlinkSync(pathDone);

  return res;
}

function getHostArgs(options) {
  // To send any text to crazy Windows shell safely.
  function encodeDOS(arg) {
    return arg.replace(/[^\w\u0080-\uFFFF]/g, function(chr) {
      return '#' + chr.charCodeAt(0) + ';';
    });
  }

  return extHostArgs.concat((function(conf) {
    var args = [], key;
    for (key in conf) {
      if (conf.hasOwnProperty(key)) {
        if (conf[key] === 'boolean') {
          if (options[key]) { args.push('--' + key); }
        } else if (conf[key] === 'string') {
          if (options[key]) {
            args.push('--' + key,
              options.encoded ? encodeDOS(options[key]) : options[key]);
          }
        }
      }
    }
    return args;
  })({
    display:        'string',
    keyIn:          'boolean',
    noEchoBack:     'boolean',
    mask:           'string',
    limit:          'string',
    caseSensitive:  'boolean',
    encoded:        'boolean'   // added by readlineExt, _execFileSync
  }));
}

function margeOptions() {
  var optsHashes = Array.prototype.slice.call(arguments),
    options = {};
  return options;
}

function flattenArray(array, validate) {
  var flatArray = [];
  function parseArray(array) {
/* jshint eqnull:true */
    if (array == null) { return; }
/* jshint eqnull:false */
    else if (Array.isArray(array)) { array.forEach(parseArray); }
    else if (!validate || validate(array)) { flatArray.push(array); }
  }
  parseArray(array);
  return flatArray;
}

// for dev
exports._useExtSet = function(use) { useExt = use; };

exports.setPrint = function(fnc) { defaultOptions.print = fnc; };

exports.setPrompt = function(newPrompt) {
/* jshint eqnull:true */
  if (newPrompt != null) {
/* jshint eqnull:false */
    defaultOptions.prompt = newPrompt;
  }
  return defaultOptions.prompt;
};

exports.setEncoding = function(newEncoding) {
  if (typeof newEncoding === 'string') {
    defaultOptions.encoding = newEncoding;
  }
  return defaultOptions.encoding;
};

exports.setMask = function(newMask) {
  if (typeof newMask === 'string') {
    defaultOptions.mask = newMask;
  }
  return defaultOptions.mask;
};

exports.setBufferSize = function(newBufSize) {
  newBufSize = parseInt(newBufSize, 10);
  if (!isNaN(newBufSize) && typeof newBufSize === 'number') {
    defaultOptions.bufSize = newBufSize;
  }
  return defaultOptions.bufSize;
};

exports.prompt = function(options) {
  var readOptions = {
      display:        defaultOptions.prompt + '',
      keyIn:          false,
      noEchoBack:     !!(options && options.noEchoBack),
      mask:           defaultOptions.mask,
      limit:          '',
      caseSensitive:  !!(options && options.caseSensitive),
      noTrim:         !!(options && options.noTrim)
    };
  return readlineSync(readOptions);
};

exports.question = function(query, options) {
  var readOptions = {
/* jshint eqnull:true */
      display:        query != null ? query + '' : '',
/* jshint eqnull:false */
      keyIn:          false,
      noEchoBack:     !!(options && options.noEchoBack),
      mask:           defaultOptions.mask,
      limit:          '',
      caseSensitive:  !!(options && options.caseSensitive),
      noTrim:         !!(options && options.noTrim)
    };
  return readlineSync(readOptions);
};

exports.keyIn = function(query, options) {
  var limit = options ?
      flattenArray(options.limit, function(value)
        { return typeof value === 'string' || typeof value === 'number'; })
      .join('').replace(/\n/g, '').replace(/[^A-Za-z0-9_ ]/g, '\\$&') : '',
    readOptions = {
/* jshint eqnull:true */
      display:        query != null ? query + '' : '',
/* jshint eqnull:false */
      keyIn:          true,
      noEchoBack:     !!(options && options.noEchoBack),
      mask:           defaultOptions.mask,
      limit:          limit,
      caseSensitive:  !!(options && options.caseSensitive),
      noTrim:         true
    };
  return readlineSync(readOptions);
};
