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
    prompt:             '> ',
    hideEchoBack:       false,
    mask:               '*',
    limit:              [],
    limitMessage:       'Input another, please.${( [)limit(])}',
    caseSensitive:      false,
    keepWhitespace:     false,
    encoding:           'utf8',
    bufferSize:         1024,
    print:              void 0,
    trueValue:          [],
    falseValue:         []
  },

  fdR = 'none', fdW, ttyR, isRawMode = false,
  extHostPath, extHostArgs, tempdir, salt = 0,
  _DBG_useExt = false, _DBG_checkOptions = false, _DBG_checkMethod = false;

/*
  display:            string
  keyIn:              boolean
  hideEchoBack:       boolean
  mask:               string
  limit:              string (pattern)
  caseSensitive:      boolean
  keepWhitespace:     boolean
  encoding, bufferSize, print
*/
function _readlineSync(options) {
  var input = '', displaySave = options.display,
    silent = !options.display &&
      options.keyIn && options.hideEchoBack && !options.mask;

  function tryExt() {
    var res = readlineExt(options);
    if (res.error) { throw res.error; }
    return res.input;
  }

  if (_DBG_checkOptions) { _DBG_checkOptions(options); }

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
      isCooked = !options.hideEchoBack && !options.keyIn,
      buffer, reqSize, readSize, chunk, line;

    // Node v0.10- returns an error if same mode is set.
    function setRawMode(mode) {
      if (mode === isRawMode) { return true; }
      if (ttyR.setRawMode(mode) !== 0) { return false; }
      isRawMode = mode;
      return true;
    }

    if (_DBG_useExt || !ttyR ||
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
    buffer = new Buffer((reqSize = options.keyIn ? 1 : options.bufferSize));

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
          if (!options.hideEchoBack) {
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

  if (options.print && !silent) { // must at least write '\n'
    options.print(displaySave + (options.hideEchoBack ?
      (new Array(input.length + 1)).join(options.mask) : input) + '\n',
      options.encoding);
  }

  return (options.keepWhitespace || options.keyIn ? input : input.trim());
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
    // ScriptPW (Win XP and Server2003) needs TTY stream as STDIN.
    // In this case, If STDIN isn't TTY, an error is thrown.
    execOptions.stdio = [process.stdin];
  }

  if (childProc.execFileSync) {
    hostArgs = getHostArgs(options);
    if (_DBG_checkMethod) { _DBG_checkMethod('execFileSync', hostArgs); }
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

// piping via files (for Node v0.10-)
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
  if (_DBG_checkMethod) { _DBG_checkMethod('_execFileSync', hostArgs); }
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
  // Send any text to crazy Windows shell safely.
  function encodeArg(arg) {
    return arg.replace(/[^\w\u0080-\uFFFF]/g, function(chr) {
      return '#' + chr.charCodeAt(0) + ';';
    });
  }

  return extHostArgs.concat((function(conf) {
    var args = [];
    Object.keys(conf).forEach(function(optionName) {
      if (conf[optionName] === 'boolean') {
        if (options[optionName]) { args.push('--' + optionName); }
      } else if (conf[optionName] === 'string') {
        if (options[optionName]) {
          args.push('--' + optionName, encodeArg(options[optionName]));
        }
      }
    });
    return args;
  })({
    display:        'string',
    keyIn:          'boolean',
    hideEchoBack:   'boolean',
    mask:           'string',
    limit:          'string',
    caseSensitive:  'boolean'
  }));
}

function flattenArray(array, validator) {
  var flatArray = [];
  function _flattenArray(array) {
/* jshint eqnull:true */
    if (array == null) { return; }
/* jshint eqnull:false */
    else if (Array.isArray(array)) { array.forEach(_flattenArray); }
    else if (!validator || validator(array)) { flatArray.push(array); }
  }
  _flattenArray(array);
  return flatArray;
}

// margeOptions(options1, options2 ... )
// margeOptions(true, options1, options2 ... )
//    arg1=true : Start from defaultOptions and pick elements of that.
function margeOptions() {
  var optionsList = Array.prototype.slice.call(arguments),
    optionNames, fromDefault;

  if (optionsList.length && typeof optionsList[0] === 'boolean') {
    fromDefault = optionsList.shift();
    if (fromDefault) {
      optionNames = Object.keys(defaultOptions);
      optionsList.unshift(defaultOptions);
    }
  }

  return optionsList.reduce(function(options, optionsPart) {
/* jshint eqnull:true */
    if (optionsPart == null) { return options; }
/* jshint eqnull:false */

    // ======== DEPRECATED ========
    if (optionsPart.hasOwnProperty('noEchoBack') &&
        !optionsPart.hasOwnProperty('hideEchoBack')) {
      optionsPart.hideEchoBack = optionsPart.noEchoBack;
      delete optionsPart.noEchoBack;
    }
    if (optionsPart.hasOwnProperty('noTrim') &&
        !optionsPart.hasOwnProperty('keepWhitespace')) {
      optionsPart.keepWhitespace = optionsPart.noTrim;
      delete optionsPart.noTrim;
    }
    // ======== /DEPRECATED ========

    if (!fromDefault) { optionNames = Object.keys(optionsPart); }
    optionNames.forEach(function(optionName) {
      var value;
      if (!optionsPart.hasOwnProperty(optionName)) { return; }
      value = optionsPart[optionName];
      switch (optionName) {
                                // _readlineSync    defaultOptions
        // ================ string
        case 'mask':                        // *    *
        case 'encoding':                    // *    *
        case 'limitMessage':                //      *
/* jshint eqnull:true */
          value = value != null ? value + '' : '';
/* jshint eqnull:false */
          if (value && optionName === 'mask' || optionName === 'encoding')
            { value = value.replace(/[\r\n]/g, ''); }
          options[optionName] = value;
          break;
        // ================ number
        case 'bufferSize':                  // *    *
          if (!isNaN(value = parseInt(value, 10)) && typeof value === 'number')
            { options[optionName] = value; } // limited updating (number is needed)
          break;
        // ================ boolean
        case 'hideEchoBack':                // *    *
        case 'caseSensitive':               // *    *
        case 'keepWhitespace':              // *    *
        case 'keyIn':                       // *
          options[optionName] = !!value;
          break;
        // ================ function
        case 'print':                       // *    *
          options[optionName] = typeof value === 'function' ? value : void 0;
          break;
        // ================ array
        case 'limit':                       // *    *     readlineExt
        case 'trueValue':                   //      *
        case 'falseValue':                  //      *
          options[optionName] = flattenArray(value, function(value) {
              var type = typeof value;
              return type === 'string' || type === 'number' ||
                type === 'function' || value instanceof RegExp;
            }).map(function(value) {
              return typeof value === 'string' ? value.replace(/[\r\n]/g, '') : value;
            });
          break;
        // ================ other
        case 'prompt':                      //      *
        case 'display':                     // *          readlineExt
/* jshint eqnull:true */
          options[optionName] = value != null ? value : '';
/* jshint eqnull:false */
          break;
      }
    });
    return options;
  }, {});
}

function isMatched(res, comps, caseSensitive) {
  return comps.some(function(comp) {
    var type = typeof comp;
    if (type === 'number') { comp += ''; }
    return (type === 'string' ?
        (caseSensitive ? res === comp : res.toLowerCase() === comp.toLowerCase()) :
      type === 'function' ? comp(res) :
      comp instanceof RegExp ? comp.test(res) : false);
  });
}

function replacePlaceholder(text, generator) {
  return text.replace(/(\$)?(\$\{(?:\(([\s\S]*?)\))?(\w+|.-.)(?:\(([\s\S]*?)\))?\})/g,
    function(str, escape, placeholder, pre, param, post) {
      var text;
      return escape || typeof(text = generator(param)) !== 'string' ? placeholder :
        text ? (pre || '') + text + (post || '') : '';
    });
}

function array2charlist(array, caseSensitive, collectSymbols) {
  var values, group = [], groupClass = -1, charCode = 0, symbols = '', suppressed;
  function addGroup(groups, group) {
    if (group.length > 3) { // ellipsis
      groups.push(group[0] + '...' + group[group.length - 1]);
      suppressed = true;
    } else if (group.length) {
      groups = groups.concat(group);
    }
    return groups;
  }

  values = array.reduce(function(chars, value)
      { return chars.concat((value + '').split('')); }, [])
    .reduce(function(groups, curChar) {
      var curGroupClass, curCharCode;
      if (!caseSensitive) { curChar = curChar.toUpperCase(); }
      curGroupClass = /^\d$/.test(curChar) ? 1 :
        /^[A-Z]$/.test(curChar) ? 2 : /^[a-z]$/.test(curChar) ? 3 : 0;
      if (collectSymbols && curGroupClass === 0) {
        symbols += curChar;
      } else {
        curCharCode = curChar.charCodeAt(0);
        if (curGroupClass && curGroupClass === groupClass &&
            curCharCode === charCode + 1) {
          group.push(curChar);
        } else {
          groups = addGroup(groups, group);
          group = [curChar];
          groupClass = curGroupClass;
        }
        charCode = curCharCode;
      }
      return groups;
    }, []);
  values = addGroup(values, group); // last group
  if (symbols) { values.push(symbols); suppressed = true; }
  return {values: values, suppressed: suppressed};
}

function joinChunks(chunks, suppressed)
  { return chunks.join(chunks.length > 2 ? ', ' : suppressed ? ' / ' : '/'); }

function placeholderInMessage(param, options) {
  var text, values, resCharlist = {};
  switch (param) {
    case 'hideEchoBack':
    case 'mask':
    case 'caseSensitive':
    case 'keepWhitespace':
    case 'encoding':
    case 'bufferSize':
    case 'input':
      text = options.hasOwnProperty(param) ? options[param] + '' : '';
      break;
    case 'prompt':
    case 'query':
    case 'display':
      text = options.displaySrc + '';
      break;
    case 'limit':
    case 'trueValue':
    case 'falseValue':
      values = options[options.hasOwnProperty(param + 'Src') ? param + 'Src' : param];
      if (options.keyIn) { // suppress
        resCharlist = array2charlist(values, options.caseSensitive);
        values = resCharlist.values;
      } else {
        values = values.filter(function(value) {
          var type = typeof value;
          return type === 'string' || type === 'number';
        });
      }
      text = joinChunks(values, resCharlist.suppressed);
      break;
    case 'limitCount':
    case 'limitCountNotZero':
      text = options[options.hasOwnProperty('limitSrc') ? 'limitSrc' : 'limit'].length;
      text = (text ? text : param === 'limitCountNotZero' ? '' : text) + '';
      break;
  }
  return text;
}

function placeholderCharlist(param) {
  var matches = /^(.)-(.)$/.exec(param), text = '', from, to, code, step;
  if (!matches) { return; }
  from = matches[1].charCodeAt(0);
  to = matches[2].charCodeAt(0);
  step = from < to ? 1 : -1;
  for (code = from; code !== to + step; code += step)
    { text += String.fromCharCode(code); }
  return text;
}

function readlineWithOptions(options) {
  var res,
    generator = function(param) { return placeholderInMessage(param, options); };
  options.limitSrc = options.limit;
  options.displaySrc = options.display;
  options.limit = ''; // for readlineExt
  options.display = replacePlaceholder(options.display + '', generator);
  while (true) {
    res = _readlineSync(options);
    if (!options.limitSrc.length ||
      isMatched(res, options.limitSrc, options.caseSensitive)) { break; }
    options.input = res; // for placeholder
    options.display += (options.display ? '\n' : '') +
      (options.limitMessage ?
        replacePlaceholder(options.limitMessage, generator) + '\n' : '') +
      replacePlaceholder(options.displaySrc + '', generator);
  }
  return res;
}

function toBool(res, options) {
  return (
    (options.trueValue.length &&
      isMatched(res, options.trueValue, options.caseSensitive)) ? true :
    (options.falseValue.length &&
      isMatched(res, options.falseValue, options.caseSensitive)) ? false : res);
}

// for dev
exports._DBG_set_useExt = function(val) { _DBG_useExt = val; };
exports._DBG_set_checkOptions = function(val) { _DBG_checkOptions = val; };
exports._DBG_set_checkMethod = function(val) { _DBG_checkMethod = val; };

exports.setDefault = function(options) {
  defaultOptions = margeOptions(true, options);
  return margeOptions(true); // copy
};

exports.prompt = function(options) {
  var readOptions = margeOptions(true, options), res;
  readOptions.display = readOptions.prompt;
  res = readlineWithOptions(readOptions);
  return toBool(res, readOptions);
};

exports.question = function(query, options) {
  var readOptions = margeOptions(margeOptions(true, options), {
      display:            query
    }),
    res = readlineWithOptions(readOptions);
  return toBool(res, readOptions);
};

exports.keyIn = function(query, options) {
  var readOptions = margeOptions(margeOptions(true, options), {
      display:            query,
      keyIn:              true,
      keepWhitespace:     true
    }), res;

  // char list
  readOptions.limitSrc = readOptions.limit.filter(function(value) {
      var type = typeof value;
      return type === 'string' || type === 'number';
    })
    .map(function(text) { return replacePlaceholder(text + '', placeholderCharlist); });
  // pattern
  readOptions.limit = readOptions.limitSrc.join('').replace(/[^A-Za-z0-9_ ]/g, '\\$&');

  ['trueValue', 'falseValue'].forEach(function(optionName) {
    var comps = [];
    readOptions[optionName].forEach(function(comp) {
      var type = typeof comp;
      if (type === 'string' || type === 'number') {
        comps = comps.concat((comp + '').split(''));
      } else if (comp instanceof RegExp) {
        comps.push(comp);
      }
    });
    readOptions[optionName] = comps;
  });

  readOptions.display = replacePlaceholder(readOptions.display + '',
    function(param) { return placeholderInMessage(param, readOptions); });

  res = _readlineSync(readOptions);
  return toBool(res, readOptions);
};

// ------------------------------------

exports.questionEMail = function(query, options) {
/* jshint eqnull:true */
  if (query == null) { query = 'Input e-mail address :'; }
/* jshint eqnull:false */
  return exports.question(query, margeOptions({
      // -------- default
      hideEchoBack:       false,
      // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address
      limit:              /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      limitMessage:       'Input valid e-mail address, please.',
      trueValue:          null,
      falseValue:         null
    }, options, {
      // -------- forced
      keepWhitespace:     false,
    }));
};

exports.questionNewPassword = function(query, options) {
  var readOptions = margeOptions({
      // -------- default
      hideEchoBack:       true,
      mask:               '*',
      limitMessage:       'It can include: ${charlist}, the length able to be: ${length}',
      caseSensitive:      true,
      trueValue:          null,
      falseValue:         null,
      confirm:            'Reinput same one to confirm it :'
    }, options, {/* forced limit */}),
    // added: charlist, min, max, confirm
    charlist, min, max, resCharlist, res1, res2, limit1, limitMessage1;

/* jshint eqnull:true */
  if (query == null) { query = 'Input new password :'; }
/* jshint eqnull:false */

  charlist = options && options.charlist ? options.charlist + '' : '${!-~}';
  charlist = replacePlaceholder(charlist, placeholderCharlist);
  if (options) { min = options.min; max = options.max; }
  if (isNaN(min = parseInt(min, 10)) || typeof min !== 'number') { min = 12; }
  if (isNaN(max = parseInt(max, 10)) || typeof max !== 'number') { max = 24; }
  limit1 = new RegExp(
    '^[' + charlist.replace(/[^A-Za-z0-9_ ]/g, '\\$&') + ']{' + min + ',' + max + '}$');

  if (readOptions.limitMessage) {
    resCharlist = array2charlist([charlist], readOptions.caseSensitive, true);
    resCharlist.text = joinChunks(resCharlist.values, resCharlist.suppressed);
    limitMessage1 = replacePlaceholder(readOptions.limitMessage,
      function(param) {
        return param === 'charlist' ? resCharlist.text :
          param === 'length' ? min + '...' + max : null;
      });
  }

  while (!res2) {
    readOptions.limit = limit1;
    readOptions.limitMessage = limitMessage1;
    res1 = exports.question(query, readOptions);

    readOptions.limit = [res1, ''];
    readOptions.limitMessage = 'Two passwords don\'t match.' +
      ' Hit only Enter key if you want to retry from first password.';
    res2 = exports.question(options.confirm, readOptions);
  }

  return res1;
};

function _keyInYN(query, options, limit) {
  var readOptions = margeOptions(options, {
      // -------- forced
      hideEchoBack:       false,
      limit:              limit,
      caseSensitive:      false,
      trueValue:          'y',
      falseValue:         'n'
    }), res;

/* jshint eqnull:true */
  if (query == null) { query = 'Are you sure? :'; }
/* jshint eqnull:false */
  if ((query += '') && options.keyGuide !== false)
    { query = query.replace(/\s*:?\s*$/, '') + ' [Y/N] :'; }

  res = exports.keyIn(query, readOptions);
  if (typeof res !== 'boolean') { res = ''; }
  return res;
}
exports.keyInYN = function(query, options) { return _keyInYN(query, options); };
exports.keyInYNStrict = function(query, options)
  { return _keyInYN(query, options, 'yn'); };

exports.keyInPause = function(query, options) {
  var readOptions = margeOptions(options, {
      // -------- forced
      hideEchoBack:       true,
      mask:               ''
    });

/* jshint eqnull:true */
  if (query == null) { query = 'Continue...'; }
/* jshint eqnull:false */
  if ((query += '') && options.keyGuide !== false)
    { query = query.replace(/\s+$/, '') + ' (Hit any key)'; }

  exports.keyIn(query, readOptions);
  return;
};

exports.keyInSelect = function(query, items, options) {
  var readOptions = margeOptions({
      // -------- default
      hideEchoBack:       false,
    }, options, {
      // -------- forced
      caseSensitive:      false,
      trueValue:          null,
      falseValue:         null
    }), res, keylist = '', key2i = {}, charCode = 49 /* '1' */, display = '\n';
  if (!Array.isArray(items) || items.length > 35)
    { throw '`items` must be Array (max length: 35).'; }

  items.forEach(function(item, i) {
    var key = String.fromCharCode(charCode);
    keylist += key;
    key2i[key] = i;
    display += '[' + key + '] ' + item.trim() + '\n';
    charCode = charCode === 57 /* '9' */ ? 65 /* 'A' */ : charCode + 1;
  });
  if (options.cancel !== false) {
    keylist += '0';
    key2i['0'] = -1;
    display += '[' + '0' + '] CANCEL\n';
  }
  readOptions.limit = keylist;
  display += '\n';

/* jshint eqnull:true */
  if (query == null) { query = 'Choose one from list :'; }
/* jshint eqnull:false */
  if ((query += '')) {
    if (options.keyGuide !== false)
      { query = query.replace(/\s*:?\s*$/, '') + ' [${limit}] :'; }
    display += query;
  }

  res = exports.keyIn(display, readOptions);
  return key2i[res.toUpperCase()];
};

// ======== DEPRECATED ========
function _setOption(optionName, args) {
  var options;
  if (args.length) { options = {}; options[optionName] = args[0]; }
  return exports.setDefault(options)[optionName];
}
exports.setPrint = function() { return _setOption('print', arguments); };
exports.setPrompt = function() { return _setOption('prompt', arguments); };
exports.setEncoding = function() { return _setOption('encoding', arguments); };
exports.setMask = function() { return _setOption('mask', arguments); };
exports.setBufferSize = function() { return _setOption('bufferSize', arguments); };
