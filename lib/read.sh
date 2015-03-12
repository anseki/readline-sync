# Silent Read : emulate `read -s` of bash/zsh
read_s() {
  stty --file=/dev/tty -echo echonl 2>/dev/null || \
    stty -F /dev/tty -echo echonl 2>/dev/null || \
    stty -f /dev/tty -echo echonl || exit 1
  IFS= read -r input </dev/tty || exit 1
  stty --file=/dev/tty echo -echonl 2>/dev/null || \
    stty -F /dev/tty echo -echonl 2>/dev/null || \
    stty -f /dev/tty echo -echonl || exit 1
}

# getopt(s)
while [ $# -ge 1 ]; do
  case "$1" in
    "--noechoback")     noechoback=1;;
    "--keyin")          keyin=1;;
    "--display")        shift; display=$1;;
  esac
  shift
done

if [ -n "$display" ]; then
  printf '%s' "$display" >/dev/tty
fi

if [ "$noechoback" = "1" ]; then
  # Try `-s` option. *ksh have it that not `--silent`. Therefore, don't try it.
  if [ -n "$BASH_VERSION" ] || [ -n "$ZSH_VERSION" ]; then
    IFS= read -rs input </dev/tty 2>/dev/null && printf '\n' >/dev/tty || read_s
  else
    read_s
  fi
else
  IFS= read -r input </dev/tty || exit 1
fi
printf '%s' "'$input'"

exit 0
