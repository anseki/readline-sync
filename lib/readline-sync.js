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
  pathUtil = require('path'),

  defaultOptions = {
    prompt:             '> ',
    hideEchoBack:       false,
    mask:               '*',
    limit:              [],
    limitMessage:       'Input another, please.${( [)limit(])}',
    defaultInput:       '',
    trueValue:          [],
    falseValue:         [],
    caseSensitive:      false,
    keepWhitespace:     false,
    encoding:           'utf8',
    bufferSize:         1024,
    print:              void 0,
    history:            true,
    cd:                 false,
    phContent:          void 0,
    preCheck:           void 0
  },

  fdR = 'none', fdW, ttyR, isRawMode = false,
  extHostPath, extHostArgs, tempdir, salt = 0,
  lastInput = '', inputHistory = [],
  _DBG_useExt = false, _DBG_checkOptions = false, _DBG_checkMethod = false;

/*
  display:            string
  displayOnly:        boolean
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

    function getVerNum(ver) {
      var nums = ver.replace(/^\D+/, '').split('.');
      var verNum = 0;
      if ((nums[0] = +nums[0])) { verNum += nums[0] * 10000; }
      if ((nums[1] = +nums[1])) { verNum += nums[1] * 100; }
      if ((nums[2] = +nums[2])) { verNum += nums[2]; }
      return verNum;
    }

    if (typeof fdR !== 'string') { return; }
    fdR = null;

    if (IS_WIN) {
      // iojs-v2.3.2+ input stream can't read first line. (#18)
      // ** Don't get process.stdin before check! **
      if (getVerNum(process.version) < 20302 && process.stdin.isTTY) {
        process.stdin.pause();
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
        process.stdin.pause();
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
    if (options.displayOnly) { return; }

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

      if (chunk && typeof(line = (chunk.match(/^(.*?)[\r\n]/) || [])[1]) === 'string') {
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

  if (options.print && !silent) {
    options.print(displaySave + (options.displayOnly ? '' :
        (options.hideEchoBack ? (new Array(input.length + 1)).join(options.mask)
          : input) + '\n'), // must at least write '\n'
      options.encoding);
  }

  return options.displayOnly ? '' :
    (lastInput = options.keepWhitespace || options.keyIn ? input : input.trim());
}

function readlineExt(options) {
  var hostArgs, res = {}, extMessage,
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
      extMessage = e.stderr.trim();
      res.error = new Error(DEFAULT_ERR_MSG + (extMessage ? '\n' + extMessage : ''));
      res.error.method = 'execFileSync';
      res.error.program = extHostPath;
      res.error.args = hostArgs;
      res.error.extMessage = extMessage;
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
    var filepath, suffix = '', fd;
    tempdir = tempdir || require('os').tmpdir();

    while (true) {
      filepath = pathUtil.join(tempdir, name + suffix);
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

  var hostArgs, shellPath, shellArgs, res = {}, exitCode, extMessage,
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
    extMessage = fs.readFileSync(pathStderr, {encoding: options.encoding}).trim();
    res.error = new Error(DEFAULT_ERR_MSG + (extMessage ? '\n' + extMessage : ''));
    res.error.method = '_execFileSync';
    res.error.program = shellPath;
    res.error.args = shellArgs;
    res.error.extMessage = extMessage;
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
    displayOnly:    'boolean',
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
                           // _readlineSync <- *    * -> defaultOptions
        // ================ string
        case 'mask':                        // *    *
        case 'limitMessage':                //      *
        case 'defaultInput':                //      *
        case 'encoding':                    // *    *
          /* jshint eqnull:true */
          value = value != null ? value + '' : '';
          /* jshint eqnull:false */
          if (value && optionName !== 'limitMessage')
            { value = value.replace(/[\r\n]/g, ''); }
          options[optionName] = value;
          break;
        // ================ number(int)
        case 'bufferSize':                  // *    *
          if (!isNaN(value = parseInt(value, 10)) && typeof value === 'number')
            { options[optionName] = value; } // limited updating (number is needed)
          break;
        // ================ boolean
        case 'displayOnly':                 // *
        case 'keyIn':                       // *
        case 'hideEchoBack':                // *    *
        case 'caseSensitive':               // *    *
        case 'keepWhitespace':              // *    *
        case 'history':                     //      *
        case 'cd':                          //      *
          options[optionName] = !!value;
          break;
        // ================ array
        case 'limit':                       // *    *     to string for readlineExt
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
        // ================ function
        case 'print':                       // *    *
        case 'phContent':                   //      *
        case 'preCheck':                    //      *
          options[optionName] = typeof value === 'function' ? value : void 0;
          break;
        // ================ other
        case 'prompt':                      //      *
        case 'display':                     // *
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
    return type === 'string' ?
        (caseSensitive ? res === comp : res.toLowerCase() === comp.toLowerCase()) :
      type === 'number' ?  parseFloat(res) === comp :
      type === 'function' ? comp(res) :
      comp instanceof RegExp ? comp.test(res) : false;
  });
}

function replaceHomePath(path, expand) {
  var homePath = pathUtil.normalize(
    IS_WIN ? (process.env.HOMEDRIVE || '') + (process.env.HOMEPATH || '') :
    process.env.HOME || '').replace(/[\/\\]+$/, '');
  path = pathUtil.normalize(path);
  return expand ? path.replace(/^~(?=\/|\\|$)/, homePath) :
    path.replace(new RegExp('^' + homePath.replace(/[^A-Za-z0-9_ ]/g, '\\$&') +
      '(?=\\/|\\\\|$)', IS_WIN ? 'i' : ''), '~');
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
      if (!caseSensitive) { curChar = curChar.toLowerCase(); }
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

function getPhContent(param, options) {
  var text, values, resCharlist = {}, arg;
  if (options.phContent) {
    text = options.phContent(param, options);
  }
  if (typeof text !== 'string') {
    switch (param) {
      case 'hideEchoBack':
      case 'mask':
      case 'defaultInput':
      case 'caseSensitive':
      case 'keepWhitespace':
      case 'encoding':
      case 'bufferSize':
      case 'history':
      case 'cd':
        text = !options.hasOwnProperty(param) ? '' :
          typeof options[param] === 'boolean' ? (options[param] ? 'on' : 'off') :
          options[param] + '';
        break;
      // case 'prompt':
      // case 'query':
      // case 'display':
      //   text = options.hasOwnProperty('displaySrc') ? options.displaySrc + '' : '';
      //   break;
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
        text = options[options.hasOwnProperty('limitSrc') ?
          'limitSrc' : 'limit'].length;
        text = text || param !== 'limitCountNotZero' ? text + '' : '';
        break;
      case 'lastInput':
        text = lastInput;
        break;
      case 'cwd':
      case 'CWD':
      case 'cwdHome':
        text = process.cwd();
        if (param === 'CWD') { text = pathUtil.basename(text); }
        else if (param === 'cwdHome') { text = replaceHomePath(text); }
        break;
      case 'date':
      case 'time':
      case 'localeDate':
      case 'localeTime':
        text = (new Date())['to' +
          param.replace(/^./, function(str) { return str.toUpperCase(); }) +
          'String']();
        break;
      default: // with arg
        if (typeof(arg = (param.match(/^history_m(\d+)$/) || [])[1]) === 'string') {
          text = inputHistory[inputHistory.length - arg] || '';
        }
    }
  }
  return text;
}

function getPhCharlist(param) {
  var matches = /^(.)-(.)$/.exec(param), text = '', from, to, code, step;
  if (!matches) { return; }
  from = matches[1].charCodeAt(0);
  to = matches[2].charCodeAt(0);
  step = from < to ? 1 : -1;
  for (code = from; code !== to + step; code += step)
    { text += String.fromCharCode(code); }
  return text;
}

// cmd "arg" " a r g " "" 'a"r"g' "a""rg" "arg
function parseCl(cl) {
  var reToken = new RegExp(/(\s*)(?:("|')(.*?)(?:\2|$)|(\S+))/g), matches,
    taken = '', args = [], part;
  cl = cl.trim();
  while ((matches = reToken.exec(cl))) {
    part = matches[3] || matches[4] || '';
    if (matches[1]) {
      args.push(taken);
      taken = '';
    }
    taken += part;
  }
  if (taken) { args.push(taken); }
  return args;
}

function toBool(res, options) {
  return (
    (options.trueValue.length &&
      isMatched(res, options.trueValue, options.caseSensitive)) ? true :
    (options.falseValue.length &&
      isMatched(res, options.falseValue, options.caseSensitive)) ? false : res);
}

function getValidLine(options) {
  var res, forceNext, limitMessage,
    matches, histInput, args, resCheck;
  function _getPhContent(param) { return getPhContent(param, options); }
  function addDisplay(text)
    { options.display += (/[^\r\n]$/.test(options.display) ? '\n' : '') + text; }

  options.limitSrc = options.limit;
  options.displaySrc = options.display;
  options.limit = ''; // for readlineExt
  options.display = replacePlaceholder(options.display + '', _getPhContent);

  while (true) {
    res = _readlineSync(options);
    forceNext = false;
    limitMessage = '';

    if (options.defaultInput && !res) { res = options.defaultInput; }

    if (options.history) {
      if ((matches = /^\s*\!(?:\!|-1)(:p)?\s*$/.exec(res))) { // `!!` `!-1` +`:p`
        histInput = inputHistory[0] || '';
        if (matches[1]) { forceNext = true; }  // only display
        else            { res = histInput; }   // replace input
        // Show it even if it is empty (NL only).
        addDisplay(histInput + '\n');
        if (!forceNext) { // Loop may break
          options.displayOnly = true;
          _readlineSync(options);
          options.displayOnly = false;
        }
      } else if (res && res !== inputHistory[inputHistory.length - 1]) {
        inputHistory = [res];
      }
    }

    if (!forceNext && options.cd && res) {
      args = parseCl(res);
      switch (args[0].toLowerCase()) {
        case 'cd':
          if (args[1]) {
            try {
              process.chdir(replaceHomePath(args[1], true));
            } catch (e) {
              addDisplay(e + '');
            }
          }
          forceNext = true;
          break;
        case 'pwd':
          addDisplay(process.cwd());
          forceNext = true;
          break;
      }
    }

    if (!forceNext && options.preCheck) {
      resCheck = options.preCheck(res, options);
      res = resCheck.res;
      if (resCheck.forceNext) { forceNext = true; } // Don't switch to false.
    }

    if (!forceNext) {
      if (!options.limitSrc.length ||
        isMatched(res, options.limitSrc, options.caseSensitive)) { break; }
      if (options.limitMessage)
        { limitMessage = replacePlaceholder(options.limitMessage, _getPhContent); }
    }

    addDisplay((limitMessage ? limitMessage + '\n' : '') +
      replacePlaceholder(options.displaySrc + '', _getPhContent));
  }
  return toBool(res, options);
}

// for dev
exports._DBG_set_useExt = function(val) { _DBG_useExt = val; };
exports._DBG_set_checkOptions = function(val) { _DBG_checkOptions = val; };
exports._DBG_set_checkMethod = function(val) { _DBG_checkMethod = val; };
exports._DBG_clearHistory = function() { lastInput = ''; inputHistory = []; };

// ------------------------------------

exports.setDefaultOptions = function(options) {
  defaultOptions = margeOptions(true, options);
  return margeOptions(true); // copy
};

exports.question = function(query, options) {
  return getValidLine(margeOptions(margeOptions(true, options), {
      display:            query
    }));
};

exports.prompt = function(options) {
  var readOptions = margeOptions(true, options);
  readOptions.display = readOptions.prompt;
  return getValidLine(readOptions);
};

exports.keyIn = function(query, options) {
  var readOptions = margeOptions(margeOptions(true, options), {
      display:            query,
      keyIn:              true,
      keepWhitespace:     true
    });

  // char list
  readOptions.limitSrc = readOptions.limit.filter(function(value) {
      var type = typeof value;
      return type === 'string' || type === 'number';
    })
    .map(function(text) { return replacePlaceholder(text + '', getPhCharlist); });
  // pattern
  readOptions.limit = readOptions.limitSrc.join('').replace(/[^A-Za-z0-9_ ]/g, '\\$&');

  ['trueValue', 'falseValue'].forEach(function(optionName) {
    readOptions[optionName] = readOptions[optionName].reduce(function(comps, comp) {
      var type = typeof comp;
      if (type === 'string' || type === 'number') {
        comps = comps.concat((comp + '').split(''));
      } else { comps.push(comp); }
      return comps;
    }, []);
  });

  readOptions.display = replacePlaceholder(readOptions.display + '',
    function(param) { return getPhContent(param, readOptions); });

  return toBool(_readlineSync(readOptions), readOptions);
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
      cd:                 false
    }));
};

exports.questionNewPassword = function(query, options) {
  var readOptions = margeOptions({
      // -------- default
      hideEchoBack:       true,
      mask:               '*',
      limitMessage:       'It can include: ${charlist}\n' +
                            'And the length must be: ${length}',
      trueValue:          null,
      falseValue:         null,
      caseSensitive:      true
    }, options, {
      // -------- forced
      history:            false,
      cd:                 false,
      // limit (by charlist etc.),
      phContent: function(param) {
          return param === 'charlist' ? resCharlist.text :
            param === 'length' ? min + '...' + max : null;
        }
    }),
    // added:     charlist, min, max, confirmMessage, unmatchMessage
    charlist, min, max, confirmMessage, unmatchMessage,
    limit, resCharlist, limitMessage, res1, res2;
  options = options || {};

  charlist = replacePlaceholder(
    options.charlist ? options.charlist + '' : '${!-~}', getPhCharlist);
  if (isNaN(min = parseInt(options.min, 10)) || typeof min !== 'number') { min = 12; }
  if (isNaN(max = parseInt(options.max, 10)) || typeof max !== 'number') { max = 24; }
  limit = new RegExp('^[' + charlist.replace(/[^A-Za-z0-9_ ]/g, '\\$&') +
    ']{' + min + ',' + max + '}$');
  resCharlist = array2charlist([charlist], readOptions.caseSensitive, true);
  resCharlist.text = joinChunks(resCharlist.values, resCharlist.suppressed);

  /* jshint eqnull:true */
  confirmMessage = options.confirmMessage != null ? options.confirmMessage :
    'Reinput a same one to confirm it :';
  unmatchMessage = options.unmatchMessage != null ? options.unmatchMessage :
    'It differs from first one.' +
      ' Hit only the Enter key if you want to retry from first one.';
  /* jshint eqnull:false */

  /* jshint eqnull:true */
  if (query == null) { query = 'Input new password :'; }
  /* jshint eqnull:false */

  limitMessage = readOptions.limitMessage;
  while (!res2) {
    readOptions.limit = limit;
    readOptions.limitMessage = limitMessage;
    res1 = exports.question(query, readOptions);

    readOptions.limit = [res1, ''];
    readOptions.limitMessage = unmatchMessage;
    res2 = exports.question(confirmMessage, readOptions);
  }

  return res1;
};

function _questionNum(query, options, parser) {
  var validValue;
  function getValidValue(value) {
    validValue = parser(value);
    return !isNaN(validValue) && typeof validValue === 'number';
  }
  exports.question(query, margeOptions({
      // -------- default
      limitMessage:       'Input valid number, please.'
    }, options, {
      // -------- forced
      limit:              getValidValue,
      cd:                 false
      // trueValue, falseValue, caseSensitive, keepWhitespace don't work.
    }));
  return validValue;
}
exports.questionInt = function(query, options) {
  return _questionNum(query, options, function(value) { return parseInt(value, 10); });
};
exports.questionFloat = function(query, options) {
  return _questionNum(query, options, parseFloat);
};

exports.questionPath = function(query, options) {
  var readOptions = margeOptions({
      // -------- default
      hideEchoBack:       false,
      limitMessage:       '${error(\n)}Input valid path, please.' +
                            '${( Min:)min}${( Max:)max}',
      history:            true,
      cd:                 true
    }, options, {
      // -------- forced
      keepWhitespace:     false,
      limit: function(value) {
          var exists, stat, res;
          value = replaceHomePath(value, true);
          error = ''; // for validate
          // mkdir -p
          function mkdirParents(dirPath) {
            dirPath.split(/\/|\\/).reduce(function(parents, dir) {
              var path = pathUtil.resolve((parents += dir + pathUtil.sep));
              if (!fs.existsSync(path)) {
                fs.mkdirSync(path);
              } else if (!fs.statSync(path).isDirectory()) {
                throw new Error('Non directory already exists: ' + path);
              }
              return parents;
            }, '');
          }

          try {
            exists = fs.existsSync(value);
            validPath = exists ? fs.realpathSync(value) : pathUtil.resolve(value);
            // options.exists default: true, not-bool: no-check
            if (!options.hasOwnProperty('exists') && !exists ||
                typeof options.exists === 'boolean' && options.exists !== exists) {
              error = (exists ? 'Already exists' : 'No such file or directory') +
                ': ' + validPath;
              return;
            }
            if (!exists && options.create) {
              if (options.isDirectory) {
                mkdirParents(validPath);
              } else {
                mkdirParents(pathUtil.dirname(validPath));
                fs.closeSync(fs.openSync(validPath, 'w')); // touch
              }
              validPath = fs.realpathSync(validPath);
            }
            if (exists && (options.min || options.max ||
                options.isFile || options.isDirectory)) {
              stat = fs.statSync(validPath);
              // type check first (directory has zero size)
              if (options.isFile && !stat.isFile()) {
                error = 'Not file: ' + validPath;
                return;
              } else if (options.isDirectory && !stat.isDirectory()) {
                error = 'Not directory: ' + validPath;
                return;
              } else if (options.min && stat.size < +options.min ||
                  options.max && stat.size > +options.max) {
                error = 'Size ' + stat.size +' is out of range: ' + validPath;
                return;
              }
            }
            if (typeof options.validate === 'function' &&
                (res = options.validate(validPath)) !== true) {
              if (typeof res === 'string') { error = res; }
              return;
            }
          } catch (e) {
            error = e + '';
            return;
          }
          return true;
        },
      // trueValue, falseValue, caseSensitive don't work.
      phContent: function(param) {
          return param === 'error' ? error :
            param !== 'min' && param !== 'max' ? null :
            options.hasOwnProperty(param) ? options[param] + '' : '';
        }
    }),
    // added:     exists, create, min, max, isFile, isDirectory, validate
    validPath, error = '';
  options = options || {};

  /* jshint eqnull:true */
  if (query == null) { query = 'Input path (you can "cd" and "pwd") :'; }
  /* jshint eqnull:false */

  exports.question(query, readOptions);
  return validPath;
};

// props: preCheck, args, hRes, limit
function getClHandler(commandHandler, options) {
  var clHandler = {}, hIndex = {};
  if (typeof commandHandler === 'object') {
    Object.keys(commandHandler).forEach(function(cmd) {
      if (typeof commandHandler[cmd] === 'function') {
        hIndex[options.caseSensitive ? cmd : cmd.toLowerCase()] = commandHandler[cmd];
      }
    });
    clHandler.preCheck = function(res) {
      var cmdKey;
      clHandler.args = parseCl(res);
      cmdKey = clHandler.args[0] || '';
      if (!options.caseSensitive) { cmdKey = cmdKey.toLowerCase(); }
      clHandler.hRes =
        cmdKey !== '_' && hIndex.hasOwnProperty(cmdKey) ?
          hIndex[cmdKey].apply(res, clHandler.args.slice(1)) :
        hIndex.hasOwnProperty('_') ? hIndex._.apply(res, clHandler.args) : null;
      return {res: res, forceNext: false};
    };
    if (!hIndex.hasOwnProperty('_')) {
      clHandler.limit = function() { // It's called after preCheck.
        var cmdKey = clHandler.args[0] || '';
        if (!options.caseSensitive) { cmdKey = cmdKey.toLowerCase(); }
        return hIndex.hasOwnProperty(cmdKey);
      };
    }
  } else {
    clHandler.preCheck = function(res) {
      clHandler.args = parseCl(res);
      clHandler.hRes = typeof commandHandler === 'function' ?
        commandHandler.apply(res, clHandler.args) : true; // true for break loop
      return {res: res, forceNext: false};
    };
  }
  return clHandler;
}

exports.promptCL = function(commandHandler, options) {
  var readOptions = margeOptions({
      // -------- default
      hideEchoBack:       false,
      limitMessage:       'Requested command is not available.',
      caseSensitive:      false,
      history:            true
    }, options),
      // -------- forced
      // trueValue, falseValue, keepWhitespace don't work.
      // preCheck, limit (by clHandler)
    clHandler = getClHandler(commandHandler, readOptions);
  readOptions.limit = clHandler.limit;
  readOptions.preCheck = clHandler.preCheck;
  exports.prompt(readOptions);
  return clHandler.args;
};

exports.promptLoop = function(inputHandler, options) {
  var readOptions = margeOptions({
      // -------- default
      hideEchoBack:       false,
      trueValue:          null,
      falseValue:         null,
      caseSensitive:      false,
      history:            true
    }, options);
  while (true) { if (inputHandler(exports.prompt(readOptions))) { break; } }
  return;
};

exports.promptCLLoop = function(commandHandler, options) {
  var readOptions = margeOptions({
      // -------- default
      hideEchoBack:       false,
      limitMessage:       'Requested command is not available.',
      caseSensitive:      false,
      history:            true
    }, options),
      // -------- forced
      // trueValue, falseValue, keepWhitespace don't work.
      // preCheck, limit (by clHandler)
    clHandler = getClHandler(commandHandler, readOptions);
  readOptions.limit = clHandler.limit;
  readOptions.preCheck = clHandler.preCheck;
  while (true) {
    exports.prompt(readOptions);
    if (clHandler.hRes) { break; }
  }
  return;
};

exports.promptSimShell = function(options) {
  return exports.prompt(margeOptions({
      // -------- default
      hideEchoBack:       false,
      history:            true
    }, options, {
      // -------- forced
      prompt:             (function() {
        return IS_WIN ?
          '${cwd}>' :
          // 'user@host:cwd$ '
          (process.env.USER || '') +
          (process.env.HOSTNAME ?
            '@' + process.env.HOSTNAME.replace(/\..*$/, '') : '') +
          ':${cwdHome}$ ';
      })()
    }));
};

function _keyInYN(query, options, limit) {
  var res;
  /* jshint eqnull:true */
  if (query == null) { query = 'Are you sure? :'; }
  /* jshint eqnull:false */
  if ((!options || options.guide !== false) && (query += ''))
    { query = query.replace(/\s*:?\s*$/, '') + ' [y/n] :'; }
  res = exports.keyIn(query, margeOptions(options, {
      // -------- forced
      hideEchoBack:       false,
      limit:              limit,
      trueValue:          'y',
      falseValue:         'n',
      caseSensitive:      false
      // mask doesn't work.
    }));
    // added:     guide
  return typeof res === 'boolean' ? res : '';
}
exports.keyInYN = function(query, options) { return _keyInYN(query, options); };
exports.keyInYNStrict = function(query, options)
  { return _keyInYN(query, options, 'yn'); };

exports.keyInPause = function(query, options) {
  /* jshint eqnull:true */
  if (query == null) { query = 'Continue...'; }
  /* jshint eqnull:false */
  if ((!options || options.guide !== false) && (query += ''))
    { query = query.replace(/\s+$/, '') + ' (Hit any key)'; }
  exports.keyIn(query, margeOptions({
      // -------- default
      limit:              null
    }, options, {
      // -------- forced
      hideEchoBack:       true,
      mask:               ''
    }));
    // added:     guide
  return;
};

exports.keyInSelect = function(items, query, options) {
  var readOptions = margeOptions({
      // -------- default
      hideEchoBack:       false
    }, options, {
      // -------- forced
      trueValue:          null,
      falseValue:         null,
      caseSensitive:      false
      // limit (by items)
    }),
    // added:     guide, cancel
    keylist = '', key2i = {}, charCode = 49 /* '1' */, display = '\n';
  if (!Array.isArray(items) || !items.length || items.length > 35)
    { throw '`items` must be Array (max length: 35).'; }

  items.forEach(function(item, i) {
    var key = String.fromCharCode(charCode);
    keylist += key;
    key2i[key] = i;
    display += '[' + key + '] ' + item.trim() + '\n';
    charCode = charCode === 57 /* '9' */ ? 97 /* 'a' */ : charCode + 1;
  });
  if (!options || options.cancel !== false) {
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
    if (!options || options.guide !== false)
      { query = query.replace(/\s*:?\s*$/, '') + ' [${limit}] :'; }
    display += query;
  }

  return key2i[exports.keyIn(display, readOptions).toLowerCase()];
};

// ======== DEPRECATED ========
function _setOption(optionName, args) {
  var options;
  if (args.length) { options = {}; options[optionName] = args[0]; }
  return exports.setDefaultOptions(options)[optionName];
}
exports.setPrint = function() { return _setOption('print', arguments); };
exports.setPrompt = function() { return _setOption('prompt', arguments); };
exports.setEncoding = function() { return _setOption('encoding', arguments); };
exports.setMask = function() { return _setOption('mask', arguments); };
exports.setBufferSize = function() { return _setOption('bufferSize', arguments); };
