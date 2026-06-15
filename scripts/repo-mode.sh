#!/usr/bin/env bash
# Reversible toggle: umbrella monorepo vs inner app repos.
# Run from anywhere; always operates on workspace root (parent of scripts/).
set -euo pipefail
cd "$(dirname "$0")/.."
INNERS=(BookMyBarber-bk BookMyBarber-admin BookMyBarber-App)
STATE_FILE="repos-mngmnt.txt"

write_mode_marker() {
  local mode="$1"
  if [ -f "$STATE_FILE" ]; then
    if grep -q '^CURRENT_MODE=' "$STATE_FILE" 2>/dev/null; then
      sed -i "s/^CURRENT_MODE=.*/CURRENT_MODE=${mode}/" "$STATE_FILE"
    else
      printf '\nCURRENT_MODE=%s\n' "$mode" >>"$STATE_FILE"
    fi
  fi
}

to_mono() {
  [ -d ".git-umbrella" ] && mv ".git-umbrella" ".git"
  for d in "${INNERS[@]}"; do
    [ -d "$d/.git" ] && mv "$d/.git" "$d/.git-inner"
  done
  write_mode_marker "mono"
  echo "MODE=mono (umbrella active)"
}

to_inner() {
  [ -d ".git" ] && mv ".git" ".git-umbrella"
  for d in "${INNERS[@]}"; do
    [ -d "$d/.git-inner" ] && mv "$d/.git-inner" "$d/.git"
  done
  write_mode_marker "inner"
  echo "MODE=inner (app repos active)"
}

status() {
  [ -d ".git" ] && echo "umbrella: ACTIVE (.git)" || echo "umbrella: parked (.git-umbrella)"
  for d in "${INNERS[@]}"; do
    [ -d "$d/.git" ] && echo "$d: ACTIVE (.git)" || echo "$d: parked (.git-inner)"
  done
  if [ -f "$STATE_FILE" ] && grep -q '^CURRENT_MODE=' "$STATE_FILE" 2>/dev/null; then
    grep '^CURRENT_MODE=' "$STATE_FILE"
  fi
}

case "${1:-status}" in
  mono) to_mono ;;
  inner) to_inner ;;
  status) status ;;
  *)
    echo "usage: repo-mode.sh [mono|inner|status]"
    exit 1
    ;;
esac
