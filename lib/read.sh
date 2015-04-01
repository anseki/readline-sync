# readlineSync
# https://github.com/anseki/readline-sync
#
# Copyright (c) 2015 anseki
# Licensed under the MIT license.

# getopt(s)
while [ $# -ge 1 ]; do
  arg="$(printf '%s' "$1" | grep -E '^-+[^-]+$' | tr '[A-Z]' '[a-z]' | tr -d '-')"
  case "$arg" in
    'display')          shift; options_display="$1";;
    'keyin')            options_keyIn='true';;
    'noechoback')       options_noEchoBack='true';;
    'mask')             shift; options_mask="$1";;
    'exclude')          shift; options_exclude="$1";;
    'cs')               options_cs='true';;
    'encoded')          options_encoded='true';;
  esac
  shift
done

reset_tty() {
  if [ -n "$save_tty" ]; then stty "$save_tty"; fi
}
trap 'reset_tty' EXIT
save_tty="$(stty -g)"

write_tty() { # 2nd arg: enable escape sequence
  if [ -n "$2" ]; then
    printf '%b' "$1" >/dev/tty
  else
    printf '%s' "$1" >/dev/tty
  fi
  is_inputline='true'
}

replace_allchars() { (
  text=''
  for i in $(seq 1 ${#1})
  do
    text="$text$2"
  done
  printf '%s' "$text"
) }

[ -z "$options_noEchoBack" ] && [ -z "$options_keyIn" ] && is_cooked='true'

if [ -n "$options_display" ]; then
  write_tty "$options_display"
  options_display=''
fi

if [ -n "$is_cooked" ]; then
  stty --file=/dev/tty cooked 2>/dev/null || \
    stty -F /dev/tty cooked 2>/dev/null || \
    stty -f /dev/tty cooked || exit $?
else
  stty --file=/dev/tty raw -echo 2>/dev/null || \
    stty -F /dev/tty raw -echo 2>/dev/null || \
    stty -f /dev/tty raw -echo || exit $?
fi

[ -n "$options_keyIn" ] && req_size=1

while :
do
  if [ -z "$is_cooked" ]; then
    chunk="$(dd if=/dev/tty bs=1 count=1 2>/dev/null)"
    chunk="$(printf '%s' "$chunk" | tr -d '\r\n')"
    [ -z "$chunk" ] && at_eol='true' # NL or empty-text was input
  else
    IFS= read -r chunk </dev/tty || exit $?
    chunk="$(printf '%s' "$chunk" | tr -d '\r\n')"
    at_eol='true'
  fi

  # other ctrl-chars
  # chunk="$(printf '%s' "$chunk" | tr -d '\00-\10\13\14\16-\37\177')"
  # for System V
  chunk="$(printf '%s' "$chunk" | tr -d '\00\01\02\03\04\05\06\07\10\13\14\16\17\20\21\22\23\24\25\26\27\30\31\32\33\34\35\36\37\177')"

  if [ -n "$chunk" ] && [ -z "$is_cooked" ]; then
    if [ -z "$options_noEchoBack" ]; then
      write_tty "$chunk"
    elif [ -n "$options_mask" ]; then
      write_tty "$(replace_allchars "$chunk" "$options_mask")"
    fi
  fi

  input="$input$chunk"
  if [ -n "$at_eol" ] || \
    ( [ -n "$options_keyIn" ] && [ ${#input} -ge $req_size ] ); then break; fi
done

if [ -z "$is_cooked" ] && ! ( [ -n "$options_keyIn" ] && [ -z "$is_inputline" ] ); then
  write_tty '\r\n' 'true'
fi

printf "'%s'" "$input"

exit 0
