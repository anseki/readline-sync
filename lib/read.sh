if [ "$1" = "noechoback" ]; then
  stty -F /dev/tty -echo echonl
  read LINE </dev/tty
  stty -F /dev/tty echo -echonl
  # printf '\n' >/dev/tty
else
  read LINE </dev/tty
fi
printf '%s' "$LINE"
exit 0
