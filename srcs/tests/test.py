#!/usr/bin/env python3
"""
Runner global : exécute les suites de tests Python du dossier tests.
Usage: python test.py
"""
import subprocess
import sys
from pathlib import Path

TEST_FILES = [
    "test_auth.py",
    "test_gateway.py",
]


def run_test(file: str) -> int:
    print("\n" + "-" * 60)
    print(f"▶️  {file}")
    print("-" * 60)
    proc = subprocess.run([sys.executable, file], cwd=Path(__file__).parent, text=True)
    return proc.returncode


def main():
    root = Path(__file__).parent
    print("=" * 60)
    print("🚀 Runner global des tests")
    print("=" * 60)

    rc = 0
    for file in TEST_FILES:
        rc = run_test(file) or rc

    print("\n" + "=" * 60)
    if rc == 0:
        print("✅ Tous les tests ont réussi")
    else:
        print("❌ Certains tests ont échoué (voir ci-dessus)")
    print("=" * 60)

    sys.exit(rc)


if __name__ == "__main__":
    main()
