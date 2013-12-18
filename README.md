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
npm install -g readline-sync
```

## Usage

### setPrompt

```js
readlineSync.setPrompt(prompt)
```

Sets the prompt, for example when you run `node` on the command line, you see `> `, which is node's prompt.

### prompt

```js
line = readlineSync.prompt()
```

Readies readline for input from the user, putting the current `setPrompt` options on a new line, giving the user a new spot to write.

### question

```js
line = readlineSync.question(query)
```

Displays the `query` to the user, and then returns the user's response after it has been typed.

### setEncoding

```js
readlineSync.setPrompt(encoding)
```

Set the encoding method of input (user's response) and output (`prompt`). Defaults to 'utf8'.

## Note
The your Node and OS may not support interactively reading from stdin. The stdin interfaces are different by platforms.  
If in those platforms, an error is thrown.

```js
try {
  answer = readlineSync.question('What is your favorite food? :');
} catch (e) {
  console.error(e);
  process.exit(1);
}
```

## Release History
 * 2013-12-18			v0.2.2			Error handle for the environment which don't support interactively reading from stdin.
 * 2013-08-30			v0.2.0			Rewrite exporting methods.
 * 2013-08-29			v0.1.0			Initial release.
