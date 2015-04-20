# readlineSync

Synchronous [Readline](http://nodejs.org/api/readline.html) for interactively running to have a conversation with the user via a console(TTY).

readlineSync tries to let your script have a conversation with the user via a console, even when the input/output is redirected like `your-script <foo.dat >bar.log`.

## Example

```js
var readlineSync = require('readline-sync');

var userName = readlineSync.question('May I have your name? :'); // Wait for user's response.
var favFood = readlineSync.question('Hi ' + userName + '! What is your favorite food? :');
console.log('Oh, ' + userName + ' likes ' + favFood + '!');
```

```console
May I have your name? :CookieMonster
Hi CookieMonster! What is your favorite food? :tofu
Oh, CookieMonster likes tofu!
```

```js
var readlineSync = require('readline-sync');

// Enter key is not necessary.
if (readlineSync.keyInYN('Do you want this module?')) {
  // 'Y' key was pressed.
  installModule();
} else {
  searchAnother();
}
```

## Installation

```shell
npm install readline-sync
```

## Basic Methods

These are used to control details of the behavior. It is recommended to use the [Utility Methods](#utility-methods) instead of Basic Methods if it satisfy your request.

### `question`

```js
answer = readlineSync.question([query[, options]])
```

Display the `query` to the user if it's specified, and then return the input from user after it has been typed and an Enter key was pressed.  
You can specify `options` (see [Options](#options)) to control the behavior (e.g. refusing unexpected input, avoiding trimming white spaces, etc.). **If you let the user input the secret text (e.g. password), you should consider [`hideEchoBack`](#hideEchoBack) option.**

The `query` may be string, or may not be (e.g. number, Date, Object, etc.). It is converted to string (i.e. `toString` method is called) before it is displayed.  
And it can include the [placeholders](#placeholders).

### `prompt`

```js
input = readlineSync.prompt([options])
```

Display the prompt-sign (see [`prompt`](#options-prompt) option) to the user, and then return the input from user after it has been typed and an Enter key was pressed.  
You can specify `options` (see [Options](#options)) to control the behavior (e.g. refusing unexpected input, avoiding trimming white spaces, etc.).

### `keyIn`

```js
pressedKey = readlineSync.keyIn([query[, options]])
```

Display the `query` to the user if it's specified, and then return the character as the key immediately it was pressed by the user, **without pressing an Enter key**. Note that the user has no chance to change the input.  
You can specify `options` (see [Options](#options)) to control the behavior (e.g. ignoring keys except some keys, checking target key, etc.).

The `query` is handled the same as that of the [`question`](#question) method.

### `setDefaultOptions`

```js
currentDefaultOptions = readlineSync.setDefaultOptions([newDefaultOptions])
```

Change the [Default Options](#options) to properties of `newDefaultOptions` Object  
All it takes is to specify options that you want change, because unspecified options are not updated.

## Options

An `options` Object can be specified to the methods to control the behavior of readlineSync. The options that was not specified are got from the Default Options. You can change the Default Options by [`setDefaultOptions`](#setdefaultoptions) method anytime, and it is kept until a current process is exited.  
Specify the options that is often used to the Default Options, and specify temporary options to the methods.

For example:

```js
readlineSync.setDefaultOptions({limit: ['green', 'yellow', 'red']});
a1 = readlineSync.question('Which color of signals? :'); // Input is limited to 3 things.
a2 = readlineSync.question('Which color of signals? :'); // It's limited yet.
a3 = readlineSync.question('What is your favorite color? :', {limit: null}); // It's unlimited temporarily.
a4 = readlineSync.question('Which color of signals? :'); // It's limited again.
readlineSync.setDefaultOptions({limit: ['beef', 'chicken']});
a5 = readlineSync.question('Beef or Chicken? :');        // Input is limited to new 2 things.
a6 = readlineSync.question('And you? :');                // It's limited to 2 things yet.
```

The Object as `options` can have following properties.

### `prompt`<span id="options-prompt" style="height: 0;"></span>

*For `prompt*` methods only*  
**Type:** string or others  
**Default:** `'> '`

Set the prompt-sign that is displayed to the user by `prompt*` methods. For example you see `> ` that is Node's prompt-sign when you run `node` on the command line.  
This may be string, or may not be (e.g. number, Date, Object, etc.). It is converted to string (i.e. `toString` method is called) before it is displayed every time.  
And it can include the [placeholders](#placeholders).

For example, `[foo-directory]$` like a bash shell that show the current working directory.

```js
readlineSync.prompt({
  prompt: { // Simple Object that has toString method.
    toString: function() {
      return '[' + require('path').basename(process.cwd()) + ']$ ';
    }
  }
});
```

### `hideEchoBack`

**Type:** boolean  
**Default:** `false`

If `true` is specified, the secret text (e.g. password) which is typed by user on screen is hidden by the mask characters (see [`mask`](#mask) option).

For example:

```js
password = readlineSync.question('PASSWORD :', {hideEchoBack: true});
console.log('Login ...');
```

The typed text is not shown on screen.

```console
PASSWORD :********
Login ...
```

### `mask`

**Type:** string  
**Default:** `'*'`

Set the mask character that is shown instead of the secret text (e.g. password) when [`hideEchoBack`](#hideEchoBack) option is `true`. If you want to show nothing, specify `''`. (But it might be not user friendly in some cases.)  
*Note:* In some cases (e.g. when the input is redirected on Windows XP), `'*'` or `''` might be used always.

For example:

```js
var readlineSync = require('readline-sync'),
  chalk = require('chalk'),
  secret;
secret = readlineSync.question('Please whisper sweet words :', {
  hideEchoBack: true,
  mask: chalk.magenta('\u2665')
});
```

![sample](cl_02.png)

### `limit`

Limit the user's input.  
The usage differ depending on the method.

#### For `question*` and `prompt*` methods

**Type:** string, number, RegExp, function or Array  
**Default:** `[]`

readlineSync accepts only specified input. If the user input others, it display [`limitMessage`](#limitmessage), and wait for reinput.

* The string or number is compared with the input. (See [`caseSensitive`](#casesensitive) option.)
* If the RegExp matched the input, the input is accepted.
* The function is called with the input, and if that function returned `true`, the input is accepted.

One of these or an Array that includes multiple things (or Array includes Array) can be specified.

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
  return require('net').isIP(input) !== '0'; // Valid IP Address
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

#### For `keyIn*` methods

**Type:** string, number or Array  
**Default:** `[]`

readlineSync accepts only specified keys, it ignore others.  
Specify the characters as the key. All strings or Array of those are decomposed into single characters. For example, `'abcde'` is the same as `['a', 'b', 'c', 'd', 'e']` or `['a', 'bc', ['d', 'e']]`.

For example:

```js
sex = readlineSync.keyIn('male or female? :', {limit: 'mf'}); // Accept 'm' or 'f'
```

The [placeholders](#placeholders) like `'${a-e}'` are replaced to array that is the character list like `['a', 'b', 'c', 'd', 'e']`.

For example:

```js
dice = readlineSync.keyIn('Which number do you think came up? :', {limit: '${1-6}'}); // Accept from '1' to '6'
```

### `limitMessage`

*For `question*` and `prompt*` methods only*  
**Type:** string  
**Default:** `'Input another, please.${( [)limit(])}'`

This is displayed to the user when [`limit`](#limit) option is specified and the user input others.  
The [placeholders](#placeholders) can be included.

For example:

```js
file = readlineSync.question('Name of Text File :', {
  limit: /\.txt$/i,
  limitMessage: 'Sorry, ${lastInput} is not text file.'
});
```

### `defaultInput`

*For `question*` and `prompt*` methods only*  
**Type:** string  
**Default:** `''`

If the user input empty text (i.e. pressed an Enter key only), the methods return this.

For example:

```js
answer = readlineSync.question('Do you want to install this? [y/n] :', {defaultInput: 'y'});
if (answer === 'y') {
  // install
} else {
  process.exit();
}
// ** But `keyInYN` method should be used instead of this. **
```

### `trueValue`, `falseValue`

**Type:** string, number, RegExp, function or Array  
*function for `question*` and `prompt*` methods only*  
**Default:** `[]`

If the input matched `trueValue`, the methods return `true`. If the input matched `falseValue`, the methods return `false`. If the input didn't match both, the methods return the input.

* The string or number is compared with the input. (See [`caseSensitive`](#casesensitive) option.)
* If the RegExp matched the input, `true` or `false` is returned.
* The function is called with the input, and if that function returned `true`, `true` or `false` is returned.

One of these or an Array that includes multiple things (or Array includes Array) can be specified.

For example:

```js
answer = readlineSync.question('You won\'t do it? :', {
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

### `caseSensitive`

**Type:** boolean  
**Default:** `false`

By default, the matching is case-insensitive when it compares the strings (i.e. `a` equals `A`). If `true` is specified, it doesn't ignore case (i.e. `a` is different from `A`).  
It have an effect on: [`limit`](#limit), [`trueValue`](#trueValue), [`falseValue`](#falseValue), [placeholder](#placeholder) `'${c1-c2}'`, and some [Utility Methods](#utility-methods).

### `keepWhitespace`

*For `question*` and `prompt*` methods only*  
**Type:** boolean  
**Default:** `false`

By default, the leading and trailing white spaces are removed from the input text. If `true` is specified, those are not removed.

### `encoding`

**Type:** string  
**Default:** `'utf8'`

Set the encoding method of input by user and output by readlineSync.

### `bufferSize`

**Type:** number  
**Default:** `1024`

When readlineSync reads from a console directly (without external program), a size `bufferSize` buffer is used. Even if the input by user exceeds it, it's usually no problem, because the buffer is used repeatedly. But some platforms's (e.g. Windows) console might not accept input that exceeds it. And set an enough size.

### `print`

**Type:** function or `undefined`  
**Default:** `undefined`

The specified function is called when any outputs. The function is given two arguments, `display` as the output text, and [`encoding`](#encoding) option.

For example:

* This is used to pass the plain texts to the Logger, when the texts are colored.

![sample](cl_01.png)

```js
var readlineSync = require('readline-sync'),
  chalk = require('chalk'),
  user, pw, command;

readlineSync.setDefaultOptions({
  print: function(display, encoding) {
    logger.log(chalk.stripColor(display)); // Remove control characters.
  }
});

console.log(chalk.black.bold.bgYellow('    Your Account    '));
user = readlineSync.question(chalk.gray.underline(' USER NAME ') + ' :');
pw = readlineSync.question(chalk.gray.underline(' PASSWORD  ') + ' :', {hideEchoBack: true});
// Authorization ...
console.log(chalk.green('Welcome, ' + user + '!'));

readlineSync.setDefaultOptions({prompt: chalk.red.bold('> ')});
command = readlineSync.prompt();
```

* Like `your-script >foo.log`, when the output is redirected to record those into a file, this is used to output the conversation to the file. That is, the conversation isn't outputted to `foo.log` without this code.

```js
readlineSync.setDefaultOptions({
  print: function(display, encoding) {
    console.log(display); // Output to STDOUT (foo.log)
  }
});
```

### `history`

*For `question*` and `prompt*` methods only*  
**Type:** boolean  
**Default:** `true`

readlineSync supports a history expansion feature that is similar to the history expansion in shell. If `false` is specified, this feature is disabled.  
It keeps the previous input only. That is, only `!!`, `!-1`, `!!:p` and `!-1:p` like bash or zsh etc. are supported.

* `!!` or `!-1`: Return the previous input.
* `!!:p` or `!-1:p`: Display the previous input but do not return it, and wait for reinput.

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
-- You said "hello"
> !!:p
hello
> bye
-- You said "bye"
```

### `cd`

*For `question*` and `prompt*` methods only*  
**Type:** boolean  
**Default:** `false`

readlineSync supports a changing the current working directory feature that is similar to the `cd` in shell. This helps the user when you let the user input the multiple local files. If `true` is specified, this feature is enabled.  
It supports `cd` and `pwd` commands.

* `cd <path>`: Changes the current working directory to `<path>`. The `<path>` can include `~` as the home directory.
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

## Utility Methods

These are convenient methods that is expanded [Basic Methods](#basic-methods) to be used easily.

### `questionEMail`

```js
email = readlineSync.questionEMail([query[, options]])
```

Display the `query` to the user if it's specified, and then accept only a valid e-mail address, and then return it after an Enter key was pressed.

The `query` is handled the same as that of the [`question`](#question) method.  
The default value of `query` is `'Input e-mail address :'`.

*Note:* The valid e-mail address requirement is a willful violation of [RFC5322](http://tools.ietf.org/html/rfc5322), this is defined in [HTML5](http://www.w3.org/TR/html5/forms.html). This works enough to prevent the user mistaking. If you want to change it, spefify [`limit`](#limit) option.

For example:

```js
email = readlineSync.questionEMail();
console.log('-- E-mail is ' + email);
```

```console
Input e-mail address :a@b
Input valid e-mail address, please.
Input e-mail address :mail@example.com
-- E-mail is mail@example.com
```

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#hideechoback) | `false` |
| [`limit`](#limit) | RegExp by [HTML5](http://www.w3.org/TR/html5/forms.html) |
| [`limitMessage`](#limitmessage) | `'Input valid e-mail address, please.'` |
| [`trueValue`](#truevalue) | `null` |
| [`falseValue`](#falsevalue) | `null` |

The following options work as shown in the [Options](#options) section.

<table>
<tr><td><a href="#mask"><code>mask</code></a></td><td><a href="#defaultinput"><code>defaultInput</code></a></td><td><a href="#casesensitive"><code>caseSensitive</code></a></td><td><a href="#encoding"><code>encoding</code></a></td><td><a href="#buffersize"><code>bufferSize</code></a></td></tr>
<tr><td><a href="#print"><code>print</code></a></td><td><a href="#history"><code>history</code></a></td></tr>
</table>

### `questionNewPassword`

```js
password = readlineSync.questionNewPassword([query[, options]])
```

Display the `query` to the user if it's specified, and then accept only a valid password, and then request same one again, and then return it after an Enter key was pressed.  
You can specify the valid password requirement to the options.

The `query` is handled the same as that of the [`question`](#question) method.  
The default value of `query` is `'Input new password :'`.

*Note:* Only the form of password is checked. Check it more if you want. For example, [zxcvbn](#https://github.com/dropbox/zxcvbn) is password strength estimation library.

For example:

```js
password = readlineSync.questionNewPassword();
console.log('-- Password is ' + password);
```

```console
Input new password :************
It can include: 0...9, A...Z, a...z, !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
The length able to be: 12...24
Input new password :************
Reinput same one to confirm it :************
It differs from first one. Hit only Enter key if you want to retry from first one.
Reinput same one to confirm it :************
-- Password is my_password_
```

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#hideechoback) | `true` |
| [`mask`](#mask) | `'*'` |
| [`limitMessage`](#limitmessage) | `'It can include: ${charlist}\nThe length able to be: ${length}'` |
| [`trueValue`](#truevalue) | `null` |
| [`falseValue`](#falsevalue) | `null` |
| [`caseSensitive`](#casesensitive) | `true` |

The following options work as shown in the [Options](#options) section.

<table>
<tr><td><a href="#defaultinput"><code>defaultInput</code></a></td><td><a href="#keepwhitespace"><code>keepWhitespace</code></a></td><td><a href="#encoding"><code>encoding</code></a></td><td><a href="#buffersize"><code>bufferSize</code></a></td><td><a href="#print"><code>print</code></a></td></tr>
</table>

And the following additional options are available.

##### `charlist`

**Type:** string  
**Default:** `'${!-~}'`

A string as the characters that can be included in the password. For example, if `'abc123'` is specified, the passwords that include any character other than these 6 characters are refused.  
The [placeholders](#placeholders) like `'${a-e}'` are replaced to the characters like `'abcde'`.  

##### `min`, `max`

**Type:** number  
**Default:** `min`: `12`, `max`: `24`

`min`: A number as a minimum length of the password.  
`max`: A number as a maximum length of the password.

##### `confirmMessage`

**Type:** string or others  
**Default:** `'Reinput same one to confirm it :'`

A message that let the user input the same password again.  
And it can include the [placeholders](#placeholders).  
If this is not string, it is converted to string (i.e. `toString` method is called).

##### `unmatchMessage`

**Type:** string or others  
**Default:** `'It differs from first one. Hit only Enter key if you want to retry from first one.'`

A warning message that is displayed when the second input did not match first one.  
This is converted the same as the [`confirmMessage`](#confirmmessage) option.

#### Additional Placeholders

The following additional [placeholder](#placeholders) paramerters are available.

##### `charlist`

A value from [`charlist`](#charlist) option that is converted to human readable as possible. (e.g. `'A...Z'`)

##### `length`

A value from [`min` and `max`](#min-max) option that is converted to human readable as possible. (e.g. `'12...24'`)

### `questionInt`

```js
numInt = readlineSync.questionInt([query[, options]])
```

Display the `query` to the user if it's specified, and then accept only an input that can be interpreted as an integer, and then return the number (not string) after an Enter key was pressed.  
This parses the input as possible by `parseInt()`. For example, it interprets `'   5   '`, `'5.6'`, `'005'`, `'5files'`, `'5kb'` and `'5px'` as `5`.

The `query` is handled the same as that of the [`question`](#question) method.

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`limitMessage`](#limitmessage) | `'Input valid number, please.'` |

The following options work as shown in the [Options](#options) section.

<table>
<tr><td><a href="#hideechoback"><code>hideEchoBack</code></a></td><td><a href="#mask"><code>mask</code></a></td><td><a href="#defaultinput"><code>defaultInput</code></a></td><td><a href="#casesensitive"><code>caseSensitive</code></a></td><td><a href="#keepwhitespace"><code>keepWhitespace</code></a></td></tr>
<tr><td><a href="#encoding"><code>encoding</code></a></td><td><a href="#buffersize"><code>bufferSize</code></a></td><td><a href="#print"><code>print</code></a></td><td><a href="#history"><code>history</code></a></td></tr>
</table>

### `questionFloat`

```js
numFloat = readlineSync.questionFloat([query[, options]])
```

Display the `query` to the user if it's specified, and then accept only an input that can be interpreted as a floating-point number, and then return the number (not string) after an Enter key was pressed.  
This parses the input as possible by `parseFloat()`. For example, it interprets `'   3.14   '`, `'003.1400'`, `'314e-2'` and `'3.14PI'` as `3.14`.

The `query` is handled the same as that of the [`question`](#question) method.

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`limitMessage`](#limitmessage) | `'Input valid number, please.'` |

The following options work as shown in the [Options](#options) section.

<table>
<tr><td><a href="#hideechoback"><code>hideEchoBack</code></a></td><td><a href="#mask"><code>mask</code></a></td><td><a href="#defaultinput"><code>defaultInput</code></a></td><td><a href="#casesensitive"><code>caseSensitive</code></a></td><td><a href="#keepwhitespace"><code>keepWhitespace</code></a></td></tr>
<tr><td><a href="#encoding"><code>encoding</code></a></td><td><a href="#buffersize"><code>bufferSize</code></a></td><td><a href="#print"><code>print</code></a></td><td><a href="#history"><code>history</code></a></td></tr>
</table>

### `questionPath`

```js
path = readlineSync.questionPath([query[, options]])
```

Display the `query` to the user if it's specified, and then accept only a valid local file or directory path, and then return an absolute path after an Enter key was pressed.  
The path can include `~` as the home directory.  
You can specify the valid local file or directory path requirement to the options. And you can make it create a new file or directory when it doesn't exist.  

It is recommended to use this method with the [`cd`](#cd) option. (Default: `true`)

The `query` is handled the same as that of the [`question`](#question) method.  
The default value of `query` is `'Input path (you can "cd" and "pwd") :'`.

For example:

```js
sourceFile = readlineSync.questionPath('Read from :', {isFile: true, exists: true});
console.log('-- sourceFile: ' + sourceFile);
saveDir = readlineSync.questionPath('Save to :', {isDirectory: true, create: true});
console.log('-- saveDir: ' + saveDir);
```

```console
Read from :~/fileA
No such file or directory: /home/user/fileA
Read from :pwd
/path/to/work
Read from :cd ~/project-1
Read from :fileA
-- sourceFile: /home/user/project-1/fileA
Save to :~/deploy/data
-- saveDir: /home/user/deploy/data
```

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#hideechoback) | `false` |
| [`limitMessage`](#limitmessage) | `'${error(\n)}Input valid path, please.${( Min:)minSize}${( Max:)maxSize}'` |
| [`history`](#history) | `true` |
| [`cd`](#cd) | `true` |

The following options work as shown in the [Options](#options) section.

<table>
<tr><td><a href="#mask"><code>mask</code></a></td><td><a href="#defaultinput"><code>defaultInput</code></a></td><td><a href="#casesensitive"><code>caseSensitive</code></a></td><td><a href="#encoding"><code>encoding</code></a></td><td><a href="#buffersize"><code>bufferSize</code></a></td></tr>
<tr><td><a href="#print"><code>print</code></a></td></tr>
</table>

And the following additional options are available.

*Note:* It does not check the coherency about a combination of the options as the path requirement. For example, the `{exists: false, isFile: true}` never check that it is a file because it is limited to the path that does not exist.

##### `exists`

**Type:** boolean or others  
**Default:** `true`

If `true` is specified, only a file or directory path that exists is accepted. If `false` is specified, only a file or directory path that *not* exists is accepted. In any other case, the existence is not checked.

##### `min`, `max`

**Type:** number or others  
**Default:** `undefined`

`min`: A number as a minimum size of the file that is accepted.  
`max`: A number as a maximum size of the file that is accepted.  
If it is not specified or `0` is specified, the size is not checked. (A size of directory is `0`.)

##### `isFile`, `isDirectory`

**Type:** boolean  
**Default:** `false`

`isFile`: If `true` is specified, only a file path is accepted.  
`isDirectory`: If `true` is specified, only a directory path is accepted.

##### `validate`

**Type:** function or `undefined`  
**Default:** `undefined`

If a function is specified, call it with a path that was input, and the input is accepted when it returned `true`.  
A path that was input is parsed before it is passed to the function. `~` is replaced to a home directory, and a path is converted to an absolute path.  
This is also a return value from this method.

##### `create`

**Type:** boolean  
**Default:** `false`

If `true` is specified, create a file or directory as the specified path when it doesn't exist. If `true` is specified to the [`isDirectory`](#isdirectory) option, create a directory, otherwise a file.  
It does not affect the existence check. Therefore, you can get a new file or directory path anytime by specifying: `{exists: false, create: true}`.

### `promptCL`

```js
argsArray = readlineSync.promptCL([commandHandler[, options]])
```

Display the prompt-sign (see [`prompt`](#options-prompt) option) to the user, and then consider the input as a command-line and parse it, and then return a result after an Enter key was pressed.
A return value is an Array that includes the tokens that was parsed. It parses the input from user as the command-line, and it interprets whitespaces, quotes, etc., and it splits it to tokens properly. Usually, a first element of the Array is command-name, and remaining elements are arguments.

For example:

```js
argsArray = readlineSync.promptCL();
console.log(argsArray.split('\n'));
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

#### `commandHandler`

By using the `commandHandler` argument, this method will come into its own. Specifying the Object to this argument has the more merit. And it has the more merit for [`promptCLLoop`](#promptclloop) method.  

If a function is specified to `commandHandler`, it is just called with a parsed Array as an argument list of the function. And `this` is a original input string, in the function.

For example: The following 2 codes work same except that `this` is enabled in the second one.

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

If an Object that has properties named as the command-name is specified, the command-name is interpreted, and a function as the value of matched property is called. A function is chosen properly by handling case of the command-name in accordance with the [`caseSensitive`](#casesensitive) option.  
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

For example: The following code works same to the above code.

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
And if the Object doesn't have a `_` property, any command that the matched property is not found in the Object are refused.

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

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#hideechoback) | `false` |
| [`limitMessage`](#limitmessage) | `'Requested command is not available.'` |
| [`caseSensitive`](#casesensitive) | `false` |
| [`history`](#history) | `true` |

The following options work as shown in the [Options](#options) section.

<table>
<tr><td><a href="#options-prompt"><code>prompt</code></a></td><td><a href="#mask"><code>mask</code></a></td><td><a href="#defaultinput"><code>defaultInput</code></a></td><td><a href="#encoding"><code>encoding</code></a></td><td><a href="#buffersize"><code>bufferSize</code></a></td></tr>
<tr><td><a href="#print"><code>print</code></a></td><td><a href="#cd"><code>cd</code></a></td></tr>
</table>

### `promptLoop`

```js
readlineSync.promptLoop(inputHandler[, options])
```

Display the prompt-sign (see [`prompt`](#options-prompt) option) to the user, and then call `inputHandler` function with the input from user after it has been typed and an Enter key was pressed. Do these repeatedly until `inputHandler` function returns `true`.

For example: The following 2 codes work same.

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

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#hideechoback) | `false` |
| [`trueValue`](#truevalue) | `null` |
| [`falseValue`](#falsevalue) | `null` |
| [`caseSensitive`](#casesensitive) | `false` |
| [`history`](#history) | `true` |

The other options work as shown in the [Options](#options) section.

### `promptCLLoop`

```js
readlineSync.promptCLLoop([commandHandler[, options]])
```

Execute [`promptCL`](#promptcl) method repeatedly until chosen [`commandHandler`](#commandhandler) returns `true`.  
The [`commandHandler`](#commandhandler) is a function that is called like:

```js
exit = allCommand(command, arg1, arg2, ...);
```

or an Object has the functions that is called like:

```js
exit = foundCommand(arg1, arg2, ...);
```

See [`promptCL`](#promptcl) method for details.  
This method looks like a combination of [`promptCL`](#promptcl) method and [`promptLoop`](#promptloop) method.

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

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#hideechoback) | `false` |
| [`limitMessage`](#limitmessage) | `'Requested command is not available.'` |
| [`caseSensitive`](#casesensitive) | `false` |
| [`history`](#history) | `true` |

The following options work as shown in the [Options](#options) section.

<table>
<tr><td><a href="#options-prompt"><code>prompt</code></a></td><td><a href="#mask"><code>mask</code></a></td><td><a href="#defaultInput"><code>defaultInput</code></a></td><td><a href="#encoding"><code>encoding</code></a></td><td><a href="#bufferSize"><code>bufferSize</code></a></td></tr>
<tr><td><a href="#print"><code>print</code></a></td><td><a href="#cd"><code>cd</code></a></td></tr>
</table>

### `promptSimShell`

```js
input = readlineSync.promptSimShell([options])
```

Display the prompt-sign that is similar to that of the user's shell to the user, and then return the input from user after it has been typed and an Enter key was pressed.  
This method displays the prompt-sign like:

On Windows:

```console
C:\Users\User\Path\To\Directory>
```

On others:

```console
user@host:~/path/to/directory$ 
```

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#hideechoback) | `false` |
| [`history`](#history) | `true` |

The other options other than [`prompt`](#options-prompt) option work as shown in the [Options](#options) section.

### `keyInYN`

```js
boolYesOrEmpty = readlineSync.keyInYN([query[, options]])
```

Display the `query` to the user if it's specified, and then return a boolean or an empty string immediately a key was pressed by the user, **without pressing an Enter key**. Note that the user has no chance to change the input.  
This method works like the `window.confirm` method of web browsers. A return value means "Yes" or "No" the user said. It differ depending on the pressed key:

* `Y`: `true`
* `N`: `false`
* other: `''`

The `query` is handled the same as that of the [`question`](#question) method.  
The default value of `query` is `'Are you sure? :'`.

A key other than `Y` and `N` is also accepted (If you want to know a user's wish explicitly, use [`keyInYNStrict`](#keyinynstrict) method). Therefore, if you let the user make an important decision (e.g. files are removed), check whether the return value is not **falsy**. That is, a default is "No".

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

#### Options

The following options work as shown in the [Options](#options) section.

<table>
<tr><td><a href="#encoding"><code>encoding</code></a></td><td><a href="#bufferSize"><code>bufferSize</code></a></td><td><a href="#print"><code>print</code></a></td></tr>
</table>

And the following additional option is available.

##### `guide`

**Type:** boolean  
**Default:** `true`

If `true` is specified, a string `'[y/n]'` as guide for the user is added to `query`. And `':'` is moved to the end of `query`, or it is added.

For example:

```js
readlineSync.keyInYN('Do you like me?'); // No colon
readlineSync.keyInYN('Really? :'); // Colon already exists
```

``` console
Do you like me? [y/n] :
Really? [y/n] :
```

### `keyInYNStrict`

```js
boolYes = readlineSync.keyInYNStrict([query[, options]])
```

Display the `query` to the user if it's specified, and then accept only `Y` or `N` key, and then return a boolean immediately it was pressed by the user, **without pressing an Enter key**. Note that the user has no chance to change the input.  
This method works like the `window.confirm` method of web browsers. A return value means "Yes" or "No" the user said. It differ depending on the pressed key:

* `Y`: `true`
* `N`: `false`

The `query` is handled the same as that of the [`question`](#question) method.  
The default value of `query` is `'Are you sure? :'`.

A key other than `Y` and `N` is not accepted. That is, this method has no default. Therefore, the user has to tell an own wish explicitly. If you want to know a user's wish easily, use [`keyInYN`](#keyinyn) method.

This method works same to [`keyInYN`](#keyinyn) method except that this accept only `Y` or `N` key. The options also work same to [`keyInYN`](#keyinyn) method.

### `keyInPause`

```js
readlineSync.keyInPause([query[, options]])
```

Display the `query` to the user if it's specified, and then just wait for a key to be pressed by the user.  
This method works like the `window.alert` method of web browsers. This is used to make the running of script pause and show something to the user, or wait for the user to be ready.  
By default, any key is accepted. You can change this behavior by specifying [`limit`](#limit) option  (e.g. accept only a Space Bar).

The `query` is handled the same as that of the [`question`](#question) method.  
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

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`limit`](#limit) | `null` |

The following options work as shown in the [Options](#options) section.

<table>
<tr><td><a href="#casesensitive"><code>caseSensitive</code></a></td><td><a href="#encoding"><code>encoding</code></a></td><td><a href="#buffersize"><code>bufferSize</code></a></td><td><a href="#print"><code>print</code></a></td></tr>
</table>

And the following additional option is available.

##### `guide`

**Type:** boolean  
**Default:** `true`

If `true` is specified, a string `'(Hit any key)'` as guide for the user is added to `query`.

For example:

```js
readlineSync.keyInYN('It\'s pausing now...');
```

``` console
It's pausing now... (Hit any key)
```

### `keyInSelect`

```js
index = readlineSync.keyInSelect([query[, options]])
```

Display the `query` to the user if it's specified, and then return the character as the key immediately it was pressed by the user, **without pressing an Enter key**. Note that the user has no chance to change the input.

The `query` is handled the same as that of the [`question`](#question) method.  
The default value of `query` is `'xxx'`.

For example:

```js
xxx
```

#### Options

The following options have independent default value. It is not affected by [Default Options](#options).

| Option Name       | Default Value |
|-------------------|---------------|
| [`hideEchoBack`](#hideechoback) | `false` |

The following options work as shown in the [Options](#options) section.

<table>
<tr><td><a href="#mask"><code>mask</code></a></td><td><a href="#encoding"><code>encoding</code></a></td><td><a href="#buffersize"><code>bufferSize</code></a></td><td><a href="#print"><code>print</code></a></td></tr>
</table>

And the following additional options are available.

##### `guide`

**Type:** boolean  
**Default:** `true`

xxx

##### `cancel`

**Type:** boolean  
**Default:** `true`

xxx

## Placeholders

## With Task Runner

The easy way to control the flow of task runner by the input from user:

* [Grunt](http://gruntjs.com/) plugin: [grunt-confirm](https://github.com/anseki/grunt-confirm)
* [gulp](http://gulpjs.com/) plugin: [gulp-confirm](https://github.com/anseki/gulp-confirm)

If you want to control the flow of task runner (e.g. [Grunt](http://gruntjs.com/)), call readlineSync in a task callback that is called by task runner. Then the flow of tasks is paused and it is controlled by user.

Example: by using [grunt-task-helper](https://github.com/anseki/grunt-task-helper)

```shell
$ grunt
Running "fileCopy" task
Files already exist:
  file-a.png
  file-b.js
Overwrite? (y/n) :y
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
          // Abort the task if user don't want.
          return readlineSync.question('Overwrite? (y/n) :')
            .toLowerCase() === 'y';
          // Or process.exit()
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

## Note

### Platforms

The TTY interfaces are different by platforms. If the platform doesn't support interactively reading from TTY, an error is thrown.

```js
try {
  answer = readlineSync.question('What is your favorite food? :');
} catch (e) {
  console.error(e);
  process.exit(1);
}
```

### Reading by External Program

readlineSync tries to read from a console by using the external program if it is needed (e.g. when the input is redirected on Windows XP). And if the running Node doesn't support the [Synchronous Process Execution](http://nodejs.org/api/child_process.html#child_process_synchronous_process_creation) (i.e. Node v0.10-), readlineSync uses "piping via files" for synchronous running.  
As everyone knows, "piping via files" is no good. It blocks the event loop and a process. It may make your script be slow.

Why did I choose it? :

+ The good modules (native addon) for synchronous execution exist. But node-gyp can't compile those in some platforms or Node versions.
+ I think that the security is important more than the speed. Some modules have problem about security. (Those don't protect data.) I think that the speed is not needed usually, because readlineSync is used while user types keys.

## DEPRECATED
