silentRead() {
  stty --file=/dev/tty -echo echonl 2>/dev/null || \
    stty -F /dev/tty -echo echonl 2>/dev/null || \
    stty -f /dev/tty -echo echonl 2>/dev/null || \
    exit 1
  IFS= read -r INPUT </dev/tty
  stty --file=/dev/tty echo -echonl 2>/dev/null || \
    stty -F /dev/tty echo -echonl 2>/dev/null || \
    stty -f /dev/tty echo -echonl 2>/dev/null
}

if [ "$1" = "noechoback" ]; then
  # Try `-s` option. *ksh have it that not `--silent`. Therefore, don't try it.
  if [ -n "$BASH_VERSION" ] || [ -n "$ZSH_VERSION" ]; then
    IFS= read -rs INPUT </dev/tty 2>/dev/null || silentRead
    printf '\n' >/dev/tty
  else
    silentRead
  fi
else
  IFS= read -r INPUT </dev/tty 2>/dev/null || exit 1
fi
printf '%s' "'$INPUT'"
exit 0
