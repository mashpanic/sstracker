#!/usr/bin/env bash
# Keep a copy of every distinct version of the in-progress run save while you play,
# so the pre-generated run maps (minor boss, wave sets, minor nodes) can be studied
# over many runs. Run it in the account that plays the game, in a Terminal window,
# and leave it open (Ctrl-C to stop). Needs bash 3.2+ (no 4+ features used).
#
#   bash extraction/mt2_snapshot_saves.sh [OUTDIR]       # default: ~/mt2-snapshots
#
# Then copy OUTDIR into the project (git-ignored) and run
#   python3 extraction/mt2_decode_map.py --stats OUTDIR
SAVES="$HOME/Library/Application Support/Shiny Shoe/MonsterTrain2/saves"
OUT="${1:-$HOME/mt2-snapshots}"
mkdir -p "$OUT"
last=""
echo "watching $SAVES -> $OUT (Ctrl-C to stop)"
while true; do
  for f in save-regionRun.json save-regionRun.json.backup; do
    p="$SAVES/$f"
    [ -f "$p" ] || continue
    sum=$(cksum < "$p")
    case "$last" in *"|$f:$sum|"*) continue;; esac
    last="$last|$f:$sum|"
    cp "$p" "$OUT/$(date +%Y%m%d-%H%M%S)-$f"
    echo "$(date +%H:%M:%S) saved $f"
  done
  sleep 5
done
