if [ "$1" = "noechoback" ]; then
  stty --file=/dev/tty -echo echonl 2>/dev/null || \
    stty -F /dev/tty -echo echonl 2>/dev/null || \
    stty -f /dev/tty -echo echonl 2>/dev/null || \
    exit 1
  IFS= read -r INPUT </dev/tty
  stty --file=/dev/tty echo -echonl 2>/dev/null || \
    stty -F /dev/tty echo -echonl 2>/dev/null || \
    stty -f /dev/tty echo -echonl 2>/dev/null
  # printf '\n' >/dev/tty
else
  IFS= read -r INPUT </dev/tty
fi
printf '%s' "'$INPUT'"
exit 0
