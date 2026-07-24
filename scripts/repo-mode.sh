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

# Git Bash on Windows often cannot mv .git (Permission denied when IDE/shell holds a lock).
# PowerShell Rename-Item works reliably for the same operation.
move_git_dir() {
  local src="$1"
  local dest="$2"
  [ -e "$src" ] || return 0
  if [ -e "$dest" ]; then
    echo "error: $dest already exists" >&2
    exit 1
  fi

  local new_name
  new_name="$(basename "$dest")"

  if command -v powershell.exe >/dev/null 2>&1 && [[ "$(uname -s 2>/dev/null)" =~ MINGW|MSYS|CYGWIN ]]; then
    local win_src
    win_src="$(cd "$(dirname "$src")" && pwd -W)/$(basename "$src")"
    win_src="${win_src//\\/\/}"
    if ! powershell.exe -NoProfile -Command "Rename-Item -LiteralPath '$win_src' -NewName '$new_name' -Force"; then
      echo "error: could not rename $src -> $dest" >&2
      echo "hint: close Cursor/IDE Git panels, then retry the repo-mode command" >&2
      exit 1
    fi
    return 0
  fi

  mv "$src" "$dest"
}

to_mono() {
  move_git_dir ".git-umbrella" ".git"
  for d in "${INNERS[@]}"; do
    move_git_dir "$d/.git" "$d/.git-inner"
  done
  write_mode_marker "mono"
  echo "MODE=mono (umbrella active)"
}

to_inner() {
  move_git_dir ".git" ".git-umbrella"
  for d in "${INNERS[@]}"; do
    move_git_dir "$d/.git-inner" "$d/.git"
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
