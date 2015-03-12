# readlineSync

Synchronous [Readline](http://nodejs.org/api/readline.html) for interactively running to have a conversation with the user via a console(TTY).

## Example

```js
var readlineSync = require('readline-sync');

var userName = readlineSync.question('May I have your name? :'); // Wait for user's response.
var favFood = readlineSync.question('Hi ' + userName + '! What is your favorite food? :');

console.log('Oh, ' + userName + ' likes ' + favFood + '!');
```

```
May I have your name? :AnSeki
Hi AnSeki! What is your favorite food? :chocolate
Oh, AnSeki likes chocolate!
```

## Installation

```
npm install readline-sync
```

## Methods

### question

```js
answer = readlineSync.question([query[, options]])
```

Display the `query` to the user, and then return the user's response after it has been typed and Enter key was pressed.  
You can specify `options` (see [Options](#options)). **If the user inputs the secret text (e.g. password), you should consider `noEchoBack` option.**

The `query` may be string, or may not be (e.g. number, Date, Object, etc.). This is converted to string (i.e. `toString` method is called) before it is displayed.

### prompt

```js
input = readlineSync.prompt([options])
```

Display the current prompt (See `setPrompt` method) to the user, and then return the user's response after it has been typed and Enter key was pressed.  
You can specify `options` (see [Options](#options)). **If the user inputs the secret text (e.g. password), you should consider `noEchoBack` option.**

### setPrompt

```js
currentPrompt = readlineSync.setPrompt([newPrompt])
```

Set the prompt, for example when you run `node` on the command line, you see `> `, which is node's prompt. The default is `'> '`. (See `prompt` method)

The `newPrompt` may be string, or may not be (e.g. number, Date, Object, etc.). This is converted to string (i.e. `toString` method is called) before it is displayed every time.  
For example, `[foo-directory]#` like a bash shell that show the current directory.

```js
// Simple Object that has toString method.
readlineSync.setPrompt({
  toString: function() {
    return '[' + require('path').basename(process.cwd()) + ']# '; // Get and show current directory.
  }
})
```

### setEncoding

```js
currentEncoding = readlineSync.setEncoding([newEncoding])
```

Set the encoding method of input (user's response) and output (`prompt` method and `question` method). The default is `'utf8'`.

### setPrint

```js
readlineSync.setPrint([callback])
```

The specified `callback` Function is called when any outputs (`prompt` method and `question` method).  
The `callback` is given two arguments the output text and `encoding`.

![sample](cl_01.png)

For example, this is used to pass plain texts to the Logger, when texts are colored.

```js
var readlineSync = require('readline-sync'),
  user, pw, command;
require('colors');

readlineSync.setPrint(function(display, encoding) {
  logger.log(display.stripColors); // Remove control characters.
});

console.log('Your account required.'.grey);
user = readlineSync.question('USER NAME'.white.inverse + ': ');
pw = readlineSync.question('PASSWORD'.white.inverse + ': ', {noEchoBack: true});
// Authorization ...
console.log(('Welcome, ' + user + '!').green.bold);

readlineSync.setPrompt('> '.bold.red);
command = readlineSync.prompt();
```

### setBufferSize

```js
currentBufferSize = readlineSync.setBufferSize([newBufferSize])
```

When readlineSync reads from TTY directly (without reading by shell), a size `newBufferSize` buffer is used. Even if the user's response exceeds it, it's usually no problem, because the buffer is used repeatedly. But, some platforms's TTY may not accept user's response that is too long. And set an enough size. The default is `1024`.

## Options

An `options` Object can be specified to `prompt` method and `question` method. This Object can have following properties.

### noEchoBack

Type: Boolean  
Default: `false`

If `true` is specified, echo back is avoided. It is used to hide the secret text (e.g. password) which is typed by user on screen.  
For example:

```js
password = readlineSync.question('PASSWORD :', {noEchoBack: true});
console.log('Login ...');
```

The typed text is not shown on screen.

```
PASSWORD :
Login ...
```

### noTrim

Type: Boolean  
Default: `false`

By default, the leading and trailing white spaces are removed from typed text. If `true` is specified, those are not removed.

## With Task Runner

The easy way to control the flow of task runner by the user's response:
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

### Reading by shell

readlineSync tries reading from TTY by shell if it is needed. And if the running Node doesn't support the [Synchronous Process Execution](http://nodejs.org/api/child_process.html#child_process_synchronous_process_creation) (i.e. Node v0.10-), it uses "piping via files" for synchronous running.  
As everyone knows, "piping via files" is no good. It blocks the event loop and a process. It may make your script be slow.

Why did I choose it? :

+ The good modules (native addon) for synchronous execution exist. But node-gyp can't compile those in some platforms or Node versions.
+ I think that the security is important more than the speed. Some modules have problem about security. (Those don't protect data.) I think that the speed is not needed usually, because readlineSync is used while user types keys.

## Release History
 * 2015-02-22           v0.6.0          Add `setBufferSize()`.
 * 2015-02-12           v0.5.5          Support the Synchronous Process Execution of Node v0.12(v0.11).
 * 2015-01-27           v0.5.0          Add `options.noTrim`.
 * 2014-07-12           v0.4.0          Add `options.noEchoBack`.
 * 2014-07-12           v0.3.0          Add `setPrint()`.
 * 2013-08-30           v0.2.0          Rewrite exporting methods.
 * 2013-08-29           v0.1.0          Initial release.
