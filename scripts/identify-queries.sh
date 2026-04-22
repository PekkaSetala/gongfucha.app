#!/usr/bin/env bash
# Pull identify JSONL from the VPS for RAG eval.
# Usage: ./scripts/identify-queries.sh [days]   > queries.jsonl
set -euo pipefail

DAYS="${1:-30}"

ssh webserve "docker logs --since ${DAYS}d gongfucha-app-1 2>/dev/null" \
  | grep -E '"event":"identify\.(hit|llm)"' \
  | sed '/^$/d'
