#!/usr/bin/env bash

# =========================================================
# Minimal Source Code + Documentation Archive Script
# Excludes dependencies, builds, caches, binaries, media,
# logs, temp files, and other non-essential fluff.
# =========================================================

set -e

PROJECT_NAME=$(basename "$PWD")
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT="${PROJECT_NAME}_audit_bundle_${TIMESTAMP}.tar.gz"

echo "Creating audit bundle: $OUTPUT"

tar \
  --exclude=".git" \
  --exclude=".next" \
  --exclude="node_modules" \
  --exclude="dist" \
  --exclude="build" \
  --exclude="coverage" \
  --exclude="out" \
  --exclude=".turbo" \
  --exclude=".cache" \
  --exclude=".parcel-cache" \
  --exclude=".vercel" \
  --exclude=".expo" \
  --exclude=".DS_Store" \
  --exclude="tmp" \
  --exclude="temp" \
  --exclude="logs" \
  --exclude="*.log" \
  --exclude="*.sqlite" \
  --exclude="*.db" \
  --exclude="*.mp4" \
  --exclude="*.mov" \
  --exclude="*.zip" \
  --exclude="*.tar.gz" \
  --exclude="*.png" \
  --exclude="*.jpg" \
  --exclude="*.jpeg" \
  --exclude="*.gif" \
  --exclude="*.webp" \
  --exclude="*.pdf" \
  --exclude="*.csv" \
  --exclude="*.env" \
  --exclude=".env*" \
  --exclude="vendor" \
  --exclude="__pycache__" \
  --exclude=".pytest_cache" \
  --exclude=".mypy_cache" \
  --exclude=".idea" \
  --exclude=".vscode" \
  -czf "$OUTPUT" .

echo ""
echo "Done."
echo "Archive created:"
echo "$OUTPUT"

echo ""
echo "Archive size:"
du -sh "$OUTPUT"