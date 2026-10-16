#!/usr/bin/env bash
# Generates all placeholder media with ffmpeg: synthetic gradients + labels, synthetic "speech-like" audio.
set -euo pipefail

OUT="$(cd "$(dirname "$0")/.." && pwd)/public/media"
FONT="/System/Library/Fonts/Supplemental/Courier New.ttf"
mkdir -p "$OUT/tiles"

# Amplitude-modulated tones + a little noise: gives the analyser a lively, speech-ish spectrum.
voice() {
  local f1=$1 f2=$2 rate=$3
  echo "0.35*sin(2*PI*${f1}*t)*(0.5+0.5*sin(2*PI*${rate}*t))+0.25*sin(2*PI*${f2}*t)*(0.5+0.5*sin(2*PI*(${rate}*1.7)*t+1))+0.12*sin(2*PI*(${f2}*2.5)*t)*abs(sin(2*PI*0.4*t))+0.05*(random(0)*2-1)"
}

label() {
  local text=$1 size=$2
  echo "drawtext=fontfile='${FONT}':text='${text}':fontcolor=white@0.85:fontsize=${size}:x=(w-text_w)/2:y=(h-text_h)/2"
}

# Home loop: 5 segments that line up with the AudioGraph "loops" timestamps in index.html.
segments=(
  "0:11:#1944a7:#ff531c:Test Speaker A:180:520:3.1"
  "11:13:#df0e27:#ffd6c4:Ambient 1:140:410:2.3"
  "24:12:#ffd02a:#1944a7:Ambient 2:220:690:4.2"
  "36:25:#049ea8:#df0e27:Test Speaker B:160:480:3.6"
  "61:12:#a75d19:#c5c5c5:Test Speaker C:200:600:2.8"
)
parts=()
for seg in "${segments[@]}"; do
  IFS=: read -r start dur c0 c1 text f1 f2 rate <<<"$seg"
  part="$OUT/_home_$start.mp4"
  ffmpeg -y -loglevel error \
    -f lavfi -i "gradients=s=1280x720:c0=${c0}:c1=${c1}:speed=0.02:d=${dur}" \
    -f lavfi -i "aevalsrc='$(voice "$f1" "$f2" "$rate")':s=44100:d=${dur}" \
    -vf "$(label "$text" 72)" -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 28 -c:a aac -b:a 96k -shortest "$part"
  parts+=("$part")
done
printf "file '%s'\n" "${parts[@]}" > "$OUT/_list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/_list.txt" -c copy "$OUT/home-loop.mp4"
ffmpeg -y -loglevel error -ss 1 -i "$OUT/home-loop.mp4" -frames:v 1 -q:v 4 "$OUT/home-loop.jpg"
rm -f "$OUT"/_home_*.mp4 "$OUT/_list.txt"

# Interview tiles: 9 muted hover loops + posters.
colors=("#1944a7:#a6a6a6" "#df0e27:#ffb3a9" "#ffd02a:#ff773d" "#049ea8:#ffd6c4" "#4660ad:#a75d19" "#ff531c:#1c1c1c" "#c5c5c5:#1944a7" "#a75d19:#ffd6c4" "#2d2b2b:#df0e27")
for i in "${!colors[@]}"; do
  n=$((i + 1))
  IFS=: read -r c0 c1 <<<"${colors[$i]}"
  ffmpeg -y -loglevel error -f lavfi -i "gradients=s=856x570:c0=${c0}:c1=${c1}:speed=0.05:d=6" \
    -vf "$(label "Test Clip ${n}" 48)" -an -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 30 "$OUT/tiles/clip-$n.mp4"
  ffmpeg -y -loglevel error -i "$OUT/tiles/clip-$n.mp4" -frames:v 1 -q:v 4 "$OUT/tiles/clip-$n.jpg"
done

# Full interview: 3 minutes with audio, plus poster.
ffmpeg -y -loglevel error \
  -f lavfi -i "testsrc2=s=1280x720:d=180,hue=s=0.35" \
  -f lavfi -i "aevalsrc='$(voice 170 510 3.3)':s=44100:d=180" \
  -vf "$(label "Test Interview" 64)" -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 30 -c:a aac -b:a 96k -shortest "$OUT/interview.mp4"
ffmpeg -y -loglevel error -ss 2 -i "$OUT/interview.mp4" -frames:v 1 -q:v 4 "$OUT/interview.jpg"

echo "Media written to $OUT"
