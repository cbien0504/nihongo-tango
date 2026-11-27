#!/usr/bin/env bash
# Icons of the app installed on the home screen of a phone (frontend/public): 語 in white on the
# brand gradient. Full-bleed squares: iOS and Android round the corners themselves.
# Needs ImageMagick and the font Noto Serif CJK JP. Run from anywhere: scripts/build_icons.sh
set -euo pipefail
cd "$(dirname "$0")/../frontend/public"
font=$(fc-match -f '%{file}' 'Noto Serif CJK JP:bold')

draw() { # size of the kanji, output
  convert -size 1024x1024 -define gradient:direction=SouthEast gradient:'#6366f1-#06b6d4' \
    -font "$font" -fill white -gravity center -pointsize "$1" -annotate +0-30 '語' -depth 8 -strip "$2"
}
draw 600 /tmp/icon-$$.png
# Maskable: Android may crop to a circle of 80 %, the kanji stays inside it.
draw 480 /tmp/maskable-$$.png
convert /tmp/icon-$$.png -resize 512x512 icon-512.png
convert /tmp/icon-$$.png -resize 192x192 icon-192.png
convert /tmp/icon-$$.png -resize 180x180 apple-touch-icon.png
convert /tmp/icon-$$.png -resize 64x64 favicon.png
convert /tmp/maskable-$$.png -resize 512x512 icon-maskable-512.png
rm /tmp/icon-$$.png /tmp/maskable-$$.png
