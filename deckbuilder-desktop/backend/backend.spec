# -*- mode: python ; coding: utf-8 -*-
#
# PyInstaller spec for the deckbuilder backend.
#
# Build from the deckbuilder-desktop/ root:
#   cd deckbuilder-desktop
#   pyinstaller backend/backend.spec
#
# Output: backend/dist/backend/  (one-dir mode for faster startup)
# The electron-builder extraResources config copies this directory into
# resources/backend/ inside the final installer.

import sys
import os
from pathlib import Path

spec_dir = os.path.dirname(os.path.abspath(SPEC))  # noqa: F821 — SPEC is injected by PyInstaller
scraper_dir = str(Path(spec_dir).parent.parent / "four-souls-scraper")

a = Analysis(
    [os.path.join(spec_dir, "launcher.py")],
    pathex=[spec_dir, scraper_dir],
    binaries=[],
    datas=[],
    hiddenimports=[
        "scrapeForCard",
        "flask",
        "flask_cors",
        "requests",
        "bs4",
        "pandas",
        "openpyxl",
        # pandas/numpy C-extensions that PyInstaller misses on some platforms
        "pandas._libs.tslibs.np_datetime",
        "pandas._libs.tslibs.nattype",
        "pandas._libs.tslibs.timedeltas",
        "pandas._libs.tslibs.timestamps",
        "pandas._libs.sparse",
        "pandas._libs.ops",
        "pandas._libs.properties",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    collect_all=["pandas", "openpyxl", "bs4"],
)

pyz = PYZ(a.pure)  # noqa: F821 — PYZ injected by PyInstaller

exe = EXE(  # noqa: F821 — EXE injected by PyInstaller
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)

coll = COLLECT(  # noqa: F821 — COLLECT injected by PyInstaller
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="backend",
    # Emit into backend/dist/backend/ so the path is predictable for electron-builder.
    distpath=os.path.join(spec_dir, "dist"),
)
