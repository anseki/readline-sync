if [ "$1" = "noechoback" ]; then
  stty --file=/dev/tty -echo echonl || stty -F /dev/tty -echo echonl || stty -f /dev/tty -echo echonl || exit 1
  IFS= read -r INPUT </dev/tty
  stty --file=/dev/tty echo -echonl || stty -F /dev/tty echo -echonl || stty -f /dev/tty echo -echonl
  # printf '\n' >/dev/tty
else
  IFS= read -r INPUT </dev/tty
fi
printf '%s' "'$INPUT'"
exit 0
