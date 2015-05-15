# readlineSync

## <a name="deprecated_methods_and_options"></a>Deprecated Methods and Options

The readlineSync current version is fully compatible with older version.  
The following methods and options are deprecated.

### <a name="deprecated_methods_and_options-setprint_method"></a>`setPrint` method

Use the [`print`](#basic_options-print) option.  
For the [Default Options](#basic_options), use:

```js
readlineSync.setDefaultOptions({print: value});
```

instead of:

```js
readlineSync.setPrint(value);
```

### <a name="deprecated_methods_and_options-setprompt_method"></a>`setPrompt` method

Use the [`prompt`](#basic_options-prompt) option.  
For the [Default Options](#basic_options), use:

```js
readlineSync.setDefaultOptions({prompt: value});
```

instead of:

```js
readlineSync.setPrompt(value);
```

### <a name="deprecated_methods_and_options-setencoding_method"></a>`setEncoding` method

Use the [`encoding`](#basic_options-encoding) option.  
For the [Default Options](#basic_options), use:

```js
readlineSync.setDefaultOptions({encoding: value});
```

instead of:

```js
readlineSync.setEncoding(value);
```

### <a name="deprecated_methods_and_options-setmask_method"></a>`setMask` method

Use the [`mask`](#basic_options-mask) option.  
For the [Default Options](#basic_options), use:

```js
readlineSync.setDefaultOptions({mask: value});
```

instead of:

```js
readlineSync.setMask(value);
```

### <a name="deprecated_methods_and_options-setbuffersize_method"></a>`setBufferSize` method

Use the [`bufferSize`](#basic_options-buffersize) option.  
For the [Default Options](#basic_options), use:

```js
readlineSync.setDefaultOptions({bufferSize: value});
```

instead of:

```js
readlineSync.setBufferSize(value);
```

### <a name="deprecated_methods_and_options-noechoback_option"></a>`noEchoBack` option

Use [`hideEchoBack`](#basic_options-hideechoback) option instead of it.

### <a name="deprecated_methods_and_options-notrim_option"></a>`noTrim` option

Use [`keepWhitespace`](#basic_options-keepwhitespace) option instead of it.
