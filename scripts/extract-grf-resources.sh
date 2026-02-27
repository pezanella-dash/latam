#!/bin/bash
# ─── Extract GRF resources for zrenderer ─────────────────────────────
# Uses zhade/zextractor Docker image to extract sprite/palette/lua
# data from the LATAM client GRF files.
#
# Usage: bash scripts/extract-grf-resources.sh
# Requires: Docker running, LATAM client at C:/Gravity/Ragnarok/
# ──────────────────────────────────────────────────────────────────────

set -euo pipefail

# Convert Git Bash paths (/c/...) to Windows paths (C:/...) for Docker volume mounts
to_win_path() {
  echo "$1" | sed 's|^/\([a-zA-Z]\)/|\1:/|'
}

GRF_DIR="$(to_win_path "/c/Gravity/Ragnarok")"
OUT_DIR="$(to_win_path "$(pwd)/data/zrenderer-resources")"
FILTERS_FILE="$(to_win_path "$(pwd)/data/zextractor-filters.txt")"

echo "=== zrenderer GRF Resource Extraction ==="
echo "GRF source: $GRF_DIR"
echo "Output:     $OUT_DIR"

# Create output directory
mkdir -p "$OUT_DIR"

# Create filters file (patterns for zextractor)
cat > "$FILTERS_FILE" << 'FILTERS'
data\sprite\인간족\*
data\sprite\도람족\*
data\sprite\방패\*
data\sprite\로브\*
data\sprite\악세사리\*
data\sprite\shadow\*
data\palette\*
data\imf\*
data\luafiles514\lua files\datainfo\*
data\luafiles514\lua files\skillinfoz\*
data\luafiles514\lua files\spreditinfo\*
data\luafiles514\lua files\offsetitempos\*
FILTERS

echo ""
echo "Filter patterns written to: $FILTERS_FILE"
echo ""
echo "Starting extraction from data.grf..."
echo "(This may take several minutes for a 3.4 GB GRF)"
echo ""

# Run zextractor via Docker
# Note: Mount GRF dir as /zext/input and output as /zext/output
docker run --rm \
  -v "$GRF_DIR":/zext/input:ro \
  -v "$OUT_DIR":/zext/output \
  -v "$FILTERS_FILE":/zext/filters.txt:ro \
  zhade/zextractor \
  --outdir=output \
  --grf=input/data.grf \
  --filtersfile=filters.txt \
  --verbose

echo ""
echo "=== Extraction complete ==="
echo "Resources extracted to: $OUT_DIR"
echo ""
echo "Next steps:"
echo "  1. docker compose up zrenderer"
echo "  2. Check logs: docker logs ro_latam_zrenderer"
echo "  3. Save the admin access token from the logs"
