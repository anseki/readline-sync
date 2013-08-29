# readline-sync

Synchronous [Readline.question](http://nodejs.org/api/readline.html#readline_rl_question_query_callback) for interactively running.

## Example

```js
var readlineSync = require('readline-sync');

var answer = readlineSync('What is your favorite food? :');
console.log('Oh, so your favorite food is ' + answer);
```

## Installation

```
npm install -g readline-sync
```

## Usage

```js
answer = readlineSync([prompt[, encoding]])
```

`require('readline-sync')` returns a Function. Displays the `prompt` to the user if it is given, and then returns the user's response after it has been typed.  
`encoding` specify encoding method of input (user's response) and output (`prompt`). Defaults to 'utf8'.

## Release History
 * 2013-08-29			v0.1.0			Initial release.
