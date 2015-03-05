# Silent Read
read_s() {
  stty --file=/dev/tty -echo echonl 2>/dev/null || \
    stty -F /dev/tty -echo echonl 2>/dev/null || \
    stty -f /dev/tty -echo echonl || exit 1
  IFS= read -r INPUT </dev/tty || exit 1
  stty --file=/dev/tty echo -echonl 2>/dev/null || \
    stty -F /dev/tty echo -echonl 2>/dev/null || \
    stty -f /dev/tty echo -echonl || exit 1
}

if [ "$1" = "noechoback" ]; then
  # Try `-s` option. *ksh have it that not `--silent`. Therefore, don't try it.
  if [ -n "$BASH_VERSION" ] || [ -n "$ZSH_VERSION" ]; then
    IFS= read -rs INPUT </dev/tty 2>/dev/null && printf '\n' >/dev/tty || read_s
  else
    read_s
  fi
else
  IFS= read -r INPUT </dev/tty || exit 1
fi
printf '%s' "'$INPUT'"
exit 0
