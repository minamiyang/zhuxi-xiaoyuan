#!/bin/zsh
cd -- "${0:A:h}"
if curl -fs 'http://127.0.0.1:8769/preview/' >/dev/null 2>&1; then
  open 'http://127.0.0.1:8769/preview/'
  exit 0
fi
python3 -m http.server 8769 --bind 127.0.0.1 &
preview_pid=$!
trap 'kill "$preview_pid" 2>/dev/null' EXIT INT TERM
sleep 0.6
open 'http://127.0.0.1:8769/preview/'
wait "$preview_pid"
