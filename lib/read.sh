silentRead() {
  # `typeset` doesn't work in `func()` of ksh.
  # `function fnc` for local-var of ksh is not compatible.
  # Therefore, `_input` is not local-var on ksh.
  local _input="" 2>/dev/null || typeset _input=""
  stty --file=/dev/tty -echo echonl 2>/dev/null || \
    stty -F /dev/tty -echo echonl 2>/dev/null || \
    stty -f /dev/tty -echo echonl 2>/dev/null || \
    exit 1
  IFS= read -r _input </dev/tty
  stty --file=/dev/tty echo -echonl 2>/dev/null || \
    stty -F /dev/tty echo -echonl 2>/dev/null || \
    stty -f /dev/tty echo -echonl 2>/dev/null
  printf '%s' "$_input"
}

if [ "$1" = "noechoback" ]; then
  # Try `-s` option. *ksh have it that not `--silent`. Therefore, don't try it.
  if [ -n "$BASH_VERSION" ] || [ -n "$ZSH_VERSION" ]; then
    IFS= read -rs INPUT </dev/tty 2>/dev/null || INPUT=`silentRead` || exit 1
    printf '\n' >/dev/tty
  else
    INPUT=`silentRead` || exit 1
  fi
else
  IFS= read -r INPUT </dev/tty
fi
printf '%s' "'$INPUT'"
exit 0
