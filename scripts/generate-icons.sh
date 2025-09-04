#!/usr/bin/env bash
set -euo pipefail

# generate-icons.sh
# Bulk-generate PNG icons from an SVG for extension/app manifests.
#
# Defaults:
#   - Input SVG: public/icons/logo.svg
#   - Output dir: public/icons
#   - Sizes: 16 32 48 128 (or extracted from public/manifest.json with --sizes-from-manifest)

usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  -i, --input <svg>          Input SVG file (default: public/icons/logo.svg)
  -o, --outdir <dir>         Output directory (default: public/icons)
  -s, --sizes "16 32 ..."     Space-separated sizes in px (default: 16 32 48 128)
      --sizes-from-manifest  Extract sizes from manifest by scanning for icon-<size>.png
  -m, --manifest <path>      Manifest path (default: public/manifest.json)
  -b, --background <color>   Background color for canvas (default: none)
  -p, --padding <percent>    Padding inside the square canvas (0-40, default: 0)
  -d, --density <dpi>        Rasterization density for SVG (default: 512)
  -h, --help                 Show this help

Examples:
  $0 --sizes "16 32 48 128"
  $0 --sizes-from-manifest
  $0 -i public/icons/logo.svg -o public/icons -b none -p 8
EOF
}

INPUT="public/icons/logo.svg"
OUTDIR="public/icons"
SIZES=(16 32 48 128)
USE_MANIFEST_SIZES=false
MANIFEST="public/manifest.json"
BACKGROUND="none"
PADDING=0
DENSITY=512

while [[ $# -gt 0 ]]; do
  case "$1" in
    -i|--input)
      INPUT="$2"; shift 2;;
    -o|--outdir)
      OUTDIR="$2"; shift 2;;
    -s|--sizes)
      IFS=' ' read -r -a SIZES <<< "$2"; shift 2;;
    --sizes-from-manifest)
      USE_MANIFEST_SIZES=true; shift;;
    -m|--manifest)
      MANIFEST="$2"; shift 2;;
    -b|--background)
      BACKGROUND="$2"; shift 2;;
    -p|--padding)
      PADDING=${2//%/}; shift 2;;
    -d|--density)
      DENSITY="$2"; shift 2;;
    -h|--help)
      usage; exit 0;;
    *)
      echo "Unknown option: $1" >&2; usage; exit 1;;
  esac
done

# Validate input
if [[ ! -f "$INPUT" ]]; then
  echo "Input SVG not found: $INPUT" >&2
  exit 1
fi

if [[ $PADDING -lt 0 || $PADDING -gt 40 ]]; then
  echo "Padding percent out of range (0-40): $PADDING" >&2
  exit 1
fi

mkdir -p "$OUTDIR"

# Determine sizes from manifest if requested (grep-based, no jq required)
if $USE_MANIFEST_SIZES; then
  if [[ -f "$MANIFEST" ]]; then
    mapfile -t SIZES < <(grep -oE 'icon-([0-9]+)\.png' "$MANIFEST" | sed -E 's/.*icon-([0-9]+)\.png/\1/' | sort -n | uniq)
    if [[ ${#SIZES[@]} -eq 0 ]]; then
      echo "No sizes found in manifest; falling back to defaults: ${SIZES[*]}" >&2
      SIZES=(16 32 48 128)
    fi
  else
    echo "Manifest not found at $MANIFEST; using default sizes: ${SIZES[*]}" >&2
  fi
fi

# Select ImageMagick command
if command -v magick >/dev/null 2>&1; then
  IM_CMD=(magick)
elif command -v convert >/dev/null 2>&1; then
  IM_CMD=(convert)
else
  echo "ImageMagick not found. Please install 'magick' or 'convert'." >&2
  exit 1
fi

echo "Generating icons from $INPUT -> $OUTDIR"
echo "Sizes: ${SIZES[*]} | background=$BACKGROUND | padding=${PADDING}% | density=$DENSITY | tool=${IM_CMD[0]}"

for S in "${SIZES[@]}"; do
  if ! [[ "$S" =~ ^[0-9]+$ ]]; then
    echo "Skip invalid size: $S" >&2
    continue
  fi
  OUT="$OUTDIR/icon-$S.png"

  # Compute inner size accounting for padding on both sides
  if [[ $PADDING -gt 0 ]]; then
    # inner = S * (100 - 2*padding) / 100
    INNER=$(( S * (100 - 2*PADDING) / 100 ))
    [[ $INNER -lt 1 ]] && INNER=1
  else
    INNER=$S
  fi

  "${IM_CMD[@]}" -background "$BACKGROUND" -density "$DENSITY" \
    "$INPUT" \
    -resize ${INNER}x${INNER} -gravity center -extent ${S}x${S} \
    "$OUT"

  echo "Wrote $OUT"
done

echo "Done."

