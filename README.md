# readlineSync

Synchronous [Readline](http://nodejs.org/api/readline.html) for interactively running to have a conversation with the user via a console(TTY).

readlineSync tries to let your script have a conversation with the user via a console, even when the input/output stream is redirected like `your-script <foo.dat >bar.log`.

<table>
<tr><td><a href="#basic_options">Basic Options</a></td><td><a href="#utility_methods">Utility Methods</a></td><td><a href="#placeholders">Placeholders</a></td></tr>
</table>

* Some simple cases:

```js
var readlineSync = require('readline-sync');

// Wait for user's response.
var userName = readlineSync.question('May I have your name? :');
console.log('Hi ' + userName + '!');

// Handle the secret text.
var favFood = readlineSync.question('What is your favorite food? :', {
  hideEchoBack: true
});
console.log('Oh, ' + userName + ' loves ' + favFood + '!');
```

```console
May I have your name? :CookieMonster
Hi CookieMonster!
What is your favorite food? :****
Oh, CookieMonster loves tofu!
```

* Enter key is not necessary:

```js
var readlineSync = require('readline-sync');
if (readlineSync.keyInYN('Do you want this module?')) {
  // 'Y' key was pressed.
  console.log('Installing now...');
} else {
  console.log('Searching another...');
}
```

* Let the user choose an item from a list:

```js
var readlineSync = require('readline-sync'),
  animals = ['Lion', 'Elephant', 'Crocodile', 'Giraffe', 'Hippo'],
  index = readlineSync.keyInSelect(animals, 'Which animal?');
console.log('Ok, ' + animals[index] + ' goes to your room.');
```

```console
[1] Lion
[2] Elephant
[3] Crocodile
[4] Giraffe
[5] Hippo
[0] CANCEL

Which animal? [1...5 / 0] :2
Ok, Elephant goes to your room.
```

* A UI like the Range Slider:  
(Press `Z` or `X` key to change a value, and Space Bar to exit)

```js
var readlineSync = require('readline-sync'),
  MAX = 60, MIN = 0, value = 30, key;
console.log('\n\n' + (new Array(20)).join(' ') +
  '[Z] <- -> [X]  FIX: [SPACE]\n');
while (true) {
  console.log('\x1B[1A\x1B[K|' +
    (new Array(value + 1)).join('-') + 'O' +
    (new Array(MAX - value + 1)).join('-') + '| ' + value);
  key = readlineSync.keyIn('',
    {hideEchoBack: true, mask: '', limit: 'zx '});
  if (key === 'z') { if (value > MIN) { value--; } }
  else if (key === 'x') { if (value < MAX) { value++; } }
  else { break; }
}
console.log('\nA value the user requested: ' + value);
```

```console
                   [Z] <- -> [X]  FIX: [SPACE]
|---------------------------------------------------O---------| 51

A value the user requested: 51
```

## Installation<a name="installation">&nbsp;</a>

```shell
npm install readline-sync
```

## Basic Methods<a name="basic_methods">&nbsp;</a>

These are used to control details of the behavior. It is recommended to use the [Utility Methods](#utility_methods) instead of Basic Methods if it satisfy your request.

### `question`<a name="basic_methods-question">&nbsp;</a>

```js
answer = readlineSync.question([query[, options]])
```

Display a `query` to the user if it's specified, and then return the input from the user after it has been typed and an Enter key was pressed.  
You can specify an `options` (see [Basic Options](#basic_options)) to control the behavior (e.g. refusing unexpected input, avoiding trimming white spaces, etc.). **If you let the user input the secret text (e.g. password), you should consider [`hideEchoBack`](#basic_options-hideechoback) option.**

The `query` may be string, or may not be (e.g. number, Date, Object, etc.). It is converted to string (i.e. `toString` method is called) before it is displayed.  
It can include the [placeholders](#placeholders).

For example:

```js
program = readlineSync.question('Which program starts do you want? :', {
  defaultInput: 'firefox'
});
```

### `prompt`<a name="basic_methods-prompt">&nbsp;</a>

```js
input = readlineSync.prompt([options])
```

Display a prompt-sign (see [`prompt`](#basic_options-prompt) option) to the user, and then return the input from the user after it has been typed and an Enter key was pressed.  
You can specify an `options` (see [Basic Options](#basic_options)) to control the behavior (e.g. refusing unexpected input, avoiding trimming white spaces, etc.).

For example:

```js
while (true) {
  command = readlineSync.prompt();
  // Do something...
}
```

### `keyIn`<a name="basic_methods-keyin">&nbsp;</a>

```js
pressedKey = readlineSync.keyIn([query[, options]])
```

Display a `query` to the user if it's specified, and then return a character as a key immediately it was pressed by the user, **without pressing an Enter key**. Note that the user has no chance to change the input.  
You can specify an `options` (see [Basic Options](#basic_options)) to control the behavior (e.g. ignoring keys except some keys, checking target key, etc.).

The `query` is handled the same as that of the [`question`](#basic_methods-question) method.

For example:

```js
menuId = readlineSync.keyIn('Hit 1...5 key :', {limit: '${1-5}'});
```

### `setDefaultOptions`<a name="basic_methods-setdefaultoptions">&nbsp;</a>

```js
currentDefaultOptions = readlineSync.setDefaultOptions([newDefaultOptions])
```

Change the [Default Options](#basic_options) to the values of properties of `newDefaultOptions` Object.  
All it takes is to specify options that you want change, because unspecified options are not updated.

## Basic Options<a name="basic_options">&nbsp;</a>

An `options` Object can be specified to the methods to control the behavior of readlineSync. The options that were not specified to the methods are got from the Default Options. You can change the Default Options by [`setDefaultOptions`](#basic_methods-setdefaultoptions) method anytime, and it is kept until a current process is exited.  
Specify the options that are often used to the Default Options, and specify temporary options to the methods.

For example:

```js
readlineSync.setDefaultOptions({limit: ['green', 'yellow', 'red']});
a1 = readlineSync.question('Which color of signal? :'); // Input is limited to 3 things.
a2 = readlineSync.question('Which color of signal? :'); // It's limited yet.
a3 = readlineSync.question('What is your favorite color? :', {limit: null}); // It's unlimited temporarily.
a4 = readlineSync.question('Which color of signal? :'); // It's limited again.
readlineSync.setDefaultOptions({limit: ['beef', 'chicken']});
a5 = readlineSync.question('Beef or Chicken? :');        // Input is limited to new 2 things.
a6 = readlineSync.question('And you? :');                // It's limited to 2 things yet.
```

The Object as `options` can have following properties.

### `prompt`<a name="basic_options-prompt">&nbsp;</a>

_For `prompt*` methods only_  
*Type:* string or others  
*Default:* `'> '`

Set the prompt-sign that is displayed to the user by `prompt*` methods. For example you see `> ` that is Node's prompt-sign when you run `node` on the command line.  
This may be string, or may not be (e.g. number, Date, Object, etc.). It is converted to string every time (i.e. `toString` method is called) before it is displayed.  
It can include the [placeholders](#placeholders).

For example:

```js
readlineSync.setDefaultOptions({prompt: '$ '});
```

```js
// Display the memory usage always.
readlineSync.setDefaultOptions({
  prompt: { // Simple Object that has toString method.
    toString: function() {
      var rss = process.memoryUsage().rss;
      return '[' + (rss > 1024 ? Math.round(rss / 1024) + 'k' : rss) + 'b]$ ';
    }
  }
});
```

### `hideEchoBack`<a name="basic_options-hideechoback">&nbsp;</a>

*Type:* boolean  
*Default:* `false`

If `true` is specified, hide the secret text (e.g. password) which is typed by user on screen by the mask characters (see [`mask`](#basic_options-mask) option).

For example:

```js
password = readlineSync.question('PASSWORD :', {hideEchoBack: true});
console.log('Login ...');
```

```console
PASSWORD :********
Login ...
```

### `mask`<a name="basic_options-mask">&nbsp;</a>

*Type:* string  
*Default:* `'*'`

Set the mask characters that are shown instead of the secret text (e.g. password) when `true` is specified to [`hideEchoBack`](#basic_options-hideechoback) option. If you want to show nothing, specify `''`. (But it might be not user friendly in some cases.)  
*Note:* In some cases (e.g. when the input stream is redirected on Windows XP), `'*'` or `''` might be used whether other one is specified.

For example:

```js
secret = readlineSync.question('Please whisper sweet words :', {
  hideEchoBack: true,
  mask: require('chalk').magenta('\u2665')
});
```

![sample](cl_02.png)

### `limit`<a name="basic_options-limit">&nbsp;</a>

Limit the user's input.  
The usage differ depending on the method.

#### For `question*` and `prompt*` methods<a name="basic_options-limit-for_question_and_prompt_methods">&nbsp;</a>

*Type:* string, number, RegExp, function or Array  
*Default:* `[]`

Accept only the input that matches value that is specified to this. If the user input others, display a string that is specified to [`limitMessage`](#basic_options-limitmessage) option, and wait for reinput.

* The string is compared with the input. It is affected by [`caseSensitive`](#basic_options-casesensitive) option.
* The number is compared with the input that is converted to number by `parseFloat()`. For example, it interprets `'   3.14   '`, `'003.1400'`, `'314e-2'` and `'3.14PI'` as `3.14`. And it interprets `'005'`, `'5files'`, `'5kb'` and `'5px'` as `5`.
* The RegExp tests the input.
* The function that returns boolean to indicate whether it matches is called with the input.

One of above or an Array that includes multiple things (or Array includes Array) can be specified.

For example:

```js
command = readlineSync.prompt({limit: ['add', 'remove', /^clear( all)?$/]});
// ** But `promptCL` method should be used instead of this. **
```

```js
file = readlineSync.question('Text File :', {limit: /\.txt$/i});
// ** But `questionPath` method should be used instead of this. **
```

```js
ip = readlineSync.question('IP Address :', {limit: function(input) {
  return require('net').isIP(input); // Valid IP Address
}});
```

```js
availableActions = [];
if (!blockExists())  { availableActions.push('jump'); }
if (isLarge(place))  { availableActions.push('run'); }
if (isNew(shoes))    { availableActions.push('kick'); }
if (isNearby(enemy)) { availableActions.push('punch'); }
action = readlineSync.prompt({limit: availableActions});
// ** But `promptCL` method should be used instead of this. **
```

#### For `keyIn*` method<a name="basic_options-limit-for_keyin_method">&nbsp;</a>

*Type:* string, number or Array  
*Default:* `[]`

Accept only the key that matches value that is specified to this, ignore others.  
Specify the characters as the key. All strings or Array of those are decomposed into single characters. For example, `'abcde'` or `['a', 'bc', ['d', 'e']]` are the same as `['a', 'b', 'c', 'd', 'e']`.  
These strings are compared with the input. It is affected by [`caseSensitive`](#basic_options-casesensitive) option.

The [placeholders](#placeholders) like `'${a-e}'` are replaced to an Array that is the character list like `['a', 'b', 'c', 'd', 'e']`.

For example:

```js
direction = readlineSync.keyIn('Left or Right? :', {limit: 'lr'}); // 'l' or 'r'
```

```js
dice = readlineSync.keyIn('Roll the dice, What will the result be? :',
  {limit: '${1-6}'}); // range of '1' to '6'
```

### `limitMessage`<a name="basic_options-limitmessage">&nbsp;</a>

_For `question*` and `prompt*` methods only_  
*Type:* string  
*Default:* `'Input another, please.${( [)limit(])}'`

Display this to the user when the [`limit`](#basic_options-limit) option is specified and the user input others.  
The [placeholders](#placeholders) can be included.

For example:

```js
file = readlineSync.question('Name of Text File :', {
  limit: /\.txt$/i,
  limitMessage: 'Sorry, ${lastInput} is not text file.'
});
```

### `defaultInput`<a name="basic_options-defaultinput">&nbsp;</a>

_For `question*` and `prompt*` methods only_  
*Type:* string  
*Default:* `''`

If the user input empty text (i.e. pressed an Enter key only), return this.

For example:

```js
lang = readlineSync.question('Which language? :', {defaultInput: 'javascript'});
```

### `trueValue`, `falseValue`<a name="basic_options-truevalue_falsevalue">&nbsp;</a>

*Type:* string, number, RegExp, function or Array  
*Default:* `[]`

If the input matches `trueValue`, return `true`. If the input matches `falseValue`, return `false`. In any other case, return the input.

* The string is compared with the input. It is affected by [`caseSensitive`](#basic_options-casesensitive) option.
* The number is compared with the input that is converted to number by `parseFloat()`. For example, it interprets `'   3.14   '`, `'003.1400'`, `'314e-2'` and `'3.14PI'` as `3.14`. And it interprets `'005'`, `'5files'`, `'5kb'` and `'5px'` as `5`. Note that in `keyIn*` method, the input is every time one character (i.e. the number that is specified must be an integer within the range of `0` to `9`).
* The RegExp tests the input.
* The function that returns boolean to indicate whether it matches is called with the input.

One of above or an Array that includes multiple things (or Array includes Array) can be specified.

For example:

```js
answer = readlineSync.question('How do you like it? :', {
  trueValue: ['yes', 'yeah', 'yep'],
  falseValue: ['no', 'nah', 'nope']
});
if (answer === true) {
  console.log('Let\'s go!');
} else if (answer === false) {
  console.log('Oh... It\'s ok...');
} else {
  console.log('Sorry. What does "' + answer + '" you said mean?');
}
```

### `caseSensitive`<a name="basic_options-casesensitive">&nbsp;</a>

*Type:* boolean  
*Default:* `false`

By default, the string comparisons is case-insensitive (i.e. `a` equals `A`). If `true` is specified, it is case-sensitive, the cases are not ignored (i.e. `a` is different from `A`).  
It affects: [`limit`](#basic_options-limit), [`trueValue`](#basic_options-truevalue_falsevalue), [`falseValue`](#basic_options-truevalue_falsevalue), some [placeholders](#placeholders), and some [Utility Methods](#utility_methods).

### `keepWhitespace`<a name="basic_options-keepwhitespace">&nbsp;</a>

_For `question*` and `prompt*` methods only_  
*Type:* boolean  
*Default:* `false`

By default, remove the leading and trailing white spaces from the input text. If `true` is specified, don't remove those.

### `encoding`<a name="basic_options-encoding">&nbsp;</a>

*Type:* string  
*Default:* `'utf8'`

Set the encoding method of the input and output.

### `bufferSize`<a name="basic_options-buffersize">&nbsp;</a>

*Type:* number  
*Default:* `1024`

When readlineSync reads from a console directly (without external program), use a size `bufferSize` buffer.  
Even if the input by user exceeds it, it's usually no problem, because the buffer is used repeatedly. But some platforms's (e.g. Windows) console might not accept input that exceeds it. And set an enough size.

### `print`<a name="basic_options-print">&nbsp;</a>

*Type:* function or `undefined`  
*Default:* `undefined`

Call the specified function with every output. The function is given two arguments, `display` as an output text, and a value of [`encoding`](#basic_options-encoding) option.

For example:

* Pass the plain texts to the Logger (e.g. [log4js](https://github.com/nomiddlename/log4js-node)), after clean the colored texts.

![sample](cl_01.png)

```js
var readlineSync = require('readline-sync'),
  chalk = require('chalk'),
  log4js = require('log4js'),
  logger, user, pw, command;

log4js.configure({appenders: [{type: 'file', filename: 'fooApp.log'}]});
logger = log4js.getLogger('fooApp');

readlineSync.setDefaultOptions({
  print: function(display, encoding)
    { logger.info(chalk.stripColor(display)); }, // Remove ctrl-chars.
  prompt: chalk.red.bold('> ')
});

console.log(chalk.black.bold.bgYellow('    Your Account    '));
user = readlineSync.question(chalk.gray.underline(' USER NAME ') + ' :');
pw = readlineSync.question(chalk.gray.underline(' PASSWORD  ') + ' :',
  {hideEchoBack: true});
// Authorization ...
console.log(chalk.green('Welcome, ' + user + '!'));
command = readlineSync.prompt();
```

* Output a conversation to a file when an output stream is redirected to record those into a file like `your-script >foo.log`. That is, a conversation isn't outputted to `foo.log` without this code.

```js
readlineSync.setDefaultOptions({
  print: function(display, encoding)
    { process.stdout.write(display, encoding); }
});
var name = readlineSync.question('May I have your name? :');
var loc = readlineSync.question('Hi ' + name + '! Where do you live? :');
```

* Let somebody hear our conversation in real time.  
It just uses a fifo with above sample code that was named `conv.js`.

Another terminal:

```shell
mkfifo /tmp/fifo
cat /tmp/fifo
```

My terminal:

```shell
node conv.js >/tmp/fifo
```

```console
May I have your name? :Oz
Hi Oz! Where do you live? :Emerald City
```

And then, another terminal shows this synchronously:

```console
May I have your name? :Oz
Hi Oz! Where do you live? :Emerald City
```

### `history`<a name="basic_options-history">&nbsp;</a>

_For `question*` and `prompt*` methods only_  
*Type:* boolean  
*Default:* `true`

readlineSync supports a history expansion feature that is similar to that of the shell. If `false` is specified, disable this feature.  
*It keeps a previous input only.* That is, only `!!`, `!-1`, `!!:p` and `!-1:p` like bash or zsh etc. are supported.

* `!!` or `!-1`: Return a previous input.
* `!!:p` or `!-1:p`: Display a previous input but do not return it, and wait for reinput.

For example:

```js
while (true) {
  input = readlineSync.prompt();
  console.log('-- You said "' + input + '"');
}
```

```console
> hello
-- You said "hello"
> !!
hello
-- You said "hello"
> !!:p
hello
> bye
-- You said "bye"
```

### `cd`<a name="basic_options-cd">&nbsp;</a>

_For `question*` and `prompt*` methods only_  
*Type:* boolean  
*Default:* `false`

readlineSync supports the changing the current working directory feature that is similar to the `cd` and `pwd` commands in the shell. If `true` is specified, enable this feature.  
This helps the user when you let the user input the multiple local files or directories.  
It supports `cd` and `pwd` commands.

* `cd <path>`: Change the current working directory to `<path>`. The `<path>` can include `~` as the home directory.
* `pwd`: Display the current working directory.

When these were input, do not return, and wait for reinput.

For example:

```js
while (true) {
  file = readlineSync.questionPath('File :');
  console.log('-- Specified file is ' + file);
}
```

```console
File :cd foo-dir/bar-dir
File :pwd
/path/to/foo-dir/bar-dir
File :file-a.js
-- Specified file is /path/to/foo-dir/bar-dir/file-a.js
File :file-b.png
-- Specified file is /path/to/foo-dir/bar-dir/file-b.png
File :file-c.html
-- Specified file is /path/to/foo-dir/bar-dir/file-c.html
```

## Utility Methods<a name="utility_methods">&nbsp;</a>

These are convenient methods that are extended [Basic Methods](#basic_methods) to be used easily.

### `questionEMail`<a name="utility_methods-questionemail">&nbsp;</a>

```js
email = readlineSync.questionEMail([query[, options]])
```

Display a `query` to the user if it's specified, and then accept only a valid e-mail address, and then return it after an Enter key was pressed.

The `query` is handled the same as that of the [`question`](#basic_methods-question) method.  
The default value of `query` is `'Input e-mail address :'`.

*Note:* The valid e-mail address requirement is a willful violation of [RFC5322](http://tools.ietf.org/html/rfc5322), this is defined in [HTML5](http://www.w3.org/TR/html5/forms.html). This works enough to prevent the user mistaking. If you want to change it, specify [`limit`](#basic_options-limit) option.

For example:

```js
email = readlineSync.questionEMail();
console.log('-- E-mail is ' + email);
```

```console
Input e-mail address :abc
Input valid e-mail address, please.
Input e-mail address :mail@example.com
-- E-mail is mail@example.com
```

#### Options<a name="utility_methods-questionemail-options">&nbsp;</a>

The following options have independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#basic_options-hideechoback) | `false` |
| [`limit`](#basic_options-limit) | RegExp by [HTML5](http://www.w3.org/TR/html5/forms.html) |
| [`limitMessage`](#basic_options-limitmessage) | `'Input valid e-mail address, please.'` |
| [`trueValue`](#basic_options-truevalue_falsevalue) | `null` |
| [`falseValue`](#basic_options-truevalue_falsevalue) | `null` |

The following options work as shown in the [Basic Options](#basic_options) section.

<table>
<tr><td><a href="#basic_options-mask"><code>mask</code></a></td><td><a href="#basic_options-defaultinput"><code>defaultInput</code></a></td><td><a href="#basic_options-casesensitive"><code>caseSensitive</code></a></td><td><a href="#basic_options-encoding"><code>encoding</code></a></td><td><a href="#basic_options-buffersize"><code>bufferSize</code></a></td></tr>
<tr><td><a href="#basic_options-print"><code>print</code></a></td><td><a href="#basic_options-history"><code>history</code></a></td></tr>
</table>

### `questionNewPassword`<a name="utility_methods-questionnewpassword">&nbsp;</a>

```js
password = readlineSync.questionNewPassword([query[, options]])
```

Display a `query` to the user if it's specified, and then accept only a valid password, and then request same one again, and then return it after an Enter key was pressed.  
It's the password, or something that is the secret text like the password.  
You can specify the valid password requirement to the options.

The `query` is handled the same as that of the [`question`](#basic_methods-question) method.  
The default value of `query` is `'Input new password :'`.

*Note:* Only the form of password is checked. Check it more if you want. For example, [zxcvbn](https://github.com/dropbox/zxcvbn) is password strength estimation library.

For example:

```js
password = readlineSync.questionNewPassword();
console.log('-- Password is ' + password);
```

```console
Input new password :************
It can include: 0...9, A...Z, a...z, !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
And the length must be: 12...24
Input new password :*************
Reinput a same one to confirm it :*************
It differs from first one. Hit only Enter key if you want to retry from first one.
Reinput a same one to confirm it :*************
-- Password is _my_password_
```

#### Options<a name="utility_methods-questionnewpassword-options">&nbsp;</a>

The following options have independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#basic_options-hideechoback) | `true` |
| [`mask`](#basic_options-mask) | `'*'` |
| [`limitMessage`](#basic_options-limitmessage) | `'It can include: ${charlist}\nAnd the length must be: ${length}'` |
| [`trueValue`](#basic_options-truevalue_falsevalue) | `null` |
| [`falseValue`](#basic_options-truevalue_falsevalue) | `null` |
| [`caseSensitive`](#basic_options-casesensitive) | `true` |

The following options work as shown in the [Basic Options](#basic_options) section.

<table>
<tr><td><a href="#basic_options-defaultinput"><code>defaultInput</code></a></td><td><a href="#basic_options-keepwhitespace"><code>keepWhitespace</code></a></td><td><a href="#basic_options-encoding"><code>encoding</code></a></td><td><a href="#basic_options-buffersize"><code>bufferSize</code></a></td><td><a href="#basic_options-print"><code>print</code></a></td></tr>
</table>

And the following additional options are available.

##### `charlist`<a name="utility_methods-questionnewpassword-options-charlist">&nbsp;</a>

*Type:* string  
*Default:* `'${!-~}'`

A string as the characters that can be included in the password. For example, if `'abc123'` is specified, the passwords that include any character other than these 6 characters are refused.  
The [placeholders](#placeholders) like `'${a-e}'` are replaced to the characters like `'abcde'`.  

For example, let the user input a password that is created with alphabet and some symbols:

```js
password = readlineSync.questionNewPassword('PASSWORD :', {charlist: '${a-z}#$@%'});
```

##### `min`, `max`<a name="utility_methods-questionnewpassword-options-min_max">&nbsp;</a>

*Type:* number  
*Default:* `min`: `12`, `max`: `24`

`min`: A number as a minimum length of the password.  
`max`: A number as a maximum length of the password.

##### `confirmMessage`<a name="utility_methods-questionnewpassword-options-confirmmessage">&nbsp;</a>

*Type:* string or others  
*Default:* `'Reinput a same one to confirm it :'`

A message that lets the user input the same password again.  
It can include the [placeholders](#placeholders).  
If this is not string, it is converted to string (i.e. `toString` method is called).

##### `unmatchMessage`<a name="utility_methods-questionnewpassword-options-unmatchmessage">&nbsp;</a>

*Type:* string or others  
*Default:* `'It differs from first one. Hit only Enter key if you want to retry from first one.'`

A warning message that is displayed when the second input did not match first one.  
This is converted the same as the [`confirmMessage`](#utility_methods-questionnewpassword-options-confirmmessage) option.

#### Additional Placeholders<a name="utility_methods-questionnewpassword-additional_placeholders">&nbsp;</a>

The following additional [placeholder](#placeholders) parameters are available.

##### `charlist`<a name="utility_methods-questionnewpassword-additional_placeholders-charlist">&nbsp;</a>

A current value of [`charlist`](#utility_methods-questionnewpassword-options-charlist) option that is converted to human readable if possible. (e.g. `'A...Z'`)

##### `length`<a name="utility_methods-questionnewpassword-additional_placeholders-length">&nbsp;</a>

A current value of [`min` and `max`](#utility_methods-questionnewpassword-options-min_max) option that is converted to human readable. (e.g. `'12...24'`)

### `questionInt`<a name="utility_methods-questionint">&nbsp;</a>

```js
numInt = readlineSync.questionInt([query[, options]])
```

Display a `query` to the user if it's specified, and then accept only an input that can be interpreted as an integer, and then return the number (not string) after an Enter key was pressed.  
This parses the input as much as possible by `parseInt()`. For example, it interprets `'   5   '`, `'5.6'`, `'005'`, `'5files'`, `'5kb'` and `'5px'` as `5`.

The `query` is handled the same as that of the [`question`](#basic_methods-question) method.

#### Options<a name="utility_methods-questionint-options">&nbsp;</a>

The following option has independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`limitMessage`](#basic_options-limitmessage) | `'Input valid number, please.'` |

The following options work as shown in the [Basic Options](#basic_options) section.

<table>
<tr><td><a href="#basic_options-hideechoback"><code>hideEchoBack</code></a></td><td><a href="#basic_options-mask"><code>mask</code></a></td><td><a href="#basic_options-defaultinput"><code>defaultInput</code></a></td><td><a href="#basic_options-casesensitive"><code>caseSensitive</code></a></td><td><a href="#basic_options-keepwhitespace"><code>keepWhitespace</code></a></td></tr>
<tr><td><a href="#basic_options-encoding"><code>encoding</code></a></td><td><a href="#basic_options-buffersize"><code>bufferSize</code></a></td><td><a href="#basic_options-print"><code>print</code></a></td><td><a href="#basic_options-history"><code>history</code></a></td></tr>
</table>

### `questionFloat`<a name="utility_methods-questionfloat">&nbsp;</a>

```js
numFloat = readlineSync.questionFloat([query[, options]])
```

Display a `query` to the user if it's specified, and then accept only an input that can be interpreted as a floating-point number, and then return the number (not string) after an Enter key was pressed.  
This parses the input as much as possible by `parseFloat()`. For example, it interprets `'   3.14   '`, `'003.1400'`, `'314e-2'` and `'3.14PI'` as `3.14`.

The `query` is handled the same as that of the [`question`](#basic_methods-question) method.

#### Options<a name="utility_methods-questionfloat-options">&nbsp;</a>

The following option has independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`limitMessage`](#basic_options-limitmessage) | `'Input valid number, please.'` |

The following options work as shown in the [Basic Options](#basic_options) section.

<table>
<tr><td><a href="#basic_options-hideechoback"><code>hideEchoBack</code></a></td><td><a href="#basic_options-mask"><code>mask</code></a></td><td><a href="#basic_options-defaultinput"><code>defaultInput</code></a></td><td><a href="#basic_options-casesensitive"><code>caseSensitive</code></a></td><td><a href="#basic_options-keepwhitespace"><code>keepWhitespace</code></a></td></tr>
<tr><td><a href="#basic_options-encoding"><code>encoding</code></a></td><td><a href="#basic_options-buffersize"><code>bufferSize</code></a></td><td><a href="#basic_options-print"><code>print</code></a></td><td><a href="#basic_options-history"><code>history</code></a></td></tr>
</table>

### `questionPath`<a name="utility_methods-questionpath">&nbsp;</a>

```js
path = readlineSync.questionPath([query[, options]])
```

Display a `query` to the user if it's specified, and then accept only a valid local file or directory path, and then return an absolute path after an Enter key was pressed.  
The `~` that is input by the user is replaced to the home directory.  
You can specify the valid local file or directory path requirement to the options. And you can make it create a new file or directory when it doesn't exist.  

It is recommended to use this method with the [`cd`](#basic_options-cd) option. (Default: `true`)

The `query` is handled the same as that of the [`question`](#basic_methods-question) method.  
The default value of `query` is `'Input path (you can "cd" and "pwd") :'`.

For example:

```js
sourceFile = readlineSync.questionPath('Read from :', {
  isFile: true
});
console.log('-- sourceFile: ' + sourceFile);

saveDir = readlineSync.questionPath('Save to :', {
  isDirectory: true,
  exists: null,
  create: true
});
console.log('-- saveDir: ' + saveDir);
```

```console
Read from :~/fileA
No such file or directory: /home/user/fileA
Input valid path, please.
Read from :pwd
/path/to/work
Read from :cd ~/project-1
Read from :fileA
-- sourceFile: /home/user/project-1/fileA
Save to :~/deploy/data
-- saveDir: /home/user/deploy/data
```

#### Options<a name="utility_methods-questionpath-options">&nbsp;</a>

The following options have independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#basic_options-hideechoback) | `false` |
| [`limitMessage`](#basic_options-limitmessage) | `'${error(\n)}Input valid path, please.${( Min:)min}${( Max:)max}'` |
| [`history`](#basic_options-history) | `true` |
| [`cd`](#basic_options-cd) | `true` |

The following options work as shown in the [Basic Options](#basic_options) section.

<table>
<tr><td><a href="#basic_options-mask"><code>mask</code></a></td><td><a href="#basic_options-defaultinput"><code>defaultInput</code></a></td><td><a href="#basic_options-casesensitive"><code>caseSensitive</code></a></td><td><a href="#basic_options-encoding"><code>encoding</code></a></td><td><a href="#basic_options-buffersize"><code>bufferSize</code></a></td></tr>
<tr><td><a href="#basic_options-print"><code>print</code></a></td></tr>
</table>

And the following additional options are available.

*Note:* It does not check the coherency about a combination of the options as the path requirement. For example, the `{exists: false, isFile: true}` never check that it is a file because it is limited to the path that does not exist.

##### `exists`<a name="utility_methods-questionpath-options-exists">&nbsp;</a>

*Type:* boolean or others  
*Default:* `true`

If `true` is specified, accept only a file or directory path that exists. If `false` is specified, accept only a file or directory path that does *not* exist.  
In any other case, the existence is not checked.

##### `min`, `max`<a name="utility_methods-questionpath-options-min_max">&nbsp;</a>

*Type:* number or others  
*Default:* `undefined`

`min`: A number as a minimum size of the file that is accepted.  
`max`: A number as a maximum size of the file that is accepted.  
If it is not specified or `0` is specified, the size is not checked. (A size of directory is `0`.)

##### `isFile`, `isDirectory`<a name="utility_methods-questionpath-options-isfile_isdirectory">&nbsp;</a>

*Type:* boolean  
*Default:* `false`

`isFile`: If `true` is specified, accept only a file path.  
`isDirectory`: If `true` is specified, accept only a directory path.

##### `validate`<a name="utility_methods-questionpath-options-validate">&nbsp;</a>

*Type:* function or `undefined`  
*Default:* `undefined`

If a function that returns `true` or an error message is specified, call it with a path that was input, and accept the input when the function returned `true`.  
If the function returned a string as an error message, that message is got by the [`error`](#utility_methods-questionpath-additional_placeholders-error) additional [placeholder](#placeholders) parameter.  
A path that was input is parsed before it is passed to the function. `~` is replaced to a home directory, and a path is converted to an absolute path.  
This is also a return value from this method.

For example, accept only PNG file or tell it to the user:

```js
imageFile = readlineSync.questionPath('Image File :', {
  validate: function(path) { return /\.png$/i.test(path) || 'It is not PNG'; }
});
```

##### `create`<a name="utility_methods-questionpath-options-create">&nbsp;</a>

*Type:* boolean  
*Default:* `false`

If `true` is specified, create a file or directory as a path that was input when it doesn't exist. If `true` is specified to the [`isDirectory`](#utility_methods-questionpath-options-isfile_isdirectory) option, create a directory, otherwise a file.  
It does not affect the existence check. Therefore, you can get a new file or directory path anytime by specifying: `{exists: false, create: true}`

#### Additional Placeholders<a name="utility_methods-questionpath-additional_placeholders">&nbsp;</a>

The following additional [placeholder](#placeholders) parameters are available.

##### `error`<a name="utility_methods-questionpath-additional_placeholders-error">&nbsp;</a>

An error message when the input was not accepted.  
This value is set by readlineSync, or the function that was specified to [`validate`](#utility_methods-questionpath-options-validate) option.

##### `min`, `max`<a name="utility_methods-questionpath-additional_placeholders-min_max">&nbsp;</a>

A current value of [`min` and `max`](#utility_methods-questionpath-options-min_max) option.

### `promptCL`<a name="utility_methods-promptcl">&nbsp;</a>

```js
argsArray = readlineSync.promptCL([commandHandler[, options]])
```

Display a prompt-sign (see [`prompt`](#basic_options-prompt) option) to the user, and then consider the input as a command-line and parse it, and then return a result after an Enter key was pressed.  
A return value is an Array that includes the tokens that were parsed. It parses the input from the user as the command-line, and it interprets whitespaces, quotes, etc., and it splits it to tokens properly. Usually, a first element of the Array is command-name, and remaining elements are arguments.

For example:

```js
argsArray = readlineSync.promptCL();
console.log(argsArray.join('\n'));
```

```console
> command arg "arg" " a r g " "" 'a"r"g' "a""rg" "arg
command
arg
arg
 a r g 

a"r"g
arg
arg
```

#### `commandHandler`<a name="utility_methods-promptcl-commandhandler">&nbsp;</a>

By using the `commandHandler` argument, this method will come into its own. Specifying the Object to this argument has the more merit. And it has the more merit for [`promptCLLoop`](#utility_methods-promptclloop) method.  

If a function is specified to `commandHandler` argument, it is just called with a parsed Array as an argument list of the function. And `this` is an original input string, in the function.

For example, the following 2 codes work same except that `this` is enabled in the second one:

```js
argsArray = readlineSync.promptCL();
if (argsArray[0] === 'add') {
  console.log(argsArray[1] + ' is added.');
} else if (argsArray[0] === 'copy') {
  console.log(argsArray[1] + ' is copied to ' + argsArray[2] + '.');
}
```

```js
readlineSync.promptCL(function(command, arg1, arg2) {
  console.log('You want to: ' + this); // All of command-line.
  if (command === 'add') {
    console.log(arg1 + ' is added.');
  } else if (command === 'copy') {
    console.log(arg1 + ' is copied to ' + arg2 + '.');
  }
});
```

If an Object that has properties named as the command-name is specified, the command-name is interpreted, and a function as the value of matched property is called. A function is chosen properly by handling case of the command-name in accordance with the [`caseSensitive`](#basic_options-casesensitive) option.  
The function is called with a parsed Array that excludes a command-name (i.e. first element is removed from the Array) as an argument list of the function.  
That is, a structure of the `commandHandler` Object looks like:

```js
{
  commandA: function(arg) { ... },        // commandA requires one argument.
  commandB: function(arg1, arg2) { ... }, // readlineSync doesn't care those.
  commandC: function() { ... }            // Of course, it can also ignore all.
}
```

readlineSync just receives the arguments from the user and passes those to these functions without checking. The functions may have to check whether the required argument was input by the user, and more validate those.

For example, the following code works same to the above code:

```js
readlineSync.promptCL({
  add: function(element) { // It's called by also "ADD", "Add", "aDd", etc..
    console.log(element + ' is added.');
  },
  copy: function(from, to) {
    console.log(from + ' is copied to ' + to + '.');
  }
});
```

If the matched property is not found in the Object, a `_` property is chosen, and the function as the value of this property is called with a parsed Array as an argument list of the function. Note that this includes a command-name. That is, the function looks like `function(command, arg1, arg2, ...) { ... }`.  
And if the Object doesn't have a `_` property, any command that the matched property is not found in the Object is refused.

For example:

```js
readlineSync.promptCL({
  copy: function(from, to) { // command-name is not included.
    console.log(from + ' is copied to ' + to + '.');
  },
  _: function(command) { // command-name is included.
    console.log('Sorry, ' + command + ' is not available.');
  }
});
```

#### Options<a name="utility_methods-promptcl-options">&nbsp;</a>

The following options have independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#basic_options-hideechoback) | `false` |
| [`limitMessage`](#basic_options-limitmessage) | `'Requested command is not available.'` |
| [`caseSensitive`](#basic_options-casesensitive) | `false` |
| [`history`](#basic_options-history) | `true` |

The following options work as shown in the [Basic Options](#basic_options) section.

<table>
<tr><td><a href="#basic_options-prompt"><code>prompt</code></a></td><td><a href="#basic_options-mask"><code>mask</code></a></td><td><a href="#basic_options-defaultinput"><code>defaultInput</code></a></td><td><a href="#basic_options-encoding"><code>encoding</code></a></td><td><a href="#basic_options-buffersize"><code>bufferSize</code></a></td></tr>
<tr><td><a href="#basic_options-print"><code>print</code></a></td><td><a href="#basic_options-cd"><code>cd</code></a></td></tr>
</table>

### `promptLoop`<a name="utility_methods-promptloop">&nbsp;</a>

```js
readlineSync.promptLoop(inputHandler[, options])
```

Display a prompt-sign (see [`prompt`](#basic_options-prompt) option) to the user, and then call `inputHandler` function with the input from the user after it has been typed and an Enter key was pressed. Do these repeatedly until `inputHandler` function returns `true`.

For example, the following 2 codes work same:

```js
while (true) {
  input = readlineSync.prompt();
  console.log('-- You said "' + input + '"');
  if (input === 'bye') {
    break;
  }
}
console.log('It\'s exited from loop.');
```

```js
readlineSync.promptLoop(function(input) {
  console.log('-- You said "' + input + '"');
  return input === 'bye';
});
console.log('It\'s exited from loop.');
```

```console
> hello
-- You said "hello"
> good morning
-- You said "good morning"
> bye
-- You said "bye"
It's exited from loop.
```

#### Options<a name="utility_methods-promptloop-options">&nbsp;</a>

The following options have independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#basic_options-hideechoback) | `false` |
| [`trueValue`](#basic_options-truevalue_falsevalue) | `null` |
| [`falseValue`](#basic_options-truevalue_falsevalue) | `null` |
| [`caseSensitive`](#basic_options-casesensitive) | `false` |
| [`history`](#basic_options-history) | `true` |

The other options work as shown in the [Basic Options](#basic_options) section.

### `promptCLLoop`<a name="utility_methods-promptclloop">&nbsp;</a>

```js
readlineSync.promptCLLoop([commandHandler[, options]])
```

Execute [`promptCL`](#utility_methods-promptcl) method repeatedly until chosen [`commandHandler`](#utility_methods-promptcl-commandhandler) returns `true`.  
The [`commandHandler`](#utility_methods-promptcl-commandhandler) may be a function that is called like:

```js
exit = allCommands(command, arg1, arg2, ...);
```

or an Object that has the functions that are called like:

```js
exit = foundCommand(arg1, arg2, ...);
```

See [`promptCL`](#utility_methods-promptcl) method for details.  
This method looks like a combination of [`promptCL`](#utility_methods-promptcl) method and [`promptLoop`](#utility_methods-promptloop) method.

For example:

```js
readlineSync.promptCLLoop({
  add: function(element) {
    console.log(element + ' is added.');
  },
  copy: function(from, to) {
    console.log(from + ' is copied to ' + to + '.');
  },
  bye: function() { return true; }
});
console.log('It\'s exited from loop.');
```

```console
> add "New Hard Disk"
New Hard Disk is added.
> move filesOnOld "New Hard Disk"
Requested command is not available.
> copy filesOnOld "New Hard Disk"
filesOnOld is copied to New Hard Disk.
> bye
It's exited from loop.
```

#### Options<a name="utility_methods-promptclloop-options">&nbsp;</a>

The following options have independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#basic_options-hideechoback) | `false` |
| [`limitMessage`](#basic_options-limitmessage) | `'Requested command is not available.'` |
| [`caseSensitive`](#basic_options-casesensitive) | `false` |
| [`history`](#basic_options-history) | `true` |

The following options work as shown in the [Basic Options](#basic_options) section.

<table>
<tr><td><a href="#basic_options-prompt"><code>prompt</code></a></td><td><a href="#basic_options-mask"><code>mask</code></a></td><td><a href="#basic_options-defaultinput"><code>defaultInput</code></a></td><td><a href="#basic_options-encoding"><code>encoding</code></a></td><td><a href="#basic_options-buffersize"><code>bufferSize</code></a></td></tr>
<tr><td><a href="#basic_options-print"><code>print</code></a></td><td><a href="#basic_options-cd"><code>cd</code></a></td></tr>
</table>

### `promptSimShell`<a name="utility_methods-promptsimshell">&nbsp;</a>

```js
input = readlineSync.promptSimShell([options])
```

Display a prompt-sign that is similar to that of the user's shell to the user, and then return the input from the user after it has been typed and an Enter key was pressed.  
This method displays a prompt-sign like:

On Windows:

```shell
C:\Users\User\Path\To\Directory>
```

On others:

```shell
user@host:~/path/to/directory$ 
```

#### Options<a name="utility_methods-promptsimshell-options">&nbsp;</a>

The following options have independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#basic_options-hideechoback) | `false` |
| [`history`](#basic_options-history) | `true` |

The other options other than [`prompt`](#basic_options-prompt) option work as shown in the [Basic Options](#basic_options) section.

### `keyInYN`<a name="utility_methods-keyinyn">&nbsp;</a>

```js
boolYesOrEmpty = readlineSync.keyInYN([query[, options]])
```

Display a `query` to the user if it's specified, and then return a boolean or an empty string immediately a key was pressed by the user, **without pressing an Enter key**. Note that the user has no chance to change the input.  
This method works like the `window.confirm` method of web browsers. A return value means "Yes" or "No" the user said. It differ depending on the pressed key:

* `Y`: `true`
* `N`: `false`
* other: `''`

The `query` is handled the same as that of the [`question`](#basic_methods-question) method.  
The default value of `query` is `'Are you sure? :'`.

The keys other than `Y` and `N` are also accepted (If you want to know a user's wish explicitly, use [`keyInYNStrict`](#utility_methods-keyinynstrict) method). Therefore, if you let the user make an important decision (e.g. files are removed), check whether the return value is not *falsy*. That is, a default is "No".

For example:

```js
if (!readlineSync.keyInYN('Do you want to install this?')) {
  // Key that is not `Y` was pressed.
  process.exit();
}
// Do something...
```

Or if you let the user stop something that must be done (e.g. something about the security), check whether the return value is `false` explicitly. That is, a default is "Yes".

For example:

```js
// Don't use `(!readlineSync.keyInYN())`.
if (readlineSync.keyInYN('Continue virus scan?') === false) {
  // `N` key was pressed.
  process.exit();
}
// Continue...
```

#### Options<a name="utility_methods-keyinyn-options">&nbsp;</a>

The following options work as shown in the [Basic Options](#basic_options) section.

<table>
<tr><td><a href="#basic_options-encoding"><code>encoding</code></a></td><td><a href="#basic_options-buffersize"><code>bufferSize</code></a></td><td><a href="#basic_options-print"><code>print</code></a></td></tr>
</table>

And the following additional option is available.

##### `guide`<a name="utility_methods-keyinyn-options-guide">&nbsp;</a>

*Type:* boolean  
*Default:* `true`

If `true` is specified, a string `'[y/n]'` as guide for the user is added to `query`. And `':'` is moved to the end of `query`, or it is added.

For example:

```js
readlineSync.keyInYN('Do you like me?'); // No colon
readlineSync.keyInYN('Really? :'); // Colon already exists
```

``` console
Do you like me? [y/n] :y
Really? [y/n] :y
```

### `keyInYNStrict`<a name="utility_methods-keyinynstrict">&nbsp;</a>

```js
boolYes = readlineSync.keyInYNStrict([query[, options]])
```

Display a `query` to the user if it's specified, and then accept only `Y` or `N` key, and then return a boolean immediately it was pressed by the user, **without pressing an Enter key**. Note that the user has no chance to change the input.  
This method works like the `window.confirm` method of web browsers. A return value means "Yes" or "No" the user said. It differ depending on the pressed key:

* `Y`: `true`
* `N`: `false`

The `query` is handled the same as that of the [`question`](#basic_methods-question) method.  
The default value of `query` is `'Are you sure? :'`.

A key other than `Y` and `N` is not accepted. That is, a return value has no default. Therefore, the user has to tell an own wish explicitly. If you want to know a user's wish easily, use [`keyInYN`](#utility_methods-keyinyn) method.

This method works same to [`keyInYN`](#utility_methods-keyinyn) method except that this accept only `Y` or `N` key. The options also work same to [`keyInYN`](#utility_methods-keyinyn) method.

### `keyInPause`<a name="utility_methods-keyinpause">&nbsp;</a>

```js
readlineSync.keyInPause([query[, options]])
```

Display a `query` to the user if it's specified, and then just wait for a key to be pressed by the user.  
This method works like the `window.alert` method of web browsers. This is used to make the running of script pause and show something to the user, or wait for the user to be ready.  
By default, any key is accepted. You can change this behavior by specifying [`limit`](#basic_options-limit) option  (e.g. accept only a Space Bar).

The `query` is handled the same as that of the [`question`](#basic_methods-question) method.  
The default value of `query` is `'Continue...'`.

For example:

```js
// Have made the preparations for something...
console.log('==== Informations of Your Computer ====');
console.log(info); // This can be `query`.
readlineSync.keyInPause();
console.log('It\'s executing now...');
// Do something...
```

```console
==== Informations of Your Computer ====
FOO: 123456
BAR: abcdef
Continue... (Hit any key)
It's executing now...
```

#### Options<a name="utility_methods-keyinpause-options">&nbsp;</a>

The following option has independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`limit`](#basic_options-limit) | `null` |

The following options work as shown in the [Basic Options](#basic_options) section.

<table>
<tr><td><a href="#basic_options-casesensitive"><code>caseSensitive</code></a></td><td><a href="#basic_options-encoding"><code>encoding</code></a></td><td><a href="#basic_options-buffersize"><code>bufferSize</code></a></td><td><a href="#basic_options-print"><code>print</code></a></td></tr>
</table>

And the following additional option is available.

##### `guide`<a name="utility_methods-keyinpause-options-guide">&nbsp;</a>

*Type:* boolean  
*Default:* `true`

If `true` is specified, a string `'(Hit any key)'` as guide for the user is added to `query`.

For example:

```js
readlineSync.keyInPause('It\'s pausing now...');
```

``` console
It's pausing now... (Hit any key)
```

### `keyInSelect`<a name="utility_methods-keyinselect">&nbsp;</a>

```js
index = readlineSync.keyInSelect(items[, query[, options]])
```

Display the list that was created with the `items` Array, and the `query` to the user if it's specified, and then return the number as an index of the `items` Array immediately it was chosen by pressing a key by the user, **without pressing an Enter key**. Note that the user has no chance to change the input.

The `query` is handled the same as that of the [`question`](#basic_methods-question) method.  
The default value of `query` is `'Choose one from list :'`.

The minimum length of `items` Array is 1 and maximum length is 35. These elements are displayed as item list. A key to let the user choose an item is assigned to each item automatically in sequence like "1, 2, 3 ... 9, A, B, C ...". A number as an index of the `items` Array that corresponds to a chosen item by the user is returned.

For example:

```js
frameworks = ['Express', 'hapi', 'flatiron', 'MEAN.JS', 'locomotive'];
index = readlineSync.keyInSelect(frameworks, 'Which framework?');
console.log(frameworks[index] + ' is enabled.');
```

```console
[1] Express
[2] hapi
[3] flatiron
[4] MEAN.JS
[5] locomotive
[0] CANCEL

Which framework? [1...5 / 0] :2
hapi is enabled.
```

#### Options<a name="utility_methods-keyinselect-options">&nbsp;</a>

The following option has independent default value that is not affected by [Default Options](#basic_options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#basic_options-hideechoback) | `false` |

The following options work as shown in the [Basic Options](#basic_options) section.

<table>
<tr><td><a href="#basic_options-mask"><code>mask</code></a></td><td><a href="#basic_options-encoding"><code>encoding</code></a></td><td><a href="#basic_options-buffersize"><code>bufferSize</code></a></td><td><a href="#basic_options-print"><code>print</code></a></td></tr>
</table>

And the following additional options are available.

##### `guide`<a name="utility_methods-keyinselect-options-guide">&nbsp;</a>

*Type:* boolean  
*Default:* `true`

If `true` is specified, a string like `'[1...5]'` as guide for the user is added to `query`. And `':'` is moved to the end of `query`, or it is added. This is the key list that corresponds to the item list.

##### `cancel`<a name="utility_methods-keyinselect-options-cancel">&nbsp;</a>

*Type:* boolean  
*Default:* `true`

If `true` is specified, an item to let the user tell "cancel" is added to the item list. "[0] CANCEL" is displayed, and if `0` key is pressed, `-1` is returned.

## Placeholders<a name="placeholders">&nbsp;</a>

The placeholders in the text are replaced to another string.

For example, the [`limitMessage`](#basic_options-limitmessage) option to display a warning message that means that the command the user requested is not available:

```js
command = readlineSync.prompt({
  limit: ['add', 'remove'],
  limitMessage: '${lastInput} is not available.'
});
```

```console
> delete
delete is not available.
```

The placeholders can be included in:

* `query` argument
* [`prompt`](#basic_options-prompt) and [`limitMessage`](#basic_options-limitmessage) options
* [`limit` option for `keyIn*` method](#basic_options-limit-for_keyin_method) and [`charlist`](#utility_methods-questionnewpassword-options-charlist) option for [`questionNewPassword`](#utility_methods-questionnewpassword) method ([`C1-C2`](#placeholders-parameters-c1_c2) parameter only)
* And some additional options for the [Utility Methods](#utility_methods).

### Syntax<a name="placeholders-syntax">&nbsp;</a>

```
${parameter}
```

Or

```
${(text1)parameter(text2)}
```

The placeholder is replaced to a string that is got by a `parameter`.  
Both the `(text1)` and `(text2)` are optional.  
A more added `'$'` at the left of the placeholder is used as an escape character, it disables a placeholder. For example, `'$${foo}'` is replaced to `'${foo}'`. If you want to put a `'$'` which is *not* an escape character at the left of a placeholder, specify it like `'${($)bufferSize}'`, then it is replaced to `'$1024'`.

At the each position of `'(text1)'` and `'(text2)'`, `'text1'` and `'text2'` are put when a string that was got by a `parameter` has length more than 0. If that got string is `''`, a placeholder with or without `'(text1)'` and `'(text2)'` is replaced to `''`.

For example, a warning message that means that the command the user requested is not available:

```js
command = readlineSync.prompt({
  limit: ['add', 'remove'],
  limitMessage: 'Refused ${lastInput} you requested. Please input another.'
});
```

```console
> give-me-car
Refused give-me-car you requested. Please input another.
```

It looks like no problem.  
But when the user input nothing (hit only Enter key), and then a message is displayed:

```console
> 
Refused  you requested. Please input another.
```

This goes well:

```js
command = readlineSync.prompt({
  limit: ['add', 'remove'],
  limitMessage: 'Refused ${lastInput( you requested)}. Please input another.'
});
```

```console
> 
Refused . Please input another.
```

(May be more better: `'${(Refused )lastInput( you requested. )}Please input another.'`)

### Parameters<a name="placeholders-parameters">&nbsp;</a>

The following parameters are available. And some additional parameters are available in the [Utility Methods](#utility_methods).

#### `hideEchoBack`, `mask`, `defaultInput`, `caseSensitive`, `keepWhitespace`, `encoding`, `bufferSize`, `history`, `cd`, `limit`, `trueValue`, `falseValue`<a name="placeholders-parameters-hideechoback_mask_defaultinput_casesensitive_keepwhitespace_encoding_buffersize_history_cd_limit_truevalue_falsevalue">&nbsp;</a>

A current value of each option.  
It is converted to human readable if possible. The boolean value is replaced to `'on'` or `'off'`, and the Array is replaced to the list of only string and number elements.  
And in the `keyIn*` method, the parts of the list as characters sequence are suppressed. For example, when `['a', 'b', 'c', 'd', 'e']` is specified to the [`limit`](#basic_options-limit) option, `'${limit}'` is replaced to `'a...e'`. If `true` is specified to the [`caseSensitive`](#basic_options-casesensitive) option, the characters are converted to lower case.

For example:

```js
input = readlineSync.question(
  'Input something or Enter key as "${defaultInput}" :',
  {defaultInput: 'hello'}
);
```

```console
Input something or Enter key as "hello" :
```

#### `limitCount`, `limitCountNotZero`<a name="placeholders-parameters-limitcount_limitcountnotzero">&nbsp;</a>

A length of a current value of the [`limit`](#basic_options-limit) option.  
When the value of the [`limit`](#basic_options-limit) option is empty, `'${limitCount}'` is replaced to `'0'`, `'${limitCountNotZero}'` is replaced to `''`.

For example:

```js
action = readlineSync.question(
  'Choose action${( from )limitCountNotZero( actions)} :',
  {limit: availableActions}
);
```

```console
Choose action from 5 actions :
```

#### `lastInput`<a name="placeholders-parameters-lastinput">&nbsp;</a>

A last input from the user.  
In any case, this is saved.

For example:

```js
command = readlineSync.prompt({
  limit: availableCommands,
  limitMessage: '${lastInput} is not available.'
});
```

```console
> wrong-command
wrong-command is not available.
```

#### `history_mN`<a name="placeholders-parameters-historymn">&nbsp;</a>

When the history expansion feature is enabled (see [`history`](#basic_options-history) option), a current command line minus `N`.  
*This feature keeps the previous input only.* That is, only `history_m1` is supported.

For example:

```js
while (true) {
  input = readlineSync.question('Something${( or "!!" as ")history_m1(")} :');
  console.log('-- You said "' + input + '"');
}
```

```console
Something :hello
-- You said "hello"
Something or "!!" as "hello" :!!
hello
-- You said "hello"
```

#### `cwd`, `CWD`, `cwdHome`<a name="placeholders-parameters-cwd_cwd_cwdhome">&nbsp;</a>

A current working directory.  

* `cwd`: A full-path
* `CWD`: A directory name
* `cwdHome`: A path that includes `~` as the home directory

For example, like bash/zsh:

```js
command = readlineSync.prompt({prompt: '[${cwdHome}]$ '});
```

```console
[~/foo/bar]$ 
```

#### `date`, `time`, `localeDate`, `localeTime`<a name="placeholders-parameters-date_time_localedate_localetime">&nbsp;</a>

A string as current date or time.

* `date`: A date portion
* `time`: A time portion
* `localeDate`: A locality sensitive representation of the date portion based on system settings
* `localeTime`: A locality sensitive representation of the time portion based on system settings

For example:

```js
command = readlineSync.prompt({prompt: '[${localeDate}]> '});
```

```console
[04/21/2015]> 
```

#### `C1-C2`<a name="placeholders-parameters-c1_c2">&nbsp;</a>

_For [`limit` option for `keyIn*` method](#basic_options-limit-for_keyin_method) and [`charlist`](#utility_methods-questionnewpassword-options-charlist) option for [`questionNewPassword`](#utility_methods-questionnewpassword) method only_

A character list.  
`C1` and `C2` are each single character as the start and the end. A sequence in ascending or descending order of characters ranging from `C1` to `C2` is created. For example, `'${a-e}'` is replaced to `'abcde'`. `'${5-1}'` is replaced to `'54321'`.

For example, let the user input a password that is created with alphabet:

```js
password = readlineSync.questionNewPassword('PASSWORD :', {charlist: '${a-z}'});
```

See also [`limit` option for `keyIn*` method](#basic_options-limit-for_keyin_method).

## With Task Runner<a name="with_task_runner">&nbsp;</a>

The easy way to control a flow of the task runner by the input from the user:

* [Grunt](http://gruntjs.com/) plugin: [grunt-confirm](https://github.com/anseki/grunt-confirm)
* [gulp](http://gulpjs.com/) plugin: [gulp-confirm](https://github.com/anseki/gulp-confirm)

If you want to control a flow of the task runner (e.g. [Grunt](http://gruntjs.com/)), call readlineSync in a task callback that is called by the task runner. Then a flow of tasks is paused and it is controlled by the user.

For example, by using [grunt-task-helper](https://github.com/anseki/grunt-task-helper):

```console
$ grunt
Running "fileCopy" task
Files already exist:
  file-a.png
  file-b.js
Overwrite? [y/n] :y
file-a.png copied.
file-b.js copied.
Done.
```

`Gruntfile.js`

```js
grunt.initConfig({
  taskHelper: {
    fileCopy: {
      options: {
        handlerByTask: function() {
          // Abort the task if user don't want it.
          return readlineSync.keyInYN('Overwrite?');
        },
        filesArray: []
      },
      ...
    }
  },
  copy: {
    fileCopy: {
      files: '<%= taskHelper.fileCopy.options.filesArray %>'
    }
  }
});
```

## Note<a name="note">&nbsp;</a>

### Platforms<a name="note-platforms">&nbsp;</a>

The TTY interfaces are different by the platforms. If the platform doesn't support the interactively reading from TTY, an error is thrown.

```js
try {
  answer = readlineSync.question('What is your favorite food? :');
} catch (e) {
  console.error(e);
  process.exit(1);
}
```

### Reading by External Program<a name="note-reading_by_external_program">&nbsp;</a>

readlineSync tries to read from a console by using the external program if it is needed (e.g. when the input stream is redirected on Windows XP). And if the running Node doesn't support the [Synchronous Process Execution](http://nodejs.org/api/child_process.html#child_process_synchronous_process_creation) (i.e. Node v0.10-), readlineSync uses "piping via files" for the synchronous execution.  
As everyone knows, "piping via files" is no good. It blocks the event loop and a process. It might make the your script be slow.

Why did I choose it? :

* The good modules (native addon) for the synchronous execution exist, but node-gyp can't compile those in some platforms or Node versions.
* I think that the security is important more than the speed. Some modules have problem about security. Those don't protect the data. I think that the speed is not needed usually, because readlineSync is used while the user types keys.

## Deprecated Methods and Options<a name="deprecated_methods_and_options">&nbsp;</a>

The readlineSync current version is fully compatible with older version.  
The following methods and options are deprecated.

### `setPrint` method<a name="deprecated_methods_and_options-setprint_method">&nbsp;</a>

Use the [`print`](#basic_options-print) option.  
For the [Default Options](#basic_options), use:

```js
readlineSync.setDefaultOptions({print: value});
```

instead of:

```js
readlineSync.setPrint(value);
```

### `setPrompt` method<a name="deprecated_methods_and_options-setprompt_method">&nbsp;</a>

Use the [`prompt`](#basic_options-prompt) option.  
For the [Default Options](#basic_options), use:

```js
readlineSync.setDefaultOptions({prompt: value});
```

instead of:

```js
readlineSync.setPrompt(value);
```

### `setEncoding` method<a name="deprecated_methods_and_options-setencoding_method">&nbsp;</a>

Use the [`encoding`](#basic_options-encoding) option.  
For the [Default Options](#basic_options), use:

```js
readlineSync.setDefaultOptions({encoding: value});
```

instead of:

```js
readlineSync.setEncoding(value);
```

### `setMask` method<a name="deprecated_methods_and_options-setmask_method">&nbsp;</a>

Use the [`mask`](#basic_options-mask) option.  
For the [Default Options](#basic_options), use:

```js
readlineSync.setDefaultOptions({mask: value});
```

instead of:

```js
readlineSync.setMask(value);
```

### `setBufferSize` method<a name="deprecated_methods_and_options-setbuffersize_method">&nbsp;</a>

Use the [`bufferSize`](#basic_options-buffersize) option.  
For the [Default Options](#basic_options), use:

```js
readlineSync.setDefaultOptions({bufferSize: value});
```

instead of:

```js
readlineSync.setBufferSize(value);
```

### `noEchoBack` option<a name="deprecated_methods_and_options-noechoback_option">&nbsp;</a>

Use [`hideEchoBack`](#basic_options-hideechoback) option instead of it.

### `noTrim` option<a name="deprecated_methods_and_options-notrim_option">&nbsp;</a>

Use [`keepWhitespace`](#basic_options-keepwhitespace) option instead of it.
