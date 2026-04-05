#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
	echo "[devcontainer] Installing nodejs and npm"
	sudo apt-get update
	sudo apt-get install -y nodejs npm
fi

echo "[devcontainer] Verifying Node and npm"
node --version
npm --version

echo "[devcontainer] Installing desktop dependencies"
cd deckbuilder-desktop
npm ci

echo "[devcontainer] Installing frontend dependencies"
cd frontend
npm ci

cd "$ROOT_DIR"

echo "[devcontainer] Creating/updating Python virtual environment"
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r deckbuilder-desktop/backend/requirements.txt
python -m pip install -r four-souls-scraper/requirements.txt

echo "[devcontainer] Bootstrap complete"
