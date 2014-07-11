# readlineSync

Synchronous [Readline](http://nodejs.org/api/readline.html) for interactively running.  
The interface is used with process.stdin and process.stdout in order to accept user input.

## Example

```js
var readlineSync = require('readline-sync');
var answer = readlineSync.question('What is your favorite food? :');
console.log('Oh, so your favorite food is ' + answer);
```

## Installation

```
npm install readline-sync
```

## Usage

### setPrompt

```js
readlineSync.setPrompt(prompt)
```

Sets the prompt, for example when you run `node` on the command line, you see `> `, which is node's prompt.

### prompt

```js
line = readlineSync.prompt([options])
```

Readies readline for input from the user, putting the current `setPrompt` options on a new line, giving the user a new spot to write.  
If `{noEchoBack: true}` is specified to `options`, echo back is avoided. It is used to hide the password which is typed by user on screen. *See [Note](#note) for security.*

### question

```js
line = readlineSync.question(query[, options])
```

Displays the `query` to the user, and then returns the user's response after it has been typed.  
If `{noEchoBack: true}` is specified to `options`, echo back is avoided. It is used to hide the password which is typed by user on screen. *See [Note](#note) for security.*

### setEncoding

```js
readlineSync.setEncoding(encoding)
```

Set the encoding method of input (user's response) and output (`prompt`). Defaults to 'utf8'.

### setPrint

```js
readlineSync.setPrint(funcPrint)
```

The specified Function is called when any texts are outputed (`prompt` and `question`). Two arguments the text which is outputed and `encoding` are passed. Defaults to `undefined`.

![sample](cl_01.png)

For example, this is used to pass plain texts to Logger, when prompt texts are colored.

```js
var readlineSync = require('readline-sync');
  user, pw, cmd;
require('colors');

readlineSync.setPrint(function(display, encoding) {
  logger.log(display.stripColors); // remove control characters
});

console.log('Your account required.'.grey);
user = readlineSync.question('USER NAME'.white.inverse + ': ');
pw = readlineSync.question('PASSWORD'.white.inverse + ': ', {noEchoBack: true});
// Authorization ...
console.log(('Welcome, ' + user + '!').green.bold);

readlineSync.setPrompt('> '.bold.red);
cmd = readlineSync.prompt();
```

## <a name ="note">Note</a>
+ The your Node and OS may not support interactively reading from stdin. The stdin interfaces are different by platforms.  
If in those platforms, an error is thrown.

```js
try {
  answer = readlineSync.question('What is your favorite food? :');
} catch (e) {
  console.error(e);
  process.exit(1);
}
```

+ If `options.noEchoBack` is used, the text that input by user is saved to temporary file (e.g. `/tmp/readline-sync.stdout`). This file is removed immediately after reading is done, but you have to be careful about it because this text is *plain*. Removing the file might fail, or the file might be peeped before it is removed.

## Release History
 * 2014-07-12			v0.4.1			`setPrompt()` and `question()` accept the value which is not string too (e.g. number, Date, Object, etc.).
 * 2014-07-12			v0.4.0			Add `options.noEchoBack`.
 * 2014-07-12			v0.3.0			Add `setPrint()`.
 * 2014-06-27			v0.2.3			Add alternative reading via shell on the environment which don't support interactively reading.
 * 2013-12-18			v0.2.2			Error handle for the environment which don't support interactively reading from stdin.
 * 2013-08-30			v0.2.0			Rewrite exporting methods.
 * 2013-08-29			v0.1.0			Initial release.
