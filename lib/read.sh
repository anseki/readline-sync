if [ "$1" = "noechoback" ]; then
  stty --file=/dev/tty -echo echonl || stty -F /dev/tty -echo echonl || stty -f /dev/tty -echo echonl || exit 1
  read LINE </dev/tty
  stty --file=/dev/tty echo -echonl || stty -F /dev/tty echo -echonl || stty -f /dev/tty echo -echonl
  # printf '\n' >/dev/tty
else
  read LINE </dev/tty
fi
printf '%s' "$LINE"
exit 0
